import type { RouteObject } from 'react-router-dom';

import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { ChantierFichePage } from '@/features/chantiers/pages/ChantierFichePage';
import { ChantiersPage } from '@/features/chantiers/pages/ChantiersPage';
import { MateriauxPage } from '@/features/materiaux/pages/MateriauxPage';
import { OuvrierFichePage } from '@/features/ouvriers/pages/OuvrierFichePage';
import { OuvriersPage } from '@/features/ouvriers/pages/OuvriersPage';
import { ModifierTachePage } from '@/features/taches/pages/ModifierTachePage';
import { NouvelleTachePage } from '@/features/taches/pages/NouvelleTachePage';
import { TacheFichePage } from '@/features/taches/pages/TacheFichePage';
import { TachesPage } from '@/features/taches/pages/TachesPage';

import { AppLayout, type InfosPage } from './layout/AppLayout';
import { PageIntrouvable } from './pages/PageIntrouvable';

const CHANTIERS = { libelle: 'Chantiers', vers: '/chantiers' };
const TACHES = { libelle: 'Tâches', vers: '/taches' };
const EQUIPES = { libelle: 'Équipes', vers: '/ouvriers' };

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
        // Surtitre de la maquette (écran 5) : « Chantiers · planification ».
        ...page({ titre: 'Nouvelle tâche', fil: [CHANTIERS, { libelle: 'Planification' }] }),
      },
      {
        path: 'taches',
        element: <TachesPage />,
        ...page({ titre: 'Toutes les tâches', fil: [{ libelle: 'Tâches' }] }),
      },
      {
        path: 'taches/nouvelle',
        element: <NouvelleTachePage />,
        ...page({ titre: 'Nouvelle tâche', fil: [TACHES, { libelle: 'Planification' }] }),
      },
      {
        path: 'taches/:id',
        element: <TacheFichePage />,
        // Le titre est remplacé par celui de la tâche une fois chargée.
        ...page({ titre: ({ id }) => `Tâche n° ${id}`, fil: [TACHES] }),
      },
      {
        path: 'taches/:id/modifier',
        element: <ModifierTachePage />,
        ...page({
          titre: 'Modifier la tâche',
          fil: ({ id }) => [TACHES, { libelle: `Tâche n° ${id}`, vers: `/taches/${id}` }],
        }),
      },
      {
        path: 'ouvriers',
        element: <OuvriersPage />,
        ...page({ titre: 'Ouvriers', fil: [{ libelle: 'Équipes' }] }),
      },
      {
        path: 'ouvriers/:id',
        element: <OuvrierFichePage />,
        // Le titre est remplacé par le nom de l'ouvrier une fois chargé.
        ...page({ titre: ({ id }) => `Ouvrier n° ${id}`, fil: [EQUIPES] }),
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
