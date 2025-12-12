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

# Install Claude Code
RUN npm install -g @anthropic-ai/claude-code

# Install Go
RUN curl -OL https://go.dev/dl/go1.24.1.linux-amd64.tar.gz && \
	tar -C /usr/local -xzf go1.24.1.linux-amd64.tar.gz && \
	rm go1.24.1.linux-amd64.tar.gz

# Create a non-root user for security
RUN useradd -m -s /bin/bash dev && \
	chown -R dev:dev /workspace

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
# Default command
CMD ["/bin/bash"]
