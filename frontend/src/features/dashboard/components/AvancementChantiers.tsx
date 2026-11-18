import { Link } from 'react-router-dom';

import { BarreProgression } from '@/components/common/BarreProgression';
import { Skeleton } from '@/components/ui/skeleton';
import { tonAvancement } from '@/features/chantiers/presentation';
import type { Chantier } from '@/features/chantiers/types';
import { formatDate } from '@/lib/format';

type Props = {
  chantier: Chantier;
  /** undefined : en chargement ; null : non disponible (module Tâches). */
  valeur: number | null | undefined;
};

/** Ligne « Avancement des chantiers en cours » (écran 2). */
export function LigneAvancement({ chantier: c, valeur }: Props) {
  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Link to={`/chantiers/${c.id}`} className="font-bold text-ink no-underline hover:underline">
          {c.nom}
        </Link>
        <span className="font-mono text-[13px]">
          {valeur === undefined ? '…' : valeur === null ? 'Non disponible' : `${valeur} %`}
        </span>
      </div>
      {valeur === undefined ? (
        <Skeleton className="h-2.5" />
      ) : (
        <BarreProgression
          valeur={valeur ?? 0}
          ton={tonAvancement(c.statut, valeur ?? 0)}
          libelle={`Avancement de ${c.nom}`}
        />
      )}
      <span className="text-[13px] text-muted">
        {c.client} · fin prévue {formatDate(c.dateFinPrevue)}
      </span>
    </li>
  );
}
