import { formatNombre } from '@/lib/format';
import { cn } from '@/lib/utils';

import { niveauStock } from '../presentation';
import type { Materiau } from '../types';

/** Jauge de niveau (écran 7) : le trait vertical marque le seuil d'alerte, au milieu de l'échelle. */
export function JaugeStock({ materiau: m }: { materiau: Materiau }) {
  const niveau = niveauStock(m);
  return (
    <div
      role="meter"
      aria-label={`Niveau de stock de ${m.nom}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={niveau}
      aria-valuetext={`${formatNombre(m.stock)} ${m.unite} pour un seuil de ${formatNombre(m.seuilAlerte)} ${m.unite}`}
      className="relative h-2.5 w-full min-w-[160px] overflow-hidden rounded-[2px] bg-track"
    >
      <div
        className={cn('h-full', m.enAlerte ? 'bg-bar-rouge' : 'bg-bar-vert')}
        style={{ width: `${niveau}%` }}
      />
      <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-0.5 bg-[var(--muted)]" />
    </div>
  );
}
