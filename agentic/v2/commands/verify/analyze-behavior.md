---
command: /verify:analyze-behavior
description: Understand spec behavior through code analysis before designing tests
version: 4.0.0
---

# Verify Analyze Behavior Command

## Objective

Understand specification behavior by analyzing code structure, actions, state machine flow, and critical properties to inform test design.

## Input Contract

### Required Parameters
- `spec_path`: Path to Quint spec file

### Optional Parameters
- `requirement_analysis`: Path to requirement-analysis.json for context

## Output Contract

### Success
```json
{
 "status": "completed",
 "protocol_understanding": "Byzantine consensus protocol using rounds and voting",
 "key_actions": [
 {
 "name": "propose",
 "behavior": "Node proposes value, adds to proposals set",
 "preconditions": "round == 0, not yet proposed",
 "effects": "proposals.add(value)"
 }
 ],
 "state_machine": {
 "states": ["Init", "Proposed", "Voted", "Decided"],
 "transitions": ["propose -> vote", "vote -> decide"]
 },
 "critical_properties": [
 "Agreement: No two nodes decide differently",
 "Validity: Decided value must be proposed"
 ],
 "potential_issues": [
 "Possible deadlock if no quorum in propose phase",
 "Liveness concern: may not progress without timeout"
 ],
 "quorum_logic": {
 "formula": "2*f + 1",
 "usage": "Used in vote and decide actions",
 "correctness": "Should be 5*f+1 for Byzantine per requirements"
 }
}
```

### Failure
```json
{
 "status": "failed",
 "error": "Specific error description",
 "phase": "read_spec | analyze_actions | identify_properties"
}
```

## Execution Procedure

### Phase 1: Spec Reading and Context

Objective: Load spec and understand overall purpose.

Steps:

1. **Read Spec File**
 - Run: Read file at `spec_path`
 - Action on missing file: Return error "Spec file not found"

2. **Identify Module Structure**
 - Extract: Module name
 - Extract: Import statements
 - Extract: Framework type (standard vs choreo)
 - Parse: Comments and documentation

3. **Load Requirements Context** (if provided)
 - Run: Read requirement_analysis from path
 - Extract: Expected behaviors
 - Extract: Critical properties mentioned
 - Use: To cross-check against actual implementation

4. **Infer Protocol Type**
 - Based on: State variables, action names, imports
 - Classify as: Consensus, state machine, token, voting, etc.
 - Store: Protocol type for context

### Phase 2: Action Analysis

Objective: Understand what each action does.

Steps:

5. **Enumerate Actions**
 - Run: Grep for pattern `(action|def)\s+(\w+)`
 - Filter: Actions vs pure definitions (actions modify state or return bool)
 - Store: List of action names

6. **Analyze Each Action**
 - Per action found:

 a. **Read Action Definition**
 - Run: Read action body from spec
 - Handle: Multi-line definitions

 b. **Identify Preconditions**
 - Look for: `require()` statements
 - Look for: Guard conditions in `if` or `match`
 - Extract: Conditions that must be true for action to execute
 - Example: `require(round == 0)` → precondition: round must be 0

 c. **Identify Effects**
 - Look for: State variable assignments (pattern: `var' = ...`)
 - Look for: Set operations (add, remove, union)
 - Extract: Which state variables change and how
 - Example: `proposals' = proposals.add(myValue)` → adds to proposals

 d. **Identify Data Dependencies**
 - Which state variables does action read?
 - Which other definitions does it call?
 - Are there any pure functions involved?

 e. **Note Control Flow**
 - Are there branches (`if`/`match`)?
 - Are there any/all quantifiers?
 - Is there non-deterministic choice?

 f. **Summarize Behavior**
 - In plain language: What does this action do?
 - Store: Behavior description

7. **Record Action Analysis**
 - Per action, store:
 - Name
 - Behavior summary
 - Preconditions list
 - Effects list
 - Add to output structure

### Phase 3: State Machine Understanding

Objective: Identify states and transitions.

Steps:

8. **Identify Meaningful States**
 - Based on state variable values:
 - What distinguishes different protocol phases?
 - Examples: Init (round=0, no votes), Voting (votes>0, not decided), Decided (decided=true)
 - List: Meaningful state names

9. **Identify Transitions**
 - Per action:
 - What state does it start from? (preconditions)
 - What state does it lead to? (effects)
 - Map: Action → State Transition
 - Example: `propose` moves from Init → Proposing

10. **Detect Loops**
 - Are there cyclic transitions?
 - Example: Round increment creates loop back to propose phase
 - Note: Potential for infinite loops or expected iteration

11. **Create State Machine Model**
 - Construct: States and transitions
 - Format: Plain text or structured representation
 - Example:
 ```
 Init -> Propose -> Vote -> Decide
 ^ |
 |---------| (new round)
 ```

### Phase 4: Critical Property Identification

Objective: Infer properties from code structure.

Steps:

12. **Identify Safety Properties**
 - Look for: Invariants that must always hold
 - Infer from code:
 - "If node1.decided and node2.decided, then node1.decision == node2.decision" (Agreement)
 - "Decided values must be in original proposals" (Validity)
 - "At most f nodes can be faulty" (Byzantine assumption)
 - Check: Existing val definitions that look like invariants
 - Store: Safety property descriptions

13. **Identify Liveness Properties**
 - Look for: Properties about eventual progress
 - Infer:
 - "Protocol should eventually decide" (Termination)
 - "Rounds should advance" (Progress)
 - "Actions should be able to execute" (No permanent deadlock)
 - Store: Liveness property descriptions

14. **Identify Preserved Invariants**
 - What relationships are maintained?
 - Examples:
 - Round numbers monotonically increase
 - Vote counts never decrease
 - Decided flag never reverts to false
 - Store: Invariant descriptions

### Phase 5: Quorum and Threshold Analysis

Objective: Find and analyze threshold formulas.

Steps:

15. **Search for Formulas**
 - Run: Grep for patterns:
 - `\d\s*\*\s*f` (e.g., 2*f, 3*f, 5*f)
 - `quorum`
 - `threshold`
 - Mathematical expressions with f or N
 - Record: Formula found and location

16. **Understand Formula Usage**
 - Per formula found:
 - Where is it used? (which actions)
 - What does it check? (vote count, node participation)
 - Is it defined as constant or inline?
 - Store: Usage context

17. **Cross-Check with Requirements**
 - If requirement_analysis provided:
 - Check: Expected formula from requirements
 - Compare: Actual vs expected
 - Flag: Mismatches (e.g., 2*f+1 vs 5*f+1)
 - Store: Correctness assessment

### Phase 6: Potential Issue Detection

Objective: Identify potential bugs or concerns.

Steps:

18. **Check for Deadlock Potential**
 - Look for:
 - Actions with preconditions that may never be satisfied
 - Circular dependencies between actions
 - States with no outgoing transitions
 - If found: Add to potential_issues

19. **Check for Liveness Issues**
 - Look for:
 - No timeout mechanism when protocol might stall
 - Progress requires specific conditions that may not occur
 - Actions that could block indefinitely
 - If found: Add to potential_issues

20. **Check for Safety Vulnerabilities**
 - Look for:
 - Weak quorum requirements (e.g., f+1 instead of 2f+1)
 - Missing checks before state changes
 - Possible race conditions
 - If found: Add to potential_issues

21. **Check for Logic Errors**
 - Look for:
 - Off-by-one errors in thresholds (>= vs >)
 - Incorrect formula (3f+1 vs 5f+1 for Byzantine)
 - Type mismatches
 - If found: Add to potential_issues

### Phase 7: Generate Summary

Objective: Compile analysis into structured output.

Steps:

22. **Write Protocol Understanding**
 - Summarize in plain language:
 - What is this protocol?
 - What does it do?
 - How does it work?
 - Example: "Byzantine consensus protocol where nodes propose values in rounds, vote with 2*f+1 threshold, and decide when quorum reached"

23. **Compile Key Actions Summary**
 - Include all actions analyzed with:
 - Name, behavior, preconditions, effects

24. **Compile State Machine**
 - Include: States and transitions identified

25. **Compile Critical Properties**
 - Include: Safety, liveness, and invariants inferred

26. **Compile Potential Issues**
 - Include: All issues flagged in Phase 6

27. **Compile Quorum Analysis**
 - Include: Formula, usage, correctness assessment

28. **Return Complete Analysis**
 - Status: "completed"
 - All sections filled

## Tools Used

- `Read`: Read spec file and requirements
- `Grep`: Find patterns (actions, formulas, thresholds)

## Error Handling

### File Not Found
- **Condition**: `spec_path` does not exist
- **Action**: Return error "Spec file not found"
- **Recovery**: User must provide valid spec file path

### Parse Error
- **Condition**: Cannot parse spec structure (syntax errors)
- **Action**: Return partial analysis with warning
- **Recovery**: Fix spec syntax, retry analysis

### No Actions Found
- **Condition**: Cannot identify any actions in spec
- **Action**: Return minimal analysis with warning
- **Recovery**: Verify spec is complete, check for unusual naming

### Requirements Not Available
- **Condition**: requirement_analysis path provided but file not found
- **Action**: Continue without requirements context, log warning
- **Recovery**: Proceed with code-only analysis

## Integration with Test Design

This analysis feeds into `/verify:design-tests`:

**Use Cases**:
- **Action behaviors** → Design scenario tests
- **Critical properties** → Write invariants and witnesses
- **Potential issues** → Add edge case tests
- **Quorum logic** → Generate configuration-specific tests

**Example Flow**:
1. analyze-behavior finds: "Possible deadlock if no quorum"
2. design-tests creates: "noQuorumTimeout" test scenario
3. analyze-behavior finds: Formula is "2*f+1" but should be "5*f+1"
4. design-tests creates: Config-specific invariant to catch this

## Example Execution

**Input**:
```
/verify:analyze-behavior \
 --spec_path=specs/consensus.qnt \
 --requirement_analysis=.artifacts/requirement-analysis.json
```

**Spec Content** (excerpt):
```quint
action propose = {
 require(round == 0),
 proposals' = proposals.add(myValue)
}

action vote = {
 require(proposals.size() > 0),
 require(votes.size() < 2*f + 1),
 votes' = votes.add(chosenValue)
}

action decide = {
 require(votes.size() >= 2*f + 1),
 all {
 decided' = true,
 decision' = majorityValue
 }
}
```

**Process**:
1. Read spec file
2. Identify module "consensus"
3. Framework: standard
4. Find actions: propose, vote, decide
5. Analyze propose: Precondition round==0, Effect adds to proposals
6. Analyze vote: Precondition quorum not reached, Effect adds vote
7. Analyze decide: Precondition quorum reached, Effect sets decided
8. Identify states: Init, Proposing, Voting, Decided
9. Identify transitions: Init->Proposing->Voting->Decided
10. Infer safety: Agreement (all decisions same)
11. Infer liveness: Eventually decide
12. Find formula: 2*f+1
13. Check requirements: Says 5*f+1 needed for Byzantine
14. Flag issue: Formula mismatch
15. Flag issue: No timeout mechanism
16. Compile summary

**Output**:
```json
{
 "status": "completed",
 "protocol_understanding": "Multi-round consensus protocol with propose-vote-decide phases",
 "key_actions": [
 {
 "name": "propose",
 "behavior": "Node adds its value to shared proposals",
 "preconditions": ["round == 0"],
 "effects": ["proposals set grows"]
 },
 {
 "name": "vote",
 "behavior": "Node votes for a proposal if quorum not yet reached",
 "preconditions": ["proposals.size() > 0", "votes.size() < 2*f+1"],
 "effects": ["votes set grows"]
 },
 {
 "name": "decide",
 "behavior": "Node decides when quorum votes collected",
 "preconditions": ["votes.size() >= 2*f+1"],
 "effects": ["decided=true", "decision set"]
 }
 ],
 "state_machine": {
 "states": ["Initial", "Proposing", "Voting", "Decided"],
 "transitions": [
 "Initial -> Proposing (propose action)",
 "Proposing -> Voting (vote action)",
 "Voting -> Decided (decide action when quorum reached)"
 ]
 },
 "critical_properties": [
 "Agreement: All nodes that decide must decide the same value",
 "Validity: Decided value must have been proposed",
 "Termination: With enough honest nodes, protocol decides"
 ],
 "potential_issues": [
 "No timeout mechanism - may deadlock if proposals never appear",
 "Round 0 requirement in propose may be too restrictive",
 "Quorum formula 2*f+1 may be insufficient for Byzantine faults"
 ],
 "quorum_logic": {
 "formula_found": "2*f + 1",
 "used_in": ["vote precondition check", "decide precondition check"],
 "requirements_say": "Byzantine consensus needs 5*f+1",
 "correctness": "MISMATCH - potential bug"
 }
}
```

## Analysis Type

**Static Analysis**:
- Analyzes code without executing it
- Complements test execution (finds different issue types)
- Helps design better tests by understanding behavior first
- Can spot issues before writing any tests

