import { Link } from 'react-router-dom';

import { STATUTS, type StatutChantier } from '@/components/common/statuts';
import type { Chantier } from '@/features/chantiers/types';
import { formatMontant } from '@/lib/format';

const ORDRE: { statut: StatutChantier; couleur: string }[] = [
  { statut: 'PLANIFIE', couleur: 'bg-bar-gris' },
  { statut: 'EN_COURS', couleur: 'bg-bar-bleu' },
  { statut: 'SUSPENDU', couleur: 'bg-accent' },
  { statut: 'TERMINE', couleur: 'bg-bar-vert' },
];

/** « Répartition des chantiers » (écran 2) : barre empilée par statut et budget des chantiers en cours. */
export function RepartitionChantiers({ chantiers }: { chantiers: Chantier[] }) {
  const total = chantiers.length || 1;
  const compte = (s: StatutChantier) => chantiers.filter((c) => c.statut === s).length;
  const budget = chantiers.filter((c) => c.statut === 'EN_COURS').reduce((s, c) => s + c.budget, 0);

  return (
    <div className="flex flex-col gap-4">
      <div
        role="img"
        aria-label={ORDRE.map(
          (o) => `${compte(o.statut)} ${STATUTS[o.statut].libelle.toLowerCase()}`,
        ).join(', ')}
        className="flex h-7 gap-0.5 overflow-hidden rounded-[2px]"
      >
        {ORDRE.map(
          (o) =>
            compte(o.statut) > 0 && (
              <span
                key={o.statut}
                className={o.couleur}
                style={{ width: `${(compte(o.statut) / total) * 100}%` }}
              />
            ),
        )}
      </div>
      <ul className="m-0 grid list-none grid-cols-2 gap-x-6 gap-y-2.5 p-0">
        {ORDRE.map((o) => (
          <li key={o.statut}>
            <Link
              to={`/chantiers?statut=${o.statut}`}
              className="flex items-center gap-2.5 text-ink no-underline hover:underline"
            >
              <span
                aria-hidden="true"
                className={`h-3.5 w-3.5 flex-none rounded-[2px] ${o.couleur}`}
              />
              <span className="flex-1">{STATUTS[o.statut].libelle}</span>
              <span className="font-mono">{compte(o.statut)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3.5">
        <span className="text-muted">Budget des chantiers en cours</span>
        <span className="font-mono">{formatMontant(budget)}</span>
      </div>
    </div>
  );
}
