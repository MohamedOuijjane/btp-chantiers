// Hooks TanStack Query du module Tâches : les pages n'utilisent que ces hooks.
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/api/errors';

import * as api from './api';
import type { Blocage, FiltreTaches, Tache, TacheCreation } from './types';

export const clesTaches = {
  tous: ['taches'] as const,
  liste: (filtre: FiltreTaches = {}) => ['taches', 'liste', filtre] as const,
  detail: (id: number) => ['taches', 'detail', id] as const,
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
