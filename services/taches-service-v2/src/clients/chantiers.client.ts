import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { appel } from './http';

/** Consommation REST du module Chantiers (Spring Boot). */
@Injectable()
export class ChantiersClient {
  private readonly baseUrl = process.env.CHANTIERS_URL ?? 'http://localhost:8081';

  async verifierChantierActif(chantierId: number): Promise<void> {
    const res = await appel('Chantiers', `${this.baseUrl}/api/chantiers/${chantierId}`);
    if (res.status === 404) throw new NotFoundException(`Chantier ${chantierId} introuvable`);
    const chantier = (await res.json()) as { statut: string };
    if (chantier.statut === 'TERMINE') {
      throw new UnprocessableEntityException(`Le chantier ${chantierId} est terminé`);
    }
  }
}
