# Implementer: Validation Failure and Iteration Protocols

**Version**: 5.0.0

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
     Attempts: <attempt_descriptions>

     Generated code: <code_snippet>

     How should I proceed?"
```

### Phase 3: Collateral Damage Protocol

**When**: Error in code we didn't modify

**Critical Insight**: Our change broke unrelated code

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
    Use: Insertion point logic from implementation.md

Execute: quint typecheck <file>
If success: Return "fixed"
Else: Escalate with detailed analysis
```

### Phase 3: Type Mismatch Protocol

**When**: Expected type X, got type Y

**Strategy**:
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

  Options:
    1. Add type coercion at usage site
    2. Change our type to match expected
    3. Revert our change

  Try: Option 1 first
  If fails after 2 attempts: Escalate
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

## Escalation Criteria

Stop and ask user for guidance if ANY condition true:

| Condition | Trigger | Action |
|-----------|---------|--------|
| **Max Iterations** | iteration_count >= 3 AND issues remain | Revert all changes, report attempts, ask for guidance |
| **Breaking Change** | Typecheck fails in untouched code | Report what broke, ask "Continue anyway?" |
| **Ambiguous Plan** | Plan details insufficient for implementation | Report ambiguity, ask for clarification |
| **Conflicting Goals** | Two goals contradict each other | Report conflict, ask which takes precedence |

**Escalation Template**:
```
"<Problem Title>

<Detailed description of what went wrong>

Attempted fixes:
  1. <fix_1>: <result>
  2. <fix_2>: <result>
  3. <fix_3>: <result>

<Specific question for user>

How should I proceed?"
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

**Decision Logic**:
```
Check: All "Critical" checks == pass? [yes/no]
If no: Cannot report success, must iterate

Check: All "High" checks == pass OR n/a? [yes/no]
If no: Should iterate or escalate

If all_critical_pass AND all_high_pass:
  Report: status = "completed"
Else:
  If iteration_count < max_iterations:
    Continue iteration
  Else:
    Escalate to user
```

---

## Common Error Patterns (Quick Reference)

### Parse Errors

| Error Message | Cause | Fix |
|---------------|-------|-----|
| "missing closing brace" | Unbalanced {} | Count braces, add missing } |
| "missing comma" | Last item in list | Add comma after last item |
| "unexpected token '}'" | Extra closing brace OR missing opening | Check brace pairing |
| "unexpected token in module" | Wrong insertion point | Try alternate insertion point |

### Type Errors

| Error Message | Cause | Fix |
|---------------|-------|-----|
| "X not in scope" | Missing definition or import | Add definition or import statement |
| "expected Int, got Bool" | Type mismatch | Check plan, use correct type |
| "missing type annotation" | Quint can't infer type | Add explicit type annotation |
| "circular definition" | Type uses itself incorrectly | Reorder or restructure definition |

---
