import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { futurRouteur, routes } from '@/app/routes';

/** Affiche l'application complète (layout, routes, données fictives) à l'adresse donnée. */
export function afficherApp(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [url], future: futurRouteur });
  const rendu = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
      <Toaster />
    </QueryClientProvider>,
  );
  return { ...rendu, router };
}
