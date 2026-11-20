.PHONY: up down logs test test-taches test-ouvriers test-java ps perf

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

# Test de charge JMeter via la gateway (stack démarrée) : make perf UTILISATEURS=50 DUREE=120
UTILISATEURS ?= 20
DUREE ?= 60
perf:          ## Test de charge JMeter, rapport HTML dans tests/performance/resultats/
	UTILISATEURS=$(UTILISATEURS) DUREE=$(DUREE) tests/performance/lancer-jmeter.sh
