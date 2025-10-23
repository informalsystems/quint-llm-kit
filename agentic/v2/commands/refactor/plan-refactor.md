---
command: /refactor:plan-refactor
description: Generate refactor plan from requirement analysis and spec structure
version: 4.0.0
---

# Refactor Plan Command

## Objective

Transform requirement analysis and spec structure into executable refactor plan with ordered changes, pattern guidance, and validation strategy.

## Input Contract

### Required Parameters
- `requirement_analysis`: Path to requirement-analysis.json
- `spec_structure`: Path to spec-structure.json

### Optional Parameters
- `output`: Path for generated refactor-plan.json (default: `./refactor-plan.json`)

## Output Contract

### Success
```json
{
 "status": "completed",
 "output_path": "./refactor-plan.json",
 "modules_affected": 2,
 "changes_planned": 8,
 "patterns_identified": 1
}
```

Generates `refactor-plan.json` conforming to `schemas/refactor-plan.json`.

### Failure
```json
{
 "status": "failed",
 "error": "Specific error description",
 "phase": "load_inputs | map_requirements | pattern_identification | validation_design | output_generation"
}
```

## Execution Procedure

### Phase 1: Input Loading and Validation

Objective: Load artifacts and verify schema compliance.

Steps:

1. **Load Input Files**
 - Run: Read requirement_analysis from path
 - Run: Read spec_structure from path
 - Action on missing file: Return error "Required file not found: <path>"

2. **Validate Schema Compliance**
 - Check: requirement_analysis conforms to `schemas/requirement-analysis.json`
 - Check: spec_structure conforms to `schemas/spec-structure.json`
 - If validation fails: Return error with specific schema violations
 - If validation passes: Proceed to Phase 2

3. **Extract Planning Metadata**
 - From requirement_analysis:
 - Extract: Objective statement
 - Extract: List of requirements with IDs
 - Extract: Affected modules
 - Extract: Risks
 - From spec_structure:
 - Extract: Module metadata (framework, imports, AST)
 - Extract: Current definitions by category

### Phase 2: Requirement to Change Mapping

Objective: Map each requirement to concrete spec changes.

Steps:

4. **Identify Target Modules**
 - Per requirement in requirement_analysis:
 - Extract: `affected_modules` field
 - Check: Modules exist in spec_structure
 - If module not found: Return error "Module '<name>' in requirements not found in spec"

5. **Determine Change Operations**
 - Per requirement:
 - Analyze requirement type (add, modify, remove):
 - If requirement mentions "add": Change type = ADD
 - If requirement mentions "modify", "update", "change": Change type = MODIFY
 - If requirement mentions "remove", "delete": Change type = REMOVE
 - Identify target AST element:
 - Check requirement references type/state/action/pure def
 - Extract: Element name and category
 - If ambiguous: Flag requirement for clarification, use best-effort inference

6. **Map Requirements to AST Changes**
 - Per affected module:
 - Create change list with entries:
 - `item`: AST category (type, state, action, pure_def)
 - `name`: Element name
 - `change`: Operation (add, modify, remove)
 - `details`: Specific implementation guidance
 - `line_ref`: Line number if modifying existing (null if adding)
 - Include rationale from requirement analysis
 - Order changes by dependency (types → state → pure defs → actions)

### Phase 3: Pattern Identification

Objective: Identify applicable Quint patterns from knowledge base.

Steps:

7. **Query Knowledge Base for Patterns**
 - Review requirement_analysis.knowledge_references (if present)
 - Per requirement with coding implications:
 - If involves new actions: Query `quint_get_pattern("thin-actions")`
 - If involves state updates: Query `quint_get_pattern("state-updates")`
 - If involves choreo framework: Query `quint_get_doc("choreo-patterns")`
 - Extract: Pattern IDs and descriptions

8. **Map Patterns to Modules**
 - Per identified pattern:
 - Determine applicability:
 - Check: Which modules have changes matching pattern scope
 - Check: Framework compatibility (some patterns choreo-only)
 - Create pattern mapping:
 - `pattern_id`: Pattern identifier
 - `reason`: Why pattern applies
 - `modules`: List of affected module names
 - If no patterns apply: Set `patterns_to_apply = []`

### Phase 4: Validation Strategy Design

Objective: Create validation command sequence.

Steps:

9. **Design Validation Commands**
 - Base commands (always include):
 - Parse: `quint parse <spec_path>`
 - Typecheck: `quint typecheck <spec_path>`

10. **Add Framework-Specific Validation**
 - For standard framework:
 - Include: `quint test <spec_path>` if existing tests found
 - For choreo framework:
 - Include: `quint test <spec_path> --main=<module>` with correct module

11. **Add Property-Preservation Checks**
 - If spec has existing invariants:
 - Per invariant:
 - Add: `quint run <spec_path> --invariant=<name> --max-steps=100`
 - Set: `expected_outcome = "Invariant satisfied"`
 - If changes modify critical actions:
 - Add stress tests with higher step counts (200-500)

### Phase 5: Risk Assessment and Output

Objective: Consolidate risks and generate plan.

Steps:

12. **Aggregate Risks**
 - Transfer all risks from requirement_analysis
 - Add implementation-specific risks:
 - If removing definitions: Risk = "May break dependent modules"
 - If modifying state: Risk = "May invalidate existing invariants"
 - If changing action signatures: Risk = "Breaking change for callers"

13. **Construct Plan JSON**
 - Build structure:
 - `objective`: From requirement analysis
 - `modules`: Array of module change lists (from Phase 2)
 - `patterns_to_apply`: From Phase 3
 - `validation_plan`: From Phase 4
 - `risks`: From step 12
 - `approval`: `{ "approved": false }` (to be updated by analyzer)

14. **Validate Output Schema**
 - Check: Output conforms to `schemas/refactor-plan.json`
 - If validation fails: Correct structure, retry
 - If still fails: Return error with schema violations

15. **Write Output File**
 - Run: Write JSON to output path
 - Check: File written successfully
 - Return: Success response with statistics

## Knowledge Base Queries

Use MCP `quint-kb` tools when needed:

**Available Queries**:
- `quint_get_pattern(pattern_id)` - Fetch specific pattern details
- `quint_get_doc(topic)` - Get framework documentation
- `quint_hybrid_search(query)` - Search for relevant examples
- `quint_get_example(example_id)` - Retrieve code examples

**Query Triggers**:
- New action in plan → Query thin-actions pattern
- State modification → Query state-updates pattern
- Choreo framework → Query choreo-patterns doc
- Byzantine consensus → Search "Byzantine quorum"
- Timeout mechanism → Search "timeout handling"

## Error Handling

### Missing Required Input
- **Condition**: `requirement_analysis` or `spec_structure` file not found
- **Action**: Return error "Required file not found: <path>"
- **Recovery**: User must run analyzer to generate missing artifacts

### Schema Validation Failure
- **Condition**: Input files do not conform to expected schemas
- **Action**: Return error with specific schema violations
- **Recovery**: Regenerate artifacts using correct schema

### Module Not Found
- **Condition**: Requirement references module not in spec_structure
- **Action**: Return error "Module '<name>' in requirements not found in spec"
- **Recovery**: Update requirement analysis or spec structure to align

### Ambiguous Requirement
- **Condition**: Cannot determine change type or target element from requirement
- **Action**: Flag requirement, continue with best-effort plan, mark change with note
- **Recovery**: Manual clarification needed, or proceed with flagged items for review

### Knowledge Base Unavailable
- **Condition**: MCP quint-kb tools not accessible when querying patterns
- **Action**: Continue without pattern guidance, set `patterns_to_apply = []`
- **Recovery**: Plan remains valid, patterns can be applied manually if needed

## Example Execution

**Input**:
```
/refactor:plan-refactor \
 --requirement_analysis=.artifacts/requirement-analysis.json \
 --spec_structure=.artifacts/spec-structure.json
```

**Requirement Analysis Content** (excerpt):
```json
{
 "objective": "Add timeout mechanism to enable round progression",
 "requirements": [
 {
 "id": "req-1",
 "type": "add",
 "description": "Add TimeoutEvent type for propose/prevote/precommit timeouts"
 },
 {
 "id": "req-2",
 "type": "add",
 "description": "Add timeouts state variable to track pending timeouts"
 }
 ],
 "affected_modules": ["Consensus"],
 "risks": [{"description": "Timeout handling may not preserve agreement"}]
}
```

**Process**:
1. Load both JSON files, validate schemas
2. Extract objective: "Add timeout mechanism..."
3. Extract requirements: 2 requirements, both type ADD
4. Map to changes:
 - req-1 → Add type "TimeoutEvent"
 - req-2 → Add state var "timeouts"
5. Query KB for timeout patterns
6. Design validation: parse, typecheck, invariant checks
7. Aggregate risks from requirement analysis
8. Write refactor-plan.json

**Output** (refactor-plan.json):
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
 "details": "Union type for ProposeTimeout | PrevoteTimeout | PrecommitTimeout",
 "line_ref": null,
 "rationale": "Required to distinguish timeout types in protocol"
 },
 {
 "item": "state",
 "name": "timeouts",
 "change": "add",
 "details": "Map from node ID to set of pending timeouts",
 "line_ref": null,
 "rationale": "Track which nodes have triggered which timeouts"
 },
 {
 "item": "action",
 "name": "handleTimeout",
 "change": "add",
 "details": "Process timeout event and advance round if applicable",
 "line_ref": null,
 "rationale": "New action to handle timeout logic"
 },
 {
 "item": "action",
 "name": "step",
 "change": "modify",
 "details": "Include handleTimeout in step action choices",
 "line_ref": 45,
 "rationale": "Integrate timeout handling into state machine"
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
 },
 {
 "command": "quint run specs/consensus.qnt --invariant=validity --max-steps=100",
 "purpose": "Verify timeouts preserve validity",
 "expected_outcome": "Invariant satisfied"
 }
 ],
 "risks": [
 {
 "description": "Timeout handling may not preserve agreement in all scenarios",
 "mitigation": "Extensive testing with parameterized configurations"
 },
 {
 "description": "State modification adds complexity to step action",
 "mitigation": "Use thin-actions pattern to isolate timeout logic"
 }
 ],
 "approval": {
 "approved": false
 }
}
```

## Quality Standards

**Checklist**:
- [ ] Every change has clear rationale
- [ ] Line references provided for all modifications to existing elements
- [ ] Changes ordered by dependency (types → state → pure defs → actions)
- [ ] At least one validation command per module
- [ ] All risks documented with mitigation
- [ ] Patterns matched to specific modules with reason
- [ ] Output conforms to schema

