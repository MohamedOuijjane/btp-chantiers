# Sécurité : scan OWASP ZAP (baseline)

Scan **passif** de la gateway et du front avec l'image Docker officielle `ghcr.io/zaproxy/zaproxy:stable` (`zap-baseline.py`) : exploration classique et AJAX (le front est une application monopage), puis analyse des réponses sans attaque. Rien n'est modifié dans l'application.

## Lancer

```bash
make up
make zap                                   # rapport dans tests/securite/rapports/<date>/
CIBLE=http://host.docker.internal:8080 MINUTES=5 tests/securite/lancer-zap.sh
```

Rapports : `rapport.html`, `rapport.json` et `rapport.md` (dossier ignoré par Git). Le scan n'échoue que sur une règle classée `FAIL` dans [`zap-regles.tsv`](zap-regles.tsv) ; les avertissements sont signalés sans le faire échouer.

En CI : workflow **Sécurité** (`.github/workflows/securite.yml`), chaque lundi à 6 h UTC et à la demande, avec le rapport en artefact (`rapport-zap`) et la synthèse dans le résumé du job.

## Faux positifs ignorés

Chaque règle ignorée est justifiée dans [`zap-regles.tsv`](zap-regles.tsv) :

| Règle | Pourquoi |
|---|---|
| 10109 Modern Web Application | Simple constat que le front est une application monopage |
| 10049 Storable and Cacheable Content | Cache long voulu : les fichiers de `/assets/` ont une empreinte dans leur nom ; `index.html` est en `no-cache` |
| 120000 Information in Browser localStorage | Seul le thème clair/sombre est en `localStorage` ; la session est en `sessionStorage` (ADR-0006) |

## Limites

- Scan **non authentifié** : les API (`/api/*`, `/ws`) répondent 401 sans jeton, seule la surface publique (front, connexion, WSDL) est analysée. Un scan des API avec un JWT (`zap-api-scan.py` et les contrats OpenAPI) serait l'étape suivante.
- Scan **passif** : pas d'injection ni d'attaque active (`zap-full-scan.py`), à réserver à un environnement dédié.
