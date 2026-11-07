import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { optionsBase } from './database/options';
import { HealthController } from './health/health.controller';
import { TachesModule } from './taches/taches.module';

@Module({
  imports: [TypeOrmModule.forRoot(optionsBase()), TachesModule],
  controllers: [HealthController],
})
export class AppModule {}
