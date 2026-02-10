# Use official Go image as base
FROM debian:trixie-slim

RUN mkdir /workspace

# Install dependencies
RUN apt-get update && apt-get install -y \
	curl \
	git \
	build-essential \
	ca-certificates \
	tree \
	jq \
	python3 \
	python3-pip \
	python3-venv \
	openssl \
	protobuf-compiler \
	&& rm -rf /var/lib/apt/lists/*

# Install Node.js (required for Claude Code)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
	&& apt-get install -y nodejs \
	&& rm -rf /var/lib/apt/lists/*

# Install Claude Code, Quint CLI, and Quint Language Server (as root before switching users)
# NOTE: Packages are installed separately rather than in a single command to avoid dependency
# resolution issues. Installing them together (npm install -g pkg1 pkg2 pkg3) can result in
# missing transitive dependencies like 'lodash' from @informalsystems/quint. The separate
# installation ensures each package gets its full dependency tree properly resolved.
RUN npm install -g @anthropic-ai/claude-code && \
	npm install -g @informalsystems/quint && \
	npm install -g @informalsystems/quint-language-server


ARG GO_VERSION=1.24.1

RUN set -eux; \
  arch="$(dpkg --print-architecture)"; \
  case "$arch" in \
    amd64) goarch="amd64" ;; \
    arm64) goarch="arm64" ;; \
    *) echo "unsupported arch: $arch" >&2; exit 1 ;; \
  esac; \
  curl -fsSLO "https://go.dev/dl/go${GO_VERSION}.linux-${goarch}.tar.gz"; \
  tar -C /usr/local -xzf "go${GO_VERSION}.linux-${goarch}.tar.gz"; \
  rm "go${GO_VERSION}.linux-${goarch}.tar.gz"
# Install Go
# Set Go environment temporarily for building mcp-language-server
ENV PATH=/usr/local/go/bin:$PATH
ENV GOPATH=/tmp/go

# Install mcp-language-server (MCP bridge for LSP servers)
RUN mkdir -p /tmp/mcp-build && \
	cd /tmp/mcp-build && \
	git clone https://github.com/isaacphi/mcp-language-server.git && \
	cd mcp-language-server && \
	go build -o /usr/local/bin/mcp-language-server . && \
	cd / && rm -rf /tmp/mcp-build /tmp/go

# Create a non-root user for security
RUN useradd -m -s /bin/bash dev && \
	chown -R dev:dev /workspace

# Create necessary directories for agents and MCP servers
RUN mkdir -p /home/dev/.claude && \
	mkdir -p /home/dev/mcp-servers && \
	mkdir -p /home/dev/mcp-servers/kb/data && \
	chown -R dev:dev /home/dev/.claude /home/dev/mcp-servers

# Copy agentic directory (agents, commands, guidelines, schemas, scripts)
COPY --chown=dev:dev agentic/ /home/dev/.claude/

# Copy MCP servers - split into layers for better caching:
# Layer 1: LSP setup (rarely changes)
COPY --chown=dev:dev mcp-servers/lsp-setup/ /home/dev/mcp-servers/lsp-setup/
COPY --chown=dev:dev mcp-servers/README.md /home/dev/mcp-servers/README.md

# Layer 2: KB server code (changes occasionally)
COPY --chown=dev:dev mcp-servers/kb/package.json mcp-servers/kb/package-lock.json /home/dev/mcp-servers/kb/
COPY --chown=dev:dev mcp-servers/kb/tsconfig.json mcp-servers/kb/jest.config.js /home/dev/mcp-servers/kb/
COPY --chown=dev:dev mcp-servers/kb/src/ /home/dev/mcp-servers/kb/src/
COPY --chown=dev:dev mcp-servers/kb/scripts/ /home/dev/mcp-servers/kb/scripts/
COPY --chown=dev:dev mcp-servers/kb/tests/ /home/dev/mcp-servers/kb/tests/

# Copy setup script (for manual reconfiguration if needed)
COPY --chown=dev:dev setup-mcp.sh /home/dev/setup-mcp.sh
RUN chmod +x /home/dev/setup-mcp.sh

# Copy entrypoint script that sets up MCP servers in .claude.json on first run
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set up working directory
WORKDIR /workspace

# Switch to non-root user
USER dev

# Install Rust for the dev user (after switching to dev user)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# Set environment variables
ENV GOPATH=/home/dev/go
ENV PATH=/usr/local/go/bin:$GOPATH/bin:/home/dev/.cargo/bin:$PATH

# Install dependencies and compile KB server (cached unless code changes)
WORKDIR /home/dev/mcp-servers/kb
RUN npm install && \
	npm run build

# Layer 3: KB content (changes frequently - patterns, docs, examples, templates)
COPY --chown=dev:dev mcp-servers/kb/kb/ /home/dev/mcp-servers/kb/kb/

# Build indices from content (only re-runs when content changes)
RUN npm run setup && \
	chown -R dev:dev /home/dev/mcp-servers/kb/data

# Return to workspace
WORKDIR /workspace

# Set entrypoint to configure MCP on first run
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Default command
CMD ["tail", "-f", "/dev/null"]
