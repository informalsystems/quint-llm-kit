---
command: /verify:classify-results
description: Analyze verification execution results and produce structured report with issues and recommendations
version: 4.0.0
---

# Verify Classify Results Command

## Objective

Analyze verification execution results, classify all findings, link to requirements, and generate actionable report with prioritized recommendations.

## Input Contract

### Required Parameters
- `execution_results`: JSON output from execute-verification command
- `spec_path`: Path to specification being verified

### Optional Parameters
- `requirement_analysis`: Path to requirement-analysis.json for requirement tracing

## Output Contract

### Success
```json
{
 "status": "completed",
 "report_path": ".artifacts/verification-report.json",
 "overall_status": "success" | "has_failures",
 "summary": {
 "total_requirements": 5,
 "requirements_passed": 4,
 "critical_issues": 1,
 "total_issues": 3
 }
}
```

Generates `verification-report.json` conforming to `schemas/verification-report.json`.

### Failure
```json
{
 "status": "failed",
 "error": "Specific error description",
 "phase": "load_context | classify | link_requirements | generate_report"
}
```

## Execution Procedure

### Phase 1: Context Loading

Objective: Load all inputs and validate.

Steps:

1. **Parse Execution Results**
 - Run: Parse execution_results JSON
 - Check: Contains required fields (compilation, witnesses, invariants, tests)
 - Action on invalid: Return error "Invalid execution results structure"

2. **Load Requirements** (if provided)
 - Run: Read requirement_analysis from path
 - Extract: Requirements with IDs, descriptions, types
 - Build: Requirement lookup map

3. **Read Spec for Context**
 - Run: Read spec_path
 - Purpose: Provide context for analyzing issues
 - Extract: Module names, key definitions

### Phase 2: Compilation Classification

Objective: Check if verification could run.

Steps:

4. **Check Compilation Status**
 - Extract: compilation.spec, compilation.test_file from results
 - If either == "failed":
 - Create issue:
 - Type: "compilation_failure"
 - Severity: "blocker"
 - Category: "compilation"
 - Title: "Spec/test file does not compile"
 - Evidence: compilation.errors
 - Remediation: "Fix syntax/type errors before verification"
 - Set: overall_status = "compilation_failed"
 - Return: Report with single blocker issue
 - If both == "passed":
 - Proceed to Phase 3

### Phase 3: Test Result Classification

Objective: Classify all test execution results.

Steps:

5. **Classify Witness Results**
 - Per witness in execution_results.witnesses.results:

 a. **Expected: Violated**
 - If witness.status == "violated":
 - Classification: ✅ Success
 - Meaning: Protocol CAN progress (liveness confirmed)
 - Mark: Associated liveness requirement as "verified"
 - No issue created

 b. **Unexpected: Satisfied**
 - If witness.status == "satisfied":
 - Create issue:
 - Type: "suspect"
 - Category: "witness_not_violated"
 - Title: "{witness.name} never violated"
 - Evidence: "Remained satisfied after {max_steps} steps, {max_samples} samples"
 - Root cause hypothesis: "Witness too strong OR protocol stuck OR need more steps"
 - Remediation: "Increase --max-steps to 500/1000, verify witness definition, check if actions reachable"
 - Mark: Associated requirement as "suspect"

6. **Classify Invariant Results**
 - Per invariant in execution_results.invariants.results:

 a. **Expected: Satisfied**
 - If invariant.status == "satisfied":
 - Classification: ✅ Success
 - Meaning: Safety property holds
 - Mark: Associated safety requirement as "verified"
 - No issue created

 b. **Unexpected: Violated**
 - If invariant.status == "violated":
 - Create issue:
 - Type: "bug"
 - Category: "invariant_violation"
 - Title: "{invariant.name} violated"
 - Evidence: Extract from counterexample (step number, state snapshot)
 - Reproduction: Full quint run command with seed and --mbt flag
 - Root cause hypothesis: Analyze trace to infer likely cause
 - Remediation: "Fix spec logic at [inferred location based on trace]"
 - Mark: Associated requirement as "failed"

7. **Classify Test (Run Definition) Results**
 - Per test in execution_results.deterministic_tests.results:

 a. **Expected: Passed**
 - If test.status == "passed":
 - Classification: ✅ Success
 - Mark: Associated scenario requirement as "verified"
 - No issue created

 b. **Unexpected: Failed**
 - If test.status == "failed":
 - **Use `guidelines/test-debugging.md` for systematic analysis**
 - Analyze failure type:
 - Check: Is assertion failure or execution error?
 - Check: Is test using correct API?
 - Check: Are test assumptions valid?
 - Create issue:
 - Type: "bug" (if spec logic error) OR "weak_assertion" (if test issue)
 - Category: "test_failure"
 - Evidence: Test output, failing assertion
 - Remediation: Based on failure analysis
 - Mark: Associated requirement as "failed" or "partially_covered"

8. **Classify Existing Test Results** (if any)
 - Per existing test:
 - If passed: No issue
 - If failed:
 - Create issue:
 - Type: "bug"
 - Category: "regression"
 - Title: "Existing test {name} failed"
 - Remediation: "Investigate spec changes that broke test"

### Phase 4: Requirement Linking

Objective: Map findings to requirements.

Steps:

9. **Build Coverage Matrix**
 - Per requirement in requirement_analysis:
 - Initialize: requirement_entry

10. **Link Tests to Requirements**
 - Per test result:
 - Extract: Associated requirement ID (from test metadata or name matching)
 - Add: Test to requirement's covered_by list
 - Add: Verification result to requirement

11. **Calculate Requirement Status**
 - Per requirement:
 - Determine status:
 - If all covering tests passed: "verified"
 - If any covering test failed: "failed"
 - If witness satisfied (unexpected): "suspect"
 - If no covering tests: "not_covered"
 - If some passed, some failed: "partially_covered"
 - Link: Associated issue IDs

12. **Identify Coverage Gaps**
 - Per requirement marked "not_covered":
 - Create issue:
 - Type: "coverage_gap"
 - Category: "missing_test"
 - Title: "Requirement {id} not covered by tests"
 - Remediation: "Add test to verify this requirement"

### Phase 5: Recommendation Generation

Objective: Provide actionable next steps.

Steps:

13. **Generate Recommendations**
 - Per issue:
 - Determine recommendation category:
 - "fix_bug": For confirmed bugs
 - "investigate": For suspects needing analysis
 - "add_coverage": For coverage gaps
 - "improve_tests": For weak assertions
 - Estimate effort: high | medium | low
 - Write specific suggestion with actionable steps

14. **Create Reproduction Commands**
 - Per issue with reproduction command:
 - Extract: Full quint command with seed
 - Include: Description of what it reproduces
 - Store in reproduction_commands array

15. **Determine Next Actions**
 - Based on issues found:
 - List all bugs to fix
 - List all suspects to investigate
 - List all coverage gaps to address

### Phase 6: Report Generation

Objective: Write complete structured report.

Steps:

16. **Calculate Summary Statistics**
 - Total requirements vs covered
 - Requirements passed vs failed
 - Tests by category (passed/failed)
 - Invariants (satisfied/violated)
 - Witnesses (violated/satisfied)
 - Total issues count

17. **Determine Overall Status**
 - If compilation failed: overall_status = "compilation_failed"
 - If any issues: overall_status = "has_failures"
 - If no issues: overall_status = "success"

19. **Construct Report JSON**
 - Include: overall_status
 - Include: summary statistics
 - Include: all issues with full details
 - Include: requirements_coverage matrix
 - Include: recommendations
 - Include: reproduction_commands
 - Include: next_actions list

20. **Write Report File**
 - Run: Write JSON to report_path (default: .artifacts/verification-report.json)
 - Check: File written successfully

21. **Return Success**
 - Status: "completed"
 - Include: report_path, overall_status, summary

## Classification Rules

### Issue Types

**bug**:
- Confirmed defect in specification
- Invariant violated, test failed due to spec logic

**suspect**:
- Unexpected behavior needing investigation
- Witness never violated, unclear root cause

**coverage_gap**:
- Requirement not adequately verified
- Missing test for specified scenario

**weak_assertion**:
- Test exists but doesn't verify enough
- Test passes but missing critical checks

**compilation_failure**:
- Spec or test doesn't compile
- Blocks all verification

## Tools Used

- `Read`: Read spec and requirement analysis
- `Write`: Write verification report JSON

## Error Handling

### Invalid Execution Results
- **Condition**: execution_results JSON missing required fields
- **Action**: Return error "Invalid execution results: missing field '<field>'"
- **Recovery**: Ensure execute-verification completed successfully

### Requirement Analysis Not Found
- **Condition**: requirement_analysis path provided but file not found
- **Action**: Continue without requirement tracing, log warning
- **Recovery**: Proceed with classification, skip requirement linking

### Spec Not Found
- **Condition**: spec_path does not exist
- **Action**: Continue with limited context for issue analysis
- **Recovery**: Classification proceeds without spec context

### Report Write Failure
- **Condition**: Cannot write to report_path
- **Action**: Return error "Cannot write report: <reason>"
- **Recovery**: Check permissions, verify path is writable

## Example Execution

**Input**:
```
/verify:classify-results \
 --execution_results='<JSON from execute-verification>' \
 --requirement_analysis=.artifacts/requirement-analysis.json \
 --spec_path=specs/consensus.qnt
```

**Process**:
1. Parse execution results: 2 witnesses, 2 invariants, 3 tests
2. Load requirements: 2 requirements
3. Check compilation: passed
4. Classify witnesses: Both violated → success
5. Classify invariants: 1 satisfied, 1 violated → create critical issue
6. Classify tests: All passed → success
7. Link to requirements: REQ-SAFETY-01 → agreement invariant → failed
8. Generate recommendations: Fix agreement violation
9. Create reproduction command for invariant
10. Calculate summary: 1 critical issue
11. Determine overall: has_failures
12. Write report

**Output** (verification-report.json excerpt):
```json
{
 "overall_status": "has_failures",
 "summary": {
 "total_requirements": 2,
 "requirements_passed": 1,
 "requirements_failed": 1,
 "critical_issues": 1,
 "total_issues": 1
 },
 "issues": [
 {
 "id": "ISSUE-001",
 "type": "bug",
 "category": "invariant_violation",
 "title": "Agreement invariant violated",
 "description": "Two correct nodes decided on different values",
 "requirement_id": "REQ-SAFETY-01",
 "evidence": "Node p1 decided v0, node p2 decided v1 at step 47",
 "reproduction": "quint run specs/consensus_test.qnt --main=TestValid --invariant=agreement --seed=99999 --mbt",
 "root_cause_hypothesis": "Decision logic allows deciding without proper quorum check",
 "remediation": "Review decide() action quorum calculation, ensure 2f+1 nodes agree on SAME value"
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
 "covered_by": ["canDecide witness", "normalPath test"],
 "verification_results": [
 {"type": "witness", "name": "canDecide", "result": "violated (expected)"},
 {"type": "test", "name": "normalPath", "result": "passed"}
 ],
 "issue_ids": []
 }
 ],
 "recommendations": [
 {
 "requirement_id": "REQ-SAFETY-01",
 "category": "fix_bug",
 "suggestion": "Fix agreement violation in decision mechanism",
 "effort": "medium",
 "details": "Check quorum calculation ensures 2f+1 nodes agree on SAME value before deciding"
 }
 ],
 "reproduction_commands": [
 {
 "description": "Reproduce agreement violation",
 "command": "quint run specs/consensus_test.qnt --main=TestValid --invariant=agreement --seed=99999 --mbt --verbosity=3"
 }
 ],
 "next_actions": [
 "Fix bug: Agreement invariant violation (ISSUE-001)",
 "Re-run verification after fix to confirm resolution"
 ]
}
```

## Quality Standards

**Checklist**:
- [ ] Every issue linked to requirement (when available)
- [ ] Exact reproduction command for all failures
- [ ] Actionable remediation suggestions
- [ ] Clear distinction between spec bugs and test bugs
- [ ] Requirement coverage matrix complete
- [ ] All issues listed in next actions

