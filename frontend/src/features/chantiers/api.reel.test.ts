import { http as msw, HttpResponse } from 'msw';

import { ErreurApi } from '@/api/errors';
import { demarrerServeurMsw } from '@/test/msw';

import * as api from './api';
import type { Chantier } from './types';

const serveur = demarrerServeurMsw();

const CHANTIER: Chantier = {
  id: 1,
  nom: 'Résidence Al Amal',
  adresse: 'Hay Mohammadi, Agadir',
  client: 'Société Souss Immo',
  dateDebut: '2026-11-01',
  dateFinPrevue: '2027-06-30',
  budget: 2500000,
  statut: 'PLANIFIE',
};
const DONNEES = {
  nom: CHANTIER.nom,
  adresse: CHANTIER.adresse,
  client: CHANTIER.client,
  dateDebut: CHANTIER.dateDebut,
  dateFinPrevue: CHANTIER.dateFinPrevue,
  budget: CHANTIER.budget,
};

beforeEach(() => {
  vi.stubEnv('VITE_API_CHANTIERS', 'reel');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Chantiers en mode réel (VITE_API_CHANTIERS=reel)', () => {
  it('liste les chantiers avec le filtre de statut', async () => {
    let url = '';
    serveur.use(
      msw.get('*/api/chantiers', ({ request }) => {
        url = request.url;
        return HttpResponse.json([CHANTIER]);
      }),
    );

    await expect(api.listerChantiers({ statut: 'EN_COURS' })).resolves.toEqual([CHANTIER]);
    expect(new URL(url).searchParams.get('statut')).toBe('EN_COURS');

    await api.listerChantiers();
    expect(new URL(url).search).toBe('');
  });

  it('consulte un chantier ; 404 devient une ApiError', async () => {
    serveur.use(
      msw.get('*/api/chantiers/1', () => HttpResponse.json(CHANTIER)),
      msw.get('*/api/chantiers/99', () =>
        HttpResponse.json(
          { status: 404, detail: 'Chantier 99 introuvable' },
          { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    await expect(api.getChantier(1)).resolves.toEqual(CHANTIER);
    await expect(api.getChantier(99)).rejects.toMatchObject({
      status: 404,
      message: 'Chantier 99 introuvable',
    });
  });

  it('crée un chantier (POST) ; 400 donne les erreurs par champ', async () => {
    let corps: unknown;
    serveur.use(
      msw.post('*/api/chantiers', async ({ request }) => {
        corps = await request.json();
        return HttpResponse.json(CHANTIER, { status: 201 });
      }),
    );
    await expect(api.creerChantier(DONNEES)).resolves.toEqual(CHANTIER);
    expect(corps).toEqual(DONNEES);

    serveur.use(
      msw.post('*/api/chantiers', () =>
        HttpResponse.json(
          {
            status: 400,
            detail: 'Données invalides',
            erreurs: {
              dateFinPrevue:
                'La date de fin prévue doit être postérieure ou égale à la date de début',
            },
          },
          { status: 400 },
        ),
      ),
    );
    const e = await api.creerChantier(DONNEES).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErreurApi);
    expect(e).toMatchObject({
      status: 400,
      champs: {
        dateFinPrevue: 'La date de fin prévue doit être postérieure ou égale à la date de début',
      },
    });
  });

  it('modifie un chantier (PUT) ; 409 si le chantier est terminé', async () => {
    let corps: unknown;
    serveur.use(
      msw.put('*/api/chantiers/1', async ({ request }) => {
        corps = await request.json();
        return HttpResponse.json({ ...CHANTIER, statut: 'EN_COURS' });
      }),
    );
    await expect(
      api.modifierChantier(1, { ...DONNEES, statut: 'EN_COURS' }),
    ).resolves.toMatchObject({ statut: 'EN_COURS' });
    expect(corps).toEqual({ ...DONNEES, statut: 'EN_COURS' });

    serveur.use(
      msw.put('*/api/chantiers/1', () =>
        HttpResponse.json(
          { status: 409, detail: 'Le chantier 1 est terminé et ne peut plus être modifié.' },
          { status: 409 },
        ),
      ),
    );
    await expect(api.modifierChantier(1, DONNEES)).rejects.toMatchObject({
      status: 409,
      message: 'Le chantier 1 est terminé et ne peut plus être modifié.',
    });
  });

  it('clôture un chantier (PATCH /cloture)', async () => {
    serveur.use(
      msw.patch('*/api/chantiers/1/cloture', () =>
        HttpResponse.json({ ...CHANTIER, statut: 'TERMINE' }),
      ),
    );
    await expect(api.cloturerChantier(1)).resolves.toMatchObject({ statut: 'TERMINE' });
  });

  it('supprime un chantier (DELETE → 204)', async () => {
    let appele = false;
    serveur.use(
      msw.delete('*/api/chantiers/1', () => {
        appele = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await expect(api.supprimerChantier(1)).resolves.toBeUndefined();
    expect(appele).toBe(true);
  });

  it('arrondit l’avancement global à l’entier', async () => {
    serveur.use(
      msw.get('*/api/chantiers/1/avancement', () =>
        HttpResponse.json({
          chantierId: 1,
          nombreTaches: 3,
          avancementGlobal: 66.7,
          sourceDisponible: true,
        }),
      ),
    );
    await expect(api.getAvancement(1)).resolves.toEqual({
      chantierId: 1,
      nombreTaches: 3,
      avancementGlobal: 67,
      sourceDisponible: true,
    });
  });

  it('avancement en mode dégradé : avancementGlobal null, sourceDisponible false', async () => {
    serveur.use(
      msw.get('*/api/chantiers/1/avancement', () =>
        HttpResponse.json({
          chantierId: 1,
          nombreTaches: 0,
          avancementGlobal: null,
          sourceDisponible: false,
        }),
      ),
    );
    await expect(api.getAvancement(1)).resolves.toEqual({
      chantierId: 1,
      nombreTaches: 0,
      avancementGlobal: null,
      sourceDisponible: false,
    });
  });

  it('module Chantiers arrêté (502 de la gateway) → 503', async () => {
    serveur.use(msw.get('*/api/chantiers', () => new HttpResponse(null, { status: 502 })));
    await expect(api.listerChantiers()).rejects.toMatchObject({
      status: 503,
      message: 'Le module Chantiers est indisponible, réessayez dans un instant.',
    });
  });
});

describe('Chantiers en mode fictif (par défaut)', () => {
  it('n’appelle pas le réseau', async () => {
    vi.stubEnv('VITE_API_CHANTIERS', 'fictif');
    // onUnhandledRequest: 'error' ferait échouer le test si un appel réseau partait.
    const chantiers = await api.listerChantiers();
    expect(chantiers.length).toBeGreaterThan(0);
  });
});
