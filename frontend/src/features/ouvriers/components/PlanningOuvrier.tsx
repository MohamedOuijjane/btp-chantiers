import { X } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Encart } from '@/components/common/Tableau';
import { StatutBadge } from '@/components/common/StatutBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useChantiers } from '@/features/chantiers/hooks';
import { formatDateCourte } from '@/lib/format';
import { cn } from '@/lib/utils';

import { usePlanning } from '../hooks';
import { BARRE_STATUT } from '../presentation';
import type { TachePlanning } from '../types';

type Props = {
  ouvrierId: number;
  /** Fiche ouvrier : bouton « Retirer » sur les tâches non terminées. */
  onRetirer?: (t: TachePlanning) => void;
};

/** Planning d'un ouvrier, dans l'ordre chronologique ; mode dégradé si Tâches ne répond pas. */
export function PlanningOuvrier({ ouvrierId, onRetirer }: Props) {
  const { data, isPending, error } = usePlanning(ouvrierId);
  const chantiers = useChantiers();
  const nomChantier = (id: number) =>
    chantiers.data?.find((c) => c.id === id)?.nom ?? `Chantier ${id}`;

  if (error) return <Encart>{error.message}</Encart>;
  if (isPending) {
    return (
      <div className="flex flex-col gap-3" aria-hidden="true">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    );
  }
  if (!data.sourceDisponible) {
    return (
      <div
        role="status"
        className="rounded-btn bg-[var(--badge-ambre-bg)] p-4 text-[var(--badge-ambre-fg)]"
      >
        <strong>Planning non disponible.</strong> Le module Tâches ne répond pas (mode dégradé) ; la
        fiche de l’ouvrier reste consultable.
      </div>
    );
  }
  if (!data.taches.length) return <p className="m-0 text-muted">Aucune tâche affectée.</p>;

  return (
    <ol
      aria-label={`Planning de ${data.ouvrier.prenom} ${data.ouvrier.nom}`}
      className="m-0 flex list-none flex-col p-0"
    >
      {data.taches.map((t) => (
        <li key={t.id} className="flex gap-3.5 border-b border-line py-3 last:border-b-0">
          <span
            aria-hidden="true"
            className={cn('w-1 flex-none rounded-[2px]', BARRE_STATUT[t.statut])}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-mono text-xs text-muted">
              {formatDateCourte(t.dateDebut)} → {formatDateCourte(t.dateFin)}
            </span>
            <Link to={`/taches/${t.id}`} className="font-bold text-ink">
              {t.titre}
            </Link>
            <span className="text-[13px] text-muted">{nomChantier(t.chantierId)}</span>
          </div>
          <span className="flex items-center gap-2 self-center">
            <StatutBadge statut={t.statut} className="text-xs" />
            {onRetirer && t.statut !== 'TERMINEE' && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Retirer de la tâche ${t.titre}`}
                title="Retirer de la tâche"
                onClick={() => onRetirer(t)}
              >
                <X size={18} aria-hidden="true" />
              </Button>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
