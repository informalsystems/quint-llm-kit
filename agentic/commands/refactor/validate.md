---
command: /refactor:validate
description: Validate refactored spec for basic correctness and requirement satisfaction
version: 4.0.0
---

# Refactor Validate Command

## Objective

Validate refactored specification satisfies basic correctness (parse/typecheck) and structural requirements without comprehensive testing (verifier's responsibility).

## Input Contract

### Required Parameters
- `refactor_plan`: Path to refactor-plan.json (contains goals)
- `requirement_analysis`: Path to requirement-analysis.json (parsed requirements)
- `user_request`: Original user request text
- `spec_path`: Path to refactored spec file in new workspace

### Optional Parameters
None

## Output Contract

### Success
```json
{
 "status": "completed",
 "basic_checks": {
 "parse": "passed",
 "typecheck": "passed"
 },
 "plan_goals_met": {
 "Add TimeoutState type": "verified",
 "Add handleTimeout action": "verified",
 "Modify step action": "verified"
 },
 "requirements_satisfied": {
 "REQ-001": "satisfied",
 "REQ-002": "needs_verification"
 },
 "user_request_check": {
 "timeout_mechanism": "satisfied",
 "progress_despite_delays": "needs_verification"
 },
 "overall": "passed",
 "next_step": "ready_for_verifier",
 "failures": []
}
```

### Failure
```json
{
 "status": "failed",
 "basic_checks": {
 "parse": "failed",
 "typecheck": "not_run"
 },
 "overall": "failed",
 "failures": ["Parse error at line 45: unexpected token"],
 "next_step": "fix_issues"
}
```

## Execution Procedure

### Phase 1: Basic Sanity Checks

Objective: Verify refactored spec has no syntax or type errors.

Steps:

1. **Parse Check** (CLI - primary validation)
   - Run: `quint parse <spec_path>`
   - Check exit code:
     - If 0: Set parse = "passed"
     - If non-zero: Set parse = "failed", record error message
   - If failed: Return immediately with overall = "failed"

2. **Typecheck** (CLI - primary validation)
   - Run: `quint typecheck <spec_path>`
   - Check output:
     - If contains "success" or "All modules typechecked": Set typecheck = "passed"
     - If contains error messages: Set typecheck = "failed", record errors
   - If failed: Return immediately with overall = "failed"

3. **Enhanced Diagnostics** (LSP - additional validation layer)
   - Call: `mcp__quint-lsp__diagnostics` with filePath=<spec_path>
   - Parse response:
     - Parse errors: Syntax issues, unexpected tokens
     - Type errors: Type mismatches, undefined symbols, missing imports
     - Warnings: Unused variables, deprecated features, best practices
   - Purpose: Get additional insights beyond CLI (warnings, suggestions)
   - Cross-check: LSP errors should align with CLI results
   - Record warnings for reporting (not failures)

### Phase 2: Verify Refactor Plan Goals

Objective: Confirm all planned changes were applied.

Steps:

3. **Load Plan Goals**
   - Run: Read refactor_plan from path
   - Extract: All changes with item and name fields
   - Build checklist of expected modifications

4. **Check Each Goal**
   - Per change in plan:
     - If change type == ADD:
       - Run: Grep for definition pattern matching change.name
       - Pattern: `(type|const|var|def|action)\s+<name>`
       - If found: Mark "verified (found at line X)"
       - If not found: Mark "missing"
     - If change type == MODIFY:
       - Run: Read spec at change.line_ref
       - Check: Modified content reflects change.details
       - If change evident: Mark "verified"
       - If unchanged: Mark "not applied"
     - If change type == REMOVE:
       - Run: Grep for definition pattern
       - If not found: Mark "verified (removed)"
       - If still present: Mark "not removed"
     - If change type == RENAME (if supported):
       - **Verify Old Name Gone** (LSP references):
         - Call: `mcp__quint-lsp__references` with symbolName="ModuleName.oldName"
         - If references found: Mark "not renamed (old name still exists)"
         - If no references: Verify new name exists via Grep
         - If new name exists and old gone: Mark "verified (renamed)"
       - Purpose: Ensure rename was complete and atomic

5. **Assess Goal Completion**
   - Count: Verified goals vs total goals
   - If any goals not met: Add to failures list
   - **Cross-Check with LSP Diagnostics**:
     - If goals appear met but diagnostics show errors:
       - Check: Are errors related to refactor changes?
       - Mark: Goals as "partially applied" if errors present
       - Purpose: Ensure goals are not just present but also correct

### Phase 3: Check Requirements Satisfaction

Objective: Verify structural requirements met, defer behavioral checks to verifier.

Steps:

6. **Load Requirements**
   - Run: Read requirement_analysis from path
   - Extract: All requirements with IDs and types
   - Parse user_request text for additional context

7. **Classify Requirements**
   - Per requirement:
     - Determine if structural or behavioral:
       - **Structural**: Can verify by reading code
         - "System must have N nodes"
         - "Use Byzantine quorum (5f+1)"
         - "Track round numbers"
         - "Add timeout mechanism"
       - **Behavioral**: Requires execution/testing
         - "Protocol must reach consensus"
         - "Safety: Agreement property"
         - "Liveness: Eventually decide"

8. **Verify Structural Requirements**
   - Per structural requirement:
     - Run: Grep or Read spec for evidence
     - Examples:
       - "Track timeout state" → Grep for `TimeoutState` type
       - "Use quorum 5f+1" → Grep for `5\s*\*\s*f\s*\+\s*1` pattern
       - "N nodes" → Check state has node set/map
     - If found: Mark "satisfied (evidence at line X)"
     - If not found: Mark "not satisfied"

9. **Mark Behavioral Requirements**
   - Per behavioral requirement:
     - Automatically mark "needs_verification"
     - Note: Verifier will test these with witnesses/invariants

10. **Cross-Check User Request**
    - Parse user_request text for key aspects
    - Per aspect mentioned:
      - Check: Evidence in refactored spec
      - Classify: Satisfied or needs_verification
      - Flag: Any aspect from user_request not addressed

### Phase 4: Aggregate and Report

Objective: Determine overall status and next steps.

Steps:

11. **Calculate Overall Status**
    - If basic checks failed: Set overall = "failed"
    - If plan goals not met: Set overall = "failed"
    - If structural requirements violated: Set overall = "failed"
    - If only behavioral requirements need verification: Set overall = "passed"

12. **Determine Next Step**
    - If overall == "failed": Set next_step = "fix_issues"
    - If overall == "passed": Set next_step = "ready_for_verifier"

13. **Construct Response**
    - Include: Basic check results
    - Include: Plan goal verification status
    - Include: Requirements satisfaction (categorized)
    - Include: User request cross-check
    - Include: Overall status and next step
    - Include: Failures list (if any)

14. **Return Response**
    - Status: "completed" (validation executed)
    - Overall: "passed" or "failed" (validation result)

## Tools Used

- `Bash(quint)`: Parse and typecheck commands (PRIMARY validation - source of truth)
- `Read`: Read spec file and artifacts
- `Grep`: Search for definitions and patterns
- MCP `quint-lsp` (enhanced validation layer):
  - `mcp__quint-lsp__diagnostics` - Additional validation, warnings, best practice suggestions
  - `mcp__quint-lsp__references` - Verify renamed symbols have no old references remaining

## Error Handling

### Parse Failure
- **Condition**: `quint parse` returns non-zero exit code
- **Action**: Set parse = "failed", overall = "failed", next_step = "fix_issues"
- **Recovery**: Fix syntax errors in refactored spec, retry validation

### Typecheck Failure
- **Condition**: `quint typecheck` reports type errors
- **Action**: Set typecheck = "failed", overall = "failed", next_step = "fix_issues"
- **Recovery**: Fix type errors (imports, annotations), retry validation

### Plan Goals Not Met
- **Condition**: Expected change not found in refactored spec
- **Action**: Set overall = "failed", list missing goals in failures
- **Recovery**: Re-run apply for missing changes

### Structural Requirement Not Satisfied
- **Condition**: Structural requirement evidence not found in spec
- **Action**: Set overall = "failed", list unsatisfied requirements
- **Recovery**: Verify requirement was included in plan, re-run if needed

### Artifact Missing
- **Condition**: refactor_plan or requirement_analysis not found
- **Action**: Return error "Cannot validate without planning artifacts"
- **Recovery**: Ensure analyzer completed, check artifact paths

## Scope Boundaries

### What Validation Does

**Basic Correctness**:
- Syntax correctness (parse)
- Type correctness (typecheck)

**Plan Compliance**:
- All planned changes applied
- Changes are present in spec

**Structural Requirements**:
- Required types exist
- Required state variables exist
- Required actions exist
- Formulas match specs

### What Validation Does NOT Do

**No Test Execution**:
- Doesn't run existing tests
- Tests may be outdated after refactoring
- Verifier handles test generation and execution

**No Behavioral Verification**:
- Doesn't check liveness properties
- Doesn't check safety invariants
- Doesn't execute witnesses
- Verifier handles all property checking

**No Comprehensive Testing**:
- Doesn't generate new tests
- Doesn't check protocol correctness
- Doesn't verify Byzantine scenarios
- Verifier provides comprehensive testing

## Example Execution

**Input**:
```
/refactor:validate \
 --refactor_plan=.artifacts/refactor-plan.json \
 --requirement_analysis=.artifacts/requirement-analysis.json \
 --user_request="Add timeout mechanism to handle delayed messages" \
 --spec_path=./refactored/consensus.qnt
```

**Process**:
1. Parse check: quint parse → exit 0 → passed
2. Typecheck: quint typecheck → success → passed
3. Load plan goals: 3 goals (Add TimeoutState, Add handleTimeout, Modify step)
4. Check goal 1: Grep for TimeoutState → found at line 15 → verified
5. Check goal 2: Grep for handleTimeout → found at line 67 → verified
6. Check goal 3: Read step action → timeout case added → verified
7. Load requirements: REQ-001 (structural), REQ-002 (behavioral)
8. Check REQ-001: Grep for TimeoutState → satisfied
9. Mark REQ-002: needs_verification (behavioral)
10. Cross-check user request: timeout mechanism → satisfied
11. Calculate overall: passed (all checks successful)
12. Set next_step: ready_for_verifier

**Output**:
```json
{
 "status": "completed",
 "basic_checks": {
 "parse": "passed",
 "typecheck": "passed"
 },
 "plan_goals_met": {
 "Add TimeoutState type": "verified (found at line 15)",
 "Add handleTimeout action": "verified (found at line 67)",
 "Modify step action": "verified (timeout case added)"
 },
 "requirements_satisfied": {
 "REQ-001": "satisfied (TimeoutState in state definition)",
 "REQ-002": "needs_verification (requires liveness testing)"
 },
 "user_request_check": {
 "timeout_mechanism": "satisfied (TimeoutState + handleTimeout added)",
 "track_timeout_state": "satisfied (TimeoutState type present)",
 "progress_despite_delays": "needs_verification (requires testing)"
 },
 "overall": "passed",
 "next_step": "ready_for_verifier",
 "failures": []
}
```

