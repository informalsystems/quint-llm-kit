# Verify Execute Command

**Purpose**: Run comprehensive verification suite on spec and test file.

**Version**: 2.1.0

## Arguments

```
/verify/execute \
  --spec_path=<path> \
  --test_file=<path> \
  --framework=<standard|choreo>
```

- `spec_path`: Path to spec being verified
- `test_file`: Path to test file (from design-tests)
- `framework`: standard or choreo

## Output

Returns JSON:
```json
{
  "status": "completed",
  "compilation": {
    "spec": "passed" | "failed",
    "test_file": "passed" | "failed",
    "errors": []
  },
  "existing_tests": {
    "total": 1,
    "passed": 0,
    "failed": 1,
    "results": [...]
  },
  "witnesses": {
    "total": 3,
    "violated": 2,
    "satisfied": 1,
    "results": [...]
  },
  "invariants": {
    "total": 2,
    "satisfied": 1,
    "violated": 1,
    "results": [...]
  },
  "deterministic_tests": {
    "total": 5,
    "passed": 4,
    "failed": 1,
    "results": [...]
  },
  "execution_time_ms": 12345
}
```

## Process

**CRITICAL:** All phases must output real-time progress updates. See "Progress Reporting" section below.

### Phase 1: Compilation
**Progress output:**
```
[3/5] Compiling Specs...
```

1. Run `quint parse <spec_path>`
   - Before: Output `⏳ quint parse <spec_name>.qnt...`
   - Success: Output `✓ Parse successful (234ms)`
   - Failure: Output `❌ Parse failed: <error>`
2. Run `quint typecheck <spec_path>`
   - Before: Output `⏳ quint typecheck <spec_name>.qnt...`
   - Success: Output `✓ Typecheck passed (567ms)`
   - Failure: Output `❌ Typecheck failed: <error>`
3. Run `quint parse <test_file>`
   - Before: Output `⏳ quint parse <test_name>.qnt...`
   - Success: Output `✓ Parse successful (189ms)`
4. Run `quint typecheck <test_file>`
   - Before: Output `⏳ quint typecheck <test_name>.qnt...`
   - Success: Output `✓ Typecheck passed (445ms)`
5. If any fail, return immediately with compilation errors

### Phase 2: Test Execution
**Progress output:**
```
[4/5] Running Verification Suite...
```

6. Query test file for all test types (existing tests, witnesses, invariants, scenarios)

**Category: Existing Tests (if any)**
7. For each existing test:
   - Before: Output `⏳ [X/Y] <test_name>...`
   - Run `quint test <test_file> --main=<module> --match=<test>`
   - Success: Output `✓ [X/Y] PASSED (1.2s)`
   - Failure: Output `❌ [X/Y] FAILED`
   - Purpose: Regression detection

**Category: Witnesses (Liveness)**

Output category header:
```
🔍 Witnesses (X) - expect violations = progress possible
```

8. For each witness:
   - Before: Output `⏳ [X/Y] <name> (max-steps=N, samples=M)...`
   - Run `quint run <test_file> --main=<module> --invariant=<witness> --max-steps=100 --max-samples=100`
   - If violated: Output `✓ [X/Y] VIOLATED at step N (seed: S) - Protocol can progress ✓`
   - If satisfied: Output `⚠️ [X/Y] SATISFIED after N steps - May indicate liveness issue`
   - Record seed if violated for reproducibility
9. If satisfied, retry with increased `--max-steps` (200, 500, 1000)
10. Use `--mbt` flag for detailed trace when needed

**Category: Invariants (Safety)**

Output category header:
```
🛡️ Invariants (X) - expect satisfied = safety holds
```

11. For each invariant:
    - Before: Output `⏳ [X/Y] <name> (max-steps=N, samples=M)...`
    - Run `quint run <test_file> --main=<module> --invariant=<invariant> --max-steps=200 --max-samples=500`
    - If satisfied: Output `✓ [X/Y] SATISFIED after M samples - Safety holds ✓`
    - If violated: Output `❌ [X/Y] VIOLATED at step N (seed: S) - CRITICAL BUG FOUND`
    - If violated: Output reproduction command on next line (indented)
    - Record seed if violated for reproducibility
12. Stress test: Run with higher samples (1000+) for critical invariants
13. Use `--mbt` flag to debug violations

**Category: Deterministic Tests**

Output category header:
```
🧪 Deterministic Tests (X)
```

14. For each test:
    - Before: Output `⏳ [X/Y] <test_name>...`
    - Run `quint test <test_file> --main=<module> --match=<test>`
    - Success: Output `✓ [X/Y] PASSED (0.8s)`
    - Failure: Output `❌ [X/Y] FAILED`
    - Record output

### Phase 6: Result Aggregation
18. Collect all command outputs
19. Parse Quint CLI output for pass/fail
20. Extract seeds, traces, error messages
21. Calculate execution time per category

## Command Details

**Parse:**
```bash
quint parse <file>
# Exit 0 = success
# Exit non-zero = syntax error
```

**Typecheck:**
```bash
quint typecheck <file>
# Output: "All modules typechecked successfully" = pass
```

**Test:**
```bash
quint test <file> --main=<module> --match=<pattern>
# Output: "All tests passed" or "X passed, Y failed"
```

**Run (witness/invariant):**
```bash
quint run <file> \
  --main=<module> \
  --invariant=<name> \
  --max-steps=<N> \
  --max-samples=<M> \
  --seed=<S> \
  [--mbt] \
  [--verbosity=<1-5>]
```

## Output Parsing

**Witness violated (expected):**
```
An example execution:
[example trace]
[ok] No trace found (~X samples)
```
Status: ✅ Success (protocol can progress)

**Witness satisfied (unexpected):**
```
[ok] No trace found (~X samples)
```
Status: ⚠️ Concern (may indicate liveness issue)

**Invariant satisfied (expected):**
```
[ok] No trace found (~X samples)
```
Status: ✅ Success (safety holds)

**Invariant violated (unexpected):**
```
An example execution:
[counterexample trace]
```
Status: 🐛 Bug (safety violated)

**Test passed:**
```
All tests passed
```
Status: ✅ Success

**Test failed:**
```
1 passed, 1 failed
test_name: FAILED
[error details]
```
Status: 🐛 Bug or test issue

## Error Handling

**Compilation failure:**
```json
{
  "status": "completed",
  "compilation": {
    "spec": "failed",
    "test_file": "passed",
    "errors": ["Type error at line 45: Expected Int, got Str"]
  },
  "existing_tests": null,
  "witnesses": null,
  "invariants": null,
  "deterministic_tests": null,
  "note": "Cannot proceed with verification until compilation succeeds"
}
```

**Quint CLI unavailable:**
```json
{
  "status": "failed",
  "error": "quint command not found",
  "recovery": "Install Quint: npm install -g @informalsystems/quint"
}
```

**Timeout:**
```json
{
  "status": "partial",
  "note": "Some tests exceeded timeout",
  "compilation": {...},
  "witnesses": {
    "total": 3,
    "completed": 2,
    "timed_out": 1
  }
}
```

## Example

Input:
```
/verify/execute \
  --spec_path=specs/consensus.qnt \
  --test_file=specs/consensus_test.qnt \
  --framework=choreo
```

Output:
```json
{
  "status": "completed",
  "compilation": {
    "spec": "passed",
    "test_file": "passed",
    "errors": []
  },
  "existing_tests": {
    "total": 1,
    "passed": 1,
    "failed": 0,
    "results": [
      {"name": "happyPathTest", "status": "passed", "execution_time_ms": 1200}
    ]
  },
  "witnesses": {
    "total": 2,
    "violated": 2,
    "satisfied": 0,
    "results": [
      {
        "name": "canDecide",
        "status": "violated",
        "expected": "violated",
        "outcome": "success",
        "seed": 12345,
        "steps_to_violation": 12,
        "command": "quint run ... --seed=12345"
      },
      {
        "name": "canAdvanceRound",
        "status": "violated",
        "expected": "violated",
        "outcome": "success",
        "seed": 67890,
        "steps_to_violation": 25
      }
    ]
  },
  "invariants": {
    "total": 2,
    "satisfied": 1,
    "violated": 1,
    "results": [
      {
        "name": "agreement",
        "status": "violated",
        "expected": "satisfied",
        "outcome": "bug",
        "seed": 99999,
        "counterexample_step": 47,
        "command": "quint run ... --seed=99999 --mbt"
      },
      {
        "name": "validity",
        "status": "satisfied",
        "expected": "satisfied",
        "outcome": "success",
        "samples_checked": 500
      }
    ]
  },
  "deterministic_tests": {
    "total": 3,
    "passed": 3,
    "failed": 0,
    "results": [
      {"name": "normalConsensusPath", "status": "passed"},
      {"name": "byzantineEquivocation", "status": "passed"},
      {"name": "timeoutAdvance", "status": "passed"}
    ]
  },
  "execution_time_ms": 15678
}
```

## Performance

- Use the rust backend for the quint run


## Quality Standards

- Record every command executed
- Capture full output for failures
- Provide reproduction commands with seeds
- Clear success/failure/concern classification

## Progress Reporting

All output must be streamed in real-time as operations execute. This section defines the complete output format.

### Output Standards

**Real-time streaming:**
- Every operation must output progress BEFORE execution
- Results must be output IMMEDIATELY after completion
- No batching of output (stream line-by-line)
- Timing info included for all operations

**Formatting:**
- Include phase progress [X/5] in headers
- Include item progress [X/Y] within phases
- Show timing in milliseconds/seconds
- Align output for readability

### Symbol Guide

**Status Symbols:**
- ⏳ = Operation in progress
- ✓ = Success
- ❌ = Failure
- ⚠️ = Warning/concern
- 💾 = File saved
- 📊 = Summary/stats

**Category Symbols:**
- 🔍 = Witnesses (liveness checks)
- 🛡️ = Invariants (safety checks)
- 🧪 = Deterministic Tests (scenarios)
- 🔄 = Existing Tests (regression)

### Complete Output Example

```
╔══════════════════════════════════════════════════════════╗
║  Verification: consensus.qnt                             ║
╚══════════════════════════════════════════════════════════╝

[1/5] Detecting Framework...
⏳ Analyzing spec structure...
✓ Framework: standard (145ms)

[2/5] Generating Test Suite...
⏳ Designing witnesses for liveness properties...
✓ 3 witnesses designed (890ms)
⏳ Designing invariants for safety properties...
✓ 2 invariants designed (670ms)
⏳ Designing deterministic scenarios...
✓ 5 scenarios designed (1.2s)
💾 Test file: specs/consensus_test.qnt

[3/5] Compiling Specs...
⏳ quint parse consensus.qnt...
✓ Parse successful (234ms)
⏳ quint typecheck consensus.qnt...
✓ Typecheck passed (567ms)
⏳ quint parse consensus_test.qnt...
✓ Parse successful (189ms)
⏳ quint typecheck consensus_test.qnt...
✓ Typecheck passed (445ms)

[4/5] Running Verification Suite...

🔍 Witnesses (3) - expect violations = progress possible

⏳ [1/3] canDecide (max-steps=100, samples=100)...
✓ [1/3] VIOLATED at step 12 (seed: 12345) - Protocol can progress ✓

⏳ [2/3] canAdvanceRound (max-steps=100, samples=100)...
✓ [2/3] VIOLATED at step 25 (seed: 67890) - Protocol can progress ✓

⏳ [3/3] canCommit (max-steps=100, samples=100)...
⚠️ [3/3] SATISFIED after 100 samples - May indicate liveness issue
⏳ Retrying with max-steps=200...
✓ VIOLATED at step 156 (seed: 11223) - Protocol can progress ✓

🛡️ Invariants (2) - expect satisfied = safety holds

⏳ [1/2] agreement (max-steps=200, samples=500)...
❌ [1/2] VIOLATED at step 47 (seed: 99999) - CRITICAL BUG FOUND
   → quint run specs/consensus_test.qnt --main=ConsensusTest \
       --invariant=agreement --seed=99999 --mbt

⏳ [2/2] validity (max-steps=200, samples=500)...
✓ [2/2] SATISFIED after 500 samples - Safety holds ✓

🧪 Deterministic Tests (5)

⏳ [1/5] normalConsensusPath...
✓ [1/5] PASSED (0.8s)

⏳ [2/5] byzantineEquivocation...
✓ [2/5] PASSED (1.1s)

⏳ [3/5] timeoutAdvance...
✓ [3/5] PASSED (0.9s)

⏳ [4/5] networkPartition...
✓ [4/5] PASSED (1.3s)

⏳ [5/5] fastPath...
✓ [5/5] PASSED (0.7s)

[5/5] Generating Report...

📊 Verification Summary
───────────────────────────────────────────────────────────

Compilation: ✓ PASSED
  • consensus.qnt: parse ✓, typecheck ✓
  • consensus_test.qnt: parse ✓, typecheck ✓

Witnesses: 3/3 VIOLATED ✓ (liveness confirmed)
  • canDecide: step 12
  • canAdvanceRound: step 25
  • canCommit: step 156

Invariants: 1/2 SATISFIED ⚠️ (1 BUG FOUND)
  • agreement: VIOLATED ❌ (seed: 99999)
  • validity: SATISFIED ✓

Tests: 5/5 PASSED ✓
  • All deterministic scenarios passed

Total execution time: 15.7s

⚠️  ACTION REQUIRED: Fix agreement invariant violation
   Run with seed 99999 to reproduce counterexample
```

### Phase-Specific Guidelines

**Phase 1: Framework Detection**
- Single operation, show analyzing message
- Include timing
- Format: `✓ Framework: <name> (Xms)`

**Phase 2: Test Generation**
- Show progress for each test category (witnesses, invariants, scenarios)
- Include counts in success messages
- Show file path when saved

**Phase 3: Compilation**
- Show each command before executing
- Include file name in progress message
- Show timing for each step
- Stop immediately on first failure

**Phase 4: Verification Suite**
- Must show category headers with explanations
- Must include [X/Y] counters for all tests
- Must show max-steps and samples in progress message
- Must interpret results correctly:
  - Witness violated = success (protocol can progress)
  - Witness satisfied = concern (may indicate liveness issue)
  - Invariant satisfied = success (safety holds)
  - Invariant violated = bug (critical failure)
- Must include reproduction command for violations
- Must show timing for each test

**Phase 5: Report Generation**
- Summary with box-drawing characters
- Grouped by category with symbols
- Clear pass/fail counts
- Total execution time
- Action items if failures found

### Performance Considerations

**Streaming requirements:**
- Flush output after every line
- Don't buffer multiple operations
- Ensure timing is accurate (measure at command level)

**Timing display:**
- < 1s: Show milliseconds (234ms)
- >= 1s: Show seconds (1.2s)
- Long operations: Show progress every 5s

**Error handling:**
- Show error immediately when detected
- Include full error message
- Provide recovery command when possible
- Continue with remaining tests if possible

### Integration Notes

This command is called by verifier agent which adds:
- Additional context about spec being verified
- Decision logic for handling failures
- Aggregation across multiple specs
- Final report generation with recommendations

The verifier agent's progress output wraps this command's output, providing higher-level phase context while this command provides detailed operation-level progress.
