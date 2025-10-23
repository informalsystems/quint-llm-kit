# Verifier: Test Execution and Result Interpretation Protocols

**Version**: 4.0.0

**Purpose**: Reference for executing witnesses, invariants, and deterministic tests with decision trees for result interpretation.

**When to use**: During execute-verification command when running verification suite and classifying results.

---

## Module Configuration Decision Matrix

### When to Use Multiple Configurations

**Detection**:
```
Scan spec for: const declarations
Pattern: "const\s+(\w+)"

If constants_found.length > 0:
  spec_is_parameterized = true
  Proceed to configuration selection
Else:
  spec_is_parameterized = false
  Use single configuration
```

### Configuration Selection Protocol

**Step 1: Identify Parameters**
```
Extract: All const declarations (N, f, quorum, threshold, etc.)
Extract: Formulas using parameters (e.g., "5*f+1", "N-f", "2*f")
```

**Step 2: Check Requirements**
```
If requirement_analysis available:
  Extract: Expected formulas from requirements
  Example: "Byzantine quorum = 5*f+1"
```

**Step 3: Generate 3 Configurations**
```
Configuration 1: Minimal
  Purpose: Catch edge cases and formula errors
  Values: Small (N=4, f=1)
  Rationale: Easier to trace, exposes formula bugs

Configuration 2: Typical
  Purpose: Represent realistic deployment
  Values: Medium (N=7, f=2)
  Rationale: Common production values

Configuration 3: Stress
  Purpose: Test at scale
  Values: Large (N=10, f=3)
  Rationale: Finds performance/complexity issues
```

**Step 4: Generate Config-Specific Invariants**
```
For each formula in requirements:
  Create invariant checking formula correctness

Example:
  val quorumMatchesSpec = (quorum == 5 * f + 1)
  val byzantineConstraints = (N >= 3*f+1) and (quorum > N-f) and (quorum > 2*f)
```

**Step 5: Test Execution**
```
For each configuration (TestMin, TestTypical, TestStress):
  Execute: quint run <test_file> --main=<config> --invariant=<name>
  Track: Which configs pass/fail
```

**Why This Matters**: Spec using `3*f+1` instead of `5*f+1` will fail quorumMatchesSpec invariant in ALL configurations, immediately exposing the formula bug.

---

## Witness Execution Protocol (Liveness Checks)

### Purpose

Verify protocol can make progress by checking witness is VIOLATED.

### Basic Command Template

```bash
quint run <test_file>.qnt \
  --main=<module> \
  --invariant=<witness_name> \
  --max-steps=100 \
  --max-samples=100
```

### Result Interpretation Decision Tree

```
Execute witness
Check output:

If output contains "An example execution":
  result = "violated"
  Extract: seed, step_number
  → SUCCESS Protocol (witness violated = can progress)

Else if output contains "No trace found":
  result = "satisfied"
  → CONCERN Protocol (witness satisfied = may indicate liveness issue)
```

### SUCCESS Protocol: Witness Violated

**When**: Witness violated quickly (<50 steps)

**Actions**:
```
Step 1: Record Success
  Status: ✅ VIOLATED
  Step: <violation_step>
  Seed: <seed>
  Interpretation: Protocol CAN make progress (liveness confirmed)

Step 2: Move to Next Witness
  No further action needed for this witness
```

### CONCERN Protocol: Witness Satisfied

**When**: Witness satisfied after max-samples

**Phase 1: Progressive Increase**
```
attempt_count = 0
max_steps_values = [100, 200, 500, 1000]

For each max_steps in max_steps_values:
  attempt_count++

  Execute: quint run --invariant=<witness> --max-steps=<max_steps> --max-samples=100

  If violated:
    Record: ✅ VIOLATED at step <N> with max-steps=<max_steps>
    Break loop
  Else:
    Continue to next max_steps value

If still_satisfied after all attempts:
  Proceed to Phase 2: Diagnosis
```

**Phase 2: Diagnosis**
```
Step 1: Run with MBT
  Execute: quint run --invariant=<witness> --max-steps=100 --mbt --verbosity=3

Step 2: Analyze Trace
  Check: Which actions executed? [list]
  Check: Is protocol stuck in specific state? [yes/no]
  Check: Are key actions reachable? [yes/no]

Step 3: Determine Root Cause
  If no_actions_executed:
    root_cause = "protocol_stuck_at_init"
  Else if same_action_looping:
    root_cause = "liveness_bug_infinite_loop"
  Else if key_actions_unreachable:
    root_cause = "witness_too_strong"
  Else:
    root_cause = "need_more_steps"
```

**Phase 3: Fix Options**
```
If root_cause == "witness_too_strong":
  Action: Weaken witness definition
  Example: Check single node instead of all nodes

If root_cause == "liveness_bug":
  Action: Report as critical issue
  Create issue:
    type: "suspect"
    severity: "high"
    category: "witness_not_violated"
    remediation: "Increase --max-steps or verify witness definition"

If root_cause == "need_more_steps":
  Action: Accept with warning
  Mark: Liveness unconfirmed (needs longer traces)
```

---

## Invariant Execution Protocol (Safety Checks)

### Purpose

Verify property holds in ALL states by checking invariant is SATISFIED.

### Basic Command Template

```bash
quint run <test_file>.qnt \
  --main=<module> \
  --invariant=<invariant_name> \
  --max-steps=200 \
  --max-samples=500
```

### Result Interpretation Decision Tree

```
Execute invariant
Check output:

If output contains "No trace found":
  result = "satisfied"
  → SUCCESS Protocol (invariant satisfied = safety holds)

Else if output contains "An example execution":
  result = "violated"
  Extract: seed, step_number
  → BUG Protocol (invariant violated = CRITICAL BUG)
```

### SUCCESS Protocol: Invariant Satisfied

**When**: Invariant satisfied after sampling

**Standard Verification**:
```
Step 1: Record Success
  Status: ✅ SATISFIED
  Samples: <sample_count>
  Max steps: <max_steps>
  Interpretation: Safety property holds

Step 2: Optional Stress Test (for critical invariants)
  If invariant in critical_invariants:
    Execute: quint run --invariant=<name> --max-steps=500 --max-samples=1000

    If still satisfied:
      Confidence: HIGH
    Else if violated:
      Proceed to BUG Protocol
```

### BUG Protocol: Invariant Violated

**When**: Invariant violated (safety broken)

**Phase 1: Immediate Capture**
```
Step 1: Extract Violation Details
  seed: <seed_from_output>
  step_number: <step_where_violated>
  module: <module_name>

Step 2: Get Detailed Trace
  Execute: quint run \
    --invariant=<name> \
    --seed=<seed> \
    --mbt \
    --verbosity=3 \
    --main=<module>

  Capture: Full state trace leading to violation
```

**Phase 2: Analysis**
```
Step 1: Identify Violation Point
  Read trace output
  Find: State N where invariant became false
  Find: Action that caused transition to State N

Step 2: Extract State Snapshot
  From trace at violation step:
    Extract: Relevant state variables
    Extract: Action parameters
    Example: "Node p1 decided v0, node p2 decided v1 at step 47"

Step 3: Infer Root Cause
  Analyze: Why did this action violate invariant?
  Check: Is quorum logic correct?
  Check: Are message conditions met?
  Hypothesize: Likely cause based on trace
```

**Phase 3: Documentation**
```
Create issue:
  id: "ISSUE-<number>"
  type: "bug"
  severity: "critical"
  category: "invariant_violation"
  title: "<invariant_name> violated"
  description: "<what went wrong based on trace>"
  evidence: "<state snapshot at violation>"
  reproduction: "quint run <test_file> --main=<module> --invariant=<name> --seed=<seed> --mbt"
  root_cause_hypothesis: "<inferred cause from trace analysis>"
  remediation: "<specific fix suggestion based on hypothesis>"
```

**Phase 4: Cross-Check**
```
Step 1: Verify with Different Seeds
  Execute: quint run --invariant=<name> --max-steps=200 --max-samples=100

  If violated_again:
    Frequency: HIGH (bug is common)
  Else:
    Frequency: LOW (rare edge case, still a bug)

Step 2: Try to Minimize
  Execute: quint run --invariant=<name> --seed=<seed> --max-steps=<violation_step+5>

  Purpose: Find shorter path to violation (helps debugging)
```

---

## Deterministic Test Execution Protocol

### Purpose

Verify specific scenarios work as expected.

### Basic Command Template

```bash
quint test <test_file>.qnt \
  --main=<module> \
  --match=<test_pattern>
```

### Result Interpretation Decision Tree

```
Execute test
Check output:

If output contains "All tests passed":
  result = "passed"
  → SUCCESS Protocol

Else if output contains "failed":
  result = "failed"
  Extract: test_name, failure_message
  → FAILURE Protocol
```

### SUCCESS Protocol: Test Passed

**Actions**:
```
Step 1: Record Success
  Status: ✅ PASSED
  Test: <test_name>
  Time: <execution_time>

Step 2: Continue to Next Test
  No further action needed
```

### FAILURE Protocol: Test Failed

**Phase 1: Diagnosis**
```
Step 1: Get Detailed Output
  Execute: quint test <file> --main=<module> --match="<failing_test>" --verbosity=3

  Extract from output:
    - Which .expect() failed
    - Expected value
    - Actual value
    - Line number

Step 2: Read Test Code
  Locate: Failing .expect() in test definition
  Understand: What scenario is being tested
```

**Phase 2: Categorization**
```
Analyze failure message

If assertion_failure:
  Check: Is expected value correct? [yes/no]

  If yes (spec is wrong):
    failure_type = "spec_bug"
    severity = "high"
  Else (test is wrong):
    failure_type = "test_bug"
    severity = "medium"

Else if execution_error:
  failure_type = "spec_error"
  severity = "critical"
```

**Phase 3: Enhanced Debugging (if needed)**
```
Step 1: Add Intermediate Checkpoints
  Modify test to add .expect() between actions:

  Original:
    run myTest =
      init
        .then(action1)
        .then(action2)
        .expect(finalCondition)  # Fails here

  Enhanced:
    run myTest =
      init
        .expect(state.round == 0)      # Checkpoint 1
        .then(action1)
        .expect(state.phase == "propose")  # Checkpoint 2
        .then(action2)
        .expect(finalCondition)        # Original check

Step 2: Re-run with Checkpoints
  Execute: quint test --match="myTest" --verbosity=3

  Identify: Which checkpoint fails first
  Narrow down: Exact action causing problem
```

**Phase 4: Issue Creation**
```
Create issue:
  If failure_type == "spec_bug":
    type: "bug"
    severity: "high"
    category: "test_failure"
    title: "Test <name> failed: <one-line description>"
    evidence: "Expected <X>, got <Y> at line <N>"
    remediation: "Fix spec logic: <specific suggestion>"

  If failure_type == "test_bug":
    type: "weak_assertion"
    severity: "medium"
    category: "test_issue"
    title: "Test <name> has incorrect expectation"
    remediation: "Update test expectation to match correct behavior"
```

---

## Iteration Decision Matrix

### Compilation Errors

| Symptom | Root Cause | Action | Max Attempts |
|---------|------------|--------|--------------|
| Parse error in test file | Syntax error (typo, missing comma) | Fix syntax, re-parse | 3 |
| Typecheck error in test | Missing import, wrong type | Add import or fix type | 3 |
| Cannot find action | Test references non-existent action | Verify action exists in spec | 1 |

**Protocol**:
```
attempt_count = 0

While error persists AND attempt_count < 3:
  attempt_count++

  Identify error type from message
  Apply fix from table above
  Re-run compilation

  If success: Break
  Else: Continue

If attempt_count >= 3 AND still failing:
  Query KB: quint_hybrid_search("common test syntax errors")
  Try KB-suggested fix

  If still failing: Escalate to user
```

### Witness Never Violated

**Decision Tree**:
```
If witness satisfied after max-steps=1000:

  Step 1: Check witness definition
    Is witness checking liveness? [yes/no]
    If no: Witness definition error → Fix definition

  Step 2: Run MBT trace
    Execute: quint run --invariant=<witness> --mbt --max-steps=50

    If no_actions_executed:
      → Protocol stuck at init
      → Check init conditions
    Else if actions_loop_infinitely:
      → Liveness bug in spec
      → Create critical issue
    Else:
      → Witness too strong
      → Weaken witness

  Step 3: Decision
    If liveness_bug_suspected:
      Create issue:
        type: "suspect"
        severity: "high"
        remediation: "Investigate why protocol cannot progress"
    Else:
      Weaken witness and retry
```

### Invariant Violated at Step 0

**Decision Tree**:
```
If invariant violated at step 0:

  Step 1: Check if init violates invariant
    Read: def init = ...
    Evaluate: Does init state satisfy invariant? [yes/no]

    If no:
      root_cause = "init_bug"
    Else:
      root_cause = "invariant_too_strong"

  Step 2: Fix
    If root_cause == "init_bug":
      Action: Fix init to satisfy invariant
    Else:
      Action: Weaken invariant to allow valid init states

  Step 3: Re-run
    Execute verification with fixed init/invariant
```

---

## MBT (Model-Based Trace) Usage Protocol

### When to Use MBT

**Conditions**:
- Invariant violated (need to see how)
- Witness never violated (need to see why)
- Test failed (need to understand execution)
- Debugging any unexpected behavior

### Command Pattern

```bash
quint run <test_file>.qnt \
  --main=<module> \
  --invariant=<name> \
  --seed=<specific_seed> \
  --mbt \
  --verbosity=3 \
  --max-steps=<N>
```

### Output Interpretation

**Structure**:
```
State 0: { <initial_state_values> }
Action: <action_name>
  Picked: <nondeterministic_choices>
State 1: { <state_after_action> }
Action: <next_action>
...
```

**Analysis Steps**:
```
Step 1: Scan for Pattern
  Look for: Repeated actions
  Look for: State values changing/not changing
  Look for: Error messages

Step 2: Identify Critical Transition
  Find: Step where invariant violated OR witness should be violated
  Read: State before and after that step
  Analyze: What changed?

Step 3: Trace Backwards
  From critical step, trace back:
    Which actions led here?
    What nondeterministic picks were made?
    Could different picks avoid issue?
```

### Verbosity Level Selection

| Level | Output | When to Use |
|-------|--------|-------------|
| 1 | Minimal (pass/fail only) | Normal runs, bulk testing |
| 2 | Action names | Quick understanding of execution |
| 3 | State changes, picks | Debugging failures |
| 4 | Full state dumps | Deep debugging of complex state |

**Decision**:
```
If debugging:
  Use: --verbosity=3
If understanding flow:
  Use: --verbosity=2
If production run:
  Use: --verbosity=1 (or omit)
```

---

## Result Classification Protocol

### After All Tests Execute

**Step 1: Aggregate Results**
```
Count: witnesses_violated, witnesses_satisfied
Count: invariants_satisfied, invariants_violated
Count: tests_passed, tests_failed
```

**Step 2: Determine Overall Status**
```
If invariants_violated > 0:
  overall_status = "critical_failures"
  severity = "critical"

Else if witnesses_satisfied > 0:
  overall_status = "liveness_concerns"
  severity = "high"

Else if tests_failed > 0:
  overall_status = "test_failures"
  severity = "high"

Else if witnesses_violated == expected AND invariants_satisfied == expected AND tests_passed == expected:
  overall_status = "success"

Else:
  overall_status = "unexpected_results"
```

**Step 3: Generate Report**
```
Create verification-report.json with:
  - overall_status
  - summary statistics
  - issues (classified by type and severity)
  - requirements_coverage (if available)
  - recommendations (prioritized)
  - reproduction_commands
  - next_actions
```

---

## Quality Standards Checklist

### Test Design

Check before execution:
- [ ] Minimum 5 witnesses defined
- [ ] Minimum 3 invariants defined
- [ ] Minimum 15 deterministic tests (with 5+ Byzantine scenarios)
- [ ] Test file compiles (parse + typecheck pass)
- [ ] Module instances detected if parameterized spec

### Execution Completeness

Check during execution:
- [ ] All witnesses executed with max-steps >= 100
- [ ] All invariants executed with max-samples >= 500
- [ ] All deterministic tests executed
- [ ] Timing recorded for all tests
- [ ] Seeds recorded for all violations

### Result Analysis

Check after execution:
- [ ] Witness results interpreted correctly (violated = good)
- [ ] Invariant results interpreted correctly (satisfied = good)
- [ ] Test failures categorized (spec bug vs test bug)
- [ ] All critical bugs have reproduction commands
- [ ] Root cause hypotheses provided for all bugs

### Reporting

Check before returning:
- [ ] Overall status determined correctly
- [ ] Critical issues flagged prominently
- [ ] Recommendations prioritized
- [ ] Next actions specified
- [ ] Requirements linked (if available)

---

## Stop Conditions

### Report SUCCESS When

```
Check all conditions:
  [ ] All expected witnesses violated (liveness confirmed)
  [ ] All invariants satisfied (safety confirmed)
  [ ] All deterministic tests passed
  [ ] No critical issues found
  [ ] No high-severity issues found

If all checked: Return "success"
```

### Report ISSUES When

```
If ANY condition true:
  [ ] Invariant violated (critical bug)
  [ ] Witness never violated after max attempts (liveness concern)
  [ ] Deterministic test failed (scenario bug)
  [ ] Multiple high-severity issues

Return "has_failures" with issue list
```

### Escalate to User When

```
If ANY condition true:
  [ ] Witness definition unclear (ambiguous liveness property)
  [ ] Invariant seems incorrect (too strong/weak)
  [ ] Test expectation unclear (ambiguous scenario)
  [ ] Stuck after 3 diagnostic attempts
  [ ] Compilation failed after 3 fix attempts

Ask user for clarification before proceeding
```

---

## Guardrails

### ALWAYS Do

- ✅ Execute tests in separate `<spec_name>_test.qnt` file
- ✅ Import spec: `import <spec>.* from "./<spec>"`
- ✅ Run witnesses with multiple max-steps values (100, 200, 500)
- ✅ Run invariants with high sample counts (500-1000)
- ✅ Use `--mbt` for debugging failures
- ✅ Record seeds for all violations
- ✅ Test all module instances if parameterized spec
- ✅ Provide reproduction commands for all failures

### NEVER Do

- ❌ Modify original spec file during verification
- ❌ Assume first run is conclusive (try multiple seeds)
- ❌ Ignore witness satisfied warning (potential liveness issue)
- ❌ Skip stress testing critical invariants
- ❌ Proceed if test file doesn't compile
- ❌ Report success if any critical issues found
- ❌ Skip module instances in parameterized specs

---

## Version Notes

**v4.0.0 Changes**:
- Removed vague language ("consider", "should", "may want to")
- Transformed to decision trees for result interpretation
- Added explicit success/concern/bug protocols for each test type
- Specified iteration limits (3 attempts for compilation, 4 max-steps values for witnesses)
- Added result classification protocol with overall status determination
- Made all conditionals explicit with [yes/no] checks
- Added quality standards checklist with Boolean checks
- Specified escalation conditions with templates
- Added guardrails section with explicit do/don't lists
