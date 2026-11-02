import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Props = {
  icone?: LucideIcon;
  titre: string;
  description?: ReactNode;
  /** Bouton ou lien d'action, par ex. « Créer le premier chantier ». */
  action?: ReactNode;
  className?: string;
};

/** Carte en pointillés affichée quand une liste est vide ou qu'une page n'a pas encore de contenu. */
export function EtatVide({ icone: Icone, titre, description, action, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      {Icone && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">
          <Icone size={24} aria-hidden="true" />
        </span>
      )}
      <h2 className="titre text-xl">{titre}</h2>
      {description && <p className="max-w-md text-muted">{description}</p>}
      {action}
    </div>
  );
}
