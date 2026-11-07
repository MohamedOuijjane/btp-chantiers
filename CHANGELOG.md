# Changelog

Toutes les évolutions notables du projet sont consignées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/).

## [Unreleased]

### Ajouté
- Front-end : client REST partagé `src/api/http.ts` (gateway sur la même origine, `X-Request-Id`, délai de 10 s, annulation, conversion des erreurs Spring, NestJS et FastAPI en `ApiError`, indisponibilité ramenée à 503), testé avec MSW ([#49](https://github.com/MohamedOuijjane/btp-chantiers/issues/49)).
- Front-end : choix du mode fictif ou réel par module (`VITE_API_MODE`, `VITE_API_CHANTIERS`…) pour brancher les modules un par un ([#49](https://github.com/MohamedOuijjane/btp-chantiers/issues/49)).
- Front-end : pages Chantiers branchées sur l'API réelle ; guide de branchement des autres modules dans `docs/frontend/integration.md` ([#49](https://github.com/MohamedOuijjane/btp-chantiers/issues/49)).
- Authentification réelle par JWT ([ADR-0006](docs/adr/0006-authentification-jwt-gateway.md), [#109](https://github.com/MohamedOuijjane/btp-chantiers/issues/109)) :
  - schéma `auth` dans `btp_db` (utilisateur `auth_user`), table `utilisateurs` (mot de passe BCrypt) créée par Flyway, 4 comptes de démonstration dont le mot de passe vient de `DEMO_MOT_DE_PASSE` ;
  - Chantiers (Spring Security) : `POST /api/auth/login` (JWT HS256, 8 h), `GET /api/auth/moi`, `GET /api/auth/verifier` ; 401 au format RFC 9457, 429 après trop d'échecs ;
  - gateway : `auth_request` sur `/api/*` et `/ws` (sauf la connexion, le WSDL et `/health`), en-têtes `X-Utilisateur` et `X-Role` transmis aux services, 401 et 503 en JSON ;
  - front-end : connexion réelle (`VITE_API_AUTH`), jeton envoyé par `http.ts`, retour à `/connexion` avec « Session expirée » sur un 401 ;
  - collection Postman : requête de connexion et variable `token` ; `scripts/demo.sh` se connecte avant le scénario.

### Modifié
- Tâches : passage de MongoDB à PostgreSQL (schéma `taches` de `btp_db`, utilisateur `taches_user`) avec TypeORM ; tables `tache` et `besoin_materiau` créées par une migration appliquée au démarrage (jamais `synchronize`) ; **identifiants entiers `id` à la place de `_id`** et dates `aaaa-mm-jj` ; le healthcheck vérifie la base ; service `mongo` retiré de `docker-compose.yml` ([#6](https://github.com/MohamedOuijjane/btp-chantiers/issues/6)).
- Ouvriers : le planning lit l'identifiant entier des tâches ([#6](https://github.com/MohamedOuijjane/btp-chantiers/issues/6)).
- Tests Jest de Tâches : service, routes HTTP, clients REST et SOAP, et intégration sur PostgreSQL dans la CI ; collection Postman et `scripts/demo.sh` adaptés aux identifiants entiers ([#6](https://github.com/MohamedOuijjane/btp-chantiers/issues/6)).
- Règle RG-03 : une tâche ne peut être créée que sur un chantier `PLANIFIE` ou `EN_COURS` ; un chantier `SUSPENDU` ou `TERMINE` donne `409` (au lieu de `422` pour un chantier terminé), mise en œuvre dans [#12](https://github.com/MohamedOuijjane/btp-chantiers/issues/12).
- **`.env` obligatoire** : `JWT_SECRET` et `DEMO_MOT_DE_PASSE` n'ont pas de valeur par défaut, `docker compose` refuse de démarrer sans eux (`cp .env.example .env`). Sur une base existante, rejouer `scripts/init-postgres.sh` (voir le README) ([#109](https://github.com/MohamedOuijjane/btp-chantiers/issues/109)).
- `scripts/init-postgres.sh` rejouable sur une base existante ([#109](https://github.com/MohamedOuijjane/btp-chantiers/issues/109)).
- Chantiers : toutes les erreurs au format RFC 9457 avec un message en français (validation par champ, paramètre invalide, JSON mal formé) ; l'erreur de RG-01 est rattachée au champ `dateFinPrevue` ([#49](https://github.com/MohamedOuijjane/btp-chantiers/issues/49)).
- Chantiers : en mode dégradé, l'avancement renvoie `nombreTaches: 0` et `avancementGlobal: null` au lieu d'omettre ces champs ([#49](https://github.com/MohamedOuijjane/btp-chantiers/issues/49)).
- Gateway : l'en-tête `X-Request-Id` envoyé par le front est conservé et transmis au service ([#49](https://github.com/MohamedOuijjane/btp-chantiers/issues/49)).

## [0.1.2] - 2026-11-02

### Sécurité
- Exception temporaire du scan Trivy pour CVE-2026-47890 (spring-webmvc, SSE non utilisé dans Chantiers ni Matériaux), en attendant Spring Boot 4 ([#94](https://github.com/MohamedOuijjane/btp-chantiers/issues/94)) ; expiration le 31/12/2026 (`.trivyignore`, [#95](https://github.com/MohamedOuijjane/btp-chantiers/pull/95)).

## [0.1.1] - 2026-11-02

### Modifié
- Spring Boot 3.5.16 pour Chantiers et Matériaux, avec Checkstyle 10.26.1, JaCoCo 0.8.16, SpotBugs 4.10.5.0 et plugin Checkstyle 3.6.0 ; springdoc-openapi 2.10.0 (Chantiers) et jaxb2-maven-plugin 3.3.0 (Matériaux) ([#84](https://github.com/MohamedOuijjane/btp-chantiers/pull/84), [#85](https://github.com/MohamedOuijjane/btp-chantiers/pull/85)).
- Ouvriers : FastAPI 0.162, uvicorn 0.54, SQLAlchemy 2.1.6, psycopg 3.3.6, Pydantic 2.14.2, httpx 0.28.1, pytest 8.4.2 et ruff 0.17.3 ; `Specialite` hérite de `enum.StrEnum` (règle UP042 de ruff) ([#87](https://github.com/MohamedOuijjane/btp-chantiers/pull/87)).
- Tâches : class-validator 0.15.1 et mongoose 8.24.7 ([#83](https://github.com/MohamedOuijjane/btp-chantiers/pull/83)).
- Front-end : lucide-react 0.577, eslint-plugin-react-refresh 0.5.7 et TypeScript 5.9.3 ([#86](https://github.com/MohamedOuijjane/btp-chantiers/pull/86)).
- Images Docker : nginx 1.31-alpine pour le front-end, image de build maven 3.9-eclipse-temurin-26 pour Chantiers et Matériaux ([#82](https://github.com/MohamedOuijjane/btp-chantiers/pull/82)).

### Sécurité
- Tomcat 10.1.61 pour Chantiers et Matériaux : corrige les CVE critiques de Tomcat détectées par le scan Trivy de la release ([#89](https://github.com/MohamedOuijjane/btp-chantiers/pull/89)).
- Exception temporaire du scan Trivy pour CVE-2026-47884 (spring-webmvc, XsltView non utilisé dans Chantiers ni Matériaux), en attendant Spring Boot 4 ; expiration le 31/12/2026 (`.trivyignore`, [#89](https://github.com/MohamedOuijjane/btp-chantiers/pull/89)).

## [0.1.0] - 2026-11-02

### Ajouté
- Architecture du front-end : stack React, intégration via la gateway, pages, charte graphique, déploiement et tests ([#23](https://github.com/MohamedOuijjane/btp-chantiers/pull/23)).
- Formulaires d'issues (Epic, User story, Bug, Tâche technique) et section « Gestion du projet » dans CONTRIBUTING ([#44](https://github.com/MohamedOuijjane/btp-chantiers/pull/44)).
- Pipeline qualité : couverture (JaCoCo, Jest, pytest-cov), analyse statique (Checkstyle, SpotBugs, ESLint, ruff), SonarCloud, CodeQL, vérification du titre des PR, labels automatiques, Dependabot et workflow de release avec scan Trivy et publication sur ghcr.io ([#45](https://github.com/MohamedOuijjane/btp-chantiers/pull/45)).
- Plan d'Assurance Qualité, documentation Scrum (rôles, cérémonies, Definition of Ready / Done, modèles de revue et de rétrospective, sprint 1), CHANGELOG, politique de sécurité, code de conduite et licence MIT ([#46](https://github.com/MohamedOuijjane/btp-chantiers/pull/46)).
- Socle du front-end : Vite, React 18, TypeScript strict, Tailwind CSS + shadcn/ui, design system de la maquette en thème clair et sombre, layout et routes, image Docker servie derrière la gateway, job CI `frontend` ([#48](https://github.com/MohamedOuijjane/btp-chantiers/pull/48)).
- Maquette du front-end validée par l'encadrant (8 écrans) dans `docs/frontend/maquette/` et section « Maquette validée » de l'architecture du front ([#47](https://github.com/MohamedOuijjane/btp-chantiers/pull/47)).
- Front-end : types alignés sur les contrats cibles, fonctions `api.ts` à données fictives (latence et refus 409 / 422 / 503 simulés), hooks TanStack Query et guide de branchement `docs/frontend/integration.md` ([#53](https://github.com/MohamedOuijjane/btp-chantiers/pull/53)).
- Front-end : pages Chantiers (liste filtrable, fiche avec onglets Tâches et Matériaux consommés, création, modification et clôture) conformes à la maquette ([#54](https://github.com/MohamedOuijjane/btp-chantiers/pull/54)).

### Modifié
- Dependabot : mises à jour hebdomadaires vers `develop`, mineures et correctifs seulement, regroupées en une PR par écosystème et par dossier ; mises à jour majeures ignorées jusqu'à la livraison ([#80](https://github.com/MohamedOuijjane/btp-chantiers/pull/80)).
- Base de données unique PostgreSQL `btp_db` avec un schéma et un utilisateur par module ; Chantiers et Ouvriers migrés, MongoDB et MySQL conservés temporairement ([#1](https://github.com/MohamedOuijjane/btp-chantiers/pull/1)).
- CODEOWNERS : deux relecteurs par module ([#1](https://github.com/MohamedOuijjane/btp-chantiers/pull/1)).
- Nom complet de l'équipe (SALHI Hatim) dans le README et la documentation agile ([#47](https://github.com/MohamedOuijjane/btp-chantiers/pull/47)).
- README réécrit : architecture, qualité, méthode agile, équipe et liens vers toute la documentation.
- Modèle de pull request : type de changement, checklists de l'auteur et du relecteur.

### Corrigé
- Chantiers : un nouveau chantier est toujours créé au statut `PLANIFIE` ; le passage à `TERMINE` par modification est refusé (409) au profit de la clôture ([#21](https://github.com/MohamedOuijjane/btp-chantiers/pull/21)).
- Gateway : le WSDL obtenu via le port 8080 annonce la bonne adresse ([#22](https://github.com/MohamedOuijjane/btp-chantiers/pull/22)).
- Ouvriers : l'erreur 409 sur une CIN en double n'expose plus l'exception SQL d'origine ([#45](https://github.com/MohamedOuijjane/btp-chantiers/pull/45)).

[Unreleased]: https://github.com/MohamedOuijjane/btp-chantiers/compare/v0.1.2...develop
[0.1.2]: https://github.com/MohamedOuijjane/btp-chantiers/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/MohamedOuijjane/btp-chantiers/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/MohamedOuijjane/btp-chantiers/releases/tag/v0.1.0
