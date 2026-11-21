import { TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { ApiError } from '@/api/errors';
import { AlerteErreur } from '@/components/common/AlerteErreur';
import { BandeauDegrade } from '@/components/common/BandeauDegrade';
import { StatutBadge } from '@/components/common/StatutBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDroits } from '@/features/auth/contexte';
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

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

type NomModule = 'Chantiers' | 'Tâches' | 'Ouvriers' | 'Matériaux';

/**
 * Texte d'une carte ou d'une section quand la lecture d'un module échoue : 503 = module injoignable
 * (mode dégradé), autre code = erreur du module (les données ne sont pas affichées, jamais des zéros).
 */
function indisponibilite(e: ApiError, module: NomModule, panne: string) {
  return e.status === 503
    ? panne
    : `${panne.split(' :')[0]} : erreur ${e.status} du module ${module}.`;
}

/** Erreur d'un module autre qu'une panne (500, 403…) : bandeau rouge avec code et X-Request-Id. */
function ErreurModule({ module, erreur }: { module: NomModule; erreur: ApiError }) {
  return <AlerteErreur erreur={{ ...erreur, message: `Module ${module} : ${erreur.message}` }} />;
}

/** Écran 2 de la maquette (et 8 en mode dégradé) : vue d'ensemble de l'activité. */
export function DashboardPage() {
  // Mêmes droits que le menu : un profil sans accès aux pages Tâches, Ouvriers (magasinier) ou
  // Matériaux (chef de chantier) ne voit pas leurs cartes, leurs bandeaux ni leurs activités.
  const { voit } = useDroits();
  const voitTaches = voit('taches');
  const voitOuvriers = voit('ouvriers');
  const voitMateriaux = voit('materiaux');
  const chantiers = useChantiers();
  const taches = useTaches();
  const ouvriers = useOuvriers();
  const materiaux = useMateriaux();
  const mouvements = useMouvements();
  const historique = useHistoriqueRecent(12);

  const listeChantiers = chantiers.data ?? [];
  const enCours = listeChantiers.filter((c) => c.statut === 'EN_COURS');
  const avancements = useAvancementsChantiers(enCours.map((c) => c.id));

  // Erreur de lecture par module : 503 = panne (bandeau ambre), autre code = bandeau rouge.
  const erreurs = {
    chantiers: chantiers.error,
    taches: voitTaches ? taches.error : null,
    ouvriers: voitOuvriers ? ouvriers.error : null,
    materiaux: voitMateriaux ? materiaux.error : null,
  };
  const carte = (e: ApiError | null, module: NomModule) =>
    e
      ? e.status === 503
        ? `Non disponible (module ${module})`
        : `Erreur du module ${module}`
      : undefined;
  const erreurHistorique = voitTaches ? (taches.error ?? historique.error) : null;
  const erreurMouvements = voitMateriaux ? (materiaux.error ?? mouvements.error) : null;

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
  const avancementIndispo = !!erreurs.taches || valeurs.some((v) => v === null);

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
      {erreurs.chantiers?.status === 503 && (
        <BandeauDegrade module="Chantiers" className="rounded-btn border-b-0 sm:px-5">
          La liste et la répartition des chantiers ne sont pas disponibles.
        </BandeauDegrade>
      )}
      {erreurs.taches?.status === 503 && (
        <BandeauDegrade module="Tâches" className="rounded-btn border-b-0 sm:px-5">
          L’avancement et les plannings ne sont pas à jour. La création de tâches est refusée (503)
          jusqu’au retour du module.
        </BandeauDegrade>
      )}
      {erreurs.ouvriers?.status === 503 && (
        <BandeauDegrade module="Ouvriers" className="rounded-btn border-b-0 sm:px-5">
          Les disponibilités des ouvriers ne sont pas affichées.
        </BandeauDegrade>
      )}
      {erreurs.materiaux?.status === 503 && (
        <BandeauDegrade module="Matériaux" className="rounded-btn border-b-0 sm:px-5">
          Le stock et les alertes de seuil ne sont pas affichés.
        </BandeauDegrade>
      )}
      {(
        [
          ['Chantiers', erreurs.chantiers],
          ['Tâches', erreurs.taches],
          ['Ouvriers', erreurs.ouvriers],
          ['Matériaux', erreurs.materiaux],
        ] as const
      ).map(([module, e]) =>
        e && e.status !== 503 ? <ErreurModule key={module} module={module} erreur={e} /> : null,
      )}

      <div className="flex flex-wrap gap-4">
        <CarteKpi
          titre="Chantiers en cours"
          vers="/chantiers?statut=EN_COURS"
          chargement={chantiers.isPending}
          indisponible={carte(erreurs.chantiers, 'Chantiers')}
          valeur={enCours.length}
          total={listeChantiers.length}
          detail={repartition || 'Aucun chantier'}
        />
        {voitTaches && (
          <CarteKpi
            titre="Tâches en retard"
            vers="/taches"
            chargement={taches.isPending}
            indisponible={carte(erreurs.taches, 'Tâches')}
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
        )}
        {voitOuvriers && (
          <CarteKpi
            titre="Ouvriers disponibles"
            vers="/ouvriers?disponibles=1"
            chargement={ouvriers.isPending}
            indisponible={carte(erreurs.ouvriers, 'Ouvriers')}
            valeur={disponibles.length}
            total={ouvriers.data?.length ?? 0}
            detail={
              !ouvriers.data?.length
                ? 'Aucun ouvrier enregistré'
                : indisponibles.length
                  ? `Indisponibles : ${indisponibles.map((o) => `${o.prenom} ${o.nom}`).join(', ')}`
                  : 'Toute l’équipe est disponible'
            }
          />
        )}
        {voitMateriaux && (
          <CarteKpi
            titre="Matériaux en alerte"
            vers="/materiaux?alerte=1"
            chargement={materiaux.isPending}
            indisponible={carte(erreurs.materiaux, 'Matériaux')}
            alerte={alertes.length > 0}
            valeur={alertes.length}
            detail="Stock inférieur ou égal au seuil"
          />
        )}
      </div>

      <div className="flex flex-wrap items-stretch gap-5">
        <Section
          titre="Avancement des chantiers en cours"
          lien={{ vers: '/chantiers?statut=EN_COURS', libelle: 'Tout voir' }}
          className="flex-[1_1_440px]"
        >
          {erreurs.chantiers ? (
            <Indisponible>
              {indisponibilite(
                erreurs.chantiers,
                'Chantiers',
                'Chantiers non disponibles : le module Chantiers ne répond pas.',
              )}
            </Indisponible>
          ) : avancementIndispo ? (
            <Indisponible>
              {erreurs.taches && erreurs.taches.status !== 503
                ? `Avancement non disponible : erreur ${erreurs.taches.status} du module Tâches.`
                : 'Avancement non disponible : le module Tâches ne répond pas.'}{' '}
              Les chantiers restent consultables.
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

        {voitMateriaux && (
          <Section
            titre="Alertes de stock"
            lien={{ vers: '/materiaux?alerte=1', libelle: 'Voir le stock' }}
            className="flex-[1_1_440px]"
          >
            {erreurs.materiaux ? (
              <Indisponible>
                {indisponibilite(
                  erreurs.materiaux,
                  'Matériaux',
                  'Stock non disponible : le module Matériaux ne répond pas.',
                )}
              </Indisponible>
            ) : materiaux.isPending ? (
              <Skeleton className="h-32" />
            ) : alertes.length === 0 ? (
              <p className="m-0 text-muted">Aucun matériau en alerte.</p>
            ) : (
              <ul
                aria-label="Matériaux en alerte"
                className="m-0 flex list-none flex-col gap-3 p-0"
              >
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
        )}
      </div>

      <div className="flex flex-wrap items-stretch gap-5">
        {voitTaches && (
          <Section
            titre="Tâches à suivre"
            lien={{ vers: '/taches?statut=EN_COURS', libelle: 'Toutes les tâches' }}
            className="flex-[1_1_440px]"
          >
            {erreurs.taches ? (
              <Indisponible>
                {erreurs.taches.status === 503
                  ? 'Liste indisponible pendant la panne du module Tâches.'
                  : `Liste non disponible : erreur ${erreurs.taches.status} du module Tâches.`}
              </Indisponible>
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
        )}

        <Section titre="Répartition des chantiers" className="flex-[1_1_440px]">
          {erreurs.chantiers ? (
            <Indisponible>
              {indisponibilite(
                erreurs.chantiers,
                'Chantiers',
                'Répartition non disponible : le module Chantiers ne répond pas.',
              )}
            </Indisponible>
          ) : chantiers.isPending ? (
            <Skeleton className="h-32" />
          ) : (
            <RepartitionChantiers chantiers={listeChantiers} />
          )}
        </Section>
      </div>

      <Section titre="Dernières activités">
        {erreurHistorique && erreurMouvements ? (
          <Indisponible>
            Activités non disponibles : les modules Tâches et Matériaux ne répondent pas.
          </Indisponible>
        ) : historique.isPending && mouvements.isPending ? (
          <Skeleton className="h-40" />
        ) : (
          <>
            {erreurHistorique && (
              <Indisponible>
                Changements de statut des tâches indisponibles (module Tâches).
              </Indisponible>
            )}
            {erreurMouvements && (
              <Indisponible>Mouvements de stock indisponibles (module Matériaux).</Indisponible>
            )}
            <DernieresActivites
              changements={!voitTaches || erreurHistorique ? undefined : historique.data}
              taches={parTache}
              mouvements={!voitMateriaux || erreurMouvements ? undefined : mouvements.data}
              materiaux={parMateriau}
              chantiers={parChantier}
            />
          </>
        )}
      </Section>
    </>
  );
}
