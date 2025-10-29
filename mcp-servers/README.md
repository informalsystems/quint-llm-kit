# Quint MCP Toolkit

Resources in this folder wire the Quint specification language into Model Context Protocol (MCP) clients. Two subprojects are included:

- `kb/` – MCP knowledge base server exposing Quint docs, examples, templates, and smart search.
- `lsp-setup/` – Automation scripts that bridge the Quint Language Server into Claude Code via MCP.

Each subproject has its own README with deeper details; highlights are collected here for quick reference.

## Quint KB MCP Server (`kb/`)

Model Context Protocol server providing rich Quint documentation access.

**Current capabilities**
- Hybrid search across docs, examples, guidelines, and builtins (lexical + semantic fusion)
- Browse and fetch docs/examples/builtins/templates/patterns
- Outline docs (section titles + line numbers) before downloading content
- Inspect example metadata (modules, types, keywords, tests) without fetching full files

**Getting started**
```bash
cd mcp-servers/kb
npm install
npm run setup   # builds search indices from the curated Quint snapshot
npm run dev     # or npm start after npm run build
```

Point your MCP client at `dist/server.js`; see `mcp-servers/kb/README.md` and `mcp-servers/kb/HYBRID_SEARCH_OVERVIEW.md` for tool schemas, configuration snippets, and tuning notes.

## Quint LSP ↔ MCP Bridge (`lsp-setup/`)

Shell scripts that install and configure the `mcp-language-server` bridge plus the Quint Language Server so Claude Code gains semantic Quint support.

**What the scripts cover**
1. Install `mcp-language-server` (Go 1.21+ required)
2. Install `@informalsystems/quint-language-server` (Node.js 18+)
3. Configure Claude Code MCP settings and verify the connection

**Quick run**
```bash
cd mcp-servers/lsp-setup
chmod +x *.sh
./setup-all.sh
```

Run `verify-setup.sh` to re-check the environment, or execute the numbered scripts individually for manual control. See `mcp-servers/lsp-setup/README.md` and `quick-reference.md` for troubleshooting and usage examples.
