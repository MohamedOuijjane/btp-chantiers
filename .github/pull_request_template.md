## Description
<!-- Quoi et pourquoi, en 2-3 lignes. -->

Closes #

## Type de changement
- [ ] feat : nouvelle fonctionnalité
- [ ] fix : correction d'anomalie
- [ ] docs : documentation
- [ ] test : tests uniquement
- [ ] refactor : restructuration sans changement de comportement
- [ ] chore / ci : outillage, dépendances, pipeline
- [ ] ⚠️ Changement cassant (contrat d'API, schéma de base, variables d'environnement)

## Module concerné
- [ ] Chantiers
- [ ] Tâches & Avancement
- [ ] Ouvriers
- [ ] Matériaux
- [ ] Front-end
- [ ] Infra / Docker / Docs

## Captures d'écran
<!-- Uniquement pour un changement visible dans l'interface : avant / après. Sinon, supprimer cette section. -->

## Checklist de l'auteur
- [ ] Les tests passent en local et la CI est verte
- [ ] Des tests couvrent le nouveau comportement ; la couverture ne baisse pas
- [ ] La documentation est à jour (Swagger / WSDL, `docs/`, CHANGELOG)
- [ ] Le contrat d'API partagé n'est pas cassé (ou le module consommateur est prévenu et `docs/api-contracts.md` mis à jour)
- [ ] `docker compose up --build` fonctionne

## Checklist du relecteur
- [ ] Le changement répond aux critères d'acceptation de l'issue
- [ ] Les cas d'erreur sont traités (404, 409, 422, 503, mode dégradé)
- [ ] Les règles de gestion restent dans le backend
- [ ] Pas de secret, de mot de passe ni de donnée personnelle dans le code
- [ ] Code lisible : noms clairs, pas de duplication ni de code mort
