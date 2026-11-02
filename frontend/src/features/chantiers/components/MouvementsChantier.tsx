import type { ApiError } from '@/api/errors';
import { Pastille } from '@/components/common/Pastille';
import { Skeleton } from '@/components/ui/skeleton';
import { useMateriaux } from '@/features/materiaux/hooks';
import type { Mouvement } from '@/features/materiaux/types';
import { formatDateCourte, formatNombre } from '@/lib/format';

import { Encart, Td, Th } from '@/components/common/Tableau';

type Props = { mouvements?: Mouvement[]; chargement: boolean; erreur: ApiError | null };

/** Onglet « Matériaux consommés » : mouvements de stock du chantier, du plus récent au plus ancien. */
export function MouvementsChantier({ mouvements, chargement, erreur }: Props) {
  const materiaux = useMateriaux();
  const parId = new Map((materiaux.data ?? []).map((m) => [m.id, m]));

  if (erreur) {
    return (
      <Encart>
        {erreur.status === 503
          ? 'Mouvements indisponibles pendant la panne du module Matériaux.'
          : erreur.message}
      </Encart>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="bg-surface-2 text-left text-xs uppercase tracking-[0.08em] text-muted">
            <Th>Date</Th>
            <Th>Matériau</Th>
            <Th>Type</Th>
            <Th className="text-right">Quantité</Th>
          </tr>
        </thead>
        <tbody>
          {chargement
            ? Array.from({ length: 3 }, (_, i) => (
                <tr key={i} className="border-t border-line">
                  {Array.from({ length: 4 }, (_, j) => (
                    <Td key={j}>
                      <Skeleton className="h-4" />
                    </Td>
                  ))}
                </tr>
              ))
            : mouvements?.map((mv) => {
                const m = parId.get(mv.materiauId);
                return (
                  <tr key={mv.id} className="border-t border-line">
                    <Td className="font-mono text-[13px]">{formatDateCourte(mv.date)}</Td>
                    <Td className="font-semibold">{m?.nom ?? `Matériau ${mv.materiauId}`}</Td>
                    <Td>
                      <Pastille ton={mv.type === 'SORTIE' ? 'ambre' : 'vert'}>
                        {mv.type === 'SORTIE' ? 'Sortie' : 'Entrée'}
                      </Pastille>
                    </Td>
                    <Td className="text-right font-mono text-[13px]">
                      {formatNombre(mv.quantite)} {m?.unite}
                    </Td>
                  </tr>
                );
              })}
        </tbody>
      </table>
      {!chargement && mouvements?.length === 0 && (
        <p className="m-0 px-4 py-6 text-muted">
          Aucun mouvement de stock enregistré pour ce chantier.
        </p>
      )}
    </div>
  );
}
