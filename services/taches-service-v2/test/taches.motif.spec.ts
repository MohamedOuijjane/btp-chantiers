import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ChantiersClient } from "../src/clients/chantiers.client";
import { MateriauxSoapClient } from "../src/clients/materiaux.soap-client";
import { OuvriersClient } from "../src/clients/ouvriers.client";
import { HistoriqueService } from "../src/taches/historique.service";
import { StatutTache, Tache } from "../src/taches/tache.entity";
import { TachesService } from "../src/taches/taches.service";

const { A_FAIRE, EN_COURS, BLOQUEE } = StatutTache;

describe("motif du blocage dans la réponse", () => {
  let service: TachesService;
  const qb = {
    leftJoinAndSelect: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    andWhere: jest.fn(),
    getMany: jest.fn(),
  };
  const repo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const chantiers = { verifierChantierModifiable: jest.fn() };
  const journal = { enregistrer: jest.fn(), motifsDuBlocage: jest.fn() };

  const tache = (partiel: Partial<Tache> = {}): Tache =>
    Object.assign(new Tache(), {
      id: 7, chantierId: 1, titre: "Fondations", description: null,
      dateDebut: "2026-11-02", dateFin: "2026-11-10",
      statut: A_FAIRE, avancement: 0, ouvrierIds: [], besoinsMateriaux: [],
      ...partiel,
    });

  beforeEach(async () => {
    jest.resetAllMocks();
    for (const m of [qb.leftJoinAndSelect, qb.orderBy, qb.addOrderBy, qb.andWhere]) m.mockReturnValue(qb);
    repo.createQueryBuilder.mockReturnValue(qb);
    repo.save.mockImplementation((x: Tache) => Promise.resolve({ ...x, id: 7 }));
    chantiers.verifierChantierModifiable.mockResolvedValue(undefined);
    const mod = await Test.createTestingModule({
      providers: [
        TachesService,
        { provide: getRepositoryToken(Tache), useValue: repo },
        { provide: ChantiersClient, useValue: chantiers },
        { provide: OuvriersClient, useValue: {} },
        { provide: MateriauxSoapClient, useValue: {} },
        { provide: HistoriqueService, useValue: journal },
      ],
    }).compile();
    service = mod.get(TachesService);
  });

  it("trouver : tâche BLOQUEE -> motif du blocage en cours", async () => {
    repo.findOne.mockResolvedValue(tache({ statut: BLOQUEE, avancement: 40 }));
    journal.motifsDuBlocage.mockResolvedValue(new Map([[7, "Pluie"]]));
    const r = await service.trouver(7);
    expect(r.motif).toBe("Pluie");
    expect(journal.motifsDuBlocage).toHaveBeenCalledWith([7]);
  });

  it("trouver : tâche non bloquée -> motif null, historique non interrogé", async () => {
    repo.findOne.mockResolvedValue(tache({ statut: EN_COURS, avancement: 40 }));
    const r = await service.trouver(7);
    expect(r.motif).toBeNull();
    expect(journal.motifsDuBlocage).not.toHaveBeenCalled();
  });

  it("lister : une seule requête d'historique pour les tâches bloquées", async () => {
    qb.getMany.mockResolvedValue([
      tache({ id: 1, statut: BLOQUEE }),
      tache({ id: 2, statut: EN_COURS, avancement: 10 }),
      tache({ id: 3, statut: BLOQUEE }),
    ]);
    journal.motifsDuBlocage.mockResolvedValue(new Map([[1, "Pluie"], [3, null]]));
    const r = await service.lister({});
    expect(journal.motifsDuBlocage).toHaveBeenCalledTimes(1);
    expect(journal.motifsDuBlocage).toHaveBeenCalledWith([1, 3]);
    expect(r.map((t) => t.motif)).toEqual(["Pluie", null, null]);
  });

  it("lister : aucune tâche bloquée -> historique non interrogé", async () => {
    qb.getMany.mockResolvedValue([tache({ id: 1 }), tache({ id: 2 })]);
    const r = await service.lister({});
    expect(journal.motifsDuBlocage).not.toHaveBeenCalled();
    expect(r.every((t) => t.motif === null)).toBe(true);
  });

  it("changerBlocage : la réponse contient le motif au blocage, null au déblocage", async () => {
    repo.findOne.mockResolvedValue(tache({ statut: EN_COURS, avancement: 40 }));
    expect((await service.changerBlocage(7, { bloquee: true, motif: "Pluie" })).motif).toBe("Pluie");
    repo.findOne.mockResolvedValue(tache({ statut: BLOQUEE, avancement: 40 }));
    expect((await service.changerBlocage(7, { bloquee: false })).motif).toBeNull();
  });
});

describe("HistoriqueService.motifsDuBlocage", () => {
  const entrees = { find: jest.fn() };
  const h = new HistoriqueService(entrees as never);

  it("garde la dernière entrée BLOQUEE de chaque tâche", async () => {
    entrees.find.mockResolvedValue([
      { tacheId: 7, motif: "Récent" },
      { tacheId: 7, motif: "Ancien" },
      { tacheId: 8, motif: null },
    ]);
    const m = await h.motifsDuBlocage([7, 8]);
    expect(m.get(7)).toBe("Récent");
    expect(m.get(8)).toBeNull();
  });

  it("liste vide : aucune requête", async () => {
    entrees.find.mockClear();
    expect((await h.motifsDuBlocage([])).size).toBe(0);
    expect(entrees.find).not.toHaveBeenCalled();
  });
});