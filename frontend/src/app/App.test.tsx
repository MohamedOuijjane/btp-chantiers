import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

import { CLE_THEME } from './useTheme';
import { futurRouteur, routes } from './routes';

function afficher(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url], future: futurRouteur });
  render(<RouterProvider router={router} future={{ v7_startTransition: true }} />);
}

describe('Layout et routes', () => {
  it.each([
    ['/', 'Tableau de bord'],
    ['/chantiers', 'Chantiers'],
    ['/chantiers/12', 'Chantier n° 12'],
    ['/chantiers/12/taches/nouvelle', 'Nouvelle tâche'],
    ['/ouvriers', 'Ouvriers'],
    ['/materiaux', 'Matériaux'],
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
    expect(fil).toHaveTextContent('Souss Bâtiment·Chantiers·Chantier n° 7');
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
