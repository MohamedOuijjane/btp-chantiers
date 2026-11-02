import { ClipboardList, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { EtatVide } from '@/components/common/EtatVide';
import { Encart } from '@/components/common/Tableau';
import { Button } from '@/components/ui/button';
import { useChantiers } from '@/features/chantiers/hooks';
import { cn } from '@/lib/utils';

import { TableauTaches } from '../components/TableauTaches';
import { useOuvriersTaches, useTaches } from '../hooks';
import { FILTRES_STATUT } from '../presentation';
import type { StatutTache } from '../types';

const STATUTS = new Set<string>(['A_FAIRE', 'EN_COURS', 'BLOQUEE', 'TERMINEE']);
const CLASSE_SELECT =
  'min-h-cible rounded-btn border border-line bg-surface px-3 font-semibold text-ink';

/** Liste de toutes les tâches : filtres chantier, statut et ouvrier, recherche, tri par date. */
export function TachesPage() {
  const [params, setParams] = useSearchParams();
  const { data: taches, isPending, error } = useTaches();
  const chantiers = useChantiers();
  const equipe = useOuvriersTaches();

  // Filtres, recherche (?q= de la topbar) et tri portés par l'URL.
  const brut = params.get('statut');
  const statut = brut && STATUTS.has(brut) ? (brut as StatutTache) : undefined;
  const chantierId = Number(params.get('chantier')) || undefined;
  const ouvrierId = Number(params.get('ouvrier')) || undefined;
  const recherche = (params.get('q') ?? '').trim().toLowerCase();
  const tri = params.get('tri') === 'desc' ? 'desc' : 'asc';

  const definir = (cle: string, valeur?: string) =>
    setParams(
      (p) => {
        if (valeur) p.set(cle, valeur);
        else p.delete(cle);
        return p;
      },
      { replace: true },
    );

  const parChantier = useMemo(
    () => new Map((chantiers.data ?? []).map((c) => [c.id, c])),
    [chantiers.data],
  );

  // Filtres hors statut : les compteurs des boutons de statut en tiennent compte.
  const filtrees = useMemo(
    () =>
      (taches ?? []).filter(
        (t) =>
          (!chantierId || t.chantierId === chantierId) &&
          (!ouvrierId || t.ouvrierIds.includes(ouvrierId)) &&
          (!recherche ||
            t.titre.toLowerCase().includes(recherche) ||
            (parChantier.get(t.chantierId)?.nom.toLowerCase().includes(recherche) ?? false)),
      ),
    [taches, chantierId, ouvrierId, recherche, parChantier],
  );
  const visibles = useMemo(
    () =>
      filtrees
        .filter((t) => !statut || t.statut === statut)
        .sort((a, b) =>
          tri === 'asc'
            ? a.dateDebut.localeCompare(b.dateDebut)
            : b.dateDebut.localeCompare(a.dateDebut),
        ),
    [filtrees, statut, tri],
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap gap-2.5">
          {FILTRES_STATUT.map((f) => {
            const actif = f.statut === statut;
            return (
              <button
                key={f.libelle}
                type="button"
                aria-pressed={actif}
                onClick={() => definir('statut', f.statut)}
                className={cn(
                  'flex min-h-cible items-center gap-2 rounded-btn border px-3.5 font-semibold transition-colors',
                  actif
                    ? 'border-ink bg-ink text-surface'
                    : 'border-line bg-surface text-ink hover:bg-surface-2',
                )}
              >
                {f.libelle}
                <span className="font-mono text-[13px] opacity-80">
                  {isPending
                    ? '…'
                    : filtrees.filter((t) => !f.statut || t.statut === f.statut).length}
                </span>
              </button>
            );
          })}
        </div>
        <Button asChild className="ml-auto px-[18px] font-bold">
          <Link to="/taches/nouvelle" className="no-underline">
            <Plus size={18} aria-hidden="true" />
            Nouvelle tâche
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtre-chantier" className="surtitre text-muted">
            Chantier
          </label>
          <select
            id="filtre-chantier"
            className={CLASSE_SELECT}
            value={chantierId ?? ''}
            onChange={(e) => definir('chantier', e.target.value)}
          >
            <option value="">Tous les chantiers</option>
            {chantiers.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtre-ouvrier" className="surtitre text-muted">
            Ouvrier
          </label>
          <select
            id="filtre-ouvrier"
            className={CLASSE_SELECT}
            value={ouvrierId ?? ''}
            disabled={!equipe.sourceDisponible}
            onChange={(e) => definir('ouvrier', e.target.value)}
          >
            <option value="">
              {equipe.sourceDisponible ? 'Tous les ouvriers' : 'Ouvriers indisponibles'}
            </option>
            {equipe.ouvriers?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.prenom} {o.nom}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <Encart>
          {error.status === 503
            ? 'Liste indisponible pendant la panne du module Tâches.'
            : error.message}
        </Encart>
      ) : !isPending && visibles.length === 0 ? (
        <EtatVide
          icone={ClipboardList}
          titre={taches?.length ? 'Aucune tâche trouvée' : 'Aucune tâche'}
          description={
            taches?.length
              ? 'Aucune tâche ne correspond à ces filtres ou à cette recherche.'
              : 'Planifiez la première tâche depuis la fiche d’un chantier.'
          }
        />
      ) : (
        <TableauTaches
          taches={visibles}
          chargement={isPending}
          chantiers={parChantier}
          tri={tri}
          onTri={() => definir('tri', tri === 'asc' ? 'desc' : undefined)}
        />
      )}
    </>
  );
}
