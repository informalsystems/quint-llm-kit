# Quint LSP-MCP Quick Reference

## Setup Commands

```bash
# Full setup (all steps)
./setup-all.sh

# Or step by step:
./01-install-mcp-bridge.sh
./02-install-quint-lsp.sh
./03-configure-claude.sh

# Verify setup
./verify-setup.sh
```

## Daily Usage

### Check Available Tools
```bash
claude "What MCP tools do you have available?"
```

### Get Diagnostics
```bash
claude "Check state.qnt for errors"
claude "Show me all diagnostics in my workspace"
```

### Find Definitions
```bash
claude "Show me the definition of validateState"
claude "Where is the transfer action defined?"
```

### Find References
```bash
claude "Find all references to the timeout operator"
claude "Where is sendPacket used in my code?"
```

### Get Type Information
```bash
claude "What's the type of myVariable at line 42?"
claude "Show me hover info for the init action"
```

### Rename Symbols
```bash
claude "Rename validateState to checkState across my codebase"
```

## Configuration Management

### List MCP Servers
```bash
claude mcp list
```

### Add New Server
```bash
./03-configure-claude.sh
# Or manually:
claude mcp add-json my-server '{...}'
```

### Remove Server
```bash
claude mcp remove quint-lsp
```

### Update Server Config
```bash
# Remove and re-add
claude mcp remove quint-lsp
./03-configure-claude.sh
```

## Multiple Projects

```bash
# Configure multiple servers
./03-configure-claude.sh  # Name: project-a
./03-configure-claude.sh  # Name: project-b

# Use specific server
claude "Using project-a, check state.qnt for errors"
claude "Using project-b, find references to MyAction"
```

## Troubleshooting

### Run Verification
```bash
./verify-setup.sh
```

### Check Components
```bash
which mcp-language-server
which quint-language-server
which claude
```

### View Config
```bash
cat ~/.codex/config.toml
```

### Debug Mode
```bash
claude --mcp-debug "What tools are available?"
```

### Reinstall
```bash
# Remove and reinstall bridge
rm $(which mcp-language-server)
./01-install-mcp-bridge.sh

# Remove and reinstall Quint LSP
npm uninstall -g @informalsystems/quint-language-server
./02-install-quint-lsp.sh

# Reconfigure
claude mcp remove quint-lsp
./03-configure-claude.sh
```

## Common Workflows

### Check Project Health
```bash
claude "Initialize workspace at $(pwd), check all .qnt files for errors and summarize any issues"
```

### Understand Function
```bash
claude "Show me the definition of myFunction and explain what it does"
```

### Refactor
```bash
claude "Find all references to oldName and suggest how to rename it to newName"
```

### Code Review
```bash
claude "Review state.qnt - check for type errors, find unused variables, and suggest improvements"
```

## File Locations

- **Bridge**: `~/go/bin/mcp-language-server`
- **Quint LSP**: `/usr/local/bin/quint-language-server`
- **Config**: `~/.codex/config.toml`

## Environment Variables

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Ensure Go binaries are in PATH
export PATH="$HOME/go/bin:$PATH"

# Optional: Enable debug logging
export LOG_LEVEL=DEBUG
```

## Tips

- **Use absolute paths** when configuring workspaces
- **One server per project** for best results
- **Explicit server names** when using multiple projects
- **Check diagnostics first** to understand type errors
- **Find definitions** to understand how things work
- **Find references** before renaming or refactoring