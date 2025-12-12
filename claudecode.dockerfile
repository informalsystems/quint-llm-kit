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

# Install Claude Code and Quint Language Server (as root before switching users)
RUN npm install -g @anthropic-ai/claude-code @informalsystems/quint-language-server

# Install Go
RUN curl -OL https://go.dev/dl/go1.24.1.linux-amd64.tar.gz && \
	tar -C /usr/local -xzf go1.24.1.linux-amd64.tar.gz && \
	rm go1.24.1.linux-amd64.tar.gz

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
	chown -R dev:dev /home/dev/.claude /home/dev/mcp-servers

# Copy agentic directory (agents, commands, guidelines, schemas, scripts)
COPY --chown=dev:dev agentic/ /home/dev/.claude/

# Copy MCP servers
COPY --chown=dev:dev mcp-servers/ /home/dev/mcp-servers/

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

RUN cargo install taplo-cli

# Install and build KB MCP server (skip setup/embeddings for faster builds)
WORKDIR /home/dev/mcp-servers/kb
RUN npm install && \
	npm run build

# Return to workspace
WORKDIR /workspace

# Set entrypoint to configure MCP on first run
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Default command
CMD ["tail", "-f", "/dev/null"]
