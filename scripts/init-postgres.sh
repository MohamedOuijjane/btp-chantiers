#!/bin/sh
# Base unique "btp_db" : un schéma par module, un utilisateur par module.
# Chaque utilisateur ne voit et ne modifie QUE son schéma (isolation des modules).
# Exécuté automatiquement par l'image postgres au premier démarrage (volume vide).
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
  REVOKE ALL ON SCHEMA public FROM PUBLIC;

  CREATE ROLE chantiers_user LOGIN PASSWORD '${CHANTIERS_DB_PASSWORD:-chantiers}';
  CREATE ROLE taches_user    LOGIN PASSWORD '${TACHES_DB_PASSWORD:-taches}';
  CREATE ROLE ouvriers_user  LOGIN PASSWORD '${OUVRIERS_DB_PASSWORD:-ouvriers}';
  CREATE ROLE materiaux_user LOGIN PASSWORD '${MATERIAUX_DB_PASSWORD:-materiaux}';

  CREATE SCHEMA chantiers AUTHORIZATION chantiers_user;
  CREATE SCHEMA taches    AUTHORIZATION taches_user;
  CREATE SCHEMA ouvriers  AUTHORIZATION ouvriers_user;
  CREATE SCHEMA materiaux AUTHORIZATION materiaux_user;

  ALTER ROLE chantiers_user SET search_path = chantiers;
  ALTER ROLE taches_user    SET search_path = taches;
  ALTER ROLE ouvriers_user  SET search_path = ouvriers;
  ALTER ROLE materiaux_user SET search_path = materiaux;
SQL
