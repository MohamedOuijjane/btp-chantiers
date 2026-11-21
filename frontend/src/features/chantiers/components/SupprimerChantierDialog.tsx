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

import { useSupprimerChantier } from '../hooks';
import type { Chantier } from '../types';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; chantier: Chantier };

/**
 * Confirmation de suppression d'un chantier. Refusée (409, tâches citées) si le chantier a des
 * tâches, terminées comprises (#5) ; 503 si le module Tâches ne répond pas (rien n'est supprimé).
 */
export function SupprimerChantierDialog({ open, onOpenChange, chantier }: Props) {
  const supprimer = useSupprimerChantier();
  const navigate = useNavigate();
  const { reset } = supprimer;

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const confirmer = () =>
    supprimer.mutate(chantier.id, {
      onSuccess: () => {
        toast.success(`Le chantier « ${chantier.nom} » a été supprimé.`);
        navigate('/chantiers');
      },
      onError: notifierErreur,
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogTitle>Supprimer le chantier ?</DialogTitle>
        <DialogDescription>
          Le chantier « {chantier.nom} » sera définitivement supprimé. La suppression est refusée
          s’il a encore des tâches, même terminées.
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
