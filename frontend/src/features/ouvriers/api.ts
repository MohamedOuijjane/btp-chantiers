/**
 * API du module Ouvriers, utilisée par hooks.ts. Chaque fonction appelle l'API réelle
 * (api.reel.ts, via la gateway) ou les données fictives (api.fictif.ts) selon
 * VITE_API_OUVRIERS (voir src/api/mode.ts). Les signatures sont les mêmes dans les deux modes.
 *
 *   GET    /api/ouvriers?specialite=&disponible=
 *   GET    /api/ouvriers/{id}
 *   POST   /api/ouvriers
 *   PATCH  /api/ouvriers/{id}
 *   DELETE /api/ouvriers/{id}
 *   GET    /api/ouvriers/{id}/planning
 */
import type { OptionsAppel } from '@/api/http';
import { estReel } from '@/api/mode';

import * as fictif from './api.fictif';
import * as reel from './api.reel';
import type { FiltreOuvriers, OuvrierCreation, OuvrierModification } from './types';

const source = () => (estReel('ouvriers') ? reel : fictif);

export function listerOuvriers(filtre: FiltreOuvriers = {}, options?: OptionsAppel) {
  return estReel('ouvriers') ? reel.listerOuvriers(filtre, options) : fictif.listerOuvriers(filtre);
}

export function getOuvrier(id: number, options?: OptionsAppel) {
  return estReel('ouvriers') ? reel.getOuvrier(id, options) : fictif.getOuvrier(id);
}

export function creerOuvrier(donnees: OuvrierCreation) {
  return source().creerOuvrier(donnees);
}

export function modifierOuvrier(id: number, donnees: OuvrierModification) {
  return source().modifierOuvrier(id, donnees);
}

export function supprimerOuvrier(id: number): Promise<void> {
  return source().supprimerOuvrier(id);
}

export function getPlanning(id: number, options?: OptionsAppel) {
  return estReel('ouvriers') ? reel.getPlanning(id, options) : fictif.getPlanning(id);
}
