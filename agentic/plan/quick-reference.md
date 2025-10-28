# Workflow Quick Reference

## Overview

Two-step workflow for refactoring and verifying Quint specifications:
1. **Automated Pipeline**: Plan, implement, and verify (basic soundness checks)
2. **Interactive Testing**: Generate listener tests that document which actions can be triggered under the current spec

---

## Step 1: Automated Refactor Pipeline

### Command

```bash
/refactor-pipeline --spec=<path> --request="<description>"
```

### Required Arguments

- `--spec=<path>` - Path to Quint specification file(s)
  - Single file: `--spec=specs/consensus.qnt`
  - Multiple files: `--spec=["specs/consensus.qnt", "specs/network.qnt"]`

- `--request="<description>"` - Natural language description of desired changes
  - Example: `--request="Add timeout mechanism for stalled rounds"`
  - Example: `--request="Transform Tendermint to FaB algorithm"`

### Optional Arguments

- `--auto-approve=<true|false>` - Skip manual plan approval (default: `false`)
- `--output-dir=<path>` - Directory for refactored specs (default: `./refactored/`)

### What It Does

1. **Analysis** - Analyzer agent extracts requirements and creates refactor plan
2. **Approval** - Presents plan for user approval (unless `--auto-approve=true`)
3. **Implementation** - Implementer agent applies changes with validation loops
4. **Verification** - Verifier-light agent runs:
   - Parse checks
   - Typecheck validation
   - Basic invariant testing (safety properties)
   - Basic witness testing (liveness properties)
5. **Feedback Loops** - Automatic error correction -> Verification -> Re-implementation / Re-planning as needed

### Output Artifacts

All artifacts written to `.artifacts/`:
- `requirement-analysis.json` - Extracted requirements
- `refactor-plan.json` - Approved refactor plan
- `verification-report.json` - Test results and issues
- `pipeline-state.json` - Pipeline execution state

Refactored spec written to: `./refactored/<spec_name>.qnt` (or custom `--output-dir`)

### Example

```bash
/refactor-pipeline \
  --spec=specs/consensus.qnt \
  --request="Add PrePropose phase with justification checking"
```

---

## Step 2: Interactive Listener Testing

### Command

```bash
/interactive:test-listeners --spec=<refactored_spec>
```

### Required Arguments

- `--spec=<refactored_spec>` - Path to refactored specification
  - Example: `--spec=./refactored/consensus.qnt`

### What It Does

Automatically generates comprehensive tests (Quint `run` definitions) that:
- Document how to trigger each branch in the main listener
- Cover all decision paths and edge cases
- Identify and document failing scenarios
- Provide reproduction steps for each test case

### Output

Test file with:
- Branch coverage documentation
- Passing scenarios (showing valid execution paths)
- Failing scenarios (documented with failure reasons)
- Reproduction commands for each test

### Example

```bash
/interactive:test-listeners --spec=./refactored/consensus.qnt
```

---

## Complete Workflow Example

```bash
# Step 1: Run automated pipeline
/refactor-pipeline \
  --spec=specs/tendermint.qnt \
  --request="changes/pseudocode.md" \
  --output-dir=./refactored

# Review verification report at .artifacts/verification-report.json

# Step 2: Generate listener branch tests
/interactive:test-listeners --spec=./refactored/tendermint.qnt

# Review generated test file with branch coverage documentation
```

---

## When to Use Each Step

### Use `/refactor-pipeline` when:
- Starting a new refactoring task
- Need automated planning and implementation
- Want basic soundness verification (parse/typecheck/basic properties)
- Working on structural changes to the spec

### Use `/interactive:test-listeners` when:
- Pipeline verification passes
- Need detailed branch coverage for listeners
- Want to document all execution paths
- Need to identify edge cases and failure scenarios
- Building comprehensive test suite

---

## Notes

- Original specs are never modified (read-only)
- All changes go to isolated workspace (`./refactored/` by default)
- Pipeline includes feedback loops for automatic error correction
- Interactive testing generates human-readable documentation
- Failing scenarios are documented, not hidden

