import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChantiersClient } from '../clients/chantiers.client';
import { MateriauxSoapClient } from '../clients/materiaux.soap-client';
import { OuvriersClient } from '../clients/ouvriers.client';
import { AffectationDto, CreerTacheDto } from './tache.dto';
import { StatutTache, Tache } from './tache.entity';

/** Tâche telle que renvoyée par l'API (identifiant entier, dates aaaa-mm-jj). */
export type TacheReponse = {
  id: number;
  chantierId: number;
  titre: string;
  description?: string;
  dateDebut: string;
  dateFin: string;
  statut: StatutTache;
  avancement: number;
  ouvrierIds: number[];
  besoinsMateriaux: { materiauId: number; quantite: number }[];
};

export function versReponse(t: Tache): TacheReponse {
  return {
    id: t.id,
    chantierId: t.chantierId,
    titre: t.titre,
    ...(t.description ? { description: t.description } : {}),
    dateDebut: t.dateDebut,
    dateFin: t.dateFin,
    statut: t.statut,
    avancement: t.avancement,
    ouvrierIds: t.ouvrierIds ?? [],
    besoinsMateriaux: (t.besoinsMateriaux ?? [])
      .map((b) => ({ materiauId: b.materiauId, quantite: b.quantite }))
      .sort((a, b) => a.materiauId - b.materiauId),
  };
}

/** RG5 : le statut découle de l'avancement (0 → A_FAIRE, 1-99 → EN_COURS, 100 → TERMINEE). */
export function statutPourAvancement(avancement: number): StatutTache {
  if (avancement === 100) return StatutTache.TERMINEE;
  return avancement > 0 ? StatutTache.EN_COURS : StatutTache.A_FAIRE;
}

@Injectable()
export class TachesService {
  constructor(
    @InjectRepository(Tache) private readonly taches: Repository<Tache>,
    private readonly chantiers: ChantiersClient,
    private readonly ouvriers: OuvriersClient,
    private readonly materiaux: MateriauxSoapClient,
  ) {}

  async lister(filtre: { chantierId?: number; ouvrierId?: number }): Promise<TacheReponse[]> {
    const q = this.taches
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.besoinsMateriaux', 'b')
      .orderBy('t.dateDebut', 'ASC')
      .addOrderBy('t.id', 'ASC');
    if (filtre.chantierId) q.andWhere('t.chantierId = :chantierId', { chantierId: filtre.chantierId });
    if (filtre.ouvrierId) q.andWhere(':ouvrierId = ANY(t.ouvrier_ids)', { ouvrierId: filtre.ouvrierId });
    return (await q.getMany()).map(versReponse);
  }

  async trouver(id: number): Promise<TacheReponse> {
    return versReponse(await this.charger(id));
  }

  /** Création : orchestre 3 modules (Chantiers REST, Ouvriers REST, Matériaux SOAP). */
  async creer(dto: CreerTacheDto): Promise<TacheReponse> {
    if (new Date(dto.dateFin) < new Date(dto.dateDebut)) {
      throw new BadRequestException('dateFin doit être postérieure ou égale à dateDebut');
    }
    const besoins = dto.besoinsMateriaux ?? [];
    const doublon = besoins.find((b, i) => besoins.findIndex((x) => x.materiauId === b.materiauId) !== i);
    if (doublon) {
      throw new BadRequestException(`Le matériau ${doublon.materiauId} apparaît plusieurs fois dans besoinsMateriaux`);
    }
    await this.chantiers.verifierChantierActif(dto.chantierId);
    if (dto.ouvrierIds?.length) await this.ouvriers.verifierDisponibles(dto.ouvrierIds);
    for (const b of besoins) await this.materiaux.verifierStock(b.materiauId, b.quantite);

    const cree = await this.taches.save(
      this.taches.create({
        chantierId: dto.chantierId,
        titre: dto.titre,
        description: dto.description ?? null,
        dateDebut: dto.dateDebut.slice(0, 10),
        dateFin: dto.dateFin.slice(0, 10),
        statut: StatutTache.A_FAIRE,
        avancement: 0,
        ouvrierIds: dto.ouvrierIds ?? [],
        besoinsMateriaux: besoins.map((b) => ({ materiauId: b.materiauId, quantite: b.quantite })),
      }),
    );
    return this.trouver(cree.id);
  }

  /** Une tâche bloquée garde son statut (RG5 ne s'applique qu'au déblocage, #11). */
  async mettreAJourAvancement(id: number, avancement: number): Promise<TacheReponse> {
    const tache = await this.charger(id);
    tache.avancement = avancement;
    if (tache.statut !== StatutTache.BLOQUEE) tache.statut = statutPourAvancement(avancement);
    return versReponse(await this.taches.save(tache));
  }

  async affecter(id: number, dto: AffectationDto): Promise<TacheReponse> {
    const tache = await this.charger(id);
    await this.ouvriers.verifierDisponibles(dto.ouvrierIds);
    tache.ouvrierIds = dto.ouvrierIds;
    return versReponse(await this.taches.save(tache));
  }

  /** Les besoins en matériaux sont supprimés avec la tâche (ON DELETE CASCADE). */
  async supprimer(id: number): Promise<void> {
    const res = await this.taches.delete({ id });
    if (!res.affected) throw new NotFoundException(`Tâche ${id} introuvable`);
  }

  private async charger(id: number): Promise<Tache> {
    const tache = await this.taches.findOne({ where: { id } });
    if (!tache) throw new NotFoundException(`Tâche ${id} introuvable`);
    return tache;
  }
}
