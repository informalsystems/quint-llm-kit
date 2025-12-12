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

# Check if container is already running
if docker ps --filter "name=claude-code-dev" --filter "status=running" | grep -q claude-code-dev; then
  echo "Container 'claude-code-dev' is already running."
  echo "Use 'make exec' to attach to it, or stop it first with 'make stop'."
  exit 1
fi

docker run -d \
  -v ${PATH_TO_CODE}:/workspace \
  --name claude-code-dev \
  --label project=claude-code \
  claudecode:latest \
  tail -f /dev/null

echo "Container 'claude-code-dev' started in detached mode."
echo "Use 'make exec' to enter the container."
