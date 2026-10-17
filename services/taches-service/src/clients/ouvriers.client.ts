import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { appel } from './http';

/** Consommation REST du module Ouvriers (FastAPI). */
@Injectable()
export class OuvriersClient {
  private readonly baseUrl = process.env.OUVRIERS_URL ?? 'http://localhost:8083';

  async verifierDisponibles(ouvrierIds: number[]): Promise<void> {
    for (const id of ouvrierIds) {
      const res = await appel('Ouvriers', `${this.baseUrl}/api/ouvriers/${id}`);
      if (res.status === 404) throw new UnprocessableEntityException(`Ouvrier ${id} introuvable`);
      const ouvrier = (await res.json()) as { disponible: boolean; nom: string };
      if (!ouvrier.disponible) {
        throw new UnprocessableEntityException(`L'ouvrier ${id} (${ouvrier.nom}) n'est pas disponible`);
      }
    }
  }
}
