.PHONY: help dev prod build clean logs migrate

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start development environment
	docker-compose -f docker-compose.dev.yml up --build

dev-d: ## Start development environment in background
	docker-compose -f docker-compose.dev.yml up -d --build

prod: ## Start production environment
	docker-compose -f docker-compose.prod.yml up -d --build

build-dev: ## Build development images
	docker-compose -f docker-compose.dev.yml build

build-prod: ## Build production images
	docker-compose -f docker-compose.prod.yml build --no-cache

down-dev: ## Stop development environment
	docker-compose -f docker-compose.dev.yml down

down-prod: ## Stop production environment
	docker-compose -f docker-compose.prod.yml down

clean: ## Remove all containers, volumes, and images
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose -f docker-compose.prod.yml down -v

logs-dev: ## Show development logs
	docker-compose -f docker-compose.dev.yml logs -f

logs-prod: ## Show production logs
	docker-compose -f docker-compose.prod.yml logs -f

logs-api: ## Show API logs (dev)
	docker-compose -f docker-compose.dev.yml logs -f api

logs-web: ## Show Web logs (dev)
	docker-compose -f docker-compose.dev.yml logs -f web

shell-api: ## Shell into API container (dev)
	docker exec -it immoflow-api-dev sh

shell-web: ## Shell into Web container (dev)
	docker exec -it immoflow-web-dev sh

shell-db: ## Shell into PostgreSQL (dev)
	docker exec -it immoflow-postgres-dev psql -U postgres -d immoflow

migrate: ## Run database migrations (dev)
	docker exec -it immoflow-api-dev pnpm run migrate

restart-api: ## Restart API container (dev)
	docker-compose -f docker-compose.dev.yml restart api

restart-web: ## Restart Web container (dev)
	docker-compose -f docker-compose.dev.yml restart web
