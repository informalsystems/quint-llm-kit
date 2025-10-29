# Knowledge Base Directory

This directory contains curated Quint documentation and resources used by the MCP server.

## Structure

```
kb/
├── docs/                    # Core Quint documentation (7 files)
│   ├── builtin.md          # Builtin operators reference
│   ├── lang.md             # Language specification
│   ├── quint.md            # CLI documentation
│   ├── repl.md             # REPL guide
│   └── ...
├── choreo/                  # Choreo framework docs (5 files)
│   ├── cue-pattern.mdx     # Cue pattern documentation
│   ├── tutorial.mdx        # Choreo tutorial
│   └── ...
├── posts/                   # Blog posts (4 files)
│   ├── alpenglow.mdx       # Alpenglow consensus
│   ├── soup.mdx            # Message soup pattern
│   └── ...
├── examples/                # Example .qnt files (75 files)
│   ├── cosmos/             # Cosmos SDK examples
│   ├── solidity/           # Solidity verification
│   ├── tutorials/          # Tutorial examples
│   └── ...
└── guidelines/              # Custom patterns & workflows (4 files)
    ├── spec-builder.md     # Specification building patterns
    ├── choreo-run-generation.md  # Choreo testing patterns
    ├── CLAUDE.md           # Testing workflows
    └── cons-specer.md      # Consensus patterns (deprecated)
```

## Version

This is a **fixed snapshot** of Quint documentation. The content is manually curated and version controlled with this repository.

## Updating Content

To update the knowledge base:

1. Replace/add files in the appropriate subdirectory
2. Run `npm run setup` to regenerate indices
3. Commit changes to version control

## Generated Indices

Running `npm run setup` generates the following indices in `data/`:

- `builtins.json` - Categorized builtin operators (77 operators)
- `docs-index.json` - Structured documentation index (7 docs)
- `docs-extra-index.json` - Choreo and blog post index (9 docs)
- `guidelines-index.json` - Patterns and workflows index (11 patterns, 11 guidelines, 4 workflows)
- `examples-index.json` - Quint example specifications index (75 examples, 137 modules)
