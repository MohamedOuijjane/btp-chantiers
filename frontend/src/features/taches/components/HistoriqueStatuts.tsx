import { StatutBadge } from '@/components/common/StatutBadge';
import { Encart } from '@/components/common/Tableau';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/format';

import { useHistorique } from '../hooks';

/** Historique des statuts d'une tâche, du plus récent au plus ancien. */
export function HistoriqueStatuts({ tacheId }: { tacheId: number }) {
  const { data, isPending, error } = useHistorique(tacheId);

  if (error) return <Encart>{error.message}</Encart>;
  if (isPending) {
    return (
      <div className="flex flex-col gap-3" aria-hidden="true">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-5 w-56" />
      </div>
    );
  }

  return (
    <ol aria-label="Historique des statuts" className="m-0 flex list-none flex-col p-0">
      {data.map((h, i) => (
        <li key={i} className="relative flex gap-3 pb-4 pl-6 last:pb-0">
          <span
            aria-hidden="true"
            className="absolute left-[5px] top-2 h-full w-0.5 bg-line [li:last-child_&]:hidden"
          />
          <span
            aria-hidden="true"
            className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-accent bg-surface"
          />
          <span className="w-24 flex-none font-mono text-[13px] text-muted">
            {formatDate(h.date)}
          </span>
          <span className="flex flex-col gap-1">
            <StatutBadge statut={h.statut} className="self-start" />
            {h.motif && <span className="text-[13px] text-muted">Motif : {h.motif}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
