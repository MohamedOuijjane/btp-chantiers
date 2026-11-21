#!/usr/bin/env bash
# Scan baseline OWASP ZAP (passif) de la gateway et du front, avec l'image Docker officielle.
#
#   tests/securite/lancer-zap.sh
#   CIBLE=http://host.docker.internal:8080 tests/securite/lancer-zap.sh
#
# Variables : CIBLE (http://host.docker.internal:<GATEWAY_PORT du .env>), MINUTES d'exploration
# (3), IMAGE (ghcr.io/zaproxy/zaproxy:stable), SORTIE (tests/securite/rapports/<date>).
# Rapports : rapport.html, rapport.json, rapport.md. Le scan n'échoue que sur une règle classée
# FAIL dans zap-regles.tsv (les avertissements sont signalés sans faire échouer).
set -euo pipefail

ICI="$(cd "$(dirname "$0")" && pwd)"
RACINE="$(cd "$ICI/../.." && pwd)"

if [[ -z "${CIBLE:-}" ]]; then
  PORT=8080
  if [[ -f "$RACINE/.env" ]] && grep -qE '^GATEWAY_PORT=' "$RACINE/.env"; then
    PORT="$(grep -E '^GATEWAY_PORT=' "$RACINE/.env" | cut -d= -f2-)"
  fi
  CIBLE="http://host.docker.internal:$PORT"
fi
MINUTES="${MINUTES:-3}"
IMAGE="${IMAGE:-ghcr.io/zaproxy/zaproxy:stable}"
SORTIE="${SORTIE:-$ICI/rapports/$(date +%Y%m%d-%H%M%S)}"

mkdir -p "$SORTIE"
cp "$ICI/zap-regles.tsv" "$SORTIE/"
chmod a+rwx "$SORTIE"   # l'image ZAP écrit avec son propre utilisateur (zap)

echo "Scan baseline ZAP de $CIBLE (exploration classique et AJAX, $MINUTES min au plus)"
code=0
docker run --rm --add-host=host.docker.internal:host-gateway \
  -v "$SORTIE:/zap/wrk:rw" "$IMAGE" \
  zap-baseline.py -t "$CIBLE" -j -m "$MINUTES" -I \
  -c zap-regles.tsv -r rapport.html -J rapport.json -w rapport.md || code=$?

# zap-baseline : 0 = rien à signaler, 1 = au moins une règle FAIL, 2 = avertissements, 3 = erreur
case "$code" in
  0 | 2) echo "Scan terminé. Rapport : $SORTIE/rapport.html" ;;
  1) echo "Échec : au moins une règle classée FAIL. Rapport : $SORTIE/rapport.html" >&2; exit 1 ;;
  *) echo "Erreur du scan ZAP (code $code)" >&2; exit "$code" ;;
esac
