# Sprint 1 · Conception

| | |
|---|---|
| Dates | 01/11 → 07/11/2026 |
| Objectif | **Livrer le dossier de conception, passer tous les modules sur la base unique PostgreSQL et corriger les anomalies prioritaires.** |
| Tag de fin | `v0.1.0` |
| Revue et rétrospective | 07/11/2026 |

## 1. Backlog du sprint

| Issue | Titre | Epic | Priority | Estimate | Responsable | Statut au 01/11 |
|---|---|---|---|---|---|---|
| #2 | Base de données unique `btp_db` (un schéma par module) | Infra | P0 | 4 h | Mohamed | En revue (PR #1) |
| #6 | Migrer Tâches de MongoDB vers PostgreSQL | Tâches | P0 | 10 h | Houssam | Prêt |
| #17 | Migrer Matériaux de MySQL vers PostgreSQL | Matériaux | P0 | 3 h | Hatim | Prêt |
| #32 | Cahier des charges final | Livrables | P0 | 3 h | Mohamed | Prêt |
| #33 | Dossier de conception (UML et architecture) | Livrables | P0 | 8 h | Mohamed | Prêt |
| #4 | Nouveau chantier toujours au statut PLANIFIE | Chantiers | P1 | 2 h | Mohamed | En revue (PR #21) |
| #13 | Ouvriers sur le schéma `ouvriers` | Ouvriers | P1 | 1 h | Ilyas | Prêt |
| #3 | Port du WSDL via la gateway | Infra | P2 | 1 h | Mohamed | En revue (PR #22) |
| | **Total** | | | **32 h** | | |

## 2. Charge par membre

| Membre | Heures | Issues |
|---|---|---|
| Mohamed | 18 h | #2, #3, #4, #32, #33 |
| Houssam | 10 h | #6 |
| Hatim | 3 h | #17 |
| Ilyas | 1 h | #13 |

Ilyas a de la marge sur ce sprint : il peut préparer le plan de tests (#35) et la matrice règle → test en avance.

## 3. Dépendances et risques du sprint

- **#6 bloque 5 issues de Tâches** (#7 à #11) planifiées en S2 : c'est le chemin critique du sprint.
- **#32 avant #33** : la numérotation des règles du cahier des charges est reprise dans le dossier de conception.
- Les conteneurs `mongo` et `mysql` ne sont supprimés qu'après le merge de #6 et #17.

## 4. Suivi quotidien

| Jour | Terminé | En cours | Blocages |
|---|---|---|---|
| 01/11 | | | |
| 02/11 | | | |
| 03/11 | | | |
| 04/11 | | | |
| 05/11 | | | |
| 06/11 | | | |
| 07/11 | | | |

## 5. Revue de sprint

> À remplir le 07/11 avec le [modèle de revue](sprint-review.md).

## 6. Rétrospective

> À remplir le 07/11 avec le [modèle de rétrospective](retrospective.md).
