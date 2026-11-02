import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiError } from '@/api/errors';
import { AlerteErreur } from '@/components/common/AlerteErreur';
import { Champ } from '@/components/common/Champ';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { notifierErreur } from '@/lib/erreurs';
import { cn } from '@/lib/utils';

import { useCreerOuvrier, useModifierOuvrier } from '../hooks';
import { ORDRE_SPECIALITES } from '../presentation';
import { schemaOuvrier, type ValeursOuvrier } from '../schemas';
import { SPECIALITES, type Ouvrier, type Specialite } from '../types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Absent : création ; présent : modification (la CIN n'est plus modifiable). */
  ouvrier?: Ouvrier;
  onCree?: (o: Ouvrier) => void;
};

const VIDE: ValeursOuvrier = { prenom: '', nom: '', cin: '', specialite: '', telephone: '' };

const valeurs = (o?: Ouvrier): ValeursOuvrier =>
  o
    ? {
        prenom: o.prenom,
        nom: o.nom,
        cin: o.cin,
        specialite: o.specialite,
        telephone: o.telephone ?? '',
      }
    : VIDE;

/** Dialogue « Nouvel ouvrier » / « Modifier l'ouvrier ». */
export function OuvrierDialog({ open, onOpenChange, ouvrier, onCree }: Props) {
  const creer = useCreerOuvrier();
  const modifier = useModifierOuvrier();
  const [erreur, setErreur] = useState<ApiError | null>(null);

  const { register, handleSubmit, reset, setError, formState } = useForm<ValeursOuvrier>({
    resolver: zodResolver(schemaOuvrier),
    defaultValues: valeurs(ouvrier),
  });
  const e = formState.errors;

  useEffect(() => {
    if (open) {
      reset(valeurs(ouvrier));
      setErreur(null);
    }
  }, [open, ouvrier, reset]);

  /** 409 (CIN déjà utilisée) et 422 (validation) : message sous le champ concerné. */
  function afficherErreur(err: ApiError) {
    if (err.champs) {
      for (const [champ, message] of Object.entries(err.champs)) {
        setError(champ as keyof ValeursOuvrier, { message });
      }
    } else {
      setErreur(err);
    }
    notifierErreur(err);
  }

  const envoyer = handleSubmit((v) => {
    setErreur(null);
    const donnees = {
      prenom: v.prenom.trim(),
      nom: v.nom.trim(),
      specialite: v.specialite as Specialite,
      telephone: v.telephone || null,
    };
    if (ouvrier) {
      modifier.mutate(
        { id: ouvrier.id, donnees },
        {
          onSuccess: (o) => {
            toast.success(`${o.prenom} ${o.nom} : fiche modifiée.`);
            onOpenChange(false);
          },
          onError: afficherErreur,
        },
      );
    } else {
      creer.mutate(
        { ...donnees, cin: v.cin },
        {
          onSuccess: (o) => {
            toast.success(`${o.prenom} ${o.nom} ajouté à l’équipe.`);
            onOpenChange(false);
            onCree?.(o);
          },
          onError: afficherErreur,
        },
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>{ouvrier ? 'Modifier l’ouvrier' : 'Nouvel ouvrier'}</DialogTitle>
        {erreur && <AlerteErreur erreur={erreur} />}
        <form onSubmit={envoyer} noValidate className="flex flex-col gap-4">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Champ
              libelle="Prénom"
              autoComplete="off"
              erreur={e.prenom?.message}
              {...register('prenom')}
            />
            <Champ libelle="Nom" autoComplete="off" erreur={e.nom?.message} {...register('nom')} />
            <Champ
              libelle="CIN"
              placeholder="Ex. JB123456"
              autoComplete="off"
              disabled={Boolean(ouvrier)}
              aide={ouvrier ? 'La CIN n’est pas modifiable.' : 'Unique, au format marocain.'}
              erreur={e.cin?.message}
              className="font-mono uppercase"
              {...register('cin')}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ouvrier-specialite" className="text-sm font-semibold">
                Spécialité
              </label>
              <select
                id="ouvrier-specialite"
                aria-invalid={e.specialite ? true : undefined}
                aria-describedby={e.specialite ? 'ouvrier-specialite-erreur' : undefined}
                className={cn(
                  'min-h-[46px] rounded-btn border bg-surface px-3 text-ink',
                  e.specialite ? 'border-[var(--bar-rouge)]' : 'border-line',
                )}
                {...register('specialite')}
              >
                <option value="">Choisir…</option>
                {ORDRE_SPECIALITES.map((s) => (
                  <option key={s} value={s}>
                    {SPECIALITES[s]}
                  </option>
                ))}
              </select>
              {e.specialite && (
                <span
                  id="ouvrier-specialite-erreur"
                  className="text-[13px] text-[var(--badge-rouge-fg)]"
                >
                  {e.specialite.message}
                </span>
              )}
            </div>
            <Champ
              libelle="Téléphone"
              type="tel"
              inputMode="tel"
              placeholder="06 12 34 56 78"
              aide="Facultatif."
              erreur={e.telephone?.message}
              {...register('telephone')}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button
              type="submit"
              className="font-bold"
              disabled={creer.isPending || modifier.isPending}
            >
              {ouvrier ? 'Enregistrer' : 'Ajouter l’ouvrier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
