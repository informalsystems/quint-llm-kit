# Quint KB MCP Server

Model Context Protocol (MCP) server providing Quint specification language documentation, examples, and knowledge base access.

## Features

**Current Capabilities**
- 🔍 One-call hybrid search across docs, examples, guidelines, and builtins (lexical + semantic)
- 📚 Browse or fetch individual docs, examples, patterns, templates, and builtins
- 🧭 Outline docs before fetching (section titles + line numbers)
- 🧾 Inspect example metadata (modules, types, keywords, tests) without downloading full files

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- git

### Setup

1. **Install dependencies**
```bash
npm install
```

2. **Run setup** (builds all indices from the curated `kb/` snapshot)
```bash
npm run setup
```

3. **Build the server**
```bash
npm run build
```

## Usage

### Starting the Server

**Production:**
```bash
npm start
```

**Development** (with auto-reload):
```bash
npm run dev
```

### MCP Configuration

Add to your MCP settings file (e.g., Claude Desktop config):

```json
{
  "mcpServers": {
    "quint-kb": {
      "command": "node",
      "args": [
        "/absolute/path/to/quint-kb-mcp/dist/server.js"
      ]
    }
  }
}
```


## Key MCP Tools

### Search & Navigation
- `quint_hybrid_search` – Hybrid lexical/semantic search. Supports `scopes` (array of `builtins/docs/examples/guidelines/extra`) and `limitPerScope`. Falls back to the legacy single-scope response when `scopes` is omitted.
- `quint_search_docs` – Legacy substring search with optional `scope` and `contextLines`.
- `quint_doc_outline` *(new)* – Returns section headings (title, level, line) for a doc so clients can fetch only the relevant portion.
- `quint_example_info` *(new)* – Returns metadata for an example (category, modules, types, functions, actions, keywords, tests, size).

### Docs, Examples, Builtins, Patterns
- `quint_get_doc`, `quint_list_docs`
- `quint_get_example`, `quint_list_examples`
- `quint_get_builtin`, `quint_list_builtins`
- `quint_get_pattern`, `quint_list_patterns`, `quint_search_patterns`
- `quint_get_template`, `quint_list_templates`
- `quint_suggest_framework` – Quick heuristic to choose between standard Quint and Choreo.

All tool schemas are returned via `tools/list`; the examples above show the most commonly used ones. See `HYBRID_SEARCH_OVERVIEW.md` for a fuller reference.

## Maintenance

### Update Quint Repository

To pull the latest Quint docs and examples:

```bash
npm run update
```

This will:
1. Pull latest changes from Quint repo
2. Rebuild all indices
3. Verify setup

### Rebuild Indices Only

If you modify the indexing logic:

```bash
npm run setup
```

## Development

### Project Structure

```
quint-kb-mcp-v2/
├── src/
│   ├── server.ts               # MCP entry point (tool registry + handlers)
│   ├── search/                 # Runtime search stack (embeddings, vector store, lexical, fusion)
│   ├── tools/                  # Tool implementations (builtins, docs, examples, patterns, search helpers)
│   └── indexers/               # Builders for JSON/embedding indices consumed by tools
├── scripts/
│   ├── setup.ts                # End-to-end KB index builder (run via `npm run setup`)
│   └── evaluate-search.ts      # Hybrid vs substring evaluation helper
├── data/                       # Generated indices (JSON, embeddings, hnsw, minisearch)
├── kb/                         # Curated Quint snapshot (docs, examples, guidelines, templates)
└── dist/                       # Compiled output (gitignored)
```

### Adding New Tools

1. Create tool implementation in `src/tools/`
2. Add tool definition to `TOOLS` array in `src/server.ts`
3. Add handler in `CallToolRequestSchema` switch statement
4. Update this README

### Testing

Test individual tools by running the dev server and calling them via MCP client.

## Troubleshooting

### "Builtins data not found"

Run setup:
```bash
npm run setup
npm run build
```

### "Git clone failed"

Ensure git is installed and you have network access:
```bash
git --version
```

### "Module not found" errors

Rebuild the project:
```bash
npm run build
```

## License

MIT

## Contributing

This is part of the spec-copilot project. See parent repository for contribution guidelines.

## Roadmap

- [x] Phase 1: Core reference (builtins, search)
- [ ] Phase 2: Choreo framework support
- [ ] Phase 3: Example library with pattern analysis
- [ ] Phase 4: Learning resources and tutorials
- [ ] Phase 5: Pattern validation against CLAUDE.md rules

## Links

- [Quint Language](https://quint-lang.org/)
- [Quint GitHub](https://github.com/informalsystems/quint)
- [Model Context Protocol](https://modelcontextprotocol.io/)
