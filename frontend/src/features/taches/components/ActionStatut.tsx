import { ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { notifierErreur } from '@/lib/erreurs';

import { useChangerStatut } from '../hooks';
import { PROCHAIN_STATUT } from '../presentation';
import type { Tache } from '../types';

type Props = {
  tache: Pick<Tache, 'id' | 'titre' | 'statut'>;
  /** Chantier clôturé : l'action est désactivée. */
  lectureSeule?: boolean;
  taille?: 'sm' | 'default';
};

/** Bouton « Démarrer » (À faire → En cours) ou « Terminer » (En cours → Terminée). */
export function ActionStatut({ tache, lectureSeule = false, taille = 'sm' }: Props) {
  const changer = useChangerStatut();
  const prochain = PROCHAIN_STATUT[tache.statut];
  if (!prochain) return null;

  const Icone = prochain.statut === 'TERMINEE' ? Check : ArrowRight;
  const cliquer = () =>
    changer.mutate(
      { id: tache.id, statut: prochain.statut },
      {
        onSuccess: (t) =>
          toast.success(
            t.statut === 'TERMINEE'
              ? `« ${t.titre} » est terminée.`
              : `« ${t.titre} » est en cours.`,
          ),
        onError: notifierErreur,
      },
    );

  return (
    <Button
      variant="outline"
      size={taille}
      className="bg-surface"
      onClick={cliquer}
      disabled={lectureSeule || changer.isPending}
      aria-label={`${prochain.libelle} la tâche ${tache.titre}`}
    >
      <Icone size={16} aria-hidden="true" />
      {prochain.libelle}
    </Button>
  );
}
