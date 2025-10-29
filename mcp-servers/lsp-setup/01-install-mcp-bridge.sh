#!/usr/bin/env bash
#
# Install LSP-MCP Bridge (isaacphi/mcp-language-server)
# This bridge connects Language Server Protocol servers to Claude via MCP
#

set -e

echo "=================================================="
echo "Installing LSP-MCP Bridge"
echo "=================================================="
echo ""

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed"
    echo ""
    echo "Please install Go first:"
    echo "  macOS:   brew install go"
    echo "  Ubuntu:  sudo apt install golang-go"
    echo "  Or:      https://go.dev/dl/"
    echo ""
    exit 1
fi

echo "✓ 🐹 Go is installed: $(go version)"
echo ""

# Install the MCP bridge
echo "📦 Installing mcp-language-server via Go..."
go install github.com/isaacphi/mcp-language-server@latest

# Verify installation
if command -v mcp-language-server &> /dev/null; then
    echo "✓ mcp-language-server installed successfully"
    echo "  Location: $(which mcp-language-server)"
else
    echo "⚠️  mcp-language-server installed but not in PATH"
    echo ""
    echo "Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
    echo "  export PATH=\"\$HOME/go/bin:\$PATH\""
    echo ""
    echo "Then run: source ~/.bashrc  (or restart your terminal)"
    exit 1
fi

echo ""
echo "=================================================="
echo "✅ LSP-MCP Bridge installation complete!"
echo "=================================================="
echo ""
echo "Next step: Run ./02-install-quint-lsp.sh"