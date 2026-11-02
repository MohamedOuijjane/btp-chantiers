import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { futurRouteur, routes } from '@/app/routes';
import { sessionDemo } from '@/features/auth/api';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ecrireSession } from '@/features/auth/session';
import type { Role } from '@/features/auth/types';

type Options = {
  /**
   * Profil connecté avant l'affichage ; `null` pour un visiteur non connecté.
   * Par défaut, le conducteur de travaux, qui a tous les droits.
   */
  role?: Role | null;
};

/** Affiche l'application complète (layout, routes, données fictives) à l'adresse donnée. */
export function afficherApp(url: string, { role = 'CONDUCTEUR' }: Options = {}) {
  if (role) ecrireSession(sessionDemo(role));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [url], future: futurRouteur });
  const rendu = render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>,
  );
  return { ...rendu, router };
}
