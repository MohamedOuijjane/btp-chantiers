import { MigrationInterface, QueryRunner } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

/** Historique des changements de statut d'une tâche (issue #99). */
export class CreerHistoriqueStatut1794787200000 implements MigrationInterface {
  name = 'CreerHistoriqueStatut1794787200000';

  async up(q: QueryRunner): Promise<void> {
    const s = schema(q);
    await q.query(`
      CREATE TABLE "${s}".historique_statut (
        id       SERIAL PRIMARY KEY,
        tache_id INTEGER     NOT NULL REFERENCES "${s}".tache (id) ON DELETE CASCADE,
        statut   VARCHAR(10) NOT NULL
          CONSTRAINT historique_statut_valide CHECK (statut IN ('A_FAIRE', 'EN_COURS', 'TERMINEE', 'BLOQUEE')),
        date     TIMESTAMPTZ NOT NULL DEFAULT now(),
        motif    TEXT
      )`);
    await q.query(
      `CREATE INDEX historique_tache_idx ON "${s}".historique_statut (tache_id, date DESC, id DESC)`,
    );
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "${schema(q)}".historique_statut`);
  }
}

function schema(q: QueryRunner): string {
  return (q.connection.options as PostgresConnectionOptions).schema ?? 'taches';
}