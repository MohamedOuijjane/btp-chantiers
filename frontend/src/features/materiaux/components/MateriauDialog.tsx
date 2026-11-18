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
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { notifierErreur } from '@/lib/erreurs';

import { useAjouterMateriau } from '../hooks';
import { schemaMateriau, type ValeursMateriau } from '../schemas';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

const VIDE: ValeursMateriau = {
  reference: '',
  nom: '',
  unite: '',
  stock: Number.NaN,
  seuilAlerte: Number.NaN,
};

/** Dialogue « Nouveau matériau » (opération SOAP AjouterMateriau). */
export function MateriauDialog({ open, onOpenChange }: Props) {
  const ajouter = useAjouterMateriau();
  const [erreur, setErreur] = useState<ApiError | null>(null);
  const { register, handleSubmit, reset, formState } = useForm<ValeursMateriau>({
    resolver: zodResolver(schemaMateriau),
    defaultValues: VIDE,
  });
  const e = formState.errors;

  useEffect(() => {
    if (open) {
      reset(VIDE);
      setErreur(null);
    }
  }, [open, reset]);

  // Une SOAP Fault ne désigne pas de champ : l'erreur du serveur s'affiche en alerte.
  const envoyer = handleSubmit((v) => {
    setErreur(null);
    ajouter.mutate(
      {
        reference: v.reference.trim().toUpperCase(),
        nom: v.nom.trim(),
        unite: v.unite.trim(),
        stock: v.stock,
        seuilAlerte: v.seuilAlerte,
      },
      {
        onSuccess: (m) => {
          toast.success(`${m.nom} (${m.reference}) ajouté au stock.`);
          onOpenChange(false);
        },
        onError: (err) => {
          setErreur(err);
          notifierErreur(err);
        },
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Nouveau matériau</DialogTitle>
        <DialogDescription className="text-muted">
          Le matériau est en alerte dès que son stock est inférieur ou égal au seuil.
        </DialogDescription>
        {erreur && <AlerteErreur erreur={erreur} />}
        <form onSubmit={envoyer} noValidate className="flex flex-col gap-4">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Champ
              libelle="Référence"
              placeholder="MAT-007"
              autoComplete="off"
              className="font-mono uppercase"
              erreur={e.reference?.message}
              {...register('reference')}
            />
            <Champ
              libelle="Nom"
              placeholder="Ex. Carrelage 60×60"
              erreur={e.nom?.message}
              {...register('nom')}
            />
            <Champ
              libelle="Unité"
              placeholder="sacs, m³, t…"
              erreur={e.unite?.message}
              {...register('unite')}
            />
            <Champ
              libelle="Stock initial"
              type="number"
              min={0}
              step="any"
              erreur={e.stock?.message}
              {...register('stock', { valueAsNumber: true })}
            />
            <Champ
              libelle="Seuil d’alerte"
              type="number"
              min={0}
              step="any"
              erreur={e.seuilAlerte?.message}
              {...register('seuilAlerte', { valueAsNumber: true })}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" className="font-bold" disabled={ajouter.isPending}>
              Ajouter le matériau
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
