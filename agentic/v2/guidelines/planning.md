# Analyzer: Plan Quality Guidelines

**Version**: 4.0.0

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
- Excellent level required for high-risk changes (core state modifications, invariant-affecting)

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
| **Identification** | Empty risks list | 1-2 risks identified | 3+ risks with severity levels |
| **Severity** | No severity ratings | Binary (high/low) | 5-level scale (blocker/critical/high/medium/low) |
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
- Risks: At least 2 identified with severity

### High Risk Changes
*Examples: Modifying state structure, changing quorum logic, affecting critical invariants*

**Minimum Requirements**:
- Objective: Excellent
- Change specification: Excellent
- Validation: Parse + typecheck + invariant checks + new tests + edge cases
- Risks: 3+ identified with severity and mitigation strategies

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

## Common Quality Issues: Diagnosis & Fix Protocol

### Issue 1: Vague Change Description

**Detection Pattern**:
- `details` field < 20 characters
- OR contains words: "update", "modify", "change", "improve" without specifics
- OR lacks concrete code elements (type names, function names, line numbers)

**Diagnosis Steps**:
1. Check: Does `details` specify WHAT code to write? [yes/no]
2. Check: Does `details` specify WHERE to place it? [yes/no]
3. Check: Does `details` specify WHY (rationale)? [yes/no]

**Fix Protocol**:
```
If WHAT is missing:
  - Review requirement for concrete elements
  - Query KB: quint_get_example("<feature_type>")
  - Specify: Types, functions, state variables by name

If WHERE is missing:
  - For ADD: Specify insertion point (after types, before actions, etc.)
  - For MODIFY: Provide line_ref from spec analysis
  - For REMOVE: Specify element name and location

If WHY is missing:
  - Extract rationale from requirement analysis
  - Link to requirement ID
```

**Example Fix**:

Before (Insufficient):
```json
{"details": "Add timeout support"}
```

After (Excellent):
```json
{
  "details": "Add union type TimeoutEvent with variants: ProposeTimeout | PrevoteTimeout | PrecommitTimeout. Add state variable timeouts: Map[Node, Set[TimeoutEvent]]. Add action handleTimeout that processes timeout event and advances round if quorum conditions unmet after 2Δ. Use thin-actions pattern: delegate logic to pure function processTimeout(state, event).",
  "line_ref": null,
  "rationale": "Enable round progression when consensus stalls per REQ-LIVENESS-02"
}
```

### Issue 2: Empty Risk Assessment

**Detection Pattern**:
- `risks` array is empty
- OR all risks have severity "low"
- OR risks are generic ("may break things")

**Diagnosis Steps**:
1. Check change risk category: [low/medium/high]
2. For medium/high: Risk list empty is FAILURE

**Fix Protocol**:
```
Step 1: Identify impact areas
  - State structure changes? → Risk to all actions
  - Action logic changes? → Risk to invariants
  - New feature? → Risk of edge cases

Step 2: Query KB for known risks
  Command: quint_hybrid_search("<feature_type> risks common mistakes")

Step 3: Analyze change-specific risks
  - What invariants are affected? → Check spec for invariants referencing modified elements
  - What assumptions are made? → Document and assess validity
  - What edge cases exist? → Enumerate boundary conditions

Step 4: Assign severities
  - Blocker: Prevents system from compiling/running
  - Critical: Violates safety invariants
  - High: Affects core protocol correctness
  - Medium: Affects liveness or edge cases
  - Low: Minor issues, easy to fix
```

**Example Fix**:

Before (Insufficient):
```json
{"risks": []}
```

After (Excellent):
```json
{
  "risks": [
    {
      "description": "Timeout duration must exceed maximum network delay (2Δ). If timeout < 2Δ, may violate safety by advancing rounds prematurely.",
      "severity": "critical",
      "affected_invariants": ["agreement"],
      "mitigation": "Validate timeout parameter >= 2Δ_max constant, add invariant check"
    },
    {
      "description": "Multiple simultaneous timeouts may cause state explosion in model checking",
      "severity": "medium",
      "mitigation": "Limit --max-steps and test with bounded timeout sets"
    }
  ]
}
```

### Issue 3: Missing Patterns

**Detection Pattern**:
- `patterns_to_apply` is empty
- AND change involves: actions, state updates, or event handling

**Diagnosis Steps**:
```
For ADD action:
  Check: Does action modify state?
    If yes: thin-actions pattern applicable [yes/no]
  Check: Does action have preconditions?
    If yes: state-type pattern applicable [yes/no]

For MODIFY state:
  Check: Is state a union/variant type?
    If yes: state-type pattern applicable [yes/no]
```

**Fix Protocol**:
```
Step 1: Query KB for patterns
  quint_get_pattern("thin-actions")
  quint_get_pattern("state-type")
  quint_hybrid_search("<feature_type> design patterns")

Step 2: Evaluate applicability
  For each pattern:
    Does it match this change type? [yes/no]
    Does it improve code quality? [yes/no]

Step 3: Specify application
  If applicable:
    Add to patterns_to_apply with:
      - pattern_id
      - reason (why applicable)
      - modules (where to apply)
```

**Example Fix**:

Before (Insufficient):
```json
{"patterns_to_apply": []}
```

After (Excellent):
```json
{
  "patterns_to_apply": [
    {
      "pattern_id": "thin-actions",
      "reason": "handleTimeout action should delegate timeout processing logic to pure function processTimeout for testability and clarity",
      "modules": ["Consensus"],
      "application_point": "When generating handleTimeout action"
    },
    {
      "pattern_id": "state-type",
      "reason": "TimeoutEvent is a union type with multiple variants requiring exhaustive matching",
      "modules": ["Consensus"],
      "application_point": "When defining TimeoutEvent type"
    }
  ]
}
```

### Issue 4: Weak Validation Plan

**Detection Pattern**:
- `validation_plan` array is empty
- OR contains only parse/typecheck
- AND change risk is medium/high

**Fix Protocol**:
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
    - {"command": "quint test <file> --match=*", "purpose": "Existing test suite"}

  If high risk (invariant-affecting):
    - For each invariant: {"command": "quint run <file> --invariant=<name> --max-steps=200 --max-samples=500", "purpose": "Verify <invariant> holds", "expected_outcome": "satisfied"}

  If adding liveness feature:
    - {"command": "quint run <test_file> --invariant=<witness> --max-steps=100", "purpose": "Verify progress possible", "expected_outcome": "violated"}

Step 3: Specify expected outcomes
  For each command: Add expected_outcome field
    - "satisfied" for invariants
    - "violated" for witnesses
    - "passed" for tests
```

---

## Iteration Strategy

Execute when plan quality is below threshold:

```
attempt_count = 0
max_attempts = 3

while (quality_below_threshold AND attempt_count < max_attempts):
  attempt_count++

  Step 1: Run quality checklist (see above)
    Record: specific_gaps = [list of failures]

  Step 2: Prioritize gaps by impact
    Critical gaps: Affects high-risk change
    Important gaps: Required for approval
    Optional gaps: Improves confidence

  Step 3: Gather information for each gap
    If missing spec context:
      Re-read relevant spec sections
    If missing Quint knowledge:
      Query KB with targeted searches
    If missing domain knowledge:
      Re-analyze requirements

  Step 4: Apply fixes
    For each gap: Use fix protocol above

  Step 5: Re-evaluate quality
    Run checklist again
    Check: All critical gaps resolved? [yes/no]

  If attempt_count == max_attempts AND gaps remain:
    Determine: Are gaps blocking? [yes/no]
    If blocking:
      Return: Ask user for clarification
    If non-blocking:
      Present plan with explicit warnings:
        "⚠️ Plan approved with following gaps:
         - [Specific gap 1: impact]
         - [Specific gap 2: impact]
         Continue with implementation?"
```

---

## KB Query Strategy

### Finding Patterns

**When**: patterns_to_apply is empty and change involves actions/state

**Commands**:
```bash
# General pattern search
quint_hybrid_search("quint design patterns <change_type>")

# Specific patterns
quint_get_pattern("thin-actions")
quint_get_pattern("state-type")

# Framework-specific
quint_get_doc("choreo action patterns")
quint_get_doc("standard framework best practices")
```

### Understanding Risks

**When**: risks array empty or risk assessment insufficient

**Commands**:
```bash
# Common issues
quint_hybrid_search("<feature_type> common mistakes pitfalls")
quint_hybrid_search("Byzantine consensus timeout risks")

# Framework risks
quint_get_doc("<framework> known issues")
```

### Validation Strategy

**When**: validation_plan weak or empty

**Commands**:
```bash
# Testing approach
quint_hybrid_search("testing <feature_type>")
quint_get_example("witness for liveness")
quint_get_example("invariant for safety")

# Framework-specific testing
quint_get_doc("choreo test patterns")
```

---

## User Clarification Protocol

Stop and request clarification if:

### Condition 1: Requirement Ambiguity

**Detection**:
- Multiple valid interpretations exist
- Critical details missing
- Contradictory constraints

**Action**:
```
Construct clarification request:
  "Requirement '{excerpt}' has multiple interpretations:
   Option A: {interpretation_1}
   Option B: {interpretation_2}

   Which interpretation is correct?"
```

**Example**:
```
"Requirement says 'improve performance'. This could mean:
- Reduce latency? (target: <X ms, measure: end-to-end decision time)
- Increase throughput? (target: >Y tx/s, measure: decisions per second)
- Reduce computational cost? (target: fewer state transitions)

Which performance aspect should I optimize?"
```

### Condition 2: Design Decision Required

**Detection**:
- Multiple valid technical approaches
- Trade-offs with no clear winner
- User preference affects design

**Action**:
```
Present options with trade-offs:
  "Two valid approaches for {feature}:

   Option A: {approach_1}
     Pros: {pros}
     Cons: {cons}

   Option B: {approach_2}
     Pros: {pros}
     Cons: {cons}

   Which approach do you prefer?"
```

**Example**:
```
"Two approaches for timeout mechanism:

 Option A: Per-node timeouts
   Pros: More flexible, nodes can timeout independently
   Cons: More complex state (Map[Node, Set[TimeoutEvent]]), harder to reason about

 Option B: Global timeout
   Pros: Simpler state (single timeout value), easier invariants
   Cons: Less flexible, all nodes timeout together

Which approach fits your requirements better?"
```

### Condition 3: Scope Uncertainty

**Detection**:
- Unclear boundaries (what's in/out of scope)
- Related features may be affected
- Backwards compatibility requirements unclear

**Action**:
```
List scope questions:
  "Adding {feature} affects {related_areas}.
   Should I also:
   - {related_change_1}? [yes/no]
   - {related_change_2}? [yes/no]"
```

**Example**:
```
"Adding timeout mechanism affects round progression logic.
Should I also:
- Add timeout configuration parameter (Δ value)? [yes/no]
- Update round advancement to check timeout conditions? [yes/no]
- Add timeout-related invariants (e.g., timeoutImpliesProgress)? [yes/no]
- Modify existing tests to account for timeouts? [yes/no]"
```

### Condition 4: High Risk Identified

**Detection**:
- Risk severity >= "critical"
- Substantial refactoring required (>5 changes)
- Alternative lower-risk approaches exist

**Action**:
```
Risk escalation:
  "Planned change has high risk:
   Risk: {description}
   Impact: {affected_components}
   Severity: {level}

   Alternative approach: {alternative}
   Risk: {alternative_risk}

   Proceed with high-risk approach or use alternative?"
```

**Example**:
```
"Planned change requires modifying core State type definition.

Risk: Affects all actions (15 actions), may break all invariants (8 invariants)
Severity: Critical
Effort: High (5-10 changes)

Alternative: Add timeout state as separate layer (TimeoutState = { base: State, timeouts: Map[Node, Set[Event]] })
Risk: Medium (only new timeout-related actions affected)
Effort: Medium (2-3 changes)

Which approach should I use?"
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
    Iterate to enhance (see Iteration Strategy)
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
