import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import * as api from './api';
import { AuthContext, type ValeurAuth } from './contexte';
import { ecrireSession, effacerSession, lireSession } from './session';
import type { Identifiants, Session } from './types';

/**
 * Session de l'utilisateur pour toute l'application.
 * Au branchement d'un vrai service, seul `api.ts` change : ce Provider garde la même interface.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(lireSession);
  const [deconnecte, setDeconnecte] = useState(false);

  const connecter = useCallback(async (identifiants: Identifiants) => {
    const s = await api.connecter(identifiants);
    ecrireSession(s);
    setDeconnecte(false);
    setSession(s);
    return s;
  }, []);

  const deconnecter = useCallback(async () => {
    try {
      await api.deconnecter();
    } finally {
      effacerSession();
      // Les données en cache ne doivent pas rester visibles pour le compte suivant.
      queryClient.clear();
      setDeconnecte(true);
      setSession(null);
    }
  }, [queryClient]);

  const valeur = useMemo<ValeurAuth>(
    () => ({
      utilisateur: session?.utilisateur ?? null,
      jeton: session?.jeton ?? null,
      deconnecte,
      connecter,
      deconnecter,
    }),
    [session, deconnecte, connecter, deconnecter],
  );

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}
