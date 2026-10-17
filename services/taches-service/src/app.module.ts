import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthController } from './health/health.controller';
import { TachesModule } from './taches/taches.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URL ?? 'mongodb://localhost:27017/taches_db'),
    TachesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
