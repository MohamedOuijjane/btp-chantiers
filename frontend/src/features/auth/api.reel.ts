/**
 * Authentification, mode réel (VITE_API_AUTH=reel) : JWT émis par Chantiers, via la gateway
 * (ADR-0006). Le jeton est gardé en sessionStorage par AuthProvider et envoyé par src/api/http.ts.
 */
import { creerClientHttp } from '@/api/http';

import type { Identifiants, Session, Utilisateur } from './types';

const http = creerClientHttp('Authentification');

/** Réponse de POST /api/auth/login. */
type ReponseConnexion = { token: string; utilisateur: Utilisateur };

/**
 * POST /api/auth/login → 200 { token, utilisateur } | 400 | 401 (identifiants incorrects,
 * même message pour un e-mail inconnu) | 429 (trop de tentatives).
 */
export async function connecter({ email, motDePasse }: Identifiants): Promise<Session> {
  const r = await http.post<ReponseConnexion>('/api/auth/login', {
    email: email.trim().toLowerCase(),
    motDePasse,
  });
  return { jeton: r.token, utilisateur: r.utilisateur };
}

/**
 * Le jeton n'est pas révoqué côté serveur (sans état, il expire au bout de 8 h) :
 * la déconnexion efface seulement la session du navigateur (AuthProvider).
 */
export async function deconnecter(): Promise<void> {}
