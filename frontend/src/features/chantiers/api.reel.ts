/**
 * Module Chantiers, mode réel (VITE_API_CHANTIERS=reel) : API REST de Chantiers (Spring Boot)
 * via la gateway. Les erreurs (RFC 9457) sont converties en ErreurApi par src/api/http.ts.
 */
import { creerClientHttp, type OptionsAppel } from '@/api/http';

import type {
  AvancementChantier,
  Chantier,
  ChantierCreation,
  ChantierModification,
  FiltreChantiers,
} from './types';

const http = creerClientHttp('Chantiers');

/** GET /api/chantiers?statut= → 200 Chantier[] */
export function listerChantiers(filtre: FiltreChantiers = {}, { signal }: OptionsAppel = {}) {
  return http.get<Chantier[]>('/api/chantiers', { params: { statut: filtre.statut }, signal });
}

/** GET /api/chantiers/{id} → 200 Chantier | 404 */
export function getChantier(id: number, { signal }: OptionsAppel = {}) {
  return http.get<Chantier>(`/api/chantiers/${id}`, { signal });
}

/** POST /api/chantiers → 201 Chantier (toujours PLANIFIE) | 400 (erreurs par champ, RG-01) */
export function creerChantier(donnees: ChantierCreation) {
  return http.post<Chantier>('/api/chantiers', donnees);
}

/** PUT /api/chantiers/{id} → 200 Chantier | 400 | 404 | 409 (chantier terminé, passage à TERMINE) */
export function modifierChantier(id: number, donnees: ChantierModification) {
  return http.put<Chantier>(`/api/chantiers/${id}`, donnees);
}

/** PATCH /api/chantiers/{id}/cloture → 200 Chantier | 404 | 409 (déjà terminé) */
export function cloturerChantier(id: number) {
  return http.patch<Chantier>(`/api/chantiers/${id}/cloture`);
}

/** DELETE /api/chantiers/{id} → 204 | 404 (| 409 si le chantier a des tâches, après #5) */
export async function supprimerChantier(id: number): Promise<void> {
  await http.supprimer(`/api/chantiers/${id}`);
}

/**
 * GET /api/chantiers/{id}/avancement → 200 AvancementChantier | 404.
 * L'API renvoie une décimale (66.7) : arrondie ici, comme l'annonce le type et comme l'affichent
 * les pages. Tâches injoignable : 200 avec sourceDisponible = false et avancementGlobal = null.
 */
export async function getAvancement(
  id: number,
  { signal }: OptionsAppel = {},
): Promise<AvancementChantier> {
  const a = await http.get<AvancementChantier>(`/api/chantiers/${id}/avancement`, { signal });
  return {
    ...a,
    avancementGlobal: a.avancementGlobal === null ? null : Math.round(a.avancementGlobal),
  };
}
