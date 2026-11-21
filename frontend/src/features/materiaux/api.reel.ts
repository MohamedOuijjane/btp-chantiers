/**
 * Module Matériaux, mode réel (VITE_API_MATERIAUX=reel) : web service SOAP de Matériaux
 * (Spring-WS) via la gateway (POST /ws), avec src/api/soap.ts. Les SOAP Faults deviennent des
 * ErreurApi : Introuvable → 404, Conflit → 409, Client → 422 (stock insuffisant, chantier
 * terminé, valeur invalide), Server → 503 (Chantiers injoignable).
 */
import { ErreurApi } from '@/api/errors';
import type { OptionsAppel } from '@/api/http';
import { appelSoap, enfants, texte } from '@/api/soap';

import type {
  FiltreMouvements,
  Materiau,
  MateriauCreation,
  Mouvement,
  MouvementCreation,
  ResultatMouvement,
  TypeMouvement,
  VerificationStock,
} from './types';

const NS = 'http://btp.uiz.ma/materiaux';
const appeler = (operation: string, champs = {}, options: OptionsAppel = {}) =>
  appelSoap('Matériaux', NS, operation, champs, options);

const nombre = (el: Element, nom: string) => Number(texte(el, nom));

function versMateriau(el: Element): Materiau {
  return {
    id: nombre(el, 'id'),
    reference: texte(el, 'reference') ?? '',
    nom: texte(el, 'nom') ?? '',
    unite: texte(el, 'unite') ?? '',
    stock: nombre(el, 'stock'),
    seuilAlerte: nombre(el, 'seuilAlerte'),
    enAlerte: texte(el, 'enAlerte') === 'true',
  };
}

/** Matériau unique d'une réponse (GetMateriau, AjouterMateriau) ; absent : réponse illisible. */
function materiauDe(reponse: Element): Materiau {
  const el = enfants(reponse, 'materiau')[0];
  if (!el) {
    throw new ErreurApi({ status: 503, message: 'Réponse illisible du module Matériaux.' });
  }
  return versMateriau(el);
}

function versMouvement(el: Element): Mouvement {
  return {
    id: nombre(el, 'id'),
    // xs:dateTime (UTC) : l'affichage n'en garde que le jour.
    date: texte(el, 'date') ?? '',
    materiauId: nombre(el, 'materiauId'),
    chantierId: nombre(el, 'chantierId'),
    type: texte(el, 'type') as TypeMouvement,
    quantite: nombre(el, 'quantite'),
  };
}

/** SOAP ListerMateriaux { enAlerteSeulement? } → materiau* */
export async function listerMateriaux(enAlerteSeulement = false, options: OptionsAppel = {}) {
  const r = await appeler('ListerMateriaux', { enAlerteSeulement }, options);
  return enfants(r, 'materiau').map(versMateriau);
}

/** SOAP GetMateriau { id } → materiau | Fault Introuvable (404) */
export async function getMateriau(id: number, options: OptionsAppel = {}) {
  const r = await appeler('GetMateriau', { id }, options);
  return materiauDe(r);
}

/**
 * SOAP AjouterMateriau { materiau } → materiau (avec id) | Fault Conflit (409) : référence déjà
 * utilisée | Fault Client (422) : valeur invalide
 */
export async function ajouterMateriau(donnees: MateriauCreation) {
  const r = await appeler('AjouterMateriau', {
    materiau: {
      reference: donnees.reference,
      nom: donnees.nom,
      unite: donnees.unite,
      stock: donnees.stock,
      seuilAlerte: donnees.seuilAlerte,
    },
  });
  return materiauDe(r);
}

/** SOAP VerifierStock { materiauId, quantite } → { disponible, stockActuel } | Fault Introuvable */
export async function verifierStock(
  materiauId: number,
  quantite: number,
): Promise<VerificationStock> {
  const r = await appeler('VerifierStock', { materiauId, quantite });
  return { disponible: texte(r, 'disponible') === 'true', stockActuel: nombre(r, 'stockActuel') };
}

/**
 * SOAP EnregistrerMouvement { materiauId, chantierId, type, quantite }
 * → { mouvementId, stockApres, enAlerte } | Fault Introuvable (404) : matériau ou chantier inconnu
 * | Fault Conflit (409) : stock modifié en même temps | Fault Client (422) : stock insuffisant,
 * chantier terminé | Fault Server (503) : Chantiers injoignable
 */
export async function enregistrerMouvement(donnees: MouvementCreation): Promise<ResultatMouvement> {
  const r = await appeler('EnregistrerMouvement', {
    materiauId: donnees.materiauId,
    chantierId: donnees.chantierId,
    type: donnees.type,
    quantite: donnees.quantite,
  });
  return {
    mouvementId: nombre(r, 'mouvementId'),
    stockApres: nombre(r, 'stockApres'),
    enAlerte: texte(r, 'enAlerte') === 'true',
  };
}

/** SOAP ListerMouvements { chantierId?, materiauId? } → mouvement*, du plus récent au plus ancien (#18) */
export async function listerMouvements(filtre: FiltreMouvements = {}, options: OptionsAppel = {}) {
  const r = await appeler(
    'ListerMouvements',
    { chantierId: filtre.chantierId, materiauId: filtre.materiauId },
    options,
  );
  return enfants(r, 'mouvement').map(versMouvement);
}
