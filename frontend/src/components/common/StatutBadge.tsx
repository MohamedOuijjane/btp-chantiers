import { cn } from '@/lib/utils';

import { STATUTS, type Statut, type Ton } from './statuts';

export type { Statut, StatutChantier, StatutTache } from './statuts';

const TONS: Record<Ton, string> = {
  gris: 'bg-[var(--badge-gris-bg)] text-[var(--badge-gris-fg)]',
  bleu: 'bg-[var(--badge-bleu-bg)] text-[var(--badge-bleu-fg)]',
  ambre: 'bg-[var(--badge-ambre-bg)] text-[var(--badge-ambre-fg)]',
  vert: 'bg-[var(--badge-vert-bg)] text-[var(--badge-vert-fg)]',
  rouge: 'bg-[var(--badge-rouge-bg)] text-[var(--badge-rouge-fg)]',
};

type Props = { statut: Statut; className?: string };

/** Badge de statut, identique sur toutes les pages (chantiers et tâches). */
export function StatutBadge({ statut, className }: Props) {
  const { libelle, ton } = STATUTS[statut];
  return (
    <span
      data-ton={ton}
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-bold',
        TONS[ton],
        className,
      )}
    >
      {libelle}
    </span>
  );
}
