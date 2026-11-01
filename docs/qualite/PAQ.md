# Plan d'Assurance Qualité (PAQ)

| | |
|---|---|
| Projet | BTP Chantiers, application distribuée de gestion de chantiers |
| Équipe | Équipe 18 |
| Version | 1.0 · 01/11/2026 |
| Responsable du document | Responsable qualité (BENZINEB Ilyas) |

## 1. Objet et périmètre

Ce plan décrit **comment l'équipe garantit la qualité** de BTP Chantiers : exigences mesurables, organisation, tests, revues, gestion de configuration, des anomalies et des risques.

**Périmètre :** les 4 modules (Chantiers, Tâches & Avancement, Ouvriers, Matériaux), le front-end, la gateway, l'infrastructure Docker et la CI/CD, ainsi que les livrables documentaires (cahier des charges, dossier de conception, documentation des web services, recette).

**Hors périmètre :** comptabilité, paie, application mobile native, exploitation en production réelle.

Documents de référence : [cahier des charges](./), [architecture](../architecture.md), [contrats d'API](../api-contracts.md), [CONTRIBUTING](../../CONTRIBUTING.md), [Scrum](../agile/scrum.md).

## 2. Organisation et rôles qualité

| Rôle | Membre | Responsabilités qualité |
|---|---|---|
| Product Owner / chef de projet | OUIJJANE Mohamed | Critères d'acceptation des user stories, validation de la recette, arbitrage des priorités |
| Scrum Master / architecte | IJJAALI Houssam | Respect du processus (Definition of Ready / Done), cohérence des contrats d'API, revue des PR d'architecture |
| Responsable qualité | BENZINEB Ilyas | Tenue de ce PAQ, plan de tests et recette, suivi des anomalies, contrôle des indicateurs |
| Développeurs | toute l'équipe | Tests unitaires, revue croisée, respect des conventions |

Chaque module a **deux propriétaires** dans `.github/CODEOWNERS` : une PR est toujours relue par une autre personne que son auteur.

## 3. Modèle qualité (ISO/IEC 25010)

Caractéristiques retenues, avec l'exigence du projet et la façon de la mesurer :

| Caractéristique | Exigence du projet | Métrique | Seuil | Outil de mesure |
|---|---|---|---|---|
| **Adéquation fonctionnelle** | Chaque règle de gestion est implémentée et vérifiée | % de règles couvertes par au moins un test | 100 % | Matrice règle → test (cahier de recette) |
| **Fiabilité** | Un module en panne ne bloque pas les autres | Scénarios « mode dégradé » réussis | 100 % | Tests unitaires (`sourceDisponible`), recette |
| **Efficacité des performances** | Les appels entre modules restent rapides | Temps de réponse d'un appel inter-services | < 2 s (timeout) | Timeouts configurés, tests de performance |
| **Compatibilité (interopérabilité)** | Les modules échangent malgré des technologies différentes | Contrats respectés (OpenAPI, XSD) | 0 écart | Validation XSD, tests de contrat |
| **Maintenabilité** | Code lisible, testé, sans duplication | Couverture de lignes | ≥ 70 % par module | JaCoCo, Jest, pytest-cov, SonarCloud |
| | | Duplication | < 3 % | SonarCloud |
| | | Dette technique (note de maintenabilité) | A | SonarCloud |
| **Sécurité** | Pas de vulnérabilité connue dans le code ni les images | Vulnérabilités CodeQL / SonarCloud | 0 critique ou haute | CodeQL, SonarCloud |
| | | Vulnérabilités CRITICAL corrigeables dans les images | 0 | Trivy (release) |
| | | Dépendances obsolètes | mises à jour chaque semaine | Dependabot |
| **Utilisabilité** | Interface claire en français, accessible | Contrastes, navigation clavier | conforme WCAG AA | Revue, outils du navigateur |
| **Portabilité** | L'application démarre sur n'importe quel poste | `docker compose up --build` | tous les services `healthy` | CI (build des images), healthchecks |

## 4. Seuils qualité (quality gate)

Une PR ne peut être mergée que si :

| Indicateur | Seuil | Contrôle |
|---|---|---|
| Tests | 100 % verts | CI |
| Couverture du nouveau code | ≥ 70 % | SonarCloud |
| Bugs bloquants ou critiques | 0 | SonarCloud |
| Vulnérabilités | 0 nouvelle | CodeQL, SonarCloud |
| Duplication du nouveau code | < 3 % | SonarCloud |
| Temps de réponse inter-services | < 2 s | timeouts (2 s) et tests de mode dégradé |
| Titre de PR | Conventional Commits | workflow « Titre de PR » |

Les analyses Checkstyle et SpotBugs sont en **mode rapport** pendant le sprint S1, puis bloquantes une fois la dette existante résorbée.

## 5. Stratégie de tests

```
            ▲   Performance        (quelques scénarios, avant la recette)
           ▲▲▲  Bout en bout       (scénario de démo, Playwright / Newman)
          ▲▲▲▲▲ Contrat            (XSD, OpenAPI)
        ▲▲▲▲▲▲▲ Intégration        (API + base, appels inter-modules simulés)
      ▲▲▲▲▲▲▲▲▲ Unitaires          (règles de gestion, clients, formulaires)
```

| Niveau | Objectif | Outils | Quand |
|---|---|---|---|
| **Unitaires** | Règles de gestion, clients HTTP/SOAP, composants | JUnit 5, Jest, pytest, Vitest | À chaque commit (CI) |
| **Intégration** | Une API avec sa base (H2, SQLite) et des modules voisins simulés | MockMvc, Spring-WS Test, TestClient FastAPI, MSW | À chaque commit (CI) |
| **Contrat** | Les échanges respectent les contrats publiés | Validation XSD (Spring-WS), schémas OpenAPI exportés | À chaque modification d'un contrat |
| **Bout en bout** | Le scénario de démo fonctionne sur la stack Docker complète | Newman (Postman), Playwright | CI (#16) et avant chaque revue de sprint |
| **Performance** | Appels inter-services < 2 s sous charge modérée | k6 ou Apache Bench, timeouts | Sprint S3, avant la recette |

**Critères d'entrée en recette :** tous les tests automatisés verts, quality gate SonarCloud passée, `docker compose up --build` fonctionnel.
**Critères de sortie de recette :** tous les scénarios de recette passés, aucune anomalie bloquante ou majeure ouverte.

## 6. Revue de code

**Règles**
- Toute modification passe par une **pull request** vers `develop` ; aucun push direct sur `main` ni `develop`.
- **Une PR = une issue**, liée par `Closes #n`.
- Au moins **une approbation** d'un propriétaire du code (CODEOWNERS) autre que l'auteur.
- La CI doit être verte avant le merge.
- PR petites (idéalement < 400 lignes modifiées) ; relecture sous 24 h ouvrées.

**Checklist du relecteur**
- [ ] Le code répond aux critères d'acceptation de l'issue
- [ ] Les règles de gestion sont dans le backend, pas seulement dans le front
- [ ] Les cas d'erreur sont traités (404, 409, 422, 503, mode dégradé)
- [ ] Des tests couvrent le nouveau comportement, la couverture ne baisse pas
- [ ] Un contrat d'API modifié est documenté et le module consommateur prévenu
- [ ] Pas de secret, de mot de passe ou de donnée personnelle dans le code
- [ ] Noms clairs, pas de code mort ni de duplication

## 7. Gestion de configuration

| Élément | Règle |
|---|---|
| Branches | Git flow simplifié : `main` (livré), `develop` (intégration), `feature/…`, `fix/…`, `docs/…`, `chore/…`, `ci/…` |
| Protection | `main` et `develop` protégées par un ruleset : PR obligatoire, pas de force-push ni de suppression |
| Commits | [Conventional Commits](https://www.conventionalcommits.org/fr/) : `type(module): description` |
| Versions | [SemVer](https://semver.org/lang/fr/) `MAJEUR.MINEUR.CORRECTIF` |
| Tags | Un tag par fin de sprint : `v0.1.0` (S1), `v0.2.0` (S2), `v1.0.0` (livraison) |
| Release | Le tag déclenche le workflow « Release » : images scannées par Trivy, publiées sur ghcr.io, notes générées |
| Historique | [CHANGELOG.md](../../CHANGELOG.md) au format Keep a Changelog |
| Dépendances | Versions fixées (lockfiles), mises à jour par Dependabot |

## 8. Gestion des anomalies

Toute anomalie est déclarée avec le formulaire **Bug** des issues GitHub.

**Cycle de vie**

```
Nouvelle → Qualifiée → En correction → En vérification → Fermée
              └──────→ Rejetée (doublon, non reproductible, hors périmètre)
```

| Étape | Qui | Action |
|---|---|---|
| Nouvelle | Tout membre | Issue « Bug » avec module, étapes, résultat attendu et obtenu, gravité |
| Qualifiée | Responsable qualité | Reproduit, gravité confirmée, assignée, ajoutée au sprint |
| En correction | Développeur | Branche `fix/…` et test qui reproduit l'anomalie |
| En vérification | Responsable qualité | Vérifie la correction sur `develop` |
| Fermée | Responsable qualité | Anomalie close, résultat noté dans le cahier de recette |

| Gravité | Définition | Délai de prise en charge |
|---|---|---|
| **Bloquant** | Empêche un scénario principal ou le démarrage de l'application | Immédiat, priorité P0 |
| **Majeur** | Une règle de gestion est fausse, contournement possible | Dans le sprint en cours |
| **Mineur** | Défaut d'affichage ou de confort | Backlog |

## 9. Gestion des risques

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Retard sur le planning (3 sprints d'une semaine) | Élevée | Élevé | Priorisation P0/P1, revue de sprint hebdomadaire, périmètre minimal défini par epic |
| Incompatibilité entre modules (formats, ports, réseau) | Moyenne | Élevé | Contrats d'API versionnés, PR relue par le module consommateur, test de bout en bout dans la CI |
| Migration vers la base unique (Tâches, Matériaux) plus longue que prévu | Moyenne | Élevé | Issues P0 en sprint S1, conteneurs MongoDB et MySQL conservés jusqu'à la fin des migrations |
| Indisponibilité d'un membre | Moyenne | Moyen | Deux propriétaires par module (CODEOWNERS), documentation à jour |
| Panne d'un service pendant la démonstration | Faible | Élevé | Modes dégradés, script de démo testé, vidéo de secours |
| Vulnérabilité dans une dépendance | Moyenne | Moyen | Dependabot, CodeQL, scan Trivy avant publication |
| Manque de maîtrise d'un outil (Docker, SOAP, React) | Moyenne | Moyen | Binômage, documentation dans `docs/`, revue de code |

Le registre est revu à chaque rétrospective.

## 10. Outils

| Domaine | Outils |
|---|---|
| Gestion de projet | GitHub Issues (formulaires), GitHub Project (sprints, estimations), epics et sub-issues |
| Code source | Git, GitHub, pull requests, CODEOWNERS, ruleset de protection |
| Intégration continue | GitHub Actions (tests, analyse, build), Dependabot |
| Qualité du code | SonarCloud, Checkstyle, SpotBugs, ESLint, ruff, JaCoCo, Jest, pytest-cov |
| Sécurité | CodeQL, Trivy, Dependabot |
| Tests | JUnit 5, MockMvc, Spring-WS Test, Jest, pytest, Vitest, MSW, Playwright, Postman / Newman |
| Documentation | Markdown, Mermaid, Swagger / OpenAPI, WSDL, ADR |
| Déploiement | Docker, Docker Compose, ghcr.io |
