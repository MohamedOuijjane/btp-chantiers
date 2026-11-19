import { ConflictException } from '@nestjs/common';
import { StatutTache } from './tache.entity';

const TRANSITIONS_PERMISES: Partial<Record<StatutTache, StatutTache[]>> = {
  [StatutTache.A_FAIRE]: [StatutTache.EN_COURS],
  [StatutTache.EN_COURS]: [StatutTache.TERMINEE],
};

/** Transitions de PATCH /statut (#99) : A_FAIRE → EN_COURS → TERMINEE, sinon 409. */
export function verifierTransition(actuel: StatutTache, cible: StatutTache): void {
  if (actuel === StatutTache.BLOQUEE) {
    throw new ConflictException('Débloquez la tâche avant de changer son statut');
  }
  if (!TRANSITIONS_PERMISES[actuel]?.includes(cible)) {
    throw new ConflictException(`Transition impossible : ${actuel} → ${cible}`);
  }
}