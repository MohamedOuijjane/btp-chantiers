// Types du module Ouvriers (REST, FastAPI), alignés sur les contrats cibles :
// planning en camelCase `sourceDisponible` (#14) et tâches avec `id` entier (#6, #13).
import type { StatutTache } from '@/components/common/statuts';

export type Specialite =
  | 'MACON'
  | 'FERRAILLEUR'
  | 'COFFREUR'
  | 'ELECTRICIEN'
  | 'PLOMBIER'
  | 'PEINTRE'
  | 'CONDUCTEUR_ENGINS'
  | 'MANOEUVRE';

export const SPECIALITES: Record<Specialite, string> = {
  MACON: 'Maçon',
  FERRAILLEUR: 'Ferrailleur',
  COFFREUR: 'Coffreur',
  ELECTRICIEN: 'Électricien',
  PLOMBIER: 'Plombier',
  PEINTRE: 'Peintre',
  CONDUCTEUR_ENGINS: 'Conducteur d’engins',
  MANOEUVRE: 'Manœuvre',
};

/** Réponse de GET /api/ouvriers/{id}. */
export type Ouvrier = {
  id: number;
  nom: string;
  prenom: string;
  /** CIN marocaine, unique (RG-06). */
  cin: string;
  specialite: Specialite;
  telephone: string | null;
  disponible: boolean;
};

/** Corps de POST /api/ouvriers. */
export type OuvrierCreation = Omit<Ouvrier, 'id' | 'disponible'> & { disponible?: boolean };

/** Corps de PATCH /api/ouvriers/{id} (modification partielle). */
export type OuvrierModification = Partial<Omit<Ouvrier, 'id' | 'cin'>>;

/** Tâche telle que renvoyée dans le planning d'un ouvrier. */
export type TachePlanning = {
  id: number;
  chantierId: number;
  titre: string;
  dateDebut: string;
  dateFin: string;
  statut: StatutTache;
};

/** Réponse de GET /api/ouvriers/{id}/planning. */
export type Planning = {
  ouvrier: Ouvrier;
  /** Triées par date de début. */
  taches: TachePlanning[];
  /** false = mode dégradé : Tâches est injoignable, le planning est vide. */
  sourceDisponible: boolean;
};

export type FiltreOuvriers = { specialite?: Specialite; disponible?: boolean };
