// Hooks TanStack Query du module Ouvriers : les pages n'utilisent que ces hooks.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/api/errors';

import * as api from './api';
import type { FiltreOuvriers, Ouvrier, OuvrierCreation, OuvrierModification } from './types';

export const clesOuvriers = {
  tous: ['ouvriers'] as const,
  liste: (filtre: FiltreOuvriers = {}) => ['ouvriers', 'liste', filtre] as const,
  detail: (id: number) => ['ouvriers', 'detail', id] as const,
  planning: (id: number) => ['ouvriers', 'planning', id] as const,
};

export function useOuvriers(filtre: FiltreOuvriers = {}) {
  return useQuery({
    queryKey: clesOuvriers.liste(filtre),
    queryFn: () => api.listerOuvriers(filtre),
  });
}

export function useOuvrier(id: number) {
  return useQuery({ queryKey: clesOuvriers.detail(id), queryFn: () => api.getOuvrier(id) });
}

export function usePlanning(id: number) {
  return useQuery({ queryKey: clesOuvriers.planning(id), queryFn: () => api.getPlanning(id) });
}

export function useCreerOuvrier() {
  const qc = useQueryClient();
  return useMutation<Ouvrier, ApiError, OuvrierCreation>({
    mutationFn: api.creerOuvrier,
    onSuccess: () => qc.invalidateQueries({ queryKey: clesOuvriers.tous }),
  });
}

export function useModifierOuvrier() {
  const qc = useQueryClient();
  return useMutation<Ouvrier, ApiError, { id: number; donnees: OuvrierModification }>({
    mutationFn: ({ id, donnees }) => api.modifierOuvrier(id, donnees),
    onSuccess: () => qc.invalidateQueries({ queryKey: clesOuvriers.tous }),
  });
}

export function useSupprimerOuvrier() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: api.supprimerOuvrier,
    onSuccess: () => qc.invalidateQueries({ queryKey: clesOuvriers.tous }),
  });
}
