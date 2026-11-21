import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { appel, lireJson } from './http';

/** Consommation REST du module Chantiers (Spring Boot). */
@Injectable()
export class ChantiersClient {
  private readonly baseUrl = process.env.CHANTIERS_URL ?? 'http://localhost:8081';

  private async lire(chantierId: number): Promise<{ statut: string; nom: string }> {
    const res = await appel('Chantiers', `${this.baseUrl}/api/chantiers/${chantierId}`);
    if (res.status === 404) throw new NotFoundException(`Chantier ${chantierId} introuvable`);
    return lireJson<{ statut: string; nom: string }>('Chantiers', res);
  }

  /** RG-03 : seuls les chantiers PLANIFIE et EN_COURS acceptent de nouvelles tâches. */
  async verifierChantierActif(chantierId: number): Promise<void> {
    const chantier = await this.lire(chantierId);
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

  /** #99 : les tâches d'un chantier clôturé ne changent plus (un chantier suspendu reste modifiable). */
  async verifierChantierModifiable(chantierId: number): Promise<void> {
    const chantier = await this.lire(chantierId);
    if (chantier.statut === 'TERMINE') {
      throw new ConflictException(
        `Le chantier « ${chantier.nom} » est clôturé : ses tâches ne peuvent plus changer`,
      );
    }
  }
}