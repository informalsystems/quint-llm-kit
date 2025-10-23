# Spec Analysis Command

**Purpose**: Extract comprehensive structural and behavioral metadata from Quint specifications.

**Version**: 2.0.0

## Arguments

```
/spec/analyze <spec_paths>
```

- `spec_paths`: Space-separated file paths or directories containing `.qnt` files

## Output

Generates `spec-structure.json` conforming to `schemas/spec-structure.json`

## Process

### 1. File Discovery
- Enumerate all `.qnt` files from provided paths
- Use glob patterns for directories: `**/*.qnt`

### 2. Module Extraction
For each `.qnt` file:
- Identify all module declarations
- Detect framework:
  - `choreo` if imports contain `choreo::`
  - `standard` otherwise
- Extract imports (both relative and builtin)

### 3. AST Parsing
Use MCP LSP tools to extract:
- `mcp__quint-lsp__textDocument/documentSymbol` for structure
- Parse categories:
  - `types`: Type definitions
  - `constants`: Const declarations
  - `state_vars`: Var declarations
  - `pure_defs`: Pure def and val definitions
  - `actions`: Action definitions (defs returning bool or modifying state)
  - `invariants`: Val definitions used as properties
  - `tests`: Run definitions

### 4. Dependency Mapping
- Module-level: Which modules import which
- Inter-module references via LSP `textDocument/references`

### 5. Output Generation
Write JSON matching schema with:
- File paths (absolute or workspace-relative)
- Module metadata per file
- Complete AST with line numbers
- Empty arrays for missing data (not null)

## Tools Used

- `Glob`: Find .qnt files
- `Read`: Read spec contents if needed
- MCP `quint-lsp` tools:
  - `textDocument/documentSymbol`
  - `textDocument/references`
  - `textDocument/definition`

## Error Handling

**File not found:**
- Skip missing files
- Log warning
- Continue with available files

**Parse failure:**
- Include file in output with empty modules array
- Add error note in file metadata

**LSP unavailable:**
- Fall back to basic text parsing
- Extract what's possible via regex
- Flag degraded quality in output

## Example

Input:
```
/spec/analyze specs/consensus.qnt specs/types.qnt
```

Output excerpt:
```json
{
  "files": [
    {
      "path": "specs/consensus.qnt",
      "modules": [
        {
          "name": "Consensus",
          "framework": "standard",
          "imports": ["./types", "quint::set"],
          "dependencies": ["Types"],
          "ast": {
            "types": [{"name": "State", "line": 10}],
            "state_vars": [{"name": "round", "line": 15}],
            "actions": [{"name": "step", "line": 30}],
            "invariants": [{"name": "agreement", "line": 50}],
            "tests": []
          }
        }
      ]
    }
  ]
}
```

## Performance

- Process files in parallel when possible
- Cache LSP results for repeated queries
- Target: <5s for typical spec (500-1000 LOC)
