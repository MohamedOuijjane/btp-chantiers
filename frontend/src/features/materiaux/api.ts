/**
 * API du module Matériaux : DONNÉES FICTIVES, aucun appel réseau.
 *
 * Opérations SOAP réelles à brancher (POST /ws via la gateway, namespace
 * http://btp.uiz.ma/materiaux, voir docs/frontend/integration.md) :
 *   ListerMateriaux(enAlerteSeulement?)
 *   GetMateriau(id)
 *   AjouterMateriau(materiau)
 *   VerifierStock(materiauId, quantite)
 *   EnregistrerMouvement(materiauId, chantierId, type, quantite)
 *   ListerMouvements(chantierId?, materiauId?)   (cible, #18)
 *
 * Erreurs simulées comme les SOAP Faults converties (voir integration.md) :
 *   faultcode Introuvable → 404, Conflit → 409, Client → 422, Server ou module injoignable → 503.
 */
import { aujourdHui, base, prochainId } from '@/api/donnees-fictives';
import { conflit, introuvable, refus } from '@/api/errors';
import { appelFictif, verifierDisponible } from '@/api/simulation';

import type {
  FiltreMouvements,
  Materiau,
  MateriauCreation,
  MouvementCreation,
  ResultatMouvement,
  VerificationStock,
} from './types';

function trouver(id: number): Materiau {
  const materiau = base.materiaux.find((m) => m.id === id);
  if (!materiau) throw introuvable(`Matériau ${id} introuvable`);
  return materiau;
}

/** RG-08 : alerte quand le stock est inférieur ou égal au seuil. */
const enAlerte = (m: Pick<Materiau, 'stock' | 'seuilAlerte'>) => m.stock <= m.seuilAlerte;

/** Réel : SOAP ListerMateriaux { enAlerteSeulement? } → materiau* */
export function listerMateriaux(enAlerteSeulement = false) {
  return appelFictif('materiaux', () =>
    base.materiaux.filter((m) => !enAlerteSeulement || m.enAlerte),
  );
}

/** Réel : SOAP GetMateriau { id } → materiau | Fault Introuvable (→ 404) */
export function getMateriau(id: number) {
  return appelFictif('materiaux', () => trouver(id));
}

/**
 * Réel : SOAP AjouterMateriau { materiau } → materiau (avec id)
 *        | Fault Client (→ 422) : validation XSD | Fault Conflit (→ 409) : référence déjà utilisée.
 */
export function ajouterMateriau(donnees: MateriauCreation) {
  return appelFictif('materiaux', () => {
    if (!donnees.reference.trim() || !donnees.nom.trim() || !donnees.unite.trim()) {
      throw refus('Référence, nom et unité sont obligatoires');
    }
    if (donnees.stock < 0 || donnees.seuilAlerte < 0) {
      throw refus('Le stock et le seuil doivent être positifs ou nuls');
    }
    const reference = donnees.reference.trim().toUpperCase();
    if (base.materiaux.some((m) => m.reference === reference)) {
      throw conflit(`La référence ${reference} est déjà utilisée`);
    }
    const materiau: Materiau = {
      ...donnees,
      reference,
      id: prochainId(base.materiaux),
      enAlerte: enAlerte(donnees),
    };
    base.materiaux.push(materiau);
    return materiau;
  });
}

/** Réel : SOAP VerifierStock { materiauId, quantite } → { disponible, stockActuel } */
export function verifierStock(materiauId: number, quantite: number) {
  return appelFictif('materiaux', (): VerificationStock => {
    const m = trouver(materiauId);
    return { disponible: quantite <= m.stock, stockActuel: m.stock };
  });
}

/**
 * Réel : SOAP EnregistrerMouvement { materiauId, chantierId, type, quantite }
 *        → { mouvementId, stockApres, enAlerte }
 *        | Fault Introuvable (→ 404) : matériau ou chantier inexistant
 *        | Fault Conflit (→ 409) : chantier clôturé (RG-09)
 *        | Fault Client (→ 422) : stock insuffisant (RG-07), quantité invalide
 *        | Fault Server ou Chantiers injoignable (→ 503)
 */
export function enregistrerMouvement(donnees: MouvementCreation) {
  return appelFictif('materiaux', (): ResultatMouvement => {
    if (!(donnees.quantite > 0)) throw refus('La quantité doit être positive');
    const m = trouver(donnees.materiauId);
    verifierDisponible('chantiers');
    const chantier = base.chantiers.find((c) => c.id === donnees.chantierId);
    if (!chantier) throw introuvable(`Chantier ${donnees.chantierId} introuvable`);
    if (chantier.statut === 'TERMINE') {
      throw conflit(
        `Le chantier « ${chantier.nom} » est clôturé : aucun mouvement de stock possible`,
      );
    }
    if (donnees.type === 'SORTIE' && donnees.quantite > m.stock) {
      throw refus(
        `Stock insuffisant pour ${m.nom} : ${donnees.quantite} ${m.unite} demandés, ${m.stock} ${m.unite} disponibles`,
      );
    }
    m.stock = donnees.type === 'ENTREE' ? m.stock + donnees.quantite : m.stock - donnees.quantite;
    m.stock = Math.round(m.stock * 1000) / 1000;
    m.enAlerte = enAlerte(m);
    const mouvementId = prochainId(base.mouvements);
    base.mouvements.push({ ...donnees, id: mouvementId, date: aujourdHui() });
    return { mouvementId, stockApres: m.stock, enAlerte: m.enAlerte };
  });
}

/** Réel (cible, #18) : SOAP ListerMouvements { chantierId?, materiauId? } → mouvement*, du plus récent au plus ancien */
export function listerMouvements(filtre: FiltreMouvements = {}) {
  return appelFictif('materiaux', () =>
    base.mouvements
      .filter(
        (mv) =>
          (filtre.chantierId === undefined || mv.chantierId === filtre.chantierId) &&
          (filtre.materiauId === undefined || mv.materiauId === filtre.materiauId),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
  );
}
