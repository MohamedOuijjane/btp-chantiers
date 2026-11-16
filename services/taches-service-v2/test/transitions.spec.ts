import { ConflictException } from '@nestjs/common';
import { StatutTache } from '../src/taches/tache.entity';
import { verifierTransition } from '../src/taches/transitions';

const { A_FAIRE, EN_COURS, TERMINEE, BLOQUEE } = StatutTache;

describe('verifierTransition (#99)', () => {
  it.each([
    [A_FAIRE, EN_COURS],
    [EN_COURS, TERMINEE],
  ])('autorise %s → %s', (de, vers) => {
    expect(() => verifierTransition(de, vers)).not.toThrow();
  });

  it.each([
    [A_FAIRE, TERMINEE],
    [TERMINEE, EN_COURS],
    [TERMINEE, TERMINEE],
    [EN_COURS, EN_COURS],
    [EN_COURS, A_FAIRE],
  ])('refuse %s → %s (409)', (de, vers) => {
    expect(() => verifierTransition(de, vers)).toThrow(ConflictException);
  });

  it('refuse toute transition depuis une tâche BLOQUEE, avec le message attendu', () => {
    expect(() => verifierTransition(BLOQUEE, EN_COURS)).toThrow(
      'Débloquez la tâche avant de changer son statut',
    );
  });
});