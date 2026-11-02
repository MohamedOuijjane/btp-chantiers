// Hooks TanStack Query du module Tâches : les pages n'utilisent que ces hooks.
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/api/errors';
import { useOuvriers } from '@/features/ouvriers/hooks';
import type { Ouvrier } from '@/features/ouvriers/types';

import * as api from './api';
import type {
  Blocage,
  FiltreTaches,
  Tache,
  TacheCreation,
  TacheModification,
  TransitionStatut,
} from './types';

export const clesTaches = {
  tous: ['taches'] as const,
  liste: (filtre: FiltreTaches = {}) => ['taches', 'liste', filtre] as const,
  detail: (id: number) => ['taches', 'detail', id] as const,
  historique: (id: number) => ['taches', 'historique', id] as const,
};

/** Une tâche modifiée change l'avancement des chantiers et le planning des ouvriers. */
function rafraichir(qc: QueryClient) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: clesTaches.tous }),
    qc.invalidateQueries({ queryKey: ['chantiers', 'avancement'] }),
    qc.invalidateQueries({ queryKey: ['ouvriers', 'planning'] }),
  ]);
}

export function useTaches(filtre: FiltreTaches = {}) {
  return useQuery({ queryKey: clesTaches.liste(filtre), queryFn: () => api.listerTaches(filtre) });
}

export function useTache(id: number) {
  return useQuery({ queryKey: clesTaches.detail(id), queryFn: () => api.getTache(id) });
}

export function useHistorique(id: number) {
  return useQuery({ queryKey: clesTaches.historique(id), queryFn: () => api.getHistorique(id) });
}

/**
 * Ouvriers des tâches (noms, spécialités), lus dans le module Ouvriers.
 * Si Ouvriers ne répond pas (503) : sourceDisponible = false, la tâche reste affichée (mode dégradé).
 */
export function useOuvriersTaches() {
  const requete = useOuvriers();
  const parId = new Map<number, Ouvrier>((requete.data ?? []).map((o) => [o.id, o]));
  return {
    parId,
    ouvriers: requete.data,
    chargement: requete.isPending,
    sourceDisponible: requete.error?.status !== 503,
    erreur: requete.error,
  };
}

export function useCreerTache() {
  const qc = useQueryClient();
  return useMutation<Tache, ApiError, TacheCreation>({
    mutationFn: api.creerTache,
    onSuccess: () => rafraichir(qc),
  });
}

export function useMajAvancement() {
  const qc = useQueryClient();
  return useMutation<Tache, ApiError, { id: number; avancement: number }>({
    mutationFn: ({ id, avancement }) => api.majAvancement(id, avancement),
    onSuccess: () => rafraichir(qc),
  });
}

export function useAffecterOuvriers() {
  const qc = useQueryClient();
  return useMutation<Tache, ApiError, { id: number; ouvrierIds: number[] }>({
    mutationFn: ({ id, ouvrierIds }) => api.affecterOuvriers(id, ouvrierIds),
    onSuccess: () => rafraichir(qc),
  });
}

export function useBloquerTache() {
  const qc = useQueryClient();
  return useMutation<Tache, ApiError, { id: number; blocage: Blocage }>({
    mutationFn: ({ id, blocage }) => api.bloquerTache(id, blocage),
    onSuccess: () => rafraichir(qc),
  });
}

export function useSupprimerTache() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: api.supprimerTache,
    onSuccess: () => rafraichir(qc),
  });
}

export function useModifierTache(id: number) {
  const qc = useQueryClient();
  return useMutation<Tache, ApiError, TacheModification>({
    mutationFn: (donnees) => api.modifierTache(id, donnees),
    onSuccess: () => rafraichir(qc),
  });
}

/** À faire → En cours → Terminée (depuis la liste ou la fiche). */
export function useChangerStatut() {
  const qc = useQueryClient();
  return useMutation<Tache, ApiError, { id: number; statut: TransitionStatut }>({
    mutationFn: ({ id, statut }) => api.changerStatut(id, statut),
    onSuccess: () => rafraichir(qc),
  });
}
