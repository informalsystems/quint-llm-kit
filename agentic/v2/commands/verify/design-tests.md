---
command: /verify:design-tests
description: Generate test suite with witnesses, invariants, and tests (run definitions)
version: 4.0.0
---

# Verify Design Tests Command

## Objective

Generate test suite based on behavioral analysis and framework patterns.

**Minimum requirements:**
- 5 witnesses (liveness properties, checked by `quint run --invariant=witness`)
- 3 invariants (safety properties, checked by `quint run --invariant=inv`)
- 15 `run` definitions (test cases using `.then()` and `.expect()`, executed by `quint test`) including 5+ Byzantine scenarios

## Input Contract

### Required Parameters
- `spec_path`: Path to spec file being verified
- `framework`: Framework type ("standard" | "choreo")
- `framework_info`: JSON from detect-framework (actions, listeners, existing tests)

### Optional Parameters
- `requirement_analysis`: Path to requirement-analysis.json for requirement tracing
- `test_output_path`: Custom path for test file (default: `<spec_dir>/<spec_name>_test.qnt`)
- `overwrite`: How to handle existing files ("ask" | "yes" | "no", default: "ask")

## Output Contract

### Success
```json
{
 "status": "completed",
 "test_file": "specs/consensus_test.qnt",
 "tests_designed": {
 "witnesses": 5,
 "invariants": 4,
 "deterministic_tests": 17
 },
 "categories_covered": [
 "happy_path",
 "byzantine_equivocation",
 "byzantine_withholding",
 "byzantine_strategic",
 "timeout_cascade",
 "edge_threshold"
 ],
 "module_instances": ["TestValid", "TestFaulty"],
 "requirements_mapped": {
 "REQ-01": ["normalPath", "agreement"],
 "REQ-02": ["byzantineTest", "noEquivocation"]
 }
}
```

### Failure
```json
{
 "status": "failed",
 "error": "Specific error description",
 "phase": "path_determination | context_loading | test_generation | file_writing"
}
```

## Execution Procedure

### Phase 1: Test File Path Determination

Objective: Determine where to write test file.

Steps:

1. **Parse Spec Path**
 - Extract: Directory using dirname
 - Extract: Filename using basename
 - Extract: Spec name by removing .qnt extension

2. **Construct Output Path**
 - If test_output_path provided:
 - Check: Ends with `.qnt`
 - Use: Provided path
 - If not provided:
 - Construct: `<directory>/<spec_name>_test.qnt`
 - Example: `specs/consensus.qnt` → `specs/consensus_test.qnt`

3. **Handle Existing File**
 - Check: File exists at output path
 - If exists:
 - If overwrite == "ask": Prompt user (yes/no/rename)
 - If overwrite == "yes": Overwrite silently
 - If overwrite == "no": Create versioned file (`<spec_name>_test_v2.qnt`)
 - If not exists: Use determined path

### Phase 2: Context Loading

Objective: Understand spec for informed test design.

Steps:

4. **Load Behavioral Analysis** (if available)
 - Run: Read output from analyze-behavior command
 - Extract: Action behaviors, critical properties, potential issues, quorum logic
 - Use: To inform test scenario design

5. **Load Requirements** (if provided)
 - Run: Read requirement_analysis from path
 - Extract: Requirements with IDs
 - Build: Requirement-to-test mapping template

6. **Read Spec Directly** (if no behavioral analysis)
 - Run: Read spec_path
 - Extract: State variables, actions, constants
 - Infer: Protocol type and critical properties

7. **Parse Framework Info**
 - Extract from framework_info JSON:
 - Framework type (standard/choreo)
 - Existing tests (use as templates)
 - Actions available
 - Listeners (if choreo)
 - Check: Actions/listeners exist in spec

### Phase 3: Configuration Identification

Objective: Identify parameter configurations for module instances.

Steps:

8. **Detect Parameters**
 - Run: Grep spec for `const\s+(\w+)` declarations
 - Extract: Parameter names (N, f, threshold, etc.)
 - Check: Are there formulas using these parameters?

9. **Select Configurations** (if parameterized)
 - Determine: Valid configuration (e.g., N=4, f=1)
 - Determine: Boundary configuration (e.g., N=4, f=1 where f = (N-1)/3)
 - Determine: Invalid configuration (e.g., N=4, f=2 where f > (N-1)/3)
 - Purpose: Test behavior under different assumptions
 - Reference: `guidelines/verification.md` for configuration strategies

10. **Create Module Instance Plan**
 - If configurations identified:
 - Plan: Multiple module instances
 - Example: TestValid, TestFaulty
 - If no parameters:
 - Plan: Single module

### Phase 4: Test Design

Objective: Design witnesses, invariants, and tests (run definitions).

Steps:

11. **Design Witnesses** (Liveness - Minimum 5)
 - Create boolean expressions that should be VIOLATED
 - Purpose: Show protocol CAN make progress
 - Examples:
 - `val canDecide = not(anyNodeDecided)` - Expect violation
 - `val canAdvanceRound = all(n => round.get(n) == 0)` - Expect violation
 - `val canReachQuorum = not(quorumFormed)` - Expect violation
 - Start simple, increase complexity if needed
 - Store: List of witness definitions

12. **Design Invariants** (Safety - Minimum 3)
 - Create boolean expressions that should HOLD
 - Purpose: Verify properties true in ALL states
 - Examples:
 - `val agreement = not(twoNodesDecidedDifferently)`
 - `val validity = allDecisionsWereProposed`
 - `val noEquivocation = not(nodeSignedTwiceInRound)`
 - Use: Critical properties from behavioral analysis
 - Store: List of invariant definitions

13. **Design Tests (Run Definitions)** (Minimum 15 total)
 - **Category breakdown**:
 - 2-3 happy path tests
 - **5+ Byzantine scenarios (REQUIRED)**:
 - Equivocation: Conflicting messages to different nodes
 - Withholding: Silent Byzantine nodes
 - Strategic voting: Coordinated minority attack
 - Late messages: Delayed message arrival
 - Invalid proposals: Protocol rule violations
 - 3+ timeout tests
 - 3+ edge cases (boundary conditions)
 - 2+ assumption violations (expect failures)

 - Per test:
 - Determine: Scenario to test
 - Use: Behavioral analysis potential issues
 - Design: Action sequence
 - Add: Assertions (.expect() calls)
 - Store: Test definition

14. **Apply Framework API**
 - For choreo tests:
 - Use: `.then("nodeId".with_cue(listener, data).perform(action))`
 - Example: `.then("p1".with_cue(listen_proposal, prop).perform(broadcast_prevote))`
 - For standard tests:
 - Use: `.then(action(params))`
 - Example: `.then(transfer("alice", "bob", 100))`
 - Check: Actions/listeners exist in framework_info
 - Query KB if needed: `quint_get_doc`, `quint_get_example`

15. **Map Tests to Requirements** (if provided)
 - Per requirement:
 - Identify: Which tests verify this requirement
 - Link: Requirement ID to test names
 - Store: Requirement mapping

### Phase 5: Module Instance Generation

Objective: Create module instances for parameterized specs.

Steps:

16. **Generate Test Module Structure**
 - If parameterized:
 ```quint
 module <spec_name>_test {
 import <spec_name>.* from "./<spec_name>"

 // Shared tests (use parameters)
 val canDecide = ...
 val agreement = ...
 run normalPath = ...

 // Module instances
 module TestValid {
 const N = 4
 const f = 1
 include <spec_name>_test
 }
 module TestFaulty {
 const N = 4
 const f = 2
 include <spec_name>_test
 }
 }
 ```
 - If not parameterized:
 ```quint
 module <spec_name>_test {
 import <spec_name>.* from "./<spec_name>"

 val canDecide = ...
 run normalPath = ...
 }
 ```

### Phase 6: File Generation

Objective: Write complete test file.

Steps:

17. **Construct File Content**
 - Include: Module declaration
 - Include: Import statement
 - Include: All witness definitions
 - Include: All invariant definitions
 - Include: All test (run definition) definitions
 - Include: Module instances (if parameterized)
 - Format: Proper indentation and spacing

18. **Write Test File**
 - Run: Write content to test_output_path
 - Check: File written successfully

19. **Validate Generated File**
 - Run: `quint parse <test_file>`
 - If parse fails:
 - Identify: Syntax errors
 - Attempt: Fix common issues (missing braces, commas)
 - Retry: Parse (max 2 attempts)
 - If still fails: Return error with partial file

### Phase 7: Report Generation

Objective: Return summary of generated tests.

Steps:

20. **Compile Statistics**
 - Count: Witnesses, invariants, tests (run definitions)
 - List: Categories covered
 - List: Module instances (if any)

21. **Build Requirement Mapping**
 - Include: Requirement-to-test links

22. **Construct Response**
 - Status: "completed"
 - Include: Test file path
 - Include: Test counts
 - Include: Categories and mappings

23. **Return Success**
 - Return: Complete response JSON

## Test Quality Standards

**Minimum Requirements**:
- At least 5 witnesses (liveness checks)
- At least 3 invariants (safety checks)
- At least 15 tests (run definitions) with breakdown:
 - 2-3 happy path
 - **5+ Byzantine scenarios (CRITICAL)**
 - 3+ timeout/delay tests
 - 3+ edge cases
 - 2+ assumption violations

**Byzantine Test Requirements**:
Must cover at least 5 of:
- Equivocation (conflicting messages)
- Message withholding (silent nodes)
- Strategic voting (coordinated attack)
- Late messages (timeout interleaving)
- Invalid proposals (rule violations)
- Double signing (signing twice in round)

**Quality over Quantity**:
- Each test should explore distinct scenario
- Avoid duplicate tests with only value changes
- Focus on meaningful failure modes

## Tools Used

- `Read`: Read spec, behavioral analysis, requirements
- `Write`: Write generated test file
- `Grep`: Find definitions and patterns in spec
- `Bash(quint parse)`: Validate generated test file
- MCP `quint-kb`: Query for syntax examples (optional)

## Error Handling

### Spec Path Invalid
- **Condition**: `spec_path` does not exist
- **Action**: Return error "Spec file not found"
- **Recovery**: User must provide valid spec path

### Framework Info Invalid
- **Condition**: framework_info JSON malformed or missing required fields
- **Action**: Return error with missing fields
- **Recovery**: Re-run detect-framework to regenerate

### API Verification Failure
- **Condition**: Action/listener referenced in test does not exist in spec
- **Action**: Return error "Cannot verify '<name>' exists in spec"
- **Recovery**: Use generic test structure or fix framework_info

### Parse Failure After Generation
- **Condition**: Generated test file does not parse
- **Action**: Attempt fix (max 2 retries), then return error with syntax issue
- **Recovery**: Query KB for correct syntax, regenerate with fixes

### File Write Failure
- **Condition**: Cannot write to test_output_path
- **Action**: Return error "Cannot write test file: <reason>"
- **Recovery**: Check permissions, verify path is writable

## Example Execution

**Input**:
```
/verify:design-tests \
 --spec_path=specs/consensus.qnt \
 --framework=choreo \
 --framework_info='{"listeners": [{"name": "listen_proposal"}], "actions": [{"name": "broadcast_prevote"}]}' \
 --requirement_analysis=.artifacts/requirement-analysis.json
```

**Process**:
1. Parse path: specs/consensus.qnt
2. Determine output: specs/consensus_test.qnt
3. Check existing file: None
4. Load behavioral analysis: Found potential deadlock issue
5. Load requirements: 2 requirements
6. Detect parameters: N, f found
7. Select configurations: TestValid (N=4,f=1), TestFaulty (N=4,f=2)
8. Design 5 witnesses: canDecide, canAdvance, etc.
9. Design 4 invariants: agreement, validity, noEquivocation, termination
10. Design 17 tests (run definitions): 3 happy, 6 Byzantine, 4 timeout, 3 edge, 1 violation
11. Apply choreo API: with_cue().perform() pattern
12. Map to requirements: REQ-01 → normalPath, agreement
13. Generate module structure with instances
14. Write file: specs/consensus_test.qnt
15. Check: quint parse → success
16. Return summary

**Output**:
```json
{
 "status": "completed",
 "test_file": "specs/consensus_test.qnt",
 "tests_designed": {
 "witnesses": 5,
 "invariants": 4,
 "deterministic_tests": 17
 },
 "categories_covered": [
 "happy_path",
 "byzantine_equivocation",
 "byzantine_withholding",
 "byzantine_strategic_voting",
 "byzantine_late_messages",
 "byzantine_coordinated_attack",
 "timeout_no_quorum",
 "timeout_partial_quorum",
 "timeout_cascading",
 "edge_exact_threshold",
 "edge_simultaneous_actions",
 "assumption_violation_too_many_faulty"
 ],
 "module_instances": ["TestValid", "TestFaulty"],
 "requirements_mapped": {
 "REQ-SAFETY-01": ["agreement", "normalPath", "byzantineEquivocation"],
 "REQ-LIVENESS-01": ["canDecide", "timeoutProgress"]
 },
 "api_verified": true
}
```

## Integration Notes

This command is called by verifier agent after detect-framework and analyze-behavior. The generated test file is then executed by execute-verification command, which will run tests on ALL module instances if parameterized.

