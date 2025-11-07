---
command: /refactor:plan
description: Generate refactor plan from requirement analysis and spec structure
version: 4.0.0
---

# Refactor Plan Command

## Objective

Transform requirement analysis and spec structure into executable refactor plan with ordered changes, pattern guidance, and validation strategy.

## File Operation Constraints

**CRITICAL**: Refactor plan MUST be written to `.artifacts/` directory.
- NEVER use `/tmp` or system temp directories
- Default: `.artifacts/refactor-plan.json`

## Input Contract

### Required Parameters
- `requirement_analysis`: Path to requirement-analysis.json
- `spec_paths`: Space-separated paths to Quint spec files

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

Generates `refactor-plan.json` conforming to `.claude/schemas/refactor-plan.json`.

### Failure
```json
{
 "status": "failed",
 "error": "Specific error description",
 "phase": "load_inputs | map_requirements | pattern_identification | validation_design | output_generation"
}
```

## Execution Procedure

### Phase 1: Input Loading and Spec Analysis

Objective: Load requirements and analyze spec files directly.

Steps:

1. **Load Requirement Analysis**
   - Run: Read requirement_analysis from path
   - Action on missing file: Return error "Required file not found: <path>"
   - Validate: Conforms to `.claude/schemas/requirement-analysis.json`
   - If validation fails: Return error with specific schema violations

2. **Read Spec Files**
   - Per path in spec_paths:
     - If ends with .qnt: Read file
     - If directory: Glob for *.qnt files
   - Action on missing: Skip with warning
   - Store: File contents indexed by path

3. **Extract Module Structure**
   - Per spec file:
     - Grep for: `module\s+(\w+)\s*\{` to find modules
     - Grep for: `import.*from` to find imports
     - Detect framework: Check if imports contain `choreo::`
   - Store: Module name, framework type, file path

4. **Extract Current Definitions**
   - Per module in affected_modules from requirement_analysis:
     - Grep for: `type\s+(\w+)` → types with line numbers
     - Grep for: `const\s+(\w+)` → constants with line numbers
     - Grep for: `var\s+(\w+)` → state vars with line numbers
     - Grep for: `pure def\s+(\w+)` → pure defs with line numbers
     - Grep for: `action\s+(\w+)|def\s+(\w+)` → actions with line numbers
   - Store: Definition name, category, line number

5. **Validate Specs are Clean** (LSP diagnostics)
   - Per spec file:
     - Call: `mcp__quint-lsp__diagnostics` with filePath
     - Parse response:
       - Errors: Parse errors, type errors, undefined symbols
       - Warnings: Unused vars, deprecated features
     - Check: No critical errors
     - If critical errors found:
       - Include in warnings output
       - Flag: "Planning from broken baseline"
       - May affect ability to plan changes
   - Store: Baseline diagnostic state
   - Purpose: Know if starting point is valid

6. **Extract Planning Metadata**
   - From requirement_analysis:
     - Extract: Objective statement
     - Extract: List of requirements with IDs
     - Extract: Affected modules
     - Extract: Risks
   - From spec analysis (steps 3-4):
     - Module metadata (framework, file path)
     - Current definitions by category with line numbers
   - From diagnostics (step 5):
     - Baseline health status

### Phase 2: Requirement to Change Mapping

Objective: Map each requirement to concrete spec changes.

Steps:

7. **Identify Target Modules**
   - Per requirement in requirement_analysis:
     - Extract: `affected_modules` field
     - Check: Modules exist in analyzed specs (from Phase 1)
     - If module not found: Return error "Module '<name>' in requirements not found in specs"

8. **Determine Change Operations**
   - Per requirement:
     - Analyze requirement type (add, modify, remove):
       - If requirement mentions "add": Change type = ADD
       - If requirement mentions "modify", "update", "change": Change type = MODIFY
       - If requirement mentions "remove", "delete": Change type = REMOVE
     - Identify target AST element:
       - Check requirement references type/state/action/pure def
       - Extract: Element name and category
       - If ambiguous: Flag requirement for clarification, use best-effort inference

9. **Understand Existing Definitions** (LSP hover + definition)
   - For requirements that MODIFY existing elements:
     - Per element to modify:

       a. **Get Type Information** (LSP hover):
          - Locate: Element in spec file (from grep line number)
          - Call: `mcp__quint-lsp__hover` with:
            ```json
            {
              "filePath": "spec_file.qnt",
              "line": <line_number>,
              "column": 1
            }
            ```
          - Parse response:
            - Type signature (if applicable)
            - Documentation
            - Current definition summary
          - Store: "current_signature" for comparison later

       b. **Get Full Implementation** (LSP definition - optional):
          - If change is complex:
            - Call: `mcp__quint-lsp__definition` with "ModuleName.elementName"
            - Get: Complete implementation code
            - Purpose: Understand what's being modified
            - Use: To determine how to modify it

       - Store: Current definition info with change

10. **Map Requirements to Changes**
    - Per affected module:
      - Create change list with entries:
        - `item`: AST category (type, state, action, pure_def)
        - `name`: Element name
        - `change`: Operation (add, modify, remove)
        - `details`: Specific implementation guidance
        - `line_ref`: Line number if modifying existing (null if adding)
      - Include rationale from requirement analysis
      - Order changes by dependency (types → state → pure defs → actions)

### Phase 2.5: Change Impact Analysis (LSP references)

Objective: Understand ripple effects of proposed changes.

Steps:

11. **Analyze Impact for MODIFY/REMOVE Changes**
    - Per change where type == MODIFY or REMOVE:
      - Extract: Symbol name from change
      - Construct: Fully qualified name "ModuleName.symbolName"
      - Call: `mcp__quint-lsp__references` with symbolName
      - Parse response:
        ```json
        [
          {
            "uri": "file:///path/to/spec1.qnt",
            "range": {"start": {"line": 45, ...}, ...}
          },
          {
            "uri": "file:///path/to/spec2.qnt",
            "range": {"start": {"line": 23, ...}, ...}
          }
        ]
        ```
      - Count: Total references found
      - Extract: Unique files affected
      - Classify impact level:
        - 0-2 refs: low_impact
        - 3-10 refs: medium_impact
        - 10+ refs: high_impact
      - Store in change metadata:
        ```json
        {
          "item": "action",
          "name": "step",
          "change": "modify",
          "impact_analysis": {
            "level": "high",
            "references_count": 12,
            "affected_files": ["spec1.qnt", "spec2.qnt"],
            "locations": [...]
          }
        }
        ```
      - Purpose: Identify high-risk changes that need extra validation

12. **Flag High-Risk Changes**
    - Review all impact analyses
    - Mark changes with high_impact for:
      - Extra validation steps in validate
      - User notification in plan display
    - Store: List of high-impact changes

### Phase 3: Pattern Identification

Objective: Identify applicable Quint patterns from knowledge base.

Steps:

13. **Query Knowledge Base for Patterns**
    - Review requirement_analysis.knowledge_references (if present)
    - Per requirement with coding implications:
      - If involves new actions: Query `quint_get_pattern("thin-actions")`
      - If involves state updates: Query `quint_get_pattern("state-updates")`
      - If involves choreo framework: Query `quint_get_doc("choreo-patterns")`
    - Extract: Pattern IDs and descriptions

14. **Map Patterns to Modules**
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

15. **Design Validation Commands**
    - Base commands (always include):
      - Parse: `quint parse <spec_path>`
      - Typecheck: `quint typecheck <spec_path>`

16. **Add Framework-Specific Validation**
    - For standard framework:
      - Include: `quint test <spec_path>` if existing tests found
    - For choreo framework:
      - Include: `quint test <spec_path> --main=<module>` with correct module

17. **Add Property-Preservation Checks**
    - If spec has existing invariants:
      - Per invariant:
        - Add: `quint run <spec_path> --invariant=<name> --max-steps=100`
        - Set: `expected_outcome = "Invariant satisfied"`
    - If changes modify critical actions:
      - Add stress tests with higher step counts (200-500)

### Phase 5: Risk Assessment and Output

Objective: Consolidate risks and generate plan.

Steps:

18. **Aggregate Risks**
    - Transfer all risks from requirement_analysis
    - Add implementation-specific risks:
      - If removing definitions: Risk = "May break dependent modules"
      - If modifying state: Risk = "May invalidate existing invariants"
      - If changing action signatures: Risk = "Breaking change for callers"

19. **Construct Plan JSON**
    - Build structure:
      - `objective`: From requirement analysis
      - `modules`: Array of module change lists (from Phase 2)
      - `patterns_to_apply`: From Phase 3
      - `validation_plan`: From Phase 4
      - `risks`: From step 12
      - `approval`: `{ "approved": false }` (to be updated by analyzer)

20. **Validate Output Schema**
    - Check: Output conforms to `.claude/schemas/refactor-plan.json`
    - If validation fails: Correct structure, retry
    - If still fails: Return error with schema violations

21. **Write Output File**
    - Run: Write JSON to output path
    - Check: File written successfully
    - Return: Success response with statistics

## Tools Used

- `Read`: Read requirement analysis and spec files
- `Write`: Write refactor-plan.json
- `Grep`: Find module names and definitions with line numbers
- MCP `quint-lsp` (critical):
  - `mcp__quint-lsp__diagnostics` - Validate specs are clean before planning
  - `mcp__quint-lsp__references` - Impact analysis for MODIFY/REMOVE changes
  - `mcp__quint-lsp__hover` - Get type signatures of existing definitions
  - `mcp__quint-lsp__definition` - Read full implementation when needed
- MCP `quint-kb`: Query for patterns (optional)

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
- **Condition**: `requirement_analysis` file not found or no spec files at `spec_paths`
- **Action**: Return error "Required file not found: <path>"
- **Recovery**: User must provide valid requirement analysis and spec paths

### Schema Validation Failure
- **Condition**: requirement_analysis does not conform to expected schema
- **Action**: Return error with specific schema violations
- **Recovery**: Regenerate requirement analysis using correct schema

### Module Not Found
- **Condition**: Requirement references module not found in spec files
- **Action**: Return error "Module '<name>' in requirements not found in specs"
- **Recovery**: Update requirement analysis or verify spec files are correct

### Spec Parse Failure
- **Condition**: Cannot parse spec file to extract definitions
- **Action**: Continue with best-effort analysis, flag issue in output
- **Recovery**: Fix spec syntax errors before planning

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
/refactor:plan \
 --requirement_analysis=.artifacts/requirement-analysis.json \
 --spec_paths="specs/consensus.qnt"
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
1. Load requirement analysis, validate schema
2. Read specs/consensus.qnt
3. Extract module "Consensus", framework: standard
4. Grep for existing types, state vars, actions with line numbers
5. Extract objective: "Add timeout mechanism..."
6. Extract requirements: 2 requirements, both type ADD
7. Map to changes:
   - req-1 → Add type "TimeoutEvent" (line_ref: null)
   - req-2 → Add state var "timeouts" (line_ref: null)
8. Query KB for timeout patterns
9. Design validation: parse, typecheck, invariant checks
10. Aggregate risks from requirement analysis
11. Write refactor-plan.json

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
 "details": "Union type for RequestTimeout | PrepareTimeout | CommitTimeout",
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

