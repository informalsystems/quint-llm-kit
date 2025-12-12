#!/bin/bash
# Entrypoint script to ensure MCP servers are properly configured

set -e

MCP_JSON="/workspace/.mcp.json"
KB_SERVER_PATH="/home/dev/mcp-servers/kb/dist/server.js"
KB_DATA_DIR="/home/dev/mcp-servers/kb/data"

# Build KB indices on first run if they don't exist
if [ ! -f "$KB_DATA_DIR/docs-index.json" ] || [ ! -d "$KB_DATA_DIR/embeddings" ]; then
    echo "Building KB MCP server indices (this may take 1-2 minutes on first run)..."
    cd /home/dev/mcp-servers/kb
    npm run setup > /tmp/kb-setup.log 2>&1 &
    SETUP_PID=$!

    # Show progress while setup runs
    echo -n "Building vector indices"
    while kill -0 $SETUP_PID 2>/dev/null; do
        echo -n "."
        sleep 2
    done

    # Check if setup succeeded
    wait $SETUP_PID
    SETUP_EXIT=$?

    if [ $SETUP_EXIT -eq 0 ]; then
        echo ""
        echo "✓ KB indices built successfully"
    else
        echo ""
        echo "⚠ KB setup failed (exit code: $SETUP_EXIT), KB server may not work"
        echo "  Check /tmp/kb-setup.log for details"
    fi

    cd /workspace
else
    echo "✓ KB indices already built"
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
