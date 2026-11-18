/**
 * API d'authentification, utilisée par AuthProvider. Selon VITE_API_AUTH (src/api/mode.ts) :
 * - reel   : POST /api/auth/login (JWT émis par Chantiers, vérifié par la gateway, ADR-0006) ;
 * - fictif : comptes de démonstration en mémoire, sans backend.
 *
 * Les identités des comptes de démonstration (e-mail, nom, profil) sont les mêmes dans les
 * deux modes ; seul le mode fictif connaît un mot de passe.
 */
import { estReel } from '@/api/mode';

import * as fictif from './api.fictif';
import * as reel from './api.reel';
import type { Identifiants, Session } from './types';

export { COMPTES_DEMO, MOT_DE_PASSE_DEMO, sessionDemo } from './api.fictif';

export function connecter(identifiants: Identifiants): Promise<Session> {
  return estReel('auth') ? reel.connecter(identifiants) : fictif.connecter(identifiants);
}

export function deconnecter(): Promise<void> {
  return estReel('auth') ? reel.deconnecter() : fictif.deconnecter();
}
