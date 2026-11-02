import { estEnPanne, pannesDepuisUrl } from './simulation';

describe('pannesDepuisUrl', () => {
  it('simule l’arrêt des modules cités dans ?panne=', () => {
    pannesDepuisUrl('?panne=taches,ouvriers,inconnu');
    expect(estEnPanne('taches')).toBe(true);
    expect(estEnPanne('ouvriers')).toBe(true);
    expect(estEnPanne('materiaux')).toBe(false);
  });
});
