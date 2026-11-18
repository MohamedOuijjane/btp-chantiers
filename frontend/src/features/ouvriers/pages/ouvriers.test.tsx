import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { simulerPanne } from '@/api/simulation';
import { afficherApp } from '@/test/rendu';

/** Cartes des ouvriers (boutons de sélection du planning), une fois chargées. */
async function cartes() {
  await screen.findByRole('button', { name: /^Youssef El Amrani/ });
  return screen.getAllByRole('button', { name: /voir le planning$/ });
}

const planning = () => screen.getByRole('complementary', { name: /./ });

describe('Liste des ouvriers', () => {
  it('affiche les 10 cartes et le planning chronologique du premier ouvrier', async () => {
    afficherApp('/ouvriers');
    expect(await cartes()).toHaveLength(10);
    expect(screen.getByRole('button', { name: /^Youssef El Amrani/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('06 12 34 56 78')).toBeInTheDocument();

    const liste = await screen.findByRole('list', { name: 'Planning de Youssef El Amrani' });
    expect(
      within(liste)
        .getAllByRole('link')
        .map((l) => l.textContent),
    ).toEqual([
      'Dallage industriel',
      'Terrassement et fouilles',
      'Fondations et semelles',
      'Coulage de la dalle R+1',
      'Fondations',
    ]);
  });

  it('filtre par spécialité et par disponibilité', async () => {
    afficherApp('/ouvriers');
    await cartes();

    await userEvent.click(screen.getByRole('button', { name: 'Maçon' }));
    expect(screen.getAllByRole('button', { name: /voir le planning$/ })).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Toutes' }));
    const interrupteur = screen.getByRole('switch', { name: 'Disponibles uniquement' });
    await userEvent.click(interrupteur);
    expect(interrupteur).toHaveAttribute('aria-checked', 'true');
    expect(screen.getAllByRole('button', { name: /voir le planning$/ })).toHaveLength(8);
    expect(screen.queryByRole('button', { name: /^Brahim Naciri/ })).not.toBeInTheDocument();
  });

  it('recherche par nom ou CIN et affiche le planning de l’ouvrier choisi', async () => {
    afficherApp('/ouvriers');
    await cartes();

    await userEvent.type(screen.getByRole('searchbox', { name: 'Rechercher' }), 'jh118654');
    expect(screen.getAllByRole('button', { name: /voir le planning$/ })).toHaveLength(1);
    expect(
      await within(planning()).findByRole('link', { name: 'Réseaux de fluides' }),
    ).toBeInTheDocument();
    expect(within(planning()).getByText('Plombier · indisponible')).toBeInTheDocument();
  });

  it('passe le planning en mode dégradé quand Tâches est indisponible (503)', async () => {
    simulerPanne('taches');
    afficherApp('/ouvriers');
    expect(await cartes()).toHaveLength(10);
    expect(await screen.findByText('Planning non disponible.')).toBeInTheDocument();
  });

  it('affiche un encart quand Ouvriers est indisponible (503)', async () => {
    simulerPanne('ouvriers');
    afficherApp('/ouvriers');
    expect(
      await screen.findByText('Équipe indisponible pendant la panne du module Ouvriers.'),
    ).toBeInTheDocument();
  });
});

describe('Dialogue « Nouvel ouvrier »', () => {
  async function ouvrir() {
    afficherApp('/ouvriers');
    await cartes();
    await userEvent.click(screen.getByRole('button', { name: 'Nouvel ouvrier' }));
    return screen.getByRole('dialog', { name: 'Nouvel ouvrier' });
  }

  it('valide les champs avec Zod', async () => {
    const d = await ouvrir();
    await userEvent.type(within(d).getByLabelText('Téléphone'), '0412');
    await userEvent.click(within(d).getByRole('button', { name: 'Ajouter l’ouvrier' }));

    expect(await within(d).findByText('Le prénom est obligatoire')).toBeInTheDocument();
    expect(within(d).getByText('Le nom est obligatoire')).toBeInTheDocument();
    expect(within(d).getByLabelText('CIN')).toHaveAccessibleDescription(
      'Format de CIN invalide (ex. JB123456)',
    );
    expect(within(d).getByText('Choisissez une spécialité')).toBeInTheDocument();
    expect(within(d).getByLabelText('Téléphone')).toHaveAccessibleDescription(
      'Numéro marocain attendu (ex. 06 12 34 56 78)',
    );
  });

  async function remplir(d: HTMLElement, cin: string) {
    await userEvent.type(within(d).getByLabelText('Prénom'), 'Ali');
    await userEvent.type(within(d).getByLabelText('Nom'), 'Idrissi');
    await userEvent.type(within(d).getByLabelText('CIN'), cin);
    await userEvent.selectOptions(within(d).getByLabelText('Spécialité'), 'Peintre');
    await userEvent.type(within(d).getByLabelText('Téléphone'), '06 11 22 33 44');
    await userEvent.click(within(d).getByRole('button', { name: 'Ajouter l’ouvrier' }));
  }

  it('affiche le 409 « CIN déjà utilisée » sous le champ', async () => {
    const d = await ouvrir();
    await remplir(d, 'jb123456');

    await waitFor(() =>
      expect(within(d).getByLabelText('CIN')).toHaveAccessibleDescription(
        'La CIN JB123456 est déjà utilisée par un autre ouvrier',
      ),
    );
    expect(await screen.findByText('Conflit')).toBeInTheDocument();
  });

  it('ajoute l’ouvrier et affiche son planning', async () => {
    const d = await ouvrir();
    await remplir(d, 'jc123999');

    expect(await screen.findByText('Ali Idrissi ajouté à l’équipe.')).toBeInTheDocument();
    const carte = await screen.findByRole('button', { name: /^Ali Idrissi/ });
    expect(carte).toHaveAttribute('aria-pressed', 'true');
    expect(within(carte).getByText('JC123999')).toBeInTheDocument();
    expect(within(carte).getByText('06 11 22 33 44')).toBeInTheDocument();
    expect(await within(planning()).findByText('Aucune tâche affectée.')).toBeInTheDocument();
  });
});

describe('Fiche ouvrier', () => {
  it('affiche identité, disponibilités et planning', async () => {
    afficherApp('/ouvriers/1');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Youssef El Amrani' }),
    ).toBeInTheDocument();
    expect(screen.getByText('JB123456')).toBeInTheDocument();
    expect(screen.getByText('06 12 34 56 78')).toBeInTheDocument();
    // Tâches non terminées : « Coulage de la dalle R+1 » et « Fondations » (jusqu'au 10/12).
    expect(await screen.findByText('10/12/2026')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Planning de Youssef El Amrani' })).toBeInTheDocument();
  });

  it('bascule la disponibilité', async () => {
    afficherApp('/ouvriers/1');
    await userEvent.click(await screen.findByRole('button', { name: 'Rendre indisponible' }));

    expect(await screen.findByText('Youssef El Amrani est indisponible.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Rendre disponible' })).toBeInTheDocument();
    expect(screen.getByText('Indisponible')).toBeInTheDocument();
  });

  it('refuse la suppression d’un ouvrier affecté à des tâches en cours (409)', async () => {
    afficherApp('/ouvriers/1');
    await userEvent.click(await screen.findByRole('button', { name: 'Supprimer' }));
    const d = screen.getByRole('dialog', { name: 'Supprimer l’ouvrier ?' });
    await userEvent.click(within(d).getByRole('button', { name: 'Supprimer' }));

    expect(await within(d).findByRole('alert')).toHaveTextContent(
      'Impossible de supprimer un ouvrier affecté à des tâches en cours',
    );
  });

  it('supprime un ouvrier sans tâche et revient à l’équipe', async () => {
    afficherApp('/ouvriers/10');
    await userEvent.click(await screen.findByRole('button', { name: 'Supprimer' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Supprimer' }),
    );

    expect(await screen.findByText('Omar Fikri a été supprimé.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Ouvriers' })).toBeInTheDocument();
    expect(await cartes()).toHaveLength(9);
  });

  async function affecter(ouvrierId: number) {
    afficherApp(`/ouvriers/${ouvrierId}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Affecter à une tâche' }));
    const d = screen.getByRole('dialog', { name: 'Affecter à une tâche' });
    const option = await within(d).findByRole('option', {
      name: /^Fondations · Groupe scolaire Anza/,
    });
    await userEvent.selectOptions(within(d).getByLabelText('Tâche'), option);
    await userEvent.click(within(d).getByRole('button', { name: 'Affecter' }));
    return d;
  }

  it('affecte l’ouvrier à une tâche libre sur sa période', async () => {
    await affecter(8); // Hassan Aït Lahcen : libre du 16/11 au 10/12
    expect(
      await screen.findByText('Hassan Aït Lahcen affecté à « Fondations ».'),
    ).toBeInTheDocument();
    const liste = screen.getByRole('list', { name: 'Planning de Hassan Aït Lahcen' });
    expect(await within(liste).findByRole('link', { name: 'Fondations' })).toBeInTheDocument();
  });

  it('affiche le 409 si l’ouvrier est déjà occupé sur la période', async () => {
    const d = await affecter(7); // Mustapha Zaki : « Installation électrique » du 23/11 au 18/12
    const alerte = await within(d).findByRole('alert');
    expect(alerte).toHaveTextContent('Conflit');
    expect(alerte).toHaveTextContent(
      'Mustapha Zaki est déjà affecté à « Installation électrique »',
    );
  });

  it('affiche le 422 si l’ouvrier est indisponible', async () => {
    const d = await affecter(9); // Brahim Naciri : indisponible
    const alerte = await within(d).findByRole('alert');
    expect(alerte).toHaveTextContent('Demande refusée');
    expect(alerte).toHaveTextContent("Brahim Naciri n'est pas disponible");
  });

  it('retire l’ouvrier d’une tâche depuis son planning', async () => {
    afficherApp('/ouvriers/1');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Retirer de la tâche Fondations' }),
    );

    expect(
      await screen.findByText('Youssef El Amrani retiré de « Fondations ».'),
    ).toBeInTheDocument();
    const liste = screen.getByRole('list', { name: 'Planning de Youssef El Amrani' });
    await waitFor(() =>
      expect(within(liste).queryByRole('link', { name: 'Fondations' })).not.toBeInTheDocument(),
    );
  });

  it('reste consultable en mode dégradé quand Tâches est indisponible (503)', async () => {
    simulerPanne('taches');
    afficherApp('/ouvriers/1');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Youssef El Amrani' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Planning non disponible.')).toBeInTheDocument();
  });
});
