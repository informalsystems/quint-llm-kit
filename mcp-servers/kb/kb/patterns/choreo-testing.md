---
id: choreo-testing
name: Choreo Testing Pattern
category: testing
when_to_use:
  - Testing Choreo listener reachability
  - Testing consensus protocols
  - Testing Byzantine fault tolerant systems
  - Testing multi-phase commit protocols
  - Verifying protocol invariants hold during execution
related:
  - choreo-pattern
  - nondeterministic-testing
required_builtins:
  - forall
  - find
  - unwrap
  - setAdd
  - filter
examples:
  - cosmos/tendermint
  - two-phase-commit
---

# Choreo Testing Pattern

Testing pattern for Choreo specs using controlled execution with .with_cue(), .perform(), .step_with(), and message injection

## Template

```quint
module protocolTest {
  import protocol.* from "./protocol"
  import basicSpells.* from "spells/basicSpells"

  // 1. BASIC HAPPY-PATH TEST
  run basicTest = {
    val message1 = { field: value, src: "node1", round: 0 }
    
    init
    .then("node1".with_cue(listener_name, message1).perform(action_name))
    .then("node2".with_cue(listener_name, message1).perform(action_name))
    .expect(s.system.get("node1").stage == ExpectedStage)
  }

  // 2. TIMEOUT AND RECOVERY TEST
  run timeoutTest = {
    init
    .then("node1".step_with(on_timeout_listener))
    .then("node2".step_with(on_timeout_listener))
    .expect(NODES.forall(n => s.system.get(n).round == 1))
  }

  // 3. MESSAGE INJECTION TEST
  run messageInjectionTest = {
    val msg1 = { src: "node1", round: 2, data: value }
    val msg2 = { src: "node2", round: 2, data: value }
    
    init
    .then(
      "node3".step_with_messages(
        (ctx) => listener_name(ctx).filter(condition),
        (msgs) => msgs.setAdd(Message(msg1))
      )
    )
    .then(
      "node3".step_with_messages(
        (ctx) => listener_name(ctx).filter(condition),
        (msgs) => msgs.setAdd(Message(msg2))
      )
    )
    .expect(s.system.get("node3").field == expectedValue)
  }

  // 4. MULTI-STAGE WORKFLOW TEST
  run complexWorkflowTest = {
    val proposal = { proposal: "value", round: 0, src: "node1", justification: Set() }
    
    init
    .then("node1".with_cue(listen_proposal, proposal).perform(broadcast_prevote))
    .then("node2".with_cue(listen_proposal, proposal).perform(broadcast_prevote))
    .then("node3".with_cue(listen_proposal, proposal).perform(broadcast_prevote))
    .then(
      val decision = s.messages.get("node1").get_decisions().find(d => d.round == 0).unwrap()
      "node1".with_cue(listen_decision, decision).perform(on_decision)
        .then("node2".with_cue(listen_decision, decision).perform(on_decision))
        .then("node3".with_cue(listen_decision, decision).perform(on_decision))
        .expect(NODES.forall(n => s.system.get(n).decision == Some("value")))
    )
  }
}
```

## Key Principles

- Use .with_cue(listener, params) to set up listener context
- Use .perform(action) to execute specific listener
- Use .step_with(listener) for timeout/special actions
- Use .step_with_messages(listener_fn, msg_fn) to inject messages
- Extract messages using s.messages.get(node).get_TYPE() helpers
- Use .find() and .unwrap() to get specific messages
- Chain .then() for sequential execution
- Use .expect() to verify state after each step
- Test happy paths, timeouts, and recovery scenarios
- Verify invariants hold throughout execution

## Anti-patterns

### ❌ DON'T: .then("node1", with_cue(listener, params), perform(action))...

```quint
.then("node1", with_cue(listener, params), perform(action))
```

**Why?** Wrong syntax - methods chain on string

### ✅ DO:

```quint
.then("node1".with_cue(listener, params).perform(action))
```

### ❌ DON'T: .then(step_with("node1", listener))...

```quint
.then(step_with("node1", listener))
```

**Why?** Wrong order - node string comes first

### ✅ DO:

```quint
.then("node1".step_with(listener))
```

### ❌ DON'T: val msg = s.messages.get("node1")[0]...

```quint
val msg = s.messages.get("node1")[0]
```

**Why?** Messages are Sets, not arrays

### ✅ DO:

```quint
val msg = s.messages.get("node1").get_messages().find(m => condition).unwrap()
```

