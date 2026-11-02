import * as chantiers from '@/features/chantiers/api';
import * as materiaux from '@/features/materiaux/api';
import * as ouvriers from '@/features/ouvriers/api';
import * as taches from '@/features/taches/api';

import { estApiError, versApiError } from './errors';
import { simulerPanne } from './simulation';

/** Vérifie que la promesse échoue avec un ApiError du code attendu. */
async function echoue(promesse: Promise<unknown>, status: number, message?: RegExp) {
  const erreur = await promesse.then(
    () => {
      throw new Error('La promesse aurait dû échouer');
    },
    (e: unknown) => e,
  );
  expect(estApiError(erreur)).toBe(true);
  expect(erreur).toMatchObject({ status });
  if (message) expect((erreur as Error).message).toMatch(message);
  return erreur as { status: number; message: string; champs?: Record<string, string> };
}

const nouvelleTache = {
  chantierId: 3,
  titre: 'Implantation',
  dateDebut: '2027-01-04',
  dateFin: '2027-01-08',
};

describe('ApiError', () => {
  it('reconnaît un ApiError et convertit les autres erreurs en 500', () => {
    expect(estApiError({ status: 409, message: 'Conflit' })).toBe(true);
    expect(estApiError(new Error('x'))).toBe(false);
    expect(versApiError(new Error('boum'))).toEqual({ status: 500, message: 'boum' });
  });
});

describe('Chantiers (fictif)', () => {
  it('crée toujours un chantier au statut PLANIFIE', async () => {
    const c = await chantiers.creerChantier({
      nom: 'Hôtel Taghazout',
      adresse: 'Taghazout',
      client: 'Taghazout Resorts',
      dateDebut: '2027-01-01',
      dateFinPrevue: '2027-12-31',
      budget: 9_000_000,
    });
    expect(c).toMatchObject({ id: 7, statut: 'PLANIFIE' });
    expect(await chantiers.listerChantiers()).toHaveLength(7);
  });

  it('refuse une date de fin avant la date de début (400 sur le champ)', async () => {
    const e = await echoue(
      chantiers.creerChantier({
        nom: 'X',
        adresse: 'Y',
        client: 'Z',
        dateDebut: '2027-02-01',
        dateFinPrevue: '2027-01-01',
        budget: 1,
      }),
      400,
    );
    expect(e.champs).toHaveProperty('dateFinPrevue');
  });

  it('refuse de modifier un chantier terminé (409)', async () => {
    const termine = await chantiers.getChantier(5);
    await echoue(chantiers.modifierChantier(5, { ...termine, statut: 'EN_COURS' }), 409, /terminé/);
  });

  it('filtre par statut et renvoie 404 pour un chantier inconnu', async () => {
    expect(await chantiers.listerChantiers({ statut: 'EN_COURS' })).toHaveLength(3);
    await echoue(chantiers.getChantier(99), 404);
  });

  it('calcule l’avancement et passe en mode dégradé si Tâches est en panne', async () => {
    expect(await chantiers.getAvancement(1)).toEqual({
      chantierId: 1,
      nombreTaches: 6,
      avancementGlobal: 56,
      sourceDisponible: true,
    });
    simulerPanne('taches');
    expect(await chantiers.getAvancement(1)).toMatchObject({
      avancementGlobal: null,
      sourceDisponible: false,
    });
  });

  it('ne modifie pas la base quand la page modifie un résultat', async () => {
    const c = await chantiers.getChantier(1);
    c.nom = 'modifié';
    expect((await chantiers.getChantier(1)).nom).toBe('Résidence Al Amal');
  });
});

describe('Tâches (fictif)', () => {
  it('crée une tâche à faire avec un identifiant entier', async () => {
    const t = await taches.creerTache({ ...nouvelleTache, ouvrierIds: [7] });
    expect(t).toMatchObject({ id: 18, statut: 'A_FAIRE', avancement: 0, motif: null });
  });

  it('renvoie 409 si un ouvrier est déjà affecté sur la période', async () => {
    // Rachid (2) travaille sur « Élévation des murs R+1 » du 16/10 au 20/11.
    await echoue(
      taches.creerTache({
        ...nouvelleTache,
        dateDebut: '2026-11-10',
        dateFin: '2026-11-12',
        ouvrierIds: [2],
      }),
      409,
      /Rachid Bouzid/,
    );
  });

  it('renvoie 422 si l’ouvrier est indisponible ou si le stock est insuffisant', async () => {
    await echoue(taches.creerTache({ ...nouvelleTache, ouvrierIds: [9] }), 422, /Brahim/);
    await echoue(
      taches.creerTache({ ...nouvelleTache, besoinsMateriaux: [{ materiauId: 1, quantite: 400 }] }),
      422,
      /Stock insuffisant pour Ciment CPJ 45/,
    );
  });

  it('renvoie 422 pour un chantier terminé', async () => {
    await echoue(taches.creerTache({ ...nouvelleTache, chantierId: 5 }), 422, /terminé/);
  });

  it('renvoie 503 si Tâches ou un module appelé est en panne', async () => {
    simulerPanne('materiaux');
    await echoue(
      taches.creerTache({ ...nouvelleTache, besoinsMateriaux: [{ materiauId: 2, quantite: 1 }] }),
      503,
      /Matériaux/,
    );
    simulerPanne('taches');
    await echoue(taches.listerTaches(), 503, /Tâches/);
  });

  it('applique RG5 : le statut suit l’avancement', async () => {
    expect(await taches.majAvancement(6, 60)).toMatchObject({ statut: 'EN_COURS', avancement: 60 });
    expect(await taches.majAvancement(6, 100)).toMatchObject({ statut: 'TERMINEE' });
    await echoue(taches.majAvancement(6, 120), 400);
  });

  it('bloque avec un motif et recalcule le statut au déblocage', async () => {
    expect(await taches.bloquerTache(3, { bloquee: true, motif: 'Grue en panne' })).toMatchObject({
      statut: 'BLOQUEE',
      motif: 'Grue en panne',
    });
    expect(await taches.bloquerTache(3, { bloquee: false })).toMatchObject({
      statut: 'EN_COURS',
      motif: null,
    });
    await echoue(taches.bloquerTache(1, { bloquee: true, motif: 'x' }), 409);
  });
});

describe('Ouvriers (fictif)', () => {
  it('filtre par disponibilité et spécialité', async () => {
    expect(await ouvriers.listerOuvriers({ disponible: true })).toHaveLength(8);
    expect(await ouvriers.listerOuvriers({ specialite: 'MACON' })).toHaveLength(2);
  });

  it('renvoie le planning trié avec sourceDisponible', async () => {
    const p = await ouvriers.getPlanning(1);
    expect(p.sourceDisponible).toBe(true);
    expect(p.taches.map((t) => t.dateDebut)).toEqual([...p.taches.map((t) => t.dateDebut)].sort());
    expect(p.taches[0]).toEqual({
      id: 14,
      chantierId: 5,
      titre: 'Dallage industriel',
      dateDebut: '2026-05-01',
      dateFin: '2026-09-30',
      statut: 'TERMINEE',
    });

    simulerPanne('taches');
    expect(await ouvriers.getPlanning(1)).toMatchObject({ taches: [], sourceDisponible: false });
  });

  it('refuse une CIN déjà utilisée (409) ou mal formée (400)', async () => {
    const base = { nom: 'Idrissi', prenom: 'Ali', specialite: 'PEINTRE' as const, telephone: null };
    await echoue(ouvriers.creerOuvrier({ ...base, cin: 'JB123456' }), 409);
    const e = await echoue(ouvriers.creerOuvrier({ ...base, cin: '12AB' }), 400);
    expect(e.champs).toHaveProperty('cin');
  });
});

describe('Matériaux (fictif)', () => {
  it('liste les matériaux en alerte', async () => {
    expect((await materiaux.listerMateriaux(true)).map((m) => m.nom)).toEqual([
      'Ciment CPJ 45',
      'Fer à béton HA12',
    ]);
  });

  it('refuse une sortie supérieure au stock (422) sans changer le stock', async () => {
    await echoue(
      materiaux.enregistrerMouvement({ materiauId: 3, chantierId: 1, type: 'SORTIE', quantite: 5 }),
      422,
      /Stock insuffisant/,
    );
    expect((await materiaux.getMateriau(3)).stock).toBe(2.4);
  });

  it('refuse un mouvement vers un chantier terminé (422)', async () => {
    await echoue(
      materiaux.enregistrerMouvement({ materiauId: 2, chantierId: 5, type: 'SORTIE', quantite: 1 }),
      422,
      /terminé/,
    );
  });

  it('met à jour le stock et l’alerte après une entrée', async () => {
    const r = await materiaux.enregistrerMouvement({
      materiauId: 1,
      chantierId: 1,
      type: 'ENTREE',
      quantite: 200,
    });
    expect(r).toEqual({ mouvementId: 7, stockApres: 520, enAlerte: false });
  });

  it('liste les mouvements d’un chantier du plus récent au plus ancien', async () => {
    const mv = await materiaux.listerMouvements({ chantierId: 1 });
    expect(mv).toHaveLength(4);
    expect(mv.map((m) => m.date)).toEqual(['2026-10-31', '2026-10-30', '2026-10-28', '2026-10-25']);
  });
});
