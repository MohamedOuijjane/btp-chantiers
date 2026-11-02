import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

import { simulerPanne } from '@/api/simulation';
import { afficherApp } from '@/test/rendu';

// Date du jour fixée : « en retard » = date de fin dépassée au 02/11/2026.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-02T10:00:00'));
});
afterEach(() => {
  vi.useRealTimers();
});

const carte = (titre: string) => screen.getByText(titre, { selector: 'span' }).closest('a')!;

async function charge() {
  afficherApp('/');
  await screen.findByRole('list', { name: 'Tâches à suivre' });
}

describe('Tableau de bord', () => {
  it('affiche les 4 indicateurs avec leurs liens', async () => {
    await charge();

    await waitFor(() => expect(carte('Chantiers en cours')).toHaveTextContent('3 / 6'));
    expect(carte('Chantiers en cours')).toHaveTextContent(
      '1 planifié · 3 en cours · 1 suspendu · 1 terminé',
    );
    expect(carte('Chantiers en cours')).toHaveAttribute('href', '/chantiers?statut=EN_COURS');

    expect(carte('Tâches en retard')).toHaveTextContent('1');
    expect(carte('Tâches en retard')).toHaveTextContent('Fin dépassée : Gros œuvre de l’extension');

    await waitFor(() => expect(carte('Ouvriers disponibles')).toHaveTextContent('8 / 10'));
    expect(carte('Ouvriers disponibles')).toHaveTextContent(
      'Indisponibles : Brahim Naciri, Omar Fikri',
    );
    expect(carte('Ouvriers disponibles')).toHaveAttribute('href', '/ouvriers?disponibles=1');

    await waitFor(() => expect(carte('Matériaux en alerte')).toHaveTextContent('2'));
    expect(carte('Matériaux en alerte')).toHaveAttribute('href', '/materiaux?alerte=1');
  });

  it('affiche l’avancement des chantiers en cours et la moyenne', async () => {
    await charge();
    expect(
      await screen.findByRole('progressbar', { name: 'Avancement de Résidence Al Amal' }),
    ).toHaveAttribute('aria-valuenow', '56');
    expect(
      screen.getByRole('progressbar', { name: 'Avancement de Groupe scolaire Anza' }),
    ).toHaveAttribute('aria-valuenow', '47');
    expect(
      screen.getByRole('progressbar', { name: 'Avancement de Immeuble Les Dunes' }),
    ).toHaveAttribute('aria-valuenow', '35');
    expect(screen.getByText('Avancement moyen :').parentElement).toHaveTextContent('46 %');
    expect(screen.getByRole('link', { name: 'Tout voir' })).toHaveAttribute(
      'href',
      '/chantiers?statut=EN_COURS',
    );
  });

  it('liste les alertes de stock, les tâches à suivre et la répartition', async () => {
    await charge();

    const alertes = await screen.findByRole('list', { name: 'Matériaux en alerte' });
    expect(
      within(alertes)
        .getAllByRole('listitem')
        .map((l) => l.querySelector('strong')?.textContent),
    ).toEqual(['Ciment CPJ 45', 'Fer à béton HA12']);

    const aSuivre = screen.getByRole('list', { name: 'Tâches à suivre' });
    const items = within(aSuivre).getAllByRole('listitem');
    expect(items.map((l) => within(l).getByRole('link').textContent)).toEqual([
      'Gros œuvre de l’extension',
      'Étanchéité de la toiture',
      'Coulage de la dalle R+1',
      'Terrassement général',
      'Élévation des murs R+1',
    ]);
    expect(items[0]).toHaveTextContent('en retard');

    expect(
      screen.getByRole('img', { name: '1 planifié, 3 en cours, 1 suspendu, 1 terminé' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/14\s600\s000 MAD/)).toBeInTheDocument();
  });

  it('affiche les dernières activités, du plus récent au plus ancien', async () => {
    await charge();
    const activites = await screen.findByRole('list', { name: 'Dernières activités' });
    const items = within(activites).getAllByRole('listitem');
    expect(items).toHaveLength(8);
    // 01/11 : démarrage de « Coulage de la dalle R+1 » ; 31/10 : sortie de ciment.
    expect(items[0]).toHaveTextContent('01/11');
    expect(items[0]).toHaveTextContent('Coulage de la dalle R+1');
    expect(items[1]).toHaveTextContent('31/10');
    expect(items[1]).toHaveTextContent('Sortie de 120 sacs Ciment CPJ 45 · Résidence Al Amal');
    // Démarrée puis bloquée : deux activités pour la même tâche.
    expect(
      within(activites).getAllByRole('link', { name: 'Étanchéité de la toiture' }),
    ).toHaveLength(2);
  });
});

describe('Tableau de bord en mode dégradé', () => {
  it('Tâches en panne : ses cartes affichent un bandeau, les autres restent affichées', async () => {
    simulerPanne('taches');
    afficherApp('/');

    expect(
      await screen.findByText('Mode dégradé · module Tâches injoignable.'),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(carte('Tâches en retard')).toHaveTextContent('Non disponible (module Tâches)'),
    );
    expect(
      await screen.findByText('Liste indisponible pendant la panne du module Tâches.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Avancement non disponible : le module Tâches ne répond pas/),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Changements de statut des tâches indisponibles (module Tâches).'),
    ).toBeInTheDocument();

    // Les autres modules restent affichés.
    await waitFor(() => expect(carte('Chantiers en cours')).toHaveTextContent('3 / 6'));
    await waitFor(() => expect(carte('Ouvriers disponibles')).toHaveTextContent('8 / 10'));
    expect(await screen.findByRole('list', { name: 'Matériaux en alerte' })).toBeInTheDocument();
    const activites = await screen.findByRole('list', { name: 'Dernières activités' });
    expect(within(activites).getAllByRole('listitem')[0]).toHaveTextContent('Ciment CPJ 45');
  });

  it('Ouvriers en panne : seule la carte Ouvriers est indisponible', async () => {
    simulerPanne('ouvriers');
    await charge();
    await waitFor(() =>
      expect(carte('Ouvriers disponibles')).toHaveTextContent('Non disponible (module Ouvriers)'),
    );
    expect(screen.getByText('Mode dégradé · module Ouvriers injoignable.')).toBeInTheDocument();
    expect(carte('Chantiers en cours')).toHaveTextContent('3 / 6');
    expect(carte('Tâches en retard')).toHaveTextContent('1');
  });

  it('Matériaux en panne : stock indisponible, tâches et chantiers affichés', async () => {
    simulerPanne('materiaux');
    await charge();
    await waitFor(() =>
      expect(carte('Matériaux en alerte')).toHaveTextContent('Non disponible (module Matériaux)'),
    );
    expect(
      screen.getByText('Stock non disponible : le module Matériaux ne répond pas.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Mouvements de stock indisponibles (module Matériaux).'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('progressbar', { name: 'Avancement de Résidence Al Amal' }),
    ).toBeInTheDocument();
  });

  it('Chantiers en panne : avancement et répartition indisponibles, tâches affichées', async () => {
    simulerPanne('chantiers');
    await charge();
    await waitFor(() =>
      expect(carte('Chantiers en cours')).toHaveTextContent('Non disponible (module Chantiers)'),
    );
    expect(
      screen.getByText('Chantiers non disponibles : le module Chantiers ne répond pas.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Répartition non disponible : le module Chantiers ne répond pas.'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Tâches à suivre' })).getAllByRole('listitem'),
    ).toHaveLength(5);
  });
});
