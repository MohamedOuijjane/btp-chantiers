/**
 * Pages Ouvriers branchées sur l'API réelle (VITE_API_OUVRIERS=reel), servie par MSW :
 * affichage des erreurs de l'API et des actions qui dépendent du mode de Tâches.
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http as msw, HttpResponse } from 'msw';

import { demarrerServeurMsw } from '@/test/msw';
import { afficherApp } from '@/test/rendu';

import type { Ouvrier, Planning } from '../types';

const serveur = demarrerServeurMsw();

const OUVRIER: Ouvrier = {
  id: 4,
  nom: 'Bennani',
  prenom: 'Rachid',
  cin: 'AB1234',
  specialite: 'COFFREUR',
  telephone: null,
  disponible: true,
};
const PLANNING: Planning = {
  ouvrier: OUVRIER,
  taches: [
    {
      id: 7,
      chantierId: 5,
      titre: 'Coffrage des poteaux',
      dateDebut: '2026-12-01',
      dateFin: '2026-12-05',
      statut: 'EN_COURS',
    },
  ],
  sourceDisponible: true,
};

/** API Ouvriers minimale : un ouvrier, son planning. */
function apiOuvriers(ouvriers: Ouvrier[] = [OUVRIER]) {
  serveur.use(
    msw.get('*/api/ouvriers', () => HttpResponse.json(ouvriers)),
    msw.get('*/api/ouvriers/4', () => HttpResponse.json(OUVRIER)),
    msw.get('*/api/ouvriers/4/planning', () => HttpResponse.json(PLANNING)),
  );
}

beforeEach(() => {
  vi.stubEnv('VITE_API_OUVRIERS', 'reel');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Liste des ouvriers (API réelle)', () => {
  it('équipe vide : message clair et invitation à créer un ouvrier', async () => {
    apiOuvriers([]);
    afficherApp('/ouvriers');

    expect(await screen.findByText('Aucun ouvrier dans l’équipe')).toBeInTheDocument();
    expect(screen.getByText(/ajoutez un premier ouvrier/)).toBeInTheDocument();
    expect(screen.queryByText('Aucun ouvrier trouvé')).not.toBeInTheDocument();
  });

  it('équipe non vide mais filtre sans résultat : « Aucun ouvrier trouvé »', async () => {
    apiOuvriers();
    afficherApp('/ouvriers?specialite=PEINTRE');

    expect(await screen.findByText('Aucun ouvrier trouvé')).toBeInTheDocument();
  });

  it('409 « CIN déjà utilisée » renvoyé par l’API : message sous le champ CIN', async () => {
    apiOuvriers();
    serveur.use(
      msw.post('*/api/ouvriers', () =>
        HttpResponse.json(
          {
            detail: [
              {
                loc: ['body', 'cin'],
                msg: 'La CIN AB1234 est déjà utilisée par un autre ouvrier',
                type: 'cin_deja_utilisee',
              },
            ],
          },
          { status: 409 },
        ),
      ),
    );
    afficherApp('/ouvriers');
    await userEvent.click(await screen.findByRole('button', { name: 'Nouvel ouvrier' }));
    const d = screen.getByRole('dialog', { name: 'Nouvel ouvrier' });
    await userEvent.type(within(d).getByLabelText('Prénom'), 'Ali');
    await userEvent.type(within(d).getByLabelText('Nom'), 'Idrissi');
    await userEvent.type(within(d).getByLabelText('CIN'), 'ab1234');
    await userEvent.selectOptions(within(d).getByLabelText('Spécialité'), 'Peintre');
    await userEvent.click(within(d).getByRole('button', { name: 'Ajouter l’ouvrier' }));

    await waitFor(() =>
      expect(within(d).getByLabelText('CIN')).toHaveAccessibleDescription(
        'La CIN AB1234 est déjà utilisée par un autre ouvrier',
      ),
    );
  });
});

describe('Suppression depuis la fiche (API réelle)', () => {
  async function supprimer() {
    afficherApp('/ouvriers/4');
    await userEvent.click(await screen.findByRole('button', { name: 'Supprimer' }));
    const d = screen.getByRole('dialog', { name: 'Supprimer l’ouvrier ?' });
    await userEvent.click(within(d).getByRole('button', { name: 'Supprimer' }));
    return d;
  }

  it('409 : l’alerte du dialogue cite les tâches non terminées', async () => {
    apiOuvriers();
    serveur.use(
      msw.delete('*/api/ouvriers/4', () =>
        HttpResponse.json(
          {
            detail:
              'Suppression impossible : Rachid Bennani est affecté à 1 tâche(s) non terminée(s) : ' +
              '« Coffrage des poteaux ». Retirez-le de ces tâches ou terminez-les avant de le supprimer.',
          },
          { status: 409 },
        ),
      ),
    );

    const alerte = await within(await supprimer()).findByRole('alert');
    expect(alerte).toHaveTextContent('Conflit');
    expect(alerte).toHaveTextContent('« Coffrage des poteaux »');
    expect(alerte).toHaveTextContent('409');
  });

  it('503 : Tâches injoignable, l’alerte l’explique et l’ouvrier reste affiché', async () => {
    apiOuvriers();
    serveur.use(
      msw.delete('*/api/ouvriers/4', () =>
        HttpResponse.json(
          {
            detail:
              'Le module Tâches ne répond pas : impossible de vérifier les affectations de ' +
              'l’ouvrier, suppression annulée. Réessayez plus tard.',
          },
          { status: 503 },
        ),
      ),
    );

    const d = await supprimer();
    const alerte = await within(d).findByRole('alert');
    expect(alerte).toHaveTextContent('Le module Tâches ne répond pas');
    expect(alerte).toHaveTextContent('503');
    // Rien n'est supprimé : le dialogue reste ouvert sur la fiche, sans retour à l'équipe.
    expect(d).toBeInTheDocument();
    expect(screen.queryByText('Rachid Bennani a été supprimé.')).not.toBeInTheDocument();
  });

  it('204 : l’ouvrier est supprimé et la page revient à l’équipe (sa fiche répond ensuite 404)', async () => {
    // Comme le vrai service : après la suppression, l'ouvrier n'existe plus (404) et la liste est vide.
    let supprime = false;
    let fichesRedemandees = 0;
    const introuvable = () => {
      fichesRedemandees += 1;
      return HttpResponse.json({ detail: 'Ouvrier 4 introuvable' }, { status: 404 });
    };
    serveur.use(
      msw.get('*/api/ouvriers', () => HttpResponse.json(supprime ? [] : [OUVRIER])),
      msw.get('*/api/ouvriers/4', () => (supprime ? introuvable() : HttpResponse.json(OUVRIER))),
      msw.get('*/api/ouvriers/4/planning', () =>
        supprime ? introuvable() : HttpResponse.json(PLANNING),
      ),
      msw.delete('*/api/ouvriers/4', () => {
        supprime = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await supprimer();
    expect(await screen.findByText('Rachid Bennani a été supprimé.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Ouvriers' })).toBeInTheDocument();
    expect(await screen.findByText('Aucun ouvrier dans l’équipe')).toBeInTheDocument();
    // La fiche supprimée n'est pas rechargée (404) : avec les nouvelles tentatives de l'application,
    // ce rechargement faisait passer la fiche en erreur et démontait le dialogue avant le retour.
    expect(fichesRedemandees).toBe(0);
  });
});

describe('Affectations selon le mode de Tâches', () => {
  it('Ouvriers réel, Tâches fictif : « Affecter » et « Retirer » sont masqués', async () => {
    apiOuvriers();
    afficherApp('/ouvriers/4');

    const liste = await screen.findByRole('list', { name: 'Planning de Rachid Bennani' });
    expect(within(liste).getByRole('link', { name: 'Coffrage des poteaux' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Affecter à une tâche' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Retirer de la tâche Coffrage des poteaux' }),
    ).not.toBeInTheDocument();
  });

  it('Ouvriers et Tâches réels (après #50) : les actions réapparaissent', async () => {
    vi.stubEnv('VITE_API_TACHES', 'reel');
    apiOuvriers();
    serveur.use(msw.get('*/api/taches', () => HttpResponse.json([])));
    afficherApp('/ouvriers/4');

    expect(
      await screen.findByRole('button', { name: 'Retirer de la tâche Coffrage des poteaux' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Affecter à une tâche' })).toBeInTheDocument();
  });
});
