import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http as msw, HttpResponse } from 'msw';

import { creerClientHttp } from '@/api/http';
import { demarrerServeurMsw } from '@/test/msw';
import { afficherApp } from '@/test/rendu';

import * as api from './api';
import { COMPTES_DEMO } from './api';
import { ecrireSession, lireSession, surSessionExpiree } from './session';
import type { Session } from './types';

const serveur = demarrerServeurMsw();

const CONDUCTEUR = COMPTES_DEMO.CONDUCTEUR;
const SESSION: Session = { utilisateur: CONDUCTEUR, jeton: 'jeton.jwt.valide' };
const REFUS_401 = {
  type: 'about:blank',
  title: 'Unauthorized',
  status: 401,
  detail: 'Authentification requise : jeton absent, invalide ou expiré.',
};

beforeEach(() => {
  vi.stubEnv('VITE_API_AUTH', 'reel');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Authentification réelle : api.ts', () => {
  it('POST /api/auth/login : e-mail normalisé, réponse { token, utilisateur } → session', async () => {
    let corps: unknown;
    serveur.use(
      msw.post('*/api/auth/login', async ({ request }) => {
        corps = await request.json();
        return HttpResponse.json({ token: 'jeton.jwt.recu', utilisateur: CONDUCTEUR });
      }),
    );

    const session = await api.connecter({
      email: '  Samir.Haddou@Souss-Batiment.demo ',
      motDePasse: 'secret',
    });

    expect(corps).toEqual({ email: CONDUCTEUR.email, motDePasse: 'secret' });
    expect(session).toEqual({ jeton: 'jeton.jwt.recu', utilisateur: CONDUCTEUR });
  });

  it('401 à la connexion : ApiError avec le message du serveur, sans « session expirée »', async () => {
    const expiree = vi.fn();
    const desabonner = surSessionExpiree(expiree);
    serveur.use(
      msw.post('*/api/auth/login', () =>
        HttpResponse.json(
          { status: 401, detail: 'Adresse e-mail ou mot de passe incorrect.' },
          { status: 401 },
        ),
      ),
    );

    await expect(api.connecter({ email: CONDUCTEUR.email, motDePasse: 'x' })).rejects.toMatchObject(
      { status: 401, message: 'Adresse e-mail ou mot de passe incorrect.' },
    );
    expect(expiree).not.toHaveBeenCalled();
    desabonner();
  });

  it('429 : trop de tentatives', async () => {
    serveur.use(
      msw.post('*/api/auth/login', () =>
        HttpResponse.json(
          { status: 429, detail: 'Trop de tentatives de connexion. Réessayez dans 15 minute(s).' },
          { status: 429, headers: { 'Retry-After': '900' } },
        ),
      ),
    );
    await expect(api.connecter({ email: CONDUCTEUR.email, motDePasse: 'x' })).rejects.toMatchObject(
      { status: 429, message: expect.stringContaining('Trop de tentatives') as string },
    );
  });
});

describe('http.ts : jeton et session expirée', () => {
  const client = creerClientHttp('Chantiers');

  it('envoie Authorization: Bearer <jeton> quand une session existe', async () => {
    let autorisation: string | null = null;
    serveur.use(
      msw.get('*/api/chantiers', ({ request }) => {
        autorisation = request.headers.get('Authorization');
        return HttpResponse.json([]);
      }),
    );
    ecrireSession(SESSION);

    await client.get('/api/chantiers');
    expect(autorisation).toBe('Bearer jeton.jwt.valide');
  });

  it('sans session : pas d’en-tête Authorization', async () => {
    let autorisation: string | null = 'absent';
    serveur.use(
      msw.get('*/api/chantiers', ({ request }) => {
        autorisation = request.headers.get('Authorization');
        return HttpResponse.json([]);
      }),
    );
    await client.get('/api/chantiers');
    expect(autorisation).toBeNull();
  });

  it('401 avec un jeton : session effacée et abonnés prévenus', async () => {
    const expiree = vi.fn();
    const desabonner = surSessionExpiree(expiree);
    serveur.use(msw.get('*/api/chantiers', () => HttpResponse.json(REFUS_401, { status: 401 })));
    ecrireSession(SESSION);

    await expect(client.get('/api/chantiers')).rejects.toMatchObject({ status: 401 });
    expect(lireSession()).toBeNull();
    expect(expiree).toHaveBeenCalledTimes(1);
    desabonner();
  });
});

describe('Session expirée dans l’application', () => {
  it('un 401 d’une API ramène à /connexion avec « Session expirée », puis à la page après reconnexion', async () => {
    vi.stubEnv('VITE_API_CHANTIERS', 'reel');
    let jetonValide = false;
    serveur.use(
      msw.get('*/api/chantiers', ({ request }) =>
        jetonValide && request.headers.get('Authorization') === 'Bearer jeton.neuf'
          ? HttpResponse.json([])
          : HttpResponse.json(REFUS_401, { status: 401 }),
      ),
      msw.post('*/api/auth/login', () => {
        jetonValide = true;
        return HttpResponse.json({ token: 'jeton.neuf', utilisateur: CONDUCTEUR });
      }),
    );
    ecrireSession({ utilisateur: CONDUCTEUR, jeton: 'jeton.expire' });

    const { router } = afficherApp('/chantiers', { role: null });

    expect(await screen.findByRole('heading', { level: 1, name: 'Connexion' })).toBeInTheDocument();
    expect(screen.getByText('Session expirée.')).toBeInTheDocument();
    expect(lireSession()).toBeNull();

    // Mode réel : choisir un profil remplit l'adresse, pas le mot de passe.
    await userEvent.click(screen.getByRole('radio', { name: /Conducteur de travaux/ }));
    expect(screen.getByLabelText('Adresse e-mail')).toHaveValue(CONDUCTEUR.email);
    expect(screen.getByLabelText('Mot de passe')).toHaveValue('');

    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret-de-demo');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    // Retour sur la liste des chantiers, chargée avec le nouveau jeton (réponse vide).
    expect(await screen.findByText('Aucun chantier')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/chantiers');
    expect(lireSession()?.jeton).toBe('jeton.neuf');
    expect(screen.queryByText('Session expirée.')).not.toBeInTheDocument();
  });
});
