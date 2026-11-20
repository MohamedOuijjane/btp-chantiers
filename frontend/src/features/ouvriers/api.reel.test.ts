import { http as msw, HttpResponse } from 'msw';

import { ErreurApi } from '@/api/errors';
import { sessionDemo } from '@/features/auth/api';
import { effacerSession, ecrireSession } from '@/features/auth/session';
import { demarrerServeurMsw } from '@/test/msw';

import * as api from './api';
import type { Ouvrier, Planning } from './types';

const serveur = demarrerServeurMsw();

const OUVRIER: Ouvrier = {
  id: 1,
  nom: 'El Amrani',
  prenom: 'Youssef',
  cin: 'JB123456',
  specialite: 'MACON',
  telephone: '0612345678',
  disponible: true,
};
const CREATION = {
  nom: OUVRIER.nom,
  prenom: OUVRIER.prenom,
  cin: OUVRIER.cin,
  specialite: OUVRIER.specialite,
  telephone: OUVRIER.telephone,
};

/** Réponses d'erreur telles que FastAPI (Ouvriers) les renvoie. */
const detail = (d: unknown, status: number) => HttpResponse.json({ detail: d }, { status });

beforeEach(() => {
  vi.stubEnv('VITE_API_OUVRIERS', 'reel');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Ouvriers en mode réel (VITE_API_OUVRIERS=reel)', () => {
  it('liste les ouvriers avec les filtres de spécialité et de disponibilité', async () => {
    let url = '';
    serveur.use(
      msw.get('*/api/ouvriers', ({ request }) => {
        url = request.url;
        return HttpResponse.json([OUVRIER]);
      }),
    );

    await expect(api.listerOuvriers({ specialite: 'MACON', disponible: false })).resolves.toEqual([
      OUVRIER,
    ]);
    const params = new URL(url).searchParams;
    expect(params.get('specialite')).toBe('MACON');
    expect(params.get('disponible')).toBe('false');

    await api.listerOuvriers();
    expect(new URL(url).search).toBe('');
  });

  it('envoie le jeton de la session et passe par la gateway (chemin relatif)', async () => {
    ecrireSession({ ...sessionDemo('CONDUCTEUR'), jeton: 'jeton.test' });
    let auth: string | null = null;
    let origine = '';
    serveur.use(
      msw.get('*/api/ouvriers/1', ({ request }) => {
        auth = request.headers.get('Authorization');
        origine = new URL(request.url).origin;
        return HttpResponse.json(OUVRIER);
      }),
    );

    await expect(api.getOuvrier(1)).resolves.toEqual(OUVRIER);
    expect(auth).toBe('Bearer jeton.test');
    expect(origine).toBe(window.location.origin);
    effacerSession();
  });

  it('consulte un ouvrier ; 404 devient une ApiError', async () => {
    serveur.use(msw.get('*/api/ouvriers/99', () => detail('Ouvrier 99 introuvable', 404)));

    const e = await api.getOuvrier(99).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErreurApi);
    expect(e).toMatchObject({ status: 404, message: 'Ouvrier 99 introuvable' });
  });

  it('crée un ouvrier (POST) avec le corps du formulaire', async () => {
    let corps: unknown;
    serveur.use(
      msw.post('*/api/ouvriers', async ({ request }) => {
        corps = await request.json();
        return HttpResponse.json(OUVRIER, { status: 201 });
      }),
    );

    await expect(api.creerOuvrier(CREATION)).resolves.toEqual(OUVRIER);
    expect(corps).toEqual(CREATION);
  });

  it('409 CIN en double : message rattaché au champ cin (#114)', async () => {
    serveur.use(
      msw.post('*/api/ouvriers', () =>
        detail(
          [
            {
              loc: ['body', 'cin'],
              msg: 'La CIN JB123456 est déjà utilisée par un autre ouvrier',
              type: 'cin_deja_utilisee',
            },
          ],
          409,
        ),
      ),
    );

    await expect(api.creerOuvrier(CREATION)).rejects.toMatchObject({
      status: 409,
      champs: { cin: 'La CIN JB123456 est déjà utilisée par un autre ouvrier' },
    });
  });

  it('422 de validation Pydantic : une erreur par champ', async () => {
    serveur.use(
      msw.post('*/api/ouvriers', () =>
        detail(
          [
            {
              loc: ['body', 'cin'],
              msg: 'Format de CIN invalide',
              type: 'string_pattern_mismatch',
            },
            {
              loc: ['body', 'telephone'],
              msg: 'Téléphone invalide',
              type: 'string_pattern_mismatch',
            },
          ],
          422,
        ),
      ),
    );

    await expect(api.creerOuvrier(CREATION)).rejects.toMatchObject({
      status: 422,
      champs: { cin: 'Format de CIN invalide', telephone: 'Téléphone invalide' },
    });
  });

  it('modifie un ouvrier (PATCH partiel, dont la disponibilité)', async () => {
    let corps: unknown;
    serveur.use(
      msw.patch('*/api/ouvriers/1', async ({ request }) => {
        corps = await request.json();
        return HttpResponse.json({ ...OUVRIER, disponible: false });
      }),
    );

    await expect(api.modifierOuvrier(1, { disponible: false })).resolves.toMatchObject({
      disponible: false,
    });
    expect(corps).toEqual({ disponible: false });
  });

  it('supprime un ouvrier (DELETE 204)', async () => {
    let appele = false;
    serveur.use(
      msw.delete('*/api/ouvriers/1', () => {
        appele = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(api.supprimerOuvrier(1)).resolves.toBeUndefined();
    expect(appele).toBe(true);
  });

  it('409 suppression refusée : le message cite les tâches non terminées (#15)', async () => {
    const message =
      'Suppression impossible : Youssef El Amrani est affecté à 2 tâche(s) non terminée(s) : ' +
      '« Fondations », « Coffrage ». Retirez-le de ces tâches ou terminez-les avant de le supprimer.';
    serveur.use(msw.delete('*/api/ouvriers/1', () => detail(message, 409)));

    await expect(api.supprimerOuvrier(1)).rejects.toMatchObject({ status: 409, message });
  });

  it('503 du service (Tâches injoignable) : le message du service est conservé', async () => {
    const message =
      'Le module Tâches ne répond pas : impossible de vérifier les affectations de l’ouvrier, ' +
      'suppression annulée. Réessayez plus tard.';
    serveur.use(msw.delete('*/api/ouvriers/1', () => detail(message, 503)));

    await expect(api.supprimerOuvrier(1)).rejects.toMatchObject({ status: 503, message });
  });

  it('502 de la gateway (Ouvriers arrêté) : 503 « module Ouvriers indisponible »', async () => {
    serveur.use(msw.get('*/api/ouvriers', () => new HttpResponse('Bad Gateway', { status: 502 })));

    const e = await api.listerOuvriers().catch((x: unknown) => x);
    expect(e).toMatchObject({ status: 503 });
    expect((e as ErreurApi).message).toContain('Ouvriers');
  });

  it('planning : sourceDisponible lu tel quel et tâches triées par date de début', async () => {
    const planning: Planning = {
      ouvrier: OUVRIER,
      taches: [
        {
          id: 2,
          chantierId: 1,
          titre: 'Coffrage',
          dateDebut: '2026-12-01',
          dateFin: '2026-12-05',
          statut: 'A_FAIRE',
        },
        {
          id: 1,
          chantierId: 1,
          titre: 'Fondations',
          dateDebut: '2026-11-02',
          dateFin: '2026-11-10',
          statut: 'EN_COURS',
        },
      ],
      sourceDisponible: true,
    };
    serveur.use(msw.get('*/api/ouvriers/1/planning', () => HttpResponse.json(planning)));

    const p = await api.getPlanning(1);
    expect(p.sourceDisponible).toBe(true);
    expect(p.taches.map((t) => t.titre)).toEqual(['Fondations', 'Coffrage']);
  });

  it('planning en mode dégradé : sourceDisponible = false, aucune tâche', async () => {
    serveur.use(
      msw.get('*/api/ouvriers/1/planning', () =>
        HttpResponse.json({ ouvrier: OUVRIER, taches: [], sourceDisponible: false }),
      ),
    );

    await expect(api.getPlanning(1)).resolves.toEqual({
      ouvrier: OUVRIER,
      taches: [],
      sourceDisponible: false,
    });
  });
});
