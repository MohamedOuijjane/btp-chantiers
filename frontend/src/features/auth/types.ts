// Types de l'authentification (cible : JWT émis par un service d'authentification).

/** Profils de la maquette (écran 1). */
export type Role = 'DIRECTION' | 'CONDUCTEUR' | 'CHEF_CHANTIER' | 'MAGASINIER';

export type Utilisateur = {
  id: number;
  email: string;
  nom: string;
  initiales: string;
  role: Role;
};

/** Réponse de POST /api/auth/login (cible) et contenu de la session du navigateur. */
export type Session = {
  utilisateur: Utilisateur;
  /** Jeton d'accès ; fictif pour l'instant, JWT au branchement. */
  jeton: string;
};

export type Identifiants = { email: string; motDePasse: string };
