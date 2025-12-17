---
command: /mine:next
description: Suggest next steps in your Quint specification workflow based on current project state
version: 1.0.0
---

# Suggest Next Steps

## Objective

Analyze the current state of the user's Quint specification project and suggest concrete next steps to guide them through the workflow, from initial setup to testing and debugging.

## File Operation Constraints

**CRITICAL**: This command is read-only and provides suggestions.
- NEVER modify any files
- Only read and analyze existing files
- Provide actionable commands for the user to run

## Input Contract

### Required Parameters
None - command analyzes current directory state

### Optional Parameters
- `spec_path`: Specific Quint spec file to analyze (default: auto-detect in `specs/` or current directory)

## Output Contract

### Success
```
🎯 Next Steps for Your Quint Workflow

Current Status:
  ✓ Choreo framework installed (specs/choreo/)
  ✓ Spec found: specs/consensus.qnt
  ✓ Module: Consensus
  ✓ Invariants: 2 (agreement, validity)
  ✗ Witnesses: 0 (no witness tests found)

Recommended Next Steps:

1. 🧪 Generate Witness Tests
   Test that your spec can actually reach interesting states:

   /play:open:generate-witness --spec_path=specs/consensus.qnt

   This will create tests to verify reachability of key protocol states.

2. ✅ Run Type Checking
   Ensure your spec is well-typed:

   quint typecheck specs/consensus.qnt

3. 🔍 Test Invariants
   Run your defined invariants:

   quint run specs/consensus.qnt --invariant=agreement --max-steps=100
   quint run specs/consensus.qnt --invariant=validity --max-steps=100

---
📚 Learn more: https://quint-lang.org/choreo
```

### Failure (No Quint Detected)
```
🎯 Getting Started with Quint

You don't have any Quint specifications yet. Here's how to start:

Option 1: Use Choreo Framework (Recommended for Distributed Protocols)

  Choreo provides structured patterns for message-passing protocols.

  Step 1: Install Choreo
    /mine:setup-choreo

  Step 2: Create your spec
    /mine:start

  Learn more: https://quint-lang.org/choreo

Option 2: Pure Quint (For General Specifications)

  Use standard Quint without Choreo framework.

  /mine:start

  Learn more: https://quint-lang.org/docs

---
💡 Not sure which to choose?
- Distributed protocols (consensus, replication, etc.) → Use Choreo
- Data structures, algorithms, smart contracts → Pure Quint
```

## Execution Procedure

### Phase 1: Environment Detection

**Objective**: Determine current project state.

**Steps**:

1. **Check for Choreo Installation**
   - Check: File exists at `specs/choreo/choreo.qnt`
   - If exists:
     - Set: `choreo_installed = true`
     - Display: "✓ Choreo framework installed"
   - If not:
     - Set: `choreo_installed = false`
     - Display: "✗ Choreo framework not installed"

2. **Scan for Quint Specs**
   - Glob: `**/*.qnt` excluding `specs/choreo/**`
   - Priority locations:
     - `specs/*.qnt`
     - `./*.qnt`
     - `src/*.qnt`
   - Filter: Exclude template files, backup files
   - Store: List of spec files with paths
   - If `spec_path` provided: Use only that file
   - Count: Total specs found

3. **Determine Workflow Stage**
   - If choreo_installed and spec_count == 0:
     - Stage: "choreo_ready"
   - If spec_count == 0:
     - Stage: "getting_started"
   - If spec_count > 0:
     - Stage: "spec_exists"
   - Store: Current stage

### Phase 2: Spec Analysis (if spec_exists)

**Objective**: Analyze spec contents to determine what's implemented.

**Steps**:

4. **Select Primary Spec**
   - If spec_count == 1: Use that spec
   - If spec_count > 1:
     - Ask user: "Which spec would you like guidance for?" (show list)
     - Or analyze most recently modified
   - Store: `primary_spec` path

5. **Extract Module Information**
   - Read: primary_spec file
   - Grep: `module\s+(\w+)\s*\{` to get module name
   - Store: module_name

6. **Check for Choreo Usage**
   - Grep: `import.*choreo` in primary_spec
   - If found:
     - Set: `uses_choreo = true`
     - Display: "✓ Using Choreo framework"
   - Else:
     - Set: `uses_choreo = false`

7. **Count Invariants**
   - Grep: `val\s+(\w+)\s*=` (val definitions that could be invariants)
   - Grep: `--invariant` in any test runs
   - Look for common patterns:
     - `val agreement`, `val validity`, `val safety`
     - TODO comments mentioning invariants
   - Count: Total invariants found
   - Store: invariant_names list

8. **Count Witness Tests**
   - Grep: `run\s+(\w+Test|\w+Witness)`
   - Look for patterns:
     - `run canReach...`
     - `run witness...`
     - Tests that check reachability
   - Count: Total witness tests found
   - Store: witness_names list

9. **Check for Run Commands**
   - Grep: `run\s+\w+\s*=` to find all run tests
   - Categorize:
     - Witness tests (check reachability)
     - Unit tests (check properties)
   - Count: Total tests

10. **Scan for Issues**
    - Run: `quint parse {primary_spec}` (capture output)
    - If parse errors:
      - Set: `has_parse_errors = true`
      - Store: error messages
    - Run: `quint typecheck {primary_spec}` (capture output)
    - If type errors:
      - Set: `has_type_errors = true`
      - Store: error messages

### Phase 3: Generate Suggestions

**Objective**: Create prioritized list of next steps.

**Steps**:

11. **Stage: getting_started**
    - If choreo_installed == false:
      - Suggest 1: Option to install Choreo
        ```
        Option 1: Use Choreo Framework (Recommended for Distributed Protocols)
          Step 1: /mine:setup-choreo
          Step 2: /mine:start
          Learn more: https://quint-lang.org/choreo

        Option 2: Pure Quint
          /mine:start
        ```
    - If choreo_installed == true:
      - Suggest: Run `/mine:start` to create spec
      - Note: "Choreo framework is ready"

12. **Stage: choreo_ready**
    - Primary suggestion:
      ```
      ✓ Choreo framework installed

      Next: Create your distributed protocol specification
        /mine:start

      This will guide you through creating a Choreo-based spec.
      ```

13. **Stage: spec_exists - Priority 1: Fix Errors**
    - If has_parse_errors:
      - **URGENT** suggestion:
        ```
        ⚠️  Parse Errors Detected

        Your spec has syntax errors. Fix these first:

        quint parse {primary_spec}

        Common issues:
        - Missing braces or parentheses
        - Incorrect type syntax
        - Typos in keywords
        ```
    - If has_type_errors (and no parse errors):
      - **URGENT** suggestion:
        ```
        ⚠️  Type Errors Detected

        Your spec has type errors. Fix these next:

        quint typecheck {primary_spec}

        The Quint LSP in your editor can help identify and fix these.
        ```

14. **Stage: spec_exists - Priority 2: Core Workflow**
    - If no parse/type errors:
      - Always suggest: Run type checking
        ```
        ✅ Type Check Your Spec

        quint typecheck {primary_spec}
        ```

15. **Stage: spec_exists - Priority 3: Testing**
    - If invariant_count == 0:
      - Suggest: Add invariants
        ```
        📋 Add Invariants (Safety Properties)

        Your spec doesn't have invariants yet. Consider adding:
        - Safety properties (agreement, validity)
        - Data integrity constraints
        - Protocol-specific correctness properties

        Example:
          val agreement = nodes.forall(n1 => nodes.forall(n2 =>
            decided(n1) and decided(n2) implies decision(n1) == decision(n2)
          ))

        Then test with:
          quint run {primary_spec} --invariant=agreement --max-steps=100
        ```
    - If invariant_count > 0:
      - Suggest: Run invariants
        ```
        🔍 Test Your Invariants
        ```
        - Per invariant in invariant_names:
          ```
          quint run {primary_spec} --invariant={inv_name} --max-steps=100
          ```

16. **Stage: spec_exists - Priority 4: Witnesses**
    - If witness_count == 0:
      - Suggest: Generate witnesses
        ```
        🧪 Generate Witness Tests

        Witness tests verify your spec can reach interesting states.

        /play:open:generate-witness --spec_path={primary_spec}

        This ensures your spec is not vacuous (too constrained).
        ```
    - If witness_count > 0:
      - Suggest: Run witnesses
        ```
        ✅ Run Witness Tests

        Test that your spec can reach key states:
        ```
        - Per witness in witness_names:
          ```
          quint run {primary_spec} --main={module_name} --max-steps=50 \\
                    --invariant={witness_name} --max-samples=1000

          Expected: Invariant VIOLATION (proves reachability)
          ```

17. **Stage: spec_exists - Priority 5: Advanced Testing**
    - Suggest: Test listeners (if uses_choreo)
      ```
      🎯 Test Choreo Listeners

      /play:open:test-listeners --spec_path={primary_spec}

      Verifies your listener functions work correctly.
      ```

18. **Stage: spec_exists - Priority 6: Debugging**
    - If tests might be failing (heuristic):
      - Suggest: Debug tools
        ```
        🔧 Debugging Tools (if tests fail)

        Explain failed traces:
          /play:open:explain-trace --spec_path={primary_spec}

        Debug failing witnesses:
          /play:open:debug-witness --spec_path={primary_spec}
        ```

### Phase 4: Display Suggestions

**Objective**: Present suggestions in clear, actionable format.

**Steps**:

19. **Format Output**
    - Structure:
      ```
      🎯 Next Steps for Your Quint Workflow

      Current Status:
        [Status lines from analysis]

      Recommended Next Steps:

      1. [Priority 1 suggestion]

      2. [Priority 2 suggestion]

      ...

      ---
      📚 Resources:
        - Quint docs: https://quint-lang.org/docs
        - Choreo: https://quint-lang.org/choreo
        - Examples: https://github.com/informalsystems/quint/tree/main/examples
      ```

20. **Include Contextual Tips**
    - If uses_choreo:
      - Add: Link to Choreo examples
      - Add: "See Choreo template.qnt for patterns"
    - If has many invariants:
      - Add: "Consider running in parallel with different seeds"
    - If spec is large (>500 lines):
      - Add: "Consider splitting into multiple modules"

## Tools Used

- `Glob`: Find Quint spec files
- `Read`: Read spec files for analysis
- `Bash`: Run quint parse, quint typecheck for diagnostics
- `Grep`: Search for invariants, tests, patterns
- NO write operations (read-only command)

## Error Handling

### No Specs and No Choreo
- **Condition**: No .qnt files found, Choreo not installed
- **Action**: Show getting started guide with both options
- **Recovery**: User chooses framework and gets started

### Multiple Specs
- **Condition**: More than one spec file found
- **Action**: Ask user which spec to analyze OR analyze all and show summary
- **Recovery**: User selects primary spec

### Quint CLI Not Available
- **Condition**: Cannot run `quint` commands
- **Action**: Skip parse/typecheck suggestions, warn user
- **Recovery**: User should ensure Quint is installed

### Spec Unreadable
- **Condition**: Cannot read spec file
- **Action**: Return error "Cannot read spec file: {reason}"
- **Recovery**: User checks file permissions

## Example Execution

**Scenario 1: No specs, Choreo installed**

```
/mine:next

🎯 Next Steps for Your Quint Workflow

Current Status:
  ✓ Choreo framework installed (specs/choreo/)
  ✗ No Quint specifications found

Recommended Next Steps:

1. 📝 Create Your First Spec

   You have Choreo ready! Let's create a specification:

   /mine:start

   This will analyze your documentation and guide you through
   creating a Choreo-based distributed protocol specification.

---
📚 Resources:
  - Choreo guide: https://quint-lang.org/choreo
  - Choreo examples: https://github.com/informalsystems/choreo/tree/main/examples
```

**Scenario 2: Spec exists, no tests**

```
/mine:next

🎯 Next Steps for Your Quint Workflow

Current Status:
  ✓ Spec found: specs/consensus.qnt
  ✓ Module: Consensus
  ✓ Using Choreo framework
  ✗ Invariants: 0
  ✗ Witness tests: 0

Recommended Next Steps:

1. ✅ Type Check Your Spec

   quint typecheck specs/consensus.qnt

2. 📋 Add Invariants

   Define safety properties for your protocol:

   Example invariants:
   - Agreement: No two nodes decide different values
   - Validity: Decided value was proposed
   - Integrity: Nodes don't change decisions

   Then test:
   quint run specs/consensus.qnt --invariant=agreement --max-steps=100

3. 🧪 Generate Witness Tests

   /play:open:generate-witness --spec_path=specs/consensus.qnt

   This verifies your spec can reach important states.

---
📚 Resources:
  - Writing invariants: https://quint-lang.org/docs/invariants
  - Choreo testing: See specs/choreo/template.qnt
```

**Scenario 3: Complete spec with tests**

```
/mine:next

🎯 Next Steps for Your Quint Workflow

Current Status:
  ✓ Spec found: specs/consensus.qnt
  ✓ Module: Consensus
  ✓ Using Choreo framework
  ✓ Invariants: 3 (agreement, validity, integrity)
  ✓ Witness tests: 5
  ✓ No parse errors
  ✓ No type errors

Recommended Next Steps:

1. 🔍 Run All Invariants

   quint run specs/consensus.qnt --invariant=agreement --max-steps=100
   quint run specs/consensus.qnt --invariant=validity --max-steps=100
   quint run specs/consensus.qnt --invariant=integrity --max-steps=100

2. ✅ Run Witness Tests

   quint run specs/consensus.qnt --invariant=canReachDecision \\
             --max-steps=50 --max-samples=1000

   Expected: Invariant VIOLATION (proves decision is reachable)

3. 🎯 Test Choreo Listeners

   /play:open:test-listeners --spec_path=specs/consensus.qnt

4. 🔧 If Tests Fail

   Explain traces:
     /play:open:explain-trace --spec_path=specs/consensus.qnt

   Debug witnesses:
     /play:open:debug-witness --spec_path=specs/consensus.qnt

---
📚 Advanced:
  - Try longer traces: --max-steps=500
  - Test with different seeds: --seed=12345
  - Export traces: --out-itf=trace.itf.json
```

## Quality Standards

**Checklist**:
- [ ] Accurately detects current project state
- [ ] Suggestions are specific and actionable
- [ ] Commands are copy-paste ready
- [ ] Prioritization makes sense for workflow
- [ ] Links to relevant documentation
- [ ] Handles edge cases gracefully
- [ ] No file modifications (read-only)

## Notes

- This command is a **workflow guide**, not an executor
- Should be fast (< 2 seconds) since it's read-only
- Suggestions should be **concrete** with exact commands
- Should adapt to user's skill level (detected from spec complexity)
- Can be run repeatedly as project evolves
- Should encourage iterative development
