import { Link } from 'react-router-dom';

import { Pastille } from '@/components/common/Pastille';
import { Td } from '@/components/common/Tableau';
import { Skeleton } from '@/components/ui/skeleton';
import type { Chantier } from '@/features/chantiers/types';
import { formatDateCourte, formatNombre } from '@/lib/format';

import type { Materiau, Mouvement } from '../types';

type Props = {
  mouvements?: Mouvement[];
  chargement: boolean;
  materiaux: Map<number, Materiau>;
  chantiers: Map<number, Chantier>;
};

/** Liste « Derniers mouvements » (écran 7), du plus récent au plus ancien. */
export function MouvementsRecents({ mouvements, chargement, materiaux, chantiers }: Props) {
  if (chargement) {
    return (
      <div className="flex flex-col gap-2" aria-hidden="true">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  }
  if (!mouvements?.length) return <p className="m-0 text-muted">Aucun mouvement enregistré.</p>;

  return (
    <div className="overflow-x-auto">
      <table aria-label="Derniers mouvements" className="w-full min-w-[640px] border-collapse">
        <tbody>
          {mouvements.map((mv) => {
            const m = materiaux.get(mv.materiauId);
            const c = chantiers.get(mv.chantierId);
            return (
              <tr key={mv.id} className="border-t border-line">
                <Td className="font-mono text-[13px] text-muted">{formatDateCourte(mv.date)}</Td>
                <Td className="font-semibold">{m?.nom ?? `Matériau ${mv.materiauId}`}</Td>
                <Td className="text-muted">
                  {c ? (
                    <Link to={`/chantiers/${c.id}`} className="text-muted">
                      {c.nom}
                    </Link>
                  ) : (
                    `Chantier ${mv.chantierId}`
                  )}
                </Td>
                <Td>
                  <Pastille ton={mv.type === 'SORTIE' ? 'ambre' : 'vert'}>
                    {mv.type === 'SORTIE' ? 'Sortie' : 'Entrée'}
                  </Pastille>
                </Td>
                <Td className="whitespace-nowrap text-right font-mono text-[13px]">
                  {formatNombre(mv.quantite)} {m?.unite}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
