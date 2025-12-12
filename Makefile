.PHONY: help build run exec stop status logs clean restart shell

help:
	@echo "Claude Code Docker Environment"
	@echo "==============================="
	@echo ""
	@echo "Available commands:"
	@echo "  make build      - Build the Docker image"
	@echo "  make run        - Start the container (interactive path prompt) and exec into Claude container"
	@echo "  make exec       - Attach to running container with Claude Code"
	@echo "  make shell      - Open bash shell in running container"
	@echo "  make stop       - Stop and remove the container"
	@echo "  make start      - Start the container (non-interactive)"
	@echo "  make restart    - Stop and restart the container"
	@echo "  make status     - Show container status"
	@echo "  make logs       - Show container logs"
	@echo "  make clean      - Remove container and image"
	@echo ""

build:
	docker build -t claudecode:latest -f claudecode.dockerfile .

run:
	@bash code.sh
	docker exec -it claude-code-dev claude

exec:
	docker exec -it claude-code-dev claude

start:
	@bash code.sh

shell:
	docker exec -it claude-code-dev /bin/bash

stop:
	docker stop claude-code-dev

restart: stop run

status:
	@docker ps --filter "name=claude-code-dev" --filter "label=project=claude-code"

logs:
	docker logs -f claude-code-dev

clean:
	@docker stop claude-code-dev 2>/dev/null || true
	@docker stop ai-dev-ui-1 2>/dev/null || true
	@docker stop ai-dev-db-1 2>/dev/null || true
	@docker rm claude-code-dev 2>/dev/null || true
	@docker rmi claudecode:latest 2>/dev/null || true
	@echo "Cleanup complete"

