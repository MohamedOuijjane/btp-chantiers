import { DataSource } from 'typeorm';
import { optionsBase } from './options';

/**
 * Source de données de la CLI TypeORM (après npm run build) :
 *   npm run migration:run      applique les migrations en attente
 *   npm run migration:revert   annule la dernière
 * Le service applique déjà les migrations au démarrage (migrationsRun).
 */
export default new DataSource({ ...optionsBase(), migrationsRun: false });
