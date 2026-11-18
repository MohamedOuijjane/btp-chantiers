import { ArrowDownToLine, ArrowUpFromLine, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

import { StatutBadge } from '@/components/common/StatutBadge';
import type { Chantier } from '@/features/chantiers/types';
import type { Materiau, Mouvement } from '@/features/materiaux/types';
import type { ChangementStatut, Tache } from '@/features/taches/types';
import { formatDateCourte, formatNombre } from '@/lib/format';

type Activite = {
  cle: string;
  date: string;
  contenu: React.ReactNode;
  icone: React.ReactNode;
};

type Props = {
  /** undefined : module Tâches indisponible. */
  changements?: ChangementStatut[];
  taches: Map<number, Tache>;
  /** undefined : module Matériaux indisponible. */
  mouvements?: Mouvement[];
  materiaux: Map<number, Materiau>;
  chantiers: Map<number, Chantier>;
  limite?: number;
};

/** « Dernières activités » : changements de statut des tâches et mouvements de stock, du plus récent au plus ancien. */
export function DernieresActivites({
  changements,
  taches,
  mouvements,
  materiaux,
  chantiers,
  limite = 8,
}: Props) {
  const activites: Activite[] = [
    ...(changements ?? []).map((h, i) => {
      const t = taches.get(h.tacheId);
      return {
        cle: `t-${i}`,
        date: h.date,
        icone: <ClipboardList size={18} aria-hidden="true" />,
        contenu: (
          <>
            <span>
              <Link to={`/taches/${h.tacheId}`} className="font-semibold text-ink">
                {t?.titre ?? `Tâche ${h.tacheId}`}
              </Link>
              {t && <span className="text-muted"> · {chantiers.get(t.chantierId)?.nom}</span>}
            </span>
            <StatutBadge statut={h.statut} className="text-xs" />
          </>
        ),
      };
    }),
    ...(mouvements ?? []).map((mv) => {
      const m = materiaux.get(mv.materiauId);
      const sortie = mv.type === 'SORTIE';
      return {
        cle: `m-${mv.id}`,
        date: mv.date,
        icone: sortie ? (
          <ArrowUpFromLine size={18} aria-hidden="true" />
        ) : (
          <ArrowDownToLine size={18} aria-hidden="true" />
        ),
        contenu: (
          <span>
            {sortie ? 'Sortie' : 'Entrée'} de{' '}
            <span className="font-mono">
              {formatNombre(mv.quantite)} {m?.unite}
            </span>{' '}
            <Link to="/materiaux" className="font-semibold text-ink">
              {m?.nom ?? `matériau ${mv.materiauId}`}
            </Link>
            <span className="text-muted"> · {chantiers.get(mv.chantierId)?.nom}</span>
          </span>
        ),
      };
    }),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limite);

  if (!activites.length) return <p className="m-0 text-muted">Aucune activité récente.</p>;

  return (
    <ol aria-label="Dernières activités" className="m-0 flex list-none flex-col p-0">
      {activites.map((a) => (
        <li
          key={a.cle}
          className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0"
        >
          <span className="w-12 flex-none font-mono text-[13px] text-muted">
            {formatDateCourte(a.date)}
          </span>
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-surface-2 text-muted">
            {a.icone}
          </span>
          <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
            {a.contenu}
          </span>
        </li>
      ))}
    </ol>
  );
}
