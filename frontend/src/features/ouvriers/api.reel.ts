/**
 * Module Ouvriers, mode réel (VITE_API_OUVRIERS=reel) : API REST d'Ouvriers (FastAPI) via la
 * gateway. Les erreurs FastAPI ({ detail } ou { detail: [{ loc, msg }] }) sont converties en
 * ErreurApi par src/api/http.ts : le 409 de CIN en double arrive dans champs.cin.
 */
import { ErreurApi } from '@/api/errors';
import { creerClientHttp, type OptionsAppel } from '@/api/http';

import type {
  FiltreOuvriers,
  Ouvrier,
  OuvrierCreation,
  OuvrierModification,
  Planning,
} from './types';

const http = creerClientHttp('Ouvriers');

/** GET /api/ouvriers?specialite=&disponible= → 200 Ouvrier[] */
export function listerOuvriers(filtre: FiltreOuvriers = {}, { signal }: OptionsAppel = {}) {
  return http.get<Ouvrier[]>('/api/ouvriers', {
    params: { specialite: filtre.specialite, disponible: filtre.disponible },
    signal,
  });
}

/** GET /api/ouvriers/{id} → 200 Ouvrier | 404 */
export function getOuvrier(id: number, { signal }: OptionsAppel = {}) {
  return http.get<Ouvrier>(`/api/ouvriers/${id}`, { signal });
}

/** POST /api/ouvriers → 201 Ouvrier (disponible) | 409 (CIN déjà utilisée, sous le champ cin) | 422 */
export async function creerOuvrier(donnees: OuvrierCreation) {
  try {
    return await http.post<Ouvrier>('/api/ouvriers', donnees);
  } catch (e) {
    // Le 409 arrive au format des 422 (detail: [{ loc, msg }]) : http.ts le titre « Données
    // invalides ». Le toast reprend plutôt le message du champ (« La CIN … est déjà utilisée »).
    if (e instanceof ErreurApi && e.status === 409 && e.champs?.cin) {
      const { status, champs, requestId } = e;
      throw new ErreurApi({ status, message: e.champs.cin, champs, requestId });
    }
    throw e;
  }
}

/** PATCH /api/ouvriers/{id} → 200 Ouvrier | 404 | 422 */
export function modifierOuvrier(id: number, donnees: OuvrierModification) {
  return http.patch<Ouvrier>(`/api/ouvriers/${id}`, donnees);
}

/**
 * DELETE /api/ouvriers/{id} → 204 | 404 | 409 (tâches non terminées, citées dans le message, #15)
 * | 503 (Tâches injoignable : rien n'est supprimé).
 */
export async function supprimerOuvrier(id: number): Promise<void> {
  await http.supprimer(`/api/ouvriers/${id}`);
}

/**
 * GET /api/ouvriers/{id}/planning → 200 Planning | 404. Tâches injoignable : 200 avec
 * sourceDisponible = false et aucune tâche (mode dégradé). Le tri par date de début est
 * garanti ici, comme l'annonce le type.
 */
export async function getPlanning(id: number, { signal }: OptionsAppel = {}): Promise<Planning> {
  const p = await http.get<Planning>(`/api/ouvriers/${id}/planning`, { signal });
  return { ...p, taches: [...p.taches].sort((a, b) => a.dateDebut.localeCompare(b.dateDebut)) };
}
