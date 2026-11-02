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

## Gestion du projet

Le suivi se fait dans le [GitHub Project de l'équipe](https://github.com/users/MohamedOuijjane/projects/1).

### Issues, epics et sub-issues

- Toute issue se crée avec un formulaire (**Epic**, **User story**, **Bug**, **Tâche technique**) : les issues vides sont désactivées.
- Une **epic** (label `epic`) regroupe les issues d'un même objectif, rattachées comme **sub-issues**. Sa barre de progression avance quand ses sub-issues sont fermées.
- Une issue qui ne peut pas commencer avant une autre est marquée **« Blocked by »** (section Relationships de l'issue).

### Champs du Project

| Champ | Valeurs | Usage |
|---|---|---|
| Priority | P0 · Bloquant, P1 · Haute, P2 · Normale, P3 · Basse | P0 passe avant tout le reste |
| Size | XS, S, M, L, XL | Taille relative ; une issue XL doit être découpée |
| Estimate | nombre d'heures | Charge prévue, pour équilibrer les sprints |
| Module | Infra, Chantiers, Tâches, Ouvriers, Matériaux, Front-end, Qualité | Filtre par module |
| Start date / Target date | dates | Planification dans le sprint |

### Sprints

| Sprint | Dates | Fin de sprint |
|---|---|---|
| S1 | 01/11 → 07/11/2026 | Dossier de conception livré |
| S2 | 08/11 → 14/11/2026 | Modules et front fonctionnels |
| S3 | 15/11 → 20/11/2026 | Recette, livraison du dépôt |

### Cycle d'une issue

```
Backlog → Prêt → En cours → En revue → Terminé
```

- **Backlog** : identifiée, pas encore prête (dépendance ouverte ou critères à préciser).
- **Prêt** : critères d'acceptation clairs, aucune dépendance ouverte ; peut être prise.
- **En cours** : une branche existe et la personne est assignée.
- **En revue** : la PR est ouverte.
- **Terminé** : la PR est mergée et l'issue fermée.

### Une PR = une issue

Chaque PR traite **une seule issue** et contient `Closes #n` dans sa description. GitHub ne ferme automatiquement l'issue qu'au merge dans la branche par défaut (`main`) : pour une PR vers `develop`, on ferme l'issue à la main après le merge (ou elle se fermera lors du merge de `develop` dans `main`).

## Définition de « terminé »

- [ ] Fonctionnalité conforme aux critères d'acceptation de la user story
- [ ] Tests unitaires écrits et verts
- [ ] Endpoint visible dans Swagger / WSDL
- [ ] `docker compose up --build` fonctionne
- [ ] PR relue et mergée
