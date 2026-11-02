import type { RouteObject } from 'react-router-dom';

import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { ChantierFichePage } from '@/features/chantiers/pages/ChantierFichePage';
import { ChantiersPage } from '@/features/chantiers/pages/ChantiersPage';
import { MateriauxPage } from '@/features/materiaux/pages/MateriauxPage';
import { OuvriersPage } from '@/features/ouvriers/pages/OuvriersPage';
import { NouvelleTachePage } from '@/features/taches/pages/NouvelleTachePage';

import { AppLayout, type InfosPage } from './layout/AppLayout';
import { PageIntrouvable } from './pages/PageIntrouvable';

const CHANTIERS = { libelle: 'Chantiers', vers: '/chantiers' };

const page = (infos: InfosPage) => ({ handle: infos });

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage />, ...page({ titre: 'Tableau de bord' }) },
      {
        path: 'chantiers',
        element: <ChantiersPage />,
        ...page({ titre: 'Tous les chantiers', fil: [{ libelle: 'Chantiers' }] }),
      },
      {
        path: 'chantiers/:id',
        element: <ChantierFichePage />,
        // Le titre est remplacé par le nom du chantier une fois chargé.
        ...page({ titre: ({ id }) => `Chantier n° ${id}`, fil: [CHANTIERS] }),
      },
      {
        path: 'chantiers/:id/taches/nouvelle',
        element: <NouvelleTachePage />,
        ...page({
          titre: 'Nouvelle tâche',
          fil: ({ id }) => [CHANTIERS, { libelle: `Chantier n° ${id}`, vers: `/chantiers/${id}` }],
        }),
      },
      {
        path: 'ouvriers',
        element: <OuvriersPage />,
        ...page({ titre: 'Ouvriers', fil: [{ libelle: 'Équipes' }] }),
      },
      {
        path: 'materiaux',
        element: <MateriauxPage />,
        ...page({ titre: 'Matériaux et stock', fil: [{ libelle: 'Magasin' }] }),
      },
      { path: '*', element: <PageIntrouvable />, ...page({ titre: 'Page introuvable' }) },
    ],
  },
];

// Comportements de React Router v7 activés dès maintenant (migration sans surprise).
export const futurRouteur = {
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_relativeSplatPath: true,
  v7_skipActionErrorRevalidation: true,
} as const;
