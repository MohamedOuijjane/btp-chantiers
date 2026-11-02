import { TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';

import { useCloturerChantier } from '../hooks';
import type { Chantier } from '../types';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; chantier: Chantier };

/** Confirmation de clôture : le chantier passe à TERMINE et devient en lecture seule. */
export function CloturerDialog({ open, onOpenChange, chantier }: Props) {
  const cloturer = useCloturerChantier();
  const { reset } = cloturer;

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const confirmer = () =>
    cloturer.mutate(chantier.id, {
      onSuccess: () => {
        toast.success('Chantier clôturé : statut Terminé, lecture seule.');
        onOpenChange(false);
      },
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogTitle>Clôturer le chantier ?</DialogTitle>
        <DialogDescription>
          « {chantier.nom} » passera au statut <strong>Terminé</strong>. Un chantier terminé ne peut
          plus être modifié et ne reçoit plus de nouvelles tâches.
        </DialogDescription>

        {cloturer.error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-btn bg-[var(--badge-rouge-bg)] px-3.5 py-3 text-sm text-[var(--badge-rouge-fg)]"
          >
            <TriangleAlert size={18} aria-hidden="true" className="mt-px flex-none" />
            {cloturer.error.message}
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button onClick={confirmer} disabled={cloturer.isPending} className="font-bold">
            Clôturer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
