# Organisation Scrum

L'équipe applique **Scrum** sur 3 sprints d'une semaine. Le backlog, les sprints et les estimations sont tenus dans le [GitHub Project](https://github.com/users/MohamedOuijjane/projects/1).

## 1. Rôles

| Rôle | Membre | Responsabilités |
|---|---|---|
| **Product Owner** | OUIJJANE Mohamed | Porte le besoin métier, rédige et priorise le backlog (Priority P0 → P3), accepte ou refuse les éléments en revue de sprint |
| **Scrum Master** | IJJAALI Houssam | Anime les cérémonies, fait respecter la Definition of Ready et la Definition of Done, lève les blocages |
| **Développeurs** | toute l'équipe (Mohamed, Houssam, Ilyas, Hatim) | Estiment, réalisent, testent et relisent ; s'organisent eux-mêmes pour atteindre l'objectif du sprint |

Le Product Owner développe aussi, mais il ne relit pas seul ses propres PR (CODEOWNERS impose un second relecteur).

## 2. Sprints

| Sprint | Dates | Objectif | Tag de fin |
|---|---|---|---|
| S1 · Conception | 01 → 07/11/2026 | Dossier de conception, migrations PostgreSQL, corrections prioritaires | `v0.1.0` |
| S2 · Développement | 08 → 14/11/2026 | Règles de gestion des 4 modules, front-end | `v0.2.0` |
| S3 · Livraison | 15 → 20/11/2026 | Tests de bout en bout, recette, documentation, livraison | `v1.0.0` |

## 3. Cérémonies

| Cérémonie | Fréquence | Durée | Participants | Résultat |
|---|---|---|---|---|
| **Sprint planning** | Premier jour du sprint | 1 h | Équipe | Objectif du sprint, issues placées dans le sprint (champ Sprint), estimations vérifiées |
| **Daily** | Chaque jour (messagerie ou visio) | 15 min | Développeurs | Hier / aujourd'hui / blocages ; colonnes du Project à jour |
| **Affinage du backlog** | Milieu de sprint | 30 min | PO + Scrum Master (+ concernés) | Issues du sprint suivant « Prêt » (Definition of Ready) |
| **Sprint review** | Dernier jour du sprint | 45 min | Équipe | Démonstration sur la stack Docker, éléments acceptés ou renvoyés au backlog ([modèle](sprint-review.md)) |
| **Rétrospective** | Après la review | 30 min | Équipe | Actions d'amélioration Start / Stop / Continue ([modèle](retrospective.md)) |

## 4. Definition of Ready

Une issue peut passer en **Prêt** quand :

- [ ] Elle est rattachée à une epic
- [ ] Le contexte et l'objectif sont clairs
- [ ] Les critères d'acceptation sont écrits (« Étant donné… quand… alors… »)
- [ ] Les dépendances sont identifiées et aucune n'est encore ouverte (« Blocked by »)
- [ ] Priority, Size et Estimate sont renseignés
- [ ] Elle tient dans un sprint (Size ≤ L, sinon on la découpe)

## 5. Definition of Done

Une issue passe en **Terminé** quand :

- [ ] Les critères d'acceptation sont satisfaits
- [ ] Les tests unitaires sont écrits et la CI est verte (tests, analyse, build Docker)
- [ ] La quality gate SonarCloud est passée (couverture du nouveau code ≥ 70 %, aucun bug bloquant)
- [ ] La documentation est à jour (Swagger / WSDL, `docs/`, CHANGELOG)
- [ ] `docker compose up --build` fonctionne
- [ ] La PR est relue, approuvée et mergée dans `develop`, l'issue est fermée

## 6. Estimation, vélocité et burndown

**Estimation.** Chaque issue reçoit :
- une **Size** relative (XS, S, M, L, XL) pour comparer les éléments entre eux ;
- une **Estimate** en heures, utilisée pour remplir les sprints.

| Size | Ordre de grandeur |
|---|---|
| XS | ≤ 1 h |
| S | 2 – 3 h |
| M | 4 – 6 h |
| L | 8 – 10 h |
| XL | > 10 h : à découper |

**Capacité.** Chaque membre indique ses heures disponibles au sprint planning (autres cours du semestre). On ne remplit pas un sprint au-delà de 80 % de la capacité.

**Vélocité.** Somme des heures estimées des issues **terminées** à la fin du sprint (pas des heures passées). Elle est notée dans la revue de sprint et sert à calibrer le sprint suivant.

**Burndown.** Dans le Project, un graphique (Insights) suit la somme des Estimate restantes (Status ≠ Terminé) par jour, filtrée sur le sprint en cours. Une courbe plate pendant deux jours est signalée au daily.

## 7. Documents de sprint

- [Sprint 1](sprint-1.md)
- [Modèle de revue de sprint](sprint-review.md)
- [Modèle de rétrospective](retrospective.md)

Chaque sprint a son fichier `sprint-N.md` (plan, puis compte rendu de revue et de rétrospective).
