#!/usr/bin/env bash
#
# Verify Quint LSP-MCP setup
#

echo "=================================================="
echo "Quint LSP-MCP Setup Verification"
echo "=================================================="
echo ""

ISSUES=0

# Check Go
echo "1. Checking Go installation..."
if command -v go &> /dev/null; then
    echo "   ✓ 🐹 Go installed: $(go version)"
else
    echo "   ✗ Go not installed"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# Check npm
echo "2. Checking npm installation..."
if command -v npm &> /dev/null; then
    echo "   ✓ npm installed: $(npm --version)"
else
    echo "   ✗ npm not installed"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# Check mcp-language-server
echo "3. Checking mcp-language-server..."
if command -v mcp-language-server &> /dev/null; then
    echo "   ✓ mcp-language-server installed"
    echo "   Location: $(which mcp-language-server)"
else
    echo "   ✗ mcp-language-server not found"
    echo "   Run: ./01-install-mcp-bridge.sh"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# Check quint-language-server
echo "4. Checking quint-language-server..."
if command -v quint-language-server &> /dev/null; then
    echo "   ✓ quint-language-server installed"
    echo "   Location: $(which quint-language-server)"
else
    echo "   ✗ quint-language-server not found"
    echo "   Run: ./02-install-quint-lsp.sh"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# Check Claude CLI
echo "5. Checking Claude Code CLI..."
if command -v claude &> /dev/null; then
    echo "   ✓ claude CLI installed"
    echo "   Location: $(which claude)"
else
    echo "   ✗ claude CLI not found"
    echo "   Install Claude Code first"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# Check MCP servers configured
echo "6. Checking Claude MCP configuration..."
if command -v claude &> /dev/null; then
    if claude mcp list 2>/dev/null | grep -q "quint"; then
        echo "   ✓ Quint MCP server(s) configured:"
        claude mcp list | grep quint | sed 's/^/     /'
    else
        echo "   ✗ No Quint MCP servers configured"
        echo "   Run: ./03-configure-claude.sh"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo "   - Skipped (Claude CLI not available)"
fi
echo ""

# Check PATH
echo "7. Checking PATH configuration..."
if echo "$PATH" | grep -q "$HOME/go/bin"; then
    echo "   ✓ ~/go/bin is in PATH"
else
    echo "   ⚠ ~/go/bin not in PATH"
    echo "   Add this to your shell profile:"
    echo "   export PATH=\"\$HOME/go/bin:\$PATH\""
fi
echo ""

# Summary
echo "=================================================="
if [ $ISSUES -eq 0 ]; then
    echo "✅ All checks passed!"
    echo "=================================================="
    echo ""
    echo "Your setup is complete. Test it with:"
    echo "  claude \"What MCP tools do you have available?\""
    echo ""
    exit 0
else
    echo "⚠️  Found $ISSUES issue(s)"
    echo "=================================================="
    echo ""
    echo "Fix the issues above and run this script again."
    echo ""
    exit 1
fi