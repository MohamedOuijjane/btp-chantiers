# ADR-0001 : Architecture microservices avec une base par service

- **Statut :** Accepté
- **Date :** 17/10/2026

## Contexte
Le projet impose au moins 4 modules métier autonomes, développés chacun par un membre de l'équipe, et communiquant uniquement par web services.

## Décision
Découper l'application en 4 services alignés sur les entités du domaine (Chantier, Tâche, Ouvrier, Matériau). Chaque service possède **sa propre base de données** et n'accède jamais à celle d'un autre.

## Conséquences
- ✅ Chaque membre travaille, teste et déploie son module indépendamment.
- ✅ Les dépendances entre modules sont explicites (contrats d'API).
- ⚠️ Pas de jointure ni de transaction entre services : la cohérence est vérifiée par appels synchrones avant écriture.
- ⚠️ Il faut gérer les pannes réseau (voir ADR-0004).
