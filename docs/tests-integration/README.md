# Tests d'intégration du module Chantiers

| Fichier | Contenu |
|---|---|
| `cahier-tests-integration-chantiers.docx` | Cahier des tests d'intégration : périmètre, matrice des dépendances, 10 scénarios détaillés, plan d'exécution, résultats |
| `chantiers-integration.postman_collection.json` | Collection Postman (35 requêtes, 4 dossiers) rejouant les scénarios principaux via la gateway (`http://localhost:8090`) |

Les tests automatisés se trouvent dans
[`services/chantiers-service/src/test/java/ma/uiz/btp/chantiers/integration/`](../../services/chantiers-service/src/test/java/ma/uiz/btp/chantiers/integration/)
(une classe `S01…IT` à `S10…IT` par scénario, jeu de données Souss Bâtiment dans `src/test/resources/integration/`).

## Lancer les tests d'intégration

Docker doit tourner (base PostgreSQL 16 démarrée par Testcontainers) ; la stack n'a pas besoin d'être lancée.

```bash
make test-integration-chantiers
# ou
cd services/chantiers-service && mvn verify
```

SpotBugs, exécuté en fin de `verify`, exige Maven 3.8.9 ou plus récent ; avec un Maven plus ancien, les tests passent mais le build se termine sur cette erreur de version.

Résultats : `services/chantiers-service/target/rapport-integration.md` (par scénario, temps de réponse moyen et maximal) et `target/failsafe-reports/`.

Pour ne lancer qu'un scénario : `mvn verify -Dit.test=S09SuppressionChantierIT -Dtest=none -Dsurefire.failIfNoSpecifiedTests=false`.

## Lancer la collection Postman

Avec la stack démarrée (`make up`) :

```bash
make postman-chantiers
```

Newman tourne dans le réseau Docker de la stack (il joint la gateway sur `http://gateway:8080`, port interne du conteneur) et écrit un rapport JUnit dans `docs/tests-integration/resultats/`. Dans Postman : importer la collection, vérifier la variable `gateway` (`http://localhost:8090`, port `GATEWAY_PORT` de `.env`), régler la variable `motDePasse` sur la valeur de `DEMO_MOT_DE_PASSE` (`.env`), puis lancer le Runner sur toute la collection, dans l'ordre.

La collection crée deux chantiers et une tâche, puis les supprime à la fin du dossier 3.

## Adresses utiles (poste local)

| Élément | URL |
|---|---|
| Gateway | http://localhost:8090 |
| Swagger UI du module Chantiers | http://localhost:8081/swagger-ui.html |
| Contrat OpenAPI | http://localhost:8081/v3/api-docs |
