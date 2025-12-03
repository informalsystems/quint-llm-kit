{
  description = "Quint LSP-MCP Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };

        # Custom package for mcp-language-server
        mcp-language-server = pkgs.buildGoModule rec {
          pname = "mcp-language-server";
          version = "latest";

          src = pkgs.fetchFromGitHub {
            owner = "isaacphi";
            repo = "mcp-language-server";
            rev = "main";
            sha256 = "sha256-INyzT/8UyJfg1PW5+PqZkIy/MZrDYykql0rD2Sl97Gg=";
          };

          vendorHash = "sha256-WcYKtM8r9xALx68VvgRabMPq8XnubhTj6NAdtmaPa+g=";

          # Only build the main package, not test directories
          subPackages = [ "." ];

          meta = with pkgs.lib; {
            description = "MCP bridge for Language Server Protocol servers";
            homepage = "https://github.com/isaacphi/mcp-language-server";
            license = licenses.mit;
            maintainers = [];
          };
        };

        # Install quint-language-server from npm
        quint-language-server = pkgs.writeShellScriptBin "quint-language-server" ''
          exec ${pkgs.nodejs}/bin/npx @informalsystems/quint-language-server "$@"
        '';

        # Build kb MCP server properly with native dependencies
        quint-kb-mcp = pkgs.buildNpmPackage rec {
          pname = "quint-kb-mcp-a";
          version = "0.1.0";

          src = ./kb;

          npmDepsHash = "sha256-073QrQgBGv6oIOHXF6nJ6x0BQX4M9r4VoXmge/Eilgc=";

          nativeBuildInputs = with pkgs; [
            python3
            pkg-config
            vips
          ];

          buildInputs = with pkgs; [
            vips
          ];

          buildPhase = ''
            # Just install dependencies, skip build and setup for now
            echo "Dependencies installed, will build and setup at runtime"
          '';

          installPhase = ''
            mkdir -p $out/lib/quint-kb-mcp $out/bin

            # Copy all source files and dependencies
            cp -r src $out/lib/quint-kb-mcp/
            cp -r scripts $out/lib/quint-kb-mcp/
            cp -r kb $out/lib/quint-kb-mcp/
            cp -r node_modules $out/lib/quint-kb-mcp/
            cp package.json tsconfig.json $out/lib/quint-kb-mcp/

            # Create executable that builds and runs
            cat > $out/bin/quint-kb-mcp <<EOF
            #!/usr/bin/env bash
            set -e

            WORK_DIR="\$HOME/.cache/quint-kb-mcp-nix"
            SOURCE_DIR="$out/lib/quint-kb-mcp"

            # Create working directory if it doesn't exist
            mkdir -p "\$WORK_DIR"

            # Check if we need to copy source (if source is newer or work dir doesn't exist)
            if [ ! -f "\$WORK_DIR/package.json" ] || [ "\$SOURCE_DIR" -nt "\$WORK_DIR/package.json" ]; then
              echo "Copying source to writable location..." >&2
              if [ -d "\$WORK_DIR" ]; then
                chmod -R +w "\$WORK_DIR" 2>/dev/null || true
                rm -rf "\$WORK_DIR"
              fi
              cp -r "\$SOURCE_DIR" "\$WORK_DIR"
              chmod -R +w "\$WORK_DIR"
            fi

            cd "\$WORK_DIR"

            # Try to build, but fallback to dev mode if compilation fails
            if [ ! -f dist/server.js ] || [ src/server.ts -nt dist/server.js ]; then
              echo "Building Quint KB MCP server..." >&2
              if ! ${pkgs.nodejs}/bin/npm run build; then
                echo "Build failed, will use development mode with tsx" >&2
                USE_DEV_MODE=1
              fi
            fi

            # Check if we need to setup indices
            if [ ! -f data/builtins.json ]; then
              echo "Setting up indices..." >&2
              ${pkgs.nodejs}/bin/npm run setup
            fi

            # Run server in appropriate mode
            if [ "\$USE_DEV_MODE" = "1" ] || [ ! -f dist/server.js ]; then
              echo "Running in development mode..." >&2
              exec ${pkgs.nodejs}/bin/npx tsx src/server.ts "\$@"
            else
              exec ${pkgs.nodejs}/bin/node dist/server.js "\$@"
            fi
            EOF
            chmod +x $out/bin/quint-kb-mcp
          '';

          meta = with pkgs.lib; {
            description = "MCP server providing Quint documentation, examples, and knowledge base";
            license = licenses.mit;
            maintainers = [];
          };
        };

        # Setup script to configure Claude Code
        setup-claude = pkgs.writeShellScriptBin "setup-claude" ''
          set -e

          echo "=================================================="
          echo "Configuring Claude Code for Quint LSP"
          echo "=================================================="
          echo

          # Check if claude CLI is available
          if ! command -v claude &> /dev/null; then
              echo "❌ claude CLI not found"
              echo "   Please install Claude Code first"
              exit 1
          fi

          echo "✓ claude CLI found: $(which claude)"
          echo

          # Get workspace path from user
          echo "📁 Where are your Quint files?"
          echo
          echo "Enter the absolute path to your Quint directory"
          echo "(e.g., /home/user/my-project/specs)"
          echo
          read -p "Workspace path: " WORKSPACE_PATH

          # Expand ~ to home directory if present
          WORKSPACE_PATH="''${WORKSPACE_PATH/#\~/$HOME}"

          # Verify the path exists
          if [ ! -d "$WORKSPACE_PATH" ]; then
              echo
              echo "❌ Directory does not exist: $WORKSPACE_PATH"
              echo
              read -p "Create it? (y/n) " -n 1 -r
              echo
              if [[ $REPLY =~ ^[Yy]$ ]]; then
                  mkdir -p "$WORKSPACE_PATH"
                  echo "✓ Directory created"
              else
                  echo "Exiting. Please create the directory first."
                  exit 1
              fi
          fi

          # Convert to absolute path
          WORKSPACE_PATH="$(cd "$WORKSPACE_PATH" && pwd)"

          echo
          echo "Using workspace: $WORKSPACE_PATH"
          echo

          # Ask for server name
          echo "What should we name this MCP server?"
          echo "(default: quint-lsp)"
          read -p "Name: " SERVER_NAME
          SERVER_NAME="''${SERVER_NAME:-quint-lsp}"

          echo
          echo "=================================================="
          echo "Adding MCP server to Claude Code..."
          echo "=================================================="
          echo

          # Check if server already exists
          if claude mcp list 2>/dev/null | grep -q "^$SERVER_NAME"; then
              echo "⚠️  Server '$SERVER_NAME' already exists"
              echo
              read -p "Remove and re-add? (y/n) " -n 1 -r
              echo
              if [[ $REPLY =~ ^[Yy]$ ]]; then
                  echo "Removing existing server..."
                  claude mcp remove "$SERVER_NAME" || true
              else
                  echo "Exiting. Use a different name or remove the existing server."
                  exit 1
              fi
          fi

          # Add the MCP server
          echo "Adding server '$SERVER_NAME'..."
          # Add the LSP MCP server
          echo "Adding LSP server '$SERVER_NAME'..."
          claude mcp add-json "$SERVER_NAME" "{
            \"command\": \"mcp-language-server\",
            \"args\": [
              \"--workspace\", \"$WORKSPACE_PATH\",
              \"--lsp\", \"quint-language-server\",
              \"--\", \"--stdio\"
            ]
          }"

          # Add the KB MCP server
          KB_SERVER_NAME="''${SERVER_NAME}-kb"
          echo "Adding KB server '$KB_SERVER_NAME'..."
          claude mcp add-json "$KB_SERVER_NAME" "{
            \"command\": \"quint-kb-mcp\"
          }"

          echo
          echo "✓ MCP servers added"
          echo

          # Verify they were added
          echo "Verifying configuration..."
          if claude mcp list | grep -q "^$SERVER_NAME"; then
              echo "✓ LSP server '$SERVER_NAME' is configured"
          else
              echo "❌ LSP server not found in configuration"
              echo "   Try running: claude mcp list"
              exit 1
          fi

          if claude mcp list | grep -q "^$KB_SERVER_NAME"; then
              echo "✓ KB server '$KB_SERVER_NAME' is configured"
          else
              echo "❌ KB server not found in configuration"
              echo "   Try running: claude mcp list"
              exit 1
          fi

          echo
          echo "=================================================="
          echo "✅ Configuration complete!"
          echo "=================================================="
          echo
          echo "LSP server name: $SERVER_NAME"
          echo "KB server name:  $KB_SERVER_NAME"
          echo "Workspace:       $WORKSPACE_PATH"
          echo
          echo "Test it with:"
          echo "  claude \"What MCP tools do you have available?\""
          echo
          echo "You should see LSP tools like:"
          echo "  - definition, references, diagnostics, hover, rename"
          echo "And KB tools like:"
          echo "  - quint_hybrid_search, quint_get_doc, quint_get_example"
          echo
        '';
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            go
            nodejs
            claude-code
            mcp-language-server
            quint-language-server
            quint-kb-mcp
            setup-claude
          ];

          shellHook = ''
            echo "=================================================="
            echo "Quint LSP-MCP Development Environment"
            echo "=================================================="
            echo
            echo "Available tools:"
            echo "  • go                    - Go compiler and tools"
            echo "  • nodejs                - Node.js runtime and package manager"
            echo "  • claude                - Claude Code CLI"
            echo "  • mcp-language-server   - MCP bridge for LSP servers"
            echo "  • quint-language-server - Quint language server"
            echo "  • quint-kb-mcp          - Quint knowledge base MCP server"
            echo "  • setup-claude          - Configure Claude Code integration"
            echo
            echo "Quick start:"
            echo "  1. Run 'setup-claude' to configure Claude Code"
            echo "  2. Test with: claude \"What MCP tools do you have available?\""
            echo
            echo "=================================================="
          '';
        };

        packages = {
          inherit mcp-language-server quint-language-server quint-kb-mcp setup-claude;
          default = pkgs.symlinkJoin {
            name = "quint-lsp-mcp";
            paths = [ mcp-language-server quint-language-server quint-kb-mcp setup-claude ];
          };
        };

        apps = {
          setup-claude = flake-utils.lib.mkApp {
            drv = setup-claude;
          };
        };
      });
}
