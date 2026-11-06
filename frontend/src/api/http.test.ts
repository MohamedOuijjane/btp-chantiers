import { delay, http as msw, HttpResponse } from 'msw';

import { demarrerServeurMsw } from '@/test/msw';

import { ErreurApi } from './errors';
import { construireUrl, creerClientHttp, requete, versErreurApi } from './http';

const serveur = demarrerServeurMsw();
const client = creerClientHttp('Chantiers');

/** Attend l'échec de la promesse et renvoie l'erreur levée. */
async function erreurDe(promesse: Promise<unknown>): Promise<unknown> {
  return promesse.then(
    () => {
      throw new Error('La promesse aurait dû échouer');
    },
    (e: unknown) => e,
  );
}

async function erreurApiDe(promesse: Promise<unknown>) {
  const e = await erreurDe(promesse);
  expect(e).toBeInstanceOf(ErreurApi);
  return e as ErreurApi;
}

describe('http.ts : requêtes', () => {
  it('appelle la gateway sur la même origine, avec les paramètres non vides et un X-Request-Id', async () => {
    let recue: Request | undefined;
    serveur.use(
      msw.get('*/api/chantiers', ({ request }) => {
        recue = request;
        return HttpResponse.json([{ id: 1 }]);
      }),
    );

    const r = await client.get<{ id: number }[]>('/api/chantiers', {
      params: { statut: 'EN_COURS', vide: '', absent: undefined, nul: null },
    });

    expect(r).toEqual([{ id: 1 }]);
    const url = new URL(recue!.url);
    expect(url.origin).toBe(window.location.origin);
    expect(url.search).toBe('?statut=EN_COURS');
    expect(recue!.headers.get('X-Request-Id')).toMatch(/^[0-9a-f]{32}$/);
    expect(recue!.headers.get('Accept')).toBe('application/json');
  });

  it('envoie le corps en JSON', async () => {
    let corps: unknown;
    let type: string | null = null;
    serveur.use(
      msw.post('*/api/chantiers', async ({ request }) => {
        type = request.headers.get('Content-Type');
        corps = await request.json();
        return HttpResponse.json({ id: 7 }, { status: 201 });
      }),
    );

    await expect(client.post('/api/chantiers', { nom: 'A' })).resolves.toEqual({ id: 7 });
    expect(type).toBe('application/json');
    expect(corps).toEqual({ nom: 'A' });
  });

  it('renvoie undefined pour une réponse 204', async () => {
    serveur.use(msw.delete('*/api/chantiers/3', () => new HttpResponse(null, { status: 204 })));
    await expect(client.supprimer('/api/chantiers/3')).resolves.toBeUndefined();
  });

  it('construit une URL absolue de même origine', () => {
    expect(construireUrl('/api/taches', { chantierId: 3, ouvrierId: undefined })).toBe(
      `${window.location.origin}/api/taches?chantierId=3`,
    );
  });
});

describe('http.ts : conversion des erreurs en ApiError', () => {
  it('Chantiers (RFC 9457) : detail et erreurs par champ, X-Request-Id de la réponse', async () => {
    serveur.use(
      msw.post('*/api/chantiers', () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Bad Request',
            status: 400,
            detail: 'Données invalides',
            erreurs: { dateFinPrevue: 'La date de fin prévue doit être postérieure' },
          },
          {
            status: 400,
            headers: { 'Content-Type': 'application/problem+json', 'X-Request-Id': 'abc123' },
          },
        ),
      ),
    );

    const e = await erreurApiDe(client.post('/api/chantiers', {}));
    expect(e).toMatchObject({
      status: 400,
      message: 'Données invalides',
      champs: { dateFinPrevue: 'La date de fin prévue doit être postérieure' },
      requestId: 'abc123',
    });
  });

  it('reprend le X-Request-Id envoyé quand la réponse n’en a pas', async () => {
    let envoye: string | null = null;
    serveur.use(
      msw.get('*/api/chantiers/9', ({ request }) => {
        envoye = request.headers.get('X-Request-Id');
        return HttpResponse.json(
          { status: 404, detail: 'Chantier 9 introuvable' },
          { status: 404 },
        );
      }),
    );

    const e = await erreurApiDe(client.get('/api/chantiers/9'));
    expect(e).toMatchObject({ status: 404, message: 'Chantier 9 introuvable', requestId: envoye });
  });

  it('Chantiers : 409 avec detail', () => {
    const e = versErreurApi('Chantiers', 409, { status: 409, detail: 'Le chantier 1 est terminé' });
    expect(e).toMatchObject({ status: 409, message: 'Le chantier 1 est terminé' });
    expect(e.champs).toBeUndefined();
  });

  it('Tâches (NestJS) : message en chaîne', () => {
    const e = versErreurApi('Tâches', 404, {
      statusCode: 404,
      message: 'Tâche 12 introuvable',
      error: 'Not Found',
    });
    expect(e).toMatchObject({ status: 404, message: 'Tâche 12 introuvable' });
  });

  it('Tâches (NestJS) : tableau de messages de validation, rattachés à leur champ', () => {
    const e = versErreurApi('Tâches', 400, {
      statusCode: 400,
      message: ['titre should not be empty', 'dateFin must be a valid ISO 8601 date string'],
      error: 'Bad Request',
    });
    expect(e.status).toBe(400);
    expect(e.message).toBe(
      'titre should not be empty. dateFin must be a valid ISO 8601 date string',
    );
    expect(e.champs).toEqual({
      titre: 'titre should not be empty',
      dateFin: 'dateFin must be a valid ISO 8601 date string',
    });
  });

  it('Tâches (NestJS) : un message en français n’est pas pris pour un champ', () => {
    const e = versErreurApi('Tâches', 409, {
      statusCode: 409,
      message: ['Le chantier « A » est clôturé'],
    });
    expect(e.champs).toBeUndefined();
  });

  it('Ouvriers (FastAPI) : detail en chaîne', () => {
    const e = versErreurApi('Ouvriers', 409, { detail: 'La CIN AB123456 est déjà utilisée' });
    expect(e).toMatchObject({ status: 409, message: 'La CIN AB123456 est déjà utilisée' });
  });

  it('Ouvriers (FastAPI) : detail en tableau → champs (dernier élément de loc)', () => {
    const e = versErreurApi('Ouvriers', 422, {
      detail: [
        { loc: ['body', 'cin'], msg: 'Format de CIN invalide', type: 'value_error' },
        { loc: ['body', 'telephone'], msg: 'Numéro marocain attendu', type: 'value_error' },
        { loc: ['body', 'cin'], msg: 'Deuxième message ignoré', type: 'value_error' },
      ],
    });
    expect(e).toMatchObject({
      status: 422,
      message: 'Données invalides',
      champs: { cin: 'Format de CIN invalide', telephone: 'Numéro marocain attendu' },
    });
  });

  it('corps vide ou non JSON : message par défaut selon le code', async () => {
    serveur.use(
      msw.get('*/api/chantiers', () => new HttpResponse('<html>Erreur</html>', { status: 500 })),
    );
    const e = await erreurApiDe(client.get('/api/chantiers'));
    expect(e).toMatchObject({ status: 500, message: 'Erreur interne du serveur' });
    expect(versErreurApi('Chantiers', 418, undefined).message).toBe('Erreur 418');
  });

  it.each([502, 504])('réponse %i de la gateway → 503 « module indisponible »', async (code) => {
    serveur.use(
      msw.get(
        '*/api/chantiers',
        () => new HttpResponse('<html>Bad Gateway</html>', { status: code }),
      ),
    );
    const e = await erreurApiDe(client.get('/api/chantiers'));
    expect(e).toMatchObject({
      status: 503,
      message: 'Le module Chantiers est indisponible, réessayez dans un instant.',
    });
  });

  it('503 renvoyé par un service : son message est gardé', () => {
    const e = versErreurApi('Tâches', 503, {
      statusCode: 503,
      message: 'Le module Ouvriers est indisponible, réessayez dans un instant.',
    });
    expect(e).toMatchObject({
      status: 503,
      message: 'Le module Ouvriers est indisponible, réessayez dans un instant.',
    });
  });

  it('503 sans corps lisible → message générique du module', () => {
    expect(versErreurApi('Ouvriers', 503, '').message).toBe(
      'Le module Ouvriers est indisponible, réessayez dans un instant.',
    );
  });
});

describe('http.ts : réseau, délai et annulation', () => {
  it('réseau coupé → 503', async () => {
    serveur.use(msw.get('*/api/chantiers', () => HttpResponse.error()));
    const e = await erreurApiDe(client.get('/api/chantiers'));
    expect(e).toMatchObject({
      status: 503,
      message: 'Le module Chantiers est indisponible, réessayez dans un instant.',
    });
    expect(e.requestId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('délai dépassé → 503 avec un message explicite', async () => {
    serveur.use(
      msw.get('*/api/chantiers', async () => {
        await delay(500);
        return HttpResponse.json([]);
      }),
    );
    const e = await erreurApiDe(requete('Chantiers', 'GET', '/api/chantiers', { delaiMs: 50 }));
    expect(e).toMatchObject({
      status: 503,
      message: 'Le module Chantiers ne répond pas (délai de 0,05 s dépassé).',
    });
  });

  it('annulation par l’appelant : l’erreur d’annulation est propagée, pas une ApiError', async () => {
    serveur.use(
      msw.get('*/api/chantiers', async () => {
        await delay(500);
        return HttpResponse.json([]);
      }),
    );
    const controleur = new AbortController();
    const promesse = client.get('/api/chantiers', { signal: controleur.signal });
    controleur.abort();

    const e = await erreurDe(promesse);
    expect(e).not.toBeInstanceOf(ErreurApi);
    expect((e as Error).name).toBe('AbortError');
  });

  it('signal déjà annulé : aucun appel réseau', async () => {
    let appele = false;
    serveur.use(
      msw.get('*/api/chantiers', () => {
        appele = true;
        return HttpResponse.json([]);
      }),
    );
    const controleur = new AbortController();
    controleur.abort();

    const e = await erreurDe(client.get('/api/chantiers', { signal: controleur.signal }));
    expect((e as Error).name).toBe('AbortError');
    expect(appele).toBe(false);
  });
});
