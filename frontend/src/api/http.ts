/**
 * Client REST partagé par tous les modules (Chantiers, Tâches, Ouvriers).
 *
 * - Appelle la gateway sur la même origine (`/api/...`) : jamais `localhost:8081` ni un nom Docker.
 * - Envoie un `X-Request-Id` (la gateway le garde et le transmet au service appelé).
 * - Convertit toute erreur en `ErreurApi` (voir `versErreurApi`) :
 *     Chantiers (Spring, RFC 9457) : { detail, erreurs: { champ: message } }
 *     Tâches (NestJS)              : { statusCode, message: string | string[] }
 *     Ouvriers (FastAPI)           : { detail: string } ou { detail: [{ loc, msg }] }
 * - Réseau coupé, délai dépassé (10 s) ou réponse 502 / 503 / 504 → 503 « module indisponible ».
 * - Annulation : le `signal` reçu (TanStack Query) interrompt l'appel ; l'erreur d'annulation est
 *   propagée telle quelle, sans devenir une ErreurApi.
 * - Authentification (ADR-0006) : envoie `Authorization: Bearer <jeton>` si une session existe ;
 *   un 401 reçu avec un jeton efface la session et ramène à /connexion (« Session expirée »).
 */
import { lireSession, signalerSessionExpiree } from '@/features/auth/session';

import { ErreurApi } from './errors';

/** Délai maximal d'un appel, au-delà duquel le module est considéré comme indisponible. */
export const DELAI_MS = 10_000;

type ValeurParametre = string | number | boolean | null | undefined;

/** Options communes à toutes les fonctions de api.ts (le signal vient de TanStack Query). */
export type OptionsAppel = { signal?: AbortSignal };

export type OptionsRequete = OptionsAppel & {
  /** Paramètres de l'URL ; les valeurs vides (undefined, null, '') sont ignorées. */
  params?: Record<string, ValeurParametre>;
  /** Corps envoyé en JSON. */
  corps?: unknown;
  /** Délai maximal en millisecondes (10 s par défaut). */
  delaiMs?: number;
};

type Methode = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Identifiant unique d'une requête, repris dans les logs de la gateway et des services. */
export function nouvelIdentifiant(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export function construireUrl(chemin: string, params: Record<string, ValeurParametre> = {}) {
  const url = new URL(chemin, window.location.origin);
  for (const [cle, valeur] of Object.entries(params)) {
    if (valeur !== undefined && valeur !== null && valeur !== '') {
      url.searchParams.set(cle, String(valeur));
    }
  }
  return url.toString();
}

const MESSAGES_PAR_DEFAUT: Record<number, string> = {
  400: 'Données invalides',
  401: 'Authentification requise',
  403: 'Accès refusé',
  404: 'Ressource introuvable',
  409: 'Conflit avec l’état actuel des données',
  422: 'Demande refusée',
  429: 'Trop de tentatives, réessayez dans un instant.',
  500: 'Erreur interne du serveur',
};

export function messageIndisponible(module: string) {
  return `Le module ${module} est indisponible, réessayez dans un instant.`;
}

type Lecture = { message?: string; champs?: Record<string, string> };

const estObjet = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Le message NestJS (class-validator) commence par le nom du champ : « titre should not be empty ». */
const CHAMP_EN_TETE = /^([a-z][A-Za-z0-9_]*)\s/;

/** Lit le corps d'erreur des trois frameworks REST du projet. */
function lireCorpsErreur(corps: unknown): Lecture {
  if (!estObjet(corps)) return {};
  const lecture: Lecture = {};

  // Chantiers (Spring, RFC 9457) : erreurs par champ dans « erreurs ».
  if (estObjet(corps.erreurs)) {
    lecture.champs = Object.fromEntries(
      Object.entries(corps.erreurs).map(([champ, msg]) => [champ, String(msg)]),
    );
  }

  // Chantiers (detail) et Ouvriers (FastAPI : detail en chaîne ou en tableau de { loc, msg }).
  if (typeof corps.detail === 'string') {
    lecture.message = corps.detail;
  } else if (Array.isArray(corps.detail)) {
    const champs: Record<string, string> = {};
    for (const e of corps.detail) {
      if (!estObjet(e)) continue;
      const loc = Array.isArray(e.loc) ? e.loc : [];
      const champ = loc.length ? String(loc[loc.length - 1]) : undefined;
      if (champ && typeof e.msg === 'string' && !(champ in champs)) champs[champ] = e.msg;
    }
    lecture.champs = { ...champs, ...lecture.champs };
    lecture.message = 'Données invalides';
  }

  // Tâches (NestJS) : message en chaîne, ou tableau de messages de validation.
  if (lecture.message === undefined) {
    if (typeof corps.message === 'string') {
      lecture.message = corps.message;
    } else if (Array.isArray(corps.message)) {
      const messages = corps.message.map(String);
      lecture.message = messages.join('. ');
      const champs: Record<string, string> = {};
      for (const m of messages) {
        const champ = CHAMP_EN_TETE.exec(m)?.[1];
        if (champ && !(champ in champs)) champs[champ] = m;
      }
      if (Object.keys(champs).length) lecture.champs = { ...champs, ...lecture.champs };
    }
  }

  if (lecture.champs && !Object.keys(lecture.champs).length) delete lecture.champs;
  return lecture;
}

/** Convertit une réponse en erreur (status ≥ 400) en ErreurApi. */
export function versErreurApi(
  module: string,
  status: number,
  corps: unknown,
  requestId?: string,
): ErreurApi {
  const { message, champs } = lireCorpsErreur(corps);
  if (status === 502 || status === 503 || status === 504) {
    // 503 renvoyé par un service : son message est gardé (« Le module Ouvriers est indisponible… »).
    // 502 / 504 viennent de la gateway (service arrêté ou trop lent) : message générique.
    const garde = status === 503 && message ? message : messageIndisponible(module);
    return new ErreurApi({ status: 503, message: garde, requestId });
  }
  return new ErreurApi({
    status,
    message: message ?? MESSAGES_PAR_DEFAUT[status] ?? `Erreur ${status}`,
    champs,
    requestId,
  });
}

async function lireCorps(reponse: Response): Promise<unknown> {
  if (reponse.status === 204) return undefined;
  const texte = await reponse.text();
  if (!texte) return undefined;
  try {
    return JSON.parse(texte) as unknown;
  } catch {
    return texte;
  }
}

function erreurAnnulation(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('Requête annulée', 'AbortError');
}

/** Appel REST de bas niveau : préférer les méthodes de `creerClientHttp`. */
export async function requete<T>(
  module: string,
  methode: Methode,
  chemin: string,
  options: OptionsRequete = {},
): Promise<T> {
  const { params, corps, signal, delaiMs = DELAI_MS } = options;
  if (signal?.aborted) throw erreurAnnulation(signal);

  const requestId = nouvelIdentifiant();
  const entetes: Record<string, string> = { Accept: 'application/json', 'X-Request-Id': requestId };
  if (corps !== undefined) entetes['Content-Type'] = 'application/json';
  // Jeton de la session (ADR-0006) : la gateway le vérifie avant de transmettre la requête.
  const jeton = lireSession()?.jeton;
  if (jeton) entetes.Authorization = `Bearer ${jeton}`;

  const controleur = new AbortController();
  let delaiDepasse = false;
  const minuterie = setTimeout(() => {
    delaiDepasse = true;
    controleur.abort();
  }, delaiMs);
  const relayerAnnulation = () => controleur.abort();
  signal?.addEventListener('abort', relayerAnnulation, { once: true });

  let reponse: Response;
  let contenu: unknown;
  try {
    reponse = await fetch(construireUrl(chemin, params), {
      method: methode,
      headers: entetes,
      body: corps === undefined ? undefined : JSON.stringify(corps),
      signal: controleur.signal,
    });
    contenu = await lireCorps(reponse);
  } catch {
    if (signal?.aborted) throw erreurAnnulation(signal);
    const raison = delaiDepasse
      ? `Le module ${module} ne répond pas (délai de ${(delaiMs / 1000).toLocaleString('fr-FR')} s dépassé).`
      : messageIndisponible(module);
    throw new ErreurApi({ status: 503, message: raison, requestId });
  } finally {
    clearTimeout(minuterie);
    signal?.removeEventListener('abort', relayerAnnulation);
  }

  if (!reponse.ok) {
    // 401 alors qu'un jeton a été envoyé : session expirée (ou jeton refusé). AuthProvider efface
    // la session et ramène à /connexion. Sans jeton (connexion refusée), rien de plus à faire.
    if (reponse.status === 401 && jeton) signalerSessionExpiree();
    const idReponse = reponse.headers.get('X-Request-Id') ?? requestId;
    throw versErreurApi(module, reponse.status, contenu, idReponse);
  }
  return contenu as T;
}

/** Client d'un module : `const http = creerClientHttp('Chantiers')`. */
export function creerClientHttp(module: string) {
  return {
    get: <T>(chemin: string, options?: OptionsRequete) =>
      requete<T>(module, 'GET', chemin, options),
    post: <T>(chemin: string, corps?: unknown, options?: OptionsRequete) =>
      requete<T>(module, 'POST', chemin, { ...options, corps }),
    put: <T>(chemin: string, corps?: unknown, options?: OptionsRequete) =>
      requete<T>(module, 'PUT', chemin, { ...options, corps }),
    patch: <T>(chemin: string, corps?: unknown, options?: OptionsRequete) =>
      requete<T>(module, 'PATCH', chemin, { ...options, corps }),
    supprimer: <T = void>(chemin: string, options?: OptionsRequete) =>
      requete<T>(module, 'DELETE', chemin, options),
  };
}
