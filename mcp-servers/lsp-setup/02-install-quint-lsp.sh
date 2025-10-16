#!/usr/bin/env bash
#
# Install Quint Language Server
# Provides LSP features for Quint specification language
#

set -e

echo "=================================================="
echo "Installing Quint Language Server"
echo "=================================================="
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    echo ""
    echo "Please install Node.js and npm first:"
    echo "  macOS:   brew install node"
    echo "  Ubuntu:  sudo apt install nodejs npm"
    echo "  Or:      https://nodejs.org/"
    echo ""
    exit 1
fi

echo "✓ npm is installed: $(npm --version)"
echo ""

# Install Quint language server
echo "📦 Installing @informalsystems/quint-language-server..."
npm install -g @informalsystems/quint-language-server

# Verify installation
if command -v quint-language-server &> /dev/null; then
    echo "✓ quint-language-server installed successfully"
    echo "  Location: $(which quint-language-server)"
    
    # Try to get version
    if quint-language-server --version &> /dev/null; then
        echo "  Version: $(quint-language-server --version)"
    fi
else
    echo "❌ quint-language-server not found in PATH"
    echo ""
    echo "Installation may have failed. Check npm output above for errors."
    exit 1
fi

echo ""
echo "=================================================="
echo "✅ Quint Language Server installation complete!"
echo "=================================================="
echo ""
echo "Next step: Run ./03-configure-claude.sh"