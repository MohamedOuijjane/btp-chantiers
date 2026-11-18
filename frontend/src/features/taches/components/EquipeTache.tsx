import type { Ouvrier } from '@/features/ouvriers/types';
import { initiales } from '@/lib/format';

type Props = { ouvrierIds: number[]; parId: Map<number, Ouvrier> };

/** Initiales des ouvriers affectés (nom complet au survol et pour les lecteurs d'écran). */
export function EquipeTache({ ouvrierIds, parId }: Props) {
  if (!ouvrierIds.length) return <span className="text-sm text-muted">Aucun</span>;
  return (
    <ul className="m-0 flex list-none gap-1 p-0">
      {ouvrierIds.map((id) => {
        const o = parId.get(id);
        const nom = o ? `${o.prenom} ${o.nom}` : `Ouvrier ${id}`;
        return (
          <li
            key={id}
            title={nom}
            aria-label={nom}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface-2 text-xs font-bold"
          >
            {o ? initiales(o.prenom, o.nom) : id}
          </li>
        );
      })}
    </ul>
  );
}
