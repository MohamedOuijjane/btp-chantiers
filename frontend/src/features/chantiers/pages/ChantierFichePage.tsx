import { ArrowLeft, Building2, Lock, Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useTitrePage } from '@/app/titre';
import { EtatVide } from '@/components/common/EtatVide';
import { StatutBadge } from '@/components/common/StatutBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMouvements } from '@/features/materiaux/hooks';
import { useTaches } from '@/features/taches/hooks';
import { formatDate, formatMontant } from '@/lib/format';

import { AnneauAvancement } from '../components/AnneauAvancement';
import { ChantierDialog } from '../components/ChantierDialog';
import { CloturerDialog } from '../components/CloturerDialog';
import { MouvementsChantier } from '../components/MouvementsChantier';
import { TachesChantier } from '../components/TachesChantier';
import { useAvancementChantier, useChantier } from '../hooks';
import { refChantier, tonAvancement } from '../presentation';

/** Écran 4 de la maquette : fiche d'un chantier. */
export function ChantierFichePage() {
  const id = Number(useParams().id);
  const valide = Number.isInteger(id) && id > 0;

  const chantier = useChantier(id);
  const avancement = useAvancementChantier(id, valide && chantier.isSuccess);
  const taches = useTaches({ chantierId: id });
  const mouvements = useMouvements({ chantierId: id });
  const [dialogue, setDialogue] = useState<'modifier' | 'cloturer' | null>(null);

  const c = chantier.data;
  useTitrePage(c?.nom);

  const retour = (
    <Link
      to="/chantiers"
      className="flex min-h-cible items-center gap-2 px-1 font-semibold text-accent-text no-underline"
    >
      <ArrowLeft size={18} aria-hidden="true" />
      Tous les chantiers
    </Link>
  );

  if (!valide || chantier.error?.status === 404) {
    return (
      <>
        {retour}
        <EtatVide
          icone={Building2}
          titre="Chantier introuvable"
          description="Ce chantier n'existe pas ou a été supprimé."
        />
      </>
    );
  }
  if (chantier.error) {
    return (
      <>
        {retour}
        <EtatVide
          icone={Building2}
          titre="Chantier indisponible"
          description={chantier.error.message}
        />
      </>
    );
  }

  const termine = c?.statut === 'TERMINE';
  const av = avancement.data;
  const valeurAv = av?.sourceDisponible ? av.avancementGlobal : null;
  const nbTaches = taches.data?.length;
  const nbMouvements = mouvements.data?.length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {retour}
        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="outline"
            className="bg-surface"
            disabled={!c || termine}
            onClick={() => setDialogue('modifier')}
          >
            Modifier
          </Button>
          <Button
            variant="outline"
            className="bg-surface"
            disabled={!c || termine}
            onClick={() => setDialogue('cloturer')}
          >
            Clôturer le chantier
          </Button>
          {c && !termine ? (
            <Button asChild className="px-[18px] font-bold">
              <Link to={`/chantiers/${id}/taches/nouvelle`} className="no-underline">
                <Plus size={18} aria-hidden="true" />
                Nouvelle tâche
              </Link>
            </Button>
          ) : (
            <Button disabled className="px-[18px] font-bold">
              <Plus size={18} aria-hidden="true" />
              Nouvelle tâche
            </Button>
          )}
        </div>
      </div>

      {termine && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-btn bg-[var(--badge-vert-bg)] px-[18px] py-3.5 text-[var(--badge-vert-fg)]"
        >
          <Lock size={20} aria-hidden="true" className="flex-none" />
          <span>
            <strong>Chantier terminé.</strong> Il est en lecture seule : aucune modification ni
            nouvelle tâche n’est possible.
          </span>
        </div>
      )}

      <section aria-label="Informations du chantier" className="carte flex flex-wrap gap-6 p-6">
        <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-[18px]">
          {c ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-[13px] text-muted">{refChantier(c)}</span>
                <StatutBadge statut={c.statut} />
              </div>
              <h2 className="titre m-0 text-[40px] leading-none tracking-normal">{c.nom}</h2>
              <span className="text-muted">
                {c.client} · {c.adresse}
              </span>
            </>
          ) : (
            <>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-10 w-80 max-w-full" />
              <Skeleton className="h-4 w-64" />
            </>
          )}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
            <Indicateur libelle="Début" valeur={c && formatDate(c.dateDebut)} />
            <Indicateur libelle="Fin prévue" valeur={c && formatDate(c.dateFinPrevue)} />
            <Indicateur libelle="Budget" valeur={c && formatMontant(c.budget)} />
            <Indicateur libelle="Tâches" valeur={taches.error ? '—' : nbTaches} />
          </div>
        </div>
        {c && avancement.isSuccess ? (
          <AnneauAvancement
            valeur={valeurAv ?? null}
            ton={tonAvancement(c.statut, valeurAv ?? 0)}
          />
        ) : (
          <div className="flex flex-[1_1_200px] items-center justify-center">
            <Skeleton className="h-[148px] w-[148px] rounded-full" />
          </div>
        )}
      </section>

      <Tabs defaultValue="taches" className="flex flex-col gap-6">
        <TabsList aria-label="Contenu du chantier">
          <TabsTrigger value="taches">
            Tâches{nbTaches !== undefined && ` · ${nbTaches}`}
          </TabsTrigger>
          <TabsTrigger value="materiaux">
            Matériaux consommés{nbMouvements !== undefined && ` · ${nbMouvements}`}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="taches">
          <TachesChantier
            chantierId={id}
            taches={taches.data}
            chargement={taches.isPending}
            erreur={taches.error}
            lectureSeule={termine}
          />
        </TabsContent>
        <TabsContent value="materiaux">
          <MouvementsChantier
            mouvements={mouvements.data}
            chargement={mouvements.isPending}
            erreur={mouvements.error}
          />
        </TabsContent>
      </Tabs>

      {c && (
        <>
          <ChantierDialog
            open={dialogue === 'modifier'}
            onOpenChange={(o) => setDialogue(o ? 'modifier' : null)}
            chantier={c}
          />
          <CloturerDialog
            open={dialogue === 'cloturer'}
            onOpenChange={(o) => setDialogue(o ? 'cloturer' : null)}
            chantier={c}
          />
        </>
      )}
    </>
  );
}

function Indicateur({ libelle, valeur }: { libelle: string; valeur: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-btn bg-surface-2 px-3.5 py-3">
      <span className="surtitre text-muted">{libelle}</span>
      {valeur === undefined ? (
        <Skeleton className="h-5 w-24" />
      ) : (
        <span className="font-mono">{valeur}</span>
      )}
    </div>
  );
}
