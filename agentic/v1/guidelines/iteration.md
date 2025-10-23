# Implementer: Iteration and Troubleshooting Guidelines

**Purpose**: Reference guide for handling validation failures and iterating to quality.

**When to use**: During Phase 4-5 (Validation and Iteration) when validation fails or quality issues are detected.

---

## When Validation Fails

### Step 1: Diagnose the Issue

```bash
# Parse error:
quint parse refactored.qnt 2>&1 | tee parse_error.log
# Look for: line number, specific syntax issue

# Type error:
quint typecheck refactored.qnt 2>&1 | tee type_error.log
# Look for: type mismatch details, location
```

### Step 2: Categorize the Problem

| Error Type | Likely Cause | Solution Strategy |
|------------|--------------|-------------------|
| Parse error at added code | `/refactor/apply` generated bad syntax | Query KB for correct syntax, regenerate |
| Type error in new definition | Missing import or wrong type | Add import or fix type annotation |
| Type error in modified code | Change broke type compatibility | Review modification, check types with LSP |
| Test failure | Behavior changed unexpectedly | Review logic change, may be correct per plan |

### Step 3: Apply Targeted Fix

#### For Parse Errors
```bash
1. Read the error line context
2. Query KB: quint_hybrid_search("quint syntax <construct>")
3. Fix using Edit tool
4. Re-validate
```

#### For Type Errors
```bash
1. Use LSP hover to inspect types
2. Check if type needs import
3. Verify type exists in scope
4. Fix and re-validate
```

#### For Test Failures
```bash
1. Read test code to understand expectation
2. Check if refactor plan expected behavior change
3. If intentional: update test
4. If bug: fix implementation
```

### Step 4: Verify Fix Didn't Break Something Else

```bash
# Full validation suite:
quint parse refactored.qnt && \
quint typecheck refactored.qnt && \
quint test refactored_test.qnt --match=".*"

# Check diff to ensure no unintended changes:
diff -u baseline.qnt refactored.qnt | less
```

---

## Iteration Workflow

Visual representation of the validation and fix cycle:

```
┌──────────────────┐
│ Apply Changes    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐       Parse ✓
│ Parse Check      ├─────────────────┐
└────────┬─────────┘                 │
         │ Parse ✗                   │
         ▼                            │
┌──────────────────┐                 │
│ Fix Parse Error  │                 │
└────────┬─────────┘                 │
         │                            │
         └────────┐                   │
                  │                   ▼
                  │          ┌──────────────────┐
                  │          │ Typecheck        │
                  │          └────────┬─────────┘
                  │                   │ Type ✓
                  │                   ▼
                  │          ┌──────────────────┐
                  │          │ Run Tests        │
                  │          └────────┬─────────┘
                  │                   │ Tests ✓
                  │                   ▼
                  │          ┌──────────────────┐
                  └─────────►│ Success!         │
                             └──────────────────┘
```

**Key principle**: Fix one error at a time, verify after each fix.

---

## Quality Self-Check

Before reporting success, verify all of the following:

### 1. Completeness

Check each change from plan exists:

```bash
# Check each change from plan exists
for change in plan.modules[].changes[]:
  if change.action == "add":
    grep "def ${change.name}" refactored.qnt || echo "MISSING: ${change.name}"
```

### 2. Correctness

Spot-check critical modifications:

```bash
# Example: If plan says "add handleTimeout to step"
grep -A10 "def step" refactored.qnt | grep "handleTimeout" || echo "WARNING: handleTimeout not in step"
```

### 3. No Regressions

Ensure existing tests still pass:

```bash
# If tests existed before, they should pass after
if [ -f baseline_test.qnt ]; then
  quint test refactored_test.qnt --match=".*"
fi
```

### 4. Patterns Applied

Check pattern compliance:

```bash
# Example: thin-actions pattern
# Actions should be <20 lines
# Verify manually or with line counts
```

---

## When to Ask for Help

Stop and ask user if any of these occur:

### 1. Validation Fails After 3 Fix Attempts

**Show:**
- Error message
- What you tried
- Why it's stuck

**Ask:** User to review change or adjust refactor plan

### 2. Change Conflicts with Existing Code

**Show:**
- Conflict details
- Affected code

**Ask:** Which version to keep or how to merge

### 3. Pattern Cannot Be Applied

**Show:**
- Why pattern doesn't fit

**Ask:** Skip pattern or modify approach

### 4. Refactor Plan Is Ambiguous

**Show:**
- Ambiguous instruction
- Multiple interpretations

**Ask:** Clarification on intent

---

## Iteration Loop Structure

Use this pattern when quality issues are detected:

```
while (issues_remain and attempts < 3):
  1. Identify specific issue
  2. Determine root cause
     - Refactor plan (wrong guidance)
     - Implementation (applied incorrectly)
     - Original spec (pre-existing issue)
  3. Apply targeted fix
     - Query KB for guidance on error
     - Re-apply problematic change with adjustment
     - Check if pattern misapplied
  4. Re-validate
  5. Re-evaluate quality

if attempts == 3 and still has issues:
  Report to user with:
    - Exact error message
    - What was attempted
    - Suggestions for manual fix
```

---

## Quality Metrics

Track these throughout implementation:

- **Changes applied**: X/Y from plan
- **Validation pass rate**: 100% required
- **Tests passed**: X/Y (if tests exist)
- **No parse/type errors**: Required
- **Diff size reasonable**: <500 lines for typical refactor

---

## Success Criteria

Mark refactoring as successful when:

- ✅ All changes from plan applied
- ✅ `quint parse` passes
- ✅ `quint typecheck` passes
- ✅ Existing tests pass (if any)
- ✅ Diff matches expectations (size and content)
- ✅ Patterns applied where applicable
- ✅ No warnings or concerns flagged

Only then return `status: "completed"`

---

## Self-Evaluation Checklist

Use before reporting success:

- [ ] All planned changes successfully applied?
- [ ] All validation commands pass?
- [ ] No unintended side effects (check diff)?
- [ ] Patterns applied correctly?
- [ ] Output is readable and well-formatted?

If any checkbox is unchecked, iterate to fix before completing.
