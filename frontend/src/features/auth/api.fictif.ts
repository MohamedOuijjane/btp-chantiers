/**
 * Authentification, mode fictif (VITE_API_AUTH=fictif) : comptes de démonstration en mémoire,
 * aucun appel réseau. Le mot de passe ci-dessous ne sert qu'à ce mode : en mode réel, il est
 * défini côté serveur par DEMO_MOT_DE_PASSE (.env).
 */
import { ErreurApi } from '@/api/errors';
import { attendre } from '@/api/simulation';

import type { Identifiants, Role, Session, Utilisateur } from './types';

/** Mot de passe commun aux comptes de démonstration. */
export const MOT_DE_PASSE_DEMO = 'chantier2026';

/** Un compte de démonstration par profil (personnes fictives de la maquette). */
export const COMPTES_DEMO: Record<Role, Utilisateur> = {
  DIRECTION: {
    id: 1,
    email: 'nadia.belkadi@souss-batiment.demo',
    nom: 'Nadia Belkadi',
    initiales: 'NB',
    role: 'DIRECTION',
  },
  CONDUCTEUR: {
    id: 2,
    email: 'samir.haddou@souss-batiment.demo',
    nom: 'Samir Haddou',
    initiales: 'SH',
    role: 'CONDUCTEUR',
  },
  CHEF_CHANTIER: {
    id: 3,
    email: 'karim.aitali@souss-batiment.demo',
    nom: 'Karim Aït Ali',
    initiales: 'KA',
    role: 'CHEF_CHANTIER',
  },
  MAGASINIER: {
    id: 4,
    email: 'fatima.idrissi@souss-batiment.demo',
    nom: 'Fatima Zahra Idrissi',
    initiales: 'FI',
    role: 'MAGASINIER',
  },
};

/** Session d'un compte de démonstration (tests, captures). */
export function sessionDemo(role: Role): Session {
  return { utilisateur: COMPTES_DEMO[role], jeton: `fictif-${role.toLowerCase()}` };
}

/** Un message unique pour un e-mail inconnu ou un mauvais mot de passe (ne pas révéler les comptes). */
export async function connecter({ email, motDePasse }: Identifiants): Promise<Session> {
  await attendre();
  const compte = Object.values(COMPTES_DEMO).find((c) => c.email === email.trim().toLowerCase());
  if (!compte || motDePasse !== MOT_DE_PASSE_DEMO) {
    throw new ErreurApi({ status: 401, message: 'Adresse e-mail ou mot de passe incorrect.' });
  }
  return sessionDemo(compte.role);
}

/** Rien à faire côté serveur : la session du navigateur est effacée par AuthProvider. */
export async function deconnecter(): Promise<void> {
  await attendre(0);
}
