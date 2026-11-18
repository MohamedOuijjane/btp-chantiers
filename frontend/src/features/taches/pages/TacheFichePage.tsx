import { ArrowLeft, ClipboardList, Lock, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useTitrePage } from '@/app/titre';
import { BandeauInfo } from '@/components/common/BandeauInfo';
import { BarreProgression } from '@/components/common/BarreProgression';
import { EtatVide } from '@/components/common/EtatVide';
import { StatutBadge } from '@/components/common/StatutBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDroits } from '@/features/auth/contexte';
import { useChantier } from '@/features/chantiers/hooks';
import { SPECIALITES } from '@/features/ouvriers/types';
import { formatDate, initiales } from '@/lib/format';

import { ActionStatut } from '../components/ActionStatut';
import { HistoriqueStatuts } from '../components/HistoriqueStatuts';
import { useOuvriersTaches, useTache } from '../hooks';
import { tonTache } from '../presentation';

/** Fiche d'une tâche : informations, ouvriers affectés et historique des statuts. */
export function TacheFichePage() {
  const id = Number(useParams().id);
  const { data: t, error } = useTache(id);
  const chantier = useChantier(t?.chantierId ?? 0, Boolean(t));
  const equipe = useOuvriersTaches();
  useTitrePage(t?.titre);
  const planifie = useDroits().peut('taches.ecrire');

  const retour = (
    <Link
      to="/taches"
      className="flex min-h-cible items-center gap-2 self-start px-1 font-semibold text-accent-text no-underline"
    >
      <ArrowLeft size={18} aria-hidden="true" />
      Toutes les tâches
    </Link>
  );

  if (error) {
    return (
      <>
        {retour}
        <EtatVide
          icone={ClipboardList}
          titre={error.status === 404 ? 'Tâche introuvable' : 'Tâche indisponible'}
          description={
            error.status === 404 ? 'Cette tâche n’existe pas ou a été supprimée.' : error.message
          }
        />
      </>
    );
  }

  const clos = chantier.data?.statut === 'TERMINE';

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {retour}
        <div className="flex flex-wrap gap-2.5">
          {!planifie ? null : t && !clos ? (
            <Button asChild variant="outline" className="bg-surface">
              <Link to={`/taches/${id}/modifier`} className="no-underline">
                <Pencil size={16} aria-hidden="true" />
                Modifier
              </Link>
            </Button>
          ) : (
            <Button variant="outline" className="bg-surface" disabled>
              <Pencil size={16} aria-hidden="true" />
              Modifier
            </Button>
          )}
          {t && planifie && <ActionStatut tache={t} lectureSeule={clos} taille="default" />}
        </div>
      </div>

      {clos && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-btn bg-[var(--badge-vert-bg)] px-[18px] py-3.5 text-[var(--badge-vert-fg)]"
        >
          <Lock size={20} aria-hidden="true" className="flex-none" />
          <span>
            <strong>Chantier clôturé.</strong> Cette tâche est en lecture seule.
          </span>
        </div>
      )}

      <section aria-label="Informations de la tâche" className="carte flex flex-col gap-[18px] p-6">
        {t ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {chantier.data ? (
                <Link to={`/chantiers/${t.chantierId}`} className="font-semibold text-accent-text">
                  {chantier.data.nom}
                </Link>
              ) : (
                <Skeleton className="h-5 w-40" />
              )}
              <StatutBadge statut={t.statut} />
            </div>
            <h2 className="titre m-0 text-[34px] leading-none tracking-normal">{t.titre}</h2>
            {t.statut === 'BLOQUEE' && t.motif && (
              <p className="m-0 text-[var(--badge-rouge-fg)]">Motif du blocage : {t.motif}</p>
            )}
            <p className="m-0 max-w-3xl text-muted">{t.description || 'Aucune description.'}</p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
              <Indicateur libelle="Début">{formatDate(t.dateDebut)}</Indicateur>
              <Indicateur libelle="Fin">{formatDate(t.dateFin)}</Indicateur>
              <Indicateur libelle="Avancement">
                <span className="flex items-center gap-2.5">
                  <BarreProgression
                    valeur={t.avancement}
                    ton={tonTache(t)}
                    taille="sm"
                    libelle={`Avancement de ${t.titre}`}
                  />
                  <span className="flex-none">{t.avancement} %</span>
                </span>
              </Indicateur>
              <Indicateur libelle="Ouvriers">{t.ouvrierIds.length}</Indicateur>
            </div>
          </>
        ) : (
          <>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-9 w-80 max-w-full" />
            <Skeleton className="h-4 w-64" />
          </>
        )}
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <section
          aria-labelledby="titre-ouvriers"
          className="carte flex min-w-0 flex-[2_1_420px] flex-col gap-4 p-5"
        >
          <h2 id="titre-ouvriers" className="titre m-0 text-xl tracking-[0.04em]">
            Ouvriers affectés
          </h2>
          {!equipe.sourceDisponible ? (
            <BandeauInfo>
              <strong>Informations ouvriers indisponibles.</strong> Le module Ouvriers ne répond pas
              : la tâche reste consultable, les noms et spécialités reviendront avec le module.
            </BandeauInfo>
          ) : !t || equipe.chargement ? (
            <Skeleton className="h-16" />
          ) : t.ouvrierIds.length === 0 ? (
            <p className="m-0 text-muted">Aucun ouvrier affecté.</p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5 p-0">
              {t.ouvrierIds.map((oid) => {
                const o = equipe.parId.get(oid);
                return (
                  <li key={oid} className="flex items-center gap-3 rounded-btn bg-surface-2 p-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-line bg-surface text-sm font-bold"
                    >
                      {o ? initiales(o.prenom, o.nom) : oid}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="font-bold">
                        {o ? `${o.prenom} ${o.nom}` : `Ouvrier ${oid}`}
                      </span>
                      {o && (
                        <span className="text-[13px] text-muted">{SPECIALITES[o.specialite]}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="titre-historique"
          className="carte flex min-w-0 flex-[1_1_300px] flex-col gap-4 p-5"
        >
          <h2 id="titre-historique" className="titre m-0 text-xl tracking-[0.04em]">
            Historique des statuts
          </h2>
          {t && <HistoriqueStatuts tacheId={t.id} />}
        </section>
      </div>
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
