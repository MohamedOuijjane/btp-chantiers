import { createContext, useContext } from 'react';

import { peutFaire, peutVoir, type Action, type Section } from './permissions';
import type { Identifiants, Session, Utilisateur } from './types';

export type ValeurAuth = {
  utilisateur: Utilisateur | null;
  /** Jeton envoyé dans l'en-tête Authorization par src/api/http.ts. */
  jeton: string | null;
  /** Vrai juste après un clic sur « Déconnexion » (pas de retour à la page quittée). */
  deconnecte: boolean;
  /** Vrai quand une API a répondu 401 : la page de connexion affiche « Session expirée ». */
  sessionExpiree: boolean;
  connecter: (identifiants: Identifiants) => Promise<Session>;
  deconnecter: () => Promise<void>;
};

export const AuthContext = createContext<ValeurAuth | null>(null);

/** Utilisateur connecté et actions de connexion ; à utiliser sous <AuthProvider>. */
export function useAuth(): ValeurAuth {
  const valeur = useContext(AuthContext);
  if (!valeur) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return valeur;
}

/** Droits du profil connecté : `peut('chantiers.ecrire')`, `voit('materiaux')`. */
export function useDroits() {
  const { utilisateur } = useAuth();
  return {
    peut: (action: Action) => Boolean(utilisateur && peutFaire(utilisateur.role, action)),
    voit: (section: Section) => Boolean(utilisateur && peutVoir(utilisateur.role, section)),
  };
}
