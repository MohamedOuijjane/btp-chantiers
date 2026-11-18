#!/bin/sh
# Base unique "btp_db" : un schéma par module, un utilisateur par module.
# Chaque utilisateur ne voit et ne modifie QUE son schéma (isolation des modules).
# Le schéma "auth" contient les comptes de connexion (ADR-0006), utilisés par Chantiers.
#
# Exécuté automatiquement par l'image postgres au premier démarrage (volume vide).
# Rejouable sur une base existante (ajoute ce qui manque, par exemple le schéma auth) :
#   docker compose exec -T postgres sh /docker-entrypoint-initdb.d/init.sh
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
  REVOKE ALL ON SCHEMA public FROM PUBLIC;

  DO \$\$
  DECLARE
    m record;
  BEGIN
    FOR m IN SELECT * FROM (VALUES
        ('chantiers', '${CHANTIERS_DB_PASSWORD:-chantiers}'),
        ('taches',    '${TACHES_DB_PASSWORD:-taches}'),
        ('ouvriers',  '${OUVRIERS_DB_PASSWORD:-ouvriers}'),
        ('materiaux', '${MATERIAUX_DB_PASSWORD:-materiaux}'),
        ('auth',      '${AUTH_DB_PASSWORD:-auth}')
      ) AS t(schema_nom, mot_de_passe)
    LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = m.schema_nom || '_user') THEN
        EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', m.schema_nom || '_user', m.mot_de_passe);
      END IF;
      EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I AUTHORIZATION %I', m.schema_nom, m.schema_nom || '_user');
      EXECUTE format('ALTER ROLE %I SET search_path = %I', m.schema_nom || '_user', m.schema_nom);
    END LOOP;
  END
  \$\$;
SQL
