<p align="center">
  <img src="artwork.jpg" alt="Robot reading a Quint book" width="600"/>
</p>

# LLM tools for Quint

> **⚠️ DISCLAIMER**: The agents and tools in this repository were developed for internal use at Informal Systems and have not been thoroughly evaluated or tested for general public use. They are provided as-is without any warranties or guarantees. We make no representations about their suitability, reliability, or fitness for any particular purpose. Use at your own risk. We accept no responsibility or liability for any consequences, damages, or issues that may arise from using these tools.

A containerized development environment for using Claude Code with Quint-related agents, commands and MCP servers.

## About

This tooling was initially developed for the experiments reported in our blog post [**"Reliable Software in the LLM Era"**](https://quint-lang.org/posts/llm_era). We invite you to check it out to learn about our vision for LLM-assisted formal specification! Since that initial work, we've been actively using and refining these tools internally at Informal Systems for our own Quint projects.

**We welcome collaborations!** As we continue to refine and expand this toolkit for our internal use, we plan to regularly push updates to this repository. If you're interested in contributing, have suggestions, or want to share your experiences using these tools, please open an issue or reach out.

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
  - Quint CLI (for running, testing, and type-checking specs)
  - Quint Language Server (for IDE-like features)
  - Specialized agents for Quint specification work (analyzer, implementer, verifier, etc.)
  - MCP servers for Quint documentation and LSP integration
  - Pre-configured commands for common Quint workflows
- **Optional:** Foundry toolchain for Solidity development (see [FOUNDRY.md](FOUNDRY.md))

> **📌 Important:** We recommend using the [latest version of Quint](https://github.com/informalsystems/quint/releases/latest), as we are continuously making improvements to the language to make it more LLM-friendly. You can check your Quint version with `quint --version`. If you're using the Docker setup provided in this repository, the latest version is automatically installed for you.

## Prerequisites

- Docker installed on your system
- Your code repository or project directory

## Setup

Build the Docker image:

```bash
make build
```

This builds the Docker image tagged as `claudecode:latest`.

> **Note:** For Solidity development, you can optionally include the Foundry toolchain. See [FOUNDRY.md](FOUNDRY.md) for instructions.

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
