# Consensus Specer

## Essential Patterns for Writing Consensus Specifications

### File Structure
- **Core algorithm**: `algorithm.qnt` - pure functions and local state definitions
- **State machine**: `consensus.qnt` - distributed system state and network actions
- **Tests**: Create `consensusTest.qnt` after reviewing both files

### Core Architecture Pattern for Consensus Algorithms

#### Part 1: Algorithm Module (`algorithm.qnt`)
```quint
// -*- mode: Bluespec; -*-

module algorithm {
  import basicSpells.* from "./basicSpells"

  // 1. BASIC TYPES - Network and process identifiers
  type ProcessID = str
  type Slot = int
  type Hash = int
  
  // 2. DOMAIN-SPECIFIC TYPES - Your consensus objects
  type Block = {
    slot: Slot,
    hash: Hash,
    parent: Hash
  }
  
  type Message = 
    | VoteMsg(MessageData)
    | CommitMsg(MessageData)
    | PrepareMsg(MessageData)
  
  type MessageData = {
    slot: Slot,
    hash: Hash
  }
  
  // 3. LOCAL STATE - What each process maintains
  type LocalState = {
    currentSlot: Slot,
    votes: List[Set[VoteRecord]], // indexed by slot
    decisions: List[Option[Decision]], // indexed by slot
    pending: Set[Block]
  }
  
  type VoteRecord = {
    processId: ProcessID,
    vote: Message
  }
  
  // 4. CONSENSUS INPUTS/OUTPUTS - Interface with environment
  type ConsensusInput =
    | ProposeInput(Block)
    | TimeoutInput(Slot)
    | MessageInput(Message)
  
  type ConsensusOutput =
    | BroadcastOutput(Message)
    | DecisionOutput(Decision)
    | TimeoutOutput(Slot)
  
  type Decision = {
    slot: Slot,
    value: Hash
  }
  
  type Result = {
    output: Set[ConsensusOutput],
    post: LocalState
  }
  
  // 5. CONSTANTS - System parameters
  pure val INITIAL_SLOT = 0
  pure val TIMEOUT_DURATION = 10
  
  // 6. PURE FUNCTIONS - All consensus logic
  
  /// Core voting logic - determines if process should vote
  pure def shouldVote(
    state: LocalState,
    proposal: Block,
    currentSlot: Slot
  ): bool = {
    // Implement voting conditions
    proposal.slot == currentSlot and
    not(state.votes[currentSlot].exists(v => v.processId == "self")) and
    isValidProposal(state, proposal)
  }
  
  /// Validation logic for proposals
  pure def isValidProposal(state: LocalState, proposal: Block): bool = {
    // Check if proposal is valid given current state
    proposal.slot >= state.currentSlot and
    (proposal.slot == 0 or 
     state.decisions[proposal.slot - 1] != None)
  }
  
  /// Core consensus step - processes input and produces output
  pure def processConsensusInput(
    state: LocalState,
    input: ConsensusInput,
    processId: ProcessID
  ): Result = {
    match input {
      | ProposeInput(block) =>
        if (shouldVote(state, block, state.currentSlot)) {
          val voteMsg = VoteMsg({slot: block.slot, hash: block.hash})
          val newVote = {processId: processId, vote: voteMsg}
          val newVotes = state.votes.replaceAt(
            block.slot, 
            state.votes[block.slot].union(Set(newVote))
          )
          
          {
            output: Set(BroadcastOutput(voteMsg)),
            post: {...state, votes: newVotes}
          }
        } else {
          {output: Set(), post: state}
        }
        
      | MessageInput(msg) =>
        // Process incoming message
        processIncomingMessage(state, msg, processId)
        
      | TimeoutInput(slot) =>
        // Handle timeout for slot
        processTimeout(state, slot, processId)
    }
  }
  
  /// Process incoming messages
  pure def processIncomingMessage(
    state: LocalState,
    msg: Message,
    processId: ProcessID
  ): Result = {
    match msg {
      | VoteMsg(data) =>
        // Add vote to local state and check for decision
        val newVote = {processId: processId, vote: msg}
        val newVotes = state.votes.replaceAt(
          data.slot,
          state.votes[data.slot].union(Set(newVote))
        )
        val updatedState = {...state, votes: newVotes}
        
        // Check if we can make a decision
        checkForDecision(updatedState, data.slot)
        
      | CommitMsg(data) =>
        // Handle commit message
        processCommit(state, data, processId)
        
      | PrepareMsg(data) =>
        // Handle prepare message  
        processPrepare(state, data, processId)
    }
  }
  
  /// Check if enough votes collected to make decision
  pure def checkForDecision(
    state: LocalState,
    slot: Slot
  ): Result = {
    val votesForSlot = state.votes[slot]
    val voteThreshold = 3 // 2f + 1 for f = 1
    
    if (votesForSlot.size() >= voteThreshold) {
      // Find majority vote
      val decision = findMajorityDecision(votesForSlot)
      match decision {
        | Some(hash) =>
          val newDecisions = state.decisions.replaceAt(
            slot,
            Some({slot: slot, value: hash})
          )
          {
            output: Set(DecisionOutput({slot: slot, value: hash})),
            post: {...state, decisions: newDecisions}
          }
        | None =>
          {output: Set(), post: state}
      }
    } else {
      {output: Set(), post: state}
    }
  }
  
  /// Helper functions
  pure def findMajorityDecision(votes: Set[VoteRecord]): Option[Hash] = {
    // Implementation depends on specific consensus algorithm
    // This is a placeholder
    None
  }
  
  pure def processTimeout(
    state: LocalState,
    slot: Slot,
    processId: ProcessID
  ): Result = {
    // Handle timeout logic
    {output: Set(), post: state}
  }
  
  pure def processCommit(
    state: LocalState,
    data: MessageData,
    processId: ProcessID
  ): Result = {
    // Handle commit logic
    {output: Set(), post: state}
  }
  
  pure def processPrepare(
    state: LocalState,
    data: MessageData,
    processId: ProcessID
  ): Result = {
    // Handle prepare logic
    {output: Set(), post: state}
  }
}
```

#### Part 2: State Machine Module (`consensus.qnt`)
```quint
// -*- mode: Bluespec; -*-

module consensus {
  import basicSpells.* from "./basicSpells"
  import algorithm.* from "./algorithm"
  export algorithm.*

  // 1. GLOBAL ENVIRONMENT - Distributed system state
  type Environment = {
    // Local state of each process
    processes: ProcessID -> LocalState,
    
    // Network state - message soup
    messageBuffer: Set[NetworkMessage],
    
    // Active timeouts per process
    activeTimeouts: ProcessID -> Set[Slot],
    
    // Global clock/round
    currentRound: int
  }
  
  type NetworkMessage = {
    sender: ProcessID,
    receiver: ProcessID, // or broadcast
    message: Message
  }
  
  // 2. PROCESS SETS - Fault model
  const correctProcesses: Set[ProcessID]
  const byzantineProcesses: Set[ProcessID]
  const faultyProcesses: Set[ProcessID] // benign faults
  
  // 3. SYSTEM PARAMETERS
  const votingPower: ProcessID -> int
  const proposalSet: Set[Block] // possible proposals
  
  // 4. DERIVED VALUES
  pure val allProcesses = correctProcesses.union(byzantineProcesses).union(faultyProcesses)
  pure val honestProcesses = correctProcesses.union(faultyProcesses)
  
  pure def totalVotingPower = allProcesses.voting_power()
  pure def byzantineVotingPower = byzantineProcesses.voting_power()
  
  pure def voting_power(processes: Set[ProcessID]): int =
    processes.fold(0, (acc, p) => acc + votingPower.get(p))
  
  // 5. FAULT TOLERANCE ASSUMPTIONS
  assume faultTolerance = all {
    // Disjoint process sets
    correctProcesses.intersect(byzantineProcesses) == Set(),
    correctProcesses.intersect(faultyProcesses) == Set(),
    byzantineProcesses.intersect(faultyProcesses) == Set(),
    
    // Safety threshold: N > 3f
    totalVotingPower > byzantineVotingPower * 3,
    
    // Liveness threshold if needed: N > 2f
    // totalVotingPower > byzantineVotingPower * 2
  }
  
  // 6. ENVIRONMENT UPDATES - How consensus affects global state
  pure def applyConsensusResult(
    env: Environment,
    processId: ProcessID,
    result: Result
  ): Environment = {
    // Update process local state
    val updatedProcesses = env.processes.set(processId, result.post)
    
    // Process outputs and update environment
    result.output.fold(
      {...env, processes: updatedProcesses},
      (newEnv, output) => match output {
        | BroadcastOutput(msg) =>
          val networkMsg = {
            sender: processId,
            receiver: "broadcast", // or specific receiver
            message: msg
          }
          {...newEnv, messageBuffer: newEnv.messageBuffer.union(Set(networkMsg))}
          
        | TimeoutOutput(slot) =>
          val newTimeouts = newEnv.activeTimeouts.get(processId).union(Set(slot))
          {...newEnv, activeTimeouts: newEnv.activeTimeouts.set(processId, newTimeouts)}
          
        | DecisionOutput(decision) =>
          // Could track global decisions separately
          newEnv
      }
    )
  }
  
  // 7. STATE VARIABLES
  var environment: Environment
  var globalDecisions: Slot -> Set[Hash] // track finalized decisions
  var stepCounter: int
  
  // 8. INVARIANTS - Consensus properties
  
  /// Safety: No two processes decide different values for same slot
  val safety = 
    allProcesses.forall(p1 =>
      allProcesses.forall(p2 =>
        environment.processes.get(p1).decisions.indices().forall(slot =>
          val dec1 = environment.processes.get(p1).decisions[slot]
          val dec2 = environment.processes.get(p2).decisions[slot]
          (dec1 != None and dec2 != None) implies dec1 == dec2
        )
      )
    )
  
  /// Agreement: All honest processes eventually decide the same value
  val agreement =
    proposalSet.forall(proposal =>
      globalDecisions.get(proposal.slot).size() <= 1
    )
  
  /// Validity: If all honest processes propose the same value, that value is decided
  val validity = true // Define based on specific algorithm
  
  /// Termination: Every honest process eventually decides (liveness)
  val termination = true // Define based on specific algorithm and fairness
  
  // 9. WITNESSES - Interesting scenarios to capture
  
  /// Everyone has decided on slot 0
  val everyoneDecidedSlot0 = 
    not(honestProcesses.forall(p => 
      environment.processes.get(p).decisions[0] != None
    ))
  
  /// Someone has decided something
  val someoneDecided = 
    not(honestProcesses.exists(p =>
      environment.processes.get(p).decisions.exists(d => d != None)
    ))
  
  /// All processes have the same decision for slot 0
  val unanimousDecisionSlot0 = 
    val decisions = honestProcesses.map(p => environment.processes.get(p).decisions[0])
    not(decisions.forall(d => d != None) and
        decisions.fold(decisions.head(), (acc, d) => if (acc == d) acc else None) != None)
  
  /// Network has pending messages
  val networkHasMessages = not(environment.messageBuffer.size() > 0)
  
  /// Some process has pending timeouts
  val someTimeoutsPending = 
    not(honestProcesses.exists(p => 
      environment.activeTimeouts.get(p).size() > 0
    ))
  
  // 10. ACTIONS - System behaviors
  
  action unchanged_all = all {
    environment' = environment,
    globalDecisions' = globalDecisions,
    stepCounter' = stepCounter
  }
  
  /// Process receives a proposal
  action receiveProposal(processId: ProcessID, block: Block): bool = {
    val currentState = environment.processes.get(processId)
    val result = processConsensusInput(currentState, ProposeInput(block), processId)
    
    all {
      honestProcesses.contains(processId),
      proposalSet.contains(block),
      environment' = applyConsensusResult(environment, processId, result),
      globalDecisions' = globalDecisions, // update if decision made
      stepCounter' = stepCounter + 1
    }
  }
  
  /// Process receives a message from network
  action receiveMessage(processId: ProcessID): bool = {
    nondet msg = environment.messageBuffer.oneOf()
    val currentState = environment.processes.get(processId)
    val result = processConsensusInput(currentState, MessageInput(msg.message), processId)
    
    all {
      honestProcesses.contains(processId),
      environment.messageBuffer.size() > 0,
      // Remove message from buffer (or mark as delivered)
      environment' = applyConsensusResult(environment, processId, result),
      globalDecisions' = globalDecisions,
      stepCounter' = stepCounter + 1
    }
  }
  
  /// Timeout fires for a process
  action processTimeout(processId: ProcessID, slot: Slot): bool = {
    val currentState = environment.processes.get(processId)
    val result = processConsensusInput(currentState, TimeoutInput(slot), processId)
    
    all {
      honestProcesses.contains(processId),
      environment.activeTimeouts.get(processId).contains(slot),
      // Remove timeout from active set
      val newTimeouts = environment.activeTimeouts.get(processId).exclude(Set(slot))
      val envWithoutTimeout = {
        ...environment,
        activeTimeouts: environment.activeTimeouts.set(processId, newTimeouts)
      }
      environment' = applyConsensusResult(envWithoutTimeout, processId, result),
      globalDecisions' = globalDecisions,
      stepCounter' = stepCounter + 1
    }
  }
  
  // 10. INITIALIZATION
  action init = all {
    environment' = {
      processes: honestProcesses.mapBy(p => {
        currentSlot: INITIAL_SLOT,
        votes: range(0, 5).map(_ => Set()), // pre-allocate slots
        decisions: range(0, 5).map(_ => None),
        pending: Set()
      }),
      messageBuffer: Set(),
      activeTimeouts: honestProcesses.mapBy(p => Set()),
      currentRound: 0
    },
    globalDecisions' = range(0, 5).mapBy(_ => Set()),
    stepCounter' = 0
  }
  
  // 11. STEP ACTION - Non-deterministic system evolution
  action step = all {
    stepCounter < 20, // bound for model checking
    nondet processId = honestProcesses.oneOf()
    any {
      // Propose a new block
      nondet block = proposalSet.oneOf()
      receiveProposal(processId, block),
      
      // Process network message
      receiveMessage(processId),
      
      // Handle timeout
      nondet slot = range(0, 5).oneOf()
      processTimeout(processId, slot),
      
      // Byzantine behavior (if modeling)
      // byzantineAction(processId)
    }
  }
}
```

## How the Consensus Specer Works

When you say **"Use the Consensus Specer to model [algorithm name]"**, I will:

1. **Ask ONE question** about the first aspect I need to know
2. **Wait for your answer**
3. **Build just that section** of code and show it to you
4. **Ask the NEXT question** about the next aspect
5. **Repeat** until we have a complete specification

I will **NEVER** build the whole specification at once. I will build it piece by piece as you answer each question.

### The Step-by-Step Questions I'll Ask

1. **Algorithm Type**: "What consensus algorithm are you implementing? (PBFT, Tendermint, HotStuff, etc.)"

2. **Basic Types**: "What are your basic identifiers? Should ProcessID be str? Slot be int? Hash be int?"

3. **Domain Objects**: "What are your consensus objects? What fields should Block have? What Message types do you need?"

4. **Local State**: "What does each process need to track locally? Votes, decisions, current view/round?"

5. **Input/Output**: "What inputs can processes receive? What outputs do they produce?"

6. **Constants**: "What are your system parameters? Initial values, timeouts, thresholds?"

7. **Algorithm Logic**: "What are the main consensus steps? How do processes decide to vote?" (I'll build one function at a time and ask for feedback before moving to the next)

8. **Message Processing**: "How do processes handle different message types?"

9. **Network Model**: "How many processes? What's your fault model? Voting power distribution?"

10. **Environment Updates**: "How do consensus outputs affect the global state?"

11. **State Variables**: "Should I create the distributed system state variables?"

12. **Properties**: "What safety and liveness properties should hold?"

13. **Actions**: "What process behaviors should we model?"

14. **Initialization**: "What's the initial system configuration?"

15. **Step Evolution**: "How should the system evolve non-deterministically?"

**I will ask these ONE AT A TIME and build the code incrementally as you answer each question.**

### Usage
Simply say: **"Use the Consensus Specer to model [algorithm name]"**

## Key Differences from Smart Contract Builder

### ✅ Consensus-Specific Patterns
- **Distributed state**: `Environment` with multiple `LocalState` instances
- **Network model**: Message soup with sender/receiver information
- **Fault model**: Process sets with Byzantine/correct distinction
- **Threshold logic**: Voting power and quorum calculations
- **Phase-based logic**: Multi-round algorithms with different message types
- **Timeout handling**: Asynchronous timeouts per process
- **Global vs local**: Distinguish local decisions from global agreement
- **Use `put` instead of `set`** when adding new keys to maps that might not exist yet
- **Use `pure val` instead of `const`** for derived values in Quint
- **Add size checks BEFORE `nondet` statements** to prevent `oneOf()` on empty sets
- **Distinguish between process taking step vs message sender** - use `data.participantId` for message sender, `processId` for current process
- **Construct expected messages directly in tests** instead of filtering when you know exactly what should be sent
- **Use `n.reps(_ => step)` syntax** instead of `step.repeat(n)` for repeating actions
- **Add timeout handling** when processes receive protocol messages (participants should set timeouts)
- **Separate non-deterministic choice from deterministic processing** with auxiliary actions
- **Use the Consensus Specer pattern** - build incrementally, ask one question at a time

### ❌ Avoid These Anti-patterns
- Don't use single global state like smart contracts
- Don't ignore network asynchrony and message delivery
- Don't forget Byzantine message generation
- Don't mix algorithm logic with network/environment logic
- Don't use deterministic message delivery unless justified
- Don't forget to model partial synchrony if relevant
- **Don't use multiple parameters in variant constructors** - use `TimeoutInput((height, round))` not `TimeoutInput(height, round)`
- **Don't destructure tuples in pattern matching** - use `| TimeoutInput(height_round) => height_round._1` not `| TimeoutInput((height, round)) =>`
- **Don't use `set()` on non-existing map keys** - will cause runtime errors, use `put()` instead
- **Don't use `head()` on sets** - sets don't have head() method, use `oneOf()` with `nondet`
- **Don't use `oneOf()` without `nondet`** - requires non-deterministic choice
- **Don't put size checks after `nondet` statements** - guards must come before
- **Don't confuse receiver vs sender** in message handling functions
- **Don't use filtering with `nondet` when you know exact messages** - construct them directly
- **Don't forget timeout management** - participants need timeouts for each phase
- **Don't create name clashes** - avoid function names that conflict (like `processTimeout`)
- **Don't build everything at once** - use incremental question-by-question approach

## Example Consensus Patterns

**Message handling clarity**:
```quint
// WRONG - Confusing sender vs receiver
pure def handleYesMsg(
  state: LocalState,
  data: MessageData,
  processId: ProcessID  // This is receiver (coordinator)
): Result = {
  // BUG: Using processId (coordinator) instead of actual sender
  val newResponse = {participantId: processId, response: Yes}  // ❌ WRONG!
  // This records coordinator voting for itself, not participant's vote
}

// CORRECT - Using message data for sender
pure def handleYesMsg(
  state: LocalState,
  data: MessageData,
  processId: ProcessID  // This is receiver (coordinator)
): Result = {
  // CORRECT: Using data.participantId (actual sender from message)
  val newResponse = {participantId: data.participantId, response: Yes}  // ✅ RIGHT!
  // This correctly records who actually sent the vote
}

// Key distinction:
// processId = "coordinator"        // WHO is taking the step (receiver)
// data.participantId = "p1"       // WHO sent the message (sender)
```

**Quorum checking**:
```quint
pure def hasQuorum(votes: Set[VoteRecord], threshold: int): bool =
  votes.map(v => v.processId).voting_power() * 100 >= totalVotingPower * threshold
```

**Byzantine message generation**:
```quint
pure val byzantineMessages = 
  tuples(byzantineProcesses, allPossibleMessages).map(((sender, msg)) =>
    {sender: sender, receiver: "broadcast", message: msg}
  )
```

**Phase transitions**:
```quint
pure def nextPhase(currentPhase: Phase, votes: Set[VoteRecord]): Phase =
  match currentPhase {
    | Prepare => if (hasQuorum(votes, 67)) Commit else Prepare
    | Commit => if (hasQuorum(votes, 67)) Decide else Commit
    | Decide => Decide
  }
```

This builder handles the complexity of distributed systems while maintaining clean separation between algorithm logic (pure functions) and system-level concerns (network, faults, timing), **and builds incrementally as we go through each step.**