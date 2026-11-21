/**
 * Module Tâches, mode réel (VITE_API_TACHES=reel) : API REST de Tâches v2 (NestJS) via la
 * gateway. Les erreurs NestJS ({ statusCode, message, error }) sont converties en ErreurApi par
 * src/api/http.ts. Une tâche porte le motif de son blocage en cours (#141).
 */
import { creerClientHttp, type OptionsAppel } from '@/api/http';

import type {
  Blocage,
  ChangementStatut,
  FiltreTaches,
  Tache,
  TacheCreation,
  TacheModification,
  TransitionStatut,
} from './types';

const http = creerClientHttp('Tâches');

/** GET /api/taches?chantierId=&ouvrierId= → 200 Tache[] */
export function listerTaches(filtre: FiltreTaches = {}, { signal }: OptionsAppel = {}) {
  return http.get<Tache[]>('/api/taches', {
    params: { chantierId: filtre.chantierId, ouvrierId: filtre.ouvrierId },
    signal,
  });
}

/** GET /api/taches/{id}/historique → 200 ChangementStatut[] (du plus récent au plus ancien) | 404 */
export function getHistorique(id: number, { signal }: OptionsAppel = {}) {
  return http.get<ChangementStatut[]>(`/api/taches/${id}/historique`, { signal });
}

/** GET /api/taches/{id} → 200 Tache | 400 | 404 */
export function getTache(id: number, { signal }: OptionsAppel = {}) {
  return http.get<Tache>(`/api/taches/${id}`, { signal });
}

/**
 * POST /api/taches → 201 Tache | 400 | 404 | 409 (chantier clôturé ou suspendu, conflit de
 * planning) | 422 (ouvrier indisponible, stock insuffisant) | 503 (module injoignable)
 */
export function creerTache(donnees: TacheCreation) {
  return http.post<Tache>('/api/taches', donnees);
}

/** PUT /api/taches/{id} → 200 Tache | 400 | 404 | 409 | 422 | 503 (mêmes vérifications que la création) */
export function modifierTache(id: number, donnees: TacheModification) {
  return http.put<Tache>(`/api/taches/${id}`, donnees);
}

/** PATCH /api/taches/{id}/statut { statut } → 200 Tache | 400 | 404 | 409 (transition, tâche bloquée) */
export function changerStatut(id: number, statut: TransitionStatut) {
  return http.patch<Tache>(`/api/taches/${id}/statut`, { statut });
}

/** PATCH /api/taches/{id}/avancement { avancement } → 200 Tache | 400 | 404 | 409 (tâche bloquée, #143) */
export function majAvancement(id: number, avancement: number) {
  return http.patch<Tache>(`/api/taches/${id}/avancement`, { avancement });
}

/** PATCH /api/taches/{id}/ouvriers { ouvrierIds } → 200 Tache | 404 | 409 (planning) | 422 */
export function affecterOuvriers(id: number, ouvrierIds: number[]) {
  return http.patch<Tache>(`/api/taches/${id}/ouvriers`, { ouvrierIds });
}

/** PATCH /api/taches/{id}/blocage { bloquee, motif? } → 200 Tache | 400 (motif manquant) | 404 | 409 */
export function bloquerTache(id: number, blocage: Blocage) {
  return http.patch<Tache>(`/api/taches/${id}/blocage`, blocage);
}

/** DELETE /api/taches/{id} → 204 | 400 | 404 */
export async function supprimerTache(id: number): Promise<void> {
  await http.supprimer(`/api/taches/${id}`);
}

/**
 * GET /api/taches/historique?limite= → 200 ChangementStatut[] : derniers changements de statut,
 * toutes tâches confondues, du plus récent au plus ancien (limite de 1 à 100, #142).
 */
export function listerHistorique(limite = 10, { signal }: OptionsAppel = {}) {
  return http.get<ChangementStatut[]>('/api/taches/historique', { params: { limite }, signal });
}
