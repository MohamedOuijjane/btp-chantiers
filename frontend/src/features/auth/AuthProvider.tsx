import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as api from './api';
import { AuthContext, type ValeurAuth } from './contexte';
import { ecrireSession, effacerSession, lireSession, surSessionExpiree } from './session';
import type { Identifiants, Session } from './types';

/**
 * Session de l'utilisateur pour toute l'application (mode réel ou fictif selon VITE_API_AUTH).
 * Si une API répond 401 (jeton expiré), la session est fermée et RouteProtegee ramène à
 * /connexion, en gardant la page demandée pour y revenir après la reconnexion.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(lireSession);
  const [deconnecte, setDeconnecte] = useState(false);
  const [sessionExpiree, setSessionExpiree] = useState(false);

  useEffect(
    () =>
      surSessionExpiree(() => {
        // Les données en cache ne doivent pas rester visibles sans session valide.
        queryClient.clear();
        setDeconnecte(false);
        setSessionExpiree(true);
        setSession(null);
      }),
    [queryClient],
  );

  const connecter = useCallback(async (identifiants: Identifiants) => {
    const s = await api.connecter(identifiants);
    ecrireSession(s);
    setDeconnecte(false);
    setSessionExpiree(false);
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
      setSessionExpiree(false);
      setSession(null);
    }
  }, [queryClient]);

  const valeur = useMemo<ValeurAuth>(
    () => ({
      utilisateur: session?.utilisateur ?? null,
      jeton: session?.jeton ?? null,
      deconnecte,
      sessionExpiree,
      connecter,
      deconnecter,
    }),
    [session, deconnecte, sessionExpiree, connecter, deconnecter],
  );

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}
