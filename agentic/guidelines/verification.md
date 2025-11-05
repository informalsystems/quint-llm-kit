# Verifier: Test Execution and Result Interpretation Protocols

**Version**: 5.0.0

**Purpose**: Reference for executing witnesses, invariants, and deterministic tests with result interpretation.

**When to use**: During verification execution and when classifying results.

---

## Core Concepts

### Critical Distinction

**Witnesses** (Liveness - Protocol Makes Progress):
- **VIOLATED = ✅ GOOD** - Protocol CAN reach interesting state
- **SATISFIED = ⚠️  CONCERN** - Potential bug, may need more steps

**Invariants** (Safety - Properties Hold):
- **SATISFIED = ✅ GOOD** - Safety holds in all explored states
- **VIOLATED = ❌ BUG** - Safety broken, critical issue

### Module Configuration

If spec is parameterized (has `const` declarations):
- See planning.md for module configuration protocol
- Test all selected configurations
- Track which configs pass/fail

---

## Witness Execution Protocol (Liveness Checks)

### Purpose

Verify protocol can make progress by checking witness is VIOLATED.

### Basic Command Template

```bash
quint run <spec_file>.qnt \
  --main=<module> \
  --invariant=<witness_name> \
  --max-steps=100 \
  --max-samples=100 \
  --backend=rust
```

### Result Interpretation

| Output | Result | Meaning | Action |
|--------|--------|---------|--------|
| "An example execution" | VIOLATED | ✅ Protocol CAN progress | Record success |
| "No trace found" | SATISFIED | ⚠️ Scenario unreachable | Progressive increase protocol |

### SUCCESS: Witness Violated

**When**: Witness violated quickly (<50 steps)

**Record**:
```
Status: ✅ VIOLATED
Step: <violation_step>
Seed: <seed>
Interpretation: Protocol CAN reach state
```

### CONCERN: Witness Satisfied

**Phase 1: Progressive Increase**
```
attempt_count = 0
max_steps_values = [100, 200, 500]

For each max_steps in max_steps_values:
  attempt_count++

  Execute: quint run --invariant=<witness> --max-steps=<max_steps> --max-samples=100 --backend=rust

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
Step 1: Run
  Execute: quint run --invariant=<witness> --max-steps=100 --verbosity=3 --backend=rust

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

Step 4: Decision
  If root_cause == "witness_too_strong":
    Weaken witness definition
  Else:
    Stop and ask user for clarifications
    Mark: Liveness unconfirmed (needs longer traces)
```

---

## Invariant Execution Protocol (Safety Checks)

### Purpose

Verify property holds in ALL states by checking invariant is SATISFIED.

### Basic Command Template

```bash
quint run <spec_file>.qnt \
  --main=<module> \
  --invariant=<invariant_name> \
  --max-steps=200 \
  --max-samples=500 \
  --backend=rust
```

### Result Interpretation

| Output | Result | Meaning | Action |
|--------|--------|---------|--------|
| "No violation found" | SATISFIED | ✅ Safety holds | Record success |
| "An example execution" | VIOLATED | ❌ BUG | BUG protocol |

### SUCCESS: Invariant Satisfied

**Record**:
```
Status: ✅ SATISFIED
Samples: <number_of_samples>
```

**Optional: Increase Coverage**
```
Execute: quint run with higher max-steps and max-samples
If still satisfied: Keep satisfied status
Else if violated: Proceed to BUG Protocol
```

### BUG: Invariant Violated

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
    --verbosity=3 \
    --main=<module> \
    --backend=rust

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
  Assess: Bug in spec logic or incorrect invariant
  Hypothesize: "<possible reason for violation>"
  If incorrect invariant suspected:
    Ask user to review invariant definition
  If spec bug suspected:
    Prepare for issue creation
```

**Phase 3: Documentation**
```
Create issue:
  id: "ISSUE-<number>"
  type: "bug"
  category: "invariant_violation"
  title: "<invariant_name> violated"
  description: "<what went wrong based on trace>"
  evidence: "<state snapshot at violation>"
  reproduction: "quint run <test_file> --main=<module> --invariant=<name> --seed=<seed>"
  root_cause_hypothesis: "<inferred cause from trace analysis>"
  remediation: "<specific fix suggestion based on hypothesis>"

Write issue as code comment for future reference
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

### Result Interpretation

| Output | Result | Action |
|--------|--------|--------|
| "All tests passed" | PASSED | Record success |
| "failed" | FAILED | FAILURE protocol |

### SUCCESS: Test Passed

**Record**:
```
Status: ✅ PASSED
Test: <test_name>
Time: <execution_time>
```

### FAILURE: Test Failed

**Phase 1: Diagnosis**
```
Step 1: Get Detailed Output
  Execute: quint test <file> --main=<module> --match="<failing_test>" --verbosity=3

  Extract:
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

Check: Is expected value correct? [yes/no]

If yes (spec is wrong):
  failure_type = "spec_bug"
  severity = "high"
Else (test is wrong):
  failure_type = "test_bug"
  severity = "medium"

Record: Write brief summary as code comment for future reference
```

**Phase 3: Issue Creation**
```
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

## Trace Analysis Protocol

### When to Use:

- Invariant violated (need to see how)
- Witness never violated (need to see why)
- Debugging any unexpected behavior

### Command Pattern

```bash
quint run <test_file>.qnt \
  --main=<module> \
  --invariant=<name> \
  --seed=<specific_seed> \
  --verbosity=<verbosity_level> \
  --max-steps=<N> \
  --backend=rust
```

### Analysis Steps

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
If debugging: Use --verbosity=3
If understanding final state: Use --verbosity=2
If first run: Use --verbosity=1

---

## Iteration Decision Matrix

### Compilation Errors

| Symptom | Root Cause | Action | Max Attempts |
|---------|------------|--------|--------------|
| Parse error in test file | Syntax error | Fix syntax, re-parse | 3 |
| Typecheck error in test | Missing import, wrong type | Add import or fix type | 3 |

**Protocol**:
```
attempt_count = 0

While error persists:
  attempt_count++
  Identify error type from message
  Apply fix from table above
  Re-run compilation

  If success: Break
  Else: Continue

If attempt_count >= 3 AND still failing:
  Escalate to user
```

### Witness Never Violated

```
If witness satisfied after max-steps=1000:
  Analyse trace
  If no_actions_executed:
    → Protocol stuck at init, check init conditions
  Else if actions_loop_infinitely:
    → Liveness bug or witness too strong

  Decision:
    If liveness_bug_suspected:
      Create issue with type="suspect", severity="high"
    Else:
      Weaken witness and retry
```

### Invariant Violated at Step 0

```
If invariant violated at step 0:
  Check: Does init state satisfy invariant? [yes/no]

  If no:
    root_cause = "init_bug"
    Action: Fix init to satisfy invariant
  Else:
    root_cause = "invariant_too_strong"
    Action: Weaken invariant to allow valid init states

  Re-run verification
  Document: Write brief code comment explaining fix
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

Else if witnesses_not_satisfied > 0:
  overall_status = "liveness_concerns"
  severity = "high"

Else if tests_failed > 0:
  overall_status = "test_failures"
  severity = "high"

Else if all_expected_passed:
  overall_status = "success"

Else:
  overall_status = "requires_attention"
```

---

## Quality Standards Checklist

### Test Design

Check before execution:
- [ ] Minimum 5 witnesses defined
- [ ] Minimum 3 invariants defined
- [ ] Minimum 15 deterministic tests (with 5+ Byzantine scenarios), excluding tests for spells
- [ ] Test file compiles (parse + typecheck pass)
- [ ] Module instances detected if parameterized spec

### Execution Completeness

Check during execution:
- [ ] All witnesses executed with max-steps >= 100
- [ ] All invariants executed with max-samples >= 500
- [ ] All deterministic tests executed
- [ ] Seeds recorded for all violations

### Result Analysis

Check after execution:
- [ ] Witness results interpreted correctly (violated = good)
- [ ] Invariant results interpreted correctly (satisfied = good)
- [ ] Test failures categorized (spec bug vs test bug)
- [ ] All bugs have reproduction commands
- [ ] Root cause hypotheses provided for all bugs

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

Ask user for clarification before proceeding
```

---

## Guardrails

### ALWAYS Do

- ✅ Execute tests in separate `<spec_name>_test.qnt` file
- ✅ Import spec: `import <spec>.* from "./<spec>"`
- ✅ Run witnesses with multiple max-steps values
- ✅ Run invariants with high sample counts
- ✅ Record seeds for all violations
- ✅ Test all module instances if parameterized spec
- ✅ Provide reproduction commands for all failures

### NEVER Do

- ❌ Modify original spec file during verification
- ❌ Assume first run is conclusive (try multiple seeds)
- ❌ Ignore witness satisfied warning (potential liveness issue)
- ❌ Proceed if test file doesn't compile
- ❌ Report success if any issues found
- ❌ Skip module instances in parameterized specs
- ❌ Use quint test command without the --match argument

---
