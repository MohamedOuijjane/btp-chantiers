// Règles d'affichage des ouvriers, communes à la liste et à la fiche.
import type { StatutTache } from '@/components/common/statuts';

import { SPECIALITES, type Specialite } from './types';

/** Ordre des filtres de spécialité de la maquette (écran 6). */
export const ORDRE_SPECIALITES: Specialite[] = [
  'MACON',
  'COFFREUR',
  'FERRAILLEUR',
  'MANOEUVRE',
  'ELECTRICIEN',
  'CONDUCTEUR_ENGINS',
  'PLOMBIER',
  'PEINTRE',
];

export const FILTRES_SPECIALITE: { specialite?: Specialite; libelle: string }[] = [
  { libelle: 'Toutes' },
  ...ORDRE_SPECIALITES.map((s) => ({ specialite: s, libelle: SPECIALITES[s] })),
];

/** Couleur de la barre d'une tâche du planning. */
export const BARRE_STATUT: Record<StatutTache, string> = {
  A_FAIRE: 'bg-accent',
  EN_COURS: 'bg-accent',
  TERMINEE: 'bg-bar-vert',
  BLOQUEE: 'bg-bar-rouge',
};
