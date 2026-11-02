import { Pastille } from '@/components/common/Pastille';
import { formatTelephone, initiales } from '@/lib/format';
import { cn } from '@/lib/utils';

import { SPECIALITES, type Ouvrier } from '../types';

type Props = { ouvrier: Ouvrier; choisi: boolean; onChoisir: () => void };

/** Carte d'un ouvrier (écran 6) ; la sélectionner affiche son planning. */
export function CarteOuvrier({ ouvrier: o, choisi, onChoisir }: Props) {
  return (
    <button
      type="button"
      aria-pressed={choisi}
      aria-label={`${o.prenom} ${o.nom}, ${SPECIALITES[o.specialite]}, ${o.disponible ? 'disponible' : 'indisponible'} : voir le planning`}
      onClick={onChoisir}
      className={cn(
        'flex flex-col gap-3 rounded-card border-2 bg-surface p-4 text-left text-ink transition-colors',
        choisi ? 'border-accent' : 'border-line hover:border-[var(--muted)]',
      )}
    >
      <span className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-line bg-surface-2 font-bold"
        >
          {initiales(o.prenom, o.nom)}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-bold">
            {o.prenom} {o.nom}
          </span>
          <span className="text-[13px] text-muted">{SPECIALITES[o.specialite]}</span>
        </span>
      </span>
      <span className="flex flex-col gap-0.5 text-[13px] text-muted">
        <span>
          CIN <span className="font-mono text-ink">{o.cin}</span>
        </span>
        <span>
          Tél. <span className="font-mono text-ink">{formatTelephone(o.telephone)}</span>
        </span>
      </span>
      <Pastille ton={o.disponible ? 'vert' : 'gris'} className="self-start">
        {o.disponible ? 'Disponible' : 'Indisponible'}
      </Pastille>
    </button>
  );
}
