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
