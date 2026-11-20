.PHONY: up down logs test test-taches test-ouvriers test-java ps e2e

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
	cd services/taches-service && npm ci && npm test

test-ouvriers:
	cd services/ouvriers-service && pip install -r requirements-dev.txt && pytest -q

test-java:
	cd services/chantiers-service && mvn -B verify
	cd services/materiaux-service && mvn -B verify

# Tests de bout en bout Playwright via la gateway (stack démarrée : make up)
e2e:           ## Tests Playwright, rapport HTML dans frontend/playwright-report/
	set -a; . ./.env; set +a; cd frontend && npm ci && E2E_URL=http://localhost:$${GATEWAY_PORT:-8080} npm run e2e
