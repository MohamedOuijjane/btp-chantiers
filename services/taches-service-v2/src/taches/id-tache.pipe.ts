import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/** Plus grand entier d'une colonne SERIAL (int4) : au-delà, PostgreSQL lèverait une erreur SQL (500). */
const ID_MAX = 2_147_483_647;

/**
 * Valide l'identifiant d'une tâche (#9) : entier strictement positif, sinon 400.
 * Renvoie la valeur reçue telle quelle : le ValidationPipe global (transform: true) convertit
 * un paramètre typé number avant ce pipe ('abc' deviendrait NaN), d'où un paramètre typé string.
 */
@Injectable()
export class IdTachePipe implements PipeTransform<string, string> {
  transform(valeur: string): string {
    const texte = String(valeur);
    const id = Number(texte);
    if (!/^\d+$/.test(texte) || id < 1 || id > ID_MAX) {
      throw new BadRequestException(
        `L'identifiant de tâche doit être un entier positif (reçu : « ${texte} »)`,
      );
    }
    return texte;
  }
}