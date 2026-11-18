import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiError } from '@/api/errors';
import { AlerteErreur } from '@/components/common/AlerteErreur';
import { Champ } from '@/components/common/Champ';
import { Pastille } from '@/components/common/Pastille';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Chantier } from '@/features/chantiers/types';
import { formatNombre } from '@/lib/format';
import { notifierErreur } from '@/lib/erreurs';
import { cn } from '@/lib/utils';

import { useEnregistrerMouvement } from '../hooks';
import { schemaMouvement, type ValeursMouvement } from '../schemas';
import type { Materiau } from '../types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materiaux: Materiau[];
  chantiers: Chantier[];
};

const VIDE: ValeursMouvement = {
  type: 'SORTIE',
  materiauId: Number.NaN,
  chantierId: Number.NaN,
  quantite: Number.NaN,
};

const CLASSE_SELECT = 'min-h-[46px] rounded-btn border bg-surface px-3 text-ink';

/** Dialogue « Mouvement de stock » (opération SOAP EnregistrerMouvement). */
export function MouvementDialog({ open, onOpenChange, materiaux, chantiers }: Props) {
  const enregistrer = useEnregistrerMouvement();
  const [erreur, setErreur] = useState<ApiError | null>(null);
  const { register, handleSubmit, reset, watch, setValue, formState } = useForm<ValeursMouvement>({
    resolver: zodResolver(schemaMouvement),
    defaultValues: VIDE,
  });
  const e = formState.errors;

  useEffect(() => {
    if (open) {
      reset(VIDE);
      setErreur(null);
    }
  }, [open, reset]);

  const type = watch('type');
  const quantite = watch('quantite');
  const materiau = materiaux.find((m) => m.id === watch('materiauId'));
  const insuffisant = type === 'SORTIE' && materiau && quantite > materiau.stock;

  const envoyer = handleSubmit((v) => {
    setErreur(null);
    enregistrer.mutate(v, {
      onSuccess: (r) => {
        const m = materiaux.find((x) => x.id === v.materiauId);
        const quoi = v.type === 'SORTIE' ? 'Sortie' : 'Entrée';
        toast.success(
          `${quoi} enregistrée : ${m?.nom} ${formatNombre(r.stockApres)} ${m?.unite} en stock.`,
        );
        if (r.enAlerte) toast.warning(`${m?.nom} est sous le seuil d’alerte.`);
        onOpenChange(false);
      },
      onError: (err) => {
        setErreur(err);
        notifierErreur(err);
      },
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]" aria-describedby={undefined}>
        <DialogTitle>Mouvement de stock</DialogTitle>
        {erreur && <AlerteErreur erreur={erreur} />}
        <form onSubmit={envoyer} noValidate className="flex flex-col gap-4">
          <div role="radiogroup" aria-label="Type de mouvement" className="grid grid-cols-2 gap-2">
            {(['ENTREE', 'SORTIE'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setValue('type', t)}
                className={cn(
                  'min-h-cible rounded-btn border font-semibold',
                  type === t ? 'border-ink bg-ink text-surface' : 'border-line bg-surface text-ink',
                )}
              >
                {t === 'ENTREE' ? 'Entrée' : 'Sortie'}
              </button>
            ))}
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="mvt-materiau" className="text-sm font-semibold">
                Matériau
              </label>
              <select
                id="mvt-materiau"
                aria-invalid={e.materiauId ? true : undefined}
                className={cn(
                  CLASSE_SELECT,
                  e.materiauId ? 'border-[var(--bar-rouge)]' : 'border-line',
                )}
                {...register('materiauId', { valueAsNumber: true })}
              >
                <option value="">Choisir…</option>
                {materiaux.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom} · stock {formatNombre(m.stock)} {m.unite}
                  </option>
                ))}
              </select>
              {e.materiauId && (
                <span className="text-[13px] text-[var(--badge-rouge-fg)]">
                  {e.materiauId.message}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="mvt-chantier" className="text-sm font-semibold">
                Chantier
              </label>
              <select
                id="mvt-chantier"
                aria-invalid={e.chantierId ? true : undefined}
                className={cn(
                  CLASSE_SELECT,
                  e.chantierId ? 'border-[var(--bar-rouge)]' : 'border-line',
                )}
                {...register('chantierId', { valueAsNumber: true })}
              >
                <option value="">Choisir…</option>
                {chantiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                    {c.statut === 'TERMINE' ? ' (clôturé)' : ''}
                  </option>
                ))}
              </select>
              {e.chantierId && (
                <span className="text-[13px] text-[var(--badge-rouge-fg)]">
                  {e.chantierId.message}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-44">
              <Champ
                libelle={`Quantité${materiau ? ` (${materiau.unite})` : ''}`}
                type="number"
                min={0}
                step="any"
                erreur={e.quantite?.message}
                {...register('quantite', { valueAsNumber: true })}
              />
            </div>
            {materiau && quantite > 0 && type === 'SORTIE' && (
              <span className="flex min-h-[46px] items-center">
                {insuffisant ? (
                  <Pastille ton="rouge">Stock insuffisant</Pastille>
                ) : (
                  <Pastille ton="vert">Disponible</Pastille>
                )}
              </span>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" className="font-bold" disabled={enregistrer.isPending}>
              Enregistrer le mouvement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
