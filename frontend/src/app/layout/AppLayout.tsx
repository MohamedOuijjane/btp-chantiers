import { useEffect, useState } from 'react';
import { Outlet, useMatches, useParams, type Params } from 'react-router-dom';

import { AccesRefuse } from '@/features/auth/components/AccesRefuse';
import { useDroits } from '@/features/auth/contexte';
import type { Action, Section } from '@/features/auth/permissions';

import { TitreContext } from '../titre';

import { Sidebar } from './Sidebar';
import { Topbar, type Miette } from './Topbar';

/**
 * Métadonnées d'une route : titre de la topbar et fil d'Ariane (surtitre de la maquette).
 * Sans fil, le surtitre est le nom de l'entreprise.
 */
export type InfosPage = {
  titre: string | ((params: Params) => string);
  fil?: Miette[] | ((params: Params) => Miette[]);
  /** Section du menu à laquelle appartient la page (droit de lecture du profil). */
  section?: Section;
  /** Action nécessaire pour ouvrir la page (ex. formulaire de création). */
  action?: Action;
};

const RACINE: Miette = { libelle: 'Souss Bâtiment', vers: '/' };

function resoudre<T>(valeur: T | ((params: Params) => T), params: Params): T {
  return typeof valeur === 'function' ? (valeur as (p: Params) => T)(params) : valeur;
}

export function AppLayout() {
  const params = useParams();
  const matches = useMatches();
  const infos = [...matches].reverse().find((m) => m.handle)?.handle as InfosPage | undefined;

  // Une page peut remplacer le titre par une donnée chargée (ex. nom du chantier).
  const [titrePage, setTitrePage] = useState<string | null>(null);
  const titre = titrePage ?? (infos ? resoudre(infos.titre, params) : '');
  const fil = infos?.fil ? resoudre(infos.fil, params) : [RACINE];

  // Une page hors des droits du profil affiche « Accès refusé » (le menu ne la propose pas).
  const { voit, peut } = useDroits();
  const autorise =
    (!infos?.section || voit(infos.section)) && (!infos?.action || peut(infos.action));

  useEffect(() => {
    document.title = titre ? `${titre} · BTP Chantiers` : 'BTP Chantiers';
  }, [titre]);

  return (
    // La fenêtre défile ; barre latérale et barre du haut restent en place (position sticky).
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar titre={titre} fil={fil} />
        <main className="box-border flex w-full min-w-0 flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
          <TitreContext.Provider value={setTitrePage}>
            {autorise ? <Outlet /> : <AccesRefuse />}
          </TitreContext.Provider>
        </main>
      </div>
    </div>
  );
}
