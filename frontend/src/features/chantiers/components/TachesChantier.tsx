import { Link } from 'react-router-dom';

import type { ApiError } from '@/api/errors';
import { BarreProgression } from '@/components/common/BarreProgression';
import { EtatVide } from '@/components/common/EtatVide';
import { StatutBadge } from '@/components/common/StatutBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOuvriers } from '@/features/ouvriers/hooks';
import type { Tache } from '@/features/taches/types';
import { formatDateCourte, initiales } from '@/lib/format';

import { Encart, Th, Td } from './tableau';

type Props = {
  chantierId: number;
  taches?: Tache[];
  chargement: boolean;
  erreur: ApiError | null;
  lectureSeule: boolean;
};

const tonTache = (t: Tache) =>
  t.statut === 'BLOQUEE' ? 'rouge' : t.avancement >= 100 ? 'vert' : 'accent';

/** Onglet « Tâches » de la fiche chantier. */
export function TachesChantier({ chantierId, taches, chargement, erreur, lectureSeule }: Props) {
  const ouvriers = useOuvriers();
  const parId = new Map((ouvriers.data ?? []).map((o) => [o.id, o]));

  if (erreur) {
    return (
      <Encart>
        {erreur.status === 503
          ? 'Liste indisponible pendant la panne du module Tâches.'
          : erreur.message}
      </Encart>
    );
  }

  if (!chargement && taches?.length === 0) {
    return (
      <EtatVide
        titre="Aucune tâche planifiée"
        description="Planifiez la première tâche de ce chantier : le module vérifiera le chantier, les ouvriers et le stock avant de l’enregistrer."
        action={
          !lectureSeule && (
            <Button asChild className="font-bold">
              <Link to={`/chantiers/${chantierId}/taches/nouvelle`} className="no-underline">
                Planifier une tâche
              </Link>
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full min-w-[820px] border-collapse">
        <thead>
          <tr className="bg-surface-2 text-left text-xs uppercase tracking-[0.08em] text-muted">
            <Th>Tâche</Th>
            <Th>Période</Th>
            <Th>Ouvriers</Th>
            <Th className="w-[180px]">Avancement</Th>
            <Th>Statut</Th>
          </tr>
        </thead>
        <tbody>
          {chargement
            ? Array.from({ length: 4 }, (_, i) => (
                <tr key={i} className="border-t border-line">
                  {Array.from({ length: 5 }, (_, j) => (
                    <Td key={j}>
                      <Skeleton className="h-4" />
                    </Td>
                  ))}
                </tr>
              ))
            : taches?.map((t) => (
                <tr key={t.id} className="border-t border-line">
                  <Td>
                    <span className="font-bold">{t.titre}</span>
                    {t.statut === 'BLOQUEE' && t.motif && (
                      <div className="mt-1 text-[13px] text-[var(--badge-rouge-fg)]">
                        Motif : {t.motif}
                      </div>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap font-mono text-[13px]">
                    {formatDateCourte(t.dateDebut)} → {formatDateCourte(t.dateFin)}
                  </Td>
                  <Td>
                    <ul className="m-0 flex list-none gap-1 p-0">
                      {t.ouvrierIds.map((id) => {
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
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
