import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { useAvancementChantier, useChantiers } from './chantiers/hooks';
import { usePlanning } from './ouvriers/hooks';
import { useMajAvancement } from './taches/hooks';

function enveloppe() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('Hooks TanStack Query', () => {
  it('useChantiers renvoie les chantiers fictifs', async () => {
    const { result } = renderHook(() => useChantiers({ statut: 'EN_COURS' }), {
      wrapper: enveloppe(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((c) => c.nom)).toEqual([
      'Résidence Al Amal',
      'Groupe scolaire Anza',
      'Immeuble Les Dunes',
    ]);
  });

  it('une mise à jour d’avancement rafraîchit l’avancement du chantier', async () => {
    const wrapper = enveloppe();
    const { result } = renderHook(
      () => ({ avancement: useAvancementChantier(1), maj: useMajAvancement() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.avancement.data?.avancementGlobal).toBe(56));

    // « Installation électrique » (tâche 6) passe de 0 à 60 % : (100+100+70+40+25+60) / 6 = 66 %.
    await act(() => result.current.maj.mutateAsync({ id: 6, avancement: 60 }));
    await waitFor(() => expect(result.current.avancement.data?.avancementGlobal).toBe(66));
  });

  it('usePlanning expose l’erreur 404 d’un ouvrier inconnu', async () => {
    const { result } = renderHook(() => usePlanning(99), { wrapper: enveloppe() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ status: 404 });
  });
});
