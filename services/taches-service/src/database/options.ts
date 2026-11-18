import type { DataSourceOptions } from 'typeorm';
import { CreerTaches1762473600000 } from '../migrations/1762473600000-CreerTaches';
import { BesoinMateriau, Tache } from '../taches/tache.entity';

/**
 * Connexion à la base unique btp_db (ADR-0005) : utilisateur taches_user, schéma taches.
 * Le schéma est créé par les migrations (jamais par synchronize), appliquées au démarrage.
 *
 * Aucun mot de passe dans le code : DATABASE_URL (Docker Compose) ou, en développement local,
 * DB_HOST, DB_PORT, DB_USER et DB_PASSWORD (même valeur que TACHES_DB_PASSWORD du .env).
 */
export function optionsBase(env: NodeJS.ProcessEnv = process.env): DataSourceOptions {
  const connexion = env.DATABASE_URL
    ? { url: env.DATABASE_URL }
    : {
        host: env.DB_HOST ?? 'localhost',
        port: Number(env.DB_PORT ?? 5432),
        username: env.DB_USER ?? 'taches_user',
        password: env.DB_PASSWORD,
        database: env.DB_NAME ?? 'btp_db',
      };
  return {
    type: 'postgres',
    ...connexion,
    schema: env.DB_SCHEMA ?? 'taches',
    entities: [Tache, BesoinMateriau],
    migrations: [CreerTaches1762473600000],
    migrationsTableName: 'migrations',
    migrationsRun: true,
    synchronize: false,
  };
}
