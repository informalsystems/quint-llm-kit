# Changes

## UX Overhaul — Command Naming and Structure

### Renamed command namespaces

The `mine:` and `play:` namespaces have been renamed to `spec:` and `verify:` respectively.

The original names were opaque — a new user had no way to know that `mine:` meant "generate a spec from documentation" or that `play:` meant "run validation checks." The new names are self-describing: `spec:` is for building your specification, `verify:` is for checking it. Every command, every directory, and every reference across the repository has been updated.

### Flattened the verify namespace

The `verify:open:*` and `verify:closed:*` sub-namespaces have been removed. All verify commands are now flat under `verify:`.

The `open`/`closed` distinction was borrowed from formal methods terminology and meant nothing to a user without background in the field. Commands like `/verify:open:generate-witness` were unnecessarily long and required consulting documentation just to know which sub-namespace to use. The command names themselves — `generate-witness`, `explain-trace`, `check-types` — are already descriptive enough to stand alone.

### Introduced consistent `:start` entry points

Every namespace now has a `/namespace:start` command as its primary entry point:

- `/spec:start` — generate a Quint model from your documentation
- `/verify:start` — begin checking your model (runs `generate-witness`)
- `/code:start` — begin implementing from your spec (runs `plan-migration`)
- `/refactor:start` — begin updating your spec (runs `orchestrate`)

Previously, users following the workflow had to know internal command names like `plan-migration` and `orchestrate` just to take the next step. The `:start` pattern gives every phase a single, memorable entry point and makes the progression from spec → verify → code → refactor feel like a coherent workflow rather than a collection of unrelated tools.

---

## Onboarding and Documentation

### Added GET_STARTED.md

A dedicated getting started guide has been added and linked from the README. It explains what Quint is in plain terms, walks through the full four-phase workflow with ASCII diagrams, covers both the Choreo and plain Quint paths, and includes a quick reference and a typical first session. The guide is written to be useful without any prior knowledge of formal verification or specification languages.

### Clarified that the toolkit works for new and existing projects

All user-facing documentation and the `/code:plan-migration` command previously implied the toolkit was only useful for migrating an existing codebase to match a new spec. The README, GET_STARTED.md, and the code commands have been updated to make clear that the toolkit supports three distinct workflows:

- **Greenfield** — writing a spec and implementation for a brand new project
- **Migration** — updating an existing codebase to match a new or revised spec
- **Docs-first** — generating both a spec and an implementation from documentation alone

The `plan-migration` command itself has been updated: `original_spec` and `codebase_root` are now optional parameters, and a new Phase 0 detects which mode applies before any planning begins.

### Improved README first impressions

The legal disclaimer has been moved from immediately below the project description to after the About section. First-time visitors now read what the tool is and why it was built before encountering the disclaimer.

### Added Docker prerequisite to GET_STARTED.md

A prerequisite note with a link to Docker's installation page has been added near the top of GET_STARTED.md. Previously a reader could reach the "Typical first session" section — which opens with `make build && make run` — without any indication that Docker was required.

---

## Permissions and Setup

### Pre-approved MCP tool calls

The container setup scripts (`entrypoint.sh` and `setup-mcp.sh`) now write a `.claude/settings.json` that pre-approves all `quint-kb` and `quint-lsp` MCP tool calls. Previously, users were prompted to approve each tool call individually mid-session, breaking the flow of interactive commands.

### Pre-approved common test commands

The same settings file now pre-approves a broad set of development commands so Claude can run checks without interrupting the user for permission:

- Rust: `cargo check`, `cargo test`, `cargo build`, `cargo clippy`, `cargo run`
- Go: `go test`, `go build`, `go vet`
- TypeScript/Node: `tsc`, `npm test/run`, `yarn test/run`, `bun test/run`
- Python: `pytest`, `python -m pytest`
- Make: `make test`, `make check`, `make build`
- Quint: all `quint` subcommands

### Fixed settings.json being silently overwritten

`setup-mcp.sh` previously overwrote `.claude/settings.json` unconditionally on every run. Any user customisations — such as project-specific make targets or additional tool permissions — would be lost silently. The script now backs up the existing file before writing, matching the same pattern already used for `.mcp.json`.

### Fixed quint command permission pattern

The Bash permission pattern for Quint commands was `Bash(quint *)`, which could fail to match commands with multiple arguments depending on how Claude Code evaluates patterns. This has been changed to `Bash(quint*)`, which correctly matches `quint run`, `quint typecheck`, and any other Quint subcommand regardless of the arguments passed.
