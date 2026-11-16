import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChantiersClient } from '../clients/chantiers.client';
import { MateriauxSoapClient } from '../clients/materiaux.soap-client';
import { OuvriersClient } from '../clients/ouvriers.client';
import { HistoriqueStatut } from './historique.entity';
import { HistoriqueService } from './historique.service';
import { BesoinMateriau, Tache } from './tache.entity';
import { TachesController } from './taches.controller';
import { TachesService } from './taches.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tache, BesoinMateriau, HistoriqueStatut])],
  controllers: [TachesController],
  providers: [TachesService, HistoriqueService, ChantiersClient, OuvriersClient, MateriauxSoapClient],
})
export class TachesModule {}