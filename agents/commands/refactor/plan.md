# Refactor Plan Command

**Purpose**: Generate detailed refactor plan from requirement analysis and spec structure.

**Version**: 2.0.0

## Arguments

```
/refactor/plan \
  --requirement_analysis=<path> \
  --spec_structure=<path>
```

- `requirement_analysis`: Path to requirement-analysis.json
- `spec_structure`: Path to spec-structure.json

## Output

Generates `refactor-plan.json` conforming to `schemas/refactor-plan.json`

## Process

### 1. Load Inputs
- Read and validate both JSON files against schemas
- Extract objective from requirement analysis
- Extract affected modules from both sources

### 2. Map Requirements to Changes
For each affected module:
- Identify which AST elements need modification
- Determine change type: add, modify, remove
- Cross-reference with requirement concepts
- Add detailed rationale for each change

### 3. Pattern Identification
- Review requirement analysis for knowledge references
- Query Quint KB for applicable patterns:
  - State type patterns
  - Action patterns (thin actions, updates)
  - Naming conventions
  - Framework-specific patterns (choreo cues, listeners)
- Map patterns to specific modules

### 4. Validation Strategy
Design validation commands based on:
- Framework type (standard vs choreo)
- Change scope (types, actions, invariants)
- Risk areas from requirement analysis

Typical validation sequence:
1. `quint parse` - syntax check
2. `quint typecheck` - type safety
3. `quint test` - existing tests (if any)
4. `quint run --invariant=<existing>` - property preservation

### 5. Risk Assessment
Transfer risks from requirement analysis:
- Add implementation-specific risks
- Note breaking changes
- Flag areas needing extra validation

### 6. Output Generation
Write JSON with:
- Clear objective statement
- Per-module change list with line references
- Pattern application guidance
- Ordered validation plan
- Consolidated risk list

## Knowledge Base Queries

Use MCP `quint-kb` tools when needed:
- `quint_get_pattern`: Fetch pattern details
- `quint_get_doc`: Get framework documentation
- `quint_hybrid_search`: Find relevant examples

## Error Handling

**Missing required input:**
- Fail immediately with clear error
- Specify which file is missing

**Ambiguous requirement:**
- Flag specific unclear items
- Continue with best-effort plan
- Mark questionable changes with notes


## Example

Input:
- requirement_analysis.json: "Add timeout mechanism"
- spec_structure.json: Consensus module with standard framework

Output excerpt:
```json
{
  "objective": "Add timeout mechanism to enable round progression when consensus stalls",
  "modules": [
    {
      "name": "Consensus",
      "changes": [
        {
          "item": "type",
          "name": "TimeoutEvent",
          "change": "add",
          "details": "Union type for ProposeTimeout | PrevoteTimeout | PrecommitTimeout"
        },
        {
          "item": "state",
          "name": "timeouts",
          "change": "add",
          "details": "Map from node ID to set of pending timeouts",
          "line_ref": null
        },
        {
          "item": "action",
          "name": "handleTimeout",
          "change": "add",
          "details": "Process timeout event and advance round if applicable"
        },
        {
          "item": "action",
          "name": "step",
          "change": "modify",
          "details": "Include handleTimeout in step action choices",
          "line_ref": 45
        }
      ],
      "notes": "Ensure timeout handling preserves agreement invariant"
    }
  ],
  "patterns_to_apply": [
    {
      "pattern_id": "thin-actions",
      "reason": "handleTimeout should delegate to pure function for timeout logic",
      "modules": ["Consensus"]
    }
  ],
  "validation_plan": [
    {
      "command": "quint parse specs/consensus.qnt",
      "purpose": "Verify syntax correctness"
    },
    {
      "command": "quint typecheck specs/consensus.qnt",
      "purpose": "Ensure timeout types integrate correctly"
    },
    {
      "command": "quint run specs/consensus.qnt --invariant=agreement --max-steps=100",
      "purpose": "Verify timeouts don't break agreement",
      "expected_outcome": "Invariant satisfied"
    }
  ],
  "risks": [
    {
      "description": "Timeout handling may not hold in all scenarios",
      "severity": "medium"
    }
  ]
}
```

## Quality Standards

- Every change must have clear rationale
- Line references when modifying existing elements
- At least one validation command per module
- Risks include mitigation when known
