import { TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { ApiError } from '@/api/errors';
import { BandeauDegrade } from '@/components/common/BandeauDegrade';
import { StatutBadge } from '@/components/common/StatutBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAvancementsChantiers, useChantiers } from '@/features/chantiers/hooks';
import { useMateriaux, useMouvements } from '@/features/materiaux/hooks';
import { useOuvriers } from '@/features/ouvriers/hooks';
import { useHistoriqueRecent, useTaches } from '@/features/taches/hooks';
import { aujourdhui } from '@/lib/dates';
import { formatDateCourte, formatNombre } from '@/lib/format';

import { LigneAvancement } from '../components/AvancementChantiers';
import { DernieresActivites } from '../components/DernieresActivites';
import { CarteKpi, Indisponible, Section } from '../components/elements';
import { RepartitionChantiers } from '../components/RepartitionChantiers';

const enPanne = (e: ApiError | null) => e?.status === 503;
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/** Écran 2 de la maquette (et 8 en mode dégradé) : vue d'ensemble de l'activité. */
export function DashboardPage() {
  const chantiers = useChantiers();
  const taches = useTaches();
  const ouvriers = useOuvriers();
  const materiaux = useMateriaux();
  const mouvements = useMouvements();
  const historique = useHistoriqueRecent(12);

  const listeChantiers = chantiers.data ?? [];
  const enCours = listeChantiers.filter((c) => c.statut === 'EN_COURS');
  const avancements = useAvancementsChantiers(enCours.map((c) => c.id));

  const pannes = {
    chantiers: enPanne(chantiers.error),
    taches: enPanne(taches.error),
    ouvriers: enPanne(ouvriers.error),
    materiaux: enPanne(materiaux.error),
  };

  // Indicateurs
  const jour = aujourdhui();
  const nonTerminees = (taches.data ?? []).filter((t) => t.statut !== 'TERMINEE');
  const enRetard = nonTerminees
    .filter((t) => t.dateFin < jour)
    .sort((a, b) => a.dateFin.localeCompare(b.dateFin));
  const disponibles = (ouvriers.data ?? []).filter((o) => o.disponible);
  const indisponibles = (ouvriers.data ?? []).filter((o) => !o.disponible);
  const alertes = (materiaux.data ?? []).filter((m) => m.enAlerte);
  const repartition = (['PLANIFIE', 'EN_COURS', 'SUSPENDU', 'TERMINE'] as const)
    .map((s) => {
      const n = listeChantiers.filter((c) => c.statut === s).length;
      const libelle = {
        PLANIFIE: 'planifié',
        EN_COURS: 'en cours',
        SUSPENDU: 'suspendu',
        TERMINE: 'terminé',
      }[s];
      return n ? `${n} ${libelle}` : null;
    })
    .filter(Boolean)
    .join(' · ');

  // Avancement des chantiers en cours (null si le module Tâches ne répond pas)
  const valeurs = avancements.map((q) =>
    q.isPending ? undefined : q.data?.sourceDisponible ? q.data.avancementGlobal : null,
  );
  const connues = valeurs.filter((v): v is number => typeof v === 'number');
  const moyenne = connues.length
    ? Math.round(connues.reduce((s, v) => s + v, 0) / connues.length)
    : null;
  const avancementIndispo = pannes.taches || valeurs.some((v) => v === null);

  // Tâches à suivre : en cours et bloquées, par date de fin
  const aSuivre = nonTerminees
    .filter((t) => t.statut === 'EN_COURS' || t.statut === 'BLOQUEE')
    .sort((a, b) => a.dateFin.localeCompare(b.dateFin))
    .slice(0, 5);

  const parChantier = new Map(listeChantiers.map((c) => [c.id, c]));
  const parTache = new Map((taches.data ?? []).map((t) => [t.id, t]));
  const parMateriau = new Map((materiaux.data ?? []).map((m) => [m.id, m]));

  return (
    <>
      {pannes.chantiers && (
        <BandeauDegrade module="Chantiers" className="rounded-btn border-b-0 sm:px-5">
          La liste et la répartition des chantiers ne sont pas disponibles.
        </BandeauDegrade>
      )}
      {pannes.taches && (
        <BandeauDegrade module="Tâches" className="rounded-btn border-b-0 sm:px-5">
          L’avancement et les plannings ne sont pas à jour. La création de tâches est refusée (503)
          jusqu’au retour du module.
        </BandeauDegrade>
      )}
      {pannes.ouvriers && (
        <BandeauDegrade module="Ouvriers" className="rounded-btn border-b-0 sm:px-5">
          Les disponibilités des ouvriers ne sont pas affichées.
        </BandeauDegrade>
      )}
      {pannes.materiaux && (
        <BandeauDegrade module="Matériaux" className="rounded-btn border-b-0 sm:px-5">
          Le stock et les alertes de seuil ne sont pas affichés.
        </BandeauDegrade>
      )}

      <div className="flex flex-wrap gap-4">
        <CarteKpi
          titre="Chantiers en cours"
          vers="/chantiers?statut=EN_COURS"
          chargement={chantiers.isPending}
          indisponible={pannes.chantiers ? 'Non disponible (module Chantiers)' : undefined}
          valeur={enCours.length}
          total={listeChantiers.length}
          detail={repartition || 'Aucun chantier'}
        />
        <CarteKpi
          titre="Tâches en retard"
          vers="/taches"
          chargement={taches.isPending}
          indisponible={pannes.taches ? 'Non disponible (module Tâches)' : undefined}
          alerte={enRetard.length > 0}
          valeur={enRetard.length}
          detail={
            enRetard.length
              ? `Fin dépassée : ${enRetard
                  .slice(0, 2)
                  .map((t) => t.titre)
                  .join(', ')}${enRetard.length > 2 ? '…' : ''}`
              : `Aucune sur ${pluriel(nonTerminees.length, 'tâche')} à terminer`
          }
        />
        <CarteKpi
          titre="Ouvriers disponibles"
          vers="/ouvriers?disponibles=1"
          chargement={ouvriers.isPending}
          indisponible={pannes.ouvriers ? 'Non disponible (module Ouvriers)' : undefined}
          valeur={disponibles.length}
          total={ouvriers.data?.length ?? 0}
          detail={
            indisponibles.length
              ? `Indisponibles : ${indisponibles.map((o) => `${o.prenom} ${o.nom}`).join(', ')}`
              : 'Toute l’équipe est disponible'
          }
        />
        <CarteKpi
          titre="Matériaux en alerte"
          vers="/materiaux?alerte=1"
          chargement={materiaux.isPending}
          indisponible={pannes.materiaux ? 'Non disponible (module Matériaux)' : undefined}
          alerte={alertes.length > 0}
          valeur={alertes.length}
          detail="Stock inférieur ou égal au seuil"
        />
      </div>

      <div className="flex flex-wrap items-stretch gap-5">
        <Section
          titre="Avancement des chantiers en cours"
          lien={{ vers: '/chantiers?statut=EN_COURS', libelle: 'Tout voir' }}
          className="flex-[1_1_440px]"
        >
          {pannes.chantiers ? (
            <Indisponible>
              Chantiers non disponibles : le module Chantiers ne répond pas.
            </Indisponible>
          ) : avancementIndispo ? (
            <Indisponible>
              Avancement non disponible : le module Tâches ne répond pas. Les chantiers restent
              consultables.
            </Indisponible>
          ) : chantiers.isPending ? (
            <Skeleton className="h-40" />
          ) : enCours.length === 0 ? (
            <p className="m-0 text-muted">Aucun chantier en cours.</p>
          ) : (
            <>
              {moyenne !== null && (
                <p className="m-0 -mt-2 text-sm text-muted">
                  Avancement moyen : <span className="font-mono text-ink">{moyenne} %</span>
                </p>
              )}
              <ul className="m-0 flex list-none flex-col gap-5 p-0">
                {enCours.map((c, i) => (
                  <LigneAvancement key={c.id} chantier={c} valeur={valeurs[i]} />
                ))}
              </ul>
            </>
          )}
        </Section>

        <Section
          titre="Alertes de stock"
          lien={{ vers: '/materiaux?alerte=1', libelle: 'Voir le stock' }}
          className="flex-[1_1_440px]"
        >
          {pannes.materiaux ? (
            <Indisponible>Stock non disponible : le module Matériaux ne répond pas.</Indisponible>
          ) : materiaux.isPending ? (
            <Skeleton className="h-32" />
          ) : alertes.length === 0 ? (
            <p className="m-0 text-muted">Aucun matériau en alerte.</p>
          ) : (
            <ul aria-label="Matériaux en alerte" className="m-0 flex list-none flex-col gap-3 p-0">
              {alertes.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start gap-3.5 rounded-btn bg-[var(--badge-rouge-bg)] px-4 py-3.5 text-[var(--badge-rouge-fg)]"
                >
                  <TriangleAlert size={22} aria-hidden="true" className="mt-0.5 flex-none" />
                  <span className="flex flex-col gap-0.5">
                    <strong>{m.nom}</strong>
                    <span className="text-[13px]">
                      <span className="font-mono">{m.reference}</span> · stock{' '}
                      {formatNombre(m.stock)} {m.unite} · seuil {formatNombre(m.seuilAlerte)}{' '}
                      {m.unite}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="m-0 text-sm text-muted">
            Un matériau est en alerte quand son stock est inférieur ou égal à son seuil.
          </p>
        </Section>
      </div>

      <div className="flex flex-wrap items-stretch gap-5">
        <Section
          titre="Tâches à suivre"
          lien={{ vers: '/taches?statut=EN_COURS', libelle: 'Toutes les tâches' }}
          className="flex-[1_1_440px]"
        >
          {pannes.taches ? (
            <Indisponible>Liste indisponible pendant la panne du module Tâches.</Indisponible>
          ) : taches.isPending ? (
            <Skeleton className="h-40" />
          ) : aSuivre.length === 0 ? (
            <p className="m-0 text-muted">Aucune tâche en cours.</p>
          ) : (
            <ul aria-label="Tâches à suivre" className="m-0 flex list-none flex-col p-0">
              {aSuivre.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <Link
                      to={`/taches/${t.id}`}
                      className="font-semibold text-ink no-underline hover:underline"
                    >
                      {t.titre}
                    </Link>
                    <span className="text-[13px] text-muted">
                      {parChantier.get(t.chantierId)?.nom ?? `Chantier ${t.chantierId}`} · fin{' '}
                      {formatDateCourte(t.dateFin)}
                      {t.dateFin < jour && (
                        <strong className="text-[var(--badge-rouge-fg)]"> · en retard</strong>
                      )}
                    </span>
                  </span>
                  <StatutBadge statut={t.statut} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section titre="Répartition des chantiers" className="flex-[1_1_440px]">
          {pannes.chantiers ? (
            <Indisponible>
              Répartition non disponible : le module Chantiers ne répond pas.
            </Indisponible>
          ) : chantiers.isPending ? (
            <Skeleton className="h-32" />
          ) : (
            <RepartitionChantiers chantiers={listeChantiers} />
          )}
        </Section>
      </div>

      <Section titre="Dernières activités">
        {pannes.taches && pannes.materiaux ? (
          <Indisponible>
            Activités non disponibles : les modules Tâches et Matériaux ne répondent pas.
          </Indisponible>
        ) : historique.isPending && mouvements.isPending ? (
          <Skeleton className="h-40" />
        ) : (
          <>
            {(pannes.taches || pannes.materiaux) && (
              <Indisponible>
                {pannes.taches
                  ? 'Changements de statut des tâches indisponibles (module Tâches).'
                  : 'Mouvements de stock indisponibles (module Matériaux).'}
              </Indisponible>
            )}
            <DernieresActivites
              changements={pannes.taches ? undefined : historique.data}
              taches={parTache}
              mouvements={pannes.materiaux ? undefined : mouvements.data}
              materiaux={parMateriau}
              chantiers={parChantier}
            />
          </>
        )}
      </Section>
    </>
  );
}
