import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Encadré d'information ambre (données partielles, mode dégradé d'un module voisin). */
export function BandeauInfo({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-btn bg-[var(--badge-ambre-bg)] px-4 py-3 text-[var(--badge-ambre-fg)]',
        className,
      )}
    >
      <Info size={20} aria-hidden="true" className="mt-px flex-none" />
      <span>{children}</span>
    </div>
  );
}
