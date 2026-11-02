# Changelog

Toutes les évolutions notables du projet sont consignées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/).

## [Unreleased]

## [0.1.0] - 2026-11-02

### Ajouté
- Architecture du front-end : stack React, intégration via la gateway, pages, charte graphique, déploiement et tests ([#23](https://github.com/MohamedOuijjane/btp-chantiers/pull/23)).
- Formulaires d'issues (Epic, User story, Bug, Tâche technique) et section « Gestion du projet » dans CONTRIBUTING ([#44](https://github.com/MohamedOuijjane/btp-chantiers/pull/44)).
- Pipeline qualité : couverture (JaCoCo, Jest, pytest-cov), analyse statique (Checkstyle, SpotBugs, ESLint, ruff), SonarCloud, CodeQL, vérification du titre des PR, labels automatiques, Dependabot et workflow de release avec scan Trivy et publication sur ghcr.io ([#45](https://github.com/MohamedOuijjane/btp-chantiers/pull/45)).
- Plan d'Assurance Qualité, documentation Scrum (rôles, cérémonies, Definition of Ready / Done, modèles de revue et de rétrospective, sprint 1), CHANGELOG, politique de sécurité, code de conduite et licence MIT ([#46](https://github.com/MohamedOuijjane/btp-chantiers/pull/46)).
- Socle du front-end : Vite, React 18, TypeScript strict, Tailwind CSS + shadcn/ui, design system de la maquette en thème clair et sombre, layout et routes, image Docker servie derrière la gateway, job CI `frontend` ([#48](https://github.com/MohamedOuijjane/btp-chantiers/pull/48)).

### Modifié
- Base de données unique PostgreSQL `btp_db` avec un schéma et un utilisateur par module ; Chantiers et Ouvriers migrés, MongoDB et MySQL conservés temporairement ([#1](https://github.com/MohamedOuijjane/btp-chantiers/pull/1)).
- CODEOWNERS : deux relecteurs par module ([#1](https://github.com/MohamedOuijjane/btp-chantiers/pull/1)).
- README réécrit : architecture, qualité, méthode agile, équipe et liens vers toute la documentation.
- Modèle de pull request : type de changement, checklists de l'auteur et du relecteur.

### Corrigé
- Chantiers : un nouveau chantier est toujours créé au statut `PLANIFIE` ; le passage à `TERMINE` par modification est refusé (409) au profit de la clôture ([#21](https://github.com/MohamedOuijjane/btp-chantiers/pull/21)).
- Gateway : le WSDL obtenu via le port 8080 annonce la bonne adresse ([#22](https://github.com/MohamedOuijjane/btp-chantiers/pull/22)).
- Ouvriers : l'erreur 409 sur une CIN en double n'expose plus l'exception SQL d'origine ([#45](https://github.com/MohamedOuijjane/btp-chantiers/pull/45)).

[Unreleased]: https://github.com/MohamedOuijjane/btp-chantiers/compare/v0.1.0...develop
[0.1.0]: https://github.com/MohamedOuijjane/btp-chantiers/releases/tag/v0.1.0
