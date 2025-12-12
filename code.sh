#!/bin/bash

# Interactive script to run Claude Code in Docker

# Check if path was provided as argument
if [ -n "$1" ]; then
  PATH_TO_CODE=$(realpath "$1")
else
  # Interactive prompt
  read -e -p "Enter the path to your code directory: " user_path

  if [ -z "$user_path" ]; then
    echo "Error: No path provided."
    exit 1
  fi

  # Expand ~ and resolve to absolute path
  user_path="${user_path/#\~/$HOME}"
  PATH_TO_CODE=$(realpath "$user_path" 2>/dev/null)

  if [ ! -d "$PATH_TO_CODE" ]; then
    echo "Error: Directory '$user_path' does not exist."
    exit 1
  fi
fi

# Ensure Docker image exists
if ! docker image inspect claudecode:latest > /dev/null 2>&1;
then
  echo "Docker image 'claudecode:latest' not found. Please build it first with 'make build'."
  exit 1
fi

# Check if container exists (running or stopped)
if docker ps -a --filter "name=claude-code-dev" | grep -q claude-code-dev; then
  # Container exists, check if it's running
  if docker ps --filter "name=claude-code-dev" --filter "status=running" | grep -q claude-code-dev; then
    echo "Container 'claude-code-dev' is already running."
    echo "Use 'make exec' to attach to it, or stop it first with 'make stop'."
    exit 1
  else
    # Container exists but is stopped - remove it
    echo "Found stopped container 'claude-code-dev', removing it..."
    docker rm claude-code-dev > /dev/null 2>&1
    echo "✓ Old container removed"
  fi
fi

docker run -d \
  -v ${PATH_TO_CODE}:/workspace \
  -v claude-config:/home/dev/.config \
  -v claude-kb-data:/home/dev/mcp-servers/kb/data \
  --name claude-code-dev \
  --label project=claude-code \
  claudecode:latest

echo "Container 'claude-code-dev' started in detached mode."
echo ""
echo "✓ Agents available in: /home/dev/.claude/"
echo "✓ MCP servers: quint-lsp, quint-kb (configured via .mcp.json)"
echo "✓ Workspace mounted at: /workspace"
echo "✓ Persistent volumes: claude-config (auth), claude-kb-data (indices)"
echo ""
echo "Waiting for MCP initialization to complete..."
# Wait for entrypoint to finish initialization (check for completion marker or timeout)
sleep 3

# Check if initialization is still running by looking for the setup process
for i in {1..30}; do
  if docker exec claude-code-dev pgrep -f "npm run setup" > /dev/null 2>&1; then
    echo -n "."
    sleep 2
  else
    break
  fi
done
echo ""
echo "✓ MCP initialization complete"
echo ""
echo "Use 'make exec' to start Claude Code."
