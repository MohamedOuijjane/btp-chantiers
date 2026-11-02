import { Pastille } from '@/components/common/Pastille';
import { Td, Th } from '@/components/common/Tableau';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNombre } from '@/lib/format';

import type { Materiau } from '../types';

import { JaugeStock } from './JaugeStock';

type Props = { materiaux?: Materiau[]; chargement: boolean };

/** Tableau du stock (écran 7) : référence, stock, seuil, jauge et état d'alerte. */
export function TableauStock({ materiaux, chargement }: Props) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full min-w-[860px] border-collapse">
        <thead>
          <tr className="bg-surface-2 text-left text-xs uppercase tracking-[0.08em] text-muted">
            <Th>Réf.</Th>
            <Th>Matériau</Th>
            <Th className="text-right">Stock</Th>
            <Th className="text-right">Seuil</Th>
            <Th className="w-[240px]">Niveau</Th>
            <Th>État</Th>
          </tr>
        </thead>
        <tbody>
          {chargement
            ? Array.from({ length: 6 }, (_, i) => (
                <tr key={i} className="border-t border-line" aria-hidden="true">
                  {Array.from({ length: 6 }, (_, j) => (
                    <Td key={j}>
                      <Skeleton className="h-4" />
                    </Td>
                  ))}
                </tr>
              ))
            : materiaux?.map((m) => (
                <tr key={m.id} className="border-t border-line">
                  <Td className="whitespace-nowrap font-mono text-[13px] text-muted">
                    {m.reference}
                  </Td>
                  <Td className="font-bold">{m.nom}</Td>
                  <Td className="whitespace-nowrap text-right font-mono">
                    {formatNombre(m.stock)} {m.unite}
                  </Td>
                  <Td className="whitespace-nowrap text-right font-mono text-muted">
                    {formatNombre(m.seuilAlerte)} {m.unite}
                  </Td>
                  <Td>
                    <JaugeStock materiau={m} />
                  </Td>
                  <Td>
                    <Pastille ton={m.enAlerte ? 'rouge' : 'vert'}>
                      {m.enAlerte ? 'En alerte' : 'Suffisant'}
                    </Pastille>
                  </Td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
