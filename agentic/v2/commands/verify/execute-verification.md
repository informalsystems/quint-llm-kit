---
command: /verify:execute-verification
description: Run comprehensive verification suite on spec and test file with module instance support
version: 4.0.0
---

# Verify Execute Verification Command

## Objective

Execute complete verification suite on ALL module instances with real-time progress reporting and result aggregation.

**Verification includes:**
- Compilation (parse + typecheck)
- **Simulations** (`quint run`): Check witnesses (liveness) and invariants (safety) via random exploration
- **Tests** (`quint test`): Execute `run` definitions (test cases with `.then()` and `.expect()`)

## Quint CLI Command Templates

Use these exact templates when executing Quint commands:

### Check Witness (Liveness)
```bash
quint run <test_file> --main=<module_name> --invariant=<witness_name> --max-steps=<N> --max-samples=<M>
```
- `<test_file>`: Path to test file
- `<module_name>`: Module instance name (e.g., "TestValid")
- `<witness_name>`: Name of witness to check
- `<N>`: Max steps per trace (default: 100)
- `<M>`: Max sample runs (default: 100)

### Check Invariant (Safety)
```bash
quint run <test_file> --main=<module_name> --invariant=<invariant_name> --max-steps=<N> --max-samples=<M>
```
- `<invariant_name>`: Name of invariant to check
- `<N>`: Max steps per trace (default: 200)
- `<M>`: Max sample runs (default: 500)

### Reproduce Failure
```bash
quint run <test_file> --main=<module_name> --invariant=<property_name> --seed=<seed_value> --verbosity=3
```
- `<seed_value>`: Seed from failure output (format: 0x...)

### Execute Tests (Run Definitions)
```bash
quint test <test_file> --main=<module_name> --match="<test_pattern>"
```
- `<test_pattern>`: Test name or regex pattern (use `".*"` for all tests)
- **IMPORTANT**: Always use `--match` with `quint test` to specify which tests to run

### Parse/Typecheck Only
```bash
quint parse <file>
quint typecheck <file>
```

## Input Contract

### Required Parameters
- `spec_path`: Path to specification being verified
- `test_file`: Path to test file (from design-tests)
- `framework`: Framework type ("standard" | "choreo")

### Optional Parameters
None

## Output Contract

### Success
```json
{
 "status": "completed",
 "compilation": {
 "spec": "passed",
 "test_file": "passed",
 "errors": []
 },
 "module_instances": ["TestValid", "TestFaulty"],
 "results_by_module": {
 "TestValid": {
 "witnesses": {"total": 3, "violated": 3, "satisfied": 0},
 "invariants": {"total": 2, "satisfied": 2, "violated": 0},
 "tests": {"total": 5, "passed": 5, "failed": 0}
 },
 "TestFaulty": {
 "witnesses": {"total": 3, "violated": 3, "satisfied": 0},
 "invariants": {"total": 2, "satisfied": 1, "violated": 1},
 "tests": {"total": 5, "passed": 4, "failed": 1}
 }
 },
 "overall": {
 "witnesses": {"total": 6, "violated": 6, "satisfied": 0},
 "invariants": {"total": 4, "satisfied": 3, "violated": 1},
 "tests": {"total": 10, "passed": 9, "failed": 1}
 },
 "execution_time_ms": 15678
}
```

### Failure
```json
{
 "status": "failed",
 "error": "Specific error description",
 "phase": "compilation | module_detection | test_execution",
 "compilation": {
 "spec": "failed",
 "test_file": "not_run",
 "errors": ["Parse error at line 45"]
 }
}
```

## Execution Procedure

### Phase 1: Compilation

Objective: Verify both spec and test file compile successfully.

**Progress Output**: `[1/5] Compiling Specs...`

Steps:

1. **Parse Spec**
 - Output: `⏳ quint parse <spec_name>.qnt...`
 - Run: `quint parse <spec_path>`
 - Check exit code:
 - If 0: Output `✓ Parse successful (234ms)`, set spec.parse = "passed"
 - If non-zero: Output `❌ Parse failed: <error>`, return immediately

2. **Typecheck Spec**
 - Output: `⏳ quint typecheck <spec_name>.qnt...`
 - Run: `quint typecheck <spec_path>`
 - Check output:
 - If contains "success": Output `✓ Typecheck passed (567ms)`, set spec.typecheck = "passed"
 - If contains errors: Output `❌ Typecheck failed: <error>`, return immediately

3. **Parse Test File**
 - Output: `⏳ quint parse <test_name>.qnt...`
 - Run: `quint parse <test_file>`
 - If exit non-zero: Return with compilation error

4. **Typecheck Test File**
 - Output: `⏳ quint typecheck <test_name>.qnt...`
 - Run: `quint typecheck <test_file>`
 - If fails: Return with compilation error

5. **Compilation Success Check**
 - If all 4 checks passed: Proceed to Phase 2
 - If any failed: Return error with compilation details

### Phase 2: Module Instance Detection

Objective: Identify all module instances that need separate test execution.

**Progress Output**: `[2/5] Detecting Module Instances...`

Steps:

6. **Parse Test File for Modules**
 - Run: Read test_file content
 - Search for pattern: `module\s+(\w+)\s*\{`
 - Extract: All module names

7. **Identify Instance Modules**
 - Per module found:
 - Check: Does it contain `include` statement?
 - Pattern: `include\s+(\w+)`
 - If yes: This is a module instance
 - Extract: Module name
 - Store: List of module instances

8. **Determine Execution Strategy**
 - If module instances found:
 - Set execution_mode = "parameterized"
 - Store: Module instance list
 - Example: ["TestValid", "TestFaulty"]
 - Output: `✓ Found 2 module instances: TestValid (N=4,f=1), TestFaulty (N=4,f=2)`
 - If no instances:
 - Set execution_mode = "simple"
 - Use default module from test file
 - Output: `✓ Single module configuration`

9. **Extract Instance Parameters** (optional)
 - Per instance module:
 - Search for: `const\s+(\w+)\s*=\s*(\d+)`
 - Extract: Parameter values (N, f, etc.)
 - Display in progress output

### Phase 3: Test Query

Objective: Identify all tests in test file.

**Progress Output**: `[3/5] Querying Test Structure...`

Steps:

10. **Query Test Types**
 - Run: Grep test_file for patterns:
 - Witnesses: `val\s+(\w+)\s*=.*not\(`
 - Invariants: `val\s+(\w+)\s*=` (excluding witnesses)
 - Tests: `run\s+(\w+)\s*=`
 - Store: Lists by category

11. **Count Tests**
 - Count: Total witnesses, invariants, tests (run definitions)
 - Output: `✓ Found 3 witnesses, 2 invariants, 5 tests`

### Phase 4: Test Execution Loop

Objective: Run all tests on ALL module instances.

**Progress Output**: `[4/5] Running Verification Suite...`

Steps:

12. **Per Module Instance** (or once if no instances):

 a. **Set Module Context**
 - If parameterized: Set module_name = instance name
 - If simple: Set module_name from test file or default

 b. **Output Module Header**
 - If parameterized: Output `\n=== Testing Module: <module_name> ===\n`

 c. **Execute Witnesses**
 - Output: `🔍 Witnesses (<count>) - expect violations = progress possible`
 - Per witness:
 - Output: `⏳ [X/Y] <name> (max-steps=100, samples=100)...`
 - Run: `quint run <test_file> --main=<module_name> --invariant=<witness> --max-steps=100 --max-samples=100`
 - Parse output:
 - If "An example execution" found: Violated
 - Extract seed from output
 - Output: `✓ [X/Y] VIOLATED at step N (seed: S) - Protocol can progress ✓`
 - If "No trace found": Satisfied
 - Output: `⚠️ [X/Y] SATISFIED after 100 samples - May indicate liveness issue`
 - Retry with --max-steps=200, then 500 if still satisfied
 - Record result with module context

 d. **Execute Invariants**
 - Output: `🛡️ Invariants (<count>) - expect satisfied = safety holds`
 - Per invariant:
 - Output: `⏳ [X/Y] <name> (max-steps=200, samples=500)...`
 - Run: `quint run <test_file> --main=<module_name> --invariant=<invariant> --max-steps=200 --max-samples=500`
 - Parse output:
 - If "No trace found": Satisfied
 - Output: `✓ [X/Y] SATISFIED after M samples - Safety holds ✓`
 - If "An example execution": Violated
 - Extract seed
 - Output: `❌ [X/Y] VIOLATED at step N (seed: S) - CRITICAL BUG FOUND`
 - Output reproduction command (indented):
 ```
 → quint run <test_file> --main=<module_name> --invariant=<invariant> --seed=<S> --mbt
 ```
 - Record result with module context

 e. **Execute Tests (Run Definitions)**
 - Output: `🧪 Tests (Run Definitions) (<count>)`
 - Per test:
 - Output: `⏳ [X/Y] <test_name>...`
 - Run: `quint test <test_file> --main=<module_name> --match="<test>"`
 - **Note:** Always use `--match` parameter to specify test name or pattern
 - Parse output:
 - If "All tests passed": Output `✓ [X/Y] PASSED (0.8s)`
 - If "failed": Output `❌ [X/Y] FAILED`
 - Record result with module context
 - **Note:** If tests fail, see `guidelines/test-debugging.md` for systematic debugging

 f. **Store Module Results**
 - Aggregate results for this module instance
 - Store in results_by_module[module_name]

### Phase 5: Result Aggregation

Objective: Combine results from all module instances.

**Progress Output**: `[5/5] Aggregating Results...`

Steps:

13. **Aggregate by Category**
 - Per category (witnesses, invariants, tests):
 - Sum: Totals across all modules
 - Sum: Pass/fail counts across all modules
 - Create: overall section in output

14. **Calculate Statistics**
 - Total execution time: Sum of all command durations
 - Per-module statistics: Already stored from step 12f
 - Overall statistics: From step 13

15. **Construct Output JSON**
 - Include: Compilation results
 - Include: Module instances list
 - Include: results_by_module (per-instance breakdown)
 - Include: overall (aggregated totals)
 - Include: execution_time_ms

16. **Return Success**
 - Status: "completed"
 - All results included

## Module Instance Testing (Critical Fix)

**Problem** (v3 and earlier):
```quint
module consensus_test {
 val canDecide = ...
 run normalPath = ...

 module TestValid { const N=4; const f=1; include consensus_test }
 module TestFaulty { const N=4; const f=2; include consensus_test }
}
```
→ Tests defined in consensus_test but ONLY run on default module
→ TestValid and TestFaulty instances NEVER executed

**Solution** (v4):
- **Phase 2** detects: TestValid, TestFaulty
- **Phase 4** executes: Tests separately Per instance with `--main=TestValid`, then `--main=TestFaulty`
- Results tracked per-instance: results_by_module["TestValid"], results_by_module["TestFaulty"]
- Aggregate: overall section sums across all instances

**Example Execution**:
1. Detect 2 instances: TestValid, TestFaulty
2. Run witnesses on TestValid: 3/3 violated ✓
3. Run invariants on TestValid: 2/2 satisfied ✓
4. Run tests on TestValid: 5/5 passed ✓
5. Run witnesses on TestFaulty: 3/3 violated ✓
6. Run invariants on TestFaulty: 1/2 satisfied (1 expected violation)
7. Run tests on TestFaulty: 4/5 passed (1 expected failure)
8. Aggregate: Overall 6 witnesses, 3/4 invariants satisfied, 9/10 tests passed

## Tools Used

- `Bash(quint)`: All quint CLI commands (parse, typecheck, run, test)
- `Read`: Read test file for module detection
- `Grep`: Find test definitions and patterns

## Error Handling

### Compilation Failure
- **Condition**: Parse or typecheck fails for spec or test file
- **Action**: Return immediately with compilation errors, do not proceed to execution
- **Recovery**: Fix syntax/type errors, retry verification

### Module Detection Failure
- **Condition**: Cannot parse test file to find modules
- **Action**: Fall back to simple execution mode with default module
- **Recovery**: Manually specify module if needed

### Test Execution Failure
- **Condition**: Quint command crashes or times out
- **Action**: Record partial results, continue with remaining tests
- **Recovery**: Check quint installation, increase timeout if needed

### No Tests Found
- **Condition**: Test file has no witnesses, invariants, or tests
- **Action**: Return warning with empty results
- **Recovery**: Run design-tests to generate test suite

