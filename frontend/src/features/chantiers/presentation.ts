// Règles d'affichage des chantiers, communes à la liste et à la fiche.
import type { TonBarre } from '@/components/common/BarreProgression';

import type { Chantier, StatutChantier } from './types';

/**
 * Référence affichée « CH-aaaa-nnn » : année de début et identifiant sur 3 chiffres.
 * L'API ne renvoie pas de référence : elle est calculée côté front.
 */
export function refChantier(c: Pick<Chantier, 'id' | 'dateDebut'>) {
  return `CH-${c.dateDebut.slice(0, 4)}-${String(c.id).padStart(3, '0')}`;
}

/** Couleur de l'avancement : vert à 100 %, gris si le chantier est suspendu, ambre sinon. */
export function tonAvancement(statut: StatutChantier, avancement: number): TonBarre {
  if (avancement >= 100) return 'vert';
  return statut === 'SUSPENDU' ? 'gris' : 'accent';
}

/** Filtres de la liste, dans l'ordre de la maquette. */
export const FILTRES: { statut?: StatutChantier; libelle: string }[] = [
  { libelle: 'Tous' },
  { statut: 'PLANIFIE', libelle: 'Planifiés' },
  { statut: 'EN_COURS', libelle: 'En cours' },
  { statut: 'SUSPENDU', libelle: 'Suspendus' },
  { statut: 'TERMINE', libelle: 'Terminés' },
];
