/**
 * Outils des fonctions fictives de api.ts : latence et pannes simulées.
 * Ce fichier disparaîtra quand tous les modules seront branchés sur leur API.
 */
import { indisponible } from './errors';

export type ModuleBackend = 'chantiers' | 'taches' | 'ouvriers' | 'materiaux';

const NOMS: Record<ModuleBackend, string> = {
  chantiers: 'Chantiers',
  taches: 'Tâches',
  ouvriers: 'Ouvriers',
  materiaux: 'Matériaux',
};

/** Latence simulée d'un appel (300 ms ; immédiat pendant les tests). */
export const LATENCE_MS = import.meta.env.MODE === 'test' ? 0 : 300;

export function attendre(ms = LATENCE_MS) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

const enPanne = new Set<ModuleBackend>();

/** Simule l'arrêt d'un module (bouton « Simuler panne » de la maquette, tests). */
export function simulerPanne(module: ModuleBackend, active = true) {
  if (active) enPanne.add(module);
  else enPanne.delete(module);
}

export function estEnPanne(module: ModuleBackend) {
  return enPanne.has(module);
}

/**
 * Démo : `?panne=taches` (ou `?panne=taches,ouvriers`) dans l'URL de chargement simule l'arrêt
 * de ces modules, pour montrer le mode dégradé (comme le bouton « Simuler panne » de la maquette).
 */
export function pannesDepuisUrl(recherche: string) {
  const modules = new URLSearchParams(recherche).get('panne')?.split(',') ?? [];
  for (const m of modules) {
    if (m in NOMS) simulerPanne(m as ModuleBackend);
  }
}

export function reinitialiserPannes() {
  enPanne.clear();
}

/** Lève un 503 si le module est « en panne ». */
export function verifierDisponible(module: ModuleBackend) {
  if (enPanne.has(module)) throw indisponible(NOMS[module]);
}

/**
 * Exécute une fonction fictive comme un appel réseau : latence, 503 si le module est en panne,
 * copie du résultat (la page ne peut pas modifier la base fictive par erreur).
 */
export async function appelFictif<T>(module: ModuleBackend, traitement: () => T): Promise<T> {
  await attendre();
  verifierDisponible(module);
  return copie(traitement());
}

export function copie<T>(valeur: T): T {
  return valeur === undefined ? valeur : (JSON.parse(JSON.stringify(valeur)) as T);
}
