#!/bin/bash
# Setup script to configure Quint MCP servers via .mcp.json
# Run this inside the Docker container to reconfigure MCP servers

set -e

echo "=================================================="
echo "Configuring Quint MCP Servers"
echo "=================================================="
echo

# Get workspace path from user (default to /workspace)
echo "📁 Quint workspace configuration"
echo
echo "Enter the path to your Quint files inside the container"
echo "(default: /workspace)"
echo
read -p "Workspace path: " WORKSPACE_PATH
WORKSPACE_PATH="${WORKSPACE_PATH:-/workspace}"

# Verify the path exists
if [ ! -d "$WORKSPACE_PATH" ]; then
    echo
    echo "❌ Directory does not exist: $WORKSPACE_PATH"
    echo
    read -p "Create it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mkdir -p "$WORKSPACE_PATH"
        echo "✓ Directory created"
    else
        echo "Exiting. Please create the directory first."
        exit 1
    fi
fi

# Convert to absolute path
WORKSPACE_PATH="$(cd "$WORKSPACE_PATH" && pwd)"

echo
echo "Using workspace: $WORKSPACE_PATH"
echo

MCP_JSON="$WORKSPACE_PATH/.mcp.json"
KB_SERVER_PATH="/home/dev/mcp-servers/kb/dist/server.js"

echo "=================================================="
echo "Creating .mcp.json..."
echo "=================================================="
echo

# Backup existing .mcp.json if it exists
if [ -f "$MCP_JSON" ]; then
    cp "$MCP_JSON" "$MCP_JSON.backup"
    echo "✓ Backed up existing .mcp.json"
fi

# Create .mcp.json
cat > "$MCP_JSON" <<EOF
{
  "mcpServers": {
    "quint-lsp": {
      "command": "mcp-language-server",
      "args": [
        "--workspace",
        "$WORKSPACE_PATH",
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

echo "✓ Created .mcp.json with MCP server configuration"

echo
echo "=================================================="
echo "✅ Configuration complete!"
echo "=================================================="
echo
echo "MCP Servers configured in: $MCP_JSON"
echo "  • quint-lsp  - LSP features (diagnostics, definitions, etc.)"
echo "  • quint-kb   - Documentation and examples"
echo
echo "Start Claude Code in the workspace:"
echo "  cd $WORKSPACE_PATH && claude"
echo
echo "The MCP servers will be available automatically!"
echo
