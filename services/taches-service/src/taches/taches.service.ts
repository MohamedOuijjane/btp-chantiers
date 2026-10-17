import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { ChantiersClient } from '../clients/chantiers.client';
import { MateriauxSoapClient } from '../clients/materiaux.soap-client';
import { OuvriersClient } from '../clients/ouvriers.client';
import { AffectationDto, CreerTacheDto } from './tache.dto';
import { StatutTache, Tache, TacheDocument } from './tache.schema';

@Injectable()
export class TachesService {
  constructor(
    @InjectModel(Tache.name) private readonly model: Model<TacheDocument>,
    private readonly chantiers: ChantiersClient,
    private readonly ouvriers: OuvriersClient,
    private readonly materiaux: MateriauxSoapClient,
  ) {}

  lister(filtre: { chantierId?: number; ouvrierId?: number }) {
    const q: FilterQuery<TacheDocument> = {};
    if (filtre.chantierId) q.chantierId = filtre.chantierId;
    if (filtre.ouvrierId) q.ouvrierIds = filtre.ouvrierId;
    return this.model.find(q).sort({ dateDebut: 1 }).exec();
  }

  async trouver(id: string) {
    const tache = await this.model.findById(id).exec();
    if (!tache) throw new NotFoundException(`Tâche ${id} introuvable`);
    return tache;
  }

  /** Création : orchestre 3 modules (Chantiers REST, Ouvriers REST, Matériaux SOAP). */
  async creer(dto: CreerTacheDto) {
    if (new Date(dto.dateFin) < new Date(dto.dateDebut)) {
      throw new BadRequestException('dateFin doit être postérieure ou égale à dateDebut');
    }
    await this.chantiers.verifierChantierActif(dto.chantierId);
    if (dto.ouvrierIds?.length) await this.ouvriers.verifierDisponibles(dto.ouvrierIds);
    for (const b of dto.besoinsMateriaux ?? []) await this.materiaux.verifierStock(b.materiauId, b.quantite);
    return this.model.create(dto);
  }

  /** Règle métier : le statut découle de l'avancement (0 → A_FAIRE, 100 → TERMINEE). */
  async mettreAJourAvancement(id: string, avancement: number) {
    const tache = await this.trouver(id);
    tache.avancement = avancement;
    if (tache.statut !== StatutTache.BLOQUEE) {
      tache.statut =
        avancement === 100 ? StatutTache.TERMINEE : avancement > 0 ? StatutTache.EN_COURS : StatutTache.A_FAIRE;
    }
    return tache.save();
  }

  async affecter(id: string, dto: AffectationDto) {
    const tache = await this.trouver(id);
    await this.ouvriers.verifierDisponibles(dto.ouvrierIds);
    tache.ouvrierIds = dto.ouvrierIds;
    return tache.save();
  }

  async supprimer(id: string) {
    const res = await this.model.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException(`Tâche ${id} introuvable`);
  }
}
