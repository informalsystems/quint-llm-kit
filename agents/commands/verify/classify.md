# Verify Classify Command

**Purpose**: Analyze verification execution results and produce structured report with issues and recommendations.

**Version**: 2.0.0

## Arguments

```
/verify/classify \
  --execution_results=<json> \
  [--requirement_analysis=<path>] \
  --spec_path=<path>
```

- `execution_results`: JSON output from verify/execute
- `requirement_analysis`: Optional path to requirement-analysis.json for tracing
- `spec_path`: Path to spec being verified

## Output

Generates `verification-report.json` conforming to `schemas/verification-report.json`

## Process

### 1. Load Context
- Parse execution_results JSON
- Load requirement_analysis if provided
- Read spec for context on findings

### 2. Classify Compilation Results
If compilation failed:
- **Type**: `compilation_failure`
- **Severity**: `blocker`
- **Remediation**: Fix errors before proceeding

### 3. Classify Existing Test Results
For each existing test:

**Passed:**
- Status: ✅ Baseline validation success
- No issue created

**Failed:**
- **Type**: `bug` (potential regression)
- **Severity**: `high` if test was passing in baseline, `medium` otherwise
- **Category**: `regression`
- **Remediation**: Investigate spec changes that broke test

### 4. Classify Witness Results
Witnesses should be VIOLATED (finding counterexample = protocol can progress)

For each witness:

**Violated (expected):**
- Status: ✅ Success
- Requirement status: `verified` for associated liveness requirement
- No issue created

**Satisfied (unexpected):**
- **Type**: `suspect` or `coverage_gap`
- **Severity**: `high` (potential liveness issue)
- **Category**: `witness_not_violated`
- **Title**: "{witness_name} never violated"
- **Evidence**: "Remained satisfied after {N} steps, {M} samples"
- **Root cause hypothesis**: "Witness too strong OR protocol stuck OR need more steps"
- **Remediation**: "Increase --max-steps, verify witness definition, check if actions reachable"

### 5. Classify Invariant Results
Invariants should be SATISFIED (property holds = safety OK)

For each invariant:

**Satisfied (expected):**
- Status: ✅ Success
- Requirement status: `verified` for associated safety requirement
- No issue created

**Violated (unexpected):**
- **Type**: `bug`
- **Severity**: `critical` (safety property broken!)
- **Category**: `invariant_violation`
- **Title**: "{invariant_name} violated"
- **Evidence**: Extract from counterexample trace
- **Reproduction**: Full command with seed
- **Root cause hypothesis**: Analyze trace for likely cause
- **Remediation**: "Fix spec logic at [inferred location]"

### 6. Classify Deterministic Test Results
Tests should PASS

For each test:

**Passed:**
- Status: ✅ Success
- Requirement status: `verified` for associated scenario
- No issue created

**Failed:**
- Determine if failure is:
  - Real bug in spec (logic error)
  - Test uses wrong API (test code issue)
  - Test assumption incorrect
- **Type**: `bug` or `weak_assertion`
- **Severity**: `high` for critical scenarios, `medium` otherwise
- **Category**: `test_failure`
- **Evidence**: Test output, assertion that failed
- **Remediation**: Based on failure analysis

### 7. Link to Requirements
For each requirement in requirement_analysis:
- Identify which tests/invariants/witnesses cover it
- Calculate status: `verified`, `failed`, `suspect`, `not_covered`, `partially_covered`
- List associated issues (if any)

### 8. Calculate Coverage Metrics
- Total requirements vs. covered
- Tests passed vs. failed by category
- Invariants holding vs. violated
- Witnesses violated (good) vs. satisfied (concern)

### 9. Generate Recommendations
For each issue:
- **Category**: `fix_bug`, `investigate`, `add_coverage`, `improve_tests`
- **Priority**: `critical`, `high`, `medium`, `low`
- **Effort**: `high`, `medium`, `low`
- **Specific suggestion** with actionable steps

### 10. Determine Overall Status
- `success`: All tests passed, all invariants held, witnesses demonstrated progress
- `has_failures`: Some issues found but spec compiled
- `compilation_failed`: Cannot verify due to compilation errors

### 11. Output Generation
Write JSON conforming to verification-report.json schema with:
- Overall status and summary
- All issues with full details
- Requirements coverage matrix
- Recommendations prioritized
- Reproduction commands for all issues
- Next actions

## Classification Rules

### Issue Severity

**Blocker:**
- Compilation failure
- Cannot run any tests

**Critical:**
- Safety invariant violated
- Core protocol property broken

**High:**
- Liveness concern (witness never violated)
- Existing test regression
- Critical scenario test failed

**Medium:**
- Non-critical scenario failed
- Coverage gap for medium-priority requirement

**Low:**
- Weak assertion (test passes but doesn't check enough)
- Documentation issue

### Issue Types

**bug:**
- Confirmed defect in specification
- Invariant violated, test failed due to spec logic

**suspect:**
- Unexpected behavior needing investigation
- Witness never violated, unclear root cause

**coverage_gap:**
- Requirement not adequately verified
- Missing test for specified scenario

**weak_assertion:**
- Test exists but doesn't verify enough
- Test passes but missing critical checks

**compilation_failure:**
- Spec or test doesn't compile
- Blocks all verification

## Error Handling

**Invalid execution results:**
```json
{
  "error": "execution_results missing required field 'compilation'",
  "report_path": null
}
```

**Requirement analysis not found:**
- Proceed without requirement tracing
- Flag in report: "Requirements not available for coverage analysis"

## Example

Input:
```
/verify/classify \
  --execution_results='{...}' \
  --requirement_analysis=.artifacts/requirement-analysis.json \
  --spec_path=specs/consensus.qnt
```

Output (verification-report.json):
```json
{
  "overall_status": "has_failures",
  "summary": {
    "total_requirements": 5,
    "requirements_covered": 4,
    "requirements_passed": 3,
    "requirements_failed": 1,
    "compilation_status": "passed",
    "existing_tests": {"total": 1, "passed": 1, "failed": 0},
    "witnesses": {"total": 2, "violated": 2, "satisfied": 0, "success": 2, "concerns": 0},
    "invariants": {"total": 2, "satisfied": 1, "violated": 1, "success": 1, "bugs": 1},
    "deterministic_tests": {"total": 3, "passed": 3, "failed": 0}
  },
  "issues": [
    {
      "id": "ISSUE-001",
      "type": "bug",
      "severity": "critical",
      "category": "invariant_violation",
      "title": "Agreement invariant violated",
      "description": "Two correct nodes decided on different values",
      "requirement_id": "REQ-SAFETY-01",
      "module": "Consensus",
      "component": "decision mechanism",
      "evidence": "Node p1 decided v0, node p2 decided v1 at step 47",
      "reproduction": "quint run ... --seed=99999 --mbt",
      "root_cause_hypothesis": "Decision logic allows deciding without proper quorum check",
      "remediation": "Review decide() action quorum calculation",
      "priority": 1
    }
  ],
  "requirements_coverage": [
    {
      "requirement_id": "REQ-SAFETY-01",
      "description": "Agreement: no two correct nodes decide differently",
      "status": "failed",
      "covered_by": ["agreement invariant"],
      "verification_results": [
        {"type": "invariant", "name": "agreement", "result": "violated"}
      ],
      "issue_ids": ["ISSUE-001"]
    },
    {
      "requirement_id": "REQ-LIVENESS-01",
      "description": "Protocol can reach decision",
      "status": "verified",
      "covered_by": ["canDecide witness", "normalConsensusPath test"],
      "verification_results": [
        {"type": "witness", "name": "canDecide", "result": "violated (expected)"},
        {"type": "test", "name": "normalConsensusPath", "result": "passed"}
      ],
      "issue_ids": []
    }
  ],
  "recommendations": [
    {
      "requirement_id": "REQ-SAFETY-01",
      "category": "fix_bug",
      "suggestion": "Fix agreement violation in decision mechanism",
      "priority": "critical",
      "effort": "medium",
      "details": "Check quorum calculation ensures 2f+1 nodes agree on SAME value"
    }
  ],
  "reproduction_commands": [
    {
      "description": "Reproduce agreement violation",
      "command": "quint run specs/consensus_test.qnt --main=consensus_test --invariant=agreement --max-steps=200 --seed=99999 --mbt --verbosity=3"
    }
  ],
  "next_actions": [
    "Fix critical bug: Agreement invariant violation (ISSUE-001)",
    "Re-run verification after fix to confirm resolution"
  ]
}
```

## Quality Standards

- Conservative classification (when uncertain, higher severity)
- Every issue linked to requirement (when available)
- Exact reproduction command for all failures
- Actionable remediation suggestions
- Clear distinction between spec bugs and test bugs
- Requirement coverage matrix complete
