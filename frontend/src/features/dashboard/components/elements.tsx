import { ArrowRight } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Carte d'indicateur (écran 2) ; toute la carte mène à la page concernée. */
export function CarteKpi({
  titre,
  vers,
  valeur,
  total,
  detail,
  alerte = false,
  indisponible,
  chargement = false,
}: {
  titre: string;
  vers: string;
  valeur: ReactNode;
  total?: ReactNode;
  detail: ReactNode;
  /** Mise en avant ambre (matériaux en alerte, tâches en retard). */
  alerte?: boolean;
  /** Module en panne : texte affiché à la place de la valeur. */
  indisponible?: string;
  chargement?: boolean;
}) {
  return (
    <Link
      to={vers}
      className={cn(
        'flex min-w-0 flex-[1_1_220px] flex-col gap-1.5 rounded-card border p-5 text-ink no-underline transition-colors',
        alerte && !indisponible
          ? 'border-accent bg-[var(--badge-ambre-bg)] hover:brightness-[0.98]'
          : 'border-line bg-surface hover:border-[var(--muted)]',
      )}
    >
      <span
        className={cn(
          'surtitre text-[13px]',
          alerte && !indisponible ? 'text-accent-text' : 'text-muted',
        )}
      >
        {titre}
      </span>
      {chargement ? (
        <Skeleton className="h-11 w-24" />
      ) : indisponible ? (
        <>
          <span className="font-display text-[44px] font-bold leading-none" aria-hidden="true">
            —
          </span>
          <span role="status" className="text-sm text-muted">
            {indisponible}
          </span>
        </>
      ) : (
        <>
          <span
            className={cn(
              'font-display text-[44px] font-bold leading-none',
              alerte && 'text-accent-text',
            )}
          >
            {valeur}
            {total !== undefined && <span className="text-2xl text-muted"> / {total}</span>}
          </span>
          <span className={cn('text-sm', alerte ? 'text-accent-text' : 'text-muted')}>
            {detail}
          </span>
        </>
      )}
    </Link>
  );
}

/** Carte de section du tableau de bord : titre condensé et lien « Tout voir ». */
export function Section({
  titre,
  lien,
  className,
  children,
}: {
  titre: string;
  lien?: { vers: string; libelle: string };
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn('carte flex min-w-0 flex-col gap-5 p-6', className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={id} className="titre m-0 text-[22px]">
          {titre}
        </h2>
        {lien && (
          <Link
            to={lien.vers}
            className="flex items-center gap-1 font-semibold text-accent-text no-underline"
          >
            {lien.libelle}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Encadré « mode dégradé » d'une carte dont le module ne répond pas (écran 8). */
export function Indisponible({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-btn border border-dashed border-line bg-surface-2 p-5 text-muted"
    >
      {children}
    </div>
  );
}
