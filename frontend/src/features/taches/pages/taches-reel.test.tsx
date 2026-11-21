/**
 * Pages branchées sur l'API Tâches réelle (VITE_API_TACHES=reel), servie par MSW. Les autres
 * modules restent en données fictives (chantier 1 « Résidence Al Amal », ouvriers…).
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http as msw, HttpResponse } from 'msw';

import { demarrerServeurMsw } from '@/test/msw';
import { afficherApp } from '@/test/rendu';

const serveur = demarrerServeurMsw();

const tache = (id: number, titre: string, statut = 'A_FAIRE') => ({
  id,
  chantierId: 1,
  titre,
  dateDebut: '2027-03-01',
  dateFin: '2027-03-09',
  statut,
  avancement: statut === 'EN_COURS' ? 30 : 0,
  ouvrierIds: [],
  besoinsMateriaux: [],
});

beforeEach(() => {
  vi.stubEnv('VITE_API_TACHES', 'reel');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Tâches sur l’API réelle', () => {
  it('fiche d’une tâche bloquée : le motif vient de l’historique (#141)', async () => {
    serveur.use(
      msw.get('*/api/taches/9', () => HttpResponse.json(tache(9, 'Étanchéité', 'BLOQUEE'))),
      msw.get('*/api/taches/9/historique', () =>
        HttpResponse.json([
          { tacheId: 9, statut: 'BLOQUEE', date: '2027-03-03T10:00:00.000Z', motif: 'Pluie' },
          { tacheId: 9, statut: 'A_FAIRE', date: '2027-03-01T08:00:00.000Z' },
        ]),
      ),
    );
    afficherApp('/taches/9');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Étanchéité' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Motif du blocage : Pluie')).toBeInTheDocument();
    const historique = await screen.findByRole('list', { name: 'Historique des statuts' });
    expect(within(historique).getAllByRole('listitem')[0]).toHaveTextContent('03/03/2027');
  });

  it('409 de l’API au changement de statut : message affiché en toast', async () => {
    serveur.use(
      msw.get('*/api/taches', () => HttpResponse.json([tache(4, 'Ferraillage')])),
      msw.patch('*/api/taches/4/statut', () =>
        HttpResponse.json(
          {
            statusCode: 409,
            message:
              'Le chantier « Résidence Al Amal » est clôturé : ses tâches ne peuvent plus changer',
            error: 'Conflict',
          },
          { status: 409 },
        ),
      ),
    );
    afficherApp('/taches');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Démarrer la tâche Ferraillage' }),
    );

    expect(
      await screen.findByText(
        'Le chantier « Résidence Al Amal » est clôturé : ses tâches ne peuvent plus changer',
      ),
    ).toBeInTheDocument();
  });

  it('l’onglet Tâches de la fiche chantier liste les tâches de l’API', async () => {
    let filtre = '';
    serveur.use(
      msw.get('*/api/taches', ({ request }) => {
        filtre = new URL(request.url).searchParams.get('chantierId') ?? '';
        return HttpResponse.json([tache(1, 'Terrassement'), tache(2, 'Coffrage', 'EN_COURS')]);
      }),
    );
    afficherApp('/chantiers/1');

    expect(await screen.findByRole('tab', { name: 'Tâches · 2' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Terrassement' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Coffrage' })).toBeInTheDocument();
    expect(filtre).toBe('1');
  });

  it('tableau de bord : historique partiel signalé discrètement (#142)', async () => {
    serveur.use(
      msw.get('*/api/taches', () =>
        HttpResponse.json([tache(1, 'Terrassement'), tache(2, 'Coffrage', 'EN_COURS')]),
      ),
      msw.get('*/api/taches/1/historique', () =>
        HttpResponse.json([{ tacheId: 1, statut: 'A_FAIRE', date: '2027-03-01T08:00:00.000Z' }]),
      ),
      msw.get('*/api/taches/2/historique', () =>
        HttpResponse.json({ statusCode: 500, message: 'Erreur interne' }, { status: 500 }),
      ),
    );
    afficherApp('/');

    expect(
      await screen.findByText(
        'Activité partielle : l’historique de certaines tâches n’a pas pu être lu.',
      ),
    ).toBeInTheDocument();
  });
});
