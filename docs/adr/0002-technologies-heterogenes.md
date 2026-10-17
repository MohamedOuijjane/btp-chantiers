# ADR-0002 : Technologies hétérogènes

- **Statut :** Accepté
- **Date :** 17/10/2026

## Contexte
L'objectif pédagogique principal est l'**interopérabilité** entre modules, indépendamment des langages et des frameworks.

## Décision
| Module | Stack | Base |
|---|---|---|
| Chantiers | Spring Boot 3 (Java 21) | PostgreSQL |
| Tâches | NestJS 10 (TypeScript) | MongoDB |
| Ouvriers | FastAPI (Python 3.12) | PostgreSQL |
| Matériaux | Spring-WS (Java 21) | MySQL |

MongoDB est retenu pour les tâches : documents imbriqués (besoins en matériaux, liste d'ouvriers) et schéma susceptible d'évoluer.

## Conséquences
- ✅ L'interopérabilité est démontrée concrètement : 3 langages, 3 SGBD, 2 protocoles.
- ⚠️ Chaque membre doit savoir lancer les autres services (Docker Compose règle ce point).
