import { forwardRef, useId, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  libelle: string;
  /** Message d'erreur affiché sous le champ (400 du backend ou validation Zod). */
  erreur?: string;
  /** Aide affichée sous le champ quand il n'y a pas d'erreur. */
  aide?: string;
};

/** Champ de formulaire de la maquette : libellé, saisie de 46 px, aide ou erreur dessous. */
export const Champ = forwardRef<HTMLInputElement, Props>(
  ({ libelle, erreur, aide, className, id, ...props }, ref) => {
    const auto = useId();
    const idChamp = id ?? auto;
    const idMessage = `${idChamp}-message`;
    const message = erreur ?? aide;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={idChamp} className="text-sm font-semibold">
          {libelle}
        </label>
        <input
          ref={ref}
          id={idChamp}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={message ? idMessage : undefined}
          className={cn(
            'min-h-[46px] rounded-btn border bg-surface px-3.5 text-ink placeholder:text-muted',
            erreur ? 'border-[var(--bar-rouge)]' : 'border-line',
            className,
          )}
          {...props}
        />
        {message && (
          <span
            id={idMessage}
            className={cn('text-[13px]', erreur ? 'text-[var(--badge-rouge-fg)]' : 'text-muted')}
          >
            {message}
          </span>
        )}
      </div>
    );
  },
);
Champ.displayName = 'Champ';
