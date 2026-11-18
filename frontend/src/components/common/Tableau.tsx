import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

// Cellules des tableaux de la maquette (padding 14 × 16 px, en-têtes en petites capitales).
export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn('px-4 py-3.5 font-semibold', className)} {...props} />;
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3.5 align-middle', className)} {...props} />;
}

/** Encadré en pointillés pour une donnée indisponible (mode dégradé). */
export function Encart({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-btn border border-dashed border-line bg-surface-2 p-5 text-muted">
      {children}
    </div>
  );
}
