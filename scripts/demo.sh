#!/usr/bin/env bash
# Scénario de démonstration de bout en bout (soutenance).
# Prérequis : docker compose up --build -d, et tous les services "healthy".
set -euo pipefail
GW=${GW:-http://localhost:8080}
title() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }

title "1. Créer un chantier (Chantiers · Spring Boot · REST)"
CHANTIER=$(curl -sf -X POST "$GW/api/chantiers" -H 'Content-Type: application/json' -d '{
  "nom":"Résidence Al Amal","adresse":"Hay Mohammadi, Agadir","client":"Société Souss Immo",
  "dateDebut":"2026-11-01","dateFinPrevue":"2027-06-30","budget":2500000,"statut":"EN_COURS"}')
echo "$CHANTIER"
CID=$(echo "$CHANTIER" | sed -E 's/.*"id":([0-9]+).*/\1/')

title "2. Ajouter un ouvrier (Ouvriers · FastAPI · REST)"
OUVRIER=$(curl -sf -X POST "$GW/api/ouvriers" -H 'Content-Type: application/json' -d '{
  "nom":"El Amrani","prenom":"Youssef","cin":"JB'$RANDOM'","specialite":"MACON","telephone":"0612345678"}')
echo "$OUVRIER"
OID=$(echo "$OUVRIER" | sed -E 's/.*"id":([0-9]+).*/\1/')

title "3. Ajouter du ciment au stock (Matériaux · Spring-WS · SOAP)"
SOAP=$(curl -sf -X POST "$GW/ws" -H 'Content-Type: text/xml' -d '
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:m="http://btp.uiz.ma/materiaux">
 <soapenv:Body><m:AjouterMateriauRequest><m:materiau>
  <m:reference>CIM-'$RANDOM'</m:reference><m:nom>Ciment CPJ45</m:nom><m:unite>sac</m:unite>
  <m:stock>100</m:stock><m:seuilAlerte>20</m:seuilAlerte>
 </m:materiau></m:AjouterMateriauRequest></soapenv:Body></soapenv:Envelope>')
echo "$SOAP"
MID=$(echo "$SOAP" | sed -E 's/.*<([A-Za-z0-9]+:)?id>([0-9]+)<.*/\2/')

title "4. Créer une tâche : Tâches appelle Chantiers (REST), Ouvriers (REST) et Matériaux (SOAP)"
TACHE=$(curl -sf -X POST "$GW/api/taches" -H 'Content-Type: application/json' -d '{
  "chantierId":'$CID',"titre":"Coulage des fondations","dateDebut":"2026-11-02","dateFin":"2026-11-10",
  "ouvrierIds":['$OID'],"besoinsMateriaux":[{"materiauId":'$MID',"quantite":40}]}')
echo "$TACHE"
TID=$(echo "$TACHE" | sed -E 's/.*"_id":"([a-f0-9]+)".*/\1/')

title "5. Règle métier : demander plus de ciment que le stock est refusé (422)"
curl -s -X POST "$GW/api/taches" -H 'Content-Type: application/json' -d '{
  "chantierId":'$CID',"titre":"Dalle","dateDebut":"2026-11-11","dateFin":"2026-11-20",
  "besoinsMateriaux":[{"materiauId":'$MID',"quantite":9999}]}'; echo

title "6. Faire avancer la tâche à 60 %"
curl -sf -X PATCH "$GW/api/taches/$TID/avancement" -H 'Content-Type: application/json' -d '{"avancement":60}'; echo

title "7. Avancement global du chantier (Chantiers appelle Tâches)"
curl -sf "$GW/api/chantiers/$CID/avancement"; echo

title "8. Planning de l'ouvrier (Ouvriers appelle Tâches)"
curl -sf "$GW/api/ouvriers/$OID/planning"; echo
