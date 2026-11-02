import type { ReactNode } from 'react';
import { Navigate, useLocation, type Location } from 'react-router-dom';

import { useAuth } from '../contexte';

/** État transmis à /connexion : la page demandée, pour y revenir après la connexion. */
export type EtatConnexion = { depuis?: Pick<Location, 'pathname' | 'search' | 'hash'> };

/** Redirige vers /connexion tant que personne n'est connecté. */
export function RouteProtegee({ children }: { children: ReactNode }) {
  const { utilisateur, deconnecte } = useAuth();
  const location = useLocation();

  if (!utilisateur) {
    // Après une déconnexion volontaire, on ne propose pas de revenir à la page quittée.
    const etat: EtatConnexion | undefined = deconnecte
      ? undefined
      : { depuis: { pathname: location.pathname, search: location.search, hash: location.hash } };
    return <Navigate to="/connexion" replace state={etat} />;
  }
  return <>{children}</>;
}
