/**
 * Module Tâches, mode réel (VITE_API_TACHES=reel) : API REST de Tâches v2 (NestJS) via la
 * gateway. Les erreurs NestJS ({ statusCode, message, error }) sont converties en ErreurApi par
 * src/api/http.ts.
 *
 * Écarts avec le contrat cible, compensés ici en attendant le backend :
 * - #141 : la réponse d'une tâche n'a pas de motif ; il est lu dans l'historique (fiche seulement) ;
 * - #142 : pas d'historique global ; il est calculé à partir des tâches récentes.
 */
import { creerClientHttp, type OptionsAppel } from '@/api/http';

import type {
  Blocage,
  ChangementStatut,
  FiltreTaches,
  HistoriqueRecent,
  Tache,
  TacheCreation,
  TacheModification,
  TransitionStatut,
} from './types';

const http = creerClientHttp('Tâches');

/** Tâche telle que renvoyée par l'API : sans motif (#141). */
type TacheApi = Omit<Tache, 'motif'> & { motif?: string | null };

const versTache = (t: TacheApi, motif: string | null = null): Tache => ({
  ...t,
  motif: t.motif ?? motif,
});

/** GET /api/taches?chantierId=&ouvrierId= → 200 Tache[] (motif à null, #141) */
export async function listerTaches(filtre: FiltreTaches = {}, { signal }: OptionsAppel = {}) {
  const taches = await http.get<TacheApi[]>('/api/taches', {
    params: { chantierId: filtre.chantierId, ouvrierId: filtre.ouvrierId },
    signal,
  });
  return taches.map((t) => versTache(t));
}

/** GET /api/taches/{id}/historique → 200 ChangementStatut[] (du plus récent au plus ancien) | 404 */
export function getHistorique(id: number, { signal }: OptionsAppel = {}) {
  return http.get<ChangementStatut[]>(`/api/taches/${id}/historique`, { signal });
}

/**
 * GET /api/taches/{id} → 200 Tache | 400 | 404. Tâche bloquée : son motif est lu dans
 * l'historique, à la dernière entrée BLOQUEE (#141 : l'API ne le renvoie pas encore).
 */
export async function getTache(id: number, options: OptionsAppel = {}) {
  const t = await http.get<TacheApi>(`/api/taches/${id}`, { signal: options.signal });
  if (t.statut !== 'BLOQUEE' || t.motif) return versTache(t);
  const historique = await getHistorique(id, options).catch(() => []);
  return versTache(t, historique.find((h) => h.statut === 'BLOQUEE')?.motif ?? null);
}

/**
 * POST /api/taches → 201 Tache | 400 | 404 | 409 (chantier clôturé ou suspendu, conflit de
 * planning) | 422 (ouvrier indisponible, stock insuffisant) | 503 (module injoignable)
 */
export async function creerTache(donnees: TacheCreation) {
  return versTache(await http.post<TacheApi>('/api/taches', donnees));
}

/** PUT /api/taches/{id} → 200 Tache | 400 | 404 | 409 | 422 | 503 (mêmes vérifications que la création) */
export async function modifierTache(id: number, donnees: TacheModification) {
  return versTache(await http.put<TacheApi>(`/api/taches/${id}`, donnees));
}

/** PATCH /api/taches/{id}/statut { statut } → 200 Tache | 400 | 404 | 409 (transition, tâche bloquée) */
export async function changerStatut(id: number, statut: TransitionStatut) {
  return versTache(await http.patch<TacheApi>(`/api/taches/${id}/statut`, { statut }));
}

/** PATCH /api/taches/{id}/avancement { avancement } → 200 Tache | 400 | 404 (| 409 bloquée : #143) */
export async function majAvancement(id: number, avancement: number) {
  return versTache(await http.patch<TacheApi>(`/api/taches/${id}/avancement`, { avancement }));
}

/** PATCH /api/taches/{id}/ouvriers { ouvrierIds } → 200 Tache | 404 | 409 (planning) | 422 */
export async function affecterOuvriers(id: number, ouvrierIds: number[]) {
  return versTache(await http.patch<TacheApi>(`/api/taches/${id}/ouvriers`, { ouvrierIds }));
}

/**
 * PATCH /api/taches/{id}/blocage { bloquee, motif? } → 200 Tache | 400 (motif manquant) | 404
 * | 409. Le motif envoyé est repris dans la tâche renvoyée (#141).
 */
export async function bloquerTache(id: number, blocage: Blocage) {
  const t = await http.patch<TacheApi>(`/api/taches/${id}/blocage`, blocage);
  return versTache(t, blocage.bloquee ? blocage.motif : null);
}

/** DELETE /api/taches/{id} → 204 | 400 | 404 */
export async function supprimerTache(id: number): Promise<void> {
  await http.supprimer(`/api/taches/${id}`);
}

/** Nombre de tâches dont l'historique est lu pour l'historique global (#142). */
export const TACHES_LUES_POUR_HISTORIQUE = 20;

/**
 * Historique global calculé côté front, EN ATTENDANT GET /api/taches/historique?limite= (#142) :
 * à remplacer par un simple appel à cet endpoint quand il existera.
 *
 * L'API ne donne pas la date de modification d'une tâche : les 20 tâches lues sont les plus
 * récemment créées (identifiants les plus élevés). Leurs historiques sont lus en parallèle ; si
 * une partie échoue, le résultat est marqué incomplet (encart discret sur le tableau de bord).
 * Si toutes les lectures échouent, l'erreur est levée comme pour un appel normal.
 */
export async function historiqueRecentCalcule(
  limite: number,
  options: OptionsAppel = {},
): Promise<HistoriqueRecent> {
  const taches = await http.get<TacheApi[]>('/api/taches', { signal: options.signal });
  const recentes = [...taches].sort((a, b) => b.id - a.id).slice(0, TACHES_LUES_POUR_HISTORIQUE);
  const lectures = await Promise.allSettled(recentes.map((t) => getHistorique(t.id, options)));
  const lues = lectures.filter(
    (l): l is PromiseFulfilledResult<ChangementStatut[]> => l.status === 'fulfilled',
  );
  if (recentes.length && !lues.length) {
    throw (lectures[0] as PromiseRejectedResult).reason;
  }
  const changements: HistoriqueRecent = lues
    .flatMap((l) => l.value)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limite);
  if (lues.length < lectures.length) changements.incomplet = true;
  return changements;
}

/** Derniers changements de statut, toutes tâches confondues (tableau de bord). */
export function listerHistorique(limite = 10, options: OptionsAppel = {}) {
  return historiqueRecentCalcule(limite, options);
}
