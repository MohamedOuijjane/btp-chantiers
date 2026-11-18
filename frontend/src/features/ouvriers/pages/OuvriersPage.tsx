import { Plus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { EtatVide } from '@/components/common/EtatVide';
import { Encart } from '@/components/common/Tableau';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDroits } from '@/features/auth/contexte';
import { cn } from '@/lib/utils';

import { CarteOuvrier } from '../components/CarteOuvrier';
import { OuvrierDialog } from '../components/OuvrierDialog';
import { PlanningOuvrier } from '../components/PlanningOuvrier';
import { useOuvriers } from '../hooks';
import { FILTRES_SPECIALITE } from '../presentation';
import { SPECIALITES, type Specialite } from '../types';

/** Écran 6 de la maquette : équipe (cartes filtrables) et planning de l'ouvrier choisi. */
export function OuvriersPage() {
  const [params, setParams] = useSearchParams();
  const [creation, setCreation] = useState(false);
  const peutCreer = useDroits().peut('ouvriers.ecrire');
  const { data: ouvriers, isPending, error } = useOuvriers();

  // Filtres, recherche (?q= de la topbar) et ouvrier choisi portés par l'URL.
  const brut = params.get('specialite');
  const specialite = brut && brut in SPECIALITES ? (brut as Specialite) : undefined;
  const dispoSeul = params.get('disponibles') === '1';
  const recherche = (params.get('q') ?? '').trim().toLowerCase();

  const definir = (cle: string, valeur?: string) =>
    setParams(
      (p) => {
        if (valeur) p.set(cle, valeur);
        else p.delete(cle);
        return p;
      },
      { replace: true },
    );

  const visibles = useMemo(
    () =>
      (ouvriers ?? []).filter(
        (o) =>
          (!specialite || o.specialite === specialite) &&
          (!dispoSeul || o.disponible) &&
          (!recherche ||
            `${o.prenom} ${o.nom}`.toLowerCase().includes(recherche) ||
            o.cin.toLowerCase().includes(recherche)),
      ),
    [ouvriers, specialite, dispoSeul, recherche],
  );

  const choisi = visibles.find((o) => o.id === Number(params.get('ouvrier'))) ?? visibles[0];

  return (
    <>
      <div role="group" aria-label="Filtrer par spécialité" className="flex flex-wrap gap-2">
        {FILTRES_SPECIALITE.map((f) => {
          const actif = f.specialite === specialite;
          return (
            <button
              key={f.libelle}
              type="button"
              aria-pressed={actif}
              onClick={() => definir('specialite', f.specialite)}
              className={cn(
                'min-h-cible rounded-btn border px-3.5 font-semibold transition-colors',
                actif
                  ? 'border-ink bg-ink text-surface'
                  : 'border-line bg-surface text-ink hover:bg-surface-2',
              )}
            >
              {f.libelle}
            </button>
          );
        })}
      </div>

      <div className="-mt-2 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={dispoSeul}
          onClick={() => definir('disponibles', dispoSeul ? undefined : '1')}
          className="flex min-h-cible items-center gap-2.5 rounded-btn border border-line bg-surface px-3.5 font-semibold text-ink"
        >
          <span
            aria-hidden="true"
            className={cn(
              'relative h-[22px] w-[38px] rounded-full transition-colors',
              dispoSeul ? 'bg-accent' : 'bg-[var(--bar-gris)]',
            )}
          >
            <span
              className={cn(
                'absolute top-[3px] h-4 w-4 rounded-full bg-white transition-[left]',
                dispoSeul ? 'left-[19px]' : 'left-[3px]',
              )}
            />
          </span>
          Disponibles uniquement
        </button>
        {peutCreer && (
          <Button onClick={() => setCreation(true)} className="ml-auto px-[18px] font-bold">
            <Plus size={18} aria-hidden="true" />
            Nouvel ouvrier
          </Button>
        )}
      </div>

      {error ? (
        <Encart>
          {error.status === 503
            ? 'Équipe indisponible pendant la panne du module Ouvriers.'
            : error.message}
        </Encart>
      ) : !isPending && visibles.length === 0 ? (
        <EtatVide
          icone={Users}
          titre="Aucun ouvrier trouvé"
          description="Aucun ouvrier ne correspond à ces filtres ou à cette recherche."
        />
      ) : (
        <div className="flex flex-wrap items-start gap-5">
          <div className="grid min-w-0 flex-[999_1_520px] grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {isPending
              ? Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-[200px] rounded-card" />
                ))
              : visibles.map((o) => (
                  <CarteOuvrier
                    key={o.id}
                    ouvrier={o}
                    choisi={o.id === choisi?.id}
                    onChoisir={() => definir('ouvrier', String(o.id))}
                  />
                ))}
          </div>

          <aside
            aria-labelledby="titre-planning"
            className="carte flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 p-5"
          >
            {choisi ? (
              <>
                <div className="flex flex-col gap-0.5">
                  <span className="surtitre text-muted">Planning</span>
                  <h2 id="titre-planning" className="titre m-0 text-[26px] tracking-normal">
                    {choisi.prenom} {choisi.nom}
                  </h2>
                  <span className="text-muted">
                    {SPECIALITES[choisi.specialite]} ·{' '}
                    {choisi.disponible ? 'disponible' : 'indisponible'}
                  </span>
                </div>
                <PlanningOuvrier ouvrierId={choisi.id} />
                <Link
                  to={`/ouvriers/${choisi.id}`}
                  className="self-start font-semibold text-accent-text"
                >
                  Ouvrir la fiche de {choisi.prenom} {choisi.nom}
                </Link>
              </>
            ) : (
              <Skeleton id="titre-planning" className="h-40" />
            )}
          </aside>
        </div>
      )}

      <OuvrierDialog
        open={creation}
        onOpenChange={setCreation}
        onCree={(o) => definir('ouvrier', String(o.id))}
      />
    </>
  );
}
