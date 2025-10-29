# Quint LSP-MCP Setup Scripts

Automated setup for connecting Quint Language Server to Claude Code via MCP.

## What This Does

These scripts install and configure everything needed to give Claude Code semantic understanding of your Quint specifications through LSP (Language Server Protocol).

**After setup, Claude can:**
- Find definitions of symbols
- Find all references to functions/types
- Check for type errors and warnings
- Get hover information (types, documentation)
- Rename symbols across your codebase
- Navigate your code intelligently

## Prerequisites

Before running the scripts, you need:

- **macOS or Linux**
- **Go 1.21+** (will be checked by scripts)
- **Node.js and npm** (will be checked by scripts)
- **Claude Code CLI** 

### Installing Prerequisites

**Go:**
```bash
# macOS
brew install go

# Ubuntu/Debian
sudo apt install golang-go

# Or download from: https://go.dev/dl/
```

**Node.js:**
```bash
# macOS
brew install node

# Ubuntu/Debian
sudo apt install nodejs npm

# Or download from: https://nodejs.org/
```

**Claude Code:**
Follow instructions at: https://docs.claude.com/en/docs/claude-code

## Quick Start (All Steps)

If you want to run everything at once:

```bash
# Make scripts executable
chmod +x *.sh

# Run complete setup
./setup-all.sh
```

This will:
1. Install the LSP-MCP bridge
2. Install Quint language server
3. Configure Claude Code
4. Verify everything works

## Step-by-Step Setup

If you prefer to run steps individually:

### Step 1: Install LSP-MCP Bridge

```bash
chmod +x 01-install-mcp-bridge.sh
./01-install-mcp-bridge.sh
```

**What it does:**
- Checks if Go is installed
- Installs `mcp-language-server` via `go install`
- Verifies installation and PATH configuration

**Expected output:**
```
✓ Go is installed: go version go1.21...
📦 Installing mcp-language-server...
✓ mcp-language-server installed successfully
  Location: /home/user/go/bin/mcp-language-server
✅ LSP-MCP Bridge installation complete!
```

---

### Step 2: Install Quint Language Server

```bash
chmod +x 02-install-quint-lsp.sh
./02-install-quint-lsp.sh
```

**What it does:**
- Checks if npm is installed
- Installs `@informalsystems/quint-language-server` globally
- Verifies installation

**Expected output:**
```
✓ npm is installed: 10.2.4
📦 Installing @informalsystems/quint-language-server...
✓ quint-language-server installed successfully
  Location: /usr/local/bin/quint-language-server
✅ Quint Language Server installation complete!
```

---

### Step 3: Configure Claude Code

```bash
chmod +x 03-configure-claude.sh
./03-configure-claude.sh
```

**What it does:**
- Verifies all prerequisites are installed
- Asks for your Quint workspace path
- Adds MCP server configuration to Claude Code
- Verifies the configuration

**Interactive prompts:**
```
📁 Where are your Quint files?
Workspace path: /home/user/my-project/specs

What should we name this MCP server?
Name: quint-lsp
```

**Expected output:**
```
✓ mcp-language-server found
✓ quint-language-server found
✓ claude CLI found
Adding server 'quint-lsp'...
✓ MCP server added
✅ Configuration complete!
```

---

## Testing Your Setup

After running the scripts, test that everything works:

```bash
# Check available tools
claude "What MCP tools do you have available?"
```

**You should see:**
- `definition`
- `references`
- `diagnostics`
- `hover`
- `rename`
- `edit_file`

**Try a real query:**
```bash
# Check a file for errors
claude "Check my state.qnt file for any type errors"

# Find a definition
claude "Show me the definition of the validateState function"
```

## Multiple Projects

To set up LSP for multiple Quint projects:

```bash
# Run the configure script multiple times with different names
./03-configure-claude.sh
# Name: quint-project-a
# Path: /home/user/project-a/specs

./03-configure-claude.sh
# Name: quint-project-b
# Path: /home/user/project-b/quint
```

Then use them:
```bash
claude "Using quint-project-a, find references to sendPacket"
claude "Using quint-project-b, check ballot.qnt for errors"
```

## Troubleshooting

### "Go is not installed"

**Solution:**
```bash
# macOS
brew install go

# Ubuntu
sudo apt install golang-go

# Verify
go version
```

### "npm is not installed"

**Solution:**
```bash
# macOS
brew install node

# Ubuntu
sudo apt install nodejs npm

# Verify
npm --version
```

### "mcp-language-server not found in PATH"

**Solution:**
Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):
```bash
export PATH="$HOME/go/bin:$PATH"
```

Then reload:
```bash
source ~/.bashrc  # or ~/.zshrc
```

### "claude CLI not found"

**Solution:**
Install Claude Code following: https://docs.claude.com/en/docs/claude-code

### "Directory does not exist"

The script will offer to create it, or you can create it manually:
```bash
mkdir -p /path/to/your/quint/directory
```

### Test Individual Components

```bash
# Test Go bridge
which mcp-language-server
mcp-language-server --help

# Test Quint LSP
which quint-language-server
quint-language-server --version

# Test Claude Code
claude mcp list
```

## Uninstalling

To remove the setup:

```bash
# Remove MCP server from Claude Code
claude mcp remove quint-lsp

# Uninstall Quint LSP
npm uninstall -g @informalsystems/quint-language-server

# Remove Go bridge
rm $(which mcp-language-server)
```

## What Gets Installed Where

- **mcp-language-server**: `~/go/bin/mcp-language-server`
- **quint-language-server**: `/usr/local/bin/quint-language-server` (or npm global bin)

## Architecture

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│  Claude Code    │         │  mcp-language-server │  stdio  │ quint-language- │
│     CLI         │◄───────►│   (MCP Server +      │◄───────►│     server      │
│  (MCP Client)   │   MCP   │    LSP Client)       │   LSP   │                 │
└─────────────────┘         └──────────────────────┘         └─────────────────┘
```

## Further Information

- **Quint**: https://github.com/informalsystems/quint
- **MCP Bridge**: https://github.com/isaacphi/mcp-language-server
- **Claude Code**: https://docs.claude.com/en/docs/claude-code

## License

These setup scripts are provided as-is for convenience. The components they install have their own licenses:
- mcp-language-server: Check repository license
- quint-language-server: Apache 2.0