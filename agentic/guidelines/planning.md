# Analyzer: Plan Quality Guidelines

**Version**: 5.0.0

**Purpose**: Reference for evaluating refactor plan quality with decision matrices and quality thresholds.

**When to use**: During plan quality evaluation phase when determining if refactor plan is ready for user approval.

---

## Plan Quality Evaluation Matrix

### Objective Quality

| Criterion | Insufficient | Acceptable | Excellent |
|-----------|-------------|------------|-----------|
| **Specificity** | "Improve consensus" | "Add timeout handling" | "Add timeout mechanism to enable round progression when consensus stalls beyond 2Δ" |
| **Measurability** | No success criteria | "System should handle timeouts" | "Nodes advance rounds within 2Δ+ε after timeout trigger" |
| **Scope** | Unclear boundaries | "Modify consensus module" | "Add TimeoutEvent type, timeouts state var, handleTimeout action in Consensus module" |

**Decision**:
- If Insufficient: Request clarification from requirements
- If Acceptable: Proceed if low-risk change
- If Excellent: Proceed to change specification

### Change Specification Quality

| Criterion | Insufficient | Acceptable | Excellent |
|-----------|-------------|------------|-----------|
| **Item Type** | Missing | "action" | "action" |
| **Name** | Missing | "step" | "step" |
| **Change Type** | "update" | "modify" | "modify" |
| **Details** | "Update step" | "Add timeout case" | "Add handleTimeout to action choices in any{} block at line 45, delegate to pure function processTimeout(state, timeout_event)" |
| **Location** | None | "In step action" | line_ref: 45 |
| **Rationale** | None | "For timeouts" | "Enable round progression when quorum not reached within 2Δ bounds" |

**Decision**:
- If ANY field is Insufficient: Enhance that field before approval
- If ALL fields are Acceptable or better: Proceed to validation planning
- Excellent level required for high-risk changes

### Validation Plan Quality

| Criterion | Insufficient | Acceptable | Excellent |
|-----------|-------------|------------|-----------|
| **Coverage** | Empty | Syntax check only | Parse + typecheck + run invariants + test edge cases |
| **Expected Outcomes** | None specified | "Should pass" | "agreement: satisfied, canDecide: violated (expected), timeoutEdgeCase: passed" |
| **Commands** | Generic | "quint run spec.qnt" | "quint run spec.qnt --invariant=agreement --max-steps=200 --seed=12345" |

**Decision**:
- If Insufficient: Add parse, typecheck at minimum
- If Acceptable: Sufficient for low-risk changes
- If Excellent: Required for high-risk changes

### Risk Assessment Quality

| Criterion | Insufficient | Acceptable | Excellent |
|-----------|-------------|------------|-----------|
| **Identification** | Empty risks list | 1-2 risks identified | 3+ risks identified |
| **Mitigation** | None | Mentioned validation | Specific mitigation strategy per risk |

**Decision**:
- If Insufficient for high-risk change: Conduct risk analysis
- If Acceptable: Sufficient for medium-risk changes
- If Excellent: Proceed with confidence

---

## Quality Thresholds by Change Risk

### Low Risk Changes
*Examples: Adding new pure function, adding constant, documentation*

**Minimum Requirements**:
- Objective: Acceptable
- Change specification: Acceptable
- Validation: Parse + typecheck
- Risks: Optional

### Medium Risk Changes
*Examples: Modifying existing action, adding state variable*

**Minimum Requirements**:
- Objective: Acceptable
- Change specification: Acceptable (with line_ref for modifications)
- Validation: Parse + typecheck + run existing tests
- Risks: At least 2 identified

### High Risk Changes
*Examples: Modifying state structure, changing logic, affecting critical invariants*

**Minimum Requirements**:
- Objective: Excellent
- Change specification: Excellent
- Validation: Parse + typecheck + invariant checks + new tests + edge cases
- Risks: 3+ identified with mitigation strategies

---

## Plan Quality Checklist

Execute before user approval request:

### Completeness Check

```
For each requirement aspect:
  ✓ Corresponding change exists in plan? [yes/no]
  ✓ All affected modules identified? [yes/no]
  ✓ Dependencies between changes specified? [yes/no]

If ANY answer is "no": Plan is incomplete, enhance before approval
```

### Structural Diff Check (CRITICAL)

```
Verify structural diff was computed:
  ✓ Current spec structure extracted? [yes/no]
  ✓ Target structure extracted from user request? [yes/no]
  ✓ Diff computed (ADD/REMOVE/MODIFY)? [yes/no]

Check diff completeness:
  ✓ All current components accounted for? [yes/no]
    - Either kept (in target), modified (in both), or removed (not in target)
  ✓ All target components accounted for? [yes/no]
    - Either added (not in current) or matched (in both)
  ✓ Cascading removals included? [yes/no]
    - Removing phase → remove phase timeout, phase actions, phase state
    - Removing message → remove send/receive actions, message listeners

If diff NOT computed but target algorithm provided:
  ❌ CRITICAL GAP: Must extract structures and compute diff

Example Check:
  Current spec: phases = [Request, Prepare, Commit, Complete]
  Target description: "1. Validate 2. Request 3. Prepare 4. Complete"

  Expected diff:
    REMOVE: [Commit] + cascading removals
    ADD: [Validate] + related components

  If requirements missing REMOVE for Commit:
    → STATUS: INCOMPLETE - Diff not properly computed
```

### Specificity Check

```
For each change:
  ✓ Implementer can execute without ambiguity? [yes/no]
  ✓ Location specified? [yes/no] (required for MODIFY)
  ✓ Rationale provided? [yes/no]

If ANY answer is "no": Change specification insufficient, enhance details
```

### Safety Check

```
For each change:
  ✓ Potential failure modes identified? [yes/no]
  ✓ Impact on critical invariants assessed? [yes/no]
  ✓ Edge cases considered? [yes/no]

If ANY answer is "no" AND risk level is HIGH: Conduct safety analysis
```

### Pattern Check

```
For each change:
  ✓ Applicable Quint patterns identified? [yes/no]
  ✓ Pattern application strategy specified? [yes/no]

If patterns_to_apply is empty AND change adds actions or state:
  Query KB: quint_hybrid_search("<change_type> patterns")
  Evaluate: Are patterns applicable?
```

---

## Common Quality Issues: Diagnosis & Fix

### Issue 1: Vague Change Description

**Detection**:
- `details` field < 20 characters
- OR contains words: "update", "modify", "change" without specifics
- OR lacks concrete code elements (type names, function names)

**Fix**:
```
If WHAT is missing:
  - Review requirement for concrete elements
  - Query KB: quint_get_example("<feature_type>")
  - Specify: Types, functions, state variables by name

If WHERE is missing:
  - For ADD: Specify insertion point
  - For MODIFY: Provide line_ref
  - For REMOVE: Specify element name and location

If WHY is missing:
  - Extract rationale from requirement
  - Link to requirement ID
```

**Example**:
```
Before: {"details": "Add timeout support"}
After: {"details": "Add TimeoutEvent union type with variants RequestTimeout|PrepareTimeout|CommitTimeout. Add state var timeouts: Map[Node, Set[TimeoutEvent]]. Add action handleTimeout using thin-actions pattern.", "line_ref": null, "rationale": "Enable round progression when quorum not reached per REQ-LIVENESS-02"}
```

### Issue 2: Empty Risk Assessment

**Detection**:
- `risks` array is empty
- OR risks are generic ("may break things")

**Fix**:
```
Step 1: Identify impact areas
  - State structure changes? → Risk to all actions
  - Action logic changes? → Risk to invariants
  - New feature? → Risk of edge cases

Step 2: Analyze change-specific risks
  - What invariants affected?
  - What assumptions made?
  - What edge cases exist?
```

### Issue 3: Missing Patterns

**Detection**:
- `patterns_to_apply` is empty
- AND change involves: actions, state updates, or event handling

**Fix**:
```
Step 1: Query KB
  quint_get_pattern("thin-actions")
  quint_get_pattern("state-type")
  quint_hybrid_search("<feature_type> design patterns")

Step 2: Evaluate applicability
  For each pattern:
    Does it match this change type? [yes/no]
    Does it improve code quality? [yes/no]

Step 3: Specify application
  If applicable: Add to patterns_to_apply with pattern_id, reason, modules
```

### Issue 4: Weak Validation Plan

**Detection**:
- `validation_plan` array is empty
- OR contains only parse/typecheck
- AND change risk is medium/high

**Fix**:
```
Step 1: Determine minimum validation by risk level
  Low risk: parse + typecheck
  Medium risk: + run existing tests
  High risk: + invariant checks + new tests

Step 2: Add validation commands
  Always:
    - {"command": "quint parse <file>", "purpose": "Syntax check"}
    - {"command": "quint typecheck <file>", "purpose": "Type check"}

  If medium/high risk:
    - {"command": "quint test <file> --match=<test_name>", "purpose": "Existing tests"}
    - *Critical* : Don't forget to specify which tests to run, running all tests runs builtin tests and produces false confidence.  

  If high risk:
    - {"command": "quint run <file> --invariant=<name> --max-steps=200", "purpose": "Verify <invariant>", "expected_outcome": "satisfied"}

Step 3: Specify expected outcomes for each command
```

---

## Iteration Strategy

Execute when plan quality is below threshold:

```
attempt_count = 0
max_attempts = 5

while (quality_below_threshold AND attempt_count < max_attempts):
  attempt_count++

  Step 1: Run quality checklist
    Record: specific_gaps = [list of failures]

  Step 2: Prioritize gaps by impact
    Critical: Affects high-risk change
    Important: Required for approval
    Optional: Improves confidence

  Step 3: Gather information for each gap
    If missing spec context: Re-read relevant spec sections
    If missing Quint knowledge: Query KB
    If missing domain knowledge: Re-analyze requirements

  Step 4: Apply fixes using protocols above

  Step 5: Re-evaluate quality
    Check: All critical gaps resolved? [yes/no]

  If attempt_count == max_attempts AND gaps remain:
    Determine: Are gaps blocking? [yes/no]
    If blocking: Ask user for clarification
    If non-blocking: Present plan with warnings
```

---

## KB Query Strategy (Quick Reference)

| Need | Query Commands |
|------|----------------|
| **Finding Patterns** | `quint_hybrid_search("quint design patterns <change_type>")`<br>`quint_get_pattern("thin-actions")`<br>`quint_get_pattern("state-type")` |
| **Validation Strategy** | `quint_hybrid_search("testing <feature_type>")`<br>`quint_get_example("witness for liveness")`<br>`quint_get_example("invariant for safety")` |
| **Framework-specific** | `quint_get_doc("choreo action patterns")`<br>`quint_get_doc("standard framework best practices")` |

---

## User Clarification Protocol

Use Ask User Question tool when interaction is needed.
Stop and request clarification from the user if:

### Condition 1: Requirement Ambiguity

**Detection**: Multiple valid interpretations OR critical details missing OR contradictory constraints

**Template**:
```
"Requirement '{excerpt}' has multiple interpretations:
 Option A: {interpretation_1}
 Option B: {interpretation_2}

 Which interpretation is correct?"
```

### Condition 2: Design Decision Required

**Detection**: Multiple valid technical approaches OR trade-offs

**Template**:
```
"Two valid approaches for {feature}:

 Option A: {approach_1}
   Pros: {pros}
   Cons: {cons}

 Option B: {approach_2}
   Pros: {pros}
   Cons: {cons}

 Which approach do you prefer?"
```

### Condition 3: Scope Uncertainty

**Detection**: Unclear boundaries OR related features may be affected

**Template**:
```
"Adding {feature} affects {related_areas}.
 Should I also:
 - {related_change_1}? [yes/no]
 - {related_change_2}? [yes/no]"
```

### Condition 4: High Risk Identified

**Detection**: Risk severity >= "critical" OR substantial refactoring (>5 changes) OR alternative lower-risk approaches exist

**Template**:
```
"Planned change has high risk:
 Risk: {description}
 Impact: {affected_components}

 Alternative approach: {alternative}
 Risk: {alternative_risk}

 Proceed with high-risk approach or use alternative?"
```

---

## Plan Approval Decision Matrix

| Quality Aspect | Low Risk | Medium Risk | High Risk |
|----------------|----------|-------------|-----------|
| Objective | Acceptable | Acceptable | Excellent |
| Changes | Acceptable | Acceptable | Excellent |
| Validation | Parse + typecheck | + run tests | + invariants + new tests |
| Risks | Optional | 2+ identified | 3+ with mitigation |
| Patterns | Optional | Identified | Applied |

**Approval Decision**:
```
Check: All criteria met for risk level? [yes/no]

If yes:
  Proceed to user approval request

If no:
  Missing_criteria = [list]
  If attempt_count < max_attempts:
    Iterate to enhance
  Else:
    If Missing_criteria are blocking:
      Request user clarification
    Else:
      Present with warnings, request approval
```

---

## Success Criteria

Plan is ready for user approval when ALL of these conditions are met:

- ✅ Objective: Meets quality threshold for risk level
- ✅ Requirements: All aspects mapped to changes
- ✅ Change specifications: Meet quality threshold for risk level
- ✅ Locations: line_ref provided for all MODIFY operations
- ✅ Validation plan: Adequate for risk level
- ✅ Risks: Assessed per risk level requirements
- ✅ Patterns: Identified and specified where applicable
- ✅ No unresolved ambiguities
- ✅ Confidence: High (based on quality matrix scores)

Only when ALL criteria met: Proceed to plan approval phase.

---
