import { render, screen } from '@testing-library/react';

import { BarreProgression } from './BarreProgression';

describe('BarreProgression', () => {
  it('expose la valeur aux technologies d’assistance', () => {
    render(<BarreProgression valeur={56} libelle="Avancement de Résidence Al Amal" />);

    const barre = screen.getByRole('progressbar', { name: 'Avancement de Résidence Al Amal' });
    expect(barre).toHaveAttribute('aria-valuenow', '56');
    expect(barre.firstElementChild).toHaveStyle({ width: '56%' });
  });

  it('borne la valeur entre 0 et 100', () => {
    render(<BarreProgression valeur={140} libelle="Avancement" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('passe en vert à 100 %', () => {
    render(<BarreProgression valeur={100} libelle="Avancement" />);
    expect(screen.getByRole('progressbar').firstElementChild).toHaveClass('bg-bar-vert');
  });
});
