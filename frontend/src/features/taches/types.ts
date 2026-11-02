// Types du module Tâches & Avancement (REST, NestJS), alignés sur les contrats cibles :
// identifiant entier `id` (plus de `_id`, #6) et blocage avec motif (#11).
import type { StatutTache } from '@/components/common/statuts';

export type { StatutTache };

export type BesoinMateriau = { materiauId: number; quantite: number };

/** Réponse de GET /api/taches/{id}. Dates au format ISO aaaa-mm-jj. */
export type Tache = {
  id: number;
  chantierId: number;
  titre: string;
  description?: string;
  dateDebut: string;
  dateFin: string;
  statut: StatutTache;
  /** Pourcentage de 0 à 100 ; le statut en découle (RG5) sauf si la tâche est bloquée. */
  avancement: number;
  ouvrierIds: number[];
  besoinsMateriaux: BesoinMateriau[];
  /** Motif du blocage quand statut = BLOQUEE, sinon null. */
  motif: string | null;
};

/** Corps de POST /api/taches. */
export type TacheCreation = {
  chantierId: number;
  titre: string;
  description?: string;
  dateDebut: string;
  dateFin: string;
  ouvrierIds?: number[];
  besoinsMateriaux?: BesoinMateriau[];
};

/** Corps de PATCH /api/taches/{id}/blocage. */
export type Blocage = { bloquee: true; motif: string } | { bloquee: false };

export type FiltreTaches = { chantierId?: number; ouvrierId?: number };

/** Corps de PUT /api/taches/{id} (cible, à créer) : mêmes champs que la création. */
export type TacheModification = TacheCreation;

/** Changements de statut proposés dans l'interface : À faire → En cours → Terminée. */
export type TransitionStatut = 'EN_COURS' | 'TERMINEE';

/** Entrée de l'historique des statuts d'une tâche (GET /api/taches/{id}/historique, cible). */
export type ChangementStatut = {
  tacheId: number;
  statut: StatutTache;
  /** Date ISO aaaa-mm-jj. */
  date: string;
  motif?: string;
};
