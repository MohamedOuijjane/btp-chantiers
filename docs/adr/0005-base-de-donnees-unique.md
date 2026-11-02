# ADR-0005 : Une base de données unique, un schéma par module

- **Statut :** Accepté (remplace la partie « une base par service » de l'ADR-0001 et la colonne « Base » de l'ADR-0002)
- **Date :** 01/11/2026

## Contexte
L'encadrant impose une **seule base de données** pour toute l'application. L'architecture initiale utilisait trois SGBD (PostgreSQL, MongoDB, MySQL) et une base par service.

Il faut respecter cette contrainte **sans perdre l'autonomie des modules** : chaque module doit rester seul propriétaire de ses données et les autres modules doivent continuer à y accéder uniquement par web services.

## Décision
- Un seul serveur **PostgreSQL 16** et une seule base **`btp_db`**.
- **Un schéma par module** : `chantiers`, `taches`, `ouvriers`, `materiaux`.
- **Un utilisateur par module** (`chantiers_user`, `taches_user`…), propriétaire de son schéma et **sans aucun droit sur les autres**. L'isolation est donc garantie par la base elle-même, pas seulement par convention.
- Les liens entre modules restent des **identifiants** (`chantierId`, `ouvrierIds`, `materiauId`) : aucune clé étrangère ni jointure entre schémas.
- Les schémas et utilisateurs sont créés par `scripts/init-postgres.sh` au premier démarrage.

| Module | Schéma | Utilisateur | Accès technique |
|---|---|---|---|
| Chantiers | `chantiers` | `chantiers_user` | Spring Data JPA |
| Tâches | `taches` | `taches_user` | TypeORM |
| Ouvriers | `ouvriers` | `ouvriers_user` | SQLAlchemy |
| Matériaux | `materiaux` | `materiaux_user` | Spring Data JPA |

## Conséquences
- ✅ Contrainte du projet respectée : une base, une sauvegarde, un seul outil d'administration.
- ✅ Autonomie conservée : un module ne peut pas lire les tables d'un autre (refus de PostgreSQL).
- ✅ Docker Compose plus léger (un conteneur de base au lieu de trois).
- ✅ Le jour où un module doit être déployé séparément, il suffit de déplacer son schéma.
- ⚠️ L'hétérogénéité est désormais portée par les langages et les protocoles (Java, TypeScript, Python ; REST et SOAP), et non plus par les SGBD.
- ⚠️ Tâches passe de MongoDB à PostgreSQL : les besoins en matériaux deviennent une table `besoin_materiau` (classe d'association du diagramme de classes) et les identifiants de tâches deviennent des entiers.
- ⚠️ La base devient un point unique de défaillance : son healthcheck et `restart: unless-stopped` limitent le risque.
