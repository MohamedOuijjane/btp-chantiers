import type { DataSourceOptions } from 'typeorm';
import { CreerTaches1762473600000 } from '../migrations/1762473600000-CreerTaches';
import { BesoinMateriau, Tache } from '../taches/tache.entity';

/**
 * Connexion à la base unique btp_db (ADR-0005) : utilisateur taches_user, schéma taches.
 * Le schéma est créé par les migrations (jamais par synchronize), appliquées au démarrage.
 */
export function optionsBase(env: NodeJS.ProcessEnv = process.env): DataSourceOptions {
  return {
    type: 'postgres',
    url: env.DATABASE_URL ?? 'postgres://taches_user:taches@localhost:5432/btp_db',
    schema: env.DB_SCHEMA ?? 'taches',
    entities: [Tache, BesoinMateriau],
    migrations: [CreerTaches1762473600000],
    migrationsTableName: 'migrations',
    migrationsRun: true,
    synchronize: false,
  };
}
