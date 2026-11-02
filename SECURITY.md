# Politique de sécurité

## Versions prises en charge

BTP Chantiers est un projet académique. Seule la dernière version publiée et la branche `develop` reçoivent des correctifs de sécurité.

| Version | Prise en charge |
|---|---|
| Dernière release | ✅ |
| `develop` | ✅ |
| Versions antérieures | ❌ |

## Signaler une vulnérabilité

**N'ouvrez pas d'issue publique** pour une faille de sécurité.

Utilisez le signalement privé de GitHub : onglet **Security** du dépôt → **Report a vulnerability**. Indiquez :

- le module concerné (Chantiers, Tâches, Ouvriers, Matériaux, front-end, gateway, infrastructure) ;
- la description de la faille et son impact ;
- les étapes pour la reproduire (requêtes, données, version ou commit) ;
- si possible, une proposition de correction.

## Ce qui se passe ensuite

| Étape | Délai |
|---|---|
| Accusé de réception | 3 jours ouvrés |
| Évaluation de la gravité et confirmation | 7 jours |
| Correctif et publication d'une release | selon la gravité, au plus tôt |

La personne qui signale la faille est tenue informée et, si elle le souhaite, citée dans les notes de version.

## Mesures en place

- Analyse du code par **CodeQL** et **SonarCloud** à chaque pull request.
- Mises à jour hebdomadaires des dépendances par **Dependabot**.
- Scan des images Docker par **Trivy** avant chaque publication.
- Conteneurs exécutés avec un utilisateur non root ; aucun secret dans le dépôt (`.env` ignoré par Git).
- Isolation des données : chaque module accède uniquement à son schéma de la base `btp_db`.
