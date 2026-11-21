/**
 * Suppression d'un chantier avec l'API réelle (VITE_API_CHANTIERS=reel), servie par MSW (#5).
 */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http as msw, HttpResponse } from 'msw';

import { demarrerServeurMsw } from '@/test/msw';
import { afficherApp } from '@/test/rendu';

import type { Chantier } from '../types';

const serveur = demarrerServeurMsw();

const CHANTIER: Chantier = {
  id: 7,
  nom: 'Résidence Al Amal',
  adresse: 'Hay Mohammadi, Agadir',
  client: 'Société Souss Immo',
  dateDebut: '2026-11-01',
  dateFinPrevue: '2027-06-30',
  budget: 2500000,
  statut: 'EN_COURS',
};
const AVANCEMENT = { chantierId: 7, nombreTaches: 0, avancementGlobal: 0, sourceDisponible: true };
const probleme = (status: number, detail: string) =>
  HttpResponse.json(
    { status, detail },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );

/** API Chantiers : un chantier ; après suppression, il n'existe plus (404) comme dans le vrai service. */
function apiChantiers() {
  const etat = { supprime: false, fichesRedemandees: 0 };
  const introuvable = () => {
    etat.fichesRedemandees += 1;
    return probleme(404, 'Chantier 7 introuvable');
  };
  serveur.use(
    msw.get('*/api/chantiers', () => HttpResponse.json(etat.supprime ? [] : [CHANTIER])),
    msw.get('*/api/chantiers/7', () =>
      etat.supprime ? introuvable() : HttpResponse.json(CHANTIER),
    ),
    msw.get('*/api/chantiers/7/avancement', () =>
      etat.supprime ? introuvable() : HttpResponse.json(AVANCEMENT),
    ),
  );
  return etat;
}

async function supprimer() {
  afficherApp('/chantiers/7');
  await userEvent.click(await screen.findByRole('button', { name: 'Supprimer' }));
  const d = screen.getByRole('dialog', { name: 'Supprimer le chantier ?' });
  await userEvent.click(within(d).getByRole('button', { name: 'Supprimer' }));
  return d;
}

beforeEach(() => {
  vi.stubEnv('VITE_API_CHANTIERS', 'reel');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Suppression d’un chantier (API réelle)', () => {
  it('409 : l’alerte du dialogue cite les tâches du chantier', async () => {
    apiChantiers();
    serveur.use(
      msw.delete('*/api/chantiers/7', () =>
        probleme(
          409,
          'Suppression impossible : le chantier « Résidence Al Amal » a 2 tâche(s) : ' +
            '« Fondations », « Gros œuvre ». Supprimez ses tâches dans le module Tâches avant de ' +
            'supprimer le chantier.',
        ),
      ),
    );

    const alerte = await within(await supprimer()).findByRole('alert');
    expect(alerte).toHaveTextContent('Conflit');
    expect(alerte).toHaveTextContent('« Fondations », « Gros œuvre »');
    expect(alerte).toHaveTextContent('409');
  });

  it('503 : Tâches injoignable, l’alerte l’explique et rien n’est supprimé', async () => {
    apiChantiers();
    serveur.use(
      msw.delete('*/api/chantiers/7', () =>
        probleme(
          503,
          'Le module Tâches ne répond pas : impossible de vérifier les tâches du chantier, ' +
            'suppression annulée. Réessayez plus tard.',
        ),
      ),
    );

    const d = await supprimer();
    const alerte = await within(d).findByRole('alert');
    expect(alerte).toHaveTextContent('Le module Tâches ne répond pas');
    expect(alerte).toHaveTextContent('503');
    expect(d).toBeInTheDocument();
    expect(screen.queryByText(/a été supprimé/)).not.toBeInTheDocument();
  });

  it('204 : retour à la liste, sans redemander la fiche supprimée (404)', async () => {
    const etat = apiChantiers();
    serveur.use(
      msw.delete('*/api/chantiers/7', () => {
        etat.supprime = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await supprimer();
    expect(
      await screen.findByText('Le chantier « Résidence Al Amal » a été supprimé.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Aucun chantier')).toBeInTheDocument();
    // Sans le correctif de useSupprimerChantier, la fiche et l'avancement étaient rechargés (404) :
    // la fiche passait en erreur et démontait le dialogue avant le retour à la liste.
    expect(etat.fichesRedemandees).toBe(0);
  });
});
