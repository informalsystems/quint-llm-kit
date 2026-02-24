#!/bin/bash
# Entrypoint script to ensure MCP servers are properly configured

set -e -o pipefail

MCP_JSON="/workspace/.mcp.json"
CLAUDE_SETTINGS="/workspace/.claude/settings.json"
KB_SERVER_PATH="/home/dev/mcp-servers/kb/dist/server.js"
KB_DATA_DIR="/home/dev/mcp-servers/kb/data"

# KB indices are pre-built in the Docker image
echo "✓ KB indices pre-built in Docker image"

# Create .claude/settings.json to pre-approve MCP tool calls
if [ ! -f "$CLAUDE_SETTINGS" ]; then
    echo "Creating .claude/settings.json with MCP tool permissions..."
    mkdir -p "/workspace/.claude"
    cat > "$CLAUDE_SETTINGS" <<EOF
{
  "enabledMcpjsonServers": ["quint-lsp", "quint-kb"],
  "enableAllProjectMcpServers": true,
  "permissions": {
    "allow": [
      "mcp__quint-kb__*",
      "mcp__quint-lsp__*",
      "Bash(quint*)",
      "Bash(cargo check*)",
      "Bash(cargo test*)",
      "Bash(cargo build*)",
      "Bash(cargo clippy*)",
      "Bash(cargo run*)",
      "Bash(go test*)",
      "Bash(go build*)",
      "Bash(go vet*)",
      "Bash(tsc*)",
      "Bash(npx tsc*)",
      "Bash(npm test*)",
      "Bash(npm run *)",
      "Bash(yarn test*)",
      "Bash(yarn run *)",
      "Bash(bun test*)",
      "Bash(bun run *)",
      "Bash(pytest*)",
      "Bash(python -m pytest*)",
      "Bash(make test*)",
      "Bash(make check*)",
      "Bash(make build*)"
    ]
  }
}
EOF
    echo "✓ MCP tool permissions pre-approved"
else
    echo "✓ .claude/settings.json already exists"
fi

# Create .mcp.json in the workspace if it doesn't exist
if [ ! -f "$MCP_JSON" ]; then
    echo "Creating .mcp.json with MCP server configuration..."
    cat > "$MCP_JSON" <<EOF
{
  "mcpServers": {
    "quint-lsp": {
      "command": "mcp-language-server",
      "args": [
        "--workspace",
        "/workspace",
        "--lsp",
        "quint-language-server",
        "--",
        "--stdio"
      ]
    },
    "quint-kb": {
      "command": "node",
      "args": [
        "$KB_SERVER_PATH"
      ]
    }
  }
}
EOF
    echo "✓ MCP servers configured: quint-lsp, quint-kb"
    echo "✓ Configuration saved to: $MCP_JSON"
else
    echo "✓ .mcp.json already exists at: $MCP_JSON"
fi

# Execute the command passed to docker run
exec "$@"
