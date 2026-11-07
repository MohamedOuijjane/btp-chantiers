#!/usr/bin/env bash
# Scénario de démonstration de bout en bout (soutenance).
# Prérequis : docker compose up --build -d, et tous les services "healthy".
# À lancer depuis la racine du dépôt : le mot de passe de démo est lu dans .env (ADR-0006).
set -euo pipefail
GW=${GW:-http://localhost:8080}
title() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }

# Mot de passe des comptes de démo : variable d'environnement, sinon fichier .env.
if [ -z "${DEMO_MOT_DE_PASSE:-}" ] && [ -f .env ]; then
  DEMO_MOT_DE_PASSE=$(sed -n 's/^DEMO_MOT_DE_PASSE=//p' .env | tr -d '\r')
fi
: "${DEMO_MOT_DE_PASSE:?introuvable : lancer le script depuis la racine du dépôt, avec un fichier .env}"

title "0. Se connecter en conducteur de travaux (JWT émis par Chantiers, vérifié par la gateway)"
CONNEXION=$(curl -sf -X POST "$GW/api/auth/login" -H 'Content-Type: application/json' -d '{
  "email":"samir.haddou@souss-batiment.demo","motDePasse":"'"$DEMO_MOT_DE_PASSE"'"}')
echo "$CONNEXION" | sed -E 's/"token":"([^"]{20})[^"]*"/"token":"\1…"/'
TOKEN=$(echo "$CONNEXION" | sed -E 's/.*"token":"([^"]+)".*/\1/')
AUTH=(-H "Authorization: Bearer $TOKEN")

title "1. Créer un chantier (Chantiers · Spring Boot · REST)"
CHANTIER=$(curl -sf "${AUTH[@]}" -X POST "$GW/api/chantiers" -H 'Content-Type: application/json' -d '{
  "nom":"Résidence Al Amal","adresse":"Hay Mohammadi, Agadir","client":"Société Souss Immo",
  "dateDebut":"2026-11-01","dateFinPrevue":"2027-06-30","budget":2500000,"statut":"EN_COURS"}')
echo "$CHANTIER"
CID=$(echo "$CHANTIER" | sed -E 's/.*"id":([0-9]+).*/\1/')

title "2. Ajouter un ouvrier (Ouvriers · FastAPI · REST)"
OUVRIER=$(curl -sf "${AUTH[@]}" -X POST "$GW/api/ouvriers" -H 'Content-Type: application/json' -d '{
  "nom":"El Amrani","prenom":"Youssef","cin":"JB'$RANDOM'","specialite":"MACON","telephone":"0612345678"}')
echo "$OUVRIER"
OID=$(echo "$OUVRIER" | sed -E 's/.*"id":([0-9]+).*/\1/')

title "3. Ajouter du ciment au stock (Matériaux · Spring-WS · SOAP)"
SOAP=$(curl -sf "${AUTH[@]}" -X POST "$GW/ws" -H 'Content-Type: text/xml' -d '
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:m="http://btp.uiz.ma/materiaux">
 <soapenv:Body><m:AjouterMateriauRequest><m:materiau>
  <m:reference>CIM-'$RANDOM'</m:reference><m:nom>Ciment CPJ45</m:nom><m:unite>sac</m:unite>
  <m:stock>100</m:stock><m:seuilAlerte>20</m:seuilAlerte>
 </m:materiau></m:AjouterMateriauRequest></soapenv:Body></soapenv:Envelope>')
echo "$SOAP"
MID=$(echo "$SOAP" | sed -E 's/.*<([A-Za-z0-9]+:)?id>([0-9]+)<.*/\2/')

title "4. Créer une tâche : Tâches appelle Chantiers (REST), Ouvriers (REST) et Matériaux (SOAP)"
TACHE=$(curl -sf "${AUTH[@]}" -X POST "$GW/api/taches" -H 'Content-Type: application/json' -d '{
  "chantierId":'$CID',"titre":"Coulage des fondations","dateDebut":"2026-11-02","dateFin":"2026-11-10",
  "ouvrierIds":['$OID'],"besoinsMateriaux":[{"materiauId":'$MID',"quantite":40}]}')
echo "$TACHE"
TID=$(echo "$TACHE" | sed -E 's/^[{]"id":([0-9]+).*/\1/')

title "5. Règle métier : demander plus de ciment que le stock est refusé (422)"
curl -s "${AUTH[@]}" -X POST "$GW/api/taches" -H 'Content-Type: application/json' -d '{
  "chantierId":'$CID',"titre":"Dalle","dateDebut":"2026-11-11","dateFin":"2026-11-20",
  "besoinsMateriaux":[{"materiauId":'$MID',"quantite":9999}]}'; echo

title "6. Faire avancer la tâche à 60 %"
curl -sf "${AUTH[@]}" -X PATCH "$GW/api/taches/$TID/avancement" -H 'Content-Type: application/json' -d '{"avancement":60}'; echo

title "7. Avancement global du chantier (Chantiers appelle Tâches)"
curl -sf "${AUTH[@]}" "$GW/api/chantiers/$CID/avancement"; echo

title "8. Planning de l'ouvrier (Ouvriers appelle Tâches)"
curl -sf "${AUTH[@]}" "$GW/api/ouvriers/$OID/planning"; echo

title "9. Sans jeton, la gateway refuse l'accès (401)"
curl -s "$GW/api/chantiers"; echo
