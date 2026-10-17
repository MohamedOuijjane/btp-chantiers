# ADR-0004 : Résilience des appels entre services

- **Statut :** Accepté
- **Date :** 17/10/2026

## Contexte
Un module lent ou arrêté ne doit pas bloquer toute l'application (cf. cours QL : « procédures dégradées »).

## Décision
1. **Timeout de 2 s** sur tous les appels sortants (configurable par variable d'environnement).
2. **Lecture** (avancement, planning) : réponse dégradée avec un indicateur `sourceDisponible: false`.
3. **Écriture** (création de tâche) : refus avec `503` plutôt qu'enregistrer une donnée non vérifiée.
4. **Healthchecks** Docker sur chaque service et redémarrage automatique.

## Conséquences
- ✅ Comportement prévisible et testé (tests « mode dégradé » dans Chantiers et Ouvriers).
- 🔜 Évolution possible : circuit breaker (Resilience4j), retries avec backoff.
