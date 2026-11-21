#!/usr/bin/env bash
# Données de démonstration (Souss Bâtiment) : remet à zéro les données métier de la base de la
# stack Docker locale, puis les recharge par les API, via la gateway, comme un utilisateur.
#
#   CONFIRMER=oui make demo     (sans CONFIRMER, le script demande de taper « oui »)
#
# Remise à zéro : TRUNCATE des tables métier des 4 schémas (chantiers, ouvriers, materiaux,
# taches) avec RESTART IDENTITY ; les comptes de connexion (schéma auth) et l'historique des
# migrations sont conservés. Relançable : chaque exécution repart d'une base vide, sans doublon.
# Garde-fous : refuse de tourner si la base n'est pas celle de la stack Docker de ce dépôt, ou si
# la gateway n'est pas locale. Les dates sont calculées à partir du jour du lancement.
set -euo pipefail
cd "$(dirname "$0")/.."
RACINE=$(pwd -P)

if [ -f .env ]; then set -a; . ./.env; set +a; fi
: "${DEMO_MOT_DE_PASSE:?introuvable : fichier .env absent (cp .env.example .env)}"
GW=${GW:-http://localhost:${GATEWAY_PORT:-8080}}

etape() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }
erreur() { printf '\033[31m✖ %s\033[0m\n' "$1" >&2; exit 1; }
jour() { date -d "$1 days" +%F; }   # jour -30 → il y a 30 jours (GNU date)

# ─── 1. Garde-fous ──────────────────────────────────────────────────────────────────────────
etape "Vérifications"
case "$GW" in
  http://localhost:*|http://127.0.0.1:*) ;;
  *) erreur "La gateway doit être locale (GW=$GW)." ;;
esac
case "${DOCKER_HOST:-}" in
  ""|unix://*) ;;
  *) erreur "DOCKER_HOST pointe vers un hôte distant ($DOCKER_HOST) : refus." ;;
esac
PG=$(docker compose ps -q postgres 2>/dev/null || true)
[ -n "$PG" ] || erreur "Le conteneur postgres de la stack n'est pas démarré (make up)."
DOSSIER=$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}' "$PG")
[ "$(cd "$DOSSIER" 2>/dev/null && pwd -P)" = "$RACINE" ] ||
  erreur "Le conteneur postgres n'appartient pas à la stack de ce dépôt ($DOSSIER)."
BASE=$(docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d btp_db -Atc "SELECT current_database()"')
[ "$BASE" = "btp_db" ] || erreur "Base btp_db introuvable dans la stack locale."
curl -sf "$GW/health" >/dev/null || erreur "Gateway injoignable sur $GW (make up)."
echo "Stack locale : conteneur ${PG:0:12} (dépôt $RACINE), base btp_db, gateway $GW."

if [ "${CONFIRMER:-}" != "oui" ]; then
  [ -t 0 ] || erreur "Remise à zéro non confirmée : relancer avec CONFIRMER=oui."
  printf "Toutes les données métier de btp_db (chantiers, ouvriers, matériaux, tâches) seront effacées.\nTaper « oui » pour continuer : "
  read -r reponse
  [ "$reponse" = "oui" ] || erreur "Annulé : rien n'a été modifié."
fi

# ─── 2. Remise à zéro ───────────────────────────────────────────────────────────────────────
etape "Remise à zéro des données métier (comptes de connexion conservés)"
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d btp_db -v ON_ERROR_STOP=1 -qc "
  TRUNCATE chantiers.chantiers, ouvriers.ouvriers, materiaux.materiaux, materiaux.mouvements,
           taches.tache, taches.besoin_materiau, taches.historique_statut
  RESTART IDENTITY CASCADE;"'
echo "Tables vidées, identifiants remis à 1."

# ─── 3. Appels aux API ──────────────────────────────────────────────────────────────────────
JETON=$(curl -sf -X POST "$GW/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"samir.haddou@souss-batiment.demo\",\"motDePasse\":\"$DEMO_MOT_DE_PASSE\"}" |
  sed -E 's/.*"token":"([^"]+)".*/\1/')
[ -n "$JETON" ] || erreur "Connexion refusée."

# api MÉTHODE CHEMIN [JSON] → corps de la réponse ; arrêt avec le message de l'API en cas d'erreur.
api() {
  local corps code
  corps=$(curl -s -w '\n%{http_code}' -X "$1" "$GW$2" -H "Authorization: Bearer $JETON" \
    -H 'Content-Type: application/json' ${3:+-d "$3"})
  code=${corps##*$'\n'}; corps=${corps%$'\n'*}
  [[ $code == 2* ]] || erreur "$1 $2 → $code : $corps"
  printf '%s' "$corps"
}
id() { python3 -c 'import json, sys; print(json.load(sys.stdin)["id"])'; }

# soap OPÉRATION XML → réponse ; arrêt sur une SOAP Fault.
soap() {
  local r
  r=$(curl -s -X POST "$GW/ws" -H "Authorization: Bearer $JETON" -H 'Content-Type: text/xml; charset=utf-8' \
    -d "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:m=\"http://btp.uiz.ma/materiaux\"><soapenv:Body><m:$1Request>$2</m:$1Request></soapenv:Body></soapenv:Envelope>")
  if grep -q 'Fault' <<<"$r"; then erreur "SOAP $1 : $(sed -E 's/.*<faultstring[^>]*>([^<]*).*/\1/' <<<"$r")"; fi
  printf '%s' "$r"
}

chantier() {   # nom adresse client début fin budget → id (statut PLANIFIE)
  api POST /api/chantiers "{\"nom\":\"$1\",\"adresse\":\"$2\",\"client\":\"$3\",\"dateDebut\":\"$4\",\"dateFinPrevue\":\"$5\",\"budget\":$6}" | id
}
statut_chantier() {   # id nom adresse client début fin budget statut
  api PUT "/api/chantiers/$1" "{\"nom\":\"$2\",\"adresse\":\"$3\",\"client\":\"$4\",\"dateDebut\":\"$5\",\"dateFinPrevue\":\"$6\",\"budget\":$7,\"statut\":\"$8\"}" >/dev/null
}
ouvrier() {   # prénom nom cin spécialité téléphone → id
  api POST /api/ouvriers "{\"prenom\":\"$1\",\"nom\":\"$2\",\"cin\":\"$3\",\"specialite\":\"$4\",\"telephone\":\"$5\"}" | id
}
materiau() {   # référence nom unité stock seuil → id
  soap AjouterMateriau "<m:materiau><m:reference>$1</m:reference><m:nom>$2</m:nom><m:unite>$3</m:unite><m:stock>$4</m:stock><m:seuilAlerte>$5</m:seuilAlerte></m:materiau>" |
    sed -E 's/.*<([a-zA-Z0-9]+:)?id>([0-9]+)<.*/\2/'
}
mouvement() {   # matériau chantier ENTREE|SORTIE quantité
  soap EnregistrerMouvement "<m:materiauId>$1</m:materiauId><m:chantierId>$2</m:chantierId><m:type>$3</m:type><m:quantite>$4</m:quantite>" >/dev/null
}
tache() {   # chantier titre début fin ouvriers(JSON) besoins(JSON) → id
  api POST /api/taches "{\"chantierId\":$1,\"titre\":\"$2\",\"dateDebut\":\"$3\",\"dateFin\":\"$4\",\"ouvrierIds\":$5,\"besoinsMateriaux\":$6}" | id
}
terminer() { api PATCH "/api/taches/$1/statut" '{"statut":"EN_COURS"}' >/dev/null; api PATCH "/api/taches/$1/statut" '{"statut":"TERMINEE"}' >/dev/null; }
avancer() { api PATCH "/api/taches/$1/avancement" "{\"avancement\":$2}" >/dev/null; }
bloquer() { api PATCH "/api/taches/$1/blocage" "{\"bloquee\":true,\"motif\":\"$2\"}" >/dev/null; }

# ─── 4. Chantiers (créés planifiés ; les statuts finaux sont posés après les tâches) ───────
etape "Chantiers"
A=("Résidence Al Amal" "Hay Mohammadi, Agadir" "Souss Immo" "$(jour -90)" "$(jour 240)" 12500000)
B=("Groupe scolaire Anza" "Anza, Agadir" "Commune d'Agadir" "$(jour -45)" "$(jour 300)" 8200000)
C=("Villa Benali" "Founty, Agadir" "M. Karim Benali" "$(jour 20)" "$(jour 200)" 2400000)
D=("Clinique Argana · extension" "Talborjt, Agadir" "Clinique Argana SA" "$(jour -120)" "$(jour 180)" 6800000)
E=("Entrepôt logistique Aït Melloul" "Zone industrielle, Aït Melloul" "Souss Logistique" "$(jour -300)" "$(jour -20)" 4100000)
CA=$(chantier "${A[@]}"); CB=$(chantier "${B[@]}"); CC=$(chantier "${C[@]}")
CD=$(chantier "${D[@]}"); CE=$(chantier "${E[@]}")
for c in "$CA ${A[*]@Q}" "$CB ${B[*]@Q}" "$CD ${D[*]@Q}" "$CE ${E[*]@Q}"; do
  eval "statut_chantier $c EN_COURS"
done
echo "5 chantiers créés."

# ─── 5. Ouvriers ────────────────────────────────────────────────────────────────────────────
etape "Ouvriers"
O1=$(ouvrier Youssef "El Amrani" JB412305 MACON 0661234501)
O2=$(ouvrier Rachid Bouzid J287541 COFFREUR 0661234502)
O3=$(ouvrier Hassan "Aït Lahcen" JC90817 FERRAILLEUR 0661234503)
O4=$(ouvrier Mustapha Ouhammou JE30219 ELECTRICIEN 0661234504)
O5=$(ouvrier Brahim "Id Ali" JA77812 PLOMBIER 0661234505)
O6=$(ouvrier Abdellah Amzil JF11908 MANOEUVRE 0661234506)
O7=$(ouvrier Saïd Bakkali JH55021 PEINTRE 0661234507)
O8=$(ouvrier Omar Talbi JK66340 CONDUCTEUR_ENGINS 0661234508)
echo "8 ouvriers créés."

# ─── 6. Matériaux (stock initial) ───────────────────────────────────────────────────────────
etape "Matériaux"
CIM=$(materiau CIM-045 "Ciment CPJ 45" sacs 400 150)
F12=$(materiau FER-012 "Fer à béton HA12" t 18 5)
F08=$(materiau FER-008 "Fer à béton HA8" t 10 3)
SAB=$(materiau SAB-001 "Sable de rivière" m³ 120 30)
GRA=$(materiau GRA-015 "Gravette 15/25" m³ 90 25)
BRQ=$(materiau BRQ-012 "Brique creuse 12 trous" unités 12000 3000)
HOU=$(materiau HOU-016 "Hourdis 16" unités 2500 800)
CAR=$(materiau CAR-060 "Carrelage grès 60×60" m² 450 120)
PVC=$(materiau PVC-110 "Tube PVC Ø110" ml 300 80)
PEI=$(materiau PEI-020 "Peinture acrylique blanche" L 400 100)
echo "10 matériaux créés."

# ─── 7. Tâches (les ouvriers n'ont jamais deux tâches en cours sur la même période) ─────────
etape "Tâches"
b() { printf '{"materiauId":%s,"quantite":%s}' "$1" "$2"; }
# Entrepôt Aït Melloul (sera clôturé) : tout est terminé.
T=$(tache "$CE" "Charpente métallique" "$(jour -280)" "$(jour -150)" "[$O3]" "[$(b "$F08" 3)]"); terminer "$T"
T=$(tache "$CE" "Dallage industriel" "$(jour -140)" "$(jour -60)" "[$O1,$O2]" "[$(b "$CIM" 200)]"); terminer "$T"
T=$(tache "$CE" "Finitions et peinture" "$(jour -55)" "$(jour -25)" "[$O7]" "[$(b "$PEI" 120)]"); terminer "$T"
# Clinique Argana (sera suspendue).
T=$(tache "$CD" "Démolition partielle" "$(jour -115)" "$(jour -90)" "[$O8]" "[]"); terminer "$T"
T=$(tache "$CD" "Fondations de l'extension" "$(jour -88)" "$(jour 20)" "[]" "[$(b "$CIM" 50)]"); avancer "$T" 35
# Résidence Al Amal.
T=$(tache "$CA" "Terrassement et fouilles" "$(jour -85)" "$(jour -60)" "[$O8]" "[]"); terminer "$T"
T=$(tache "$CA" "Fondations et semelles" "$(jour -58)" "$(jour -30)" "[$O1,$O3]" "[$(b "$CIM" 120),$(b "$F12" 6)]"); terminer "$T"
T=$(tache "$CA" "Élévation des murs RDC" "$(jour -28)" "$(jour 10)" "[$O1]" "[$(b "$BRQ" 4000),$(b "$CIM" 80)]"); avancer "$T" 70
T=$(tache "$CA" "Plancher haut RDC" "$(jour -5)" "$(jour 15)" "[$O2,$O3]" "[$(b "$F12" 4),$(b "$HOU" 600)]")
avancer "$T" 20; bloquer "$T" "Livraison du fer HA12 en retard chez le fournisseur"
tache "$CA" "Électricité : gaines et boîtiers RDC" "$(jour 12)" "$(jour 30)" "[$O4]" "[]" >/dev/null
tache "$CA" "Chape et carrelage RDC" "$(jour 31)" "$(jour 50)" "[$O6]" "[$(b "$CAR" 180)]" >/dev/null
# Groupe scolaire Anza.
T=$(tache "$CB" "Terrassement" "$(jour -40)" "$(jour -25)" "[$O8]" "[]"); terminer "$T"
T=$(tache "$CB" "Fondations bloc A" "$(jour -24)" "$(jour -3)" "[$O8]" "[$(b "$CIM" 100),$(b "$F08" 3)]"); avancer "$T" 85
tache "$CB" "Réseaux d'assainissement" "$(jour 6)" "$(jour 25)" "[$O5]" "[$(b "$PVC" 120)]" >/dev/null
# Villa Benali (planifiée).
tache "$CC" "Implantation et terrassement" "$(jour 20)" "$(jour 30)" "[$O8]" "[$(b "$SAB" 20)]" >/dev/null
echo "15 tâches créées : à faire, en cours, une bloquée, terminées ; « Fondations bloc A » est en retard."

# ─── 8. Mouvements de stock (consommation réelle) ───────────────────────────────────────────
etape "Mouvements de stock"
mouvement "$CIM" "$CA" ENTREE 200; mouvement "$SAB" "$CA" ENTREE 40
mouvement "$CIM" "$CE" SORTIE 200; mouvement "$PEI" "$CE" SORTIE 120; mouvement "$F08" "$CE" SORTIE 3
mouvement "$SAB" "$CD" SORTIE 15
mouvement "$CIM" "$CA" SORTIE 120; mouvement "$F12" "$CA" SORTIE 6; mouvement "$BRQ" "$CA" SORTIE 3500
mouvement "$CIM" "$CA" SORTIE 70; mouvement "$F12" "$CA" SORTIE 3.5; mouvement "$HOU" "$CA" SORTIE 600
mouvement "$CIM" "$CB" SORTIE 90; mouvement "$F12" "$CB" SORTIE 4; mouvement "$F08" "$CB" SORTIE 3
mouvement "$SAB" "$CB" SORTIE 30; mouvement "$GRA" "$CB" SORTIE 25; mouvement "$PVC" "$CB" SORTIE 60
echo "18 mouvements ; en alerte : Ciment CPJ 45 (120 / seuil 150), Fer à béton HA12 (4,5 / seuil 5)."

# ─── 9. Statuts finaux ──────────────────────────────────────────────────────────────────────
etape "Statuts finaux"
eval "statut_chantier $CD ${D[*]@Q} SUSPENDU"
api PATCH "/api/chantiers/$CE/cloture" >/dev/null
api PATCH "/api/ouvriers/$O7" '{"disponible":false}' >/dev/null
echo "Clinique Argana suspendue, Entrepôt Aït Melloul clôturé, Saïd Bakkali indisponible."

etape "Données de démonstration chargées"
echo "Ouvrir http://localhost:${GATEWAY_PORT:-8080} (comptes de démo : voir le README)."
