import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Props = {
  /** Module injoignable, par ex. « Tâches ». */
  module: string;
  /** Conséquences pour l'utilisateur. */
  children?: ReactNode;
  className?: string;
};

/** Bandeau « mode dégradé » : un module ne répond pas, les données affichées sont partielles. */
export function BandeauDegrade({ module, children, className }: Props) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 border-b border-line bg-[var(--badge-ambre-bg)] px-4 py-3.5 text-[var(--badge-ambre-fg)] sm:px-8',
        className,
      )}
    >
      <TriangleAlert size={20} aria-hidden="true" className="mt-px flex-none" />
      <span>
        <strong>Mode dégradé · module {module} injoignable.</strong> {children}
      </span>
    </div>
  );
}
