import { http as msw, HttpResponse } from 'msw';

import { ErreurApi } from '@/api/errors';
import { demarrerServeurMsw } from '@/test/msw';

import * as api from './api';
import { TACHES_LUES_POUR_HISTORIQUE } from './api.reel';
import type { ChangementStatut } from './types';

const serveur = demarrerServeurMsw();

/** Tâche telle que Tâches v2 la renvoie : sans motif (#141). */
const TACHE = {
  id: 7,
  chantierId: 5,
  titre: 'Coffrage des poteaux',
  dateDebut: '2027-03-01',
  dateFin: '2027-03-09',
  statut: 'A_FAIRE',
  avancement: 0,
  ouvrierIds: [3],
  besoinsMateriaux: [{ materiauId: 1, quantite: 40 }],
};
const CREATION = {
  chantierId: 5,
  titre: 'Coffrage des poteaux',
  dateDebut: '2027-03-01',
  dateFin: '2027-03-09',
  ouvrierIds: [3],
  besoinsMateriaux: [{ materiauId: 1, quantite: 40 }],
};
/** Erreur telle que NestJS la renvoie. */
const nest = (statusCode: number, message: string | string[], error = 'Erreur') =>
  HttpResponse.json({ statusCode, message, error }, { status: statusCode });

beforeEach(() => {
  vi.stubEnv('VITE_API_TACHES', 'reel');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Tâches en mode réel (VITE_API_TACHES=reel)', () => {
  it('liste les tâches avec les filtres chantier et ouvrier ; motif à null (#141)', async () => {
    let url = '';
    serveur.use(
      msw.get('*/api/taches', ({ request }) => {
        url = request.url;
        return HttpResponse.json([TACHE]);
      }),
    );

    await expect(api.listerTaches({ chantierId: 5, ouvrierId: 3 })).resolves.toEqual([
      { ...TACHE, motif: null },
    ]);
    const p = new URL(url).searchParams;
    expect(p.get('chantierId')).toBe('5');
    expect(p.get('ouvrierId')).toBe('3');

    await api.listerTaches();
    expect(new URL(url).search).toBe('');
  });

  it('consulte une tâche ; 404 et 400 (identifiant invalide) deviennent des ApiError', async () => {
    serveur.use(
      msw.get('*/api/taches/7', () => HttpResponse.json(TACHE)),
      msw.get('*/api/taches/99', () => nest(404, 'Tâche 99 introuvable', 'Not Found')),
    );

    await expect(api.getTache(7)).resolves.toEqual({ ...TACHE, motif: null });
    const e = await api.getTache(99).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErreurApi);
    expect(e).toMatchObject({ status: 404, message: 'Tâche 99 introuvable' });
  });

  it('tâche bloquée : le motif vient de la dernière entrée BLOQUEE de l’historique (#141)', async () => {
    serveur.use(
      msw.get('*/api/taches/7', () => HttpResponse.json({ ...TACHE, statut: 'BLOQUEE' })),
      msw.get('*/api/taches/7/historique', () =>
        HttpResponse.json([
          { tacheId: 7, statut: 'BLOQUEE', date: '2027-03-03T10:00:00.000Z', motif: 'Pluie' },
          { tacheId: 7, statut: 'BLOQUEE', date: '2027-03-02T10:00:00.000Z', motif: 'Ancien' },
          { tacheId: 7, statut: 'A_FAIRE', date: '2027-03-01T08:00:00.000Z' },
        ]),
      ),
    );

    await expect(api.getTache(7)).resolves.toMatchObject({ statut: 'BLOQUEE', motif: 'Pluie' });
  });

  it('tâche bloquée dont l’historique est illisible : la fiche reste affichée, sans motif', async () => {
    serveur.use(
      msw.get('*/api/taches/7', () => HttpResponse.json({ ...TACHE, statut: 'BLOQUEE' })),
      msw.get('*/api/taches/7/historique', () => nest(500, 'Erreur interne')),
    );

    await expect(api.getTache(7)).resolves.toMatchObject({ statut: 'BLOQUEE', motif: null });
  });

  it('crée une tâche (POST) ; 409 chantier clôturé et 422 stock insuffisant', async () => {
    let corps: unknown;
    serveur.use(
      msw.post('*/api/taches', async ({ request }) => {
        corps = await request.json();
        return HttpResponse.json(TACHE, { status: 201 });
      }),
    );
    await expect(api.creerTache(CREATION)).resolves.toMatchObject({ id: 7, motif: null });
    expect(corps).toEqual(CREATION);

    const clos = 'Le chantier « Founty » est clôturé : aucune tâche ne peut y être ajoutée';
    serveur.use(msw.post('*/api/taches', () => nest(409, clos, 'Conflict')));
    await expect(api.creerTache(CREATION)).rejects.toMatchObject({ status: 409, message: clos });

    const stock = 'Stock insuffisant pour Ciment CPJ 45 : 400 sacs demandés, 320 sacs en stock';
    serveur.use(msw.post('*/api/taches', () => nest(422, stock, 'Unprocessable Entity')));
    await expect(api.creerTache(CREATION)).rejects.toMatchObject({ status: 422, message: stock });
  });

  it('400 de validation NestJS : message rattaché au champ', async () => {
    serveur.use(
      msw.post('*/api/taches', () => nest(400, ['titre should not be empty'], 'Bad Request')),
    );
    const e = await api.creerTache(CREATION).catch((x: unknown) => x);
    expect(e).toMatchObject({ status: 400 });
    expect((e as ErreurApi).champs).toHaveProperty('titre');
  });

  it('modifie (PUT), change le statut, l’avancement et les ouvriers (PATCH)', async () => {
    const appels: { methode: string; chemin: string; corps: unknown }[] = [];
    const noter = async ({ request }: { request: Request }) => {
      appels.push({
        methode: request.method,
        chemin: new URL(request.url).pathname,
        corps: await request.json(),
      });
      return HttpResponse.json(TACHE);
    };
    serveur.use(
      msw.put('*/api/taches/7', noter),
      msw.patch('*/api/taches/7/statut', noter),
      msw.patch('*/api/taches/7/avancement', noter),
      msw.patch('*/api/taches/7/ouvriers', noter),
    );

    await api.modifierTache(7, CREATION);
    await api.changerStatut(7, 'EN_COURS');
    await api.majAvancement(7, 60);
    await api.affecterOuvriers(7, [3, 4]);

    expect(appels).toEqual([
      { methode: 'PUT', chemin: '/api/taches/7', corps: CREATION },
      { methode: 'PATCH', chemin: '/api/taches/7/statut', corps: { statut: 'EN_COURS' } },
      { methode: 'PATCH', chemin: '/api/taches/7/avancement', corps: { avancement: 60 } },
      { methode: 'PATCH', chemin: '/api/taches/7/ouvriers', corps: { ouvrierIds: [3, 4] } },
    ]);
  });

  it('409 transition impossible et 409 conflit de planning', async () => {
    serveur.use(
      msw.patch('*/api/taches/7/statut', () =>
        nest(409, 'Transition impossible : EN_COURS → EN_COURS', 'Conflict'),
      ),
      msw.patch('*/api/taches/7/ouvriers', () =>
        nest(409, 'L’ouvrier 3 est déjà affecté à « Fondations » sur cette période', 'Conflict'),
      ),
    );

    await expect(api.changerStatut(7, 'EN_COURS')).rejects.toMatchObject({
      status: 409,
      message: 'Transition impossible : EN_COURS → EN_COURS',
    });
    await expect(api.affecterOuvriers(7, [3])).rejects.toMatchObject({ status: 409 });
  });

  it('bloque avec un motif (repris dans la tâche) puis débloque', async () => {
    const corps: unknown[] = [];
    serveur.use(
      msw.patch('*/api/taches/7/blocage', async ({ request }) => {
        const b = (await request.json()) as { bloquee: boolean };
        corps.push(b);
        return HttpResponse.json({ ...TACHE, statut: b.bloquee ? 'BLOQUEE' : 'A_FAIRE' });
      }),
    );

    await expect(api.bloquerTache(7, { bloquee: true, motif: 'Pluie' })).resolves.toMatchObject({
      statut: 'BLOQUEE',
      motif: 'Pluie',
    });
    await expect(api.bloquerTache(7, { bloquee: false })).resolves.toMatchObject({
      statut: 'A_FAIRE',
      motif: null,
    });
    expect(corps).toEqual([{ bloquee: true, motif: 'Pluie' }, { bloquee: false }]);
  });

  it('historique d’une tâche et suppression (DELETE 204)', async () => {
    const historique: ChangementStatut[] = [
      { tacheId: 7, statut: 'EN_COURS', date: '2027-03-02T09:00:00.000Z' },
      { tacheId: 7, statut: 'A_FAIRE', date: '2027-03-01T08:00:00.000Z' },
    ];
    let supprime = false;
    serveur.use(
      msw.get('*/api/taches/7/historique', () => HttpResponse.json(historique)),
      msw.delete('*/api/taches/7', () => {
        supprime = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(api.getHistorique(7)).resolves.toEqual(historique);
    await expect(api.supprimerTache(7)).resolves.toBeUndefined();
    expect(supprime).toBe(true);
  });

  it('502 de la gateway (Tâches arrêté) : 503 « module Tâches indisponible »', async () => {
    serveur.use(msw.get('*/api/taches', () => new HttpResponse('Bad Gateway', { status: 502 })));
    const e = await api.listerTaches().catch((x: unknown) => x);
    expect(e).toMatchObject({ status: 503 });
    expect((e as ErreurApi).message).toContain('Tâches');
  });
});

describe('Historique global calculé côté front (#142)', () => {
  const entree = (tacheId: number, jour: number): ChangementStatut => ({
    tacheId,
    statut: 'EN_COURS',
    date: `2027-03-${String(jour).padStart(2, '0')}T08:00:00.000Z`,
  });

  it(`ne lit l’historique que des ${TACHES_LUES_POUR_HISTORIQUE} tâches les plus récentes, en parallèle`, async () => {
    const lus: number[] = [];
    serveur.use(
      msw.get('*/api/taches', () =>
        HttpResponse.json(Array.from({ length: 30 }, (_, i) => ({ ...TACHE, id: i + 1 }))),
      ),
      msw.get('*/api/taches/:id/historique', ({ params }) => {
        const id = Number(params.id);
        lus.push(id);
        return HttpResponse.json([entree(id, (id % 28) + 1)]);
      }),
    );

    const h = await api.listerHistorique(5);

    expect(lus.sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 11));
    expect(h).toHaveLength(5);
    expect(h.map((e) => e.date)).toEqual([...h.map((e) => e.date)].sort().reverse());
    expect(h.incomplet).toBeUndefined();
  });

  it('une partie des historiques échoue : résultat partiel marqué incomplet', async () => {
    serveur.use(
      msw.get('*/api/taches', () => HttpResponse.json([1, 2, 3].map((id) => ({ ...TACHE, id })))),
      msw.get('*/api/taches/:id/historique', ({ params }) =>
        params.id === '2'
          ? nest(500, 'Erreur interne')
          : HttpResponse.json([entree(Number(params.id), Number(params.id))]),
      ),
    );

    const h = await api.listerHistorique(10);
    expect(h.map((e) => e.tacheId)).toEqual([3, 1]);
    expect(h.incomplet).toBe(true);
  });

  it('tous les historiques échouent : l’erreur est levée', async () => {
    serveur.use(
      msw.get('*/api/taches', () => HttpResponse.json([{ ...TACHE, id: 1 }])),
      msw.get('*/api/taches/:id/historique', () => new HttpResponse(null, { status: 502 })),
    );

    await expect(api.listerHistorique(10)).rejects.toMatchObject({ status: 503 });
  });

  it('aucune tâche : historique vide, sans erreur', async () => {
    serveur.use(msw.get('*/api/taches', () => HttpResponse.json([])));
    await expect(api.listerHistorique(10)).resolves.toEqual([]);
  });
});
