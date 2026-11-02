/**
 * Erreur commune à tous les modules, quel que soit le format renvoyé par le backend
 * (problem+json de Chantiers, { detail } de FastAPI, { message } de NestJS, SOAP Fault).
 */
export type ApiError = {
  /** Code HTTP (0 si le réseau est coupé). */
  status: number;
  /** Message lisible à afficher. */
  message: string;
  /** Erreurs par champ de formulaire (400 / 422 de validation). */
  champs?: Record<string, string>;
  /** En-tête X-Request-Id renvoyé par la gateway. */
  requestId?: string;
};

/** Erreur levée par la couche api.ts ; les hooks TanStack Query la reçoivent telle quelle. */
export class ErreurApi extends Error implements ApiError {
  readonly status: number;
  readonly champs?: Record<string, string>;
  readonly requestId?: string;

  constructor({ status, message, champs, requestId }: ApiError) {
    super(message);
    this.name = 'ErreurApi';
    this.status = status;
    this.champs = champs;
    this.requestId = requestId;
  }
}

export function estApiError(e: unknown): e is ApiError {
  return (
    typeof e === 'object' &&
    e !== null &&
    typeof (e as ApiError).status === 'number' &&
    typeof (e as ApiError).message === 'string'
  );
}

/** Ramène n'importe quelle erreur à un ApiError (une erreur inattendue devient un 500). */
export function versApiError(e: unknown): ApiError {
  if (estApiError(e)) return e;
  return { status: 500, message: e instanceof Error ? e.message : 'Erreur inattendue' };
}

// Raccourcis utilisés par les fonctions fictives (et plus tard par les vrais clients).
export const introuvable = (message: string) => new ErreurApi({ status: 404, message });
export const conflit = (message: string) => new ErreurApi({ status: 409, message });
export const invalide = (message: string, champs?: Record<string, string>) =>
  new ErreurApi({ status: champs ? 400 : 422, message, champs });
export const refus = (message: string) => new ErreurApi({ status: 422, message });
export const indisponible = (module: string) =>
  new ErreurApi({
    status: 503,
    message: `Le module ${module} est indisponible, réessayez dans un instant.`,
  });
