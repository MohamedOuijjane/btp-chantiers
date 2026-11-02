// Règles d'affichage des tâches, communes à la liste, à la fiche et à la fiche chantier.
import type { TonBarre } from '@/components/common/BarreProgression';

import type { StatutTache, Tache, TransitionStatut } from './types';

/** Couleur de l'avancement : rouge si bloquée, vert à 100 %, ambre sinon. */
export function tonTache(t: Pick<Tache, 'statut' | 'avancement'>): TonBarre {
  if (t.statut === 'BLOQUEE') return 'rouge';
  return t.avancement >= 100 ? 'vert' : 'accent';
}

/** Prochain statut proposé : À faire → En cours → Terminée. */
export const PROCHAIN_STATUT: Partial<
  Record<StatutTache, { statut: TransitionStatut; libelle: string }>
> = {
  A_FAIRE: { statut: 'EN_COURS', libelle: 'Démarrer' },
  EN_COURS: { statut: 'TERMINEE', libelle: 'Terminer' },
};

/** Filtres de statut de la liste, dans l'ordre du cycle de vie. */
export const FILTRES_STATUT: { statut?: StatutTache; libelle: string }[] = [
  { libelle: 'Toutes' },
  { statut: 'A_FAIRE', libelle: 'À faire' },
  { statut: 'EN_COURS', libelle: 'En cours' },
  { statut: 'BLOQUEE', libelle: 'Bloquées' },
  { statut: 'TERMINEE', libelle: 'Terminées' },
];
