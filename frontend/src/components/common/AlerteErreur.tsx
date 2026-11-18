import { TriangleAlert } from 'lucide-react';
import { forwardRef } from 'react';

import type { ApiError } from '@/api/errors';
import { titreErreur } from '@/lib/erreurs';
import { cn } from '@/lib/utils';

type Props = { erreur: ApiError; className?: string };

/** Bandeau d'erreur de la maquette (écran 5) : titre, message, code HTTP et X-Request-Id. */
export const AlerteErreur = forwardRef<HTMLDivElement, Props>(({ erreur, className }, ref) => (
  <div
    ref={ref}
    role="alert"
    tabIndex={-1}
    className={cn(
      'flex items-start gap-3.5 rounded-btn border border-[var(--badge-rouge-fg)] bg-[var(--badge-rouge-bg)] px-[18px] py-4 text-[var(--badge-rouge-fg)]',
      className,
    )}
  >
    <TriangleAlert size={22} aria-hidden="true" className="mt-0.5 flex-none" />
    <div className="flex flex-col gap-1">
      <strong className="text-base">{titreErreur(erreur)}</strong>
      <span>{erreur.message}</span>
      <span className="font-mono text-xs opacity-85">
        {erreur.status}
        {erreur.requestId && ` · X-Request-Id ${erreur.requestId}`}
      </span>
    </div>
  </div>
));
AlerteErreur.displayName = 'AlerteErreur';
