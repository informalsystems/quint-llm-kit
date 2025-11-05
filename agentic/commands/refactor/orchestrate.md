---
command: /refactor:orchestrate
description: Orchestrate complete refactor workflow with analyzer, implementer, verifier, and feedback loops
version: 4.0.0
---

# Refactor Pipeline Orchestrator

## Objective

Execute complete Quint specification refactoring workflow coordinating analyzer, implementer, and verifier agents with feedback loops, user approval, and cross-agent reflection for quality assurance.

## File Operation Constraints

**CRITICAL**: Workspace organization enforced across all agents:
- **Artifacts**: All planning/analysis/verification outputs → `.artifacts/` directory
- **Refactored specs**: All modified specs → `refactored/` directory (or custom output_dir)
- **NEVER use `/tmp` or system temp directories**
- All agents must respect workspace boundaries

## Input Contract

### Required Parameters
- `user_request`: Natural language description of changes needed
- `spec_path`: Path to Quint specification file(s)

### Optional Parameters
- `auto_approve`: Skip user approval for plan (default: false)
- `output_dir`: Directory for refactored specs (default: `./refactored/`)

## Output Contract

### Success
```json
{
 "status": "completed",
 "phases_completed": ["analysis", "implementation", "verification", "summary"],
 "agent_outputs": {
 "analyzer": {
 "requirements": 3,
 "plan_approved": true
 },
 "implementer": {
 "files_modified": ["./refactored/consensus.qnt"],
 "validation_attempts": 1,
 "parse": "passed",
 "typecheck": "passed"
 },
 "verifier": {
 "witnesses": {"total": 5, "violated": 5},
 "invariants": {"total": 3, "satisfied": 3},
 "tests": {"total": 15, "passed": 15},
 "critical_issues": 0
 }
 },
 "feedback_loops": [
 {
 "from": "verifier",
 "to": "implementer",
 "reason": "quorum_formula_fix",
 "resolved": true
 }
 ],
 "alignment": "all_agents_aligned",
 "artifacts": [
 ".artifacts/requirement-analysis.json",
 ".artifacts/refactor-plan.json",
 ".artifacts/verification-report.json",
 ".artifacts/pipeline-state.json"
 ]
}
```

### Failure
```json
{
 "status": "failed",
 "phase": "implementation | verification",
 "error": "Specific error description",
 "iterations_attempted": {
 "implementer_validation": 5,
 "verifier_iteration": 3
 },
 "partial_results": {
 "analyzer": "completed",
 "implementer": "validation_failed",
 "verifier": "not_started"
 },
 "recovery_steps": [
 "Fix parse error at line 45",
 "Retry implementation phase"
 ]
}
```

## Execution Procedure

### Phase 1: Analysis & Planning

**Objective**: Generate refactor plan and obtain user approval.

**Steps**:

1. **Invoke Analyzer Agent**
 - Execute: Launch @analyzer with task:
 ```
 Analyze the spec at <spec_path> and Create refactor plan for: <user_request>
 ```
 - Wait: Agent completion
 - Check: Agent returned success

2. **Load Plan Artifact**
 - Execute: Read `.artifacts/refactor-plan.json`
 - Validate: Contains required fields (modules, changes, dependencies)
 - If missing: Return error "Analyzer did not produce valid plan"

3. **Present Plan to User** (unless auto_approve == true)
 - Format plan summary:
 - List modules to modify
 - List changes by category (ADD/MODIFY/REMOVE)
 - Show estimated risk level
 - Prompt user: "Do you approve this refactor plan? (yes/no/modify)"
 - Capture response

4. **Handle User Response**
 - If response == "no":
 - Set status = "cancelled_by_user"
 - Return: Exit pipeline
 - If response == "modify":
 - Prompt: "What changes should be made to the plan?"
 - Capture modifications
 - Return to step 1 with modified request
 - If response == "yes":
 - Proceed to step 5

5. **Record Approval**
 - Execute: Read refactor-plan.json
 - Modify: Add approval metadata:
 ```json
 {
 "approval": {
 "approved": true,
 "timestamp": "<current_timestamp>",
 "approver": "user"
 }
 }
 ```
 - Execute: Write updated refactor-plan.json
 - Proceed to Phase 2

### Phase 2: Implementation with Validation Loop

**Objective**: Apply refactor plan to spec in isolated workspace with validation.

**Steps**:

6. **Initialize Attempt Counter**
 - Set: implementation_attempt = 0

7. **Per Attempt** (iterate until validation passes or cannot proceed):

 a. **Invoke Implementer Agent**
 - Increment: implementation_attempt
 - Execute: Launch @implementer with task:
 ```
 Implement the approved refactor plan at .artifacts/refactor-plan.json for spec <spec_path>.
 Use requirement analysis at .artifacts/requirement-analysis.json.
 Output directory: <output_dir>
 Original user request: <user_request>
 ```
 - Wait: Agent completion

 b. **Read Implementer Output**
 - Parse: Implementer response
 - Extract: validation.parse, validation.typecheck, plan_goals_met
 - Check: overall status

 c. **Validation Success Check**
 - If validation.parse == "passed" AND validation.typecheck == "passed" AND all plan_goals_met:
 - Record: implementation_success = true
 - Break loop, proceed to Phase 3
 - Else:
 - Proceed to step d

 d. **Classify Validation Failure**
 - Determine failure type:
 - Parse error: Syntax issue in generated code
 - Typecheck error: Type mismatch or missing import
 - Missing goal: Planned change not applied
 - Extract: Specific error message and location

 e. **Cross-Reflection with Analyzer**
 - Execute: Launch @analyzer with query:
 ```
 @analyzer: The implementer failed validation with error: <error_details>
 Error type: <parse|typecheck|missing_goal>
 Location: <file:line>

 Question: Does the refactor plan need adjustment, or is this an implementation issue?
 ```
 - Wait: Analyzer response
 - Parse: analyzer_assessment (plan_issue | implementation_issue)

 f. **Apply Feedback**
 - If analyzer_assessment == "plan_issue":
 - Update: refactor-plan.json with analyzer corrections
 - Log: Feedback loop (analyzer → implementer, reason: "plan_correction")
 - If analyzer_assessment == "implementation_issue":
 - Prepare: Targeted guidance for implementer
 - Log: Feedback loop (self → implementer, reason: "implementation_guidance")

 g. **Check Progress**
 - Assess: Can further progress be made?
 - Track: Whether same error repeats without improvement
 - If cannot proceed (no progress after multiple attempts):
 - Break loop, proceed to step 8

8. **Implementation Failure Escalation** (if cannot proceed)
 - Record: All validation failures and attempts made
 - Prompt user: "Implementation failed after <implementation_attempt> attempts with no further progress. Continue to verification anyway? (yes/no)"
 - If user response == "no":
 - Return: Failure status with partial results
 - If user response == "yes":
 - Log warning: "Proceeding with potentially invalid spec"
 - Proceed to Phase 3

### Phase 3: Verification with Feedback Loop

**Objective**: Execute comprehensive verification with issue resolution.

**Steps**:

9. **Initialize Iteration Counter**
 - Set: verification_iteration = 0
 - Determine: refactored_spec_path from implementer output

10. **Per Iteration** (iterate until verification passes or cannot proceed):

 a. **Invoke verifier Agent**
 - Increment: verification_iteration
 - Execute: Launch @verifier with task:
 ```
 Verify the refactored spec at <refactored_spec_path>.
 Use requirement analysis at .artifacts/requirement-analysis.json.
 Original user request: <user_request>
 ```
 - Wait: Agent completion

 b. **Read Verification Report**
 - Execute: Read `.artifacts/verification-report.json`
 - Extract: overall_status, issues, requirements_coverage
 - Check: critical_issues count

 c. **Classify Verification Outcome**
 - If overall_status == "success" AND critical_issues == 0:
 - Record: verification_success = true
 - Break loop, proceed to Phase 4
 - If critical_issues > 0:
 - Proceed to step d (spec bug analysis)
 - If overall_status == "has_failures" but all issues are "suspect" or "coverage_gap":
 - Proceed to step g (test gap handling)

 d. **Analyze Critical Issues**
 - Per issue where severity == "critical":
 - Check issue.type:
 - If type == "bug": Spec logic error
 - If type == "suspect": Needs investigation
 - Extract: issue.evidence, issue.reproduction, issue.root_cause_hypothesis

 e. **Cross-Reflection for Spec Bugs**
 - Execute: Launch @analyzer with query:
 ```
 @analyzer: A bug was found during verification: <issue.title>
 Evidence: <issue.evidence>
 Root cause hypothesis: <issue.root_cause_hypothesis>

 Question: Is this a fundamental issue with the refactor plan, or an implementation error?
 ```
 - Wait: Analyzer response
 - Parse: bug_assessment (plan_issue | implementation_issue)
 - If bug_assessment == "plan_issue":
 - Update refactor plan
 - Return to Phase 2
 - If bug_assessment == "implementation_issue":
 - Proceed to step f

 f. **Invoke Implementer for Bug Fix**
 - Execute: Launch @implementer with task:
 ```
 @implementer: verifier found a bug in the refactored spec:
 - Issue: <issue.title>
 - Evidence: <issue.evidence>
 - Location: <issue.requirement_id or inferred location>
 - Reproduction: <issue.reproduction>

 Please fix this issue. Original plan: .artifacts/refactor-plan.json
 Refactored spec: <refactored_spec_path>
 ```
 - Wait: Implementer completion
 - Log: Feedback loop (verifier → implementer, reason: "spec_bug_fix")
 - Continue to next iteration (return to step 10a)

 g. **Handle Test Gaps**
 - For issues where type == "coverage_gap" or "suspect":
 - Execute: Launch @verifier with task:
 ```
 @verifier: Some tests indicate potential gaps rather than spec bugs.
 Issues: <list of suspect/coverage_gap issues>

 Please improve test coverage for these scenarios and re-run verification.
 ```
 - Wait: verifier completion
 - Log: Feedback loop (self → verifier, reason: "test_improvement")
 - Continue to next iteration (return to step 10a)

 h. **Check Progress**
 - Assess: Are issues being resolved or repeating?
 - Track: Whether same issues persist without improvement
 - If cannot proceed (no progress after multiple attempts):
 - Break loop, proceed to step 11

11. **Verification Failure Escalation** (if cannot proceed)
 - Summarize: Remaining issues by type and severity
 - List: Reproduction commands per failure
 - Classify: Issues as spec_bugs vs test_gaps
 - Prompt user: "Verification found <issue_count> remaining issues after <verification_iteration> iterations with no further progress. How to proceed? (continue/abort/retry)"
 - Handle response:
 - If "abort": Return failure status
 - If "retry": Reset iteration counter, return to step 10a
 - If "continue": Log warning, proceed to Phase 4

### Phase 4: Cross-Agent Summary & Report

**Objective**: Generate comprehensive report with cross-agent alignment analysis.

**Steps**:

12. **Collect All Artifacts**
 - Execute: Read `.artifacts/requirement-analysis.json`
 - Execute: Read `.artifacts/refactor-plan.json`
 - Execute: Read `.artifacts/verification-report.json`
 - Parse: Implementer output (from Phase 2)
 - Parse: Pipeline state tracking data

13. **Analyze Cross-Agent Alignment**
 - Compare: Analyzer plan vs Implementer delivery
 - Check: All planned changes were applied
 - Check: Implementation matches plan intent
 - Classify: aligned | partially_aligned | diverged
 - Compare: Analyzer expectations vs verifier findings
 - Check: Behavioral requirements status
 - Check: Unexpected issues found
 - Classify: aligned | issues_found | major_discrepancies
 - Summarize: Alignment status

14. **Count Feedback Loops**
 - Review: All logged feedback loops
 - Count: By type (analyzer→implementer, verifier→implementer, verifier→verifier)
 - Calculate: Resolution success rate

15. **Generate Final Report**
 - Format report with sections:
 - Original Request summary
 - Analyzer output summary
 - Implementer output summary
 - verifier output summary
 - Cross-Agent Reflection analysis
 - Feedback loops executed
 - Final status determination
 - Next steps recommendations
 - Use template:

```
╔══════════════════════════════════════════════════════════╗
║ Refactor Pipeline Complete ║
╚══════════════════════════════════════════════════════════╝

Original Request:
 <user_request>

📋 Analysis (@analyzer):
 - Requirements identified: <count>
 - Refactor plan: <summary>
 - Approval: <timestamp or auto-approved>

🔧 Implementation (@implementer):
 - Files modified: <list>
 - Validation attempts: <count>
 - Parse/typecheck: <status>
 - Plan goals met: <count>/<total>
 - Requirements satisfied: <structural_count>

✅ Verification (@verifier):
 - Configurations tested: <module_instances or single>
 - Witnesses: <violated>/<total> (expect all violated)
 - Invariants: <satisfied>/<total> (expect all satisfied)
 - Tests: <passed>/<total>
 - Critical issues: <count>

🔄 Cross-Agent Reflection:
 - Analyzer ↔ Implementer: <aligned | diverged>
 - Analyzer ↔ verifier: <aligned | issues_found>
 - Feedback loops executed: <count>
 - Issues auto-resolved: <count>
 - Issues requiring manual review: <count>

📊 Final Status: <SUCCESS | ISSUES_FOUND | PARTIAL>

Artifacts Generated:
 - .artifacts/requirement-analysis.json
 - .artifacts/refactor-plan.json
 - .artifacts/verification-report.json
 - .artifacts/pipeline-state.json
 - <refactored_spec_path>

Next Steps:
 <recommendations>
```

16. **Present Report to User**
 - Output: Formatted report
 - Include: Reproduction commands for any failures
 - Include: Links to all artifacts

17. **Write Pipeline State**
 - Create pipeline-state.json with:
 - Final phase reached
 - Attempt counts for all loops
 - Feedback loop history
 - Cross-reflection outcomes
 - Final status
 - Execute: Write `.artifacts/pipeline-state.json`

18. **Return Response**
 - Status: "completed"
 - Include: All agent outputs summary
 - Include: Feedback loop summary
 - Include: Artifact paths

## Feedback Loop Patterns

### Pattern 1: Implementer Validation Retry

**Trigger**: Validation fails (parse, typecheck, missing goals)

**Actors**: @implementer, @analyzer

**Process**:
1. Classify error type from validation output
2. Query @analyzer: "Is the plan correct or does it need adjustment?"
3. If plan issue: Update plan, retry @implementer
4. If implementation issue: Provide targeted guidance, retry @implementer
5. Iterate until resolved or no further progress possible, then escalate to user

**Example**:
```
Validation failed: Typecheck error "Cannot find name 'TimeoutState'"
Query @analyzer: "Plan says add TimeoutState type. Should this be imported or defined?"
Analyzer: "Should be defined as new type in module"
Guidance to @implementer: "Define TimeoutState as new type, do not import"
Retry implementation.
```

### Pattern 2: verifier Bug Fix Loop

**Trigger**: Tests fail due to spec logic errors (critical issues)

**Actors**: @verifier, @implementer, @analyzer

**Process**:
1. @verifier identifies spec bug with evidence
2. Query @analyzer: "Is this expected behavior or a bug?"
3. If bug confirmed:
 - Check if plan issue or implementation issue
 - Route to @implementer for fix
4. Re-run @verifier after fix
5. Max 2 iterations before user escalation

**Example**:
```
@verifier found: Invariant 'agreement' violated (quorum uses 3*f+1)
Query @analyzer: "Requirement specifies Byzantine quorum. Is 3*f+1 correct?"
Analyzer: "No, Byzantine quorum is 5*f+1 for this protocol"
@implementer: "Fix quorum definition from 3*f+1 to 5*f+1"
Re-verify after fix.
Result: Invariant now satisfied.
```

### Pattern 3: Test Improvement Loop

**Trigger**: Tests fail but likely due to incomplete coverage (suspects/gaps)

**Actors**: @verifier

**Process**:
1. Classify failing tests as coverage gaps
2. Request @verifier improve test coverage for specific scenarios
3. Re-run verification with improved tests
4. Compare results: Did new tests provide clarity?

**Example**:
```
Test 'canDecide' witness satisfied (not violated as expected)
Classification: Suspect (liveness concern)
@verifier: "Increase --max-steps to 500 and add intermediate checks"
Re-run with improved test.
Result: Witness now violated at step 347 (liveness confirmed).
```

## State Tracking

Track pipeline progress in `.artifacts/pipeline-state.json`:

```json
{
 "pipeline_version": "4.0.0",
 "user_request": "Add timeout mechanism",
 "spec_path": "specs/consensus.qnt",
 "output_dir": "./refactored",
 "phase": "verification",
 "phases_completed": ["analysis", "implementation"],
 "attempt_counts": {
 "implementer_validation": 2,
 "verifier_iteration": 1
 },
 "feedback_loops": [
 {
 "iteration": 1,
 "from": "pipeline",
 "to": "implementer",
 "reason": "parse_error_line_45",
 "resolved": true,
 "resolution": "Fixed missing closing brace"
 },
 {
 "iteration": 2,
 "from": "verifier",
 "to": "implementer",
 "reason": "quorum_formula_bug",
 "resolved": true,
 "resolution": "Changed 3*f+1 to 5*f+1"
 }
 ],
 "cross_reflections": [
 {
 "actors": ["analyzer", "implementer"],
 "topic": "plan_alignment",
 "outcome": "aligned",
 "timestamp": "2025-10-23T14:32:00Z"
 },
 {
 "actors": ["analyzer", "verifier"],
 "topic": "requirement_verification",
 "outcome": "requirements_met",
 "timestamp": "2025-10-23T14:45:00Z"
 }
 ],
 "status": "in_progress",
 "last_updated": "2025-10-23T14:45:00Z"
}
```

## Tools Used

- `Task`: Launch specialized agents (analyzer, implementer, verifier)
- `Read`: Read artifacts from .artifacts/ directory
- `Write`: Write updated artifacts (approval metadata, pipeline state)
- `AskUserQuestion`: Obtain user approval and decisions

## Error Handling

### Agent Invocation Failure
- **Condition**: Agent fails to launch or crashes during execution
- **Action**: Record error, save pipeline state
- **Recovery**: Prompt user "Agent <name> failed: <error>. Retry agent? (yes/no/skip phase)"
 - If "yes": Retry agent invocation
 - If "no": Abort pipeline
 - If "skip phase": Continue to next phase with warning

### Infinite Loop Detection
- **Condition**: Same feedback loop repeats 3 times without progress
- **Action**: Detect loop pattern (same from/to/reason in consecutive iterations)
- **Recovery**: Stop loop, escalate to user with summary: "Feedback loop stuck: <from> → <to> for <reason>. Manual intervention required."

### No Further Progress Possible
- **Condition**: Iterations continue but same errors persist without improvement
- **Action**: Detect no-progress state (same error/issue for multiple consecutive attempts), summarize all attempts and failures
- **Recovery**: Prompt user for decision (abort/continue/retry with manual adjustment)

### User Interruption
- **Condition**: User cancels pipeline mid-execution
- **Action**: Write pipeline-state.json with current phase and progress
- **Recovery**: Support resume from last completed phase (future feature)

### Artifact Missing
- **Condition**: Expected artifact file not found (e.g., refactor-plan.json after analyzer)
- **Action**: Return error "Agent <name> did not produce expected artifact: <file>"
- **Recovery**: Re-run agent that should produce the artifact

## Critical Guidelines

**Mandatory Rules**:

1. **Agent Usage Required**: Analyzer, implementer, and verifier agents MUST be used as described. Do not skip agents or perform their work directly.

2. **Original Specs Read-Only**: NEVER modify files at `spec_path`. All refactored code written to `output_dir` (default: `./refactored/`).

3. **Use Agent Commands**: Each agent uses specific commands:
 - Implementer: `/refactor:prepare`, `/refactor:apply`, `/refactor:validate`


4. **No Shortcuts**: Do not combine phases, skip validation, or bypass approval workflow.

5. **Follow Sequence**: Analysis → Approval → Implementation → Verification. This order is mandatory.

6. **User Control**: Always obtain approval before major changes (unless auto_approve=true).

7. **State Preservation**: Write pipeline-state.json after each phase for transparency.

## Quality Checklist

Before marking pipeline as complete:
- [ ] User approved refactor plan (or auto_approve=true)
- [ ] Implementer validation passed
- [ ] All planned changes applied
- [ ] verifier executed on all module instances
- [ ] Critical bugs resolved or documented
- [ ] Cross-agent reflections show alignment
- [ ] Final report includes all perspectives
- [ ] All artifacts written to .artifacts/
- [ ] Pipeline state tracked in pipeline-state.json

## Usage Examples

**Simple invocation**:
```
/refactor-pipeline --spec=specs/consensus.qnt --request="Add timeout mechanism"
```

**With custom parameters**:
```
/refactor-pipeline \
 --spec=specs/consensus.qnt \
 --request="Add timeout mechanism for delayed messages" \
 --max-implementation-attempts=3 \
 --max-verification-iterations=2 \
 --auto-approve=false \
 --output-dir=./refactored_v2/
```

**Multi-file refactor**:
```
/refactor-pipeline \
 --spec=["specs/consensus.qnt", "specs/network.qnt"] \
 --request="Unify quorum definitions across modules"
```

