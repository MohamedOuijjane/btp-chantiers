/**
 * API du module Tâches & Avancement : DONNÉES FICTIVES, aucun appel réseau.
 *
 * Endpoints réels à brancher (via la gateway, voir docs/frontend/integration.md) :
 *   GET    /api/taches?chantierId=&ouvrierId=
 *   GET    /api/taches/{id}
 *   POST   /api/taches
 *   PUT    /api/taches/{id}               (cible, à créer)
 *   PATCH  /api/taches/{id}/statut        (cible, à créer)
 *   PATCH  /api/taches/{id}/avancement
 *   PATCH  /api/taches/{id}/ouvriers
 *   PATCH  /api/taches/{id}/blocage       (cible, #11)
 *   GET    /api/taches/{id}/historique    (cible, à créer)
 *   GET    /api/taches/historique?limite= (cible, à créer)
 *   DELETE /api/taches/{id}
 */
import { aujourdHui, base, prochainId } from '@/api/donnees-fictives';
import { conflit, introuvable, invalide, refus } from '@/api/errors';
import { appelFictif, verifierDisponible } from '@/api/simulation';
import type { StatutTache } from '@/components/common/statuts';

import type {
  BesoinMateriau,
  Blocage,
  FiltreTaches,
  Tache,
  TacheCreation,
  TacheModification,
  TransitionStatut,
} from './types';

function trouver(id: number): Tache {
  const tache = base.taches.find((t) => t.id === id);
  if (!tache) throw introuvable(`Tâche ${id} introuvable`);
  return tache;
}

/** RG5 : le statut découle de l'avancement. */
function statutDepuis(avancement: number): StatutTache {
  if (avancement >= 100) return 'TERMINEE';
  return avancement > 0 ? 'EN_COURS' : 'A_FAIRE';
}

/** Change le statut et l'inscrit dans l'historique. */
function definirStatut(tache: Tache, statut: StatutTache, motif?: string) {
  if (tache.statut === statut && !motif) return;
  tache.statut = statut;
  base.historique.push({ tacheId: tache.id, statut, date: aujourdHui(), motif });
}

const chevauche = (a: { dateDebut: string; dateFin: string }, b: typeof a) =>
  a.dateDebut <= b.dateFin && b.dateDebut <= a.dateFin;

function verifierDates(d: { dateDebut: string; dateFin: string }) {
  if (d.dateFin < d.dateDebut) {
    throw invalide('Données invalides', {
      dateFin: 'La date de fin doit être postérieure ou égale à la date de début',
    });
  }
}

/** Le chantier existe et n'est pas clôturé (RG-03) : sinon 404 ou 409. */
function verifierChantier(chantierId: number) {
  verifierDisponible('chantiers');
  const chantier = base.chantiers.find((c) => c.id === chantierId);
  if (!chantier) throw introuvable(`Chantier ${chantierId} introuvable`);
  if (chantier.statut === 'TERMINE') {
    throw conflit(
      `Le chantier « ${chantier.nom} » est clôturé : ses tâches ne peuvent plus changer`,
    );
  }
}

/** Ouvriers existants, disponibles et libres sur la période (RG-04). */
function verifierOuvriers(
  ouvrierIds: number[],
  periode: { dateDebut: string; dateFin: string },
  sauf?: number,
) {
  if (!ouvrierIds.length) return;
  verifierDisponible('ouvriers');
  for (const id of ouvrierIds) {
    const ouvrier = base.ouvriers.find((o) => o.id === id);
    if (!ouvrier) throw introuvable(`Ouvrier ${id} introuvable`);
    const nom = `${ouvrier.prenom} ${ouvrier.nom}`;
    if (!ouvrier.disponible) throw refus(`${nom} n'est pas disponible`);
    const occupe = base.taches.find(
      (t) =>
        t.id !== sauf &&
        t.statut !== 'TERMINEE' &&
        t.ouvrierIds.includes(id) &&
        chevauche(t, periode),
    );
    if (occupe) {
      throw conflit(`${nom} est déjà affecté à « ${occupe.titre} » sur cette période`);
    }
  }
}

/** Stock suffisant pour chaque besoin (appel SOAP VerifierStock côté backend). */
function verifierStock(besoins: BesoinMateriau[]) {
  if (!besoins.length) return;
  verifierDisponible('materiaux');
  for (const b of besoins) {
    const m = base.materiaux.find((x) => x.id === b.materiauId);
    if (!m) throw introuvable(`Matériau ${b.materiauId} introuvable`);
    if (b.quantite > m.stock) {
      throw refus(
        `Stock insuffisant pour ${m.nom} : ${b.quantite} ${m.unite} demandés, ${m.stock} ${m.unite} en stock`,
      );
    }
  }
}

/** Réel : GET /api/taches?chantierId=&ouvrierId= → 200 Tache[] */
export function listerTaches(filtre: FiltreTaches = {}) {
  return appelFictif('taches', () =>
    base.taches.filter(
      (t) =>
        (filtre.chantierId === undefined || t.chantierId === filtre.chantierId) &&
        (filtre.ouvrierId === undefined || t.ouvrierIds.includes(filtre.ouvrierId)),
    ),
  );
}

/** Réel : GET /api/taches/{id} → 200 Tache | 404 */
export function getTache(id: number) {
  return appelFictif('taches', () => trouver(id));
}

/**
 * Réel : POST /api/taches → 201 Tache | 400 | 404 | 409 (chantier clôturé, conflit de planning)
 *        | 422 (ouvrier indisponible, stock insuffisant) | 503 (module injoignable)
 */
export function creerTache(donnees: TacheCreation) {
  return appelFictif('taches', () => {
    verifierDates(donnees);
    verifierChantier(donnees.chantierId);
    const ouvrierIds = donnees.ouvrierIds ?? [];
    const besoinsMateriaux = donnees.besoinsMateriaux ?? [];
    verifierOuvriers(ouvrierIds, donnees);
    verifierStock(besoinsMateriaux);

    const tache: Tache = {
      ...donnees,
      id: prochainId(base.taches),
      ouvrierIds,
      besoinsMateriaux,
      avancement: 0,
      statut: 'A_FAIRE',
      motif: null,
    };
    base.taches.push(tache);
    base.historique.push({ tacheId: tache.id, statut: 'A_FAIRE', date: aujourdHui() });
    return tache;
  });
}

/**
 * Réel (cible, à créer) : PUT /api/taches/{id} → 200 Tache | 400 | 404
 *        | 409 (chantier clôturé, conflit de planning) | 422 | 503
 */
export function modifierTache(id: number, donnees: TacheModification) {
  return appelFictif('taches', () => {
    const tache = trouver(id);
    verifierDates(donnees);
    verifierChantier(tache.chantierId);
    if (donnees.chantierId !== tache.chantierId) verifierChantier(donnees.chantierId);
    const ouvrierIds = donnees.ouvrierIds ?? [];
    const besoinsMateriaux = donnees.besoinsMateriaux ?? [];
    verifierOuvriers(ouvrierIds, donnees, id);
    verifierStock(besoinsMateriaux);
    Object.assign(tache, { ...donnees, ouvrierIds, besoinsMateriaux });
    return tache;
  });
}

/**
 * Réel (cible, à créer) : PATCH /api/taches/{id}/statut { statut } → 200 Tache | 404 | 409
 * Transitions : À faire → En cours, En cours → Terminée (l'avancement passe alors à 100 %).
 * 409 si la transition n'est pas permise (tâche bloquée, déjà terminée) ou si le chantier est clôturé.
 */
export function changerStatut(id: number, statut: TransitionStatut) {
  return appelFictif('taches', () => {
    const tache = trouver(id);
    verifierChantier(tache.chantierId);
    const permis = statut === 'EN_COURS' ? tache.statut === 'A_FAIRE' : tache.statut === 'EN_COURS';
    if (!permis) {
      throw conflit(
        tache.statut === 'BLOQUEE'
          ? 'Débloquez la tâche avant de changer son statut'
          : `Passage impossible de « ${tache.statut} » à « ${statut} »`,
      );
    }
    if (statut === 'TERMINEE') tache.avancement = 100;
    definirStatut(tache, statut);
    return tache;
  });
}

/** Réel : PATCH /api/taches/{id}/avancement { avancement } → 200 Tache | 400 | 404 | 409 (bloquée) */
export function majAvancement(id: number, avancement: number) {
  return appelFictif('taches', () => {
    if (!Number.isInteger(avancement) || avancement < 0 || avancement > 100) {
      throw invalide('Données invalides', { avancement: 'L’avancement doit être entre 0 et 100' });
    }
    const tache = trouver(id);
    if (tache.statut === 'BLOQUEE') {
      throw conflit('Débloquez la tâche avant de modifier son avancement');
    }
    tache.avancement = avancement;
    definirStatut(tache, statutDepuis(avancement));
    return tache;
  });
}

/** Réel : PATCH /api/taches/{id}/ouvriers { ouvrierIds } → 200 Tache | 404 | 409 | 422 */
export function affecterOuvriers(id: number, ouvrierIds: number[]) {
  return appelFictif('taches', () => {
    const tache = trouver(id);
    verifierOuvriers(
      ouvrierIds.filter((o) => !tache.ouvrierIds.includes(o)),
      tache,
      id,
    );
    tache.ouvrierIds = [...ouvrierIds];
    return tache;
  });
}

/**
 * Réel (cible, #11) : PATCH /api/taches/{id}/blocage { bloquee, motif? } → 200 Tache | 400 | 404
 * | 409 (tâche terminée). Au déblocage, le statut est recalculé depuis l'avancement (RG5).
 */
export function bloquerTache(id: number, blocage: Blocage) {
  return appelFictif('taches', () => {
    const tache = trouver(id);
    if (tache.statut === 'TERMINEE') throw conflit('Une tâche terminée ne peut pas être bloquée');
    if (blocage.bloquee) {
      if (!blocage.motif.trim()) {
        throw invalide('Données invalides', { motif: 'Le motif est obligatoire' });
      }
      tache.motif = blocage.motif.trim();
      definirStatut(tache, 'BLOQUEE', tache.motif);
    } else {
      tache.motif = null;
      definirStatut(tache, statutDepuis(tache.avancement));
    }
    return tache;
  });
}

/** Réel (cible, à créer) : GET /api/taches/{id}/historique → 200 ChangementStatut[] (du plus récent au plus ancien) | 404 */
export function getHistorique(id: number) {
  return appelFictif('taches', () => {
    trouver(id);
    // Tri stable : à date égale, le changement enregistré en dernier reste en tête.
    return base.historique
      .filter((h) => h.tacheId === id)
      .reverse()
      .sort((a, b) => b.date.localeCompare(a.date));
  });
}

/**
 * Réel (cible, à créer) : GET /api/taches/historique?limite= → 200 ChangementStatut[]
 * Derniers changements de statut, toutes tâches confondues (tableau de bord).
 */
export function listerHistorique(limite = 10) {
  return appelFictif('taches', () =>
    [...base.historique]
      .reverse()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limite),
  );
}

/** Réel : DELETE /api/taches/{id} → 204 | 404 */
export function supprimerTache(id: number) {
  return appelFictif('taches', () => {
    trouver(id);
    base.taches = base.taches.filter((t) => t.id !== id);
  });
}
