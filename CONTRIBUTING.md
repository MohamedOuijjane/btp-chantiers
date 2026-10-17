# Guide de contribution

## Branches

```
main        ← version stable, livrée au prof (protégée, PR obligatoire)
 └─ develop ← intégration continue de l'équipe
     ├─ feature/chantiers-cloture
     ├─ feature/taches-affectation
     └─ fix/ouvriers-cin-validation
```

1. Partir de `develop` : `git checkout develop && git pull && git checkout -b feature/<module>-<sujet>`
2. Commits petits et fréquents.
3. Ouvrir une **pull request vers `develop`**, en remplissant le template.
4. La CI doit être verte et **au moins un autre membre** relit la PR.
5. Merge de `develop` vers `main` à chaque jalon (fin de phase).

## Messages de commit ([Conventional Commits](https://www.conventionalcommits.org/fr/))

```
<type>(<module>): <description>

feat(taches): affecter des ouvriers à une tâche
fix(ouvriers): refuser une CIN au mauvais format
docs(api): documenter l'opération SOAP VerifierStock
test(chantiers): couvrir la clôture d'un chantier
chore(docker): ajouter le healthcheck mysql
```

Types : `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.

## Modifier un contrat d'API

Un endpoint consommé par un autre module est un **contrat**. Pour le modifier :
1. Mettre à jour [`docs/api-contracts.md`](docs/api-contracts.md) (ou `contracts/*.xsd`) **dans la même PR**.
2. Demander la revue du responsable du module consommateur.
3. Privilégier l'ajout de champs à la suppression ou au renommage (rétrocompatibilité).

## Définition de « terminé »

- [ ] Fonctionnalité conforme aux critères d'acceptation de la user story
- [ ] Tests unitaires écrits et verts
- [ ] Endpoint visible dans Swagger / WSDL
- [ ] `docker compose up --build` fonctionne
- [ ] PR relue et mergée
