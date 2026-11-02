import { useEffect, useState } from 'react';
import { Outlet, useMatches, useParams, type Params } from 'react-router-dom';

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

  useEffect(() => {
    document.title = titre ? `${titre} · BTP Chantiers` : 'BTP Chantiers';
  }, [titre]);

  return (
    <div className="flex min-h-screen flex-wrap">
      <Sidebar />
      <main className="flex min-w-0 flex-[999_1_560px] flex-col">
        <Topbar titre={titre} fil={fil} />
        <div className="box-border flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-12 pt-7 sm:px-8">
          <TitreContext.Provider value={setTitrePage}>
            <Outlet />
          </TitreContext.Provider>
        </div>
      </main>
    </div>
  );
}
