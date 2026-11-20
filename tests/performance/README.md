# Tests de charge (JMeter)

Plan [`btp-chantiers.jmx`](btp-chantiers.jmx) : chaque utilisateur virtuel se connecte une fois (JWT), puis enchaîne en boucle, via la gateway :

1. `GET /api/chantiers`, puis `GET /api/chantiers/{id}` sur un chantier pris au hasard dans la liste ;
2. `GET /api/taches` ;
3. `GET /api/ouvriers` ;
4. `POST /ws` : opération SOAP `ListerMateriaux`.

Une pause (`pause_ms`) sépare deux pages. Chaque requête doit répondre **200** sous le seuil `seuil_ms` ; la connexion a son propre seuil (`seuil_connexion_ms`), car le mot de passe est vérifié avec BCrypt, lent par conception, une seule fois par utilisateur. La réponse SOAP doit contenir `ListerMateriauxResponse`.

## Lancer

Prérequis : la stack démarrée (`make up`), JMeter 5.6 ou plus ([téléchargement](https://jmeter.apache.org/download_jmeter.cgi)) et Python 3 pour le résumé.

```bash
make perf                                  # 20 utilisateurs, 60 s
make perf UTILISATEURS=50 DUREE=120        # autres valeurs
JMETER_HOME=~/apache-jmeter-5.6.3 tests/performance/lancer-jmeter.sh
```

| Variable | Défaut | Rôle |
|---|---|---|
| `UTILISATEURS` | 20 | Utilisateurs simultanés |
| `MONTEE` | 10 | Montée en charge (s) |
| `DUREE` | 60 | Durée du test (s) |
| `PAUSE_MS` | 500 | Pause entre deux pages (ms) |
| `SEUIL_MS` | 1000 | Temps de réponse maximal d'une page (ms) |
| `SEUIL_CONNEXION_MS` | 3000 | Temps de réponse maximal de la connexion (ms) |
| `HOTE`, `PORT` | `localhost`, `GATEWAY_PORT` du `.env` | Gateway testée |
| `ERREURS_MAX` | 1 | Taux d'erreurs (%) au-delà duquel le script échoue |

Le mot de passe des comptes de démo vient de `DEMO_MOT_DE_PASSE` (lu dans `.env`) : il n'est écrit ni dans le plan ni sur la ligne de commande.

Résultats dans `tests/performance/resultats/<date>/` (ignoré par Git) : `resultats.jtl`, `jmeter.log` et le rapport HTML `rapport/index.html`. Le script affiche aussi la moyenne, le 90e percentile, le débit et le taux d'erreurs par requête.

## En CI

Workflow **Performance** (`.github/workflows/performance.yml`), lancé à la main depuis l'onglet Actions avec le nombre d'utilisateurs et la durée : il démarre la stack Docker, lance le test et publie le rapport HTML en artefact.

Pour un test représentatif, la base doit contenir des données : sur une base vide, les listes des tâches et des ouvriers sont vides.
