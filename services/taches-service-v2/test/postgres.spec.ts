import { ConflictException, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ChantiersClient } from "../src/clients/chantiers.client";
import { MateriauxSoapClient } from "../src/clients/materiaux.soap-client";
import { OuvriersClient } from "../src/clients/ouvriers.client";
import { optionsBase } from "../src/database/options";
import { Tache } from "../src/taches/tache.entity";
import { TachesService } from "../src/taches/taches.service";
import { HistoriqueStatut } from "../src/taches/historique.entity";
import { HistoriqueService } from "../src/taches/historique.service";

/**
 * Intégration avec un vrai PostgreSQL : migrations, tableau ouvrier_ids, cascade des besoins,
 * contraintes. Lancé seulement si TEST_DATABASE_URL est défini (CI : service postgres du job
 * Tâches). Le test crée puis supprime son propre schéma.
 */
const url = process.env.TEST_DATABASE_URL;
const decrire = url ? describe : describe.skip;
const SCHEMA = "taches_test";

// Connexion et migrations sur une vraie base : plus long que le délai par défaut de Jest (5 s).
jest.setTimeout(60_000);

decrire("Tâches sur PostgreSQL (migrations et requêtes)", () => {
  let base: DataSource;
  let service: TachesService;
  const accepter = {
    verifierChantierActif: jest.fn(),
    verifierDisponibles: jest.fn(),
    verifierStock: jest.fn(),
  };

  beforeAll(async () => {
    const admin = new DataSource({ type: "postgres", url });
    await admin.initialize();
    await admin.query(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await admin.query(`CREATE SCHEMA ${SCHEMA}`);
    await admin.destroy();

    base = new DataSource({
      ...optionsBase({ DATABASE_URL: url, DB_SCHEMA: SCHEMA }),
      migrationsRun: false,
    });
    await base.initialize();
    await base.runMigrations();
    service = new TachesService(
      base.getRepository(Tache),
      accepter as unknown as ChantiersClient,
      accepter as unknown as OuvriersClient,
      accepter as unknown as MateriauxSoapClient,
      new HistoriqueService(base.getRepository(HistoriqueStatut)),
    );
  });

  afterAll(async () => {
    if (!base?.isInitialized) return;
    await base.query(`DROP SCHEMA ${SCHEMA} CASCADE`);
    await base.destroy();
  });

  it("les migrations créent les tables dans le schéma, sans synchronize", async () => {
    const tables = await base.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
      [SCHEMA],
    );
    expect(tables.map((t: { table_name: string }) => t.table_name)).toEqual([
      "besoin_materiau",
      "historique_statut",
      "migrations",
      "tache",
    ]);
  });

  it("crée une tâche avec un identifiant entier et ses besoins en matériaux", async () => {
    const t = await service.creer({
      chantierId: 1,
      titre: "Coulage des fondations",
      description: "Béton C25",
      dateDebut: "2026-11-02",
      dateFin: "2026-11-10",
      ouvrierIds: [4, 7],
      besoinsMateriaux: [
        { materiauId: 2, quantite: 40 },
        { materiauId: 1, quantite: 2.5 },
      ],
    });
    expect(Number.isInteger(t.id)).toBe(true);
    expect(t).toEqual({
      id: t.id,
      chantierId: 1,
      titre: "Coulage des fondations",
      description: "Béton C25",
      dateDebut: "2026-11-02",
      dateFin: "2026-11-10",
      statut: "A_FAIRE",
      avancement: 0,
      ouvrierIds: [4, 7],
      besoinsMateriaux: [
        { materiauId: 1, quantite: 2.5 },
        { materiauId: 2, quantite: 40 },
      ],
    });
  });

  it("filtre par chantier et par ouvrier (ANY sur ouvrier_ids)", async () => {
    await service.creer({
      chantierId: 2,
      titre: "Dalle",
      dateDebut: "2026-11-11",
      dateFin: "2026-11-20",
      ouvrierIds: [7],
    });
    await service.creer({
      chantierId: 2,
      titre: "Murs",
      dateDebut: "2026-11-05",
      dateFin: "2026-11-08",
      ouvrierIds: [9],
    });

    expect(
      (await service.lister({ chantierId: 2 })).map((t) => t.titre),
    ).toEqual(["Murs", "Dalle"]);
    expect(
      (await service.lister({ ouvrierId: 7 })).map((t) => t.titre),
    ).toEqual(["Coulage des fondations", "Dalle"]);
    expect(
      (await service.lister({ chantierId: 2, ouvrierId: 7 })).map(
        (t) => t.titre,
      ),
    ).toEqual(["Dalle"]);
    expect(await service.lister({ ouvrierId: 999 })).toEqual([]);
  });

  it("met à jour l’avancement et les affectations (RG5)", async () => {
    const [t] = await service.lister({ chantierId: 1 });
    expect((await service.mettreAJourAvancement(t.id, 60)).statut).toBe(
      "EN_COURS",
    );
    const termine = await service.mettreAJourAvancement(t.id, 100);
    expect(termine).toEqual(
      expect.objectContaining({ statut: "TERMINEE", avancement: 100 }),
    );
    expect(
      (await service.affecter(t.id, { ouvrierIds: [3] })).ouvrierIds,
    ).toEqual([3]);
    // Les besoins en matériaux ne sont pas perdus par ces enregistrements.
    expect((await service.trouver(t.id)).besoinsMateriaux).toHaveLength(2);
  });

  it("supprime la tâche et ses besoins (ON DELETE CASCADE)", async () => {
    const [t] = await service.lister({ chantierId: 1 });
    await service.supprimer(t.id);
    await expect(service.trouver(t.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    const [{ n }] = await base.query(
      `SELECT count(*)::int AS n FROM ${SCHEMA}.besoin_materiau WHERE tache_id = $1`,
      [t.id],
    );
    expect(n).toBe(0);
  });

  it("la base refuse une période incohérente et un avancement hors de 0-100", async () => {
    await expect(
      base.query(
        `INSERT INTO ${SCHEMA}.tache (chantier_id, titre, date_debut, date_fin) VALUES (1, 'x', '2026-11-10', '2026-11-01')`,
      ),
    ).rejects.toThrow(/tache_periode_valide/);
    await expect(
      base.query(
        `INSERT INTO ${SCHEMA}.tache (chantier_id, titre, date_debut, date_fin, avancement) VALUES (1, 'x', '2026-11-01', '2026-11-01', 120)`,
      ),
    ).rejects.toThrow(/tache_avancement_pourcentage/);
  });
  it("historique : création, démarrage et fin, du plus récent au plus ancien", async () => {
    const t = await service.creer({
      chantierId: 3,
      titre: "Historique",
      dateDebut: "2026-12-01",
      dateFin: "2026-12-05",
    });
    await service.mettreAJourAvancement(t.id, 30);
    await service.mettreAJourAvancement(t.id, 100);
    const h = await service.historique(t.id);
    expect(h.map((e) => e.statut)).toEqual(["TERMINEE", "EN_COURS", "A_FAIRE"]);
    expect(h.every((e) => e.tacheId === t.id)).toBe(true);
  });

  it("supprimer une tâche supprime son historique (ON DELETE CASCADE)", async () => {
    const [t] = await service.lister({ chantierId: 3 });
    await service.supprimer(t.id);
    const [{ n }] = await base.query(
      `SELECT count(*)::int AS n FROM ${SCHEMA}.historique_statut WHERE tache_id = $1`,
      [t.id],
    );
    expect(n).toBe(0);
  });
  describe("conflit de planning d'un ouvrier (#10)", () => {
    // Ouvriers 101 à 105 et décembre 2026 : aucun lien avec les tests précédents.
    const tache = (ouvrierIds: number[], dateDebut: string, dateFin: string, titre = "Test") => ({
      chantierId: 5,
      titre,
      dateDebut,
      dateFin,
      ouvrierIds,
    });

    beforeAll(async () => {
      await service.creer(tache([101], "2026-12-10", "2026-12-15", "Planning base"));
    });

    it.each([
      ["chevauchement partiel", "2026-12-14", "2026-12-20"],
      ["période incluse dans l'autre", "2026-12-11", "2026-12-12"],
      ["période qui englobe l'autre", "2026-12-01", "2026-12-31"],
      ["dernier jour partagé (fin = début de l'autre)", "2026-12-15", "2026-12-18"],
      ["premier jour partagé (début = fin de l'autre)", "2026-12-05", "2026-12-10"],
      ["même période", "2026-12-10", "2026-12-15"],
    ])("%s : 409 qui nomme l'ouvrier et la tâche, rien n'est enregistré", async (_nom, debut, fin) => {
      const avant = (await service.lister({ ouvrierId: 101 })).length;
      const erreur = await service.creer(tache([101], debut, fin)).catch((e: unknown) => e);
      expect(erreur).toBeInstanceOf(ConflictException);
      expect((erreur as Error).message).toBe(
        "L'ouvrier 101 est déjà affecté à « Planning base » (2026-12-10 → 2026-12-15) sur cette période",
      );
      expect(await service.lister({ ouvrierId: 101 })).toHaveLength(avant);
    });

    it.each([
      ["le lendemain (contigu)", "2026-12-16", "2026-12-18"],
      ["la veille", "2026-12-05", "2026-12-09"],
    ])("%s : pas de conflit", async (_nom, debut, fin) => {
      const t = await service.creer(tache([101], debut, fin, "Sans conflit"));
      expect(t.ouvrierIds).toEqual([101]);
    });

    it("un autre ouvrier sur la même période : pas de conflit", async () => {
      await expect(service.creer(tache([102], "2026-12-10", "2026-12-15"))).resolves.toEqual(
        expect.objectContaining({ ouvrierIds: [102] }),
      );
    });

    it("plusieurs ouvriers : conflit si l'un d'eux est déjà pris", async () => {
      await expect(service.creer(tache([102, 101], "2026-12-12", "2026-12-13"))).rejects.toThrow(
        "L'ouvrier 101 est déjà affecté",
      );
    });

    it("une tâche TERMINEE est ignorée", async () => {
      const finie = await service.creer(tache([103], "2026-12-10", "2026-12-15", "Finie"));
      await service.mettreAJourAvancement(finie.id, 100);
      await expect(service.creer(tache([103], "2026-12-10", "2026-12-15"))).resolves.toBeDefined();
    });

    it("une tâche BLOQUEE compte comme occupée", async () => {
      const bloquee = await service.creer(tache([106], "2026-12-10", "2026-12-15", "Bloquée"));
      await base.query(`UPDATE ${SCHEMA}.tache SET statut = 'BLOQUEE' WHERE id = $1`, [bloquee.id]);
      await expect(service.creer(tache([106], "2026-12-12", "2026-12-13"))).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it("affectation : conflit refusé, la tâche elle-même est exclue", async () => {
      const a = await service.creer(tache([104], "2026-12-20", "2026-12-25", "Tâche A"));
      const b = await service.creer(tache([], "2026-12-22", "2026-12-24", "Tâche B"));

      await expect(service.affecter(b.id, { ouvrierIds: [104] })).rejects.toThrow(
        "L'ouvrier 104 est déjà affecté à « Tâche A » (2026-12-20 → 2026-12-25) sur cette période",
      );
      expect((await service.trouver(b.id)).ouvrierIds).toEqual([]);

      // Ré-affecter l'ouvrier déjà sur la tâche A : elle ne rentre pas en conflit avec elle-même.
      expect((await service.affecter(a.id, { ouvrierIds: [104, 105] })).ouvrierIds).toEqual([104, 105]);
      // Un autre ouvrier, libre, peut être mis sur la tâche B.
      expect((await service.affecter(b.id, { ouvrierIds: [107] })).ouvrierIds).toEqual([107]);
    });
  });

  it("les migrations s’annulent proprement", async () => {
    await base.undoLastMigration(); // historique_statut
    await base.undoLastMigration(); // tache et besoin_materiau
    const tables = await base.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name <> 'migrations'`,
      [SCHEMA],
    );
    expect(tables).toEqual([]);
    await base.runMigrations();
  });
});
