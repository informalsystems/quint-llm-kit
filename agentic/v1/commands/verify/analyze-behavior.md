# Verify Analyze Behavior Command

**Purpose**: Understand spec behavior by reading and analyzing the code before designing tests.

**Version**: 3.0.0

## Arguments

```
/verify/analyze-behavior \
  --spec_path=<path> \
  [--requirement_analysis=<path>]
```

- `spec_path`: Path to Quint spec file
- `requirement_analysis`: Optional requirement-analysis.json for context

## Output

Returns JSON:
```json
{
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
    "Validity: Decided value must be proposed",
    "Termination: Eventually decide if enough honest nodes"
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

## Process

### 1. Read and Understand Spec

**Read main module:**
- Use Read tool to load spec
- Identify module structure

**Understand purpose:**
- Read comments and documentation
- Check requirements if provided
- Infer protocol type (consensus, state machine, etc.)

### 2. Analyze Actions

**For each action:**
- Read action definition
- Understand preconditions (when it can execute)
- Understand effects (what it changes)
- Identify data dependencies
- Note any control flow (if/match/any)

**Example:**
```quint
action propose = {
  require(round == 0),
  require(not proposed),
  all {
    proposals' = proposals.add(myValue),
    proposed' = true
  }
}
```

**Analysis:**
- Behavior: Adds value to proposals
- Precondition: round must be 0, not yet proposed
- Effect: Updates proposals set and proposed flag
- Side effects: None

### 3. Understand State Machine

**Identify states:**
- What are the meaningful states? (Init, Voting, Decided)
- What distinguishes them? (round number, decided flag)

**Identify transitions:**
- How does spec move between states?
- What triggers transitions? (actions)
- Are there loops? (round increments)

**Draw mental model:**
```
Init -> Propose -> Vote -> Decide
         ^         |
         |---------|  (new round)
```

### 4. Identify Critical Properties

**By reading code, infer:**
- **Safety properties**: What must always be true?
  - "If node1.decided and node2.decided, then node1.decision == node2.decision"
  - "Decided values must be in original proposals"

- **Liveness properties**: What should eventually happen?
  - "Protocol should eventually decide"
  - "Rounds should be able to advance"

- **Invariants**: What is preserved?
  - "Round numbers monotonically increase"
  - "At most f nodes faulty"

### 5. Analyze Quorum/Threshold Logic

**Look for formulas:**
```bash
grep -E "quorum|threshold|[0-9]\s*\*\s*f" spec.qnt
```

**Understand usage:**
- Where is quorum/threshold used? (vote, decide actions)
- What does it check? (enough votes before deciding)
- Is formula correct per requirements?

**Example finding:**
```
Found: quorum = 2*f + 1
Used in: decide action checks votes.size() >= quorum
Requirements say: Byzantine quorum should be 5*f+1
Issue: Formula mismatch - potential bug
```

### 6. Detect Potential Issues

**By analyzing code, identify:**

**Deadlock potential:**
- Actions with preconditions that may never be satisfied
- Circular dependencies between actions

**Liveness issues:**
- No timeout mechanism but protocol needs one
- Round advancement requires specific conditions that may not occur

**Safety violations:**
- Weak quorum requirements
- Missing checks before state changes

**Logic errors:**
- Off-by-one errors in thresholds
- Incorrect formula (3f+1 vs 5f+1)

### 7. Generate Behavioral Understanding

**Summarize in plain language:**
```
This is a Byzantine consensus protocol where:
- Nodes propose values in rounds
- Voting happens with 2*f+1 threshold (Byzantine quorum)
- Decision is made when enough votes collected
- Rounds advance on timeout or failure

Key behaviors:
- propose: Nodes broadcast their value
- vote: Nodes vote for proposed values
- decide: Node decides when quorum votes for same value
- timeout: Advances round if no progress

Critical properties to test:
- Agreement (safety)
- Validity (safety)
- Termination (liveness)
```

## Output Format

Return structured understanding:
- Protocol type and purpose
- Action-by-action behavior summary
- State machine structure
- Critical properties (inferred from code)
- Potential issues spotted
- Quorum/threshold logic analysis

## Integration with Test Design

This analysis feeds into `/verify/design-tests`:
- Use action behaviors to design scenarios
- Use critical properties to write invariants/witnesses
- Use potential issues to add edge case tests
- Use quorum logic to generate config-specific invariants

## Example

**Input:**
```bash
/verify/analyze-behavior \
  --spec_path=specs/consensus.qnt \
  --requirement_analysis=.artifacts/requirement-analysis.json
```

**Spec snippet:**
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
  decided' = true,
  decision' = majorityValue
}
```

**Output:**
```json
{
  "protocol_understanding": "Multi-round consensus protocol with propose-vote-decide phases",
  "key_actions": [
    {
      "name": "propose",
      "behavior": "Node adds its value to shared proposals",
      "preconditions": "Must be in round 0",
      "effects": "proposals set grows"
    },
    {
      "name": "vote",
      "behavior": "Node votes for a proposal if quorum not yet reached",
      "preconditions": "At least one proposal exists, votes < quorum",
      "effects": "votes set grows"
    },
    {
      "name": "decide",
      "behavior": "Node decides when quorum votes collected",
      "preconditions": "votes.size() >= 2*f+1",
      "effects": "Sets decided=true and decision value"
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

## Tools Used

- `Read` - Read spec file
- `Grep` - Find patterns (quorum formulas, thresholds)
- Requirements - Cross-check with expected behavior

## Notes

- This is **static analysis** - understands code without running it
- Complements test execution (finds different types of issues)
- Helps design better tests by understanding behavior first
- Can spot issues before writing any tests
