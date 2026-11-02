/**
 * API du module Ouvriers : DONNÉES FICTIVES, aucun appel réseau.
 *
 * Endpoints réels à brancher (via la gateway, voir docs/frontend/integration.md) :
 *   GET    /api/ouvriers?specialite=&disponible=
 *   GET    /api/ouvriers/{id}
 *   POST   /api/ouvriers
 *   PATCH  /api/ouvriers/{id}
 *   DELETE /api/ouvriers/{id}
 *   GET    /api/ouvriers/{id}/planning
 */
import { base, prochainId } from '@/api/donnees-fictives';
import { conflit, introuvable, invalide } from '@/api/errors';
import { appelFictif, estEnPanne } from '@/api/simulation';

import type {
  FiltreOuvriers,
  Ouvrier,
  OuvrierCreation,
  OuvrierModification,
  Planning,
} from './types';

/** Format de CIN accepté par le backend (RG-06). */
const FORMAT_CIN = /^[A-Z]{1,2}\d{3,8}$/;

function trouver(id: number): Ouvrier {
  const ouvrier = base.ouvriers.find((o) => o.id === id);
  if (!ouvrier) throw introuvable(`Ouvrier ${id} introuvable`);
  return ouvrier;
}

/** Réel : GET /api/ouvriers?specialite=&disponible= → 200 Ouvrier[] */
export function listerOuvriers(filtre: FiltreOuvriers = {}) {
  return appelFictif('ouvriers', () =>
    base.ouvriers.filter(
      (o) =>
        (!filtre.specialite || o.specialite === filtre.specialite) &&
        (filtre.disponible === undefined || o.disponible === filtre.disponible),
    ),
  );
}

/** Réel : GET /api/ouvriers/{id} → 200 Ouvrier | 404 */
export function getOuvrier(id: number) {
  return appelFictif('ouvriers', () => trouver(id));
}

/** Réel : POST /api/ouvriers → 201 Ouvrier | 409 (CIN déjà utilisée) | 422 (validation) */
export function creerOuvrier(donnees: OuvrierCreation) {
  return appelFictif('ouvriers', () => {
    const cin = donnees.cin.trim().toUpperCase();
    if (!FORMAT_CIN.test(cin)) {
      throw invalide('Données invalides', { cin: 'Format de CIN invalide (ex. JB123456)' });
    }
    if (base.ouvriers.some((o) => o.cin === cin)) {
      throw conflit(`Un ouvrier avec la CIN ${cin} existe déjà`);
    }
    const ouvrier: Ouvrier = {
      ...donnees,
      cin,
      id: prochainId(base.ouvriers),
      disponible: donnees.disponible ?? true,
    };
    base.ouvriers.push(ouvrier);
    return ouvrier;
  });
}

/** Réel : PATCH /api/ouvriers/{id} → 200 Ouvrier | 404 | 422 */
export function modifierOuvrier(id: number, donnees: OuvrierModification) {
  return appelFictif('ouvriers', () => Object.assign(trouver(id), donnees));
}

/** Réel : DELETE /api/ouvriers/{id} → 204 | 404 | 409 (tâches en cours, #15) */
export function supprimerOuvrier(id: number) {
  return appelFictif('ouvriers', () => {
    trouver(id);
    const enCours = base.taches.some((t) => t.ouvrierIds.includes(id) && t.statut !== 'TERMINEE');
    if (enCours) throw conflit('Impossible de supprimer un ouvrier affecté à des tâches en cours');
    base.ouvriers = base.ouvriers.filter((o) => o.id !== id);
  });
}

/**
 * Réel : GET /api/ouvriers/{id}/planning → 200 Planning | 404
 * Si Tâches ne répond pas : 200 avec sourceDisponible = false et aucune tâche (mode dégradé).
 */
export function getPlanning(id: number) {
  return appelFictif('ouvriers', (): Planning => {
    const ouvrier = trouver(id);
    if (estEnPanne('taches')) return { ouvrier, taches: [], sourceDisponible: false };
    const taches = base.taches
      .filter((t) => t.ouvrierIds.includes(id))
      .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut))
      .map(({ id, chantierId, titre, dateDebut, dateFin, statut }) => ({
        id,
        chantierId,
        titre,
        dateDebut,
        dateFin,
        statut,
      }));
    return { ouvrier, taches, sourceDisponible: true };
  });
}
