import { ArrowDownUp, Package } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

import { EtatVide } from '@/components/common/EtatVide';
import { Encart } from '@/components/common/Tableau';
import { Button } from '@/components/ui/button';
import { useChantiers } from '@/features/chantiers/hooks';
import { cn } from '@/lib/utils';

import { ConsommationChantiers } from '../components/ConsommationChantiers';
import { MateriauDialog } from '../components/MateriauDialog';
import { MouvementDialog } from '../components/MouvementDialog';
import { MouvementsRecents } from '../components/MouvementsRecents';
import { TableauStock } from '../components/TableauStock';
import { useMateriaux, useMouvements } from '../hooks';

/** Écran 7 de la maquette : stock, alertes de seuil, mouvements et consommation par chantier. */
export function MateriauxPage() {
  const [params, setParams] = useSearchParams();
  const [dialogue, setDialogue] = useState<'materiau' | 'mouvement' | null>(null);
  const { data: materiaux, isPending, error } = useMateriaux();
  const mouvements = useMouvements();
  const chantiers = useChantiers();

  const alerteSeule = params.get('alerte') === '1';
  const recherche = (params.get('q') ?? '').trim().toLowerCase();
  const chantierFiltre = Number(params.get('chantier')) || undefined;

  const definir = (cle: string, valeur?: string) =>
    setParams(
      (p) => {
        if (valeur) p.set(cle, valeur);
        else p.delete(cle);
        return p;
      },
      { replace: true },
    );

  const parMateriau = useMemo(() => new Map((materiaux ?? []).map((m) => [m.id, m])), [materiaux]);
  const parChantier = useMemo(
    () => new Map((chantiers.data ?? []).map((c) => [c.id, c])),
    [chantiers.data],
  );

  const visibles = (materiaux ?? []).filter(
    (m) =>
      (!alerteSeule || m.enAlerte) &&
      (!recherche ||
        m.nom.toLowerCase().includes(recherche) ||
        m.reference.toLowerCase().includes(recherche)),
  );
  const mvts = (mouvements.data ?? []).filter(
    (mv) => !chantierFiltre || mv.chantierId === chantierFiltre,
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex min-h-cible items-center gap-2 rounded-btn border border-line bg-surface px-3 text-sm text-muted">
          <span className="rounded-[3px] bg-accent px-1.5 py-0.5 text-xs font-bold text-accent-on">
            SOAP
          </span>
          Service Matériaux · <span className="font-mono text-ink">/ws/materiaux.wsdl</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={alerteSeule}
          onClick={() => definir('alerte', alerteSeule ? undefined : '1')}
          className="flex min-h-cible items-center gap-2.5 rounded-btn border border-line bg-surface px-3.5 font-semibold text-ink"
        >
          <span
            aria-hidden="true"
            className={cn(
              'relative h-[22px] w-[38px] rounded-full transition-colors',
              alerteSeule ? 'bg-accent' : 'bg-[var(--bar-gris)]',
            )}
          >
            <span
              className={cn(
                'absolute top-[3px] h-4 w-4 rounded-full bg-white transition-[left]',
                alerteSeule ? 'left-[19px]' : 'left-[3px]',
              )}
            />
          </span>
          En alerte uniquement
        </button>
        <div className="ml-auto flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            className="bg-surface"
            disabled={!materiaux}
            onClick={() => setDialogue('materiau')}
          >
            Nouveau matériau
          </Button>
          <Button
            className="px-[18px] font-bold"
            disabled={!materiaux}
            onClick={() => setDialogue('mouvement')}
          >
            <ArrowDownUp size={18} aria-hidden="true" />
            Entrée / sortie de stock
          </Button>
        </div>
      </div>

      {error ? (
        <Encart>
          {error.status === 503
            ? 'Stock indisponible pendant la panne du module Matériaux (service SOAP).'
            : error.message}
        </Encart>
      ) : !isPending && visibles.length === 0 ? (
        <EtatVide
          icone={Package}
          titre={alerteSeule ? 'Aucun matériau en alerte' : 'Aucun matériau trouvé'}
          description={
            alerteSeule
              ? 'Tous les stocks sont au-dessus de leur seuil.'
              : 'Aucun matériau ne correspond à cette recherche.'
          }
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          <TableauStock materiaux={visibles} chargement={isPending} />
          <p className="m-0 text-sm text-muted">
            Le trait vertical de la jauge marque le seuil d’alerte.
          </p>
        </div>
      )}

      {!error && (
        <>
          <Carte
            titre="Derniers mouvements"
            id="titre-mouvements"
            action={
              <div className="flex items-center gap-2">
                <label htmlFor="filtre-mvt-chantier" className="text-sm text-muted">
                  Chantier
                </label>
                <select
                  id="filtre-mvt-chantier"
                  value={chantierFiltre ?? ''}
                  onChange={(e) => definir('chantier', e.target.value)}
                  className="min-h-cible rounded-btn border border-line bg-surface px-3 text-ink"
                >
                  <option value="">Tous les chantiers</option>
                  {chantiers.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            {mouvements.error ? (
              <Encart>{mouvements.error.message}</Encart>
            ) : (
              <MouvementsRecents
                mouvements={mvts}
                chargement={mouvements.isPending}
                materiaux={parMateriau}
                chantiers={parChantier}
              />
            )}
          </Carte>

          <Carte titre="Consommation par chantier" id="titre-consommation">
            {mouvements.data && (
              <ConsommationChantiers
                mouvements={mvts}
                materiaux={parMateriau}
                chantiers={parChantier}
              />
            )}
          </Carte>
        </>
      )}

      {materiaux && (
        <>
          <MateriauDialog
            open={dialogue === 'materiau'}
            onOpenChange={(o) => setDialogue(o ? 'materiau' : null)}
          />
          <MouvementDialog
            open={dialogue === 'mouvement'}
            onOpenChange={(o) => setDialogue(o ? 'mouvement' : null)}
            materiaux={materiaux}
            chantiers={chantiers.data ?? []}
          />
        </>
      )}
    </>
  );
}

function Carte({
  titre,
  id,
  action,
  children,
}: {
  titre: string;
  id: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="carte flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="titre m-0 text-[22px]">
          {titre}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
