import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

export const LIMITE_HISTORIQUE_DEFAUT = 20;
export const LIMITE_HISTORIQUE_MAX = 100;

/**
 * Paramètre `limite` de GET /api/taches/historique (#142) : absent → 20, sinon entier de 1 à 100
 * (400 sinon). Comme IdTachePipe, renvoie un texte : un paramètre typé number serait converti par le
 * ValidationPipe global avant ce pipe (« abc » deviendrait NaN).
 */
@Injectable()
export class LimiteHistoriquePipe implements PipeTransform<string | undefined, string> {
  transform(valeur: string | undefined): string {
    if (valeur === undefined) return String(LIMITE_HISTORIQUE_DEFAUT);
    const texte = String(valeur);
    const limite = Number(texte);
    if (!/^\d+$/.test(texte) || limite < 1 || limite > LIMITE_HISTORIQUE_MAX) {
      throw new BadRequestException(
        `Le paramètre limite doit être un entier entre 1 et ${LIMITE_HISTORIQUE_MAX} (reçu : « ${texte} »)`,
      );
    }
    return texte;
  }
}
