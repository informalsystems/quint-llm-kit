# Verify Design Tests Command

**Purpose**: Generate comprehensive test suite (witnesses, invariants, deterministic tests) based on behavioral analysis and multiple module configurations.

**Version**: 3.0.0

## Arguments

```
/verify/design-tests \
  --spec_path=<path> \
  --framework=<standard|choreo> \
  --framework_info=<json> \
  [--requirement_analysis=<path>] \
  [--test_output_path=<path>] \
  [--overwrite=ask|yes|no]
```

- `spec_path`: Path to spec file being verified
- `framework`: Output from detect-framework
- `framework_info`: Full JSON from detect-framework (actions, listeners, etc.)
- `requirement_analysis`: Optional requirement-analysis.json for requirement tracing
- `test_output_path`: Optional custom path for test file (default: `<spec_dir>/<spec_name>_test.qnt`)
- `overwrite`: How to handle existing test files (default: `ask`)

## Output

Returns JSON + writes test file:
```json
{
  "test_file": "path/to/spec_test.qnt",
  "tests_designed": {
    "witnesses": 3,
    "invariants": 4,
    "deterministic_tests": 6
  },
  "categories_covered": ["happy_path", "byzantine", "timeout", "edge_case"],
  "requirements_mapped": {
    "REQ-01": ["normalConsensusPath", "agreement"],
    "REQ-02": ["byzantineEquivocation", "noEquivocation"]
  }
}
```

## Process

### 1. Determine Test File Path

**Parse spec_path:**
- Extract directory: `dirname(spec_path)`
- Extract filename: `basename(spec_path)`
- Extract spec name: `filename.replace('.qnt', '')`

**Construct default path:**
- `test_output_path = <directory>/<spec_name>_test.qnt`
- Example: `specs/consensus.qnt` → `specs/consensus_test.qnt`

**If custom test_output_path provided:**
- Use that path instead
- Validate it ends with `.qnt`

**Check if file exists:**
- If exists and `overwrite=ask`: Prompt user
- If exists and `overwrite=yes`: Overwrite silently
- If exists and `overwrite=no`: Create versioned file (`_test_v2.qnt`)

### 2. Understand Spec Context

**Load behavioral analysis from Phase 1:**
- Read output from `/verify/analyze-behavior`
- Use action behaviors to inform test scenarios
- Use inferred critical properties for invariants/witnesses
- Use potential issues to add edge case tests

**If behavioral analysis not available:**
- Read spec file to understand protocol
- Extract state structure
- Identify critical properties from code
- If requirement_analysis provided, extract expected behaviors

### 2a. Identify Parameters and Select Configurations

**If spec has constants (N, f, etc.):**
- Scan for `const` declarations and formulas
- Check requirements for expected formulas
- Select multiple configurations to cover multiple scenarios: valid, faulty.
- Always include scenarios that violate the algorithm's assumptions.
- See `guidelines/verification.md` "Module Configuration for Parameterized Specs"

### 3. Design Witnesses (Liveness/Progress)
Create boolean expressions that should be VIOLATED:

**Goal**: Find at least one execution where protocol makes progress. Start with simple expressions than try more complex ones.

Examples:
- `val canDecide = not(anyNodeDecided)` - Expect violation (node CAN decide)
- `val canAdvanceRound = all(n => s.round.get(n) == 0)` - Expect violation (CAN advance)
- `val canReachQuorum = not(quorumFormed)` - Expect violation (quorum CAN form)

**Coverage:**
- Normal progress scenarios
- Recovery from Byzantine behavior
- Timeout-triggered progress

### 4. Design Invariants (Safety)
Create boolean expressions that should HOLD:

**Goal**: Verify property is true in ALL reachable states

Examples:
- `val agreement = not(twoNodesDecidedDifferently)`
- `val validity = allDecisionsAreProposed`
- `val noEquivocation = not(nodeSignedTwoValuesInRound)`

**Coverage:**
- Core safety properties from requirements

### 5. Design Deterministic Tests
Create specific execution scenarios:

**Categories:**

**Happy path:**
- Normal execution, all correct nodes, same proposal
- Should reach decision quickly

**Byzantine scenarios:**
- Equivocation (conflicting messages)
- Invalid proposals
- Message withholding

**Timeout scenarios:**
- No quorum → timeout → round advance
- Partial quorum → delayed decision

**Edge cases:**
- Boundary conditions (exactly f+1 faulty)
- Minimum/maximum values
- State transitions at limits

**Violation of assumptions:**
- faulty nodes exceed threshold

### 6. Use Correct API for Framework

**For choreo specs:**
```quint
run normalConsensusPath = {
  val proposal = { proposal: "v0", height: 0, round: 0 }
  init
    .then("p1".with_cue(listen_proposal, proposal).perform(broadcast_prevote))
    .then("p2".with_cue(listen_proposal, proposal).perform(broadcast_prevote))
    .expect(s.system.get("p1").decided)
}
```

**For standard specs:**
```quint
run transferTest = {
  init
    .then(transfer("alice", "bob", 100))
    .expect(balance.get("bob") == 100)
}
```

### 7. Map to Requirements
If requirement_analysis provided:
- Link each test to requirement ID
- Ensure all requirements have coverage
- Flag gaps

### 8. Generate Test File

**If no parameters:**
```quint
module <spec_name>_test {
  import <spec_name>.* from "./<spec_name>"

  val canDecide = not(anyNodeDecided)
  val agreement = not(twoNodesDecidedDifferently)
  run normalPath = { ... }
}
```

**If parameterized (N, f, etc.):**
```quint
module <spec_name>_test {
  import <spec_name>.* from "./<spec_name>"

  // Shared tests (use constants)
  val canDecide = not(nodes.exists(n => decided.get(n)))
  val quorumMatchesSpec = (quorum == 5*f+1)  // Check formula
  val agreement = ...
  run normalPath = ...

  // Module instances with concrete values
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

### 9. Report File Location

Report test file and configurations:
```
💾 Test file: specs/consensus_test.qnt
   Configurations: TestMin (N=4, f=1), TestTypical (N=7, f=2), TestStress (N=10, f=3)
   Tests: 3 witnesses, 5 invariants (2 config-specific), 4 runs
```

Return configuration info in JSON output.

## API Verification

**CRITICAL**: Before generating tests, verify actions/listeners exist:
1. Read existing tests (from framework_info) as templates
2. Use `Grep` to find action definitions
3. Use LSP to list available symbols
4. NEVER assume API - always check

## Knowledge Base Usage

Query for patterns:
- `quint_get_doc("choreo-run-generation.md")` if choreo
- `quint_hybrid_search("quint test examples")` for patterns
- Use framework_info existing tests as primary template

## Error Handling


**No existing tests to learn from:**
```json
{
  "warning": "No existing tests found - using generic patterns from KB",
  "test_file": "...",
  "tests_designed": {...}
}
```

**API verification failed:**
```json
{
  "error": "Cannot verify listener 'listen_proposal' exists in spec",
  "recovery": "Read spec manually or use generic test structure",
  "test_file": null
}
```

## Example

Input:
```
/verify/design-tests \
  --spec_path=specs/consensus.qnt \
  --framework=choreo \
  --framework_info='{"listeners": [{"name": "listen_proposal"}], ...}' \
  --requirement_analysis=.artifacts/requirement-analysis.json
```

Output:
```json
{
  "test_file": "specs/consensus_test.qnt",
  "tests_designed": {
    "witnesses": 3,
    "invariants": 2,
    "deterministic_tests": 5
  },
  "categories_covered": ["happy_path", "byzantine", "timeout"],
  "requirements_mapped": {
    "REQ-SAFETY-01": ["agreement", "normalConsensusPath"],
    "REQ-LIVENESS-01": ["canDecide", "normalConsensusPath"],
    "REQ-BYZ-01": ["noEquivocation", "byzantineEquivocation"]
  },
  "api_verified": true,
  "test_summary": [
    {"name": "canDecide", "type": "witness", "expect": "violated"},
    {"name": "agreement", "type": "invariant", "expect": "satisfied"},
    {"name": "normalConsensusPath", "type": "test", "expect": "passed"}
  ]
}
```

## Quality Standards

- At least 5 witnesses (liveness checks)
- At least 3 invariants (safety checks)
- At least 10 deterministic tests (scenario coverage)
- At least 5 tests should cover complex scenarios (Byzantine, timeouts)
- More tests don't always mean better - focus on meaningful coverage
- All tests use correct API for framework
- All tests compilable and runnable
- Link to requirements when available
- Provide expect outcomes for each test
- Never run tests for built-ins, spells or framework code.
- Run Tests only on user-defined spec code.
