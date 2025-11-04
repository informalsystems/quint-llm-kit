---
command: /play:open:generate-witness
description: Generate witness scenarios to verify spec can reach interesting execution states
version: 5.0.0
---

# Generate Witness Scenarios Command

## Objective

Generate witness scenarios (existence proofs) that demonstrate the spec can actually reach interesting states and execution paths, serving as sanity checks that the specification is not vacuous or overly constrained.

## File Operation Constraints

**CRITICAL**: Test files MUST be written within workspace.
- NEVER use `/tmp` or system temp directories
- Default: `<spec_dir>/<spec_name>_witnesses.qnt` (same directory as spec)
- If custom path provided, ensure it's within workspace
- Always use the rust backend for quint run command for speed: `quint run --backend=rust ...`

## Input Contract

### Required Parameters
- `spec_path`: Path to specification file

### Optional Parameters
- `output_path`: Path for generated witness file (default: `<spec_dir>/<spec_name>_witnesses.qnt`)
- `max_steps`: Maximum trace length for witnesses (default: 20)
- `scenarios`: Specific scenarios to generate witnesses for (default: auto-detect)

## Output Contract

### Success
```
✅ Witness scenarios generated successfully!

Witness file: specs/consensus_witnesses.qnt

Interesting Scenarios:
  • Decision reached - Can nodes actually decide?
  • Multiple rounds - Can protocol progress through rounds?
  • View change - Can nodes change views/leaders?
  • Quorum formation - Can quorums actually form?


Witnesses Generated:
  • Liveness witnesses: 5 scenarios
  • Reachability witnesses: 7 scenarios
  • Total: 12 witness scenarios

All witnesses compiled successfully ✓

Run witness: quint run specs/consensus_witnesses.qnt --main=valid \
             --invariant=canReachDecision --max-steps=50 --max-samples=1000
Expected: Invariant VIOLATION (proves decision is reachable)
```

### Failure
```
❌ Failed to generate witness scenarios

Error: Could not identify interesting scenarios in spec
Phase: Scenario detection

Please specify scenarios manually or provide spec with clearer structure.
```

## Execution Procedure

### Phase 1: Interesting Scenario Detection

**Objective**: Identify important states/behaviors to witness.

**Steps**:

1. **Read Specification**
   - Read spec_path file
   - Extract module structure

2. **Detect Interesting States**
   - Analyze spec to identify meaningful scenarios:

     **State-based scenarios** (grep state variables):
     - Decision states: `var.*decision` or `var.*decided`
     - Completion states: `var.*done|finished|terminated`
     - Phase transitions: `var.*phase|stage|round`
     - Leader/view changes: `var.*leader|view`

     **Action-based scenarios** (grep actions):
     - Critical actions executed: propose, vote, decide, commit
     - Rare actions executed: timeout, view-change, recovery
     - Multi-step sequences: propose → vote → decide

     **Value-based scenarios** (analyze types/domains):
     - Quorum formation: `|voters| >= quorum_size`
     - Specific values chosen: `decided_value == v` for some v
     - Boundary conditions: exactly f faults, exactly quorum size

   - Store: List of detectable scenarios

3. **Categorize Scenarios**
   - Group scenarios by purpose:

     **Liveness witnesses** (protocol makes progress):
     - "Can protocol terminate/decide?"
     - "Can protocol progress through multiple rounds?"

     **Reachability witnesses** (states are reachable):
     - "Can quorums form?"
     - "Can specific phases/states be reached?"
     - "Can leader changes occur?"
     - "Can timeouts trigger?"

4. **Query User for Scenario Selection**
   - If scenarios parameter provided:
     - Use specified scenarios
   - Else:
     - Use AskUserQuestion:
       ```json
       {
         "questions": [{
           "question": "Which types of witness scenarios should we generate?",
           "header": "Scenarios",
           "multiSelect": true,
           "options": [
             {
               "label": "Liveness",
               "description": "Protocol can terminate, make progress, recover"
             },
             {
               "label": "Reachability",
               "description": "Important states and configurations are reachable"
             }
           ]
         }]
       }
       ```
   - Store: selected_scenario_types

5. **Generate Specific Witness Goals**
   - Per selected scenario type, create concrete witness goals:

     Example for "Liveness":
     - Goal: "Reach decision state"
       - Condition: `exists n. decided[n] != None`
       - Rationale: Verify protocol can actually decide

     - Goal: "Progress through 3 rounds"
       - Condition: `round >= 3`
       - Rationale: Verify protocol not stuck in first round

     Example for "Reachability":
     - Goal: "Form quorum"
       - Condition: `exists Q. |Q| >= quorum_size and all voters in Q voted`
       - Rationale: Verify quorum formation possible

   - Store: List of (goal_name, condition, rationale) tuples

### Phase 2: Witness Scenario Design

**Objective**: Design execution paths that reach witness goals.

**Steps**:

6. **Analyze Spec Structure**
   - Read spec completely
   - Extract:
     - Actions: `grep "action\s+(\w+)"` or `def\s+(\w+).*:\s*bool`
     - State variables: `grep "var\s+(\w+)"`
     - Constants/parameters: `grep "const\s+(\w+)"`
     - Initial state: `grep "action.*init"`
   - Detect framework: Check for `choreo::` imports
   - Store: spec_structure object

7. **Design Witness Path for Each Goal**
   - Per witness goal:

     **Reasoning phase**:
     ```
     Question: What execution path can reach goal "{goal_name}"?

     Goal condition: {condition}
     Rationale: {rationale}

     Analysis:
     - What initial conditions help reach this goal?
     - Which actions must execute to satisfy the condition?
     - What parameter values make success likely?
     - What is a simple/minimal path to the goal?

     Design:
     - Configuration (const values that help)
     - Initial state setup
     - Action sequence likely to reach goal
     - Expected outcome (condition satisfied)
     ```

   - Generate witness scenario:
     ```json
     {
       "name": "{goal_name}Witness",
       "goal": "{goal_name}",
       "condition": "{condition formula}",
       "rationale": "{why this matters}",
       "configuration": {
         "N": 4,
         "f": 1,
         // ... parameter values that help
       },
       "execution_hints": [
         "Start with normal initial state",
         "Have honest nodes propose and vote",
         "Ensure quorum of votes collected",
         // ... guidance for reaching goal
       ],
       "expected_outcome": "Condition {condition} satisfied"
     }
     ```

8. **Create Variants for Robustness**
   - Per base witness:
     - Create variants:
       - Different parameter values (small vs large network)
       - Different execution paths (fast path vs slow path)
       - Different initial conditions (various starting states)
     - Limit: 2-3 variants per base witness

### Phase 3: Witness Invariant Generation

**Objective**: Convert witness goals into invariants that check for reachability.

**Steps**:

9. **Generate Witness Module Header**
   - Detect spec module name and parameters
   - Construct:
     ```quint
     module <spec_name>_witnesses {
       import <spec_module>(
         <param1> = <config_value1>,
         <param2> = <config_value2>,
         ...
       ).* from "./<spec_name>"

       // ============================================================
       // WITNESS INVARIANTS - SANITY CHECKS FOR REACHABILITY
       // ============================================================
       //
       // Purpose: These invariants assert that interesting scenarios
       // have NOT been reached. We use random simulation to try to
       // VIOLATE these invariants, proving scenarios are reachable.
       //
       // Usage: quint run <spec_file>_witnesses.qnt --invariant=<witness_name> --max-steps=N --backend=rust
       //
       // Expected: Invariant should be VIOLATED (proves reachability)
       // ============================================================
     }
     ```

10. **Generate Witness Invariants**
    - Per witness scenario:
      - Convert goal condition to negated invariant
      - Goal: "Can reach decision" → Invariant: "Decision never reached"
      - Build invariant definition:

        ```quint
        // ──────────────────────────────────────────────────────────
        // Witness: {scenario.name}
        // ──────────────────────────────────────────────────────────
        // Goal: {scenario.goal}
        // Condition: {scenario.condition}
        // Rationale: {scenario.rationale}
        //
        // This invariant asserts the scenario is NOT reachable.
        // Random simulation attempts to VIOLATE this invariant.
        //
        // EXPECTED: Invariant violation (proves scenario is reachable)
        //
        // Run: quint run  --invariant={scenario.name} --max-steps={max_steps} --max-samples=1000 --backend=rust
        // ──────────────────────────────────────────────────────────
        val {scenario.name}: bool = not({scenario.condition})
        ```

      - Example:
        ```quint
        // Witness: Can reach decision
        // Goal: Verify nodes can actually decide
        // Condition: exists(n => decided.get(n) != None)
        //
        // EXPECTED: Invariant violation (proves decision reachable)
        val canReachDecision: bool = not(exists(n => decided.get(n) != None))
        ```

11. **Generate Helper Predicates**
    - For complex witness conditions, generate helper predicates:
      ```quint
      // Helper: Check if decision has been reached
      def hasDecided: bool =
        exists(n => decided.get(n) != None)

      // Helper: Check if quorum formed
      def hasQuorum: bool =
        exists(Q => Q.size() >= quorum_size and
                    Q.forall(n => voted.get(n)))

      // Witness using helper
      val canReachDecision: bool = not(hasDecided)
      val canFormQuorum: bool = not(hasQuorum)
      ```

### Phase 4: Configuration Selection

**Objective**: Choose parameter values for witness module.

**Steps**:

12. **Detect Configuration Parameters**
    - Extract const declarations from spec
    - Identify parameters that affect witness scenarios:
      - Network size (N)
      - Fault tolerance (f)
      - Quorum sizes
      - Timeout values

13. **Query User for Configuration Values**
    - Use AskUserQuestion:
      ```json
      {
        "questions": [{
          "question": "How should witness configuration be set?",
          "header": "Config",
          "multiSelect": false,
          "options": [
            {
              "label": "Minimal",
              "description": "Smallest values that make scenarios possible (N=4, f=1)"
            },
            {
              "label": "Typical",
              "description": "Realistic production values (N=7, f=2)"
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
    - Store: Configuration values to use in witness module import

### Phase 5: Validation and Testing

**Objective**: Verify witnesses compile.

**Steps**:

14. **Write Witness File**
    - Construct complete file:
      ```quint
      // -*- mode: Bluespec; -*-
      // Witness invariants for {spec_name}
      // Generated by /play:open:generate-witness-scenarios
      //
      // IMPORTANT: These are REACHABILITY CHECKS via negated invariants.
      // Random simulation tries to VIOLATE these invariants.
      // Violation = scenario is reachable (good!)
      // No violation = scenario may be unreachable (investigate spec)

      module <spec_name>_witnesses {
        import <spec_module>(
          <param1> = <value1>,
          <param2> = <value2>,
          ...
        ).* from "./<spec_name>"

        // ============================================================
        // WITNESS CATALOG
        // ============================================================
        //
        // Total witnesses: {count}
        //
        // Usage:
        //   quint run <file> --main=<spec_module> \
        //     --invariant=<witness_name> \
        //     --max-steps={max_steps} \
        //     --max-samples=1000 --backend=rust
        //
        // Expected: Invariant VIOLATION (proves reachability)
        //
        // Liveness Witnesses ({count}):
        //   • {witness1} - {description}
        //   • {witness2} - {description}
        //
        // Reachability Witnesses ({count}):
        //   • {witness1} - {description}
        //   ...
        //
        // ============================================================

        // --- Helper Predicates ---
        <helper predicates for complex conditions>

        // --- Liveness Witnesses ---
        <liveness witness invariants>

        // --- Reachability Witnesses ---
        <reachability witness invariants>
      }
      ```
    - Write to output_path

15. **Validate Compilation**
    - Run: `quint parse <output_path>`
    - If fails: Attempt fixes, report error if cannot resolve
    - Run: `quint typecheck <output_path>`
    - If fails: Attempt fixes, report error if cannot resolve

### Phase 6: Documentation and Summary

**Objective**: Provide clear documentation and usage guidance.

**Steps**:

16. **Generate Witness Catalog Documentation**
    - Add to file header:
      ```quint
      // ============================================================
      // WITNESS SCENARIOS - SANITY CHECKS
      // ============================================================
      //
      // Purpose:
      //   Witnesses verify that interesting scenarios are reachable
      //   in the specification. They serve as sanity checks that
      //   the spec is not vacuous or overly constrained.
      //
      // Expected Behavior:
      //   All witnesses should SUCCEED (reach their goal state).
      //
      //   ✓ Success = Scenario is reachable (spec is expressive)
      //   ✗ Failure = Scenario unreachable (spec may be too strict)
      //
      // Usage:
      //   quint run <file> --main=<WitnessName> --max-steps={max_steps} --backend=rust
      //
      // Interpreting Results:
      //   • Success: Good! Scenario is reachable.
      //   • Timeout: May need more steps, or scenario genuinely hard to reach.
      //   • No path: Scenario may be unreachable - investigate spec constraints.
      //
      // ============================================================
      ```

17. **Display Success Summary**
    - Output:
      ```
      ✅ Witness scenarios generated successfully!

      Witness file: <output_path>

      Interesting Scenarios:
        • Decision reached - Can nodes actually decide?
        • Multiple rounds - Can protocol progress through rounds?
        • View change - Can nodes change views/leaders?
        • Quorum formation - Can quorums actually form?

      Witnesses Generated:
        • Liveness witnesses: {count} scenarios
        • Reachability witnesses: {count} scenarios
        • Total: {total} witness scenarios

      Configurations:
        • MinimalConfig (N=4, f=1)
        • TypicalConfig (N=7, f=2)

      All witnesses compiled successfully ✓

      Next Steps:
        Run witness:     quint run <output_path> --main=<spec_module> --invariant=<witness_name> --max-steps={max_steps} --max-samples=1000 --backend=rust
        List witnesses:  grep "^  val " <output_path>
        View catalog:    head -80 <output_path>
      ```

18. **Provide Usage Guidance**
    - Output:
      ```
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      Using Witness Scenarios
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      Purpose:
        Witnesses are sanity checks to verify interesting scenarios
        are reachable in your specification.

      Running Witnesses:
        quint run specs/consensus_witnesses.qnt \
          --main=consensus \
          --invariant=canReachDecision \
          --max-steps=50 \
          --max-samples=1000 --backend=rust

      Expected Results:
        ✓ Invariant violated - Scenario reached, spec is expressive
        ✗ No violation found - Scenario may be unreachable, investigate spec

      Common Patterns:
        • All witnesses violated → Spec is expressive ✓
        • Some not violated → Increase max-steps or max-samples
        • Many not violated → Spec may be too constrained, review assumptions

      Debugging Unreachable Witnesses:
        1. Check spec constraints/assumptions
        2. Review action preconditions
        3. Verify parameter values are reasonable
        4. Use REPL to manually explore: /interactive:repl-debug
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      ```

## Tools Used

- `Read`: Read spec file
- `Write`: Write witness file
- `Grep`: Extract state variables, actions, constants
- `Bash(quint)`: Parse, typecheck, and run witnesses for validation
- `AskUserQuestion`: Collect user preferences for scenarios and configurations

## Error Handling

### No Interesting Scenarios Detected
- **Condition**: Cannot identify scenarios to witness
- **Action**: Display error and offer options
  ```
  ⚠️  Could not detect interesting scenarios

  Automatic detection found no clear scenarios to witness.

  Options:
  1. Specify scenarios manually
  2. Generate generic witnesses (decision, progress, quorum)
  3. Cancel witness generation
  ```
- **Recovery**: User selects option via AskUserQuestion

### Spec Not Found
- **Condition**: spec_path does not exist
- **Action**: Display error
  ```
  ❌ Spec file not found

  Could not find spec at: <path>

  Please check the path and try again.
  ```
- **Recovery**: Provide correct spec path

### Witness Compilation Failure
- **Condition**: Generated witnesses don't compile
- **Action**: Display error with details
  ```
  ❌ Generated witnesses failed to compile

  Parse error at line 45:
  <error message>

  Attempting automatic fix...
  ```
- **Recovery**: Iterate fixes, show progress, return error if cannot resolve

### User Cancellation
- **Condition**: User cancels during scenario/configuration selection
- **Action**: Display cancellation message
  ```
  Operation cancelled by user.
  No files were generated.
  ```
- **Recovery**: None, operation aborted cleanly

## Important scenarions to look for
- If the protocol has phases, rounds, views or any notion of incremental progress, look for scenarios that witness progression through these stages.
- A protocol can have multiple incremental progressions (e.g., rounds and views). Generate witnesses for each type of progression.
- Do sanity checks on the appearance of messages. For every type of message, generate a witness to look for its appearance.
- If the protocol has notions of quorums or majorities, generate witnesses to check that quorums can actually form.
- If the protocol has timeouts, generate witnesses to check that timeouts can actually trigger.

## Example Execution

**Input**:
```
/play:open:generate-witness \
  --spec_path=specs/consensus.qnt \
  --max_steps=30
```

**Process**:
1. Read specs/consensus.qnt
2. Detect interesting scenarios:
   - Decision reached (decided != None)
   - Round progression (round > 1)
   - Quorum formed (|voters| >= quorum)
   - View change (view changed)
3. Query user for scenario types → User selects "Liveness, Reachability"
4. Generate specific goals:
   - "CanReachDecision", "CanProgressRounds", "CanFormQuorum", etc.
5. Analyze spec: 6 actions, 8 state variables
6. Design witness paths for each goal
7. Query user for configuration → User selects "Typical" (N=7, f=2)
8. Generate 10 witness invariants (negated conditions)
9. Write consensus_witnesses.qnt
10. Validate: parse ✓, typecheck ✓
11. Return summary

**Output**:
```
✅ Witness scenarios generated successfully!

Witness file: specs/consensus_witnesses.qnt

Interesting Scenarios:
  • Decision reached - Can nodes actually decide?
  • Multiple rounds - Can protocol progress through rounds?
  • Quorum formation - Can quorums actually form?
  • View change - Can nodes change views/leaders?

Witnesses Generated:
  • Liveness witnesses: 4 scenarios
  • Reachability witnesses: 6 scenarios
  • Total: 10 witness scenarios

Configuration: N=7, f=2 (typical)

All witnesses compiled successfully ✓

Next Steps:
  Run witness:     quint run specs/consensus_witnesses.qnt --main=consensus --invariant=canReachDecision --max-steps=50 --max-samples=1000
  List witnesses:  grep "^  val " specs/consensus_witnesses.qnt
  View catalog:    head -80 specs/consensus_witnesses.qnt
```

## Design Rationale

### Why Witnesses are Important

1. **Sanity Check**: Verify spec is not vacuously true (can actually do things)
2. **Reachability**: Confirm important states/behaviors are reachable
3. **Expressiveness**: Validate spec is not over-constrained
4. **Development Aid**: Help understand what the spec can/cannot do
5. **Documentation**: Executable examples of interesting scenarios

### Success vs Failure Interpretation

| Outcome | Meaning | Action |
|---------|---------|--------|
| Witness succeeds | Scenario is reachable ✓ | Good, spec is expressive |
| Witness times out | Scenario hard to reach | Increase max_steps or investigate |
| Witness fails | Scenario unreachable | Review spec constraints |
| All succeed | Spec is expressive | Continue with confidence |
| Many fail | Spec may be too strict | Review assumptions |

### Minimal Witness Principle

Witnesses use minimal/simple execution paths:
- Easier to understand what makes scenario reachable
- Faster execution
- More likely to succeed (simpler = fewer obstacles)
- Clearer demonstration of reachability
