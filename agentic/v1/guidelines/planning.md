# Analyzer: Plan Quality Guidelines

**Purpose**: Reference guide for evaluating and improving refactor plan quality.

**When to use**: During Phase 4 (Plan Quality Self-Evaluation) when checking if a refactor plan is ready for user approval.

---

## What Makes a Good Refactor Plan

### 1. Clear Objective

**❌ Bad: Vague**
```json
{"objective": "Improve consensus"}
```

**✅ Good: Specific**
```json
{"objective": "Add timeout mechanism to enable round progression when consensus stalls beyond 2Δ"}
```

### 2. Specific Changes

**❌ Bad: Ambiguous**
```json
{"item": "action", "name": "step", "change": "modify", "details": "Update step"}
```

**✅ Good: Concrete**
```json
{"item": "action", "name": "step", "change": "modify", "details": "Add handleTimeout to action choices in any{} block", "line_ref": 45}
```

### 3. Adequate Validation

**❌ Bad: No validation **
```json
{"validation_plan": [

]}
```

**✅ Good**
```json
{"validation_plan": [
  {"command": "quint typecheck spec.qnt", "purpose": "Verify syntax"},
  {"command": "quint run --invariant=agreement --max-steps=200", "purpose": "Verify safety preserved", "expected_outcome": "satisfied"},
]}
```

### 4. Risk Assessment

**❌ Bad: No risks**
```json
{"risks": []}
```

**✅ Good: Identified**
```json
{"risks": [
  {"description": "Updating actions may affect invariants related to state transitions" , "severity": "high"},
  {"description": "New timeout logic may introduce liveness issues" , "severity": "medium"}
]}
```

---

## Self-Evaluation Process

Before presenting plan to user, check:

### 1. Completeness Check
```
For each requirement aspect:
  ✓ Is there a corresponding change in the plan?
  ✓ Are all affected modules identified?
  ✓ Are dependencies between changes clear?
```

### 2. Specificity Check
```
For each change:
  ✓ Could implementer understand exactly what to do?
  ✓ Is location specified (line number for modifications)?
  ✓ Is rationale clear?
```

### 3. Safety Check
```
For each change:
  ✓ What could go wrong?
  ✓ Does it affect critical invariants?
```

---

## Common Quality Issues and Fixes

### Issue 1: Vague Change Description

**Before:**
```json
{"details": "Add timeout support"}
```

**Diagnosis:**
- Not specific enough for implementer
- Unclear what code to write

**Fix:**
```json
{
  "details": "Add union type TimeoutEvent with variants: ProposeTimeout | PrevoteTimeout | PrecommitTimeout. Add state variable timeouts: Map[Node, Set[TimeoutEvent]]. Add action handleTimeout that processes timeout and advances round if conditions met."
}
```


### Issue 2: No Risk Assessment

**Before:**
```json
{"risks": []}
```

**Diagnosis:**
- All refactors have risks
- Empty list suggests incomplete analysis

**Fix approach:**
```bash
# Query KB for known issues
quint_hybrid_search("timeout mechanism consensus risks")

# Analyze change impact
# - What invariants might be affected?
# - What new edge cases introduced?
# - What assumptions are made?
```

**Result:**
```json
{"risks": [
  {"description": "Timeout duration must exceed maximum network delay (2Δ)", "severity": "high"},
  {"description": "Multiple simultaneous timeouts may cause state explosion", "severity": "medium"}
]}
```

### Issue 4: Missing Patterns

**Before:**
```json
{"patterns_to_apply": []}
```

**Diagnosis:**
- Quint has established patterns
- Empty list suggests patterns not considered

**Fix approach:**
```bash
# Query KB for applicable patterns
quint_get_pattern("thin-actions")
quint_hybrid_search("timeout action pattern")
```

**Result:**
```json
{"patterns_to_apply": [
  {"pattern_id": "thin-actions", "reason": "handleTimeout should delegate timeout logic to pure function processTimeout", "modules": ["Consensus"]}
]}
```

---

## Iteration Strategy

When plan quality is insufficient:

```
attempt = 0
while (quality_issues_exist and attempt < 3):
  1. Identify specific gap (use checklist above)
  2. Determine information needed:
     - Spec context: Re-read relevant sections
     - Quint knowledge: Query KB
     - Domain knowledge: Check requirements again
  3. Add/fix information in plan
  4. Re-evaluate quality
  attempt++

if attempt == 2 and still has issues:
  Present to user with warnings:
    "⚠️ Plan may need refinement:
     - [Specific issue 1]
     - [Specific issue 2]
     Proceed with approval?"
```

---

## KB Usage for Plan Enhancement

### Finding Patterns
```bash
# General search
quint_hybrid_search("best practices <refactor_type>")

# Specific pattern
quint_get_pattern("state-type")
quint_get_pattern("thin-actions")

# Examples
quint_get_example("timeout mechanism")
```

### Understanding Impacts
```bash
# Framework-specific guidance
quint_get_doc("choreo listener patterns")
quint_get_doc("standard framework actions")

# Common pitfalls
quint_hybrid_search("common mistakes <feature_type>")
```

### Validation Strategy
```bash
# How to test this type of change
quint_hybrid_search("testing <feature_type>")
quint_get_example("witness for liveness")
```

---

## When to Ask User for Clarification

Stop and ask user if:

### 1. Requirement Ambiguity
- Multiple interpretations possible
- Missing critical details
- Conflicting constraints

**Example:** "Requirement says 'improve performance' - do you mean:
- Reduce latency? (target: <X ms)
- Increase throughput? (target: >Y tx/s)
- Reduce computational cost?"

### 2. Design Decision Needed
- Multiple valid approaches
- Trade-offs to consider
- User preference matters

**Example:** "Two approaches for timeout:
- Per-node timeouts (more flexible, more complex state)
- Global timeout (simpler, less flexible)
Which do you prefer?"

### 3. Scope Uncertainty
- Unclear what's in/out of scope
- Related features that might be affected
- Backwards compatibility requirements

**Example:** "Adding timeouts affects round progression.
Should I also:
- Add timeout configuration?
- Update round advancement logic?
- Add timeout-related invariants?"

### 4. Risk vs Benefit
- High-risk change identified
- Substantial refactoring needed
- Alternative approaches exist

**Example:** "This change requires modifying core state structure.
Risk: Affects all actions, may break invariants.
Alternative: Add timeout as separate layer.
How should I proceed?"

---

## Success Criteria

Plan is ready for approval when:

- ✅ Objective is clear and specific
- ✅ All requirements aspects covered
- ✅ Every change has concrete details
- ✅ Line references provided for modifications
- ✅ Validation plan is comprehensive
- ✅ Risks identified with severities
- ✅ No ambiguities or unresolved questions
- ✅ Confidence level: High (based on specificity and validation plan quality)

Only then proceed to Plan Approval phase.
