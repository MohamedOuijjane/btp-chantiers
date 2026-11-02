import { useEffect } from 'react';
import { Outlet, useMatches, useParams, type Params } from 'react-router-dom';

import { Sidebar } from './Sidebar';
import { Topbar, type Miette } from './Topbar';

/** Métadonnées d'une route : titre de la topbar et fil d'Ariane. */
export type InfosPage = {
  titre: string | ((params: Params) => string);
  fil?: Miette[] | ((params: Params) => Miette[]);
};

const RACINE: Miette = { libelle: 'Souss Bâtiment', vers: '/' };

function resoudre<T>(valeur: T | ((params: Params) => T), params: Params): T {
  return typeof valeur === 'function' ? (valeur as (p: Params) => T)(params) : valeur;
}

export function AppLayout() {
  const params = useParams();
  const matches = useMatches();
  const infos = [...matches].reverse().find((m) => m.handle)?.handle as InfosPage | undefined;

  const titre = infos ? resoudre(infos.titre, params) : '';
  const fil = [RACINE, ...(infos?.fil ? resoudre(infos.fil, params) : [])];

  useEffect(() => {
    document.title = titre ? `${titre} · BTP Chantiers` : 'BTP Chantiers';
  }, [titre]);

  return (
    <div className="flex min-h-screen flex-wrap">
      <Sidebar />
      <main className="flex min-w-0 flex-[999_1_560px] flex-col">
        <Topbar titre={titre} fil={fil} />
        <div className="box-border flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
