---
command: /interactive:test-listeners-reachablity
description: Generate test runs from witness-based counterexamples (choreo framework only)
version: 5.0.0
---

# Generate Scenario Tests Command

## Objective

Generate documented `run` definitions by:
1. Instrumenting spec with custom logging effects
2. Using witnesses to find reachable executions
3. Converting counterexample traces to test runs

**Choreo framework only** - Standard framework not yet supported.

## File Operation Constraints

**CRITICAL**: All files MUST be written within workspace.
- NEVER use `/tmp` or system temp directories
- Instrumented spec: `<spec_dir>/<spec_name>_instrumented.qnt`
- Final test file: `<spec_dir>/<spec_name>_tests.qnt`
- Always use the rust backend for quint run command for speed: `quint run --backend=rust ...`

## Input Contract

### Required Parameters
- `spec_path`: Path to specification file (must use choreo framework)

### Optional Parameters
- `output_path`: Path for generated test file (default: `<spec_dir>/<spec_name>_tests.qnt`)
- `max_steps`: Maximum steps for witness search (default: 50)
- `target_actions`: Specific actions to document (default: auto-detect)

## Output Contract

### Success
```
✅ Test suite generated successfully!

Test file: specs/consensus_tests.qnt

Target Actions Documented:
  • broadcast_prevote (3 different traces)
  • decide_on_proposal (2 different traces)
  • lock_value_and_precommit (2 different traces)
  • Total: 7 test runs

All tests compiled and passed ✓

Next steps:
  Run tests:    quint test specs/consensus_tests.qnt --main=consensus_tests --match=".*"
  List tests:   grep "^  run " specs/consensus_tests.qnt
```

### Failure (Standard Framework)
```
❌ Standard framework not supported

Spec uses standard Quint framework (no choreo import).

This command only supports choreo framework specs.
For standard framework, use manual test writing with:
  .claude/guidelines/test-debugging.md

Detected framework: standard
```

### Failure (Other)
```
❌ Failed to generate tests

Error: Could not find witnesses for action 'broadcast_prevote'
Phase: Witness execution

Try increasing --max-steps or check if action is reachable.
```

## Execution Procedure

### Phase 1: Framework Detection

**Objective**: Verify spec uses choreo framework.

**Steps**:

1. **Read Specification**
   - Read spec_path file
   - Store: file_content

2. **Detect Framework**
   - Check for choreo import: `grep "import.*choreo" spec_path`
   - If NOT found:
     - Display error:
       ```
       ❌ Standard framework not supported

       Spec does not import choreo framework.

       This command only supports choreo framework specs.
       For standard framework, use manual test writing.

       Detected framework: standard
       ```
     - Exit with status="unsupported_framework"
   - If found:
     - Output: "✓ Detected choreo framework"
     - Continue to Phase 2

3. **Detect Module and Main Listener**
   - Find main module: Module containing `import choreo`
   - Store: module_name
   - Find main listener: Grep for `def.*main_listener` or `def.*listener.*LocalContext`
   - Store: main_listener_name

### Phase 2: Configuration Detection and Selection

**Objective**: Determine module configuration for parameterized specs.

**Steps**:

4. **Detect Parameters**
   - Grep for `const` declarations in module
   - Extract: Parameter names and types
   - Example: `const N: int`, `const f: int`
   - If no parameters found:
     - Output: "Spec is not parameterized"
     - Use module_name as-is
     - Skip to Phase 3
   - Store: List of (param_name, param_type) pairs

5. **Detect Constraints**
   - Search for constraint comments or formulas
   - Common patterns:
     - `// Assumption: N = 3f + 1`
     - `// Constraint: N > 3f`
     - `assume N = 3*f + 1`
   - Extract: List of constraint formulas
   - Store: constraints

6. **Generate Configuration Suggestions**
   - Based on constraints, suggest valid configurations:
     - **Minimal**: Smallest values satisfying constraints (e.g., N=4, f=1)
     - **Typical**: Realistic values (e.g., N=7, f=2)
   - Generate 2-3 configuration options

7. **Query User for Configuration**
   - Use AskUserQuestion:
     ```json
     {
       "questions": [{
         "question": "Select configuration for test generation:",
         "header": "Config",
         "multiSelect": false,
         "options": [
           {
             "label": "Minimal (N=4, f=1)",
             "description": "Smallest valid configuration"
           },
           {
             "label": "Typical (N=7, f=2)",
             "description": "Realistic production values"
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
   - Store: selected_config (parameter name-value pairs)

8. **Display Selected Configuration**
   - Output:
     ```
     ✓ Configuration selected:
       Module: {module_name}
       Parameters: {param1}={value1}, {param2}={value2}, ...
     ```
   - Store: module_instance = `{module_name}({param1}={value1}, ...)`

### Phase 3: Target Action Selection

**Objective**: Determine which actions to document with tests.

**Steps**:

9. **Extract Actions from Main Listener**
   - Read main_listener definition
   - Extract all actions from `choreo::cue()` calls
   - Pattern: `choreo::cue(ctx, <listener>, <action>)`
   - Store: List of (listener, action, uses_cue) tuples
   - Example: `[(listen_proposal, broadcast_prevote, true), (on_timeout, skip_window, false), ...]`
   - Note: `uses_cue=true` for listeners with `choreo::cue()`, `uses_cue=false` for direct timeout/internal listeners

10. **Query User for Target Actions**
   - If target_actions parameter provided:
     - Use specified actions
   - Else:
     - Use AskUserQuestion:
       ```json
       {
         "questions": [{
           "question": "Which actions would you like to document with tests?",
           "header": "Actions",
           "multiSelect": true,
           "options": [
             {
               "label": "broadcast_prevote",
               "description": "Action triggered by listen_proposal listener"
             },
             {
               "label": "decide_on_proposal",
               "description": "Action triggered by listen_decision listener"
             },
             {
               "label": "All actions",
               "description": "Generate tests for all detected actions"
             }
           ]
         }]
       }
       ```
   - If "All actions": Select all detected (listener, action) pairs
   - Store: target_actions list

### Phase 4: Spec Instrumentation

**Objective**: Add custom logging effects to track action execution.

**Steps**:

11. **Generate Log Type**
   - Per target action, create log variant:
     ```quint
     type LogType =
       | BroadcastPrevote({ process: ProcessID, params: <param_type> })
       | DecideOnProposal({ process: ProcessID, params: <param_type> })
       | ...
     ```
   - Extract parameter types from action signatures

12. **Add Extensions to GlobalContext**
   - Find GlobalContext/Extensions type definition
   - Add log field:
     ```quint
     type Extensions = {
       // ... existing fields
       log: LogType
     }
     ```

13. **Instrument Actions with Custom Effects**
   - Per target action:
     - Find action definition in spec
     - Add custom effect at end of action:
       ```quint
       pure def broadcast_prevote(ctx: LocalContext, params: ...) = {
         // ... existing logic
         val effects = s1.effects.union(Set(
           choreo::CustomEffect(Log(BroadcastPrevote({
             process: ctx.state.process_id,
             params: params
           })))
         ))
         { effects: effects, post_state: s1.post_state }
       }
       ```

14. **Create apply_custom_effect Function**
   - Generate:
     ```quint
     def apply_custom_effect(env: GlobalContext, effect: CustomEffects): GlobalContext =
       match effect {
         | Log(logType) => {
           { ...env, extensions: { ...env.extensions, log: logType } }
         }
         | _ => env
       }
     ```

15. **Add Displayer Functions**
    - Create displayer:
      ```quint
      pure def displayer(ctx) = {
        ctx.extensions.log
      }
      ```
    - Add init_displayer:
      ```quint
      action init_displayer = choreo::init_with_displayer({
        system: <original_init_system>,
        messages: <original_init_messages>,
        events: <original_init_events>,
        extensions: <original_init_extensions>
      }, displayer)
      ```
    - Replace step action:
      ```quint
      action step = choreo::step_with_displayer(
        main_listener,
        apply_custom_effect,
        displayer
      )
      ```

16. **Write Instrumented Spec**
    - Construct instrumented file with all additions
    - Write to: `<spec_dir>/<spec_name>_instrumented.qnt`
    - Note: Instrumented spec should contain the base module (with parameters as `const` declarations), not a specific instance
    - Validate: `quint typecheck <instrumented_spec>`
    - If typecheck fails:
      - Display error with details
      - Exit with status="instrumentation_failed"

### Phase 5: Witness Generation and Execution

**Objective**: Find counterexamples showing how to reach each target action.

**Steps**:

17. **Generate Witnesses**
    - Per target action, create witness invariant:
      ```quint
      val witness_broadcast_prevote = match choreo::s.extensions.log {
        | BroadcastPrevote(_) => false
        | _ => true
      }
      ```
    - Write witnesses to instrumented spec or separate witness file

18. **Execute Witnesses**
    - Per witness:
      - Run: `quint run <instrumented_spec> --main=<module_instance> --invariant=<witness_name> --max-steps=<max_steps> --hide=<module>::choreo::s --init=init_displayer`
      - Note: Use `module_instance` from Phase 2 (e.g., `consensus(N=7, f=2)`) if spec is parameterized
      - **Expected**: Invariant violation (action was reached)
      - If timeout or satisfied:
        - Increase max-steps automatically (try 50, 100, 200, 500)
        - If still satisfied after max retries:
          - Display warning:
            ```
            ⚠️  Could not find execution reaching action: {action_name}

            Tried up to {max_steps} steps without violation.

            This action may be:
            - Unreachable (check preconditions)
            - Rare (needs many more steps)
            - Requires specific parameter values

            Skip this action? [yes/no]
            ```
      - If violation found:
        - Capture: Counterexample trace (states and log entries)
        - Store: counterexample for action

19. **Minimize Counterexamples**
    - Per successful counterexample:
      - Binary search for minimum steps:
        - Try max_steps - 1, max_steps - 2, etc.
        - Find smallest N where violation still occurs
      - Run: `quint run ... --max-steps=<N> --seed=<original_seed>`
      - Store: Minimized counterexample

### Phase 6: Test Conversion

**Objective**: Convert counterexample traces to `run` definitions.

**Steps**:

20. **Analyze Counterexample Traces**
    - Per counterexample:
      - Extract state sequence
      - Extract log entries showing which actions were performed
      - Map each state transition to (process, listener, action, params)

21. **Convert to Run Definition**
    - Per counterexample:
      - Start with `init`
      - For each state transition:
        - Extract: process ID from log entry
        - Extract: listener from main_listener structure
        - Extract: action name from log type
        - Extract: params from log data
        - **Determine step type**:
          - If listener uses `choreo::cue()` pattern (has external data): Generate `.then("<process>".with_cue(<listener>, <params>).perform(<action>))`
          - If listener is internal/timeout (no cue pattern): Generate `.then("<process>".step_with(<listener>))`
      - Build complete run definition:
        ```quint
        // Witness trace showing how to reach broadcast_prevote
        // Process p1 broadcasts prevote for proposal v0
        run reach_broadcast_prevote_1 = {
          init
            .then("p1".with_cue(listen_proposal, { value: v0, round: 0 }).perform(broadcast_prevote))
        }
        ```
      - Add descriptive comment based on counterexample

22. **Generate Variant Tests**
    - If multiple counterexamples found for same action:
      - Create separate run for each variant
      - Name: `reach_<action>_1`, `reach_<action>_2`, etc.
    - Include comments explaining what's different

### Phase 7: Test File Generation

**Objective**: Create final test file without instrumentation.

**Steps**:

23. **Build Test Module**
    - Structure:
      ```quint
      module <spec_name>_tests {
        import <module_instance>.* from "./<spec_name>"
        // For parameterized specs: import consensus(N=7, f=2).* from "./consensus"
        // For non-parameterized: import consensus.* from "./consensus"

        // ============================================================
        // DOCUMENTED EXECUTION TRACES
        // ============================================================
        // These tests demonstrate how to reach specific actions
        // Generated from witness-based counterexamples
        // ============================================================

        // --- broadcast_prevote traces ---

        // Trace 1: Simple path with single proposal
        run reach_broadcast_prevote_1 = {
          init
            .then("p1".with_cue(listen_proposal, params1).perform(broadcast_prevote))
        }

        // Trace 2: Path requiring timeout before action
        run reach_broadcast_prevote_2 = {
          init
            .then("p1".step_with(on_propose_timeout))  // Internal timeout event
            .then("p1".with_cue(listen_proposal, params2).perform(broadcast_prevote))
        }

        // --- decide_on_proposal traces ---

        run reach_decide_on_proposal_1 = {
          init
            .then("p1".with_cue(...).perform(...))
            .then("p2".with_cue(...).perform(...))
            .then("p1".with_cue(listen_decision, params).perform(decide_on_proposal))
        }

        // ... more tests
      }
      ```

24. **Write Test File**
    - Write to: output_path
    - Validate: `quint parse <output_path>`
    - Validate: `quint typecheck <output_path>`
    - If validation fails:
      - Display error
      - Exit with status="test_generation_failed"

25. **Execute Tests for Verification**
    - Run: `quint test <output_path> --main=<test_module> --match=".*"`
    - Verify all generated tests pass
    - If any test fails:
      - Display warning:
        ```
        ⚠️  Generated test failed: {test_name}

        This may indicate:
        - Counterexample conversion error
        - Missing preconditions
        - Race condition in trace

        Keep test anyway? [yes/no]
        ```

### Phase 8: Cleanup and Summary

**Objective**: Remove instrumentation, display results.

**Steps**:

26. **Remove Instrumented Spec**
    - Delete: `<spec_name>_instrumented.qnt` (unless user wants to keep for debugging)
    - Ask user via AskUserQuestion:
      ```json
      {
        "questions": [{
          "question": "Keep instrumented spec for debugging?",
          "header": "Cleanup",
          "multiSelect": false,
          "options": [
            {
              "label": "Delete",
              "description": "Remove instrumented file (recommended)"
            },
            {
              "label": "Keep",
              "description": "Keep for manual debugging/inspection"
            }
          ]
        }]
      }
      ```

27. **Display Summary**
    - Output:
      ```
      ✅ Test suite generated successfully!

      Test file: {output_path}

      Target Actions Documented:
        • {action1} ({count1} different traces)
        • {action2} ({count2} different traces)
        • Total: {total_tests} test runs

      Tests Generated From:
        • Witness counterexamples: {successful_witnesses}
        • Unreachable actions: {failed_witnesses}

      All tests compiled and passed ✓

      Next steps:
        Run tests:    quint test {output_path} --main={test_module} --match=".*"
        List tests:   grep "^  run " {output_path}
      ```

## Tools Used

- `Read`: Read spec file, analyze structure
- `Write`: Write instrumented spec and test file
- `Grep`: Extract actions, listeners, patterns
- `Bash(quint)`: Run witnesses, typecheck, test execution
- `AskUserQuestion`: Configuration selection, action selection, cleanup decisions

## Error Handling

### Invalid Configuration
- **Condition**: User-provided parameters violate constraints
- **Action**: Display error and retry
  ```
  ❌ Invalid configuration

  Parameters: N={N}, f={f}
  Constraint violated: N must equal 3f + 1

  Please provide valid parameters.
  ```
- **Recovery**: Re-prompt for parameters

### Standard Framework Detected
- **Condition**: Spec does not import choreo
- **Action**: Display clear error message
  ```
  ❌ Standard framework not supported

  This command only supports choreo framework.

  For standard framework, use manual test writing with:
    .claude/guidelines/test-debugging.md
  ```
- **Recovery**: None, exit with unsupported_framework status

### Instrumentation Typecheck Failure
- **Condition**: Instrumented spec doesn't typecheck
- **Action**: Display error with details
  ```
  ❌ Instrumentation failed

  Added logging to spec but typecheck failed:
  {typecheck_error}

  This may indicate:
  - Incorrect type inference for action parameters
  - Missing type annotations
  - Spec structure incompatible with instrumentation

  Please report this issue with your spec structure.
  ```
- **Recovery**: Exit, user may need to manually instrument

### No Witnesses Found
- **Condition**: All witnesses timeout (no actions reachable)
- **Action**: Display error
  ```
  ❌ No reachable actions found

  Could not find executions reaching any target actions.

  Tried actions: {action_list}
  Max steps: {max_steps}

  This suggests:
  - Actions have very specific preconditions
  - Need significantly more steps
  - Spec may have unreachable code

  Recommendations:
  - Increase --max-steps (try 500 or 1000)
  - Check action preconditions in spec
  - Select fewer, simpler actions
  ```
- **Recovery**: User can retry with different parameters

### Test Execution Failure
- **Condition**: Generated test doesn't pass
- **Action**: Display warning and ask user
  ```
  ⚠️  Generated test failed: {test_name}

  Test converted from counterexample failed to execute.

  Error: {test_error}

  Possible causes:
  - Conversion error (log → test mapping incorrect)
  - Missing parameters or incorrect types
  - Non-deterministic behavior in spec

  Options:
  [1] Keep test (mark as TODO for manual fix)
  [2] Discard test (exclude from final file)
  [3] Debug with verbosity (run with --verbosity=3)
  ```
- **Recovery**: User chooses how to handle

## Example Execution

**Input**:
```
/interactive:generate-scenario-tests \
  --spec_path=specs/consensus.qnt \
  --max_steps=100
```

**Process**:
1. Read specs/consensus.qnt
2. Detect choreo framework ✓
3. Find main_listener with 5 actions
4. Detect parameters: N, f
5. Detect constraint: N = 3f + 1
6. User selects configuration: Typical (N=7, f=2)
7. User selects actions: "broadcast_prevote", "decide_on_proposal"
8. Generate LogType with 2 variants
9. Instrument spec with custom effects
10. Write consensus_instrumented.qnt
11. Typecheck ✓
12. Generate 2 witnesses
13. Run witness for broadcast_prevote with consensus(N=7, f=2) → violation at step 8
14. Minimize → minimum violation at step 5
15. Run witness for decide_on_proposal → violation at step 15
16. Minimize → minimum violation at step 12
17. Convert both traces to run definitions
18. Write consensus_tests.qnt with 2 tests
19. Typecheck ✓
20. Run tests → both pass ✓
21. Delete instrumented spec
22. Display summary

**Output**:
```
✅ Test suite generated successfully!

Test file: specs/consensus_tests.qnt

Target Actions Documented:
  • broadcast_prevote (1 trace, 5 steps)
  • decide_on_proposal (1 trace, 12 steps)
  • Total: 2 test runs

Tests Generated From:
  • Witness counterexamples: 2
  • Unreachable actions: 0

All tests compiled and passed ✓

Next steps:
  Run tests:    quint test specs/consensus_tests.qnt --main=consensus_tests --match=".*"
  List tests:   grep "^  run " specs/consensus_tests.qnt
```
