---
command: /play:open:debug-witness
description: witness debugging with progressive search and relaxation analysis
version: 1.0.0
---

# Debug Witness

## Objective

Diagnose why a witness invariant is not being violated through progressive deepening and witness relaxation, pointing to specific problem areas without prescribing solutions.

## Guidelines
- **Concise Output** : Use one-line format for guards and investigation areas. Keep diagnosis to 3-4 lines max. No verbose explanations.
- **Choreo** : Assume choreo implementation is correct and focus on spec-level issues.
- **Rust Backend** : Use `--backend=rust` for efficient execution.
- **Relaxation Approval** : Prompt user before testing relaxed witness.
- **Partial Reachability** : If the relaxed witness is sometimes violated and sometimes not, use this insight in diagnosis.
- You can write the relaxed version of the witness in the same file/module as the original witness, with a suffix `_relaxed` to the name.
- All steps are important: don't skip witness relaxation or guard analysis.
- If you are 100% sure about the explicit bug, tell the user directly in the diagnosis section without hedging.
- *Important*: You can leverage the natural language/pseudocode specification to better understand the intent behind the witness and the spec behavior and try to identify mismatches.

## Input Contract

### Required Parameters
- `spec_path`: Path to Quint specification file (.qnt)
- `witness_name`: Name of witness invariant that was not violated

### Optional Parameters
- `max_steps`: Initial trace length (default: 50)
- `max_samples`: Initial samples (default: 1000)
- `sample_count`: Detailed traces to analyze (default: 5)
- `enable_guard_analysis`: Test guards as witnesses (default: true)

## Output Contract

### Success
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Witness Debug Report: {witness_name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Problem: Witness not violated (scenario not reached)

════════════════════════════════════════════════════════
GOAL ANALYSIS
════════════════════════════════════════════════════════

Witness Definition: {witness_def}
Target Condition: {what_we_need}
Required Path: {dependency_chain}

════════════════════════════════════════════════════════
STATIC ANALYSIS
════════════════════════════════════════════════════════

Actions That Advance Goal:
  • {action_name} - {what_it_does}
    Preconditions: {list with ✓/✗/? markers}

Blocker Details: {if found, explain}

════════════════════════════════════════════════════════
DYNAMIC ANALYSIS
════════════════════════════════════════════════════════

Search Progression:
  • Pass 1: {samples} × {steps} → No violation
  • Pass 2: {samples_ext} × {steps_ext} → No violation

Relaxation Test:
  • Original: {original_condition}
  • Relaxed: {relaxed_condition}
  • Result: {VIOLATED | NOT VIOLATED}
  • Insight: {diagnostic_insight}

Sample Traces: {brief_summary_of_patterns}

════════════════════════════════════════════════════════
GUARD ANALYSIS
════════════════════════════════════════════════════════

Blocking Guards:
  ✗ {condition} ({file}:{line}) - {one-line why}
  ✗ {condition} ({file}:{line}) - {one-line why}

Satisfiable Guards:
  ✓ {condition} ({file}:{line})

════════════════════════════════════════════════════════
DIAGNOSIS
════════════════════════════════════════════════════════

{CATEGORY}: {one-line summary}

{2-3 line explanation}

Key Evidence: {top 2-3 evidence points in one sentence}

════════════════════════════════════════════════════════
WHERE TO INVESTIGATE
════════════════════════════════════════════════════════

{N}. {file}:{line} - {what_to_check in one line}
{N}. {file}:{line} - {what_to_check in one line}
{N}. {file}:{line} - {what_to_check in one line}

════════════════════════════════════════════════════════
```

## Execution Procedure

### Phase 1: Goal Analysis

1. **Parse Witness**
   - Read spec, extract witness definition
   - Determine target condition (negate the `not(...)`)
   - Identify goal variables

2. **Build Dependency Chain**
   - Find actions that write to goal variables
   - Extract their preconditions
   - Build chain: init → ... → goal

### Phase 2: Static Analysis

3. **Detect Blockers**
   - Check preconditions for mathematical impossibilities
   - Example: `quorum_size > N`, `require X == value` where X != value
   - Flag structural issues

4. **Early Exit Check**
   - If impossible configuration detected → Skip to diagnosis
   - Else → Continue to dynamic analysis

### Phase 3: Dynamic Analysis - Progressive Deepening

5. **Initial Pass**
   - Run: `quint run {spec} --main={module} --invariant={witness} --max-steps={max_steps} --max-samples={max_samples} --backend=rust`
   - If violated → Done, explain success
   - If not → Continue

6. **Extended Pass** [If executions finish early (< max steps), discard this step.]
   - Increase: `max_steps_ext = max_steps * 3`, `max_samples_ext = max_samples * 10`
   - Run again with extended parameters
   - If violated → Done
   - If not → Continue to guard analysis

### Phase 3.5: Guard Witness Testing

6a. **Find Goal-Advancing Writes**
   - Search for statements that write to goal variables
   - Patterns: `{var}' = ...`, `{var}.set(...)`, `{var}.put(...)`
   - Record file locations and line numbers
   - Example: `grep -n "decided'" {spec}` or `grep -n "decided\.set\|decided\.put" {spec}`

6b. **Extract Guards Around Writes**
   - For each write statement, read surrounding context (±20 lines)
   - Identify control flow guards:
     - `require` statements before the write
     - `if` conditions wrapping the write
     - `all {}` conjunctions containing the write
   - Decompose compound guards: `A and B` → separate guards [A], [B]
   - Record guard metadata: text, location (file:line), type (require/if)

6c. **Generate Guard Witnesses**
   - For each guard condition, create witness: `val witness_guard_{N} = not({condition})`
   - Handle action parameters (msg, ctx):
     - If condition references action parameter not in state → mark as "CANNOT TEST" or try to adapt to state-level check
     - If condition uses only state variables → use directly
   - Append witnesses to the spec file (same module as original witness):
     ```quint
     // Auto-generated guard witnesses for debugging
     val witness_guard_1 = not({guard_1_condition})
     val witness_guard_2 = not({guard_2_condition})
     ...
     ```

6d. **Run Guard Witnesses**
   - For each generated witness:
     ```bash
     quint run {spec} --main={module} \
       --invariant=witness_guard_{N} \
       --max-steps={max_steps} \
       --max-samples={max_samples} \
       --backend=rust
     ```
   - Parse output:
     - If "invariant violated" → Guard CAN be true (✓)
     - If "invariant not violated" → Guard NEVER true (✗ BLOCKER)
     - If error/cannot evaluate → Mark as ? CANNOT TEST
   - Store results with guard metadata

6e. **Analyze Blocking Guards**
   - Identify blocking guards (those that are never true)
   - Count: how many guards block vs how many are satisfiable
   - Generate GUARD ANALYSIS section:
     - Format: `✗ condition (file:line) - one-line why` for blocking guards
     - Format: `✓ condition (file:line)` for satisfiable guards
     - Show ALL guards found (don't limit)
     - **Be concise**: exactly one line per guard, no multi-line explanations
   - Remove auto-generated guard witnesses from spec file

### Phase 4: Witness Relaxation

7. **Generate Relaxation**
   - Analyze witness structure for relaxation opportunities:
     - Quantitative: `>= 10` → `>= 5`
     - Conjunction: `A and B and C` → `A and B`
     - Universal: `all(...)` → `exists(...)`
   - Generate relaxed witness

8. **Propose to User**
   - Use AskUserQuestion:
     ```
     Original: {original}
     Relaxed: {relaxed}

     Test relaxed version to narrow down the issue?
     Options: [Yes, try relaxed version] [No, skip to diagnosis]
     ```

9. **Test Relaxed (if approved)**
   - Run with relaxed witness
   - Compare: Original ❌ + Relaxed ✓ → Problem is in the gap
   - Store insight

10. **Capture Sample Traces**
    - Collect {sample_count} detailed traces with verbosity
    - Extract actions, final states

### Phase 5: Internal Reflection & Diagnosis

**Note**: Steps 11-16 are internal reasoning - not displayed to user. They guide the quality of the final diagnosis.

11. **Generate Multiple Hypotheses** (Internal)
    - Don't settle on first pattern match
    - Generate 2-3 competing hypotheses from evidence
    - For each:
      - State claim
      - List supporting evidence
      - List contradicting evidence
      - Assign confidence score
    - Example internal reasoning:
      ```
      H1: Impossible quorum → Evidence: static math proof, all traces stop same place
      H2: Rare but possible → Evidence: no structural blocker
      Confidence: H1 (0.95), H2 (0.05) based on evidence strength
      ```

12. **Cross-Validate Evidence** (Internal)
    - Check consistency:
      - Static analysis vs dynamic behavior
      - Sample traces vs static blockers
      - Relaxation results vs initial patterns
    - Flag inconsistencies that need explanation
    - Example check:
      ```
      Static: hasQuorum impossible
      Dynamic: All traces stop at vote collection
      Relaxation: Can vote but not decide
      → Consistent across all three ✓ (increases confidence)
      ```

13. **Challenge Leading Hypothesis** (Internal)
    - Devil's advocate: What if we're wrong?
    - Questions to ask:
      - "Could this be a symptom, not root cause?"
      - "What evidence contradicts this?"
      - "What would we see if alternative hypothesis was true?"
    - Re-examine with skepticism
    - Adjust confidence if needed

14. **Identify Knowledge Gaps** (Internal)
    - What don't we know?
    - What couldn't be determined?
    - Examples:
      - "Cannot confirm if action X is reachable"
      - "Unsure if precondition Y is satisfiable"
    - These become investigation areas in report

15. **Select Reasonable Hypotheses** (Internal)
    - Rank by confidence and evidence quality
    - Determine which hypotheses to show user:
      - Confidence >= 0.6: Definitely show (strong evidence)
      - Confidence 0.3-0.6: Show if among top 2-3
      - Confidence < 0.3: Don't show (too weak)
    - Maximum: Show up to 3 hypotheses
    - **Important**: Internal ranking is only for filtering, not for user presentation

16. **Present Diagnosis Concisely** (User-Facing)
    - Show ONLY the highest-confidence hypothesis (single diagnosis)
    - Format:
      - Category: one-line summary
      - 2-3 line explanation (no more!)
      - Key Evidence: top 2-3 points in ONE sentence
    - **Be concise**: No verbose explanations, no bullet lists, one paragraph max
    - **Critical**: Direct and factual, avoid speculation

17. **Generate Investigation Areas**
    - Based on diagnosis
    - Identify exactly 3 areas (no more, no less)
    - Format: `file:line_or_function - one-line what to check`
    - Each line MAX 80 characters
    - **Be specific**: file:line, not vague "check this area"

## Tools Used

- `Read`: Read spec file and surrounding context for guards
- `Grep`: Extract definitions, actions, preconditions, goal variable writes
- `Edit`: Append/remove guard witnesses to/from spec file
- `Bash(quint)`: Run simulations (parse, typecheck, run)
- `AskUserQuestion`: Relaxation approval

## Error Handling

### Witness Not Found
- List available witnesses in spec
- User provides correct name

### Spec Parse/Typecheck Failure
- Display errors, suggest fixing spec first

### Cannot Parse Witness
- Fall back to basic analysis without relaxation

### No Clear Pattern
- Report uncertainty, provide general investigation areas

## Example

**Input**:
```
/play:open:debug-witness \
  --spec_path=specs/consensus.qnt \
  --witness_name=canDecide
```

**Output**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Witness Debug Report: canDecide
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Problem: Witness not violated (scenario not reached)

════════════════════════════════════════════════════════
GOAL ANALYSIS
════════════════════════════════════════════════════════

Witness Definition:
  val canDecide = not(exists(n => decided.get(n) != None))

Target Condition:
  ✓ At least one node with decided[n] != None

Required Path:
  init → propose → vote (×quorum) → hasQuorum → decide
                    ↑_____________blocker_____________↑

════════════════════════════════════════════════════════
STATIC ANALYSIS
════════════════════════════════════════════════════════

Actions That Advance Goal:
  • decide(n, v) - sets decided[n] = Some(v)
    Preconditions:
      ✓ node n exists
      ✓ n in phase Prepare
      ✗ hasQuorum(n, v) must be true ← BLOCKER
      ✓ v was proposed

Blocker Details:
  hasQuorum requires |votesFor(v)| >= quorum_size
  Current: quorum_size = 3*f + 1 = 7, N = 4
  ❌ IMPOSSIBLE: Cannot collect 7 votes from 4 nodes

════════════════════════════════════════════════════════
DYNAMIC ANALYSIS
════════════════════════════════════════════════════════

Search Progression:
  • Pass 1: 1000 samples × 50 steps → No violation
  • Pass 2: 10000 samples × 150 steps → No violation

Relaxation Test:
  • Original: not(exists(n => decided.get(n) != None))
  • Relaxed: not(exists(n => votes.get(n) != None))
  • Result: VIOLATED ✓
  • Insight: System can collect votes but cannot reach decision.
    Problem lies between vote collection and decision logic.

Sample Traces:
  All 5 traces collect 2-4 votes but never reach quorum (7).
  No trace executes 'decide' action.

════════════════════════════════════════════════════════
GUARD ANALYSIS
════════════════════════════════════════════════════════

Goal Variable: decided (needs to be set to reach witness)

Code that writes to 'decided':
  consensus.qnt:467 - decided' = decided.set(n, Some(v))

Blocking Guards:
  ✗ msg.type == DecisionMsg (consensus.qnt:455) - DecisionMsg never arrives
  ✗ msg.cert.size() >= 4*F+1 (consensus.qnt:456) - Need 5 votes, have 4 nodes

Satisfiable Guards:
  ✓ height == msg.height (consensus.qnt:458)

════════════════════════════════════════════════════════
DIAGNOSIS
════════════════════════════════════════════════════════

IMPOSSIBLE_CONFIGURATION: quorum_size (7) > total_nodes (4)

The quorum formula 3f+1 requires 7 votes with f=2, but only 4 nodes exist.
The 'decide' action can never execute.

Key Evidence: Mathematical impossibility (7 > 4), all 10k traces stuck collecting votes, relaxed witness also fails

════════════════════════════════════════════════════════
WHERE TO INVESTIGATE
════════════════════════════════════════════════════════

1. consensus.qnt:module_params - Check N=4, f=2 creates impossible constraint
2. consensus.qnt:quorum_formula - Verify 3f+1 formula is correct
3. consensus.qnt:decide_action - Will never execute with current parameters

════════════════════════════════════════════════════════
```

## Design Rationale

### Progressive Search
Try harder before concluding by automatically increasing parameters (3× steps, 10× samples).

### Witness Relaxation
Binary search approach - test relaxed version to narrow down problem location.

### Internal Reflection (Not User-Facing)
Agent generates multiple hypotheses, cross-validates evidence, challenges conclusions before finalizing. This produces higher quality diagnosis without cluttering user output.

**Critical Guideline**: Never expose internal reasoning artifacts or bias user judgment:
- No confidence scores or probabilities
- No hypothesis rankings (no "Primary", "Alternative", "Most Likely", etc.)
- No ordering that implies priority
- Present all reasonable hypotheses neutrally with equal formatting
- Let user decide which hypothesis fits their understanding

### Investigation Focus
User sees clean, focused output pointing to specific locations, not the internal reasoning process.

### Efficiency
Skip extended search if structural blocker found - no point trying harder.

## Implementation Notes

### Relaxation Patterns

| Witness Type | Relaxation Strategy | Example |
|--------------|-------------------|---------|
| Quantitative | Halve the threshold | `>= 10` → `>= 5` |
| Conjunction | Drop last clause | `A and B and C` → `A and B` |
| Universal | Change to existential | `all(n => P)` → `exists(n => P)` |
| Threshold | Halve requirement | `\|S\| >= N` → `\|S\| >= N/2` |

### Static Blocker Detection

Check for:
- Parameter constraints: `X > Y` where X and Y are parameters with X ≤ Y
- Cardinality issues: `|S| >= N` where S has max size < N
- Contradictions: Precondition requires X but X is always false

### Pattern Categories (Internal)

**IMPOSSIBLE_CONFIGURATION**: Static analysis proves unreachable (typical confidence: 0.9+)
**OVERLY_RESTRICTIVE**: Precondition theoretically satisfiable but too strict (0.6-0.8)
**PROBABILISTIC_ISSUE**: No structural blocker, needs more exploration (0.3-0.6). If executions finish early (< max steps), discard this hypothesis.
**DEADLOCK**: Circular dependencies, system stuck (0.7-0.9)

### Internal Reflection Process

1. **Multi-Hypothesis Generation**: Generate 2-3 competing explanations
2. **Evidence Cross-Check**: Verify consistency across static, dynamic, relaxation
3. **Devil's Advocate**: Challenge leading hypothesis before accepting
4. **Confidence Scoring**: Weight evidence strength (0.0-1.0 scale) - INTERNAL ONLY
5. **Gap Identification**: Mark what we don't know

**Output Guidelines**:
- Internal: Use confidence scores (0.95, 0.3, etc.) to filter which hypotheses to show
- User-facing: Present filtered hypotheses neutrally without ranking
- Examples:
  - Internal: "H1=0.85, H2=0.65, H3=0.15" → Show H1 and H2 (H3 too weak)
  - User sees: Both hypotheses presented identically, no indication H1 is stronger
  - Internal: "H1=0.95, H2=0.20" → Show only H1 (H2 too weak)
  - User sees: Single hypothesis as the finding

**Investigation Guidelines**:
- Logic bugs are the most prominent issues to look for.
- Discard message loss issues if the spec uses choreo (assumed reliable delivery).
- Focus on message exchange patterns. If a message is needed to trigger a statement, ensure that the message was actually sent in the traces.
- Focus on local state fields and their impact on guards. Are the relevant state fields being set and updated correctly?
- Quint is perfect, it has no bugs and no unexpected behaviors. Any issues must stem from the spec itself.
