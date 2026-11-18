import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { afficherApp } from '@/test/rendu';

import * as api from './api';
import { COMPTES_DEMO, MOT_DE_PASSE_DEMO, sessionDemo } from './api';
import { CLE_SESSION, ecrireSession, effacerSession, lireSession } from './session';

// La vraie fonction est utilisée, sauf dans le test de l'état de chargement.
vi.mock('./api', async (original) => {
  const reel = await original<typeof import('./api')>();
  return { ...reel, connecter: vi.fn(reel.connecter) };
});

const titre = (nom: string) => screen.findByRole('heading', { level: 1, name: nom });

async function seConnecter(email: string, motDePasse = MOT_DE_PASSE_DEMO) {
  await userEvent.type(screen.getByLabelText('Adresse e-mail'), email);
  await userEvent.type(screen.getByLabelText('Mot de passe'), motDePasse);
  await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
}

describe('Page de connexion', () => {
  it('reprend l’écran 1 de la maquette avec les 4 profils', () => {
    afficherApp('/connexion', { role: null });
    expect(screen.getByRole('heading', { level: 1, name: 'Connexion' })).toBeInTheDocument();
    const profils = screen.getByRole('group', { name: 'Profil' });
    for (const p of ['Direction', 'Conducteur de travaux', 'Chef de chantier', 'Magasinier']) {
      expect(within(profils).getByRole('radio', { name: new RegExp(p) })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Passer au thème sombre' })).toBeInTheDocument();
  });

  it('remplit les identifiants de démo quand on choisit un profil', async () => {
    afficherApp('/connexion', { role: null });
    await userEvent.click(screen.getByRole('radio', { name: /Magasinier/ }));

    expect(screen.getByLabelText('Adresse e-mail')).toHaveValue(COMPTES_DEMO.MAGASINIER.email);
    expect(screen.getByLabelText('Mot de passe')).toHaveValue(MOT_DE_PASSE_DEMO);
    expect(screen.getByRole('radio', { name: /Magasinier/ })).toBeChecked();
  });

  it('affiche les erreurs Zod sous les champs', async () => {
    afficherApp('/connexion', { role: null });
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByText('L’adresse e-mail est obligatoire')).toBeInTheDocument();
    expect(screen.getByText('Le mot de passe est obligatoire')).toBeInTheDocument();
    expect(screen.getByLabelText('Adresse e-mail')).toHaveAttribute('aria-invalid', 'true');

    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'samir.haddou');
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByText(/Adresse e-mail invalide/)).toBeInTheDocument();
    expect(api.connecter).not.toHaveBeenCalled();
  });

  it('refuse de mauvais identifiants sans ouvrir de session', async () => {
    const { router } = afficherApp('/connexion', { role: null });
    await seConnecter(COMPTES_DEMO.CONDUCTEUR.email, 'mauvais');

    const alerte = await screen.findByRole('alert');
    expect(alerte).toHaveTextContent('Connexion refusée');
    expect(alerte).toHaveTextContent('Adresse e-mail ou mot de passe incorrect.');
    expect(router.state.location.pathname).toBe('/connexion');
    expect(lireSession()).toBeNull();
  });

  it('montre un état de chargement pendant la vérification', async () => {
    let terminer: () => void = () => {};
    vi.mocked(api.connecter).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          terminer = () => resolve(sessionDemo('CONDUCTEUR'));
        }),
    );
    afficherApp('/connexion', { role: null });
    await seConnecter(COMPTES_DEMO.CONDUCTEUR.email);

    const bouton = await screen.findByRole('button', { name: 'Connexion…' });
    expect(bouton).toBeDisabled();
    terminer();
    expect(await titre('Tableau de bord')).toBeInTheDocument();
  });

  it('ouvre la page d’accueil du profil et mémorise la session', async () => {
    const { router } = afficherApp('/connexion', { role: null });
    await userEvent.click(screen.getByRole('radio', { name: /Magasinier/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await titre('Matériaux et stock')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/materiaux');
    expect(lireSession()?.utilisateur.role).toBe('MAGASINIER');
  });
});

describe('Routes protégées', () => {
  it('redirige un visiteur vers /connexion puis le ramène à la page demandée', async () => {
    const { router } = afficherApp('/chantiers?statut=EN_COURS', { role: null });

    expect(await titre('Connexion')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/connexion');

    await seConnecter(COMPTES_DEMO.CONDUCTEUR.email);

    expect(await titre('Tous les chantiers')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/chantiers');
    expect(router.state.location.search).toBe('?statut=EN_COURS');
  });

  it.each(['/', '/taches/3', '/ouvriers/1', '/materiaux', '/inconnue'])(
    'protège %s',
    async (url) => {
      afficherApp(url, { role: null });
      expect(await titre('Connexion')).toBeInTheDocument();
    },
  );

  it('renvoie un utilisateur connecté qui ouvre /connexion vers son accueil', async () => {
    afficherApp('/connexion', { role: 'CHEF_CHANTIER' });
    expect(await titre('Tableau de bord')).toBeInTheDocument();
  });

  it('ignore une session illisible', async () => {
    sessionStorage.setItem(CLE_SESSION, '{pas du json');
    afficherApp('/', { role: null });
    expect(await titre('Connexion')).toBeInTheDocument();
  });
});

describe('Menu et actions selon le rôle', () => {
  const menu = () => screen.getByRole('navigation', { name: 'Navigation principale' });
  const liens = () =>
    within(menu())
      .getAllByRole('link')
      .map((l) => l.textContent?.trim());

  it('magasinier : Matériaux, pas Ouvriers ni Tâches, pas de création de chantier', async () => {
    afficherApp('/chantiers', { role: 'MAGASINIER' });
    expect(await titre('Tous les chantiers')).toBeInTheDocument();

    expect(liens()).toEqual(['Tableau de bord', 'Chantiers', expect.stringMatching(/^Matériaux/)]);
    expect(screen.queryByRole('button', { name: 'Nouveau chantier' })).not.toBeInTheDocument();
  });

  it('magasinier : gère le stock', async () => {
    afficherApp('/materiaux', { role: 'MAGASINIER' });
    expect(await screen.findByRole('button', { name: 'Entrée / sortie de stock' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Nouveau matériau' })).toBeVisible();
  });

  it('magasinier : une page hors de son profil affiche « Accès refusé »', async () => {
    afficherApp('/ouvriers', { role: 'MAGASINIER' });
    expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument();
    expect(screen.getByText('Le profil « Magasinier » n’a pas accès à cette page.')).toBeVisible();
  });

  it('chef de chantier : équipes et tâches, pas de matériaux ni de création de chantier', async () => {
    afficherApp('/chantiers/1', { role: 'CHEF_CHANTIER' });
    expect(await screen.findByRole('link', { name: 'Nouvelle tâche' })).toBeVisible();

    expect(liens()).toEqual(['Tableau de bord', 'Chantiers', 'Tâches', 'Ouvriers']);
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clôturer le chantier' })).not.toBeInTheDocument();
  });

  it('direction : crée des chantiers mais ne planifie pas de tâche', async () => {
    afficherApp('/taches', { role: 'DIRECTION' });
    expect(await titre('Toutes les tâches')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nouvelle tâche' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Démarrer la tâche/ })).not.toBeInTheDocument();
  });

  it('direction : le formulaire de nouvelle tâche est refusé', async () => {
    afficherApp('/taches/nouvelle', { role: 'DIRECTION' });
    expect(await screen.findByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument();
  });

  it('conducteur de travaux : toutes les sections et actions', async () => {
    afficherApp('/chantiers', { role: 'CONDUCTEUR' });
    expect(await screen.findByRole('button', { name: 'Nouveau chantier' })).toBeVisible();
    expect(liens()).toHaveLength(5);
  });
});

describe('Barre du haut et déconnexion', () => {
  it('affiche le nom et le profil de l’utilisateur connecté', async () => {
    afficherApp('/', { role: 'CHEF_CHANTIER' });
    const carte = await screen.findByRole('group', { name: 'Utilisateur connecté' });
    expect(carte).toHaveTextContent('Karim Aït Ali');
    expect(carte).toHaveTextContent('Chef de chantier');
  });

  it('déconnecte, efface la session et ne revient pas à la page quittée', async () => {
    const { router } = afficherApp('/ouvriers', { role: 'CONDUCTEUR' });
    await userEvent.click(await screen.findByRole('button', { name: 'Déconnexion' }));

    expect(await titre('Connexion')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Vous êtes déconnecté.');
    expect(lireSession()).toBeNull();

    await seConnecter(COMPTES_DEMO.MAGASINIER.email);
    expect(await titre('Matériaux et stock')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/materiaux');
  });
});

describe('Session du navigateur', () => {
  it('écrit, relit et efface la session', () => {
    ecrireSession(sessionDemo('DIRECTION'));
    expect(lireSession()?.utilisateur.nom).toBe('Nadia Belkadi');
    effacerSession();
    expect(lireSession()).toBeNull();
  });

  it('ne plante pas si le stockage est indisponible', () => {
    const lecture = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const ecriture = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const suppression = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => ecrireSession(sessionDemo('DIRECTION'))).not.toThrow();
    expect(lireSession()).toBeNull();
    expect(() => effacerSession()).not.toThrow();

    lecture.mockRestore();
    ecriture.mockRestore();
    suppression.mockRestore();
  });

  it('refuse une session sans jeton', () => {
    sessionStorage.setItem(CLE_SESSION, JSON.stringify({ utilisateur: COMPTES_DEMO.DIRECTION }));
    expect(lireSession()).toBeNull();
  });
});

describe('API fictive d’authentification', () => {
  it('accepte un e-mail en majuscules avec des espaces', async () => {
    const s = await api.connecter({
      email: '  SAMIR.HADDOU@souss-batiment.demo ',
      motDePasse: MOT_DE_PASSE_DEMO,
    });
    expect(s.utilisateur.role).toBe('CONDUCTEUR');
  });

  it('renvoie un 401 pour un compte inconnu', async () => {
    await expect(
      api.connecter({ email: 'inconnu@souss-batiment.demo', motDePasse: MOT_DE_PASSE_DEMO }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
