import { ServiceUnavailableException } from '@nestjs/common';

const TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS ?? 2000);

/** fetch avec timeout : un service lent ne doit jamais bloquer toute la chaîne. */
export async function appel(nomService: string, url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    throw new ServiceUnavailableException(`Module ${nomService} injoignable (${(e as Error).message})`);
  }
}

/**
 * Corps JSON d'une réponse attendue en 2xx (#7) : une erreur du module appelé (5xx, autre code
 * inattendu) ou un corps illisible donne 503, jamais une vérification qui passe par défaut.
 * Les codes métier (404…) sont traités par l'appelant avant cet appel.
 */
export async function lireJson<T>(nomService: string, res: Response): Promise<T> {
  if (!res.ok) {
    throw new ServiceUnavailableException(`Module ${nomService} en erreur (HTTP ${res.status})`);
  }
  try {
    return (await res.json()) as T;
  } catch {
    throw new ServiceUnavailableException(`Module ${nomService} : réponse illisible`);
  }
}
