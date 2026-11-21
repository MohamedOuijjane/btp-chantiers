/**
 * API du module Matériaux, utilisée par hooks.ts. Chaque fonction appelle le web service SOAP
 * réel (api.reel.ts, POST /ws via la gateway) ou les données fictives (api.fictif.ts) selon
 * VITE_API_MATERIAUX (voir src/api/mode.ts). Les signatures sont les mêmes dans les deux modes.
 *
 *   ListerMateriaux(enAlerteSeulement?)
 *   GetMateriau(id)
 *   AjouterMateriau(materiau)
 *   VerifierStock(materiauId, quantite)
 *   EnregistrerMouvement(materiauId, chantierId, type, quantite)
 *   ListerMouvements(chantierId?, materiauId?)
 */
import type { OptionsAppel } from '@/api/http';
import { estReel } from '@/api/mode';

import * as fictif from './api.fictif';
import * as reel from './api.reel';
import type { FiltreMouvements, MateriauCreation, MouvementCreation } from './types';

const source = () => (estReel('materiaux') ? reel : fictif);

export function listerMateriaux(enAlerteSeulement = false, options?: OptionsAppel) {
  return estReel('materiaux')
    ? reel.listerMateriaux(enAlerteSeulement, options)
    : fictif.listerMateriaux(enAlerteSeulement);
}

export function getMateriau(id: number, options?: OptionsAppel) {
  return estReel('materiaux') ? reel.getMateriau(id, options) : fictif.getMateriau(id);
}

export function ajouterMateriau(donnees: MateriauCreation) {
  return source().ajouterMateriau(donnees);
}

export function verifierStock(materiauId: number, quantite: number) {
  return source().verifierStock(materiauId, quantite);
}

export function enregistrerMouvement(donnees: MouvementCreation) {
  return source().enregistrerMouvement(donnees);
}

export function listerMouvements(filtre: FiltreMouvements = {}, options?: OptionsAppel) {
  return estReel('materiaux')
    ? reel.listerMouvements(filtre, options)
    : fictif.listerMouvements(filtre);
}
