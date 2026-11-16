import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChantiersClient } from '../clients/chantiers.client';
import { MateriauxSoapClient } from '../clients/materiaux.soap-client';
import { OuvriersClient } from '../clients/ouvriers.client';
import { BesoinMateriau, Tache } from './tache.entity';
import { TachesController } from './taches.controller';
import { TachesService } from './taches.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tache, BesoinMateriau])],
  controllers: [TachesController],
  providers: [TachesService, ChantiersClient, OuvriersClient, MateriauxSoapClient],
})
export class TachesModule {}
