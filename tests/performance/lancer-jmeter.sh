#!/usr/bin/env bash
# Test de charge JMeter en ligne de commande, puis rapport HTML.
#
#   tests/performance/lancer-jmeter.sh
#   UTILISATEURS=50 DUREE=120 tests/performance/lancer-jmeter.sh
#
# Variables (valeurs par défaut) : UTILISATEURS (20), MONTEE en s (10), DUREE en s (60),
# PAUSE_MS (500), SEUIL_MS pour les pages (1000), SEUIL_CONNEXION_MS (3000 : BCrypt, une fois
# par utilisateur), HOTE (localhost), PORT (GATEWAY_PORT du .env, sinon 8080),
# ERREURS_MAX en % (1) : au-delà, le script échoue (code 1).
# Mot de passe des comptes de démo : DEMO_MOT_DE_PASSE (lu dans .env s'il n'est pas défini).
# JMeter : $JMETER_HOME/bin/jmeter, sinon « jmeter » dans le PATH (version 5.6 ou plus).
set -euo pipefail

ICI="$(cd "$(dirname "$0")" && pwd)"
RACINE="$(cd "$ICI/../.." && pwd)"

# Valeurs du .env (sans écraser l'environnement)
if [[ -f "$RACINE/.env" ]]; then
  : "${DEMO_MOT_DE_PASSE:=$(grep -E '^DEMO_MOT_DE_PASSE=' "$RACINE/.env" | cut -d= -f2-)}"
  : "${PORT:=$(grep -E '^GATEWAY_PORT=' "$RACINE/.env" | cut -d= -f2-)}"
fi
: "${DEMO_MOT_DE_PASSE:?DEMO_MOT_DE_PASSE manquant (copier .env.example en .env)}"
export DEMO_MOT_DE_PASSE

UTILISATEURS="${UTILISATEURS:-20}"
MONTEE="${MONTEE:-10}"
DUREE="${DUREE:-60}"
PAUSE_MS="${PAUSE_MS:-500}"
SEUIL_MS="${SEUIL_MS:-1000}"
SEUIL_CONNEXION_MS="${SEUIL_CONNEXION_MS:-3000}"
HOTE="${HOTE:-localhost}"
PORT="${PORT:-8080}"
ERREURS_MAX="${ERREURS_MAX:-1}"

if [[ -n "${JMETER_HOME:-}" ]]; then
  JMETER="$JMETER_HOME/bin/jmeter"
elif command -v jmeter >/dev/null; then
  JMETER="jmeter"
else
  echo "JMeter introuvable : définir JMETER_HOME ou ajouter jmeter au PATH (voir tests/performance/README.md)." >&2
  exit 2
fi

SORTIE="${SORTIE:-$ICI/resultats/$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$SORTIE"

echo "Gateway http://$HOTE:$PORT : $UTILISATEURS utilisateurs, montée $MONTEE s, durée $DUREE s, seuil $SEUIL_MS ms (connexion $SEUIL_CONNEXION_MS ms)"
"$JMETER" -n -t "$ICI/btp-chantiers.jmx" \
  -Jhote="$HOTE" -Jport="$PORT" \
  -Jutilisateurs="$UTILISATEURS" -Jmontee="$MONTEE" -Jduree="$DUREE" \
  -Jpause_ms="$PAUSE_MS" -Jseuil_ms="$SEUIL_MS" -Jseuil_connexion_ms="$SEUIL_CONNEXION_MS" \
  -l "$SORTIE/resultats.jtl" -j "$SORTIE/jmeter.log" \
  -e -o "$SORTIE/rapport"

# Résumé (moyenne, 90e percentile, débit, erreurs) lu dans le rapport HTML
python3 - "$SORTIE/rapport/statistics.json" "$ERREURS_MAX" <<'PY'
import json, sys
stats = json.load(open(sys.argv[1], encoding="utf-8"))
seuil = float(sys.argv[2])
print(f"\n{'Requête':<28}{'Nb':>7}{'Moy. ms':>9}{'P90 ms':>9}{'Débit/s':>9}{'Erreurs':>9}")
for nom, s in sorted(stats.items(), key=lambda kv: kv[0] == "Total"):
    print(f"{nom:<28}{s['sampleCount']:>7}{s['meanResTime']:>9.0f}{s['pct1ResTime']:>9.0f}"
          f"{s['throughput']:>9.1f}{s['errorPct']:>8.2f}%")
total = stats["Total"]["errorPct"]
if total > seuil:
    print(f"\nÉchec : {total:.2f} % d'erreurs (maximum {seuil} %)")
    sys.exit(1)
print(f"\nOK : {total:.2f} % d'erreurs (maximum {seuil} %)")
PY
echo "Rapport HTML : $SORTIE/rapport/index.html"
