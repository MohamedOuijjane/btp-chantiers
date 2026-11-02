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
