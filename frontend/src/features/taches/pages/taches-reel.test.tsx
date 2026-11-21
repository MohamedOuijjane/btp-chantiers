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
  it('fiche d’une tâche bloquée : motif de la réponse de l’API (#141)', async () => {
    serveur.use(
      msw.get('*/api/taches/9', () =>
        HttpResponse.json({ ...tache(9, 'Étanchéité', 'BLOQUEE'), motif: 'Pluie' }),
      ),
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

  it('liste : le motif du blocage vient de la réponse de l’API (#141)', async () => {
    serveur.use(
      msw.get('*/api/taches', () =>
        HttpResponse.json([
          { ...tache(3, 'Étanchéité', 'BLOQUEE'), motif: 'Livraison en retard' },
          tache(4, 'Ferraillage'),
        ]),
      ),
    );
    afficherApp('/taches');

    const ligne = (await screen.findByRole('link', { name: 'Étanchéité' })).closest('tr')!;
    expect(within(ligne).getByText('Motif : Livraison en retard')).toBeInTheDocument();
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

  it('tableau de bord : dernières activités lues par GET /api/taches/historique (#142)', async () => {
    let limite: string | null = null;
    serveur.use(
      msw.get('*/api/taches', () =>
        HttpResponse.json([tache(1, 'Terrassement'), tache(2, 'Coffrage', 'EN_COURS')]),
      ),
      msw.get('*/api/taches/historique', ({ request }) => {
        limite = new URL(request.url).searchParams.get('limite');
        return HttpResponse.json([
          { tacheId: 2, statut: 'EN_COURS', date: '2027-03-02T08:00:00.000Z' },
          { tacheId: 1, statut: 'A_FAIRE', date: '2027-03-01T08:00:00.000Z' },
        ]);
      }),
    );
    afficherApp('/');

    const activites = await screen.findByRole('region', { name: 'Dernières activités' });
    expect(await within(activites).findByRole('link', { name: 'Coffrage' })).toBeInTheDocument();
    expect(within(activites).getByRole('link', { name: 'Terrassement' })).toBeInTheDocument();
    expect(limite).toBe('12');
    expect(screen.queryByText(/Activité partielle/)).not.toBeInTheDocument();
  });

  it('avancement refusé (409, tâche bloquée entre-temps) : message dans le dialogue', async () => {
    const message = 'Débloquez la tâche avant de changer son avancement';
    serveur.use(
      msw.get('*/api/taches/9', () => HttpResponse.json(tache(9, 'Dalle', 'EN_COURS'))),
      msw.get('*/api/taches/9/historique', () => HttpResponse.json([])),
      msw.patch('*/api/taches/9/avancement', () =>
        HttpResponse.json({ statusCode: 409, message, error: 'Conflict' }, { status: 409 }),
      ),
    );
    afficherApp('/taches/9');

    await userEvent.click(await screen.findByRole('button', { name: 'Avancement' }));
    const d = screen.getByRole('dialog', { name: 'Mettre à jour l’avancement' });
    const champ = within(d).getByLabelText('Avancement (%)');
    await userEvent.clear(champ);
    await userEvent.type(champ, '80');
    await userEvent.click(within(d).getByRole('button', { name: 'Enregistrer' }));

    expect(await within(d).findByText(message)).toBeInTheDocument();
  });
});
