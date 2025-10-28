# Verifier: Test Execution and Result Interpretation Protocols

**Version**: 4.0.0

**Purpose**: Reference for executing witnesses, invariants, and deterministic tests with decision trees for result interpretation.

**When to use**: During verification execution (execute:e-witnesses, execute:e-invariants, execute:e-tests) and when classifying results.

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

  **Detect Constraints**
   - Search for constraint comments or formulas
   - Common patterns:
     - `// Assumption: N = 3f + 1`
     - `// Constraint: N > 3f`
     - `assume N = 3*f + 1`
   - Extract: List of constraint formulas
   - Store: constraints

  **Generate Configuration Suggestions**
    - Identify: Fault parameter (f, t, faulty, Byzantine, etc.)
    - Based on constraints, suggest valid configurations:
      - **Minimal**: Smallest values satisfying constraints (e.g., N=4, f=1)
      - **Faulty**: Maximum fault tolerance (e.g., N=4, f=2)
    - Generate 2-4 configuration options

  **Query User for Configuration**
    - Use AskUserQuestion:
      ```json
      {
        "questions": [{
          "question": "Select configuration(s) for test generation:",
          "header": "Config",
          "multiSelect": true,
          "options": [
            {
              "label": "Minimal (N=4, f=1)",
              "description": "Smallest valid configuration"
            },
            {
              "label": "Faulty (N=4, f=2)",
              "description": "Violation of Assumptions"
            },
            {
              "label": "Custom",
              "description": "Specify parameter values manually"
            }
          ]
        }]
      }
      ```
    - If "Custom": Prompt for each parameter value
    - Validate: Check constraints are satisfied
    - Store: selected_configs (list of parameter name-value pairs)
    - Note: Multiple configurations can be selected for comprehensive testing

**Display Selected Configuration(s)**
    - Output:
      ```
      ✓ Configuration(s) selected:
        Config 1: {module_name}({param1}={value1}, {param2}={value2}, ...)
        Config 2: {module_name}({param1}={value1b}, {param2}={value2b}, ...)
        ...
      ```
    - Store: module_instances list

  **Create Module Instance Plan**
    - If configurations selected:
      - Plan: Multiple module instances (one per config)
      - Example: `MinimalAlgorithm`, `FaultyAlgorithm`
    - If no parameters:
      - Plan: Single module


  **Test Execution**
  ```
  For each configuration:
    Execute: quint run <spec_file> --main=<config> --invariant=<name> --backend=rust
    Track: Which configs pass/fail
  ```

---

## Witness Execution Protocol (Is my protocol reaching interesting states?)

### Purpose

Verify protocol can make progress by checking witness is VIOLATED.

### Basic Command Template

```bash
quint run <spec_file>.qnt \
  --main=<module> \
  --invariant=<witness_name> \
  --max-steps=100 \
  --max-samples=100
  --backend=rust
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
  → CONCERN Protocol (witness satisfied = potential bug in specifications)
```

### SUCCESS Protocol: Witness Violated

**When**: Witness violated quickly (<50 steps)

**Actions**:
```
Step 1: Record Success
  Status: ✅ VIOLATED
  Step: <violation_step>
  Seed: <seed>
  Interpretation: Protocol CAN reach interesting state

Step 2: Move to Next Witness
  No further action needed for this witness
```

### CONCERN Protocol: Witness Satisfied

**When**: Witness satisfied after max-samples and max-steps

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

If root_cause == "need_more_steps" or root_cause == "liveness_bug":
  Action: Stop here and ask user for clarifications
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
  --max-samples=500
  --backend=rust
```

### Result Interpretation Decision Tree

```
Execute invariant
Check output:

If output contains "No violation found":
  result = "satisfied"
  → SUCCESS Protocol (invariant satisfied = safety holds)

Else if output contains "An example execution":
  result = "violated"
  Extract: seed, step_number
  → BUG Protocol (invariant violated = BUG)
```

### SUCCESS Protocol: Invariant Satisfied

**When**: Invariant satisfied after sampling

**Standard Verification**:
```

Step 1: Record Success
  Status: ✅ SATISFIED
  Samples: <number_of_samples>

Step 2: Increase Coverage
  Execute: quint run with higher max-steps and max-samples
  If still satisfied:
    Keep satisfied status
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
  Assess: Was it due to bug in spec logic or incorrect invariant
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
  reproduction: "quint run <test_file> --main=<module> --invariant=<name> --seed=<seed> --mbt"
  root_cause_hypothesis: "<inferred cause from trace analysis>"
  remediation: "<specific fix suggestion based on hypothesis>"

Write issue as a code comment for future reference
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

If failure:
  Check: Is expected value correct? [yes/no]

  If yes (spec is wrong):
    failure_type = "spec_bug"
    severity = "high"
  Else (test is wrong):
    failure_type = "test_bug"
    severity = "medium"

Record:
  Write brief summary of failure as a code comment for future reference

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

**Decision Tree**:
```
If witness satisfied after max-steps=1000:

  Step 1: Run MBT trace
    Execute: quint run --invariant=<witness> --mbt --max-steps=50

    If no_actions_executed:
      → Protocol stuck at init
      → Check init conditions
    Else if actions_loop_infinitely:
      → Liveness bug in spec or witness too strong
      → Think hard about witness definition and spec logic

  Step 2: Decision
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

  Step 4: Document
    Write a brief code comment on this issue and explain the fix if any
```

---

## MBT (Model-Based Trace) Usage Protocol

### When to Use MBT

**Conditions**:
- Invariant violated (need to see how)
- Witness never violated (need to see why)
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
  --backend=rust
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
If first run:
  Use: --verbosity=1
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

Else if witnesses_violated == expected AND invariants_satisfied == expected AND tests_passed == expected:
  overall_status = "success"

Else:
  overall_status = "requires_attention"
```

**Step 3: Generate Report**
```
Create verification-report.json with:
  - overall_status
  - summary statistics
  - issues (classified by type and severity)
  - requirements_coverage (if available)
  - reproduction_commands
```

---

## Quality Standards Checklist

### Test Design

Check before execution:
- [ ] Minimum 5 witnesses defined
- [ ] Minimum 3 invariants defined
- [ ] Minimum 15 deterministic tests (with 5+ Byzantine scenarios), excluding tests for spells and other non-core logic
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

### Reporting

Check before returning:
- [ ] Overall status determined correctly
- [ ] Issues flagged prominently

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
- ❌ Proceed if test file doesn't compile
- ❌ Report success if any issues found
- ❌ Skip module instances in parameterized specs
- ❌ Use the quint test command without the match argument

