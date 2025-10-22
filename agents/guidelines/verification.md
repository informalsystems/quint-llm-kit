# Verifier: Detailed How-To Guidelines

**Purpose**: Step-by-step guide for running witnesses, invariants, and deterministic tests effectively.

**When to use**: Throughout Phase 3 (Execution) when running verification commands and interpreting results.

---

## Module Configuration for Parameterized Specs

**When specs have constants (N, f, quorum, etc.), test with multiple configurations to catch parameter-dependent bugs:**

1. **Identify parameters:** Scan spec for `const` declarations and formulas (e.g., `quorum = 5*f+1`)
2. **Check requirements:** Extract expected formulas from requirement-analysis.json
3. **Select 3 configurations:**
   - **Minimal:** Small values (N=4, f=1) - catches edge cases and wrong formulas
   - **Typical:** Realistic values (N=7, f=2) - represents deployment
   - **Stress:** Large values (N=10, f=3) - tests at scale
4. **Generate config-specific invariants:** Check formulas match requirements
   ```quint
   val quorumMatchesSpec = (quorum == 5 * f + 1)  // From requirements
   val byzantineConstraints = (N >= 3*f+1) and (quorum > N-f) and (quorum > 2*f)
   ```
5. **Structure test file:** Shared tests + module instances for each config
6. **Run with `--main` flag:** `quint run test.qnt --main=TestMin --invariant=agreement`
7. **Aggregate results:** Track which configs pass/fail to identify parameter bugs

**Why this matters:** A spec using `3*f+1` instead of `5*f+1` will fail config-specific invariants, exposing the formula bug.

---

## Running Witnesses (Liveness Checks)

### Purpose
Verify protocol can make progress (liveness property).

### Basic Command
```bash
quint run <test_file>.qnt \
  --main=<module> \
  --invariant=<witness_name> \
  --max-steps=100 \
  --max-samples=100
```

### Expected Result
Witness **VIOLATED** (means progress is possible - this is GOOD!)

### Step-by-Step Process

#### 1. Start with Low Parameters
```bash
quint run consensus_test.qnt \
  --main=ConsensusTest \
  --invariant=canDecide \
  --max-steps=100 \
  --max-samples=100
```

#### 2. If Witness is Violated Quickly (<10 steps)
- ✅ **GOOD:** Protocol can make progress easily
- **Action:**
  - Record: seed, step count
  - Move to next witness

#### 3. If Witness is SATISFIED after 100 Samples
- ⚠️ **CONCERN:** May indicate liveness issue
- **Action:** Increase max-steps progressively
```bash
# Try with more steps
quint run consensus_test.qnt \
  --main=ConsensusTest \
  --invariant=canDecide \
  --max-steps=200 \
  --max-samples=100

# Still satisfied? Try even more
--max-steps=500

# Still satisfied? Try maximum
--max-steps=1000 \
  --max-samples=200
```

#### 4. If Witness NEVER Violated (even at max-steps=1000)
- 🐛 **BUG:** Either witness too strong OR protocol has liveness issue
- **Diagnose:**
```bash
# Run with MBT to see actions
quint run consensus_test.qnt \
  --main=ConsensusTest \
  --invariant=canDecide \
  --max-steps=100 \
  --mbt \
  --verbosity=3
```

- **Look for:**
  - Which actions are executing?
  - Is protocol stuck in a state?
  - Are there unreachable actions?

- **Fix Options:**
  - Weaken witness definition
  - Fix protocol liveness bug
  - Adjust init conditions

#### 5. Record Results
- **Violated:** ✅ `VIOLATED at step X (seed: Y)`
- **Satisfied:** ⚠️ `SATISFIED after X samples - investigate`

---

## Running Invariants (Safety Checks)

### Purpose
Verify property holds in ALL states (safety property).

### Basic Command
```bash
quint run <test_file>.qnt \
  --main=<module> \
  --invariant=<invariant_name> \
  --max-steps=200 \
  --max-samples=500
```

### Expected Result
Invariant **SATISFIED** (means safety holds - this is GOOD!)

### Step-by-Step Process

#### 1. Start with Moderate Parameters
```bash
quint run consensus_test.qnt \
  --main=ConsensusTest \
  --invariant=agreement \
  --max-steps=200 \
  --max-samples=500
```

#### 2. If Invariant is SATISFIED
- ✅ **GOOD:** Safety property holds
- **For critical invariants, stress test:**
```bash
# Increase samples for thorough check
quint run consensus_test.qnt \
  --main=ConsensusTest \
  --invariant=agreement \
  --max-steps=500 \
  --max-samples=1000
```
- If still satisfied after stress test: ✅ **HIGH CONFIDENCE**
- **Record:** samples checked, max steps

#### 3. If Invariant is VIOLATED
- 🐛 **CRITICAL BUG:** Safety property broken
- **Immediate Actions:**
```bash
# Get detailed trace
quint run consensus_test.qnt \
  --main=ConsensusTest \
  --invariant=agreement \
  --seed=<failed_seed> \
  --mbt \
  --verbosity=3
```

- **Analyze Trace:**
  - Which step violated invariant?
  - What actions led to violation?
  - What state values caused issue?

- **Record:**
  - Exact reproduction command
  - Seed for reproducibility
  - Step number of violation
  - Brief description of what went wrong

#### 4. Minimize Counterexample (Optional but Helpful)
```bash
# Try to find shorter path to violation
quint run consensus_test.qnt \
  --main=ConsensusTest \
  --invariant=agreement \
  --seed=<failed_seed> \
  --max-steps=<violation_step + 5>
```

#### 5. Cross-Check with Different Seeds
```bash
# Verify violation isn't seed-specific
quint run consensus_test.qnt \
  --main=ConsensusTest \
  --invariant=agreement \
  --max-steps=200 \
  --max-samples=100  # Run more samples
```
- **If violated with different seeds:** ✅ **Confirmed bug**
- **If only one seed:** ⚠️ **Rare edge case** (still a bug!)

---

## Running Deterministic Tests

### Purpose
Verify specific scenarios work as expected.

### Basic Command
```bash
quint test <test_file>.qnt \
  --main=<module> \
  --match=<test_pattern>
```

### Expected Result
All tests **PASSED**.

### Step-by-Step Process

#### 1. Run All Tests
```bash
quint test consensus_test.qnt \
  --main=ConsensusTest \
  --match=".*"
```

#### 2. If All Tests Pass
- ✅ **GOOD:** All scenarios verified
- **Record:** test count, timing

#### 3. If Test Fails
- 🐛 **BUG:** Either spec wrong OR test wrong
- **Get Details:**
```bash
quint test consensus_test.qnt \
  --main=ConsensusTest \
  --match="<failing_test>" \
  --verbosity=3
```

- **Analyze Failure:**
  - Read error message carefully
  - Which `.expect()` failed?
  - What was expected vs actual?

- **Diagnose:**
```
Is test expectation correct?
  YES → Spec has bug, fix spec
  NO  → Test has bug, fix test
  UNCLEAR → Add more `.expect()` assertions to narrow down
```

#### 4. For Failed Tests, Iterate
Add intermediate expectations:
```quint
run myTest =
  init
    .then(action1)
    .expect(state.round == 0)  # ← Add checkpoint
    .then(action2)
    .expect(state.decided == false)  # ← Add checkpoint
    .then(action3)
    .expect(invariantHolds)  # Final check
```

---

## Iteration Strategy: When Tests Don't Validate Spec

### Scenario 1: Compilation Errors

**Symptom:**
```bash
$ quint parse consensus_test.qnt
Error: Unexpected token ')' at line 45
```

**Action:**
1. Read test file lines 40-50
2. Check syntax (likely typo, missing comma, unbalanced parens)
3. Fix syntax using Edit tool
4. Re-run parse
5. If stuck after 3 attempts: query KB for syntax help

### Scenario 2: Witness Never Violated

**Symptom:**
```bash
⚠️ canAdvanceRound SATISFIED after 1000 samples
```

**Action:**

1. **Check if witness definition is correct:**
```quint
// Is this really checking liveness?
val canAdvanceRound = all(nodes.map(n => state.round.get(n) == 0))
```
- Does this express "protocol CAN advance"? (Should be violated when it does)

2. **Check if protocol has actions to advance:**
```bash
grep "round.*+" consensus.qnt  # Look for round increment
```

3. **Run with MBT to see what's happening:**
```bash
quint run --invariant=canAdvanceRound --mbt --max-steps=50 | head -100
```
- Are advance actions executing?
- Is protocol stuck in init state?

4. **Options:**
   - **Weaken witness:** Maybe too restrictive (e.g., check single node not all)
   - **Fix spec:** Add missing round advancement logic
   - **Adjust init:** Maybe init prevents advancement

### Scenario 3: Invariant Violated Immediately

**Symptom:**
```bash
❌ agreement VIOLATED at step 0
```

**Action:**

1. **Check init state:**
```quint
def init = ...  // Does init already violate invariant?
```

2. **If invariant violated at init:**
   - 🐛 **Bug in init** OR
   - 🐛 **Invariant too strong**

3. **Review invariant definition:**
```quint
val agreement = all(nodes.map(n1 => all(nodes.map(n2 =>
  state.decided.get(n1) and state.decided.get(n2) implies
    state.decision.get(n1) == state.decision.get(n2)
))))
```
- Is this checking what you think?
- Does init satisfy this?

### Scenario 4: Test Compiles but Fails

**Symptom:**
```bash
❌ normalConsensusPath FAILED
Expected: state.decided.get("p1") == true
Got: state.decided.get("p1") == false
```

**Action:**

1. **Understand test intent:**
   - What scenario is being tested?
   - What should happen?

2. **Add debug expectations:**
```quint
run normalConsensusPath =
  init
    .expect(state.round.get("p1") == 0)  // Checkpoint 1
    .then(propose)
    .expect(state.proposals.size() > 0)  // Checkpoint 2
    .then(prevote)
    .expect(state.prevotes.size() > 0)   // Checkpoint 3
    .then(decide)
    .expect(state.decided.get("p1"))      // Final
```

3. **Run to find where it breaks:**
```bash
quint test --match="normalConsensusPath" --verbosity=3
```

4. **Fix either:**
   - **Spec:** If logic is wrong
   - **Test:** If expectation is wrong
   - **Both:** If both have issues

---

## Tool Usage Patterns

### MBT (Model-Based Trace) for Debugging

**Command:**
```bash
quint run consensus_test.qnt \
  --main=ConsensusTest \
  --invariant=agreement \
  --seed=99999 \
  --mbt \
  --verbosity=3 \
  --max-steps=20
```

**Output shows:**
```
State 0: { round: 0, decided: false, ... }
Action: propose
  Picked: proposalValue = 42
State 1: { round: 0, decided: false, proposals: Set(42), ... }
Action: prevote
...
```

### Verbosity Levels

- `--verbosity=1`: Minimal (just pass/fail)
- `--verbosity=2`: Moderate (action names)
- `--verbosity=3`: Detailed (state changes, picks)
- `--verbosity=4`: Very detailed (full state dumps)

### Hiding Verbose State

```bash
# Hide framework state (choreo)
quint run --invariant=witness --hide choreo::s
```

### Controlling Randomness

```bash
# Reproduce exact execution
quint run --invariant=agreement --seed=12345

# Try multiple random executions
quint run --invariant=agreement --max-samples=1000
```

---

## Example Test Patterns

### Standard Framework Witness

```quint
// Witness: Protocol can reach decision
// Expected: VIOLATED (at least one path to decision exists)
val cannotDecide = not(nodes.exists(n => state.decided.get(n)))
```

### Standard Framework Invariant

```quint
// Invariant: Agreement - no two nodes decide differently
// Expected: SATISFIED (safety property holds)
val agreement = all(nodes.map(n1 => all(nodes.map(n2 =>
  (state.decided.get(n1) and state.decided.get(n2)) implies
    state.decision.get(n1) == state.decision.get(n2)
))))
```

### Standard Framework Deterministic Test

```quint
run normalConsensusPath =
  init
    .then(propose)
    .then(prevote)
    .then(precommit)
    .then(decide)
    .expect(allNodesDecided)
    .expect(allNodesSameDecision)
```

### Choreo Framework Witness (with logging)

```quint
// 1. Add log type
type LogEntry =
  | ProposalReceived({ node: Node, value: Val })
  | VoteCast({ node: Node, round: Int })

// 2. Add to extensions
extensions: { log: List[LogEntry] }

// 3. Log in listeners
("process_proposal", (c, p) =>
  choreo::CustomEffect(Log(ProposalReceived({ node: c.self, value: p.value })))
  .union(process_proposal_logic(c, p))
)

// 4. Define witness watching log
val proposalNeverReceived = match choreo::s.extensions.log {
  | ProposalReceived(_) :: _ => false  // Violated when proposal received
  | _ => true  // Satisfied if no proposals
}

// 5. Run
// quint run --invariant=proposalNeverReceived --init=init_displayer --max-steps=100
```

### Choreo Framework Deterministic Test

```quint
run proposalFlowTest =
  init
    .then("p1".with_cue(listen_block_inputs, block42).perform(process_block_input))
    .expect(choreo::s.extensions.log.exists(e => match e {
      | ProposalReceived({ value: 42 }) => true
      | _ => false
    }))
    .then("p2".with_cue(listen_votes, voteFor42).perform(process_vote))
    .expect(votesForBlock42.size() >= 1)
```

---

## Self-Evaluation Checklist

Before reporting verification complete, verify:

### Test Design Quality
- [ ] At least 2-3 witnesses covering main progress goals
- [ ] At least 2 invariants covering critical safety properties
- [ ] At least 3-5 deterministic tests covering key scenarios
- [ ] Test file compiles (parse + typecheck pass)

### Execution Completeness
- [ ] All witnesses executed with adequate max-steps
- [ ] All invariants stress-tested with high sample counts
- [ ] All deterministic tests run
- [ ] Timing information recorded for all tests

### Results Analysis
- [ ] Witnesses: Interpreted correctly (violated = good, satisfied = concern)
- [ ] Invariants: Interpreted correctly (satisfied = good, violated = bug)
- [ ] Tests: Failure cause identified (spec bug vs test bug)
- [ ] All bugs have reproduction commands with seeds

### Reporting Quality
- [ ] Summary shows overall status clearly
- [ ] Critical issues flagged prominently
- [ ] Reproduction commands provided for all failures
- [ ] Next actions suggested
- [ ] Requirements linked (if available)

---

## When to Stop Iterating

### Stop and Report Success When:
- ✅ All expected witnesses violated (liveness confirmed)
- ✅ All invariants satisfied (safety confirmed)
- ✅ All deterministic tests passed
- ✅ No critical bugs found

### Stop and Report Issues When:
- ❌ Invariant violated (critical bug)
- ⚠️ Witness never violated (possible liveness issue)
- ❌ Deterministic test failed (scenario bug)
- ❌ Compilation failed after 3 fix attempts

### Stop and Ask User When:
- 🤔 Witness definition unclear (should it be violated?)
- 🤔 Invariant seems too strong/weak (is this right?)
- 🤔 Test expectations unclear (what should happen?)
- 🤔 Stuck after 3 iteration attempts

---

## Guardrails

### DO:
- ✅ Write tests in separate `_test.qnt` file
- ✅ Import spec: `import consensus.* from "./consensus"`
- ✅ Run with various `--max-steps` and `--max-samples`
- ✅ Use `--mbt` for debugging
- ✅ Record seeds for reproducibility
- ✅ Iterate on witness/invariant definitions if needed

### DON'T:
- ❌ Edit original spec file (tests are separate)
- ❌ Assume first run is conclusive (try multiple seeds)
- ❌ Ignore warnings (witness satisfied = potential issue)
- ❌ Skip stress testing critical invariants
- ❌ Proceed if compilation fails
