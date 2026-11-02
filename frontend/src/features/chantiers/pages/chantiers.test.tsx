import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { simulerPanne } from '@/api/simulation';
import { afficherApp } from '@/test/rendu';

/** Lignes du tableau des chantiers (hors en-tête), une fois chargées. */
async function lignes() {
  await screen.findByRole('link', { name: 'Résidence Al Amal' });
  return screen.getAllByRole('row').slice(1);
}

describe('Liste des chantiers', () => {
  it('affiche les 6 chantiers avec compteurs, référence, budget et avancement', async () => {
    afficherApp('/chantiers');
    expect(await lignes()).toHaveLength(6);

    expect(screen.getByRole('button', { name: 'Tous 6' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'En cours 3' })).toBeInTheDocument();
    const ligne = screen.getByRole('link', { name: 'Résidence Al Amal' }).closest('tr')!;
    expect(within(ligne).getByText('CH-2026-001')).toBeInTheDocument();
    expect(within(ligne).getByText(/2\s500\s000 MAD/)).toBeInTheDocument();
    expect(
      await within(ligne).findByRole('progressbar', { name: 'Avancement de Résidence Al Amal' }),
    ).toHaveAttribute('aria-valuenow', '56');
  });

  it('filtre par statut', async () => {
    afficherApp('/chantiers');
    await lignes();

    await userEvent.click(screen.getByRole('button', { name: 'Suspendus 1' }));

    expect(screen.getByRole('button', { name: 'Suspendus 1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const restantes = screen.getAllByRole('row').slice(1);
    expect(restantes).toHaveLength(1);
    expect(restantes[0]).toHaveTextContent('Clinique Argana · extension');
  });

  it('recherche par nom ou client depuis la topbar, avec état vide', async () => {
    afficherApp('/chantiers');
    await lignes();
    const recherche = screen.getByRole('searchbox', { name: 'Rechercher' });

    await userEvent.type(recherche, 'tazrout');
    expect(screen.getAllByRole('row').slice(1)).toHaveLength(1);
    expect(screen.getByText('Groupe scolaire Anza')).toBeInTheDocument();

    await userEvent.type(recherche, 'xyz');
    expect(screen.getByText('Aucun chantier trouvé')).toBeInTheDocument();
  });

  it('affiche « Non disponible » quand le module Tâches est en panne', async () => {
    simulerPanne('taches');
    afficherApp('/chantiers');
    await lignes();
    await waitFor(() => expect(screen.getAllByText('Non disponible')).toHaveLength(6));
  });
});

describe('Dialogue « Nouveau chantier »', () => {
  async function ouvrir() {
    afficherApp('/chantiers');
    await lignes();
    await userEvent.click(screen.getByRole('button', { name: 'Nouveau chantier' }));
    return screen.getByRole('dialog', { name: 'Nouveau chantier' });
  }

  it('valide les champs et refuse une fin avant le début (message sous le champ)', async () => {
    const dialogue = await ouvrir();
    expect(dialogue).toHaveTextContent('Le chantier sera créé au statut Planifié.');

    fireEvent.change(within(dialogue).getByLabelText('Date de début'), {
      target: { value: '2027-03-01' },
    });
    fireEvent.change(within(dialogue).getByLabelText('Date de fin prévue'), {
      target: { value: '2027-01-01' },
    });
    await userEvent.click(within(dialogue).getByRole('button', { name: 'Créer le chantier' }));

    const fin = within(dialogue).getByLabelText('Date de fin prévue');
    expect(fin).toHaveAttribute('aria-invalid', 'true');
    expect(fin).toHaveAccessibleDescription(
      'La date de fin doit être postérieure ou égale à la date de début',
    );
    expect(within(dialogue).getByText('Le nom est obligatoire')).toBeInTheDocument();
    expect(within(dialogue).getByText('Indiquez un budget en MAD')).toBeInTheDocument();
  });

  it('crée le chantier au statut Planifié, affiche un toast et rafraîchit la liste', async () => {
    const dialogue = await ouvrir();
    await userEvent.type(within(dialogue).getByLabelText('Nom'), 'Hôtel Taghazout');
    await userEvent.type(within(dialogue).getByLabelText('Client'), 'Taghazout Resorts');
    await userEvent.type(within(dialogue).getByLabelText('Adresse'), 'Taghazout');
    await userEvent.type(within(dialogue).getByLabelText('Budget (MAD)'), '9000000');
    fireEvent.change(within(dialogue).getByLabelText('Date de début'), {
      target: { value: '2027-01-04' },
    });
    fireEvent.change(within(dialogue).getByLabelText('Date de fin prévue'), {
      target: { value: '2027-12-31' },
    });
    await userEvent.click(within(dialogue).getByRole('button', { name: 'Créer le chantier' }));

    expect(
      await screen.findByText('Chantier « Hôtel Taghazout » créé au statut Planifié.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const ligne = (await screen.findByRole('link', { name: 'Hôtel Taghazout' })).closest('tr')!;
    expect(within(ligne).getByText('Planifié')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tous 7' })).toBeInTheDocument();
  });
});

describe('Fiche chantier', () => {
  it('affiche l’en-tête, l’anneau d’avancement et le titre de la topbar', async () => {
    afficherApp('/chantiers/1');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Résidence Al Amal' }),
    ).toBeInTheDocument();
    expect(screen.getByText('CH-2026-001')).toBeInTheDocument();
    expect(screen.getByText('Copropriété Al Amal · Hay Mohammadi, Agadir')).toBeInTheDocument();
    expect(
      await screen.findByRole('img', { name: 'Avancement global : 56 %' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tous les chantiers' })).toHaveAttribute(
      'href',
      '/chantiers',
    );
  });

  it('passe en lecture seule après la clôture', async () => {
    afficherApp('/chantiers/1');
    await screen.findByRole('heading', { level: 2, name: 'Résidence Al Amal' });

    await userEvent.click(screen.getByRole('button', { name: 'Clôturer le chantier' }));
    const dialogue = screen.getByRole('dialog', { name: 'Clôturer le chantier ?' });
    await userEvent.click(within(dialogue).getByRole('button', { name: 'Clôturer' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Chantier terminé.');
    expect(screen.getByRole('button', { name: 'Modifier' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clôturer le chantier' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nouvelle tâche' })).toBeDisabled();
    expect(screen.getByText('Terminé')).toBeInTheDocument();
  });

  it('affiche une erreur 409 en alerte quand on modifie un chantier déjà terminé ailleurs', async () => {
    afficherApp('/chantiers/2');
    await screen.findByRole('heading', { level: 2, name: 'Groupe scolaire Anza' });
    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    const dialogue = screen.getByRole('dialog', { name: 'Modifier le chantier' });

    // Le chantier est clôturé par un autre utilisateur pendant la saisie.
    const { cloturerChantier } = await import('@/features/chantiers/api');
    await cloturerChantier(2);
    await userEvent.click(within(dialogue).getByRole('button', { name: 'Enregistrer' }));

    expect(await within(dialogue).findByRole('alert')).toHaveTextContent(
      'Un chantier terminé ne peut plus être modifié',
    );
  });

  it('propose des onglets accessibles : tâches (avec motif) et matériaux consommés', async () => {
    afficherApp('/chantiers/1');
    const ongletTaches = await screen.findByRole('tab', { name: 'Tâches · 6' });
    expect(ongletTaches).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tablist', { name: 'Contenu du chantier' })).toBeInTheDocument();
    expect(
      await screen.findByText('Motif : Livraison de la membrane en retard'),
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText('Youssef El Amrani').length).toBeGreaterThan(0);

    const ongletMateriaux = await screen.findByRole('tab', { name: 'Matériaux consommés · 4' });
    await userEvent.click(ongletMateriaux);
    expect(ongletMateriaux).toHaveAttribute('aria-selected', 'true');
    const panneau = screen.getByRole('tabpanel');
    expect(await within(panneau).findByText('Fer à béton HA12')).toBeInTheDocument();
    expect(within(panneau).getAllByText('Sortie')).toHaveLength(4);

    // Navigation au clavier entre les onglets.
    await userEvent.keyboard('{ArrowLeft}');
    expect(ongletTaches).toHaveFocus();
  });

  it('affiche « Aucune tâche planifiée » pour un chantier sans tâche', async () => {
    afficherApp('/chantiers/3');
    expect(await screen.findByText('Aucune tâche planifiée')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Planifier une tâche' })).toHaveAttribute(
      'href',
      '/chantiers/3/taches/nouvelle',
    );
  });

  it('affiche « Chantier introuvable » pour un identifiant inconnu (404)', async () => {
    afficherApp('/chantiers/99');
    expect(await screen.findByText('Chantier introuvable')).toBeInTheDocument();
  });

  it('affiche l’avancement « Non disponible » quand le module Tâches est en panne', async () => {
    simulerPanne('taches');
    afficherApp('/chantiers/1');
    expect(
      await screen.findByRole('img', { name: 'Avancement global non disponible' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Liste indisponible pendant la panne du module Tâches.'),
    ).toBeInTheDocument();
  });
});
