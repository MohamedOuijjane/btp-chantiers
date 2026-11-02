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
