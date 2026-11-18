import { ArrowDown, ArrowUp } from 'lucide-react';
import { Link } from 'react-router-dom';

import { BarreProgression } from '@/components/common/BarreProgression';
import { StatutBadge } from '@/components/common/StatutBadge';
import { Td, Th } from '@/components/common/Tableau';
import { Skeleton } from '@/components/ui/skeleton';
import type { Chantier } from '@/features/chantiers/types';
import { formatDateCourte } from '@/lib/format';

import { useOuvriersTaches } from '../hooks';
import { tonTache } from '../presentation';
import type { Tache } from '../types';

import { ActionStatut } from './ActionStatut';
import { EquipeTache } from './EquipeTache';

type Props = {
  taches?: Tache[];
  chargement: boolean;
  /** Affiche la colonne « Chantier » (liste générale) ; masquée dans la fiche chantier. */
  chantiers?: Map<number, Chantier>;
  /** Tri par date de début, piloté par la page. */
  tri?: 'asc' | 'desc';
  onTri?: () => void;
  /** Chantier clôturé : actions de statut désactivées. */
  lectureSeule?: boolean;
};

/** Tableau des tâches, partagé par la liste des tâches et l'onglet Tâches de la fiche chantier. */
export function TableauTaches({
  taches,
  chargement,
  chantiers,
  tri,
  onTri,
  lectureSeule = false,
}: Props) {
  const { parId } = useOuvriersTaches();
  const avecChantier = Boolean(chantiers);
  const nbColonnes = avecChantier ? 7 : 6;

  return (
    <div className="relative overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full min-w-[920px] border-collapse">
        <thead>
          <tr className="bg-surface-2 text-left text-xs uppercase tracking-[0.08em] text-muted">
            <Th>Tâche</Th>
            {avecChantier && <Th>Chantier</Th>}
            <Th aria-sort={tri ? (tri === 'asc' ? 'ascending' : 'descending') : undefined}>
              {onTri ? (
                <button
                  type="button"
                  onClick={onTri}
                  className="-mx-1 inline-flex items-center gap-1 rounded-btn px-1 uppercase tracking-[0.08em]"
                  aria-label={`Trier par date de début (${tri === 'asc' ? 'plus récentes d’abord' : 'plus anciennes d’abord'})`}
                >
                  Période
                  {tri === 'asc' ? (
                    <ArrowUp size={14} aria-hidden="true" />
                  ) : (
                    <ArrowDown size={14} aria-hidden="true" />
                  )}
                </button>
              ) : (
                'Période'
              )}
            </Th>
            <Th>Ouvriers</Th>
            <Th className="w-[180px]">Avancement</Th>
            <Th>Statut</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {chargement
            ? Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-t border-line" aria-hidden="true">
                  {Array.from({ length: nbColonnes }, (_, j) => (
                    <Td key={j}>
                      <Skeleton className="h-4" />
                    </Td>
                  ))}
                </tr>
              ))
            : taches?.map((t) => {
                const chantier = chantiers?.get(t.chantierId);
                return (
                  <tr key={t.id} className="border-t border-line">
                    <Td>
                      <Link
                        to={`/taches/${t.id}`}
                        className="font-bold text-ink underline decoration-line underline-offset-4 hover:decoration-accent"
                      >
                        {t.titre}
                      </Link>
                      {t.statut === 'BLOQUEE' && t.motif && (
                        <div className="mt-1 text-[13px] text-[var(--badge-rouge-fg)]">
                          Motif : {t.motif}
                        </div>
                      )}
                    </Td>
                    {avecChantier && (
                      <Td className="text-sm text-muted">
                        {chantier ? (
                          <Link to={`/chantiers/${chantier.id}`} className="text-muted">
                            {chantier.nom}
                          </Link>
                        ) : (
                          `Chantier ${t.chantierId}`
                        )}
                      </Td>
                    )}
                    <Td className="whitespace-nowrap font-mono text-[13px]">
                      {formatDateCourte(t.dateDebut)} → {formatDateCourte(t.dateFin)}
                    </Td>
                    <Td>
                      <EquipeTache ouvrierIds={t.ouvrierIds} parId={parId} />
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <BarreProgression
                          valeur={t.avancement}
                          ton={tonTache(t)}
                          taille="sm"
                          libelle={`Avancement de ${t.titre}`}
                        />
                        <span className="w-11 flex-none text-right font-mono text-[13px]">
                          {t.avancement} %
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <StatutBadge statut={t.statut} />
                    </Td>
                    <Td className="text-right">
                      <ActionStatut
                        tache={t}
                        lectureSeule={lectureSeule || chantier?.statut === 'TERMINE'}
                      />
                    </Td>
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
