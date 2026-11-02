// Hooks TanStack Query du module Matériaux : les pages n'utilisent que ces hooks.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/api/errors';

import * as api from './api';
import type {
  FiltreMouvements,
  Materiau,
  MateriauCreation,
  MouvementCreation,
  ResultatMouvement,
} from './types';

export const clesMateriaux = {
  tous: ['materiaux'] as const,
  liste: (enAlerteSeulement = false) => ['materiaux', 'liste', { enAlerteSeulement }] as const,
  detail: (id: number) => ['materiaux', 'detail', id] as const,
  mouvements: (filtre: FiltreMouvements = {}) => ['materiaux', 'mouvements', filtre] as const,
};

export function useMateriaux(enAlerteSeulement = false) {
  return useQuery({
    queryKey: clesMateriaux.liste(enAlerteSeulement),
    queryFn: () => api.listerMateriaux(enAlerteSeulement),
  });
}

export function useMateriau(id: number) {
  return useQuery({ queryKey: clesMateriaux.detail(id), queryFn: () => api.getMateriau(id) });
}

export function useMouvements(filtre: FiltreMouvements = {}) {
  return useQuery({
    queryKey: clesMateriaux.mouvements(filtre),
    queryFn: () => api.listerMouvements(filtre),
  });
}

/** Vérification ponctuelle du stock (formulaire de nouvelle tâche). */
export function useVerifierStock() {
  return useMutation<
    Awaited<ReturnType<typeof api.verifierStock>>,
    ApiError,
    { materiauId: number; quantite: number }
  >({
    mutationFn: ({ materiauId, quantite }) => api.verifierStock(materiauId, quantite),
  });
}

export function useAjouterMateriau() {
  const qc = useQueryClient();
  return useMutation<Materiau, ApiError, MateriauCreation>({
    mutationFn: api.ajouterMateriau,
    onSuccess: () => qc.invalidateQueries({ queryKey: clesMateriaux.tous }),
  });
}

export function useEnregistrerMouvement() {
  const qc = useQueryClient();
  return useMutation<ResultatMouvement, ApiError, MouvementCreation>({
    mutationFn: api.enregistrerMouvement,
    onSuccess: () => qc.invalidateQueries({ queryKey: clesMateriaux.tous }),
  });
}
