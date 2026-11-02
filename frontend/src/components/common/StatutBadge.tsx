import { Pastille } from './Pastille';
import { STATUTS, type Statut } from './statuts';

export type { Statut, StatutChantier, StatutTache } from './statuts';

type Props = { statut: Statut; className?: string };

/** Badge de statut, identique sur toutes les pages (chantiers et tâches). */
export function StatutBadge({ statut, className }: Props) {
  const { libelle, ton } = STATUTS[statut];
  return (
    <Pastille ton={ton} className={className}>
      {libelle}
    </Pastille>
  );
}
