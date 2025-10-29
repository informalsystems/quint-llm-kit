# Implementer: Validation Failure and Iteration Protocols

**Version**: 4.0.0

**Purpose**: Reference for handling validation failures with decision trees, fix protocols, and iteration limits.

**When to use**: During validate command when parse, typecheck, or plan goal validation fails.

---

## Validation Failure Decision Tree

### Entry Point: Validation Failed

```
Execute validation
Check results:
  parse_status: passed | failed
  typecheck_status: passed | failed | not_run
  plan_goals_met: all | partial | none

Route to appropriate protocol:
  If parse_status == "failed":
    → Parse Error Protocol
  Else if typecheck_status == "failed":
    → Type Error Protocol
  Else if plan_goals_met == "partial" OR plan_goals_met == "none":
    → Missing Goal Protocol
  Else:
    → Success (no iteration needed)
```

---

## Parse Error Protocol

### Phase 1: Error Diagnosis

**Step 1: Capture Error Details**
```
Execute: quint parse <refactored_spec> 2>&1
Extract from output:
  - error_line: Line number where error occurred
  - error_type: SyntaxError | UnexpectedToken | etc.
  - error_message: Full description
  - error_context: Surrounding code (if provided)
```

**Step 2: Determine Error Source**
```
Check: Is error_line in recently modified code? [yes/no]

If yes (error in our changes):
  error_source = "generated_code"
  Branch: Generated Code Error Protocol
Else (error in untouched code):
  error_source = "collateral_damage"
  Branch: Collateral Damage Protocol
```

### Phase 2: Generated Code Error Protocol

**When**: Error in code we just added/modified

**Diagnosis Steps**:
```
Step 1: Read code at error_line
  Execute: Read <file> lines <error_line-5>:<error_line+5>

Step 2: Identify syntax issue category
  Check error_message for keywords:
    - "missing": Missing element (comma, brace, etc.)
    - "unexpected": Wrong token or structure
    - "expected": Wrong syntax pattern
```

**Fix Attempt 1: Simple Syntax Correction**
```
attempt_count = 1

If error_message contains "missing closing brace":
  Count: { vs } in definition
  Add: Missing } at appropriate location

Else if error_message contains "missing comma":
  Locate: Last item in list before error
  Add: Comma after last item

Else if error_message contains "unexpected token":
  Query KB: quint_get_doc("<construct> syntax")
  Compare: Generated syntax vs correct syntax
  Fix: Replace with correct syntax

Execute: quint parse <file>
If success: Return "fixed"
Else: Continue to Fix Attempt 2
```

**Fix Attempt 2: KB-Guided Correction**
```
attempt_count = 2

Extract: Construct type from error context
  Example: If error near "type Foo =", construct = "union type"

Query KB:
  quint_get_example("<construct>")
  quint_hybrid_search("common <construct> syntax errors quint")

Compare: Generated code vs KB examples
Identify: Discrepancy
Fix: Regenerate with correct syntax

Execute: quint parse <file>
If success: Return "fixed"
Else: Continue to Fix Attempt 3
```

**Fix Attempt 3: Alternate Insertion Point**
```
attempt_count = 3

Hypothesis: Insertion point caused scope issue

Read: Module structure around error_line
Check: Is new code inside another definition? [yes/no]

If yes (scope issue):
  Find: Alternate insertion point (5-10 lines away)
  Revert: Current change
  Regenerate: With new insertion point

Execute: quint parse <file>
If success: Return "fixed"
Else: Escalate to user
```

**Escalation**:
```
If attempt_count >= 3 AND parse still fails:
  Revert: All changes for this element
  Report to user:
    "Cannot fix parse error after 3 attempts:
     Error: <error_message>
     Location: <file>:<error_line>
     Attempts:
       1. <fix_attempt_1_description>
       2. <fix_attempt_2_description>
       3. <fix_attempt_3_description>

     Generated code:
     <code_snippet>

     How should I proceed?"
```

### Phase 3: Collateral Damage Protocol

**When**: Error in code we didn't modify

**Analysis**:
```
Step 1: Identify cause
  Our change likely:
    - Broke scope (added closing brace early)
    - Introduced name conflict
    - Changed indentation breaking structure

Step 2: Find relationship
  Execute: Read <file> lines <our_change_start>:<error_line>
  Determine: How our change affected error location
```

**Fix Strategy**:
```
If scope broken:
  Review: Brace matching in our change
  Fix: Ensure balanced braces

If name conflict:
  Rename: Our new element (add suffix _v2)

If indentation issue:
  Re-apply: Correct indentation to our change

Execute: quint parse <file>
If success: Return "fixed"
Else: Escalate to user with relationship analysis
```

---

## Type Error Protocol

### Phase 1: Error Diagnosis

**Step 1: Capture Type Error Details**
```
Execute: quint typecheck <refactored_spec> 2>&1
Extract from output:
  - error_location: File and line number
  - expected_type: What type was expected
  - actual_type: What type was found
  - error_category: "not in scope" | "type mismatch" | "missing annotation"
```

**Step 2: Categorize Error**
```
Read error_message

If contains "not in scope":
  error_category = "scope_error"
  Branch: Scope Error Protocol

Else if contains "type mismatch" OR "expected <T1>, got <T2>":
  error_category = "type_mismatch"
  Branch: Type Mismatch Protocol

Else if contains "missing type annotation":
  error_category = "missing_annotation"
  Branch: Annotation Protocol

Else:
  error_category = "unknown_type_error"
  Branch: Unknown Type Error Protocol
```

### Phase 2: Scope Error Protocol

**When**: Type/function "not in scope"

**Fix Attempt 1: Verify Definition Exists**
```
attempt_count = 1

Extract: Missing element name from error
Execute: grep "<element_name>" <file>

If not found:
  Add: Missing definition before first usage
  Reference: Refactor plan for expected definition

Else (definition exists):
  Continue to Fix Attempt 2
```

**Fix Attempt 2: Check Module Boundaries**
```
attempt_count = 2

Find: Module declaration above error_location
Find: Module declaration above element definition

If different_modules:
  Check: Import statement exists [yes/no]

  If no:
    Add: import statement
    Pattern: import <module>.* from "<file>"
  Else:
    Fix: Import syntax (may be incorrect)

Execute: quint typecheck <file>
If success: Return "fixed"
Else: Continue to Fix Attempt 3
```

**Fix Attempt 3: Check Definition Order**
```
attempt_count = 3

Compare: Line number of definition vs usage
If definition_line > usage_line:
  Problem: Type used before defined

  Move: Definition to earlier position
    New position: Before first usage
    Use: Insertion point decision matrix from implementation.md

Execute: quint typecheck <file>
If success: Return "fixed"
Else: Escalate with detailed analysis
```

### Phase 3: Type Mismatch Protocol

**When**: Expected type X, got type Y

**Analysis**:
```
Step 1: Locate mismatch source
  Read: Code at error_location
  Determine: Is this from our change? [yes/no]

Step 2: If from our change:
  Review: Refactor plan details
  Check: What type should this be?

  Compare: Plan type vs generated type
  If mismatch:
    Fix: Use correct type from plan

Step 3: If not from our change:
  Our change broke existing code
  Analyze: How did our change affect this?
```

**Fix Strategy**:
```
If our_code AND wrong_type:
  Correct: Type in our generated code
  Execute: quint typecheck <file>

Else if collateral_damage:
  Option 1: Add type coercion at usage site
  Option 2: Change our type to match expected
  Option 3: Revert our change

  Try: Option 1
  If fails after 2 attempts: Escalate to user
```

### Phase 4: Annotation Protocol

**When**: Missing explicit type annotation

**Fix Attempt 1: Add Type from Plan**
```
attempt_count = 1

Extract: Element name from error
Find: Element in refactor plan

If element in plan:
  Extract: Type from plan.details
  Add: Type annotation
  Pattern: def <name>: <Type> = <body>

Execute: quint typecheck <file>
If success: Return "fixed"
Else: Continue to Fix Attempt 2
```

**Fix Attempt 2: Infer Type from Context**
```
attempt_count = 2

Read: Element definition
Analyze: Body to infer type
  Example: If returns Int literal → type is Int

Query KB: quint_hybrid_search("type inference <construct>")
Apply: Inferred type annotation

Execute: quint typecheck <file>
If success: Return "fixed"
Else: Escalate to user
```

---

## Missing Goal Protocol

**When**: Plan says add X, but X not found in refactored spec

### Phase 1: Verification

**Step 1: Confirm Missing**
```
For each goal in plan where status != "met":
  Extract: goal.name, goal.type (add|modify|remove)

  Execute verification:
    If type == "add":
      grep "<goal.name>" <file>
      If not found: goal_actually_missing = true

    If type == "modify":
      Read <file> at <goal.line_ref>
      Check: Modification evident? [yes/no]
      If no: goal_actually_missing = true

    If type == "remove":
      grep "<goal.name>" <file>
      If found: goal_actually_missing = true (should be gone)
```

**Step 2: Determine Cause**
```
Read: Implementer output logs
Check: Was this goal attempted? [yes/no]

If yes (attempted but verification failed):
  Likely: Syntax error during application
  Check: Parse/typecheck logs for errors during this goal

If no (not attempted):
  Likely: Skipped due to earlier failure
  Check: Previous goals for failures
```

### Phase 2: Recovery

**Fix Protocol**:
```
attempt_count = 0

For each missing goal (in dependency order):
  attempt_count++

  Re-execute: apply for this specific goal
  Verify: Parse and typecheck after application

  If success:
    Mark: goal_status = "met"
  Else:
    Record: failure_reason
    Continue: to next goal (if independent)

  If attempt_count >= 3 OR all goals attempted:
    Break

Report: Current status of all goals
If any still missing: Escalate to user
```

---

## Iteration Loop Structure

### Maximum Attempts: 3

```
iteration_count = 0
max_iterations = 3
issues_remaining = validation_failures

while (issues_remaining.length > 0 AND iteration_count < max_iterations):
  iteration_count++

  Step 1: Prioritize Issues
    Sort by severity:
      - Parse errors (block everything)
      - Type errors (block execution)
      - Missing goals (incomplete implementation)

  Step 2: Select Issue to Fix
    issue = issues_remaining[0] (highest priority)

  Step 3: Apply Appropriate Protocol
    If issue.type == "parse_error":
      Execute: Parse Error Protocol
    Else if issue.type == "type_error":
      Execute: Type Error Protocol
    Else if issue.type == "missing_goal":
      Execute: Missing Goal Protocol

  Step 4: Re-Validate
    Execute: quint parse <file>
    Execute: quint typecheck <file>
    Execute: Check plan goals

    Update: issues_remaining (remove fixed issues)

  Step 5: Check Loop Condition
    If issues_remaining.length == 0:
      Return: "all_issues_resolved"

    If iteration_count >= max_iterations:
      Break

If iteration_count >= max_iterations AND issues_remaining.length > 0:
  Escalate to user with:
    - Remaining issues list
    - What was attempted
    - Partial success status
```

---

## Quality Self-Check Protocol

### Execute Before Reporting Success

**Mandatory Checks**:
```
Step 1: Completeness Verification
  For each change in refactor plan:
    Check: Exists in refactored spec? [yes/no]

  If ANY == no:
    Record: missing_changes
    Fail: Quality check
  Else:
    Pass: Completeness

Step 2: Correctness Verification
  For each modification (where type == "modify"):
    Read: Modified code
    Compare: Against plan.details
    Check: Modification matches intent? [yes/no]

  If ANY == no:
    Record: incorrect_modifications
    Fail: Quality check
  Else:
    Pass: Correctness

Step 3: No Regression Verification
  If existing tests available:
    Execute: quint test <test_file> --match=".*"
    Check: All tests pass? [yes/no]

    If no:
      Record: failing_tests
      Fail: Quality check
  Else:
    Pass: No regression (no tests to verify)

Step 4: Pattern Compliance Verification
  For each pattern in plan.patterns_to_apply:
    Verify: Pattern applied correctly? [yes/no]
    Example: thin-actions → check action delegates to pure function

  If ANY == no:
    Record: unapplied_patterns
    Fail: Quality check
  Else:
    Pass: Pattern compliance
```

**Decision**:
```
Calculate: passed_checks / total_checks

If passed_checks == total_checks:
  quality_status = "ready_for_approval"
Else:
  quality_status = "needs_iteration"
  Required: Address failed checks before reporting success
```

---

## Escalation Criteria

### Condition 1: Max Iterations Exceeded

```
If iteration_count >= 3 AND issues_remaining.length > 0:
  Revert: All changes (restore original spec)

  Report to user:
    "Validation failed after 3 iteration attempts.

     Remaining issues:
     <list of issues with details>

     Iteration history:
     Iteration 1: <what was attempted, result>
     Iteration 2: <what was attempted, result>
     Iteration 3: <what was attempted, result>

     Recommendation: <specific recommendation based on issue pattern>

     How should I proceed?"
```

### Condition 2: Breaking Change Detected

```
If validation breaks existing functionality:
  Evidence:
    - Tests that passed on original now fail
    - Type errors in untouched code
    - Parse errors outside modified sections

  Report to user:
    "Refactoring introduced breaking changes:

     Breaking changes:
     <list with locations>

     This is outside the scope of the refactor plan.

     Continue anyway? (yes/no)"
```

### Condition 3: Ambiguous Plan

```
If refactor plan details insufficient for implementation:
  Example: "Modify step action" (no specifics)

  Report to user:
    "Cannot complete change due to ambiguous plan:

     Plan says: '<plan.details>'
     Issue: Not specific enough to implement

     Need clarification: <specific questions>

     How should I proceed?"
```

### Condition 4: Conflicting Goals

```
If two goals conflict:
  Example: Goal 1 adds field X, Goal 2 removes field X

  Report to user:
    "Refactor plan contains conflicting goals:

     Goal A: <description>
     Goal B: <description>
     Conflict: <explanation>

     Which goal should take precedence?"
```

---

## Success Criteria Decision Matrix

| Check | Status | Weight | Required |
|-------|--------|--------|----------|
| All planned changes applied | pass/fail | Critical | Yes |
| Parse validation passed | pass/fail | Critical | Yes |
| Typecheck validation passed | pass/fail | Critical | Yes |
| Existing tests pass | pass/fail/n/a | High | If tests exist |
| Patterns applied | pass/fail | Medium | If patterns specified |
| No unintended changes | pass/fail | Medium | Yes |
| Formatting preserved | pass/fail | Low | No |

**Decision Logic**:
```
Check: All "Critical" checks == pass? [yes/no]
If no: Cannot report success, must iterate

Check: All "High" checks == pass OR n/a? [yes/no]
If no: Should iterate or escalate

Check: All "Medium" checks == pass? [yes/no]
If no: Consider iterating if attempts remain

If all_critical_pass AND all_high_pass:
  Report: status = "completed"
Else:
  If iteration_count < max_iterations:
    Continue iteration
  Else:
    Escalate to user
```

---

## Validation Command Execution Matrix

| Validation Type | Command | Expected Exit Code | When to Run |
|----------------|---------|-------------------|-------------|
| Parse | `quint parse <file>` | 0 | After every change, after every fix |
| Typecheck | `quint typecheck <file>` | 0 | After parse succeeds |
| Test (if exists) | `quint test <test_file> --match=".*"` | 0 | After typecheck succeeds |
| LSP hover (optional) | `mcp__quint-lsp__textDocument/hover` | N/A (check return) | For high-risk changes |
| Diff check | `diff -u <original> <refactored>` | N/A (manual review) | Before reporting success |

---

## Version Notes

**v4.0.0 Changes**:
- Removed vague language ("should", "try to", "consider checking")
- Transformed to decision trees with explicit routing logic
- Added three-phase protocols (Diagnosis → Fix → Verification) for each error type
- Specified max iteration count (3) with explicit escalation criteria
- Added quality self-check protocol with Boolean pass/fail checks
- Transformed success criteria to decision matrix
- Made all conditionals explicit with [yes/no] checks
- Added escalation templates with specific information requirements
