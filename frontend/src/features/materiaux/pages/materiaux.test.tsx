import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { simulerPanne } from '@/api/simulation';
import { afficherApp } from '@/test/rendu';

/** Lignes du tableau du stock, une fois chargées. */
async function lignesStock() {
  await screen.findByText('MAT-001');
  return within(screen.getAllByRole('table')[0]!).getAllByRole('row').slice(1);
}

const ligne = (reference: string) => screen.getByText(reference).closest('tr')!;

async function ouvrirMouvement() {
  afficherApp('/materiaux');
  await lignesStock();
  await userEvent.click(screen.getByRole('button', { name: 'Entrée / sortie de stock' }));
  return screen.getByRole('dialog', { name: 'Mouvement de stock' });
}

async function saisirMouvement(
  d: HTMLElement,
  {
    type,
    materiau,
    chantier,
    quantite,
  }: { type: 'Entrée' | 'Sortie'; materiau: RegExp; chantier: RegExp; quantite: string },
) {
  await userEvent.click(within(d).getByRole('radio', { name: type }));
  await userEvent.selectOptions(
    within(d).getByLabelText('Matériau'),
    within(d).getByRole('option', { name: materiau }),
  );
  await userEvent.selectOptions(
    within(d).getByLabelText('Chantier'),
    within(d).getByRole('option', { name: chantier }),
  );
  await userEvent.type(within(d).getByLabelText(/^Quantité/), quantite);
}

describe('Stock des matériaux', () => {
  it('affiche le stock, les seuils, la jauge et l’état d’alerte', async () => {
    afficherApp('/materiaux');
    expect(await lignesStock()).toHaveLength(6);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Matériaux et stock' }),
    ).toBeInTheDocument();

    const ciment = ligne('MAT-001');
    expect(within(ciment).getByText('320 sacs')).toBeInTheDocument();
    expect(within(ciment).getByText('400 sacs')).toBeInTheDocument();
    expect(
      within(ciment).getByRole('meter', { name: 'Niveau de stock de Ciment CPJ 45' }),
    ).toHaveAttribute('aria-valuenow', '40');
    expect(within(ciment).getByText('En alerte')).toBeInTheDocument();
    expect(within(ligne('MAT-002')).getByText('Suffisant')).toBeInTheDocument();

    // Pastille de la barre latérale : 2 matériaux en alerte.
    expect(await screen.findByRole('link', { name: /Matériaux.*2 en alerte/ })).toBeInTheDocument();
  });

  it('filtre les matériaux en alerte et recherche par nom ou référence', async () => {
    afficherApp('/materiaux');
    await lignesStock();

    const interrupteur = screen.getByRole('switch', { name: 'En alerte uniquement' });
    await userEvent.click(interrupteur);
    expect(interrupteur).toHaveAttribute('aria-checked', 'true');
    const enAlerte = await lignesStock();
    expect(enAlerte.map((r) => within(r).getAllByRole('cell')[1]!.textContent)).toEqual([
      'Ciment CPJ 45',
      'Fer à béton HA12',
    ]);

    await userEvent.click(interrupteur);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Rechercher' }), 'mat-004');
    const stock = screen.getAllByRole('table')[0]!;
    await waitFor(() => expect(within(stock).getAllByRole('row').slice(1)).toHaveLength(1));
    expect(screen.getByText('Gravette 15/25')).toBeInTheDocument();
  });

  it('liste les derniers mouvements et la consommation par chantier', async () => {
    afficherApp('/materiaux');
    const mouvements = await screen.findByRole('table', { name: 'Derniers mouvements' });
    expect(within(mouvements).getAllByRole('row')).toHaveLength(6);
    expect(
      within(within(mouvements).getAllByRole('row')[0]!).getByText('31/10'),
    ).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Chantier'), 'Résidence Al Amal');
    expect(
      within(screen.getByRole('table', { name: 'Derniers mouvements' })).getAllByRole('row'),
    ).toHaveLength(4);

    const conso = screen.getByRole('table', { name: 'Consommation par chantier' });
    const lignes = within(conso).getAllByRole('row').slice(1);
    expect(lignes).toHaveLength(4);
    expect(lignes[1]).toHaveTextContent(/Ciment CPJ 45.*1.*120 sacs/);
  });

  it('affiche un encart quand le service Matériaux est indisponible (503)', async () => {
    simulerPanne('materiaux');
    afficherApp('/materiaux');
    expect(
      await screen.findByText(
        'Stock indisponible pendant la panne du module Matériaux (service SOAP).',
      ),
    ).toBeInTheDocument();
  });
});

describe('Mouvement de stock', () => {
  it('valide les champs avec Zod', async () => {
    const d = await ouvrirMouvement();
    await userEvent.click(within(d).getByRole('button', { name: 'Enregistrer le mouvement' }));
    expect(await within(d).findByText('Choisissez un matériau')).toBeInTheDocument();
    expect(within(d).getByText('Choisissez un chantier')).toBeInTheDocument();
    expect(within(d).getByText('Indiquez une quantité positive')).toBeInTheDocument();
  });

  it('refuse une sortie supérieure au stock (422) sans changer le stock', async () => {
    const d = await ouvrirMouvement();
    await saisirMouvement(d, {
      type: 'Sortie',
      materiau: /^Fer à béton HA12/,
      chantier: /^Résidence Al Amal/,
      quantite: '5',
    });
    expect(within(d).getByText('Stock insuffisant')).toBeInTheDocument();

    await userEvent.click(within(d).getByRole('button', { name: 'Enregistrer le mouvement' }));
    const alerte = await within(d).findByRole('alert');
    expect(alerte).toHaveTextContent('Demande refusée');
    expect(alerte).toHaveTextContent('Stock insuffisant pour Fer à béton HA12');
    expect(alerte).toHaveTextContent('422');

    await userEvent.click(within(d).getByRole('button', { name: 'Annuler' }));
    expect(within(ligne('MAT-003')).getByText(/2,4\s*t/)).toBeInTheDocument();
  });

  it('refuse un mouvement vers un chantier clôturé (409)', async () => {
    const d = await ouvrirMouvement();
    await saisirMouvement(d, {
      type: 'Sortie',
      materiau: /^Sable de construction/,
      chantier: /Entrepôt logistique \(clôturé\)/,
      quantite: '1',
    });
    await userEvent.click(within(d).getByRole('button', { name: 'Enregistrer le mouvement' }));

    const alerte = await within(d).findByRole('alert');
    expect(alerte).toHaveTextContent('Conflit');
    expect(alerte).toHaveTextContent('Le chantier « Entrepôt logistique » est clôturé');
  });

  it('affiche le 503 quand le module Chantiers ne répond pas', async () => {
    const d = await ouvrirMouvement();
    await saisirMouvement(d, {
      type: 'Sortie',
      materiau: /^Sable de construction/,
      chantier: /^Groupe scolaire Anza/,
      quantite: '2',
    });
    simulerPanne('chantiers');
    await userEvent.click(within(d).getByRole('button', { name: 'Enregistrer le mouvement' }));

    const alerte = await within(d).findByRole('alert');
    expect(alerte).toHaveTextContent('Module indisponible');
    expect(alerte).toHaveTextContent('503');
  });

  it('enregistre une sortie, met à jour le stock et signale le seuil', async () => {
    const d = await ouvrirMouvement();
    await saisirMouvement(d, {
      type: 'Sortie',
      materiau: /^Ciment CPJ 45/,
      chantier: /^Groupe scolaire Anza/,
      quantite: '100',
    });
    await userEvent.click(within(d).getByRole('button', { name: 'Enregistrer le mouvement' }));

    expect(
      await screen.findByText('Sortie enregistrée : Ciment CPJ 45 220 sacs en stock.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ciment CPJ 45 est sous le seuil d’alerte.')).toBeInTheDocument();
    await waitFor(() => expect(within(ligne('MAT-001')).getByText('220 sacs')).toBeInTheDocument());
    expect(
      within(screen.getByRole('table', { name: 'Derniers mouvements' })).getAllByRole('row'),
    ).toHaveLength(7);
  });

  it('une entrée fait sortir le matériau de l’alerte', async () => {
    const d = await ouvrirMouvement();
    await saisirMouvement(d, {
      type: 'Entrée',
      materiau: /^Ciment CPJ 45/,
      chantier: /^Immeuble Les Dunes/,
      quantite: '200',
    });
    await userEvent.click(within(d).getByRole('button', { name: 'Enregistrer le mouvement' }));

    await waitFor(() =>
      expect(within(ligne('MAT-001')).getByText('Suffisant')).toBeInTheDocument(),
    );
    expect(await screen.findByRole('link', { name: /Matériaux.*1 en alerte/ })).toBeInTheDocument();
  });
});

describe('Nouveau matériau', () => {
  async function ouvrir() {
    afficherApp('/materiaux');
    await lignesStock();
    await userEvent.click(screen.getByRole('button', { name: 'Nouveau matériau' }));
    return screen.getByRole('dialog', { name: 'Nouveau matériau' });
  }

  async function remplir(d: HTMLElement, reference: string) {
    await userEvent.type(within(d).getByLabelText('Référence'), reference);
    await userEvent.type(within(d).getByLabelText('Nom'), 'Carrelage 60×60');
    await userEvent.type(within(d).getByLabelText('Unité'), 'm²');
    await userEvent.type(within(d).getByLabelText('Stock initial'), '50');
    await userEvent.type(within(d).getByLabelText('Seuil d’alerte'), '60');
    await userEvent.click(within(d).getByRole('button', { name: 'Ajouter le matériau' }));
  }

  it('valide les champs avec Zod', async () => {
    const d = await ouvrir();
    await userEvent.type(within(d).getByLabelText('Référence'), 'ciment');
    await userEvent.click(within(d).getByRole('button', { name: 'Ajouter le matériau' }));

    expect(await within(d).findByText('Format attendu : MAT-007')).toBeInTheDocument();
    expect(within(d).getByText('Le nom est obligatoire')).toBeInTheDocument();
    expect(within(d).getByText('L’unité est obligatoire')).toBeInTheDocument();
    expect(within(d).getByText('Le stock initial est obligatoire')).toBeInTheDocument();
  });

  it('affiche le 409 « référence déjà utilisée »', async () => {
    const d = await ouvrir();
    await remplir(d, 'mat-001');
    const alerte = await within(d).findByRole('alert');
    expect(alerte).toHaveTextContent('Conflit');
    expect(alerte).toHaveTextContent('La référence MAT-001 est déjà utilisée');
  });

  it('ajoute le matériau, en alerte si le stock est sous le seuil', async () => {
    const d = await ouvrir();
    await remplir(d, 'mat-007');

    expect(
      await screen.findByText('Carrelage 60×60 (MAT-007) ajouté au stock.'),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(within(ligne('MAT-007')).getByText('En alerte')).toBeInTheDocument(),
    );
    expect(await screen.findByRole('link', { name: /Matériaux.*3 en alerte/ })).toBeInTheDocument();
  });
});
