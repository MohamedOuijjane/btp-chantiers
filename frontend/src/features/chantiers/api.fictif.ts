/**
 * Module Chantiers, mode fictif (VITE_API_CHANTIERS=fictif) : données en mémoire, aucun appel
 * réseau. Utilisé par les tests de pages et pour une démo sans backend. Les fonctions reproduisent
 * le comportement de l'API réelle (api.reel.ts), codes d'erreur compris.
 */
import { base, prochainId } from '@/api/donnees-fictives';
import { conflit, introuvable, invalide } from '@/api/errors';
import { appelFictif, estEnPanne } from '@/api/simulation';

import type {
  AvancementChantier,
  Chantier,
  ChantierCreation,
  ChantierModification,
  FiltreChantiers,
} from './types';

function trouver(id: number): Chantier {
  const chantier = base.chantiers.find((c) => c.id === id);
  if (!chantier) throw introuvable(`Chantier ${id} introuvable`);
  return chantier;
}

function verifierPeriode(c: ChantierCreation) {
  if (c.dateFinPrevue < c.dateDebut) {
    throw invalide('Données invalides', {
      dateFinPrevue: 'La date de fin doit être postérieure ou égale à la date de début',
    });
  }
}

/** Réel : GET /api/chantiers?statut={statut} → 200 Chantier[] */
export function listerChantiers(filtre: FiltreChantiers = {}) {
  return appelFictif('chantiers', () =>
    base.chantiers.filter((c) => !filtre.statut || c.statut === filtre.statut),
  );
}

/** Réel : GET /api/chantiers/{id} → 200 Chantier | 404 */
export function getChantier(id: number) {
  return appelFictif('chantiers', () => trouver(id));
}

/** Réel : POST /api/chantiers → 201 Chantier | 400 (RG-01). Toujours créé au statut PLANIFIE. */
export function creerChantier(donnees: ChantierCreation) {
  return appelFictif('chantiers', () => {
    verifierPeriode(donnees);
    const chantier: Chantier = { ...donnees, id: prochainId(base.chantiers), statut: 'PLANIFIE' };
    base.chantiers.push(chantier);
    return chantier;
  });
}

/** Réel : PUT /api/chantiers/{id} → 200 Chantier | 400 | 404 | 409 (chantier terminé, RG-02) */
export function modifierChantier(id: number, donnees: ChantierModification) {
  return appelFictif('chantiers', () => {
    const chantier = trouver(id);
    if (chantier.statut === 'TERMINE') {
      throw conflit('Un chantier terminé ne peut plus être modifié');
    }
    if ((donnees.statut as string | undefined) === 'TERMINE') {
      throw conflit('Utilisez la clôture pour terminer un chantier');
    }
    verifierPeriode(donnees);
    Object.assign(chantier, donnees, { statut: donnees.statut ?? chantier.statut });
    return chantier;
  });
}

/** Réel : PATCH /api/chantiers/{id}/cloture → 200 Chantier | 404 | 409 (déjà terminé) */
export function cloturerChantier(id: number) {
  return appelFictif('chantiers', () => {
    const chantier = trouver(id);
    if (chantier.statut === 'TERMINE') throw conflit('Ce chantier est déjà terminé');
    chantier.statut = 'TERMINE';
    return chantier;
  });
}

/** Réel : DELETE /api/chantiers/{id} → 204 | 404 | 409 (le chantier a des tâches, #5) */
export function supprimerChantier(id: number) {
  return appelFictif('chantiers', () => {
    trouver(id);
    if (base.taches.some((t) => t.chantierId === id)) {
      throw conflit('Impossible de supprimer un chantier qui a des tâches');
    }
    base.chantiers = base.chantiers.filter((c) => c.id !== id);
  });
}

/**
 * Réel : GET /api/chantiers/{id}/avancement → 200 AvancementChantier | 404
 * Si Tâches ne répond pas : 200 avec sourceDisponible = false (mode dégradé).
 */
export function getAvancement(id: number) {
  return appelFictif('chantiers', (): AvancementChantier => {
    trouver(id);
    if (estEnPanne('taches')) {
      return { chantierId: id, nombreTaches: 0, avancementGlobal: null, sourceDisponible: false };
    }
    const taches = base.taches.filter((t) => t.chantierId === id);
    const somme = taches.reduce((s, t) => s + t.avancement, 0);
    return {
      chantierId: id,
      nombreTaches: taches.length,
      avancementGlobal: taches.length ? Math.round(somme / taches.length) : 0,
      sourceDisponible: true,
    };
  });
}
