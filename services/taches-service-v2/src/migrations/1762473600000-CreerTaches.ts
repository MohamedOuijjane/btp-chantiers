import { MigrationInterface, QueryRunner } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

/** Tables du module Tâches dans le schéma taches de btp_db (ADR-0005). */
export class CreerTaches1762473600000 implements MigrationInterface {
  name = 'CreerTaches1762473600000';

  async up(q: QueryRunner): Promise<void> {
    const s = schema(q);
    await q.query(`
      CREATE TABLE "${s}".tache (
        id          SERIAL PRIMARY KEY,
        chantier_id INTEGER      NOT NULL,
        titre       VARCHAR(200) NOT NULL,
        description TEXT,
        date_debut  DATE         NOT NULL,
        date_fin    DATE         NOT NULL,
        statut      VARCHAR(10)  NOT NULL DEFAULT 'A_FAIRE'
          CONSTRAINT tache_statut_valide CHECK (statut IN ('A_FAIRE', 'EN_COURS', 'TERMINEE', 'BLOQUEE')),
        avancement  SMALLINT     NOT NULL DEFAULT 0
          CONSTRAINT tache_avancement_pourcentage CHECK (avancement BETWEEN 0 AND 100),
        ouvrier_ids INTEGER[]    NOT NULL DEFAULT '{}',
        cree_le     TIMESTAMPTZ  NOT NULL DEFAULT now(),
        modifie_le  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT tache_periode_valide CHECK (date_fin >= date_debut)
      )`);
    await q.query(`CREATE INDEX tache_chantier_idx ON "${s}".tache (chantier_id)`);
    // Index GIN : recherche des tâches d'un ouvrier (:id = ANY(ouvrier_ids)), planning et affectations.
    await q.query(`CREATE INDEX tache_ouvriers_idx ON "${s}".tache USING GIN (ouvrier_ids)`);
    await q.query(`
      CREATE TABLE "${s}".besoin_materiau (
        tache_id    INTEGER       NOT NULL REFERENCES "${s}".tache (id) ON DELETE CASCADE,
        materiau_id INTEGER       NOT NULL,
        quantite    NUMERIC(12,3) NOT NULL CONSTRAINT besoin_quantite_positive CHECK (quantite > 0),
        PRIMARY KEY (tache_id, materiau_id)
      )`);
  }

  async down(q: QueryRunner): Promise<void> {
    const s = schema(q);
    await q.query(`DROP TABLE "${s}".besoin_materiau`);
    await q.query(`DROP TABLE "${s}".tache`);
  }
}

function schema(q: QueryRunner): string {
  return (q.connection.options as PostgresConnectionOptions).schema ?? 'taches';
}
