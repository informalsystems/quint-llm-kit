#!/usr/bin/env bash
#
# Master setup script - runs all setup steps
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=================================================="
echo "Quint LSP-MCP Setup"
echo "=================================================="
echo ""
echo "This will install and configure:"
echo "  1. LSP-MCP Bridge"
echo "  2. Quint Language Server"
echo "  3. Claude Code configuration"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

echo ""
echo "=================================================="
echo "Step 1/3: Installing LSP-MCP Bridge"
echo "=================================================="
bash "$SCRIPT_DIR/01-install-mcp-bridge.sh"

echo ""
echo "=================================================="
echo "Step 2/3: Installing Quint Language Server"
echo "=================================================="
bash "$SCRIPT_DIR/02-install-quint-lsp.sh"

echo ""
echo "=================================================="
echo "Step 3/3: Configuring Claude Code"
echo "=================================================="
bash "$SCRIPT_DIR/03-configure-claude.sh"

echo ""
echo "=================================================="
echo "✅ Complete Setup Finished!"
echo "=================================================="
echo ""
echo "Test your setup:"
echo "  claude \"What MCP tools do you have available?\""
echo ""