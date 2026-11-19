import { BadRequestException } from '@nestjs/common';
import { IdTachePipe } from '../src/taches/id-tache.pipe';

describe('IdTachePipe (#9)', () => {
  const pipe = new IdTachePipe();

  it.each(['1', '42', '99999', '2147483647'])('accepte « %s »', (entree) => {
    expect(pipe.transform(entree)).toBe(entree);
  });

  it.each(['abc', '12abc', '1.5', '', ' 7', '1e3', 'null', '-1', '0', '-42', '2147483648', '99999999999999999999'])(
    'refuse « %s » (400)',
    (entree) => {
      expect(() => pipe.transform(entree)).toThrow(BadRequestException);
    },
  );

  it("le message cite l'identifiant reçu et suit le format NestJS", () => {
    let erreur: BadRequestException | undefined;
    try {
      pipe.transform('abc');
    } catch (e) {
      erreur = e as BadRequestException;
    }
    expect(erreur?.getStatus()).toBe(400);
    expect(erreur?.getResponse()).toEqual({
      statusCode: 400,
      message: "L'identifiant de tâche doit être un entier positif (reçu : « abc »)",
      error: 'Bad Request',
    });
  });
});