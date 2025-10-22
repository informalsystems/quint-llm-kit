# Verify Detect Framework Command

**Purpose**: Identify spec framework and catalog existing verification artifacts.

**Version**: 2.0.0

## Arguments

```
/verify/detect-framework <spec_path>
```

- `spec_path`: Path to Quint spec file

## Output

Returns JSON:
```json
{
  "framework": "standard" | "choreo",
  "existing_tests": [
    {"module": "ModuleName", "tests": [{"name": "testName", "line": 100}]}
  ],
  "existing_invariants": [
    {"module": "ModuleName", "invariants": [{"name": "invName", "line": 50}]}
  ],
  "existing_witnesses": [],
  "listeners": [],
  "actions": [{"name": "actionName", "line": 30}],
  "recommendation": "Design tests using choreo .with_cue().perform() pattern"
}
```

## Process

### 1. Framework Detection
Read spec file and check:
- Imports contain `choreo::` → `framework = "choreo"`
- Uses `Transition`, `choreo::s`, listeners → `framework = "choreo"`
- Otherwise → `framework = "standard"`

### 2. Extract Existing Tests
Use LSP or regex to find:
- `run <name> =` definitions
- Categorize as tests (scenarios)
- Record module and line number

### 3. Extract Invariants
Find definitions that:
- Are boolean expressions
- Named like properties (agreement, validity, safety)
- Used in previous `quint run --invariant=` commands (if git history available)

### 4. Extract Witnesses
Similar to invariants but:
- Typically negated conditions

### 5. Framework-Specific Analysis

**For choreo:**
- List all listeners: `pure def listen_<name>`
- List all cue types
- Identify main transition actions
- Note: Tests use `.then("nodeId".with_cue(listener, data).perform(action))`

**For standard:**
- List all actions
- List state variables
- Note: Tests use `.then(action(params))`

### 6. Generate Recommendation
Based on framework, provide guidance for test design:
- Which patterns to use
- Example test structure
- KB documents to reference

## Tools Used

- `Read`: Read spec file
- `Grep`: Find definitions
- MCP `quint-lsp__textDocument/documentSymbol`: Extract symbols
- MCP `quint-kb__quint_get_doc`: Get framework docs if needed

## Error Handling

**File not found:**
```json
{
  "error": "Spec file not found",
  "framework": null
}
```

**Ambiguous framework:**
```json
{
  "framework": "standard",
  "warnings": ["Found choreo imports but no choreo patterns - assuming standard"],
  "existing_tests": []
}
```

## Example

Input:
```
/verify/detect-framework specs/consensus.qnt
```

Output for choreo spec:
```json
{
  "framework": "choreo",
  "existing_tests": [
    {
      "module": "consensus_tests",
      "tests": [
        {"name": "happyPathTest", "line": 120}
      ]
    }
  ],
  "existing_invariants": [
    {
      "module": "consensus",
      "invariants": [
        {"name": "agreement", "line": 45},
        {"name": "validity", "line": 50}
      ]
    }
  ],
  "existing_witnesses": [],
  "listeners": [
    {"name": "listen_proposal", "line": 60},
    {"name": "listen_prevote", "line": 75},
    {"name": "listen_timeout", "line": 90}
  ],
  "actions": [
    {"name": "broadcast_prevote", "line": 100},
    {"name": "decide", "line": 110}
  ],
  "recommendation": "Design tests using choreo pattern: .then(\"nodeId\".with_cue(listener, data).perform(action)). Reference existing test happyPathTest as template."
}
```

Output for standard spec:
```json
{
  "framework": "standard",
  "existing_tests": [],
  "existing_invariants": [
    {
      "module": "token",
      "invariants": [
        {"name": "totalSupplyConstant", "line": 30}
      ]
    }
  ],
  "existing_witnesses": [],
  "listeners": [],
  "actions": [
    {"name": "transfer", "line": 20},
    {"name": "mint", "line": 25}
  ],
  "recommendation": "Design tests using standard pattern: .then(action(params))"
}
```

## Quality Standards

- Accurately detect framework (critical for test design)
- List ALL existing tests, invariants, actions
- Provide actionable recommendation
- Flag ambiguous cases
