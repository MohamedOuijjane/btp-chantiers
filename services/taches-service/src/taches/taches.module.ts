import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChantiersClient } from '../clients/chantiers.client';
import { MateriauxSoapClient } from '../clients/materiaux.soap-client';
import { OuvriersClient } from '../clients/ouvriers.client';
import { Tache, TacheSchema } from './tache.schema';
import { TachesController } from './taches.controller';
import { TachesService } from './taches.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Tache.name, schema: TacheSchema }])],
  controllers: [TachesController],
  providers: [TachesService, ChantiersClient, OuvriersClient, MateriauxSoapClient],
})
export class TachesModule {}
