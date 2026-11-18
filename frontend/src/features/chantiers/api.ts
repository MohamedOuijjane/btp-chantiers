/**
 * API du module Chantiers, utilisée par hooks.ts. Chaque fonction appelle l'API réelle
 * (api.reel.ts, via la gateway) ou les données fictives (api.fictif.ts) selon
 * VITE_API_CHANTIERS (voir src/api/mode.ts). Les signatures sont les mêmes dans les deux modes.
 *
 *   GET    /api/chantiers?statut=
 *   GET    /api/chantiers/{id}
 *   POST   /api/chantiers
 *   PUT    /api/chantiers/{id}
 *   PATCH  /api/chantiers/{id}/cloture
 *   DELETE /api/chantiers/{id}
 *   GET    /api/chantiers/{id}/avancement
 */
import type { OptionsAppel } from '@/api/http';
import { estReel } from '@/api/mode';

import * as fictif from './api.fictif';
import * as reel from './api.reel';
import type { ChantierCreation, ChantierModification, FiltreChantiers } from './types';

const source = () => (estReel('chantiers') ? reel : fictif);

export function listerChantiers(filtre: FiltreChantiers = {}, options?: OptionsAppel) {
  return estReel('chantiers')
    ? reel.listerChantiers(filtre, options)
    : fictif.listerChantiers(filtre);
}

export function getChantier(id: number, options?: OptionsAppel) {
  return estReel('chantiers') ? reel.getChantier(id, options) : fictif.getChantier(id);
}

export function creerChantier(donnees: ChantierCreation) {
  return source().creerChantier(donnees);
}

export function modifierChantier(id: number, donnees: ChantierModification) {
  return source().modifierChantier(id, donnees);
}

export function cloturerChantier(id: number) {
  return source().cloturerChantier(id);
}

export function supprimerChantier(id: number): Promise<void> {
  return source().supprimerChantier(id);
}

export function getAvancement(id: number, options?: OptionsAppel) {
  return estReel('chantiers') ? reel.getAvancement(id, options) : fictif.getAvancement(id);
}
