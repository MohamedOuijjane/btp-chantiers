// Types du module Chantiers (REST, Spring Boot), alignés sur les contrats cibles.
import type { StatutChantier } from '@/components/common/statuts';

export type { StatutChantier };

/** Réponse de GET /api/chantiers/{id}. Dates au format ISO aaaa-mm-jj. */
export type Chantier = {
  id: number;
  nom: string;
  adresse: string;
  client: string;
  dateDebut: string;
  dateFinPrevue: string;
  /** Montant en MAD. */
  budget: number;
  statut: StatutChantier;
};

/** Corps de POST /api/chantiers : un nouveau chantier est toujours PLANIFIE (RG4). */
export type ChantierCreation = Omit<Chantier, 'id' | 'statut'>;

/** Corps de PUT /api/chantiers/{id} : TERMINE est refusé (passer par la clôture). */
export type ChantierModification = ChantierCreation & {
  statut?: Exclude<StatutChantier, 'TERMINE'>;
};

/** Réponse de GET /api/chantiers/{id}/avancement (agrégé depuis Tâches). */
export type AvancementChantier = {
  chantierId: number;
  nombreTaches: number;
  /** Pourcentage arrondi ; null si le module Tâches ne répond pas. */
  avancementGlobal: number | null;
  /** false = mode dégradé : Tâches est injoignable. */
  sourceDisponible: boolean;
};

export type FiltreChantiers = { statut?: StatutChantier };
