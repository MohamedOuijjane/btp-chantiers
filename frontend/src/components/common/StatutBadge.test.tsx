import { render, screen } from '@testing-library/react';

import { StatutBadge } from './StatutBadge';
import { STATUTS, type Statut } from './statuts';

describe('StatutBadge', () => {
  it.each<[Statut, string, string]>([
    ['PLANIFIE', 'Planifié', 'gris'],
    ['EN_COURS', 'En cours', 'bleu'],
    ['SUSPENDU', 'Suspendu', 'ambre'],
    ['TERMINE', 'Terminé', 'vert'],
    ['A_FAIRE', 'À faire', 'gris'],
    ['TERMINEE', 'Terminée', 'vert'],
    ['BLOQUEE', 'Bloquée', 'rouge'],
  ])('affiche %s avec le libellé « %s » et la couleur %s', (statut, libelle, ton) => {
    render(<StatutBadge statut={statut} />);

    const badge = screen.getByText(libelle);
    expect(badge).toHaveAttribute('data-ton', ton);
    expect(badge.className).toContain(`--badge-${ton}-bg`);
  });

  it('couvre les 7 statuts des chantiers et des tâches', () => {
    expect(Object.keys(STATUTS)).toHaveLength(7);
  });
});
