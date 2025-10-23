---
command: /spec:analyze-spec
description: Extract comprehensive structural and behavioral metadata from Quint specs
version: 4.0.0
---

# Spec Analysis Command

## Objective

Extract complete module structure, AST metadata, dependency mappings from Quint spec files.

## Input Contract

### Required Parameters
- `spec_paths`: Space-separated file paths or directories with `.qnt` files

### Optional Parameters
- `output`: Path for spec-structure.json (default: `./spec-structure.json`)

## Output Contract

### Success
```json
{
 "status": "completed",
 "output_path": "./spec-structure.json",
 "files_analyzed": 3,
 "modules_found": 5,
 "framework_types": {"standard": 2, "choreo": 1}
}
```

Generates `spec-structure.json` conforming to `schemas/spec-structure.json`.

### Failure
```json
{
 "status": "failed",
 "error": "Specific error",
 "partial_output": "path or null"
}
```

## Execution Procedure

### Phase 1: File Discovery

**Objective**: Locate all Quint spec files.

**Steps**:

1. **Enumerate Targets**
 - Per path in `spec_paths`:
 - Ends `.qnt`: Add to list
 - Is directory: Glob `**/*.qnt`
 - Deduplicate
 - Empty list: Return "No .qnt files found"

2. **Verify Access**
 - Per file:
 - Check: exists, readable
 - Not readable: Log warning, skip, continue
 - Zero readable: Return "No accessible .qnt files"

### Phase 2: Module Extraction

**Objective**: Identify modules, framework types per file.

**Steps**:

3. **Read Specs**
 - Per accessible file:
 - Read content
 - Extract: module declarations (`module <name>`)
 - Extract: import statements

4. **Detect Framework**
 - Per module:
 - Check imports for `choreo::`:
 - Found: `framework = "choreo"`
 - Not found: `framework = "standard"`
 - Store framework with module metadata

### Phase 3: AST Parsing

**Objective**: Extract detailed structure from module AST.

**Steps**:

5. **Query LSP for Symbols** (if available)
 - Per file:
 - Run: `mcp__quint-lsp__textDocument/documentSymbol` with file URI
 - Parse response for symbol categories
 - Store symbols with line numbers

6. **Categorize Symbols**
 - Parse into:
 - **types**: `type <name>`
 - **constants**: `const <name>`
 - **state_vars**: `var <name>`
 - **pure_defs**: `pure def <name>`, `val <name>`
 - **actions**: Defs modifying state or returning bool
 - **invariants**: Val defs used as properties
 - **tests**: `run <name>`
 - Per symbol: Record name, line number

7. **Fallback Parsing** (if LSP unavailable)
 - Use regex:
 - `type\s+(\w+)` for types
 - `const\s+(\w+)` for constants
 - `var\s+(\w+)` for state vars
 - `def\s+(\w+)` for actions/pure defs
 - `val\s+(\w+)` for invariants
 - `run\s+(\w+)` for tests
 - Flag: `"quality": "degraded"` when LSP unavailable

### Phase 4: Dependency Mapping

**Objective**: Map inter-module and intra-module dependencies.

**Steps**:

8. **Extract Module Deps**
 - Per module:
 - Parse imports:
 - Relative (`import <path>.*`) → Map to module
 - Builtin (`import quint::<module>`) → Record as builtin
 - Store: imported module names

9. **Query References** (if LSP available)
 - Per definition in module:
 - Run: `mcp__quint-lsp__textDocument/references`
 - Record: Which defs reference this
 - Build dependency graph

### Phase 5: Output Generation

**Objective**: Write structured JSON output.

**Steps**:

10. **Construct JSON**
 - Per file:
 - Include: absolute or workspace-relative path
 - Include: all modules with framework type
 - Include: complete AST with categorized symbols
 - Use empty arrays `[]` for missing data (NOT null)

11. **Validate Schema**
 - Check: conforms to `schemas/spec-structure.json`
 - Validation fails: Correct structure, retry
 - Still fails: Return error with violations

12. **Write Output**
 - Write JSON to output path
 - Verify written successfully
 - Return success with statistics

## Tools

- `Glob`: Find .qnt files
- `Read`: Read spec contents
- MCP `quint-lsp`:
 - `textDocument/documentSymbol` - Extract symbols
 - `textDocument/references` - Find references
 - `textDocument/definition` - Resolve definitions

## Error Handling

### No Files Found
- **Condition**: No .qnt files in `spec_paths`
- **Action**: Return "No .qnt files at paths"
- **Recovery**: Provide valid spec paths

### Parse Failure
- **Condition**: Syntax errors prevent parsing
- **Action**: Include file in output with empty modules, add error note
- **Recovery**: Continue with remaining, flag unparseable

### LSP Unavailable
- **Condition**: MCP quint-lsp not accessible
- **Action**: Fall back to regex parsing
- **Recovery**: Extract basic structure, flag quality degraded

### Invalid Output
- **Condition**: JSON non-conformant
- **Action**: Return error with violations
- **Recovery**: Fix generation logic, retry

## Example

**Input**:
```
/spec:analyze-spec specs/consensus.qnt specs/types.qnt
```

**Process**:
1. Enumerate: 2 files
2. Read consensus.qnt: Module "Consensus"
3. Detect: Imports `quint::set` only → standard
4. Extract AST: 1 type, 3 state vars, 5 actions, 2 invariants
5. Read types.qnt: Module "Types"
6. Map deps: Consensus imports Types
7. Write spec-structure.json

**Output**:
```json
{
 "files": [
 {
 "path": "specs/consensus.qnt",
 "modules": [{
 "name": "Consensus",
 "framework": "standard",
 "imports": ["./types", "quint::set"],
 "dependencies": ["Types"],
 "ast": {
 "types": [{"name": "State", "line": 10}],
 "constants": [],
 "state_vars": [
 {"name": "round", "line": 15},
 {"name": "votes", "line": 16},
 {"name": "decisions", "line": 17}
 ],
 "pure_defs": [{"name": "hasQuorum", "line": 20}],
 "actions": [
 {"name": "init", "line": 25},
 {"name": "propose", "line": 30},
 {"name": "vote", "line": 35},
 {"name": "decide", "line": 40},
 {"name": "step", "line": 45}
 ],
 "invariants": [
 {"name": "agreement", "line": 50},
 {"name": "validity", "line": 55}
 ],
 "tests": []
 }
 }]
 },
 {
 "path": "specs/types.qnt",
 "modules": [{
 "name": "Types",
 "framework": "standard",
 "imports": [],
 "dependencies": [],
 "ast": {
 "types": [
 {"name": "NodeId", "line": 5},
 {"name": "Value", "line": 6}
 ],
 "constants": [],
 "state_vars": [],
 "pure_defs": [],
 "actions": [],
 "invariants": [],
 "tests": []
 }
 }]
 }
 ],
 "quality": "full"
}
```

