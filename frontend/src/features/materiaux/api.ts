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
 */
import { aujourdHui, base, prochainId } from '@/api/donnees-fictives';
import { conflit, introuvable, invalide, refus } from '@/api/errors';
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

/** Réel : SOAP GetMateriau { id } → materiau | SOAP Fault (introuvable) */
export function getMateriau(id: number) {
  return appelFictif('materiaux', () => trouver(id));
}

/** Réel : SOAP AjouterMateriau { materiau } → materiau (avec id) | SOAP Fault Client */
export function ajouterMateriau(donnees: MateriauCreation) {
  return appelFictif('materiaux', () => {
    if (donnees.stock < 0 || donnees.seuilAlerte < 0) {
      throw invalide('Données invalides', { stock: 'Le stock et le seuil doivent être positifs' });
    }
    if (base.materiaux.some((m) => m.reference === donnees.reference)) {
      throw conflit(`La référence ${donnees.reference} existe déjà`);
    }
    const materiau: Materiau = {
      ...donnees,
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
 *        → { mouvementId, stockApres, enAlerte } | SOAP Fault Client (→ 422) :
 *        stock insuffisant (RG-07), chantier inexistant ou terminé (RG-09).
 */
export function enregistrerMouvement(donnees: MouvementCreation) {
  return appelFictif('materiaux', (): ResultatMouvement => {
    if (donnees.quantite <= 0) {
      throw invalide('Données invalides', { quantite: 'La quantité doit être positive' });
    }
    const m = trouver(donnees.materiauId);
    verifierDisponible('chantiers');
    const chantier = base.chantiers.find((c) => c.id === donnees.chantierId);
    if (!chantier) throw refus(`Chantier ${donnees.chantierId} inexistant`);
    if (chantier.statut === 'TERMINE') {
      throw refus(`Le chantier « ${chantier.nom} » est terminé`);
    }
    if (donnees.type === 'SORTIE' && donnees.quantite > m.stock) {
      throw refus(`Stock insuffisant pour ${m.nom} : ${m.stock} ${m.unite} disponibles`);
    }
    m.stock = donnees.type === 'ENTREE' ? m.stock + donnees.quantite : m.stock - donnees.quantite;
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
