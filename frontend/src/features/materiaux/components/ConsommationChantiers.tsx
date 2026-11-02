import { Link } from 'react-router-dom';

import { Td, Th } from '@/components/common/Tableau';
import type { Chantier } from '@/features/chantiers/types';
import { formatNombre } from '@/lib/format';

import type { Materiau, Mouvement } from '../types';

type Props = {
  mouvements: Mouvement[];
  materiaux: Map<number, Materiau>;
  chantiers: Map<number, Chantier>;
};

type Ligne = { chantierId: number; materiauId: number; quantite: number; sorties: number };

/**
 * Consommation par chantier : total des sorties de chaque matériau, par chantier
 * (calculé à partir de ListerMouvements).
 */
export function ConsommationChantiers({ mouvements, materiaux, chantiers }: Props) {
  const totaux = new Map<string, Ligne>();
  for (const mv of mouvements) {
    if (mv.type !== 'SORTIE') continue;
    const cle = `${mv.chantierId}-${mv.materiauId}`;
    const l = totaux.get(cle) ?? {
      chantierId: mv.chantierId,
      materiauId: mv.materiauId,
      quantite: 0,
      sorties: 0,
    };
    l.quantite += mv.quantite;
    l.sorties += 1;
    totaux.set(cle, l);
  }
  const lignes = [...totaux.values()].sort(
    (a, b) =>
      (chantiers.get(a.chantierId)?.nom ?? '').localeCompare(
        chantiers.get(b.chantierId)?.nom ?? '',
      ) ||
      (materiaux.get(a.materiauId)?.nom ?? '').localeCompare(
        materiaux.get(b.materiauId)?.nom ?? '',
      ),
  );

  if (!lignes.length) return <p className="m-0 text-muted">Aucune sortie de stock enregistrée.</p>;

  return (
    <div className="overflow-x-auto">
      <table
        aria-label="Consommation par chantier"
        className="w-full min-w-[560px] border-collapse"
      >
        <thead>
          <tr className="text-left text-xs uppercase tracking-[0.08em] text-muted">
            <Th>Chantier</Th>
            <Th>Matériau</Th>
            <Th className="text-right">Sorties</Th>
            <Th className="text-right">Quantité consommée</Th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => {
            const c = chantiers.get(l.chantierId);
            const m = materiaux.get(l.materiauId);
            return (
              <tr key={`${l.chantierId}-${l.materiauId}`} className="border-t border-line">
                <Td>
                  {c ? <Link to={`/chantiers/${c.id}`}>{c.nom}</Link> : `Chantier ${l.chantierId}`}
                </Td>
                <Td className="font-semibold">{m?.nom ?? `Matériau ${l.materiauId}`}</Td>
                <Td className="text-right font-mono text-[13px]">{l.sorties}</Td>
                <Td className="whitespace-nowrap text-right font-mono">
                  {formatNombre(Math.round(l.quantite * 1000) / 1000)} {m?.unite}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
