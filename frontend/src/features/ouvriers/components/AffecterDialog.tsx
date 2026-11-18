import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { ApiError } from '@/api/errors';
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
import { useChantiers } from '@/features/chantiers/hooks';
import { useAffecterOuvriers, useTaches } from '@/features/taches/hooks';
import { formatDateCourte } from '@/lib/format';
import { notifierErreur } from '@/lib/erreurs';

import type { Ouvrier } from '../types';

type Props = { open: boolean; onOpenChange: (open: boolean) => void; ouvrier: Ouvrier };

/**
 * Affecter l'ouvrier à une tâche (endpoint du module Tâches : PATCH /api/taches/{id}/ouvriers).
 * Le module Tâches vérifie la disponibilité (422) et les conflits de planning (409).
 */
export function AffecterDialog({ open, onOpenChange, ouvrier }: Props) {
  const taches = useTaches();
  const chantiers = useChantiers();
  const affecter = useAffecterOuvriers();
  const [tacheId, setTacheId] = useState('');
  const [erreur, setErreur] = useState<ApiError | null>(null);

  useEffect(() => {
    if (open) {
      setTacheId('');
      setErreur(null);
    }
  }, [open]);

  const clos = new Set(chantiers.data?.filter((c) => c.statut === 'TERMINE').map((c) => c.id));
  const nomChantier = (id: number) => chantiers.data?.find((c) => c.id === id)?.nom ?? '';
  const possibles = (taches.data ?? []).filter(
    (t) => t.statut !== 'TERMINEE' && !t.ouvrierIds.includes(ouvrier.id) && !clos.has(t.chantierId),
  );

  const confirmer = () => {
    const t = possibles.find((x) => x.id === Number(tacheId));
    if (!t) return;
    setErreur(null);
    affecter.mutate(
      { id: t.id, ouvrierIds: [...t.ouvrierIds, ouvrier.id] },
      {
        onSuccess: () => {
          toast.success(`${ouvrier.prenom} ${ouvrier.nom} affecté à « ${t.titre} ».`);
          onOpenChange(false);
        },
        onError: (err) => {
          setErreur(err);
          notifierErreur(err);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogTitle>Affecter à une tâche</DialogTitle>
        <DialogDescription className="text-muted">
          Le module Tâches vérifie que {ouvrier.prenom} {ouvrier.nom} est disponible et libre sur la
          période de la tâche.
        </DialogDescription>
        {erreur && <AlerteErreur erreur={erreur} />}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="affecter-tache" className="text-sm font-semibold">
            Tâche
          </label>
          <select
            id="affecter-tache"
            value={tacheId}
            onChange={(e) => setTacheId(e.target.value)}
            disabled={Boolean(taches.error)}
            className="min-h-[46px] rounded-btn border border-line bg-surface px-3 text-ink"
          >
            <option value="">
              {taches.error ? 'Tâches indisponibles (module Tâches)' : 'Choisir une tâche…'}
            </option>
            {possibles.map((t) => (
              <option key={t.id} value={t.id}>
                {t.titre} · {nomChantier(t.chantierId)} ({formatDateCourte(t.dateDebut)} →{' '}
                {formatDateCourte(t.dateFin)})
              </option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button
            onClick={confirmer}
            disabled={!tacheId || affecter.isPending}
            className="font-bold"
          >
            Affecter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
