.PHONY: up down logs test test-taches test-ouvriers test-java ps perf e2e postman zap

up:            ## Lance toute l'application
	docker compose up --build -d

down:          ## Arrête l'application
	docker compose down

logs:          ## Suit les logs de tous les services
	docker compose logs -f

ps:
	docker compose ps

test: test-taches test-ouvriers test-java

test-taches:
	cd services/taches-service-v2 && npm ci && npm test

test-ouvriers:
	cd services/ouvriers-service && pip install -r requirements-dev.txt && pytest -q

test-java:
	cd services/chantiers-service && mvn -B verify
	cd services/materiaux-service && mvn -B verify

# Données de démonstration Souss Bâtiment (stack démarrée : make up). EFFACE les données métier
# de la base locale puis les recharge par les API ; confirmation : taper « oui » ou CONFIRMER=oui.
demo:          ## Remet la base locale à zéro et charge les données de démo
	scripts/donnees-demo.sh

# Test de charge JMeter via la gateway (stack démarrée) : make perf UTILISATEURS=50 DUREE=120
UTILISATEURS ?= 20
DUREE ?= 60
perf:          ## Test de charge JMeter, rapport HTML dans tests/performance/resultats/
	UTILISATEURS=$(UTILISATEURS) DUREE=$(DUREE) tests/performance/lancer-jmeter.sh

# Tests de bout en bout Playwright via la gateway (stack démarrée : make up)
e2e:           ## Tests Playwright, rapport HTML dans frontend/playwright-report/
	set -a; . ./.env; set +a; cd frontend && npm ci && E2E_URL=http://localhost:$${GATEWAY_PORT:-8080} npm run e2e

# Collection Postman complète avec Newman, dans le réseau Docker de la stack (stack démarrée : make up).
# Autonome : elle crée ses données, les vérifie puis les supprime (sauf le matériau, sans suppression SOAP).
RESEAU ?= btp-chantiers_backend
postman:       ## Collection Postman (50 requêtes) avec Newman
	set -a; . ./.env; set +a; docker run --rm --network $(RESEAU) \
	  -v "$(CURDIR)/docs/api:/collection:ro" postman/newman:6-alpine \
	  run /collection/btp-chantiers.postman_collection.json \
	  --env-var gateway=http://gateway:8080 --env-var "motDePasse=$$DEMO_MOT_DE_PASSE"

# Scan de sécurité OWASP ZAP (baseline, passif) de la gateway et du front (stack démarrée)
zap:           ## Scan ZAP, rapport HTML dans tests/securite/rapports/
	tests/securite/lancer-zap.sh
