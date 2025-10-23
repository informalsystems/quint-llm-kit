---
description: Full refactor pipeline with analyzer, implementer, verifier, feedback loops, and cross-reflection
---

# Refactor Pipeline Orchestrator

You are orchestrating a complete Quint specification refactoring workflow with feedback loops and cross-agent reflection.

## Input from User

The user provides:
- **User request**: Natural language description of changes needed
- **Spec path**: Path to the Quint specification file(s)

## Pipeline Phases

### Phase 1: Analysis & Planning

**Invoke @analyzer:**
```
Analyze the spec at [spec_path] and create a refactor plan for: [user_request]
```

**Wait for analyzer completion**, then:
1. Read `.artifacts/refactor-plan.json`
2. Present plan to user in readable format
3. Ask user: "Do you approve this refactor plan? (yes/no/modify)"
4. If "no" → Stop
5. If "modify" → Ask what to change, invoke @analyzer again with modifications
6. If "yes" → Update `refactor-plan.json` with approval metadata:
   ```json
   {
     "approval": {
       "approved": true,
       "timestamp": "[current_timestamp]",
       "approver": "user"
     }
   }
   ```

### Phase 2: Implementation (with validation feedback loop)

**Invoke @implementer:**
```
Implement the approved refactor plan at .artifacts/refactor-plan.json for spec [spec_path].
Use requirement analysis at .artifacts/requirement-analysis.json.
Original user request: [user_request]
```

**Validation feedback loop (max 3 attempts):**

For attempt in 1..3:
  1. Wait for implementer completion
  2. Read validation results from implementer output
  3. If validation passed → Break loop, proceed to Phase 3
  4. If validation failed:
     - Analyze failure (parse error? typecheck error? missing goal?)
     - **Cross-reflection**: Ask @analyzer to review the failure:
       ```
       @analyzer: The implementer failed validation with error: [error_details]
       Does the refactor plan need adjustment, or is this an implementation issue?
       ```
     - If plan needs adjustment → Update plan, retry @implementer
     - If implementation issue → Provide guidance to @implementer, retry
  5. If attempt == 3 and still failing → Escalate to user

**If max attempts exceeded:**
- Report failures to user
- Ask: "Continue to verification anyway? (yes/no)"
- If "no" → Stop

### Phase 3: Verification (with test feedback loop)

**Invoke @verifier:**
```
Verify the refactored spec at [refactored_spec_path].
Use requirement analysis at .artifacts/requirement-analysis.json.
Original user request: [user_request]
```

**Verification feedback loop (max 2 iterations):**

For iteration in 1..2:
  1. Wait for verifier completion
  2. Read `.artifacts/verification-report.json`
  3. Classify results:
     - All tests pass → SUCCESS, proceed to Phase 4
     - Configuration-specific bug (e.g., quorum formula) → SPEC BUG
     - Test failure → Needs classification

  4. **If spec bug found:**
     - **Cross-reflection with @implementer:**
       ```
       @implementer: Verifier found a bug in the refactored spec:
       - Issue: [bug_description]
       - Evidence: [test_output]
       - Location: [spec_location]

       Please fix this issue. Original plan: .artifacts/refactor-plan.json
       ```
     - **Cross-reflection with @analyzer:**
       ```
       @analyzer: A bug was found during verification: [bug_description]
       Is this a fundamental issue with the refactor plan, or just an implementation error?
       ```
     - Based on @analyzer response:
       - If plan issue → Update plan, go back to Phase 2
       - If implementation issue → Let @implementer fix, re-verify

  5. **If test gap (not a spec bug):**
     - Ask @verifier to improve tests:
       ```
       @verifier: Some tests failed but may indicate test gaps rather than spec bugs.
       Please improve test coverage for: [failing_scenarios]
       ```
     - Re-run verification

  6. If iteration == 2 and issues remain → Report to user for manual review

**If max iterations exceeded:**
- Report which tests are failing
- Show classification (bugs vs test gaps)
- Provide reproduction commands
- Ask user how to proceed

### Phase 4: Cross-Agent Summary & Report

**Generate comprehensive report using all agent outputs:**

1. **Read all artifacts:**
   - `.artifacts/requirement-analysis.json`
   - `.artifacts/refactor-plan.json`
   - `.artifacts/verification-report.json`
   - Implementer validation results

2. **Cross-agent reflection summary:**
   - What @analyzer planned vs what @implementer delivered
   - What @verifier found vs what @analyzer expected
   - Any discrepancies between agents' understanding

3. **Present final report to user:**

```
╔══════════════════════════════════════════════════════════╗
║  Refactor Pipeline Complete                              ║
╚══════════════════════════════════════════════════════════╝

Original Request:
  [user_request]

📋 Analysis (@analyzer):
  - Requirements identified: [count]
  - Refactor plan: [summary]
  - Approval: [timestamp]

🔧 Implementation (@implementer):
  - Files modified: [list]
  - Validation attempts: [count]
  - Parse/typecheck: PASSED
  - Plan goals met: [count]/[total]
  - Requirements satisfied: [structural_count]

✅ Verification (@verifier):
  - Configurations tested: [list]
  - Witnesses: [passed]/[total]
  - Invariants: [passed]/[total]
  - Tests: [passed]/[total]
  - Critical issues: [count]

🔄 Cross-Agent Reflection:
  - Analyzer expectation vs Implementer delivery: [aligned/diverged]
  - Verifier findings vs Analyzer plan: [aligned/diverged]
  - Feedback loops executed: [count]
  - Issues auto-resolved: [count]

📊 Final Status: [SUCCESS | ISSUES FOUND | PARTIAL]

Next Steps:
  [recommendations]
```

## Feedback Loop Logic

### Implementer → Implementer (validation failures)

**Trigger:** Validation fails (parse, typecheck, missing goals)

**Process:**
1. Classify error type
2. Check if @analyzer plan might be wrong (cross-reflection)
3. Provide targeted guidance to @implementer
4. Retry (max 3 times)

**Example:**
```
Validation failed: Typecheck error at line 45
Cross-check with @analyzer: Is the type signature in the plan correct?
Guidance to @implementer: The plan specifies 'Int' but spec uses 'Nat', adjust accordingly.
```

### Verifier → Implementer (spec bugs)

**Trigger:** Tests fail due to spec logic errors

**Process:**
1. @verifier identifies spec bug
2. Ask @implementer to fix the specific issue
3. Optionally ask @analyzer if plan needs revision
4. Re-run @verifier after fix

**Example:**
```
@verifier found: quorum formula uses 3*f+1 instead of 5*f+1
@analyzer: Confirm expected formula is 5*f+1 from requirements
@implementer: Fix quorum definition at line 34
Re-verify after fix.
```

### Verifier → Verifier (test gaps)

**Trigger:** Tests fail but likely due to incomplete test coverage

**Process:**
1. Ask @verifier to improve tests
2. Re-run verification
3. Compare new results

**Example:**
```
Test 'normalConsensusPath' failed but may need better coverage
@verifier: Add intermediate .expect() assertions to narrow down failure
Re-run tests with improved coverage.
```

## Cross-Reflection Patterns

### Pattern 1: Plan Validation

**When:** Before implementer starts
**Actors:** @analyzer, user
**Purpose:** Ensure plan is clear and complete

```
Present @analyzer plan to user
User approves/rejects/modifies
Update plan based on feedback
```

### Pattern 2: Implementation Quality Check

**When:** After implementer completes
**Actors:** @implementer, @analyzer
**Purpose:** Verify implementation matches plan intent

```
Read implementer output
Read analyzer plan
Check: Did implementer do what analyzer planned?
If mismatch → Ask @analyzer: "Is this acceptable or should we retry?"
```

### Pattern 3: Verification Failure Analysis

**When:** Verifier finds issues
**Actors:** @verifier, @implementer, @analyzer
**Purpose:** Classify issue and route to correct agent

```
@verifier reports failure
Analyze: Spec bug vs Test gap?
If spec bug:
  → Ask @analyzer: "Is this expected behavior?"
  → Ask @implementer: "Can you fix this?"
If test gap:
  → Ask @verifier: "Can you improve test coverage?"
```

### Pattern 4: Final Alignment Check

**When:** End of pipeline
**Actors:** All agents + user
**Purpose:** Ensure all agents agree on outcome

```
Summary:
- What did @analyzer expect? [X]
- What did @implementer deliver? [Y]
- What did @verifier find? [Z]

Are X, Y, Z aligned?
If not, explain discrepancies to user.
```

## State Tracking

Track pipeline state in `.artifacts/pipeline-state.json`:

```json
{
  "phase": "verification",
  "attempt_counts": {
    "implementer_validation": 2,
    "verifier_iteration": 1
  },
  "feedback_loops": [
    {
      "from": "verifier",
      "to": "implementer",
      "reason": "quorum_formula_bug",
      "resolved": true
    }
  ],
  "cross_reflections": [
    {
      "actors": ["analyzer", "implementer"],
      "topic": "plan_alignment",
      "outcome": "aligned"
    }
  ],
  "status": "in_progress"
}
```

## Error Handling

**Agent invocation fails:**
- Record error
- Ask user whether to retry or skip phase
- If skipping, note limitations in final report

**Infinite loop detected:**
- If same feedback loop repeats 3 times without progress
- Stop and escalate to user
- Provide summary of loop and why it's stuck

**User interruption:**
- Save current state
- Allow resume from last completed phase

## Quality Checks

Before completing:
- [ ] User approved refactor plan
- [ ] Implementer validation passed
- [ ] Verifier tested with multiple configurations
- [ ] All critical bugs resolved or documented
- [ ] Cross-agent reflections show alignment
- [ ] Final report includes all agent perspectives

## Usage

**Simple invocation:**
```
/refactor-pipeline --spec=specs/consensus.qnt --request="Add timeout mechanism"
```

**With options:**
```
/refactor-pipeline \
  --spec=specs/consensus.qnt \
  --request="Add timeout mechanism" \
  --max-implementation-attempts=3 \
  --max-verification-iterations=2 \
  --auto-approve=false
```

## Key Principles

1. **User in control**: Always get approval before major changes
2. **Agent collaboration**: Agents consult each other through cross-reflection
3. **Feedback loops**: Issues trigger targeted retries, not full restarts
4. **Transparency**: Show all agent interactions and decisions
5. **State preservation**: Can resume if interrupted
6. **Quality over speed**: Better to iterate than to produce broken output
