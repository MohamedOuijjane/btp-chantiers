// Règles d'affichage du stock (écran 7 de la maquette).
import type { Materiau } from './types';

/**
 * Niveau de la jauge : l'échelle va jusqu'à deux fois le seuil, le seuil est donc au milieu.
 * Ex. ciment 320 sacs pour un seuil de 400 → 40 % ; sable 86 m³ pour 30 → 100 %.
 */
export function niveauStock(m: Pick<Materiau, 'stock' | 'seuilAlerte'>) {
  if (m.seuilAlerte <= 0) return 100;
  return Math.min(100, Math.round((m.stock / (2 * m.seuilAlerte)) * 100));
}
