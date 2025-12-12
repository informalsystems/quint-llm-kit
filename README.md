# Claude Code Docker Environment

A containerized development environment for using Claude Code with multi-language projects. This setup provides an isolated, reproducible environment with Claude Code, Go, Python, Rust, Node.js, and common development tools.

## Overview

This project provides a Docker-based environment that includes:

- Go 1.24.1
- Python 3 with pip and venv
- Rust (latest stable via rustup)
- Node.js 20.x
- Claude Code CLI
- Common development tools (git, curl, jq, tree, etc.)
- Non-root user for security
- **Quint-specific tools:**
  - Specialized agents for Quint specification work (analyzer, implementer, verifier, etc.)
  - MCP servers for Quint documentation and LSP integration
  - Quint Language Server
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

## Usage

### Quick Start

The easiest way to get started:

```bash
# Build the image (includes all agents and MCP servers)
make build

# Run Claude Code (will prompt for your project path)
make run
```

**That's it!** The MCP servers (quint-lsp and quint-kb) are automatically configured on first run. All agents and commands are ready to use immediately.

### Running Claude Code on Your Project

#### Option 1: One-Step Run (Recommended)

```bash
make run
```

This command will:

1. Prompt you for your project directory path
2. Start the container in detached mode
3. Automatically attach you to Claude Code

#### Option 2: Manual Steps

**Step 1: Start the Container**

You can start the container using the `code.sh` script with either method:

**Interactive mode** (prompts for path):

```bash
./code.sh
```

**Direct path argument**:

```bash
./code.sh /path/to/your/project
```

The script will:

- Check if a container is already running
- Mount your project directory to `/workspace` inside the container
- Start the container in detached mode with label `project=claude-code`

**Step 2: Enter the Container**

Use Claude Code directly:

```bash
make exec
```

Or open a bash shell:

```bash
make shell
```

Claude Code will prompt you for your Anthropic API key or login on first run.

**Step 3: Stop the Container**

When you're done:

```bash
make stop
```

### Additional Container Management

**Check container status:**

```bash
make status
```

**View container logs:**

```bash
make logs
```

**Restart the container:**

```bash
make restart
```

**Full cleanup (stop, remove container and image):**

```bash
make clean
```

### Manual Docker Run

If you prefer to run the container manually in detached mode:

```bash
docker run -d \
  -v ~/.config/nvim:/home/developer/.config/nvim:ro \
  -v /usr/local/bin/nvim:/usr/local/bin/nvim \
  -v /path/to/your/code:/workspace \
  --name claude-code-dev \
  --label project=claude-code \
  claudecode:latest \
  tail -f /dev/null
```

Then exec into it:

```bash
docker exec -it claude-code-dev claude
```

Or open a shell:

```bash
docker exec -it claude-code-dev /bin/bash
```

## Makefile Commands

- `make help` - Display all available commands
- `make build` - Build the Docker image
- `make run` - Start container and launch Claude Code (interactive)
- `make exec` - Attach to running container with Claude Code
- `make shell` - Open bash shell in running container
- `make stop` - Stop the container
- `make restart` - Stop and restart the container
- `make status` - Show container status
- `make logs` - Show and follow container logs
- `make clean` - Remove container and image (full cleanup)

## Project Structure

```
.
├── Makefile                 # Build and deployment commands
├── claudecode.dockerfile    # Docker image definition
├── code.sh                  # Convenience script to run Claude Code
├── entrypoint.sh           # Container entrypoint that creates .mcp.json
├── setup-mcp.sh            # Interactive script to reconfigure MCP servers
├── .mcp.json.example       # Example .mcp.json format for MCP configuration
├── agentic/                 # Specialized agents and commands for Quint
│   ├── agents/             # Agent definitions (analyzer, implementer, verifier, etc.)
│   ├── commands/           # Slash commands for common workflows
│   ├── guidelines/         # Best practice guidelines
│   ├── schemas/            # JSON schemas for artifacts
│   ├── scripts/            # Helper scripts
│   └── impl/               # Agent implementations
├── mcp-servers/            # MCP server implementations
│   ├── kb/                # Quint knowledge base MCP server
│   └── lsp-setup/         # Quint LSP integration scripts
├── .gitignore             # Git ignore patterns
└── README.md              # This file
```

## Environment Details

- **Working Directory**: `/workspace`
- **User**: `dev` (non-root)
- **Go Path**: `/home/dev/go`
- **Rust Path**: `/home/dev/.cargo`
- **Python**: System Python 3 with pip and venv
- **Base Image**: `debian:trixie-slim`
- **MCP Config**: `/workspace/.mcp.json` (created automatically in your project directory)
- **Agents Directory**: `/home/dev/.claude/` (contains agents, commands, guidelines, schemas)
- **MCP Servers**: `/home/dev/mcp-servers/` (kb server and lsp-setup scripts)

## Included Agents and Tools

This Docker environment comes pre-configured with specialized agents and tools for Quint specification development:

### Agents (in `/home/dev/.claude/agents/`)

- **analyzer** - Analyzes Quint specifications and requirements to produce planning artifacts
- **implementer** - Implements changes to Quint specifications based on planning artifacts
- **mbt-validator** - Creates Model-Based Testing infrastructure for validating implementations
- **spec-implementer** - Specialized agent for implementing Quint specifications
- **verifier** - Verifies Quint specifications and test results

### Commands (in `/home/dev/.claude/commands/`)

Pre-configured slash commands for common workflows:
- **Code migration commands**: Planning and orchestrating code migrations
- **Refactoring commands**: Plan, prepare, apply, and validate refactorings
- **Testing commands**: Generate witnesses, check types, test listeners

### MCP Servers

This environment includes two MCP servers for comprehensive Quint support:

#### 1. Quint LSP Server (via mcp-language-server bridge)

Provides language server features for Quint specifications:
- **Diagnostics** - Real-time type checking and error detection
- **Go to definition** - Navigate to symbol definitions
- **Find references** - Find all usages of a symbol
- **Hover** - Show type information and documentation
- **Rename** - Safely rename symbols across files

The LSP server uses `mcp-language-server` (pre-installed) as a bridge between the Quint Language Server and Claude Code's MCP interface.

#### 2. Quint KB Server (`/home/dev/mcp-servers/kb/`)

Provides rich access to Quint documentation, examples, and knowledge base:
- **Hybrid search** - Lexical + semantic search across docs, examples, guidelines, and builtins
- **Browse and fetch** - Access docs, examples, patterns, templates
- **Outline docs** - See section titles and line numbers before fetching
- **Inspect metadata** - Check example modules, types, tests without downloading full files

#### MCP Server Configuration

**Automatic Setup (Default)**

MCP servers are automatically configured via `.mcp.json` in your workspace on first container start:
- `quint-lsp` - LSP server with workspace at `/workspace`
- `quint-kb` - Knowledge base server

The `.mcp.json` file is created in your project directory (`/workspace/.mcp.json`) and persists as part of your project files.

**Manual Reconfiguration (Optional)**

If you need to reconfigure MCP servers for a different workspace path:

```bash
# Inside the container
/home/dev/setup-mcp.sh
```

This script will:
1. Prompt for your workspace path
2. Create/update `.mcp.json` with the correct MCP server configuration

**Configuration Format**

MCP servers are configured in `.mcp.json` at your project root:

```json
{
  "mcpServers": {
    "quint-lsp": {
      "command": "mcp-language-server",
      "args": ["--workspace", "/workspace", "--lsp", "quint-language-server", "--", "--stdio"]
    },
    "quint-kb": {
      "command": "node",
      "args": ["/home/dev/mcp-servers/kb/dist/server.js"]
    }
  }
}
```

See `.mcp.json.example` for the complete example configuration.

## Security Notes

- The container runs as a non-root user (`dev`) for security
- Your API key is stored by Claude Code inside the container (not in the image or host)
- The container is labeled with `project=claude-code` for easy identification
- Use `make stop` to properly clean up the container when done

## Troubleshooting

### Container Already Running

If you see `Container 'claude-code-dev' is already running`:

- Use `make exec` to enter the existing container
- Or use `make stop` to stop it first, then run `./code.sh` again

### Permission Issues

If you encounter permission issues with mounted volumes:

- The container runs as user `dev` (UID typically 1000)
- Ensure your project directory has appropriate read/write permissions

### Docker Build Fails

If the build fails:

- Check your internet connection (required for downloading packages)
- Ensure Docker has sufficient disk space
- Try cleaning Docker cache: `docker system prune`

## Customization

### Adding More Tools

To add additional tools to the container, edit `claudecode.dockerfile` and add them to the `apt-get install` command or add new `RUN` commands.

### Changing Language Versions

**Go**: Update the base image in `claudecode.dockerfile`:

```dockerfile
FROM golang:1.26-bookworm  # Change version here
```

**Python**: The Dockerfile uses the system Python 3. To use a specific version, you could install it via pyenv or use a different base image.

**Rust**: Rust is installed via rustup. To update Rust inside the container, run:

```bash
rustup update
```

### Mounting Additional Volumes

```bash
docker run -d \
  -v ${PATH_TO_CODE}:/workspace \
  -v /path/to/other/data:/data \  # Add additional mounts here
  --name claude-code-dev \
  --label project=claude-code \
  claudecode:latest \
  tail -f /dev/null
```

## License

This project configuration is provided as-is for development purposes.
