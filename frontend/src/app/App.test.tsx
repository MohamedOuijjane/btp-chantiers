import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { afficherApp as afficher } from '@/test/rendu';

import { VAR_HAUTEUR_TOPBAR } from './layout/Topbar';
import { CLE_THEME } from './useTheme';

describe('Layout et routes', () => {
  it.each([
    ['/', 'Tableau de bord'],
    ['/chantiers', 'Tous les chantiers'],
    ['/chantiers/12', 'Chantier n° 12'],
    ['/chantiers/12/taches/nouvelle', 'Nouvelle tâche'],
    ['/ouvriers', 'Ouvriers'],
    ['/materiaux', 'Matériaux et stock'],
    ['/inconnue', 'Page introuvable'],
  ])('%s affiche le titre « %s »', (url, titre) => {
    afficher(url);
    expect(screen.getByRole('heading', { level: 1, name: titre })).toBeInTheDocument();
  });

  it('affiche la navigation et marque la page courante', () => {
    afficher('/ouvriers');
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' });
    expect(nav).toHaveTextContent('Pilotage');
    expect(nav).toHaveTextContent('Ressources');
    expect(screen.getByRole('link', { name: 'Ouvriers' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Tableau de bord' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('construit le fil d’Ariane de la création de tâche', () => {
    afficher('/chantiers/7/taches/nouvelle');
    const fil = screen.getByRole('navigation', { name: "Fil d'Ariane" });
    expect(fil).toHaveTextContent('Chantiers·Planification');
  });

  it('ouvre le menu mobile, navigue et le referme', async () => {
    const { router } = afficher('/');
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));

    const tiroir = screen.getByRole('dialog', { name: 'Menu' });
    const nav = within(tiroir).getByRole('navigation', { name: 'Navigation principale' });
    await userEvent.click(within(nav).getByRole('link', { name: 'Chantiers' }));

    expect(router.state.location.pathname).toBe('/chantiers');
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
  });

  it('ferme le menu mobile avec Échap ou le bouton de fermeture', async () => {
    afficher('/');
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fermer le menu' }));
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
  });

  it('publie la hauteur de la barre du haut pour scroll-padding-top', () => {
    const { unmount } = afficher('/');
    const racine = document.documentElement.style;
    expect(racine.getPropertyValue(VAR_HAUTEUR_TOPBAR)).toMatch(/^\d+px$/);
    unmount();
    expect(racine.getPropertyValue(VAR_HAUTEUR_TOPBAR)).toBe('');
  });

  it('bascule le thème et mémorise le choix', async () => {
    afficher('/');
    expect(document.documentElement).not.toHaveClass('dark');

    await userEvent.click(screen.getByRole('button', { name: 'Passer en thème sombre' }));

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem(CLE_THEME)).toBe('sombre');
    expect(screen.getByRole('button', { name: 'Passer en thème clair' })).toBeInTheDocument();
  });
});
