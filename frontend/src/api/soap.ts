/**
 * Client SOAP 1.1 partagé (module Matériaux, ADR-0003), même comportement que http.ts :
 * - POST /ws sur la même origine (la gateway), avec le jeton de la session et un X-Request-Id ;
 * - délai de 10 s, annulation par signal, session expirée sur un 401 ;
 * - réseau coupé, délai dépassé, 502, 503 et 504 de la gateway → ErreurApi 503 ;
 * - SOAP Fault → ErreurApi selon le nom local du faultcode (préfixes ignorés) :
 *   Introuvable → 404, Conflit → 409, Client → 422, Server ou autre → 503 ;
 *   message = faultstring (voir docs/frontend/integration.md).
 * Le XML est lu avec DOMParser (navigateur, jsdom dans les tests) : aucune dépendance.
 */
import { lireSession, signalerSessionExpiree } from '@/features/auth/session';

import { ErreurApi } from './errors';
import {
  DELAI_MS,
  messageIndisponible,
  nouvelIdentifiant,
  versErreurApi,
  type OptionsAppel,
} from './http';

const NS_ENVELOPPE = 'http://schemas.xmlsoap.org/soap/envelope/';

/** Code HTTP de l'ApiError selon le nom local du faultcode. */
const CODES_FAUTE: Record<string, number> = {
  Introuvable: 404,
  Conflit: 409,
  Client: 422,
  Server: 503,
};

/**
 * Contenu d'une requête : l'ordre des clés est celui du XSD (xs:sequence). Les valeurs absentes
 * (undefined, null) ne sont pas envoyées ; un objet devient un élément imbriqué.
 */
export type ChampsSoap = {
  [nom: string]: string | number | boolean | null | undefined | ChampsSoap;
};

export function echapperXml(valeur: string) {
  return valeur
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function elements(champs: ChampsSoap): string {
  return Object.entries(champs)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([nom, v]) =>
      typeof v === 'object'
        ? `<m:${nom}>${elements(v as ChampsSoap)}</m:${nom}>`
        : `<m:${nom}>${echapperXml(String(v))}</m:${nom}>`,
    )
    .join('');
}

/** Enveloppe SOAP 1.1 de l'opération (élément <operation>Request). */
export function enveloppe(ns: string, operation: string, champs: ChampsSoap = {}) {
  return (
    `<soapenv:Envelope xmlns:soapenv="${NS_ENVELOPPE}" xmlns:m="${ns}">` +
    `<soapenv:Body><m:${operation}Request>${elements(champs)}</m:${operation}Request>` +
    `</soapenv:Body></soapenv:Envelope>`
  );
}

/** Enfants directs portant ce nom local, quel que soit le préfixe. */
export function enfants(parent: Element, nom: string): Element[] {
  return Array.from(parent.children).filter((e) => e.localName === nom);
}

/** Texte du premier enfant direct de ce nom local (undefined s'il n'existe pas). */
export function texte(parent: Element, nom: string): string | undefined {
  return enfants(parent, nom)[0]?.textContent ?? undefined;
}

function premier(doc: Document, nom: string): Element | undefined {
  return Array.from(doc.getElementsByTagNameNS('*', nom))[0];
}

function lireXml(contenu: string): Document | undefined {
  if (!contenu.trim()) return undefined;
  const doc = new DOMParser().parseFromString(contenu, 'text/xml');
  return doc.getElementsByTagName('parsererror').length ? undefined : doc;
}

function erreurAnnulation(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('Requête annulée', 'AbortError');
}

/**
 * Appelle une opération SOAP et renvoie l'élément <operation>Response (préfixes ignorés).
 * Lève une ErreurApi pour une SOAP Fault, une erreur HTTP ou une réponse illisible.
 */
export async function appelSoap(
  module: string,
  ns: string,
  operation: string,
  champs: ChampsSoap = {},
  { signal }: OptionsAppel = {},
  delaiMs = DELAI_MS,
): Promise<Element> {
  if (signal?.aborted) throw erreurAnnulation(signal);

  const requestId = nouvelIdentifiant();
  const entetes: Record<string, string> = {
    'Content-Type': 'text/xml; charset=utf-8',
    Accept: 'text/xml',
    'X-Request-Id': requestId,
  };
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
  let contenu: string;
  try {
    reponse = await fetch(new URL('/ws', window.location.origin).toString(), {
      method: 'POST',
      headers: entetes,
      body: enveloppe(ns, operation, champs),
      signal: controleur.signal,
    });
    contenu = await reponse.text();
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

  const idReponse = reponse.headers.get('X-Request-Id') ?? requestId;
  const doc = lireXml(contenu);
  const faute = doc && premier(doc, 'Fault');
  if (faute) {
    const code = (texte(faute, 'faultcode') ?? '').trim();
    const nomLocal = code.split(':').pop() ?? code;
    throw new ErreurApi({
      status: CODES_FAUTE[nomLocal] ?? 503,
      message: (texte(faute, 'faultstring') ?? '').trim() || messageIndisponible(module),
      requestId: idReponse,
    });
  }
  if (!reponse.ok) {
    // Erreur de la gateway (401 en JSON, 502/504…) : même conversion que le client REST.
    if (reponse.status === 401 && jeton) signalerSessionExpiree();
    let corps: unknown = contenu;
    try {
      corps = JSON.parse(contenu);
    } catch {
      // corps texte ou vide
    }
    throw versErreurApi(module, reponse.status, corps, idReponse);
  }
  const resultat = doc && premier(doc, `${operation}Response`);
  if (!resultat) {
    throw new ErreurApi({
      status: 503,
      message: `Réponse illisible du module ${module}.`,
      requestId: idReponse,
    });
  }
  return resultat;
}
