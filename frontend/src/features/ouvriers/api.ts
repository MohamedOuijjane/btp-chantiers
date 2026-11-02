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
import { ErreurApi, conflit, introuvable } from '@/api/errors';
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
/** Téléphone marocain : 0 ou +212, puis 5, 6 ou 7, puis 8 chiffres. */
const FORMAT_TELEPHONE = /^(\+212|0)[5-7]\d{8}$/;

/** Validation comme Pydantic : 422 avec une erreur par champ (detail[].loc / msg côté FastAPI). */
function valider(d: { nom?: string; prenom?: string; cin?: string; telephone?: string | null }) {
  const champs: Record<string, string> = {};
  if (d.nom !== undefined && !d.nom.trim()) champs.nom = 'Le nom est obligatoire';
  if (d.prenom !== undefined && !d.prenom.trim()) champs.prenom = 'Le prénom est obligatoire';
  if (d.cin !== undefined && !FORMAT_CIN.test(d.cin)) {
    champs.cin = 'Format de CIN invalide (ex. JB123456)';
  }
  if (d.telephone && !FORMAT_TELEPHONE.test(d.telephone)) {
    champs.telephone = 'Numéro marocain attendu (ex. 0612345678)';
  }
  if (Object.keys(champs).length) {
    throw new ErreurApi({ status: 422, message: 'Données invalides', champs });
  }
}

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
    const telephone = donnees.telephone?.replace(/\s/g, '') || null;
    valider({ ...donnees, cin, telephone });
    if (base.ouvriers.some((o) => o.cin === cin)) {
      throw new ErreurApi({
        status: 409,
        message: `Un ouvrier avec la CIN ${cin} existe déjà`,
        champs: { cin: `La CIN ${cin} est déjà utilisée par un autre ouvrier` },
      });
    }
    const ouvrier: Ouvrier = {
      ...donnees,
      nom: donnees.nom.trim(),
      prenom: donnees.prenom.trim(),
      cin,
      telephone,
      id: prochainId(base.ouvriers),
      disponible: donnees.disponible ?? true,
    };
    base.ouvriers.push(ouvrier);
    return ouvrier;
  });
}

/** Réel : PATCH /api/ouvriers/{id} → 200 Ouvrier | 404 | 422 (validation) */
export function modifierOuvrier(id: number, donnees: OuvrierModification) {
  return appelFictif('ouvriers', () => {
    const ouvrier = trouver(id);
    const telephone =
      donnees.telephone === undefined ? undefined : donnees.telephone?.replace(/\s/g, '') || null;
    valider({ ...donnees, telephone });
    return Object.assign(ouvrier, donnees, telephone === undefined ? {} : { telephone });
  });
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
