#!/usr/bin/env bash
#
# Configure Claude Code to use Quint LSP via MCP bridge
#

set -e

echo "=================================================="
echo "Configuring Claude Code for Quint LSP"
echo "=================================================="
echo ""

# Verify prerequisites
echo "🔍 Checking prerequisites..."
echo ""

MISSING_DEPS=0

if ! command -v mcp-language-server &> /dev/null; then
    echo "❌ mcp-language-server not found"
    echo "   Run: ./01-install-mcp-bridge.sh"
    MISSING_DEPS=1
else
    echo "✓ 🐹 mcp-language-server found: $(which mcp-language-server)"
fi

if ! command -v quint-language-server &> /dev/null; then
    echo "❌ quint-language-server not found"
    echo "   Run: ./02-install-quint-lsp.sh"
    MISSING_DEPS=1
else
    echo "✓ quint-language-server found: $(which quint-language-server)"
fi

if ! command -v claude &> /dev/null; then
    echo "❌ claude CLI not found"
    echo "   Please install Claude Code first"
    MISSING_DEPS=1
else
    echo "✓ claude CLI found: $(which claude)"
fi

if [ $MISSING_DEPS -eq 1 ]; then
    echo ""
    echo "❌ Missing prerequisites. Please install them first."
    exit 1
fi

echo ""
echo "=================================================="
echo "All prerequisites met!"
echo "=================================================="
echo ""

# Get workspace path from user
echo "📁 Where are your Quint files?"
echo ""
echo "Enter the absolute path to your Quint directory"
echo "(e.g., /home/user/my-project/specs)"
echo ""
read -p "Workspace path: " WORKSPACE_PATH

# Expand ~ to home directory if present
WORKSPACE_PATH="${WORKSPACE_PATH/#\~/$HOME}"

# Verify the path exists
if [ ! -d "$WORKSPACE_PATH" ]; then
    echo ""
    echo "❌ Directory does not exist: $WORKSPACE_PATH"
    echo ""
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

echo ""
echo "Using workspace: $WORKSPACE_PATH"
echo ""

# Ask for server name
echo "What should we name this MCP server?"
echo "(default: quint-lsp)"
read -p "Name: " SERVER_NAME
SERVER_NAME="${SERVER_NAME:-quint-lsp}"

echo ""
echo "=================================================="
echo "Adding MCP server to Claude Code..."
echo "=================================================="
echo ""

# Check if server already exists
if claude mcp list 2>/dev/null | grep -q "^$SERVER_NAME"; then
    echo "⚠️  Server '$SERVER_NAME' already exists"
    echo ""
    read -p "Remove and re-add? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Removing existing server..."
        claude mcp remove "$SERVER_NAME" || true
    else
        echo "Exiting. Use a different name or remove the existing server."
        exit 1
    fi
fi

# Add the MCP server
echo "Adding server '$SERVER_NAME'..."
claude mcp add-json "$SERVER_NAME" "{
  \"command\": \"mcp-language-server\",
  \"args\": [
    \"--workspace\", \"$WORKSPACE_PATH\",
    \"--lsp\", \"quint-language-server\",
    \"--\", \"--stdio\"
  ]
}"

echo ""
echo "✓ MCP server added"
echo ""

# Verify it was added
echo "Verifying configuration..."
if claude mcp list | grep -q "^$SERVER_NAME"; then
    echo "✓ Server '$SERVER_NAME' is configured"
else
    echo "❌ Server not found in configuration"
    echo "   Try running: claude mcp list"
    exit 1
fi

echo ""
echo "=================================================="
echo "✅ Configuration complete!"
echo "=================================================="
echo ""
echo "Server name: $SERVER_NAME"
echo "Workspace:   $WORKSPACE_PATH"
echo ""
echo "Test it with:"
echo "  claude \"What MCP tools do you have available?\""
echo ""
echo "You should see tools like:"
echo "  - definition"
echo "  - references"
echo "  - diagnostics"
echo "  - hover"
echo "  - rename"
echo ""