#!/bin/bash
# Entrypoint script to ensure MCP servers are properly configured

set -e -o pipefail

MCP_JSON="/workspace/.mcp.json"
KB_SERVER_PATH="/home/dev/mcp-servers/kb/dist/server.js"
KB_DATA_DIR="/home/dev/mcp-servers/kb/data"

# KB indices are pre-built in the Docker image
echo "✓ KB indices pre-built in Docker image"

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
