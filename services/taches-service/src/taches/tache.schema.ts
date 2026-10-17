import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum StatutTache {
  A_FAIRE = 'A_FAIRE',
  EN_COURS = 'EN_COURS',
  TERMINEE = 'TERMINEE',
  BLOQUEE = 'BLOQUEE',
}

@Schema({ _id: false })
export class BesoinMateriau {
  @Prop({ required: true }) materiauId: number;
  @Prop({ required: true, min: 0 }) quantite: number;
}
const BesoinMateriauSchema = SchemaFactory.createForClass(BesoinMateriau);

@Schema({ timestamps: true, collection: 'taches' })
export class Tache {
  @Prop({ required: true, index: true }) chantierId: number;
  @Prop({ required: true }) titre: string;
  @Prop() description?: string;
  @Prop({ required: true }) dateDebut: Date;
  @Prop({ required: true }) dateFin: Date;
  @Prop({ type: String, enum: StatutTache, default: StatutTache.A_FAIRE }) statut: StatutTache;
  @Prop({ default: 0, min: 0, max: 100 }) avancement: number;
  @Prop({ type: [Number], default: [], index: true }) ouvrierIds: number[];
  @Prop({ type: [BesoinMateriauSchema], default: [] }) besoinsMateriaux: BesoinMateriau[];
}

export type TacheDocument = HydratedDocument<Tache>;
export const TacheSchema = SchemaFactory.createForClass(Tache);
