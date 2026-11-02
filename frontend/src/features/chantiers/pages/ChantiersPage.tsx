import { Building2, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { BarreProgression } from '@/components/common/BarreProgression';
import { EtatVide } from '@/components/common/EtatVide';
import { StatutBadge } from '@/components/common/StatutBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatMontant } from '@/lib/format';
import { cn } from '@/lib/utils';

import { ChantierDialog } from '../components/ChantierDialog';
import { Td, Th } from '../components/tableau';
import { useAvancementChantier, useChantiers } from '../hooks';
import { FILTRES, refChantier, tonAvancement } from '../presentation';
import type { Chantier, StatutChantier } from '../types';

const STATUTS = new Set<string>(['PLANIFIE', 'EN_COURS', 'SUSPENDU', 'TERMINE']);

/** Écran 3 de la maquette : liste des chantiers. */
export function ChantiersPage() {
  const [params, setParams] = useSearchParams();
  const [creation, setCreation] = useState(false);
  const { data: chantiers, isPending, error } = useChantiers();

  // Filtre (?statut=) et recherche de la topbar (?q=) sont portés par l'URL.
  const brut = params.get('statut');
  const statut = brut && STATUTS.has(brut) ? (brut as StatutChantier) : undefined;
  const recherche = (params.get('q') ?? '').trim().toLowerCase();

  const choisir = (s?: StatutChantier) =>
    setParams(
      (p) => {
        if (s) p.set('statut', s);
        else p.delete('statut');
        return p;
      },
      { replace: true },
    );

  const visibles = useMemo(
    () =>
      (chantiers ?? []).filter(
        (c) =>
          (!statut || c.statut === statut) &&
          (!recherche ||
            c.nom.toLowerCase().includes(recherche) ||
            c.client.toLowerCase().includes(recherche)),
      ),
    [chantiers, statut, recherche],
  );

  const compte = (s?: StatutChantier) =>
    (chantiers ?? []).filter((c) => !s || c.statut === s).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap gap-2.5">
          {FILTRES.map((f) => {
            const actif = f.statut === statut;
            return (
              <button
                key={f.libelle}
                type="button"
                aria-pressed={actif}
                onClick={() => choisir(f.statut)}
                className={cn(
                  'flex min-h-cible items-center gap-2 rounded-btn border px-3.5 font-semibold transition-colors',
                  actif
                    ? 'border-ink bg-ink text-surface'
                    : 'border-line bg-surface text-ink hover:bg-surface-2',
                )}
              >
                {f.libelle}
                <span className="font-mono text-[13px] opacity-80">
                  {isPending ? '…' : compte(f.statut)}
                </span>
              </button>
            );
          })}
        </div>
        <Button onClick={() => setCreation(true)} className="ml-auto px-[18px] font-bold">
          <Plus size={18} aria-hidden="true" />
          Nouveau chantier
        </Button>
      </div>

      {error ? (
        <EtatVide icone={Building2} titre="Chantiers indisponibles" description={error.message} />
      ) : !isPending && visibles.length === 0 ? (
        <EtatVide
          icone={Building2}
          titre={chantiers?.length ? 'Aucun chantier trouvé' : 'Aucun chantier'}
          description={
            chantiers?.length
              ? 'Aucun chantier ne correspond à ce filtre ou à cette recherche.'
              : 'Créez le premier chantier de l’entreprise.'
          }
          action={
            !chantiers?.length && (
              <Button onClick={() => setCreation(true)} className="font-bold">
                Créer le premier chantier
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="bg-surface-2 text-left text-xs uppercase tracking-[0.08em] text-muted">
                <Th>Réf.</Th>
                <Th>Chantier</Th>
                <Th>Période</Th>
                <Th className="text-right">Budget</Th>
                <Th className="w-[200px]">Avancement</Th>
                <Th>Statut</Th>
              </tr>
            </thead>
            <tbody>
              {isPending
                ? Array.from({ length: 6 }, (_, i) => <LigneSquelette key={i} />)
                : visibles.map((c) => <LigneChantier key={c.id} chantier={c} />)}
            </tbody>
          </table>
        </div>
      )}

      <ChantierDialog open={creation} onOpenChange={setCreation} />
    </>
  );
}

function LigneChantier({ chantier: c }: { chantier: Chantier }) {
  const avancement = useAvancementChantier(c.id);
  const valeur = avancement.data?.avancementGlobal;

  return (
    <tr className="border-t border-line">
      <Td className="whitespace-nowrap font-mono text-[13px] text-muted">{refChantier(c)}</Td>
      <Td>
        <Link
          to={`/chantiers/${c.id}`}
          className="font-bold text-ink underline decoration-line underline-offset-4 hover:decoration-accent"
        >
          {c.nom}
        </Link>
        <div className="mt-0.5 text-[13px] text-muted">
          {c.client} · {c.adresse}
        </div>
      </Td>
      <Td className="whitespace-nowrap text-sm">
        {formatDate(c.dateDebut)} → {formatDate(c.dateFinPrevue)}
      </Td>
      <Td className="whitespace-nowrap text-right font-mono text-[13px]">
        {formatMontant(c.budget)}
      </Td>
      <Td>
        {avancement.isPending ? (
          <Skeleton className="h-2" />
        ) : valeur === null || valeur === undefined ? (
          <span className="text-sm text-muted">Non disponible</span>
        ) : (
          <div className="flex items-center gap-2.5">
            <BarreProgression
              valeur={valeur}
              ton={tonAvancement(c.statut, valeur)}
              taille="sm"
              libelle={`Avancement de ${c.nom}`}
            />
            <span className="w-11 flex-none text-right font-mono text-[13px]">{valeur} %</span>
          </div>
        )}
      </Td>
      <Td>
        <StatutBadge statut={c.statut} />
      </Td>
    </tr>
  );
}

function LigneSquelette() {
  return (
    <tr className="border-t border-line" aria-hidden="true">
      <Td>
        <Skeleton className="h-4 w-24" />
      </Td>
      <Td>
        <Skeleton className="mb-1.5 h-4 w-48" />
        <Skeleton className="h-3 w-64" />
      </Td>
      <Td>
        <Skeleton className="h-4 w-44" />
      </Td>
      <Td>
        <Skeleton className="ml-auto h-4 w-28" />
      </Td>
      <Td>
        <Skeleton className="h-2" />
      </Td>
      <Td>
        <Skeleton className="h-6 w-20 rounded-full" />
      </Td>
    </tr>
  );
}
