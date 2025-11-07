---
id: choreo-pattern
name: Choreo Framework Pattern
category: core
when_to_use:
  - Consensus algorithms (Raft, Paxos, PBFT, Tendermint, HotStuff)
  - Byzantine fault tolerant protocols
  - Distributed coordination
  - Message-passing protocols
  - Multi-phase commit protocols
related:
  - state-type-pattern
  - pure-functions
required_builtins:
  - mapBy
  - filter
  - union
  - Set
  - Map
examples:
  - cosmos/tendermint
  - cosmos/ics20
---

# Choreo Framework Pattern

Specialized framework for distributed consensus and Byzantine fault tolerant protocols. Uses Roles + Messages + Stages + Effects architecture.

## Template

```quint
// File 1: algorithm.qnt (Pure consensus logic)
module algorithm {
  type LocalState = {
    currentRound: int,
    votes: Set[Vote],
    decisions: Set[Decision]
  }
  
  type Result = {
    output: Set[ConsensusOutput],
    post: LocalState
  }
  
  pure def processConsensusInput(
    state: LocalState,
    input: Input,
    processId: ID
  ): Result = {
    // Pure consensus logic
  }
}

// File 2: consensus.qnt (Distributed system state)
module consensus {
  import algorithm.* from "./algorithm"
  
  type Environment = {
    processes: ID -> LocalState,
    messageBuffer: Set[Message]
  }
  
  const correctProcesses: Set[ID]
  const byzantineProcesses: Set[ID]
  
  // Distributed actions
}
```

## Key Principles

- Separate pure consensus logic (algorithm.qnt) from distributed state (consensus.qnt)
- Define Roles as process types
- Define Messages for inter-process communication
- Define Stages as message handlers for each role
- Define Effects as state changes from message handling

