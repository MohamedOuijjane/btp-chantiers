// Session du navigateur : sessionStorage (fermée avec l'onglet). Le stockage peut être
// indisponible (navigation privée, stockage bloqué) : chaque accès est protégé.
import type { Session } from './types';

export const CLE_SESSION = 'btp-session';

export function lireSession(): Session | null {
  try {
    const brut = sessionStorage.getItem(CLE_SESSION);
    if (!brut) return null;
    const s = JSON.parse(brut) as Session;
    return s?.utilisateur?.role && s.jeton ? s : null;
  } catch {
    return null;
  }
}

export function ecrireSession(session: Session) {
  try {
    sessionStorage.setItem(CLE_SESSION, JSON.stringify(session));
  } catch {
    // stockage indisponible : la session ne vaut que pour cette page
  }
}

export function effacerSession() {
  try {
    sessionStorage.removeItem(CLE_SESSION);
  } catch {
    // rien à effacer
  }
}

// Session expirée : src/api/http.ts reçoit un 401 alors qu'il a envoyé un jeton. Il n'est pas un
// composant React : il prévient AuthProvider par cet abonnement, qui ramène à /connexion.
type Ecouteur = () => void;
const ecouteurs = new Set<Ecouteur>();

/** Abonnement à l'expiration de la session ; renvoie la fonction de désabonnement. */
export function surSessionExpiree(ecouteur: Ecouteur): () => void {
  ecouteurs.add(ecouteur);
  return () => {
    ecouteurs.delete(ecouteur);
  };
}

/** Efface la session et prévient les abonnés (AuthProvider). */
export function signalerSessionExpiree() {
  effacerSession();
  for (const ecouteur of [...ecouteurs]) ecouteur();
}
