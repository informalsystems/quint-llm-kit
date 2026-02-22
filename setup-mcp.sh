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
CLAUDE_SETTINGS="$WORKSPACE_PATH/.claude/settings.json"
KB_SERVER_PATH="/home/dev/mcp-servers/kb/dist/server.js"

echo "=================================================="
echo "Creating .claude/settings.json..."
echo "=================================================="
echo

mkdir -p "$WORKSPACE_PATH/.claude"

# Backup existing settings.json if it exists
if [ -f "$CLAUDE_SETTINGS" ]; then
    cp "$CLAUDE_SETTINGS" "$CLAUDE_SETTINGS.backup"
    echo "✓ Backed up existing .claude/settings.json"
fi

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
echo "✓ Created .claude/settings.json with MCP tool permissions pre-approved"

echo
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
