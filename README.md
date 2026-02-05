# LLM tools for Quint

A containerized development environment for using Claude Code with Quint-related agents, commands and MCP servers.

## Overview

This project provides a Docker-based environment that includes:

- Go 1.24.1
- Python 3 with pip and venv
- Rust (latest stable via rustup)
- Foundry toolchain (optional: forge, cast, anvil, chisel for Solidity development)
- Node.js 20.x
- Claude Code CLI
- Common development tools (git, curl, jq, tree, etc.)
- Non-root user for security
- **Quint-specific tools:**
  - Quint CLI (for running, testing, and type-checking specs)
  - Quint Language Server (for IDE-like features)
  - Specialized agents for Quint specification work (analyzer, implementer, verifier, etc.)
  - MCP servers for Quint documentation and LSP integration
  - Pre-configured commands for common Quint workflows

## Prerequisites

- Docker installed on your system
- Your code repository or project directory

## Setup

Build the Docker image:

```bash
make build
```

This builds the Docker image tagged as `claudecode:latest`.

### Building with Foundry Support

If you're working with Solidity contracts (like the examples in `mcp-servers/kb/kb/examples/solidity/`), you can include Foundry tools:

```bash
# Option 1: Using the convenience target
make build-foundry

# Option 2: Passing build args explicitly
docker build --build-arg INSTALL_FOUNDRY=true -t claudecode:latest -f claudecode.dockerfile .
```

This installs the complete Foundry toolchain: forge, cast, anvil, and chisel.

To verify Foundry installation inside the container:

```bash
make shell
forge --version
cast --version
anvil --version
chisel --version
```

## Usage

### Quick Start

The easiest way to get started:

```bash
# Build the image (includes all agents and MCP servers)
make build

# Option 1: Specify project path directly
make run DIR=~/my-project

# Option 2: Interactive prompt for project path
make run
```

**That's it!** The MCP servers (quint-lsp and quint-kb) are automatically configured on first run. All agents and commands are ready to use immediately.

## Claude commands

When in doubt of what to try next, run
```
/mine:next
```

which will suggest potential next things you can try. This works from the very start (even if your project doesn't have a Quint spec yet).

## Security Notes

- The container runs as a non-root user (`dev`) for security
- Your API key is stored by Claude Code inside the container (not in the image or host)
- The container is labeled with `project=claude-code` for easy identification
- Use `make stop` to properly clean up the container when done
