.PHONY: help up down restart logs build \
        check-env check-deps copy-env

COMPOSE      := docker compose -f docker/docker-compose.yml
BACKEND_ENV  := backend/.env

# ─────────────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  Template.net AI Chat"
	@echo ""
	@echo "  First-time setup:"
	@echo "    1. cp backend/.env.example backend/.env"
	@echo "    2. Edit backend/.env — set GEMINI_API_KEY"
	@echo "    3. make up"
	@echo ""
	@echo "  Commands:"
	@echo "    make up        Build images and start all services"
	@echo "    make down      Stop and remove containers"
	@echo "    make restart   Full rebuild + restart"
	@echo "    make logs      Tail all service logs"
	@echo "    make build     Rebuild Docker images without starting"
	@echo ""
	@echo "  URLs (after make up):"
	@echo "    Frontend   http://localhost:4000"
	@echo "    Backend    http://localhost:8000"
	@echo "    MinIO UI   http://localhost:9001  (minioadmin / minioadmin123)"
	@echo ""

# ── Main commands ─────────────────────────────────────────────────────────────

up: check-deps check-env
	$(COMPOSE) up --build -d
	@echo ""
	@echo "  All services started."
	@echo "  Frontend → http://localhost:4000"
	@echo "  Backend  → http://localhost:8000"
	@echo "  Logs     → make logs"
	@echo ""

down:
	$(COMPOSE) down

restart: down up

build: check-deps check-env
	$(COMPOSE) build

logs:
	$(COMPOSE) logs -f

# ── Guards ────────────────────────────────────────────────────────────────────

# Ensure Docker and docker compose are available
check-deps:
	@if ! command -v docker > /dev/null 2>&1; then \
		echo ""; \
		echo "  ERROR: Docker is not installed."; \
		echo "  Install it from https://docs.docker.com/get-docker/"; \
		echo ""; \
		exit 1; \
	fi
	@if ! docker compose version > /dev/null 2>&1; then \
		echo ""; \
		echo "  ERROR: 'docker compose' (v2) is not available."; \
		echo "  Make sure Docker Desktop is up to date, or install the compose plugin:"; \
		echo "  https://docs.docker.com/compose/install/"; \
		echo ""; \
		exit 1; \
	fi
	@if ! docker info > /dev/null 2>&1; then \
		echo ""; \
		echo "  ERROR: Docker daemon is not running. Please start Docker Desktop."; \
		echo ""; \
		exit 1; \
	fi

# Ensure backend/.env exists and GEMINI_API_KEY is set
check-env:
	@if [ ! -f $(BACKEND_ENV) ]; then \
		echo ""; \
		echo "  ERROR: $(BACKEND_ENV) not found."; \
		echo "  Run:  cp backend/.env.example backend/.env"; \
		echo "        Then open it and set GEMINI_API_KEY."; \
		echo ""; \
		exit 1; \
	fi
	@KEY=$$(grep '^GEMINI_API_KEY=' $(BACKEND_ENV) | cut -d= -f2- | tr -d '[:space:]'); \
	if [ -z "$$KEY" ]; then \
		echo ""; \
		echo "  ERROR: GEMINI_API_KEY is not set in $(BACKEND_ENV)."; \
		echo "  Get your key at https://aistudio.google.com/apikey"; \
		echo "  Then add it:  GEMINI_API_KEY=your_key_here"; \
		echo ""; \
		exit 1; \
	fi
