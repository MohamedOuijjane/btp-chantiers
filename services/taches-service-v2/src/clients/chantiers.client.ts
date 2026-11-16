import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { appel } from './http';

/** Consommation REST du module Chantiers (Spring Boot). */
@Injectable()
export class ChantiersClient {
  private readonly baseUrl = process.env.CHANTIERS_URL ?? 'http://localhost:8081';

  /** RG-03 : seuls les chantiers PLANIFIE et EN_COURS acceptent de nouvelles tâches. */
  async verifierChantierActif(chantierId: number): Promise<void> {
    const res = await appel('Chantiers', `${this.baseUrl}/api/chantiers/${chantierId}`);
    if (res.status === 404) throw new NotFoundException(`Chantier ${chantierId} introuvable`);
    const chantier = (await res.json()) as { statut: string; nom: string };
    if (chantier.statut === 'SUSPENDU') {
      throw new ConflictException(
        `Le chantier « ${chantier.nom} » est suspendu : aucune tâche ne peut y être ajoutée`,
      );
    }
    if (chantier.statut === 'TERMINE') {
      throw new ConflictException(
        `Le chantier « ${chantier.nom} » est clôturé : aucune tâche ne peut y être ajoutée`,
      );
    }
  }
}