/**
 * Mode de chaque module : données fictives ou API réelle, pour brancher les modules un par un
 * sans casser les pages des autres.
 *
 *   VITE_API_MODE=fictif|reel        valeur par défaut de tous les modules (fictif si absente)
 *   VITE_API_CHANTIERS=fictif|reel   (idem : VITE_API_TACHES, VITE_API_OUVRIERS, VITE_API_MATERIAUX)
 *
 * Les valeurs viennent de frontend/.env.development et .env.production (ou de l'environnement
 * au moment du build). Les tests restent en fictif, sauf ceux qui changent la variable
 * avec vi.stubEnv.
 */
export type ModuleApi = 'chantiers' | 'taches' | 'ouvriers' | 'materiaux' | 'auth';
export type ModeApi = 'fictif' | 'reel';

function lire(valeur: unknown): ModeApi | undefined {
  return valeur === 'reel' || valeur === 'fictif' ? valeur : undefined;
}

/** Lu à chaque appel : un test peut changer de mode sans recharger le module. */
export function modeApi(module: ModuleApi): ModeApi {
  const env = import.meta.env as unknown as Record<string, unknown>;
  return lire(env[`VITE_API_${module.toUpperCase()}`]) ?? lire(env.VITE_API_MODE) ?? 'fictif';
}

export const estReel = (module: ModuleApi) => modeApi(module) === 'reel';
