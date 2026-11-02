import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { simulerPanne } from '@/api/simulation';
import { cloturerChantier } from '@/features/chantiers/api';
import { afficherApp } from '@/test/rendu';

/** Lignes du tableau des tâches (hors en-tête), une fois chargées. */
async function lignes() {
  await screen.findByRole('link', { name: 'Terrassement et fouilles' });
  return screen.getAllByRole('row').slice(1);
}

function saisirDates(debut: string, fin: string) {
  fireEvent.change(screen.getByLabelText('Date de début'), { target: { value: debut } });
  fireEvent.change(screen.getByLabelText('Date de fin'), { target: { value: fin } });
}

describe('Liste des tâches', () => {
  it('affiche les 17 tâches avec compteurs, chantier, badges et actions', async () => {
    afficherApp('/taches');
    expect(await lignes()).toHaveLength(17);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Toutes les tâches' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toutes 17' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'En cours 5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Terminées 7' })).toBeInTheDocument();

    const ligne = screen.getByRole('link', { name: 'Fondations' }).closest('tr')!;
    expect(within(ligne).getByRole('link', { name: 'Groupe scolaire Anza' })).toBeInTheDocument();
    expect(within(ligne).getByText('À faire')).toBeInTheDocument();
    expect(
      within(ligne).getByRole('button', { name: 'Démarrer la tâche Fondations' }),
    ).toBeEnabled();
  });

  it('filtre par statut, chantier et ouvrier', async () => {
    afficherApp('/taches');
    await lignes();

    await userEvent.click(screen.getByRole('button', { name: 'Bloquées 1' }));
    expect(screen.getAllByRole('row').slice(1)).toHaveLength(1);
    expect(screen.getByText('Motif : Livraison de la membrane en retard')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Toutes 17' }));

    await userEvent.selectOptions(screen.getByLabelText('Chantier'), 'Groupe scolaire Anza');
    expect(screen.getAllByRole('row').slice(1)).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Toutes 3' })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Chantier'), '');
    await userEvent.selectOptions(screen.getByLabelText('Ouvrier'), 'Rachid Bouzid');
    const titres = screen
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getAllByRole('link')[0]!.textContent);
    expect(titres).toEqual([
      'Gros œuvre de l’extension',
      'Fondations et semelles',
      'Élévation des murs R+1',
    ]);
  });

  it('recherche depuis la topbar, avec état vide', async () => {
    afficherApp('/taches');
    await lignes();
    const recherche = screen.getByRole('searchbox', { name: 'Rechercher' });

    await userEvent.type(recherche, 'dalle');
    expect(screen.getAllByRole('row').slice(1)).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Coulage de la dalle R+1' })).toBeInTheDocument();

    await userEvent.type(recherche, 'xyz');
    expect(screen.getByText('Aucune tâche trouvée')).toBeInTheDocument();
  });

  it('trie par date de début (croissante puis décroissante)', async () => {
    afficherApp('/taches');
    await lignes();
    const premiere = () => within(screen.getAllByRole('row')[1]!).getAllByRole('link')[0]!;

    expect(premiere()).toHaveTextContent('Charpente métallique');
    const entete = screen.getByRole('columnheader', { name: /Période/ });
    expect(entete).toHaveAttribute('aria-sort', 'ascending');

    await userEvent.click(within(entete).getByRole('button'));
    expect(entete).toHaveAttribute('aria-sort', 'descending');
    expect(premiere()).toHaveTextContent('Voiles du sous-sol');
  });

  it('change le statut depuis la liste (À faire → En cours)', async () => {
    afficherApp('/taches');
    await lignes();

    await userEvent.click(
      screen.getByRole('button', { name: 'Démarrer la tâche Installation électrique' }),
    );

    expect(
      await screen.findByText('« Installation électrique » est en cours.'),
    ).toBeInTheDocument();
    const ligne = screen.getByRole('link', { name: 'Installation électrique' }).closest('tr')!;
    await waitFor(() => expect(within(ligne).getByText('En cours')).toBeInTheDocument());
    expect(
      within(ligne).getByRole('button', { name: 'Terminer la tâche Installation électrique' }),
    ).toBeInTheDocument();
  });

  it('affiche un 409 en toast si le chantier a été clôturé entre-temps', async () => {
    afficherApp('/taches');
    await lignes();
    await cloturerChantier(4); // clôturé par un autre utilisateur

    await userEvent.click(
      screen.getByRole('button', { name: 'Démarrer la tâche Réseaux de fluides' }),
    );

    expect(await screen.findByText('Conflit')).toBeInTheDocument();
    const message = screen.getByText(/Clinique Argana · extension » est clôturé/);
    // Les toasts sont annoncés aux lecteurs d'écran.
    expect(message.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite');
  });
});

describe('Fiche tâche', () => {
  it('affiche le chantier lié, les dates, les ouvriers et l’historique', async () => {
    afficherApp('/taches/5');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Étanchéité de la toiture' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Résidence Al Amal' })).toHaveAttribute(
      'href',
      '/chantiers/1',
    );
    expect(
      screen.getByText('Motif du blocage : Livraison de la membrane en retard'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Abdellah Bakri')).toBeInTheDocument();

    const historique = await screen.findByRole('list', { name: 'Historique des statuts' });
    const entrees = within(historique).getAllByRole('listitem');
    expect(entrees[0]).toHaveTextContent('Bloquée');
    expect(entrees.at(-1)).toHaveTextContent('À faire');
    // Une tâche bloquée n'a pas de bouton de statut.
    expect(screen.queryByRole('button', { name: /la tâche Étanchéité/ })).not.toBeInTheDocument();
  });

  it('termine la tâche depuis la fiche et l’inscrit dans l’historique', async () => {
    afficherApp('/taches/3');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Terminer la tâche Élévation des murs R+1' }),
    );

    expect(await screen.findByText('« Élévation des murs R+1 » est terminée.')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole('progressbar', { name: 'Avancement de Élévation des murs R+1' }),
      ).toHaveAttribute('aria-valuenow', '100'),
    );
    const historique = screen.getByRole('list', { name: 'Historique des statuts' });
    await waitFor(() =>
      expect(within(historique).getAllByRole('listitem')[0]).toHaveTextContent('Terminée'),
    );
  });

  it('reste affichée en mode dégradé quand Ouvriers est indisponible (503)', async () => {
    simulerPanne('ouvriers');
    afficherApp('/taches/3');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Élévation des murs R+1' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Informations ouvriers indisponibles.')).toBeInTheDocument();
  });

  it('affiche « Tâche introuvable » pour un identifiant inconnu', async () => {
    afficherApp('/taches/99');
    expect(await screen.findByText('Tâche introuvable')).toBeInTheDocument();
  });
});

describe('Formulaire de tâche', () => {
  it('valide les champs avec Zod (chantier, titre, dates)', async () => {
    afficherApp('/taches/nouvelle');
    const creer = await screen.findByRole('button', { name: 'Créer la tâche' });
    await userEvent.click(creer);

    expect(await screen.findByText('Choisissez un chantier')).toBeInTheDocument();
    expect(screen.getByText('Le titre est obligatoire')).toBeInTheDocument();
    expect(screen.getByText('La date de début est obligatoire')).toBeInTheDocument();

    saisirDates('2027-03-10', '2027-03-01');
    await userEvent.click(creer);
    expect(await screen.findByLabelText('Date de fin')).toHaveAccessibleDescription(
      'La date de fin doit être postérieure ou égale à la date de début',
    );
  });

  it('refuse un chantier clôturé', async () => {
    afficherApp('/chantiers/5/taches/nouvelle');
    await userEvent.type(
      await screen.findByLabelText('Titre de la tâche'),
      'Reprise des peintures',
    );
    saisirDates('2027-01-04', '2027-01-08');
    await waitFor(() =>
      expect(screen.getByLabelText('Chantier')).toHaveDisplayValue('Entrepôt logistique (clôturé)'),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Créer la tâche' }));

    expect(
      await screen.findByText('Ce chantier est clôturé : on ne peut plus y planifier de tâche.'),
    ).toBeInTheDocument();
  });

  it('signale un ouvrier déjà occupé et affiche le 409 du serveur', async () => {
    afficherApp('/chantiers/1/taches/nouvelle');
    await userEvent.type(
      await screen.findByLabelText('Titre de la tâche'),
      'Pose des menuiseries R+1',
    );
    saisirDates('2026-11-10', '2026-11-12');
    const rachid = await screen.findByRole('checkbox', { name: /Rachid Bouzid/ });
    expect(rachid.closest('label')).toHaveTextContent('Déjà affecté : Élévation des murs R+1');
    await userEvent.click(rachid);

    await userEvent.click(screen.getByRole('button', { name: 'Créer la tâche' }));

    const alerte = await screen.findByRole('alert');
    expect(alerte).toHaveTextContent('Conflit');
    expect(alerte).toHaveTextContent('Rachid Bouzid est déjà affecté à « Élévation des murs R+1 »');
    expect(alerte).toHaveTextContent('409');
  });

  it('affiche le 422 « stock insuffisant »', async () => {
    afficherApp('/chantiers/1/taches/nouvelle');
    await userEvent.type(await screen.findByLabelText('Titre de la tâche'), 'Dalle R+2');
    saisirDates('2027-01-04', '2027-01-08');
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter un matériau' }));
    await userEvent.selectOptions(
      await screen.findByLabelText('Matériau 1'),
      'Ciment CPJ 45 (MAT-001)',
    );
    await userEvent.type(screen.getByLabelText('Quantité (sacs)'), '400');
    expect(screen.getByText('Stock insuffisant')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Créer la tâche' }));

    const alerte = await screen.findByRole('alert');
    expect(alerte).toHaveTextContent('Demande refusée');
    expect(alerte).toHaveTextContent('Stock insuffisant pour Ciment CPJ 45');
    expect(alerte).toHaveTextContent('422');
  });

  it('crée la tâche puis ouvre sa fiche', async () => {
    afficherApp('/taches/nouvelle');
    await waitFor(() =>
      expect(screen.getAllByRole('option', { name: 'Villa Benali' })).toHaveLength(1),
    );
    await userEvent.selectOptions(screen.getByLabelText('Chantier'), 'Villa Benali');
    await userEvent.type(screen.getByLabelText('Titre de la tâche'), 'Implantation');
    saisirDates('2027-01-04', '2027-01-08');
    await userEvent.click(await screen.findByRole('checkbox', { name: /Mustapha Zaki/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Créer la tâche' }));

    expect(await screen.findByText('Tâche « Implantation » créée.')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Implantation' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Mustapha Zaki')).toBeInTheDocument();
  });

  it('modifie une tâche existante', async () => {
    afficherApp('/taches/6/modifier');
    const titre = await screen.findByLabelText('Titre de la tâche');
    await waitFor(() => expect(titre).toHaveValue('Installation électrique'));
    await userEvent.clear(titre);
    await userEvent.type(titre, 'Installation électrique R+1');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Installation électrique R+1' }),
    ).toBeInTheDocument();
  });

  it('affiche le 503 quand Ouvriers est en panne', async () => {
    simulerPanne('ouvriers');
    afficherApp('/chantiers/1/taches/nouvelle');
    expect(await screen.findByText(/Informations ouvriers indisponibles/)).toBeInTheDocument();
  });

  it('affiche le 503 renvoyé à l’enregistrement quand un module appelé ne répond pas', async () => {
    simulerPanne('chantiers');
    afficherApp('/chantiers/1/taches/nouvelle');
    await userEvent.type(await screen.findByLabelText('Titre de la tâche'), 'Pose des menuiseries');
    saisirDates('2027-01-04', '2027-01-08');
    await userEvent.click(screen.getByRole('button', { name: 'Créer la tâche' }));

    const alerte = await screen.findByRole('alert');
    expect(alerte).toHaveTextContent('Module indisponible');
    expect(alerte).toHaveTextContent('Le module Chantiers est indisponible');
    expect(alerte).toHaveTextContent('503');
  });
});
