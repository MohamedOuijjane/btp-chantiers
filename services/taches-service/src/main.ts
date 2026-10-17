import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('Tâches Service')
    .setDescription('Module Tâches & Avancement - Gestion de chantiers BTP (Équipe 18)')
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup('swagger-ui', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT ?? 8082);
  await app.listen(port);
  Logger.log(`taches-service démarré sur le port ${port}`, 'Bootstrap');
}
bootstrap();
