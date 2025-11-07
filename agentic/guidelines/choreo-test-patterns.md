# Choreo Test Patterns

**Use this guide when writing `run` definitions for specs using the Choreo framework.**

## What is Choreo?

Choreo is a framework for distributed protocol specifications where:
- Processes are identified by names (e.g., `"node1"`, `"p0"`)
- Actions are performed by specific processes: `"node".perform(action)`
- Processes communicate via listeners and cues: `"node".with_cue(listener, data).perform(action)`

## Basic Syntax

### Simple Action Execution

```quint
run simpleTest = {
  init
    .then("node1".perform(propose))
    .then("node2".perform(vote))
    .expect(votes.size() == 1)
}
```

**Pattern**: `"processName".perform(actionName)`

### Action with Cue (Message Passing)

```quint
run messageTest = {
  init
    .then("node1".perform(sendProposal))
    .then("node2".with_cue(onProposal, proposal_data).perform(receiveProposal))
    .expect(node2.hasProposal)
}
```

**Pattern**: `"processName".with_cue(listenerName, data).perform(actionName)`
- `listenerName`: The listener that triggers (e.g., `onProposal`, `onVote`)
- `data`: The message/event data being delivered

### Action with Step_with (Internal Events)

```quint
run timeoutTest = {
  init
    .then("p1".perform(propose))
    .then("p1".step_with(on_propose_timeout))
    .then("p2".step_with(on_propose_timeout))
    .expect(all_timed_out)
}
```

**Pattern**: `"processName".step_with(listenerName)`
- Used for listeners that don't use `choreo::cue()` pattern
- Typically for internal events: timeouts, local state changes
- No data parameter needed - listener fires without external message
- Common use cases: timeout handlers, periodic actions

## Common Patterns

### 1. Multi-Node Coordination (All Honest)

```quint
run quorumFormation = {
  init
    .then("p1".perform(propose))
    .then("p2".with_cue(onProposal, proposal).perform(vote))
    .then("p3".with_cue(onProposal, proposal).perform(vote))
    .then("p4".with_cue(onProposal, proposal).perform(vote))
    .expect(votes.size() >= quorum)
}
```

**Use when**: Testing normal protocol flow with multiple participants

### 2. Byzantine Node (Equivocation)

```quint
run byzantineEquivocation = {
  init
    .then("p1".perform(proposeByzantine))  // Sends conflicting proposals
    .then("p2".with_cue(onProposal, proposal_A).perform(vote))
    .then("p3".with_cue(onProposal, proposal_B).perform(vote))  // Different proposal!
    .expect(p2.voted != p3.voted)  // Nodes saw different values
}
```

**Use when**: Testing Byzantine attacks where adversary sends different messages to different nodes

### 3. Message Withholding

```quint
run byzantineWithholding = {
  init
    .then("p1".perform(propose))
    .then("p2".perform(vote))
    .then("p3".perform(vote))
    // Byzantine p4 doesn't vote (no .perform(vote))
    .expect(votes.size() < quorum)  // Quorum not reached
}
```

**Use when**: Testing Byzantine silence/withholding attacks

### 4. Strategic Timing (Late Messages)

```quint
run lateMessage = {
  init
    .then("p1".perform(propose))
    .then("p2".perform(vote))
    .then("p3".perform(vote))
    .then("p4".perform(vote))
    .then("p1".perform(advance_round))  // Timeout/advance before late message
    .then("p1".with_cue(onVote, late_vote).perform(processVote))  // Late arrival
    .expect(round > 0)  // Already advanced
}
```

**Use when**: Testing timing attacks or late message delivery

### 5. Timeout Handling (step_with)

```quint
run timeoutAndRecoverTest = {
  init
    // All processes start in ProposeStage, round 0
    .expect(CORRECT.forall(p => s.system.get(p).stage == ProposeStage))

    // Round 0: All processes timeout on propose
    .then("p1".step_with(on_propose_timeout))
    .then("p2".step_with(on_propose_timeout))
    .then("p3".step_with(on_propose_timeout))
    .then("p4".step_with(on_propose_timeout))
    .expect(CORRECT.forall(p => s.system.get(p).stage == PreVoteStage))

    // Quorum of prevotes triggers next timeout
    .then("p1".with_cue(listen_quorum_prevotes_any, ()).perform(trigger_prevote_timeout))
    .then("p2".with_cue(listen_quorum_prevotes_any, ()).perform(trigger_prevote_timeout))
    .expect(ready_for_next_round)
}
```

**Use when**: Testing timeout mechanisms and recovery
**Key points**:
- Use `.step_with(listener)` for timeout listeners (no external data)
- Use `.with_cue(listener, data).perform(action)` for event-triggered actions
- Timeouts are internal events, messages are external events

### 6. Sequential Phases

```quint
run fullRound = {
  init
    .then("p1".perform(propose))
    .then("p2".with_cue(onProposal, prop).perform(prevote))
    .then("p3".with_cue(onProposal, prop).perform(prevote))
    .then("p4".with_cue(onProposal, prop).perform(prevote))
    .expect(phase == Prevote)
    .then("p2".with_cue(onPrevotes, prevotes).perform(precommit))
    .then("p3".with_cue(onPrevotes, prevotes).perform(precommit))
    .then("p4".with_cue(onPrevotes, prevotes).perform(precommit))
    .expect(phase == Precommit)
}
```

**Use when**: Testing multi-phase protocols (propose → prevote → precommit → decide)

## Key Differences from Standard Framework

| Aspect | Standard Framework | Choreo Framework |
|--------|-------------------|------------------|
| Action call | `action(params)` | `"process".perform(action)` |
| Message passing | Not explicit | `.with_cue(listener, data)` |
| Internal events | Not explicit | `.step_with(listener)` |
| Process identity | Implicit | Explicit via `"processName"` |
| Multi-node | Actions apply globally | Each node acts explicitly |

## Common Mistakes

### ❌ Wrong: Using standard syntax in choreo spec
```quint
run test = {
  init
    .then(propose)  // Missing process name!
}
```

### ✅ Correct: Using choreo syntax
```quint
run test = {
  init
    .then("node1".perform(propose))
}
```

### ❌ Wrong: Missing cue when action expects listener
```quint
run test = {
  init
    .then("p1".perform(sendMsg))
    .then("p2".perform(receiveMsg))  // Missing .with_cue()!
}
```

### ✅ Correct: Providing cue for listener-triggered action
```quint
run test = {
  init
    .then("p1".perform(sendMsg))
    .then("p2".with_cue(onMsg, msg_data).perform(receiveMsg))
}
```

### ❌ Wrong: Using with_cue for timeout (internal event)
```quint
run test = {
  init
    .then("p1".with_cue(on_timeout, ()).perform(handleTimeout))  // Don't use with_cue!
}
```

### ✅ Correct: Using step_with for timeout
```quint
run test = {
  init
    .then("p1".step_with(on_timeout))  // Correct for internal events
}
```

**Rule of thumb**:
- External message/event with data → `.with_cue(listener, data).perform(action)`
- Internal event/timeout (no external data) → `.step_with(listener)`

## Template for Byzantine Scenarios

```quint
// Byzantine leader
run byzantineLeader = {
  init
    .then("byzantine".perform(maliciousPropose))
    .then("honest1".with_cue(onProposal, bad_prop).perform(vote))
    .then("honest2".with_cue(onProposal, bad_prop).perform(vote))
    .expect(/* check safety holds despite bad leader */)
}

// Network partition
run networkPartition = {
  init
    .then("p1".perform(propose))
    .then("p2".with_cue(onProposal, prop).perform(vote))  // Partition 1 sees proposal
    .then("p3".with_cue(onProposal, prop).perform(vote))
    // p4, p5 in other partition don't receive
    .expect(votes.size() < quorum)
}

// Coordinated Byzantine attack
run coordinatedAttack = {
  init
    .then("byz1".perform(maliciousAction1))
    .then("byz2".perform(maliciousAction2))  // Byzantine nodes coordinate
    .then("honest1".with_cue(onEvent, event1).perform(respond))
    .then("honest2".with_cue(onEvent, event2).perform(respond))
    .expect(/* invariant still holds */)
}
```

## Extracting Patterns from Existing Tests

If the spec already has tests, use them as templates:

1. **Find existing run definitions**: `grep "run.*=" spec.qnt`
2. **Identify the pattern**:
   - How are processes named? (`"p1"`, `"node1"`, etc.)
   - Which actions use `.with_cue()`?
   - What are typical listener names? (`onProposal`, `onVote`, etc.)
3. **Follow the established conventions** for consistency

## Quick Reference

```quint
// Basic structure
run testName = {
  init
    .then("process1".perform(action1))
    .then("process2".with_cue(listener, data).perform(action2))
    .expect(condition)
}

// Multi-node pattern
.then("p1".perform(act))
.then("p2".perform(act))
.then("p3".perform(act))

// Message delivery pattern
.then("sender".perform(send))
.then("receiver".with_cue(onMsg, msg).perform(receive))

// Timeout pattern (step_with for internal events)
.then("p1".step_with(on_timeout))
.then("p2".step_with(on_timeout))

// Byzantine pattern
.then("byzantine".perform(maliciousAction))
.then("honest".with_cue(listener, bad_data).perform(handleBadInput))
```
