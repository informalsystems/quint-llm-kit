# Refactor Validate Command

**Purpose**: Validate that refactored spec satisfies basic correctness and original requirements (NOT comprehensive testing - that's the verifier's job).

**Version**: 3.0.0

## Arguments

```
/refactor/validate \
  --refactor_plan=<path> \
  --requirement_analysis=<path> \
  --user_request=<string> \
  --spec_path=<path>
```

- `refactor_plan`: Path to refactor-plan.json (contains goals)
- `requirement_analysis`: Path to requirement-analysis.json (parsed requirements)
- `user_request`: Original user request/requirements text
- `spec_path`: Path to refactored spec file

## Output

Returns JSON:
```json
{
  "status": "completed",
  "basic_checks": {
    "parse": "passed",
    "typecheck": "passed"
  },
  "plan_goals_met": {
    "goal_1": "verified",
    "goal_2": "verified"
  },
  "requirements_satisfied": {
    "REQ-001": "satisfied",
    "REQ-002": "needs_verification"
  },
  "user_request_check": {
    "aspect_1": "satisfied",
    "aspect_2": "needs_verification"
  },
  "overall": "passed" | "failed",
  "failures": [],
  "next_step": "ready_for_verifier" | "fix_issues"
}
```

## Process

### 1. Basic Sanity Checks

**Parse check:**
```bash
quint parse <spec_path>
```
- Must pass (syntax correct)

**Typecheck:**
```bash
quint typecheck <spec_path>
```
- Must pass (types correct)

If either fails, return immediately with `overall: "failed"`.

### 2. Verify Refactor Plan Goals Met

Load `refactor_plan.json` and check each goal:

**Example goals:**
- "Add TimeoutState type" → Grep for `type TimeoutState`
- "Add handleTimeout action" → Grep for `action handleTimeout`
- "Modify step action to handle timeouts" → Check step action includes timeout logic

For each goal:
- Use Grep/Read to verify implementation exists
- Mark as `verified` or `missing`

### 3. Check Requirements Still Satisfied

**Compare against original user request:**
- Read `user_request` and `requirement-analysis.json`
- For each requirement, verify against refactored spec

**Structural requirements** (can check now):
- "System must have N nodes" → Check state has nodes
- "Use Byzantine quorum (5f+1)" → Check quorum definition
- "Track round numbers" → Check state has round field
- "Add timeout mechanism" → Check TimeoutState exists

Mark as:
- `satisfied` - Structurally verified in refactored spec
- `needs_verification` - Requires verifier to test (behavioral requirements)

**Behavioral requirements** (defer to verifier):
- "Protocol must reach consensus" → Mark `needs_verification`
- "Safety: Agreement property" → Mark `needs_verification`
- "Liveness: Eventually decide" → Mark `needs_verification`

**Cross-check with user request:**
- Re-read original user request text
- Verify no major requirement was missed in requirement-analysis.json
- Flag if user request mentions something not addressed in refactored spec

### 4. Aggregate Results

- If basic checks fail: `overall: "failed"`
- If plan goals missing: `overall: "failed"`
- If only behavioral requirements need verification: `overall: "passed"`, `next_step: "ready_for_verifier"`
- If structural requirements violated: `overall: "failed"`

### 5. Return Report

Include:
- Basic check results
- Plan goal verification
- Requirements satisfaction status
- Clear next step (fix issues or proceed to verifier)

## What Validation Does NOT Do

**NOT running tests:**
- Tests may need refactoring too
- Old tests might be outdated
- That's the verifier's job

**NOT comprehensive verification:**
- No witnesses/invariants/property checking
- No test execution
- Verifier agent handles all testing

**Validation = Basic sanity + structural checks only**

## Example

**Input:**
```bash
/refactor/validate \
  --refactor_plan=.artifacts/refactor-plan.json \
  --requirement_analysis=.artifacts/requirement-analysis.json \
  --user_request="Add timeout mechanism to handle delayed messages. System should track timeout state and allow protocol to progress even when messages are delayed." \
  --spec_path=refactored/consensus.qnt
```

**User request:**
```
Add timeout mechanism to handle delayed messages.
System should track timeout state and allow protocol to progress even when messages are delayed.
```

**Refactor plan goals:**
```json
{
  "goals": [
    "Add TimeoutState type for timeout tracking",
    "Add handleTimeout action",
    "Modify step action to include timeout case"
  ]
}
```

**Requirements (parsed):**
```json
{
  "requirements": [
    {"id": "REQ-001", "type": "structural", "description": "System tracks timeout state"},
    {"id": "REQ-002", "type": "behavioral", "description": "Protocol progresses despite delays"}
  ]
}
```

**Output:**
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

## Clear Separation of Concerns

**Implementer (validate):**
- Parse/typecheck
- Plan goals met?
- Structural requirements satisfied?

**Verifier:**
- Generate tests
- Run witnesses/invariants
- Verify behavioral requirements
- Comprehensive property checking
