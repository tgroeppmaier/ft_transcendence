NAME = ft_transcendence
DOCKER_COMPOSE = docker compose
DATA_DIR = ./database/data

all: setup
	@printf "Launching $(NAME)...\n"
	@$(DOCKER_COMPOSE) up -d
	@printf "Application started\n"

build: setup
	@printf "Building $(NAME)...\n"
	@$(DOCKER_COMPOSE) up -d --build
	@printf "Application built and started\n"

setup:
	@if [ ! -f .env ]; then \
		printf "Generating random JWT_SECRET in .env...\n"; \
		node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))" > .env; \
	fi

down:
	@printf "Stopping $(NAME)...\n"
	@$(DOCKER_COMPOSE) down

stop:
	@printf "Stopping containers...\n"
	@$(DOCKER_COMPOSE) stop

start:
	@printf "Starting containers...\n"
	@$(DOCKER_COMPOSE) start

restart:
	@printf "Restarting $(NAME)...\n"
	@$(DOCKER_COMPOSE) restart

re: setup
	@printf "Rebuilding $(NAME)...\n"
	@$(DOCKER_COMPOSE) down -v
	@$(DOCKER_COMPOSE) up -d --build
	@printf "Application rebuilt and started\n"

clean:
	@printf "Cleaning unused Docker images...\n"
	@docker image prune -f
	@printf "Clean completed\n"

fclean: down
	@printf "Full clean (containers + volumes + images)...\n"
	@$(DOCKER_COMPOSE) down -v --rmi all
	@docker system prune -f
	@printf "Docker reset completed\n"

reset-db:
	@printf "Resetting database...\n"
	@$(DOCKER_COMPOSE) down
	@rm -f $(DATA_DIR)/users.db
	@$(DOCKER_COMPOSE) up -d
	@printf "Database reset and application restarted\n"

install:
	@printf "Installing dependencies for all services...\n"
	@cd backend && npm install
	@cd frontend && npm install
	@cd database && npm install
	@cd shared && npm install
	@printf "Dependencies installed.\n"

ps:
	@$(DOCKER_COMPOSE) ps

logs:
	@$(DOCKER_COMPOSE) logs -f

.PHONY: all build down stop start restart re clean fclean reset-db install ps logs
