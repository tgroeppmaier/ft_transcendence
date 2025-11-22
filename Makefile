name = ft_transcedence

all:
	@printf "Launch configuration ${name}...\n"
	@bash make_db_dir.sh
	@docker-compose -f ./docker-compose.yml up

build:
	@printf "Building configuration ${name}...\n"
	@bash make_db_dir.sh
	@docker-compose -f ./docker-compose.yml up --build

down:
	@printf "Stopping configuration ${name}...\n"
	@docker-compose -f ./docker-compose.yml down

re: down
	@printf "Rebuild configuration ${name}...\n"
	@bash make_db_dir.sh
	@docker-compose -f ./docker-compose.yml up -d --build

clean: down
	@printf "Cleaning configuration ${name}...\n"
	@docker system prune -a
	@sudo rm -rf /Users/${USER}/data/sqlite/*

fclean:
	@printf "Total clean of all configurations docker\n"
	@docker stop $$(docker ps -qa)
	@docker system prune --all --force --volumes
	@docker network prune --force
	@docker volume prune --force
	@sudo rm -rf /Users/${USER}/data/sqlite/*

.PHONY: all build down re clean fclean
