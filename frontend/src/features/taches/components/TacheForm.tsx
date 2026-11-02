import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { useFieldArray, useForm, type FieldPath } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import type { ApiError } from '@/api/errors';
import { AlerteErreur } from '@/components/common/AlerteErreur';
import { BandeauInfo } from '@/components/common/BandeauInfo';
import { Champ } from '@/components/common/Champ';
import { Pastille } from '@/components/common/Pastille';
import type { Ton } from '@/components/common/statuts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useChantiers } from '@/features/chantiers/hooks';
import { useMateriaux } from '@/features/materiaux/hooks';
import { SPECIALITES } from '@/features/ouvriers/types';
import { formatDateCourte, formatNombre } from '@/lib/format';
import { notifierErreur } from '@/lib/erreurs';
import { cn } from '@/lib/utils';

import { useCreerTache, useModifierTache, useOuvriersTaches, useTaches } from '../hooks';
import { schemaTache, type ValeursTache } from '../schemas';
import type { Tache, TacheCreation } from '../types';

type Props =
  /** Création ; chantierId fixé quand on vient de la fiche d'un chantier. */
  { mode: 'creation'; chantierId?: number } | { mode: 'modification'; tache: Tache };

const chevauche = (a: { dateDebut: string; dateFin: string }, b: typeof a) =>
  a.dateDebut <= b.dateFin && b.dateDebut <= a.dateFin;

/** Formulaire de tâche de la maquette (écran 5), pour la création et la modification. */
export function TacheForm(props: Props) {
  const navigate = useNavigate();
  const tache = props.mode === 'modification' ? props.tache : undefined;
  const chantierFixe = props.mode === 'creation' ? props.chantierId : tache?.chantierId;

  const chantiers = useChantiers();
  const materiaux = useMateriaux();
  const toutes = useTaches();
  const equipe = useOuvriersTaches();
  const creer = useCreerTache();
  const modifier = useModifierTache(tache?.id ?? 0);

  const [erreur, setErreur] = useState<ApiError | null>(null);
  const alerte = useRef<HTMLDivElement>(null);

  const form = useForm<ValeursTache>({
    resolver: zodResolver(schemaTache),
    defaultValues: {
      chantierId: chantierFixe ?? Number.NaN,
      titre: tache?.titre ?? '',
      description: tache?.description ?? '',
      dateDebut: tache?.dateDebut ?? '',
      dateFin: tache?.dateFin ?? '',
      ouvrierIds: tache?.ouvrierIds ?? [],
      besoins: tache?.besoinsMateriaux ?? [],
    },
  });
  const { register, handleSubmit, watch, setValue, setError, formState } = form;
  const e = formState.errors;
  const besoins = useFieldArray({ control: form.control, name: 'besoins' });

  const chantierId = watch('chantierId');
  const dateDebut = watch('dateDebut');
  const dateFin = watch('dateFin');
  const ouvrierIds = watch('ouvrierIds');
  const valeursBesoins = watch('besoins');

  const chantier = chantiers.data?.find((c) => c.id === chantierId);
  const chantierClos = chantier?.statut === 'TERMINE';
  const periodeValide = Boolean(dateDebut && dateFin && dateFin >= dateDebut);
  const nomChantier = (id: number) =>
    chantiers.data?.find((c) => c.id === id)?.nom ?? `Chantier ${id}`;

  /** Tâche qui occupe déjà l'ouvrier sur la période saisie (RG-04). */
  const occupation = (ouvrierId: number) =>
    periodeValide
      ? toutes.data?.find(
          (t) =>
            t.id !== tache?.id &&
            t.statut !== 'TERMINEE' &&
            t.ouvrierIds.includes(ouvrierId) &&
            chevauche(t, { dateDebut, dateFin }),
        )
      : undefined;

  const materiau = (id: number) => materiaux.data?.find((m) => m.id === id);
  const stockInsuffisant = (b: { materiauId: number; quantite: number }) => {
    const m = materiau(b.materiauId);
    return Boolean(m && b.quantite > m.stock);
  };

  const basculerOuvrier = (id: number) =>
    setValue(
      'ouvrierIds',
      ouvrierIds.includes(id) ? ouvrierIds.filter((o) => o !== id) : [...ouvrierIds, id],
      { shouldDirty: true },
    );

  function afficherErreur(err: ApiError) {
    if (err.champs) {
      for (const [champ, message] of Object.entries(err.champs)) {
        setError(champ as FieldPath<ValeursTache>, { message });
      }
    }
    setErreur(err);
    notifierErreur(err);
    requestAnimationFrame(() => alerte.current?.focus());
  }

  const envoyer = handleSubmit((v) => {
    setErreur(null);
    if (chantierClos) {
      setError('chantierId', {
        message: 'Ce chantier est clôturé : on ne peut plus y planifier de tâche.',
      });
      return;
    }
    const donnees: TacheCreation = {
      chantierId: v.chantierId,
      titre: v.titre.trim(),
      description: v.description?.trim() || undefined,
      dateDebut: v.dateDebut,
      dateFin: v.dateFin,
      ouvrierIds: v.ouvrierIds,
      besoinsMateriaux: v.besoins,
    };
    const succes = (t: Tache) => {
      toast.success(tache ? `Tâche « ${t.titre} » modifiée.` : `Tâche « ${t.titre} » créée.`);
      navigate(`/taches/${t.id}`);
    };
    if (tache) modifier.mutate(donnees, { onSuccess: succes, onError: afficherErreur });
    else creer.mutate(donnees, { onSuccess: succes, onError: afficherErreur });
  });

  const retour = tache
    ? { vers: `/taches/${tache.id}`, libelle: tache.titre }
    : chantierFixe
      ? { vers: `/chantiers/${chantierFixe}`, libelle: nomChantier(chantierFixe) }
      : { vers: '/taches', libelle: 'Toutes les tâches' };

  // Vérifications faites par le module Tâches à l'enregistrement, affichées en direct.
  const choisis = ouvrierIds.map((id) => equipe.parId.get(id));
  const verifs: Verif[] = [
    {
      module: 'Chantiers',
      proto: 'REST',
      quoi: 'Le chantier existe et n’est pas terminé',
      appel: `GET /api/chantiers/${Number.isNaN(chantierId) ? '{id}' : chantierId}`,
      etat: !chantier ? 'attente' : chantierClos ? 'refuse' : 'valide',
    },
    {
      module: 'Ouvriers',
      proto: 'REST',
      quoi: 'Ouvriers disponibles et sans autre tâche sur la période',
      appel: 'GET /api/ouvriers/{id}',
      etat: !equipe.sourceDisponible
        ? 'indispo'
        : !ouvrierIds.length
          ? 'nonRequis'
          : choisis.some((o) => !o?.disponible) || ouvrierIds.some((id) => occupation(id))
            ? 'refuse'
            : 'valide',
    },
    {
      module: 'Matériaux',
      proto: 'SOAP',
      quoi: 'Stock suffisant pour chaque besoin',
      appel: 'VerifierStock',
      etat: materiaux.error
        ? 'indispo'
        : !valeursBesoins.length
          ? 'nonRequis'
          : valeursBesoins.some(stockInsuffisant)
            ? 'refuse'
            : 'valide',
    },
  ];

  const enCours = creer.isPending || modifier.isPending;
  const debutFin = periodeValide
    ? ` · période du ${formatDateCourte(dateDebut)} au ${formatDateCourte(dateFin)}`
    : '';

  return (
    <>
      <Link
        to={retour.vers}
        className="flex min-h-cible items-center gap-2 self-start px-1 font-semibold text-accent-text no-underline"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        {retour.libelle}
      </Link>

      {erreur && <AlerteErreur ref={alerte} erreur={erreur} />}

      <form
        onSubmit={envoyer}
        noValidate
        aria-label={tache ? 'Modifier la tâche' : 'Nouvelle tâche'}
        className="flex flex-wrap items-start gap-5"
      >
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <Section titre="1 · Informations">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tache-chantier" className="text-sm font-semibold">
                Chantier
              </label>
              <select
                id="tache-chantier"
                disabled={Boolean(chantierFixe)}
                aria-invalid={e.chantierId ? true : undefined}
                aria-describedby={e.chantierId ? 'tache-chantier-erreur' : undefined}
                className={cn(
                  'min-h-[46px] rounded-btn border bg-surface px-3 text-ink disabled:opacity-80',
                  e.chantierId ? 'border-[var(--bar-rouge)]' : 'border-line',
                )}
                {...register('chantierId', { valueAsNumber: true })}
                // Contrôlé : les options arrivent après l'initialisation du formulaire.
                value={Number.isNaN(chantierId) ? '' : chantierId}
              >
                <option value="">Choisir un chantier…</option>
                {chantiers.data?.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                    disabled={c.statut === 'TERMINE' && !chantierFixe}
                  >
                    {c.nom}
                    {c.statut === 'TERMINE' ? ' (clôturé)' : ''}
                  </option>
                ))}
              </select>
              {e.chantierId && (
                <span
                  id="tache-chantier-erreur"
                  className="text-[13px] text-[var(--badge-rouge-fg)]"
                >
                  {e.chantierId.message}
                </span>
              )}
            </div>
            <Champ
              libelle="Titre de la tâche"
              placeholder="Ex. Pose des menuiseries R+1"
              erreur={e.titre?.message}
              {...register('titre')}
            />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
              <Champ
                libelle="Date de début"
                type="date"
                erreur={e.dateDebut?.message}
                {...register('dateDebut')}
              />
              <Champ
                libelle="Date de fin"
                type="date"
                aide="Postérieure ou égale à la date de début."
                erreur={e.dateFin?.message}
                {...register('dateFin')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tache-description" className="text-sm font-semibold">
                Description <span className="font-normal text-muted">(facultatif)</span>
              </label>
              <textarea
                id="tache-description"
                rows={3}
                className="resize-y rounded-btn border border-line bg-surface px-3.5 py-3 text-ink"
                {...register('description')}
              />
            </div>
          </Section>

          <Section titre="2 · Ouvriers" aside={`${ouvrierIds.length} sélectionné(s)${debutFin}`}>
            {!equipe.sourceDisponible ? (
              <BandeauInfo>
                Informations ouvriers indisponibles : le module Ouvriers ne répond pas. La tâche
                peut être enregistrée sans affectation, puis complétée plus tard.
              </BandeauInfo>
            ) : equipe.chargement ? (
              <Skeleton className="h-16" />
            ) : (
              <fieldset className="m-0 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2.5 border-0 p-0">
                <legend className="sr-only">Ouvriers affectés</legend>
                {equipe.ouvriers?.map((o) => {
                  const choisi = ouvrierIds.includes(o.id);
                  const occupe = occupation(o.id);
                  const etat = !o.disponible
                    ? { texte: 'Indisponible', classe: 'text-muted' }
                    : occupe
                      ? {
                          texte: `Déjà affecté : ${occupe.titre} · ${nomChantier(occupe.chantierId)}, ${formatDateCourte(occupe.dateDebut)} → ${formatDateCourte(occupe.dateFin)}`,
                          classe: 'text-[var(--badge-ambre-fg)]',
                        }
                      : periodeValide
                        ? { texte: 'Libre sur la période', classe: 'text-[var(--badge-vert-fg)]' }
                        : { texte: 'Disponible', classe: 'text-[var(--badge-vert-fg)]' };
                  return (
                    <label
                      key={o.id}
                      className={cn(
                        'flex min-h-16 cursor-pointer items-start gap-3 rounded-btn border-2 p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent',
                        choisi
                          ? 'border-accent bg-[var(--badge-ambre-bg)]'
                          : 'border-line bg-surface',
                        !o.disponible && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={choisi}
                        disabled={!o.disponible}
                        onChange={() => basculerOuvrier(o.id)}
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[3px] border-2',
                          choisi ? 'border-accent bg-accent text-accent-on' : 'border-line',
                        )}
                      >
                        {choisi && <Check size={14} strokeWidth={3} />}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-bold">
                          {o.prenom} {o.nom}
                        </span>
                        <span className="text-[13px] text-muted">{SPECIALITES[o.specialite]}</span>
                        <span className={cn('text-[13px] font-semibold', etat.classe)}>
                          {etat.texte}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            )}
          </Section>

          <Section titre="3 · Besoins en matériaux">
            {materiaux.error ? (
              <BandeauInfo>
                Stock indisponible : le module Matériaux ne répond pas. Les besoins seront vérifiés
                à l’enregistrement.
              </BandeauInfo>
            ) : (
              <>
                {besoins.fields.map((f, i) => {
                  const b = valeursBesoins[i];
                  const m = b && materiau(b.materiauId);
                  const quantiteValide = b && !Number.isNaN(b.quantite) && b.quantite > 0;
                  return (
                    <div
                      key={f.id}
                      className="flex flex-wrap items-end gap-3 rounded-btn border border-line bg-surface-2 px-3.5 py-3"
                    >
                      <div className="flex min-w-[200px] flex-[1_1_220px] flex-col gap-1.5">
                        <label htmlFor={`besoin-${i}-materiau`} className="text-sm font-semibold">
                          Matériau {i + 1}
                        </label>
                        <select
                          id={`besoin-${i}-materiau`}
                          aria-invalid={e.besoins?.[i]?.materiauId ? true : undefined}
                          className="min-h-[46px] rounded-btn border border-line bg-surface px-3 text-ink"
                          {...register(`besoins.${i}.materiauId`, { valueAsNumber: true })}
                        >
                          <option value="">Choisir…</option>
                          {materiaux.data?.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.nom} ({x.reference})
                            </option>
                          ))}
                        </select>
                        {e.besoins?.[i]?.materiauId && (
                          <span className="text-[13px] text-[var(--badge-rouge-fg)]">
                            {e.besoins[i]?.materiauId?.message}
                          </span>
                        )}
                      </div>
                      <div className="w-36">
                        <Champ
                          libelle={`Quantité${m ? ` (${m.unite})` : ''}`}
                          type="number"
                          min={0}
                          step="any"
                          erreur={e.besoins?.[i]?.quantite?.message}
                          {...register(`besoins.${i}.quantite`, { valueAsNumber: true })}
                        />
                      </div>
                      {m && (
                        <span className="flex min-h-[46px] items-center gap-2.5">
                          <span className="text-[13px] text-muted">
                            stock {formatNombre(m.stock)}
                          </span>
                          {quantiteValide &&
                            (stockInsuffisant(b) ? (
                              <Pastille ton="rouge">Stock insuffisant</Pastille>
                            ) : (
                              <Pastille ton="vert">Disponible</Pastille>
                            ))}
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Retirer le matériau ${i + 1}`}
                        onClick={() => besoins.remove(i)}
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </Button>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  className="self-start border-dashed"
                  onClick={() => besoins.append({ materiauId: Number.NaN, quantite: Number.NaN })}
                >
                  <Plus size={18} aria-hidden="true" />
                  Ajouter un matériau
                </Button>
                <p className="m-0 text-[13px] text-muted">
                  Le stock est vérifié à la création ; il n’est pas réservé. La consommation réelle
                  est saisie par le magasinier.
                </p>
              </>
            )}
          </Section>
        </div>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <Section titre="Vérifications">
            {verifs.map((v) => (
              <CarteVerif key={v.module} verif={v} />
            ))}
          </Section>
          <Button
            type="submit"
            disabled={enCours}
            className="min-h-[52px] text-base font-bold uppercase tracking-[0.04em]"
          >
            {tache ? 'Enregistrer' : 'Créer la tâche'}
          </Button>
          <Button asChild variant="outline">
            <Link to={retour.vers} className="no-underline">
              Annuler
            </Link>
          </Button>
        </aside>
      </form>
    </>
  );
}

function Section({
  titre,
  aside,
  children,
}: {
  titre: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="carte flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={id} className="titre m-0 text-xl tracking-[0.04em]">
          {titre}
        </h2>
        {aside && <span className="text-sm text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

type Verif = {
  module: string;
  proto: 'REST' | 'SOAP';
  quoi: string;
  appel: string;
  etat: 'valide' | 'refuse' | 'attente' | 'nonRequis' | 'indispo';
};

const ETATS: Record<Verif['etat'], { libelle: string; ton: Ton }> = {
  valide: { libelle: 'Validé', ton: 'vert' },
  refuse: { libelle: 'Refusé', ton: 'rouge' },
  attente: { libelle: 'À vérifier', ton: 'gris' },
  nonRequis: { libelle: 'Non requis', ton: 'gris' },
  indispo: { libelle: 'Indisponible', ton: 'ambre' },
};

function CarteVerif({ verif }: { verif: Verif }) {
  const etat = ETATS[verif.etat];
  return (
    <div className="flex flex-col gap-1.5 rounded-btn bg-surface-2 p-3">
      <div className="flex items-center gap-2">
        <span className="font-bold">{verif.module}</span>
        <span className="rounded-[3px] border border-line px-1.5 py-0.5 font-mono text-[11px]">
          {verif.proto}
        </span>
        <Pastille ton={etat.ton} className="ml-auto text-xs">
          {etat.libelle}
        </Pastille>
      </div>
      <span className="text-[13px] text-muted">{verif.quoi}</span>
      <span className="font-mono text-xs text-muted">{verif.appel}</span>
    </div>
  );
}
