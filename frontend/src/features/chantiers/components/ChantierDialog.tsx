import { zodResolver } from '@hookform/resolvers/zod';
import { TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiError } from '@/api/errors';
import { Champ } from '@/components/common/Champ';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';

import { useCreerChantier, useModifierChantier } from '../hooks';
import { schemaChantier, type ValeursChantier } from '../schemas';
import type { Chantier, ChantierModification } from '../types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Absent : création ; présent : modification de ce chantier. */
  chantier?: Chantier;
};

const VIDE = { nom: '', client: '', adresse: '', dateDebut: '', dateFinPrevue: '' };

/** Dialogue « Nouveau chantier » / « Modifier le chantier » (écran 3 de la maquette). */
export function ChantierDialog({ open, onOpenChange, chantier }: Props) {
  const modification = Boolean(chantier);
  const creer = useCreerChantier();
  const modifier = useModifierChantier(chantier?.id ?? 0);
  const [erreur, setErreur] = useState<string | null>(null);

  const form = useForm<ValeursChantier>({
    resolver: zodResolver(schemaChantier),
    defaultValues: chantier ?? VIDE,
  });
  const { register, handleSubmit, reset, setError, formState } = form;
  const e = formState.errors;

  // À chaque ouverture : valeurs du chantier (ou formulaire vide) et aucune erreur.
  useEffect(() => {
    if (open) {
      reset(chantier ?? VIDE);
      setErreur(null);
    }
  }, [open, chantier, reset]);

  /** 400 : message sous chaque champ ; 409 / 422 / 503 : alerte dans le dialogue. */
  function afficherErreur(err: ApiError) {
    if (err.champs) {
      for (const [champ, message] of Object.entries(err.champs)) {
        setError(champ as keyof ValeursChantier, { message });
      }
    } else {
      setErreur(err.message);
    }
  }

  const envoyer = handleSubmit((valeurs) => {
    setErreur(null);
    if (chantier) {
      const donnees: ChantierModification = {
        ...valeurs,
        statut: chantier.statut === 'TERMINE' ? undefined : chantier.statut,
      };
      modifier.mutate(donnees, {
        onSuccess: () => {
          toast.success('Chantier modifié.');
          onOpenChange(false);
        },
        onError: afficherErreur,
      });
    } else {
      creer.mutate(valeurs, {
        onSuccess: (c) => {
          toast.success(`Chantier « ${c.nom} » créé au statut Planifié.`);
          onOpenChange(false);
        },
        onError: afficherErreur,
      });
    }
  });

  const enCours = creer.isPending || modifier.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>{modification ? 'Modifier le chantier' : 'Nouveau chantier'}</DialogTitle>

        <form onSubmit={envoyer} noValidate className="flex flex-col gap-4">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Champ
              libelle="Nom"
              placeholder="Ex. Résidence Les Oliviers"
              erreur={e.nom?.message}
              {...register('nom')}
            />
            <Champ
              libelle="Client"
              placeholder="Nom du client"
              erreur={e.client?.message}
              {...register('client')}
            />
            <Champ
              libelle="Adresse"
              placeholder="Quartier, ville"
              erreur={e.adresse?.message}
              {...register('adresse')}
            />
            <Champ
              libelle="Budget (MAD)"
              type="number"
              min={0}
              step="any"
              inputMode="numeric"
              placeholder="0"
              erreur={e.budget?.message}
              {...register('budget', { valueAsNumber: true })}
            />
            <Champ
              libelle="Date de début"
              type="date"
              erreur={e.dateDebut?.message}
              {...register('dateDebut')}
            />
            <Champ
              libelle="Date de fin prévue"
              type="date"
              aide="Postérieure ou égale à la date de début."
              erreur={e.dateFinPrevue?.message}
              {...register('dateFinPrevue')}
            />
          </div>

          {!modification && (
            <DialogDescription className="rounded-btn bg-surface-2 px-3.5 py-3 text-sm text-muted">
              Le chantier sera créé au statut <strong className="text-ink">Planifié</strong>.
            </DialogDescription>
          )}

          {erreur && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-btn bg-[var(--badge-rouge-bg)] px-3.5 py-3 text-sm text-[var(--badge-rouge-fg)]"
            >
              <TriangleAlert size={18} aria-hidden="true" className="mt-px flex-none" />
              {erreur}
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={enCours} className="font-bold">
              {modification ? 'Enregistrer' : 'Créer le chantier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
