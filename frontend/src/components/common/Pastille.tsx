import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import type { Ton } from './statuts';

const TONS: Record<Ton, string> = {
  gris: 'bg-[var(--badge-gris-bg)] text-[var(--badge-gris-fg)]',
  bleu: 'bg-[var(--badge-bleu-bg)] text-[var(--badge-bleu-fg)]',
  ambre: 'bg-[var(--badge-ambre-bg)] text-[var(--badge-ambre-fg)]',
  vert: 'bg-[var(--badge-vert-bg)] text-[var(--badge-vert-fg)]',
  rouge: 'bg-[var(--badge-rouge-bg)] text-[var(--badge-rouge-fg)]',
};

type Props = { ton: Ton; children: ReactNode; className?: string };

/** Pastille colorée de la maquette (statuts, type de mouvement, alertes). */
export function Pastille({ ton, children, className }: Props) {
  return (
    <span
      data-ton={ton}
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-bold',
        TONS[ton],
        className,
      )}
    >
      {children}
    </span>
  );
}
