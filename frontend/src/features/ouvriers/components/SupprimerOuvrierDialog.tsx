import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { AlerteErreur } from '@/components/common/AlerteErreur';
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

import { useSupprimerOuvrier } from '../hooks';
import type { Ouvrier } from '../types';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; ouvrier: Ouvrier };

/** Confirmation de suppression ; refusée (409) si l'ouvrier a des tâches en cours (#15). */
export function SupprimerOuvrierDialog({ open, onOpenChange, ouvrier }: Props) {
  const supprimer = useSupprimerOuvrier();
  const navigate = useNavigate();
  const { reset } = supprimer;

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const confirmer = () =>
    supprimer.mutate(ouvrier.id, {
      onSuccess: () => {
        toast.success(`${ouvrier.prenom} ${ouvrier.nom} a été supprimé.`);
        navigate('/ouvriers');
      },
      onError: notifierErreur,
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogTitle>Supprimer l’ouvrier ?</DialogTitle>
        <DialogDescription>
          {ouvrier.prenom} {ouvrier.nom} sera retiré de l’équipe. La suppression est refusée s’il
          est encore affecté à des tâches en cours.
        </DialogDescription>
        {supprimer.error && <AlerteErreur erreur={supprimer.error} />}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button
            onClick={confirmer}
            disabled={supprimer.isPending}
            className="bg-[var(--bar-rouge)] font-bold text-white hover:brightness-95"
          >
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
