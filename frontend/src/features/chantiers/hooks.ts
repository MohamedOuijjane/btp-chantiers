// Hooks TanStack Query du module Chantiers : les pages n'utilisent que ces hooks.
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/api/errors';

import * as api from './api';
import type { ChantierCreation, ChantierModification, FiltreChantiers } from './types';

export const clesChantiers = {
  tous: ['chantiers'] as const,
  liste: (filtre: FiltreChantiers = {}) => ['chantiers', 'liste', filtre] as const,
  detail: (id: number) => ['chantiers', 'detail', id] as const,
  avancement: (id: number) => ['chantiers', 'avancement', id] as const,
};

export function useChantiers(filtre: FiltreChantiers = {}) {
  return useQuery({
    queryKey: clesChantiers.liste(filtre),
    queryFn: () => api.listerChantiers(filtre),
  });
}

export function useChantier(id: number, active = true) {
  return useQuery({
    queryKey: clesChantiers.detail(id),
    queryFn: () => api.getChantier(id),
    enabled: active,
  });
}

export function useAvancementChantier(id: number, active = true) {
  return useQuery({
    queryKey: clesChantiers.avancement(id),
    queryFn: () => api.getAvancement(id),
    enabled: active,
  });
}

/** Avancement de plusieurs chantiers (tableau de bord) : une requête par chantier, même cache que la fiche. */
export function useAvancementsChantiers(ids: number[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: clesChantiers.avancement(id),
      queryFn: () => api.getAvancement(id),
    })),
  });
}

export function useCreerChantier() {
  const qc = useQueryClient();
  return useMutation<Awaited<ReturnType<typeof api.creerChantier>>, ApiError, ChantierCreation>({
    mutationFn: api.creerChantier,
    onSuccess: () => qc.invalidateQueries({ queryKey: clesChantiers.tous }),
  });
}

export function useModifierChantier(id: number) {
  const qc = useQueryClient();
  return useMutation<
    Awaited<ReturnType<typeof api.modifierChantier>>,
    ApiError,
    ChantierModification
  >({
    mutationFn: (donnees) => api.modifierChantier(id, donnees),
    onSuccess: () => qc.invalidateQueries({ queryKey: clesChantiers.tous }),
  });
}

export function useCloturerChantier() {
  const qc = useQueryClient();
  return useMutation<Awaited<ReturnType<typeof api.cloturerChantier>>, ApiError, number>({
    mutationFn: api.cloturerChantier,
    onSuccess: () => qc.invalidateQueries({ queryKey: clesChantiers.tous }),
  });
}

export function useSupprimerChantier() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: api.supprimerChantier,
    onSuccess: () => qc.invalidateQueries({ queryKey: clesChantiers.tous }),
  });
}
