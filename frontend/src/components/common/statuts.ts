// Libellés et couleurs des statuts de chantier et de tâche.
export type StatutChantier = 'PLANIFIE' | 'EN_COURS' | 'SUSPENDU' | 'TERMINE';
export type StatutTache = 'A_FAIRE' | 'EN_COURS' | 'TERMINEE' | 'BLOQUEE';
export type Statut = StatutChantier | StatutTache;

export type Ton = 'gris' | 'bleu' | 'ambre' | 'vert' | 'rouge';

export const STATUTS: Record<Statut, { libelle: string; ton: Ton }> = {
  PLANIFIE: { libelle: 'Planifié', ton: 'gris' },
  EN_COURS: { libelle: 'En cours', ton: 'bleu' },
  SUSPENDU: { libelle: 'Suspendu', ton: 'ambre' },
  TERMINE: { libelle: 'Terminé', ton: 'vert' },
  A_FAIRE: { libelle: 'À faire', ton: 'gris' },
  TERMINEE: { libelle: 'Terminée', ton: 'vert' },
  BLOQUEE: { libelle: 'Bloquée', ton: 'rouge' },
};
