/**
 * Serveur MSW pour les tests des clients réels (http.ts, api.reel.ts) : intercepte fetch sans backend.
 * À appeler en tête d'un fichier de test : `const serveur = demarrerServeurMsw();`.
 * Toute requête sans handler fait échouer le test.
 */
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';

export function demarrerServeurMsw() {
  const serveur = setupServer();
  beforeAll(() => serveur.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => serveur.resetHandlers());
  afterAll(() => serveur.close());
  return serveur;
}
