import { createContext, useContext, useEffect } from 'react';

/** Permet à une page de remplacer le titre de la topbar (ex. nom du chantier). */
export const TitreContext = createContext<(titre: string | null) => void>(() => {});

export function useTitrePage(titre: string | undefined) {
  const definir = useContext(TitreContext);
  useEffect(() => {
    definir(titre ?? null);
    return () => definir(null);
  }, [titre, definir]);
}
