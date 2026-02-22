---
command: /verify:explain-trace
description: Run Quint simulator on invariant/witness and explain trace in structured format
version: 1.0.0
---

# Explain Trace Command

## Objective

Run Quint simulator against a specification with an invariant or witness, then provide a structured, human-readable explanation of what happened in the execution trace.

## Input Contract

### Required Parameters
- `spec_path`: Path to Quint specification file (.qnt)
- `check_name`: Name of the invariant to check
- `check_type`: How to interpret the result
  - `"safety"`: Safety property (violation = bug, no violation = good)
  - `"witness"`: Reachability check (violation = scenario reached = good, no violation = scenario unreachable)

### Optional Parameters
- `max_steps`: Maximum trace length (default: 50)
- `max_samples`: Maximum random samples (default: 1000)
- `seed`: Specific seed for reproduction (optional)

## Output Contract

### Success - Violation Found
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trace Explanation: {check_name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Check Type: {safety | witness}
Result: VIOLATED
Trace Length: {N} steps
Seed: {seed_value}

════════════════════════════════════════════════════════

Initial State (Step 0):
  Key Variables:
    • variable_name = value
    • another_var = value

  Summary: Brief description of initial configuration

────────────────────────────────────────────────────────

Step 1: action_name(param1, param2)
  State Changes:
    • variable_name: old_value → new_value
    • another_var: old_value → new_value

  Explanation: What this action accomplished

────────────────────────────────────────────────────────

Step 2: another_action(params)
  State Changes:
    • ...

  Explanation: ...

────────────────────────────────────────────────────────

... (continues for all steps)

────────────────────────────────────────────────────────

Final State (Step N):
  Key Variables:
    • variable_name = final_value

  {For safety property (check_type=safety)}:
  ❌ SAFETY VIOLATION: Invariant '{check_name}' is FALSE
  Why it failed: Explanation of why the invariant is violated
  This indicates a bug in the specification.

  {For witness (check_type=witness)}:
  ✓ SCENARIO REACHED: Invariant '{check_name}' violated (expected!)
  What was proven: Explanation of what scenario was demonstrated
  This proves the scenario is reachable in the specification.

════════════════════════════════════════════════════════

Summary:
  {High-level narrative of what happened across the entire trace}

Reproduction Command:
  quint run {spec_path} --invariant={check_name} \
    --seed={seed} --max-steps={max_steps} \
    --verbosity=3 --backend=rust

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Success - No Violation Found
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trace Explanation: {check_name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Check Type: {safety | witness}
Result: NO VIOLATION FOUND

Simulation Details:
  • Max steps: {max_steps}
  • Max samples: {max_samples}
  • Samples explored: {actual_samples}

{For safety property (check_type=safety)}:
✓ PROPERTY HOLDS: No violation found in {samples} random executions
This suggests the invariant is likely correct, though not formally proven.

{For witness (check_type=witness)}:
⚠️  SCENARIO NOT REACHED: Could not find path to goal in {samples} attempts
The invariant was never violated, meaning the scenario is not reachable.

Possible reasons:
  1. Scenario is genuinely unreachable (spec too constrained)
  2. Scenario is rare (need more samples)
  3. Scenario requires longer traces (need more steps)

Recommendations:
  • Increase max-steps: --max-steps=100
  • Increase max-samples: --max-samples=5000
  • Review spec constraints and action preconditions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Failure
```
❌ Failed to explain trace

Error: {specific error description}
Phase: {parse | typecheck | execution | analysis}

{Error details and recovery suggestions}
```

## Execution Procedure

### Phase 1: Validation

**Steps**:

1. **Validate Spec Path**
   - Check spec_path exists
   - If not: Return error "Spec file not found: {path}"

2. **Parse Spec**
   - Run: `quint parse {spec_path}`
   - Capture output
   - If fails: Return error with parse errors

3. **Typecheck Spec**
   - Run: `quint typecheck {spec_path}`
   - Capture output
   - If fails: Return error with type errors

4. **Detect Main Module**
   - Read spec file
   - Grep for module with `action init`
   - Store: module_name
   - If multiple or none found: Ask user which module to use

5. **Verify Check Exists**
   - Grep spec for: `val {check_name}` or `pure val {check_name}`
   - If not found: Return error "Check '{check_name}' not found in spec"

### Phase 2: Execution

**Steps**:

6. **Build Quint Command**
   - Base: `quint run {spec_path} --main={module_name} --invariant={check_name} --backend=rust`
   - Add: `--max-steps={max_steps}`
   - Add: `--max-samples={max_samples}`
   - If seed provided: Add `--seed={seed}`
   - Add: `--verbosity=3` (for detailed trace output)

7. **Execute Quint**
   - Run command
   - Capture: stdout and stderr
   - Capture: exit code
   - Store: raw_output

8. **Determine Outcome**
   - Parse raw_output for result indicators:
     - Violation found: Exit code 1 + "found" in output
     - No violation: Exit code 0 + "ok" in output
     - Error: Other exit codes
   - Store: outcome (violated | satisfied | error)

### Phase 3: Trace Parsing

**Steps**:

9. **Extract Trace Information**
   - If outcome == satisfied or error:
     - Skip trace parsing
     - Jump to Phase 4

   - If outcome == violated:
     - Parse raw_output for trace
     - Extract:
       - Seed value (for reproduction)
       - Number of steps
       - Each state in trace
       - Each action executed

10. **Parse State Snapshots**
    - Per state in trace:
      - Extract variable assignments
      - Format: `variable_name = value`
      - Store in structured format:
        ```json
        {
          "step": 0,
          "variables": {
            "var1": "value1",
            "var2": "value2"
          }
        }
        ```

11. **Parse Action Calls**
    - Per transition in trace:
      - Extract action name
      - Extract parameters (if shown)
      - Store: `{action: "action_name", params: [...]}`

12. **Compute State Diffs**
    - For each step N:
      - Compare state[N] with state[N-1]
      - Identify changed variables
      - Store: `{variable: "x", old: "a", new: "b"}`

### Phase 4: Trace Analysis

**Steps**:

13. **Identify Key Variables**
    - Read spec to identify important state variables
    - Patterns to prioritize:
      - Variables mentioned in check definition
      - Collections (sets, maps, lists) - often model key system state
      - Variables with "decided", "round", "phase", "leader" in name
      - Variables that change frequently in trace
    - Store: key_variables list

14. **Summarize Initial State**
    - Extract values of key_variables at step 0
    - Generate natural language summary:
      - "System initialized with N nodes"
      - "All nodes in {phase} phase"
      - "Initial value = {value}"

15. **Explain Each Step**
    - Per step N:
      - Action executed: Extract action name and params
      - State changes: Get diff from step 12
      - Generate explanation:
        - What changed: List modified variables
        - Why it matters: Relate to key variables and check
        - Progress indicator: How does this move toward/away from violation

16. **Explain Final State**
    - Extract final state values
    - Since violation was found:
      - Identify which part of invariant is false
      - Explain why (which variable values cause falsity)
    - Interpret based on check_type:
      - If safety: This is a bug
      - If witness: This proves the scenario is reachable

17. **Generate Narrative Summary**
    - Create high-level story:
      - Beginning: Initial configuration
      - Middle: Key events/transitions
      - End: Why check succeeded/failed
    - Use simple language, avoid jargon where possible

### Phase 5: Formatting & Output

**Steps**:

18. **Format Structured Output**
    - Use output template (see Output Contract above)
    - Fill in:
      - Header with check info
      - Initial state summary
      - Per-step explanations
      - Final state and result
      - Overall narrative
      - Reproduction command

19. **Highlight Critical Information**
    - Use visual separators (━, ─, ═)
    - Use symbols: ✓ (success), ❌ (violation), ⚠️ (warning)
    - Bold/emphasize: Variable names, action names, outcomes

20. **Display Output**
    - Print formatted explanation
    - Ensure readability in monospace terminal font

## Tools Used

- `Bash(quint)`: Execute Quint CLI commands (parse, typecheck, run)
- `Read`: Read spec file for analysis
- `Grep`: Extract module names, variable declarations, check definitions

## Error Handling

### Spec Not Found
- **Condition**: spec_path does not exist
- **Action**: Display error message with path
- **Recovery**: User provides correct path

### Parse/Typecheck Failure
- **Condition**: Quint parse or typecheck fails
- **Action**: Display Quint error messages
- **Recovery**: User fixes spec, retries command

### Check Not Found
- **Condition**: check_name doesn't exist in spec
- **Action**: List available checks in spec
  ```
  ❌ Check 'myCheck' not found

  Available checks in spec:
    • agreement (invariant)
    • validity (invariant)
    • canDecide (witness)
  ```
- **Recovery**: User provides correct check name

### Quint Execution Error
- **Condition**: Quint run fails with error
- **Action**: Display Quint error output
- **Recovery**: Depends on error (fix spec, adjust parameters, etc.)

### Trace Parsing Failure
- **Condition**: Cannot parse Quint output format
- **Action**: Fall back to showing raw output
  ```
  ⚠️  Could not parse trace automatically

  Raw Quint output:
  {raw_output}
  ```
- **Recovery**: Manual inspection or report parsing issue

## Implementation Notes

### Quint Output Format

Quint run with `--verbosity=3` outputs traces like:
```
[State 0]
{
  variable1: value1,
  variable2: value2
}

[Action: actionName]

[State 1]
{
  variable1: new_value1,
  variable2: value2
}

...

[violation] Found an issue (1234ms)
```

Parse this format to extract state and action information.

### State Diff Algorithm

Simple approach:
```
for each variable in state[N]:
  if state[N][variable] != state[N-1][variable]:
    record change: (variable, state[N-1][variable], state[N][variable])
```

### Explanation Generation

Use LLM (Claude) to generate natural language explanations:
- Input: Variable changes + action name + check definition
- Prompt: "Explain what this action accomplished in the context of checking {check_name}"
- Output: 1-2 sentence explanation

## Example Usage

### Example 1: Checking an Invariant

**Input**:
```
/verify:explain-trace \
  --spec_path=specs/consensus.qnt \
  --check_name=agreement \
  --check_type=invariant \
  --max_steps=50
```

**Output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trace Explanation: agreement
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Check Type: invariant
Result: VIOLATED
Trace Length: 12 steps
Seed: 0x1a2b3c4d

════════════════════════════════════════════════════════

Initial State (Step 0):
  Key Variables:
    • nodes = {0, 1, 2, 3}
    • decided = Map()
    • votes = Map()
    • quorum_size = 3

  Summary: 4 nodes initialized, none have decided yet

────────────────────────────────────────────────────────

Step 1: propose(0, 5)
  State Changes:
    • proposals[0]: None → Some(5)
    • phase[0]: Request → Prepare

  Explanation: Node 0 proposes value 5 and moves to Prepare phase

────────────────────────────────────────────────────────

Step 2: vote(1, 5)
  State Changes:
    • votes[1]: None → Some(5)

  Explanation: Node 1 votes for value 5

────────────────────────────────────────────────────────

Step 3: vote(2, 5)
  State Changes:
    • votes[2]: None → Some(5)

  Explanation: Node 2 votes for value 5 (quorum of 3 now reached)

────────────────────────────────────────────────────────

Step 4: decide(0, 5)
  State Changes:
    • decided[0]: None → Some(5)

  Explanation: Node 0 receives quorum and decides on value 5

────────────────────────────────────────────────────────

Step 5: byzantine_equivocate(3, 7)
  State Changes:
    • byzantine_actions[3]: [] → [Equivocate(7)]

  Explanation: Byzantine node 3 sends conflicting value 7

────────────────────────────────────────────────────────

Step 6: vote(3, 7)
  State Changes:
    • votes[3]: None → Some(7)

  Explanation: Node 3's byzantine vote for value 7 is recorded

────────────────────────────────────────────────────────

... (steps 7-11)

────────────────────────────────────────────────────────

Final State (Step 12):
  Key Variables:
    • decided[0] = Some(5)
    • decided[1] = Some(7)

  ❌ VIOLATION: Invariant 'agreement' is FALSE
  Why it failed: Two nodes decided on different values (5 and 7).
  The agreement invariant requires all decided values to be identical,
  but node 0 decided 5 while node 1 decided 7.

════════════════════════════════════════════════════════

Summary:
  The protocol violated agreement due to Byzantine equivocation. Node 0
  formed a quorum with value 5 and decided, while Byzantine node 3 sent
  conflicting votes allowing node 1 to form a different quorum with
  value 7. This indicates the quorum size (3) is insufficient for
  Byzantine fault tolerance with 1 faulty node. A Byzantine quorum of
  2f+1 = 3 is too small; 3f+1 = 4 would be needed.

Reproduction Command:
  quint run specs/consensus.qnt --main=consensus \
    --invariant=agreement --seed=0x1a2b3c4d \
    --max-steps=50 --verbosity=3 --backend=rust

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Example 2: Checking a Witness

**Input**:
```
/verify:explain-trace \
  --spec_path=specs/consensus.qnt \
  --check_name=canDecide \
  --check_type=witness \
  --max_steps=30
```

**Note**: The witness `canDecide` is defined as: `val canDecide = not(exists(n => decided.get(n) != None))`
This asserts "no node has decided". We want this to be VIOLATED to prove decision is reachable.

**Output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trace Explanation: canDecide
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Check Type: witness
Result: VIOLATED (scenario reached ✓)
Trace Length: 8 steps
Seed: 0xaabbccdd

════════════════════════════════════════════════════════

Initial State (Step 0):
  Key Variables:
    • nodes = {0, 1, 2, 3}
    • decided = Map()

  Summary: 4 nodes initialized, none have decided

────────────────────────────────────────────────────────

Step 1: propose(0, 42)
  State Changes:
    • proposals[0]: None → Some(42)

  Explanation: Node 0 proposes value 42

────────────────────────────────────────────────────────

... (steps 2-7)

────────────────────────────────────────────────────────

Final State (Step 8):
  Key Variables:
    • decided[0] = Some(42)

  ✓ SCENARIO REACHED: Invariant 'canDecide' violated (expected!)
  What was proven: At least one node reached a decision (decided[0] = Some(42)).
  The invariant "no node has decided" is false, which proves decision is reachable.
  This witness confirms the protocol can terminate successfully.

════════════════════════════════════════════════════════

Summary:
  The witness successfully demonstrated that decision is reachable.
  Starting from an initial state, node 0 proposed value 42, received
  sufficient votes to form a quorum, and decided. The invariant violation
  (expected for a witness) proves the specification is not vacuous and
  the decision mechanism works.

Reproduction Command:
  quint run specs/consensus.qnt --main=consensus \
    --invariant=canDecide --seed=0xaabbccdd \
    --max-steps=30 --verbosity=3 --backend=rust

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
