import { ArrowLeft, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useTitrePage } from '@/app/titre';
import { EtatVide } from '@/components/common/EtatVide';
import { Pastille } from '@/components/common/Pastille';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRetirerOuvrier } from '@/features/taches/hooks';
import { formatDate, formatTelephone, initiales } from '@/lib/format';
import { notifierErreur } from '@/lib/erreurs';

import { AffecterDialog } from '../components/AffecterDialog';
import { OuvrierDialog } from '../components/OuvrierDialog';
import { PlanningOuvrier } from '../components/PlanningOuvrier';
import { SupprimerOuvrierDialog } from '../components/SupprimerOuvrierDialog';
import { useModifierOuvrier, useOuvrier, usePlanning } from '../hooks';
import { SPECIALITES, type TachePlanning } from '../types';

type Dialogue = 'modifier' | 'affecter' | 'supprimer' | null;

/** Fiche d'un ouvrier : identité, disponibilité, affectations et planning. */
export function OuvrierFichePage() {
  const id = Number(useParams().id);
  const { data: o, error } = useOuvrier(id);
  const planning = usePlanning(id);
  const modifier = useModifierOuvrier();
  const [dialogue, setDialogue] = useState<Dialogue>(null);
  const retirer = useRetirerOuvrier();
  useTitrePage(o ? `${o.prenom} ${o.nom}` : undefined);

  const retour = (
    <Link
      to="/ouvriers"
      className="flex min-h-cible items-center gap-2 self-start px-1 font-semibold text-accent-text no-underline"
    >
      <ArrowLeft size={18} aria-hidden="true" />
      Toute l’équipe
    </Link>
  );

  if (error) {
    return (
      <>
        {retour}
        <EtatVide
          icone={Users}
          titre={error.status === 404 ? 'Ouvrier introuvable' : 'Ouvrier indisponible'}
          description={
            error.status === 404 ? 'Cet ouvrier n’existe pas ou a été supprimé.' : error.message
          }
        />
      </>
    );
  }

  const basculer = () =>
    o &&
    modifier.mutate(
      { id: o.id, donnees: { disponible: !o.disponible } },
      {
        onSuccess: (x) =>
          toast.success(
            `${x.prenom} ${x.nom} est ${x.disponible ? 'disponible' : 'indisponible'}.`,
          ),
        onError: notifierErreur,
      },
    );

  const retirerDe = (t: TachePlanning) =>
    o &&
    retirer.mutate(
      { tacheId: t.id, ouvrierId: o.id },
      {
        onSuccess: () => toast.success(`${o.prenom} ${o.nom} retiré de « ${t.titre} ».`),
        onError: notifierErreur,
      },
    );

  // Disponibilités déduites du planning (tâches non terminées).
  const p = planning.data;
  const actives = p?.sourceDisponible ? p.taches.filter((t) => t.statut !== 'TERMINEE') : undefined;
  const occupeJusquau = actives?.reduce<string | null>(
    (max, t) => (!max || t.dateFin > max ? t.dateFin : max),
    null,
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {retour}
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            className="bg-surface"
            disabled={!o}
            onClick={() => setDialogue('modifier')}
          >
            <Pencil size={16} aria-hidden="true" />
            Modifier
          </Button>
          <Button
            variant="outline"
            className="bg-surface"
            disabled={!o || modifier.isPending}
            onClick={basculer}
          >
            {o?.disponible ? 'Rendre indisponible' : 'Rendre disponible'}
          </Button>
          <Button
            variant="outline"
            className="bg-surface"
            disabled={!o}
            onClick={() => setDialogue('supprimer')}
          >
            <Trash2 size={16} aria-hidden="true" />
            Supprimer
          </Button>
          <Button
            className="px-[18px] font-bold"
            disabled={!o}
            onClick={() => setDialogue('affecter')}
          >
            <UserPlus size={18} aria-hidden="true" />
            Affecter à une tâche
          </Button>
        </div>
      </div>

      <section aria-label="Identité de l’ouvrier" className="carte flex flex-col gap-[18px] p-6">
        {o ? (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <span
                aria-hidden="true"
                className="flex h-16 w-16 flex-none items-center justify-center rounded-full border border-line bg-surface-2 text-xl font-bold"
              >
                {initiales(o.prenom, o.nom)}
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="titre m-0 text-[34px] leading-none tracking-normal">
                  {o.prenom} {o.nom}
                </h2>
                <span className="text-muted">{SPECIALITES[o.specialite]}</span>
              </div>
              <Pastille ton={o.disponible ? 'vert' : 'gris'} className="ml-auto">
                {o.disponible ? 'Disponible' : 'Indisponible'}
              </Pastille>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
              <Indicateur libelle="CIN">{o.cin}</Indicateur>
              <Indicateur libelle="Téléphone">{formatTelephone(o.telephone)}</Indicateur>
              <Indicateur libelle="Tâches actives">{actives ? actives.length : '—'}</Indicateur>
              <Indicateur libelle="Occupé jusqu’au">
                {!actives ? '—' : occupeJusquau ? formatDate(occupeJusquau) : 'Libre'}
              </Indicateur>
            </div>
          </>
        ) : (
          <>
            <Skeleton className="h-16 w-80 max-w-full" />
            <Skeleton className="h-16" />
          </>
        )}
      </section>

      <section aria-labelledby="titre-planning-fiche" className="carte flex flex-col gap-3.5 p-5">
        <h2 id="titre-planning-fiche" className="titre m-0 text-xl tracking-[0.04em]">
          Planning et affectations
        </h2>
        <PlanningOuvrier ouvrierId={id} onRetirer={retirerDe} />
      </section>

      {o && (
        <>
          <OuvrierDialog
            open={dialogue === 'modifier'}
            onOpenChange={(v) => setDialogue(v ? 'modifier' : null)}
            ouvrier={o}
          />
          <AffecterDialog
            open={dialogue === 'affecter'}
            onOpenChange={(v) => setDialogue(v ? 'affecter' : null)}
            ouvrier={o}
          />
          <SupprimerOuvrierDialog
            open={dialogue === 'supprimer'}
            onOpenChange={(v) => setDialogue(v ? 'supprimer' : null)}
            ouvrier={o}
          />
        </>
      )}
    </>
  );
}

function Indicateur({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-btn bg-surface-2 px-3.5 py-3">
      <span className="surtitre text-muted">{libelle}</span>
      <span className="font-mono">{children}</span>
    </div>
  );
}
