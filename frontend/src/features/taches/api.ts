/**
 * API du module Tâches, utilisée par hooks.ts. Chaque fonction appelle l'API réelle (api.reel.ts,
 * via la gateway) ou les données fictives (api.fictif.ts) selon VITE_API_TACHES (voir
 * src/api/mode.ts). Les signatures sont les mêmes dans les deux modes.
 *
 *   GET    /api/taches?chantierId=&ouvrierId=
 *   GET    /api/taches/{id}
 *   POST   /api/taches
 *   PUT    /api/taches/{id}
 *   PATCH  /api/taches/{id}/statut
 *   PATCH  /api/taches/{id}/avancement
 *   PATCH  /api/taches/{id}/ouvriers
 *   PATCH  /api/taches/{id}/blocage
 *   GET    /api/taches/{id}/historique
 *   DELETE /api/taches/{id}
 *   Historique global : calculé côté front en attendant GET /api/taches/historique (#142)
 */
import type { OptionsAppel } from '@/api/http';
import { estReel } from '@/api/mode';

import * as fictif from './api.fictif';
import * as reel from './api.reel';
import type {
  Blocage,
  FiltreTaches,
  HistoriqueRecent,
  TacheCreation,
  TacheModification,
  TransitionStatut,
} from './types';

const source = () => (estReel('taches') ? reel : fictif);

export function listerTaches(filtre: FiltreTaches = {}, options?: OptionsAppel) {
  return estReel('taches') ? reel.listerTaches(filtre, options) : fictif.listerTaches(filtre);
}

export function getTache(id: number, options?: OptionsAppel) {
  return estReel('taches') ? reel.getTache(id, options) : fictif.getTache(id);
}

export function creerTache(donnees: TacheCreation) {
  return source().creerTache(donnees);
}

export function modifierTache(id: number, donnees: TacheModification) {
  return source().modifierTache(id, donnees);
}

export function changerStatut(id: number, statut: TransitionStatut) {
  return source().changerStatut(id, statut);
}

export function majAvancement(id: number, avancement: number) {
  return source().majAvancement(id, avancement);
}

export function affecterOuvriers(id: number, ouvrierIds: number[]) {
  return source().affecterOuvriers(id, ouvrierIds);
}

export function bloquerTache(id: number, blocage: Blocage) {
  return source().bloquerTache(id, blocage);
}

export function getHistorique(id: number, options?: OptionsAppel) {
  return estReel('taches') ? reel.getHistorique(id, options) : fictif.getHistorique(id);
}

export function listerHistorique(limite = 10, options?: OptionsAppel): Promise<HistoriqueRecent> {
  return estReel('taches')
    ? reel.listerHistorique(limite, options)
    : fictif.listerHistorique(limite);
}

export function supprimerTache(id: number): Promise<void> {
  return source().supprimerTache(id);
}
