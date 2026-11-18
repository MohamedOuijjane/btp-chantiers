// Droits de chaque profil : sections visibles (menu, routes) et actions autorisées (boutons).
// Côté front, ces droits ne servent qu'à l'affichage : chaque service devra les vérifier aussi.
import type { Role } from './types';

export type Section = 'dashboard' | 'chantiers' | 'taches' | 'ouvriers' | 'materiaux';

export type Action =
  | 'chantiers.ecrire' // créer, modifier, clôturer un chantier
  | 'taches.ecrire' // créer, modifier une tâche, changer son statut
  | 'ouvriers.ecrire' // créer, modifier, supprimer un ouvrier, l'affecter à une tâche
  | 'materiaux.ecrire'; // nouveau matériau, entrée / sortie de stock

type Profil = {
  libelle: string;
  description: string;
  sections: Section[];
  actions: Action[];
  /** Page ouverte après la connexion. */
  accueil: string;
};

export const PROFILS: Record<Role, Profil> = {
  DIRECTION: {
    libelle: 'Direction',
    description: 'Vue d’ensemble et budgets',
    sections: ['dashboard', 'chantiers', 'taches', 'ouvriers', 'materiaux'],
    actions: ['chantiers.ecrire'],
    accueil: '/',
  },
  CONDUCTEUR: {
    libelle: 'Conducteur de travaux',
    description: 'Chantiers et planification',
    sections: ['dashboard', 'chantiers', 'taches', 'ouvriers', 'materiaux'],
    actions: ['chantiers.ecrire', 'taches.ecrire', 'ouvriers.ecrire', 'materiaux.ecrire'],
    accueil: '/',
  },
  CHEF_CHANTIER: {
    libelle: 'Chef de chantier',
    description: 'Avancement et équipes',
    sections: ['dashboard', 'chantiers', 'taches', 'ouvriers'],
    actions: ['taches.ecrire', 'ouvriers.ecrire'],
    accueil: '/',
  },
  MAGASINIER: {
    libelle: 'Magasinier',
    description: 'Stock et mouvements',
    sections: ['dashboard', 'chantiers', 'materiaux'],
    actions: ['materiaux.ecrire'],
    accueil: '/materiaux',
  },
};

export const ROLES = Object.keys(PROFILS) as Role[];

export const peutVoir = (role: Role, section: Section) => PROFILS[role].sections.includes(section);

export const peutFaire = (role: Role, action: Action) => PROFILS[role].actions.includes(action);
