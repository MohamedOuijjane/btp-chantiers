# ADR-0006 : Authentification par JWT émis par Chantiers et vérifié par la gateway

- **Statut :** Accepté
- **Date :** 06/11/2026
- **Issue :** #109

## Contexte
La connexion du front (#104) est fictive : les comptes de démonstration n'existent que dans le navigateur et toutes les API sont ouvertes à quiconque atteint la gateway. Les quatre profils de la maquette (Direction, Conducteur de travaux, Chef de chantier, Magasinier) doivent se connecter pour de vrai avant la livraison du 20/11.

Contraintes :
- **Ne pas modifier Tâches, Ouvriers ni Matériaux** : trois technologies différentes (NestJS, FastAPI, Spring-WS) et trois responsables, avec un planning déjà chargé.
- **Une seule base** (ADR-0005) : pas de nouveau SGBD.
- **Aucun nouveau conteneur** si possible : la stack compte déjà neuf services.
- Les appels **entre services** (Tâches → Chantiers, Matériaux → Chantiers…) passent par le réseau Docker interne, sans jeton, et ne doivent pas casser.

## Options étudiées

| Option | Avantages | Inconvénients |
|---|---|---|
| A. Un service d'authentification dédié (nouveau conteneur) | Séparation nette des responsabilités | Un 10ᵉ conteneur, un 5ᵉ code à maintenir, en deux semaines |
| B. Vérification du jeton dans chaque module | Chaque module se protège seul, même sans gateway | Modifie Tâches, Ouvriers et Matériaux (trois implémentations JWT) ; les appels internes doivent alors transmettre un jeton |
| C. Keycloak | Standard OIDC complet | Lourd (mémoire, configuration, démarrage), disproportionné pour quatre comptes |
| **D. JWT émis par Chantiers, vérifié par la gateway (`auth_request`)** | Aucun changement dans les trois autres modules ; aucun conteneur en plus ; un seul point de contrôle | Les ports directs des services (8081 à 8084) ne sont pas protégés ; Chantiers devient nécessaire à toute requête authentifiée |

## Décision
Option **D**.

1. **Comptes** : schéma `auth` dans `btp_db`, utilisateur `auth_user` sans droit sur les autres schémas (même règle que l'ADR-0005). Table `utilisateurs` (e-mail unique, mot de passe haché avec **BCrypt**, nom, rôle) créée par **Flyway**. Chantiers y accède avec une seconde connexion (`auth_user`), séparée de celle de ses chantiers (`chantiers_user`).
2. **Comptes de démonstration** : les quatre comptes de la maquette sont créés au démarrage. Leur mot de passe vient de la variable `DEMO_MOT_DE_PASSE` (`.env`), jamais du code. Sans cette variable, ils ne peuvent pas se connecter.
3. **Émission** : `POST /api/auth/login` dans Chantiers (Spring Security) renvoie un **JWT HS256** valable **8 h** (une journée de chantier), signé avec `JWT_SECRET` (au moins 32 caractères, obligatoire au démarrage). Claims : `sub` (e-mail), `uid`, `nom`, `role`.
4. **Vérification** : la gateway nginx appelle `GET /api/auth/verifier` (sous-requête `auth_request`) avant toute requête vers `/api/*` et `/ws`, sauf `/api/auth/login`, le WSDL (`/ws/materiaux.wsdl`) et `/health`. Si le jeton est valide, elle transmet au service les en-têtes `X-Utilisateur` (e-mail) et `X-Role`. Sinon, elle répond `401` en `application/problem+json`. Si Chantiers ne répond pas, elle répond `503`.
5. **Brute force** : après 5 échecs pour un même e-mail, ou 20 pour une même adresse IP, en 15 minutes, la connexion répond `429` avec `Retry-After`. Un e-mail inconnu et un mauvais mot de passe donnent le même message `401`.
6. **Front** : le jeton est gardé en `sessionStorage` et envoyé par `src/api/http.ts` dans `Authorization: Bearer`. Toute réponse `401` (hors connexion) efface la session et ramène à `/connexion` avec « Session expirée ». La déconnexion est locale : le jeton n'est pas révoqué côté serveur (pas d'état), il expire au bout de 8 h.

## Conséquences
- ✅ Tâches, Ouvriers et Matériaux ne changent pas ; les appels internes entre services restent sans jeton.
- ✅ Une seule implémentation à tester (JUnit dans Chantiers) et un seul point de contrôle (la gateway).
- ✅ Les modules peuvent lire `X-Utilisateur` et `X-Role` pour tracer l'auteur d'une action ou refuser une action (`403`) plus tard, sans vérifier eux-mêmes le jeton.
- ⚠️ **Ports directs non protégés** : en développement, `localhost:8081` à `8084` contournent la gateway (Swagger, tests). En production, il ne faudrait publier que le port de la gateway. Les en-têtes `X-Utilisateur` / `X-Role` ne sont fiables que derrière la gateway, qui écrase toute valeur envoyée par le client.
- ⚠️ **Chantiers devient critique** : s'il est arrêté, plus aucune requête authentifiée ne passe (la gateway répond `503`). Le mode dégradé de l'ADR-0004 ne couvre pas ce cas. Acceptable pour la démonstration ; en production, l'émission des jetons irait dans un service dédié (option A).
- ⚠️ **Pas de révocation** : un jeton volé reste valable jusqu'à son expiration (8 h au plus). Évolution possible : jeton d'accès court et jeton de rafraîchissement en cookie `HttpOnly`.
- ⚠️ **Coût par requête** : chaque requête déclenche une sous-requête vers Chantiers (vérification locale de la signature, sans accès à la base). Négligeable à l'échelle du projet ; nginx pourrait mettre la réponse en cache quelques secondes si besoin.
- 🔜 Les droits par profil (`permissions.ts`) restent un filtre d'affichage. Le refus côté serveur (`403`) selon `X-Role` est une évolution possible, module par module.
