---
command: /mine:start
description: Create Quint specification from documentation and code, guided by interactive choices (supports Choreo framework)
version: 2.0.0
---

# Mine Quint Specifications from Documentation

## Objective

Guide users through creating Quint specifications by analyzing documentation files, understanding protocols/algorithms, and offering interactive choices about what to model (data structures, pure functions, or state machines).

## File Operation Constraints

**CRITICAL**: Generated spec files MUST be written within workspace.
- NEVER use `/tmp` or system temp directories
- Default: `specs/<inferred_name>.qnt` or user-provided path
- Create `specs/` directory if it doesn't exist

## Quint Language Constraints

**CRITICAL**: When generating Quint code, you MUST respect language limitations from `.claude/guidelines/quint-constraints.md`:

1. **No String Manipulation**
   - Strings are opaque values for comparison only
   - No concatenation, interpolation, or conversion to string
   - Use sum types to wrap IDs instead: `type Printed = | PrintedInt(int) | PrintedBool(bool)`

2. **No Nested Pattern Matching**
   - Match one level at a time
   - Use sequential `match` statements or intermediate bindings
   - Example: Match outer pattern, bind result, then match inner pattern

3. **No Destructuring**
   - Cannot destructure tuples or records in binding positions
   - Use explicit field access: `.field`, `._1`, `._2`
   - Example: `val x = pair._1` not `val (x, y) = pair`

4. **Additional Constraints**
   - No mutable variables within definitions
   - No loops (use recursion or set operations)
   - No early returns (single expression body)

**These are fundamental language limitations, not style preferences. Violating them causes compilation errors.**

## Input Contract

### Required Parameters
None - command is fully interactive

### Optional Parameters
- `doc_paths`: Specific documentation paths to analyze (default: scan entire repo for .md files)
- `code_paths`: Specific code directories to consult (default: auto-detect from repo structure)
- `output_path`: Path for generated spec file (default: interactive prompt)

## Output Contract

### Success (Choreo Framework)
```
✅ Quint specification created successfully with Choreo!

Specification: specs/consensus.qnt
Module: Consensus
Framework: Choreo (listener-based)

Components Generated:
  • Types: 5 mandatory (Node, Message, StateFields, CustomEffects, Event) + 2 helpers
  • Listeners: 3 (propose, vote, decide)
  • Pure functions: 6 (listeners + actions)
  • Configuration: NODES set, constants

Imports:
  • choreo/spells/basicSpells
  • choreo/choreo (with processes = NODES)

Documentation sources analyzed:
  • docs/consensus-protocol.md
  • docs/architecture.md

Next Steps:
  1. Review the generated specification
  2. Run: quint typecheck specs/consensus.qnt
  3. Refine listener conditions and effects
  4. Add invariants and test scenarios
  5. See Choreo examples: https://github.com/informalsystems/choreo/tree/main/examples

MCP tools used: quint-kb (examples), quint-lsp (validation), Choreo framework
```

### Success (Standard Quint)
```
✅ Quint specification created successfully!

Specification: specs/consensus.qnt
Module: Consensus

Components Generated:
  • Types: 4 (Node, Message, Phase, ConsensusState)
  • State variables: 3 (nodes, messages, currentPhase)
  • Pure functions: 2 (isQuorum, validMessages)
  • Actions: 5 (init, propose, vote, decide, step)

Documentation sources analyzed:
  • docs/consensus-protocol.md
  • docs/architecture.md

Next Steps:
  1. Review the generated specification
  2. Run: quint typecheck specs/consensus.qnt
  3. Add tests or invariants
  4. Iterate on the model
  5. Optional: Run /mine:setup-choreo to enable Choreo framework

MCP tools used: quint-kb (examples), quint-lsp (validation)
```

### Failure
```
❌ Failed to create specification

Error: No documentation files found in repository
Phase: Documentation scanning

Please ensure your repository contains .md documentation files, or specify doc_paths manually.
```

## Execution Procedure

### Phase 1: Documentation Discovery and Analysis

**Objective**: Find and analyze documentation to understand what can be modeled.

**Steps**:

1. **Scan for Documentation Files**
   - If `doc_paths` provided:
     - Use specified paths
     - Validate: Files exist and are readable
   - Else:
     - Glob: `**/*.md` excluding common noise:
       - `**/node_modules/**`
       - `**/.git/**`
       - `**/vendor/**`
       - `**/target/**`
     - Filter: Keep files likely to contain protocol/algorithm docs:
       - Prefer: `docs/`, `doc/`, `documentation/` directories
       - Include: `README.md`, `ARCHITECTURE.md`, `PROTOCOL.md`
       - Exclude: `CHANGELOG.md`, `LICENSE.md`, `CONTRIBUTING.md`
   - Check: At least 1 documentation file found
   - If none found: Return error "No documentation files found"

2. **Read and Analyze Documentation**
   - Per documentation file:
     - Read: Full contents
     - Extract sections using headers (# ## ###)
     - Identify content type:
       - **Protocol descriptions**: Look for keywords like "protocol", "algorithm", "consensus", "state machine", "steps", "phases"
       - **Data structures**: Look for type definitions, schemas, object structures
       - **API documentation**: Look for endpoints, requests, responses
       - **Architecture**: Look for components, interactions, flows
   - Store: File path, title, sections, content type, key excerpts

3. **Identify Modelable Concepts**
   - Analyze documentation to extract:

     **State Machine Candidates** (high-level protocols):
     - Pattern: Sequential steps/phases (e.g., "propose → vote → decide")
     - Pattern: State transitions (e.g., "when X happens, move to state Y")
     - Pattern: Protocol rounds/iterations
     - Pattern: Actor interactions (e.g., "nodes exchange messages")
     - Examples: "Consensus protocol", "Transaction lifecycle", "Session management"

     **Data Structure Candidates**:
     - Pattern: Type definitions or schemas in docs
     - Pattern: "data structure", "format", "schema", "type"
     - Pattern: JSON/YAML examples in docs
     - Examples: "Message format", "Node structure", "Transaction type"

     **Pure Function Candidates**:
     - Pattern: Computations or validations described
     - Pattern: "calculate", "validate", "check", "compute"
     - Pattern: Mathematical formulas or conditions
     - Examples: "Quorum check", "Signature verification", "Validity condition"

   - Store: Categorized list of modelable concepts with descriptions

4. **Consult Code for Context (Optional)**
   - If `code_paths` provided or code structure detected:
     - Identify primary implementation files:
       - Glob common patterns: `**/*.rs`, `**/*.go`, `**/*.ts`, `**/*.py`
       - Limit: Top 10 most relevant files (by name match with doc concepts)
     - Per relevant file:
       - Read: Extract type definitions, struct/class names, function signatures
       - Stay at HIGH abstraction level:
         - Extract: Interface definitions, type aliases, key data structures
         - Skip: Implementation details, internal logic
       - Purpose: Understand concrete types to inform spec types
   - Store: Type names, basic structure (optional context for modeling)

5. **Enrich with Quint Knowledge Base**
   - Query: `mcp__quint-kb__hybrid_search` with extracted protocol concepts
     - Example queries:
       - If "consensus" detected: Search "consensus state machine"
       - If "Byzantine" detected: Search "Byzantine fault tolerance"
       - If "timeout" detected: Search "timeout handling"
   - Parse results:
     - Identify: Relevant examples in knowledge base
     - Extract: Pattern IDs, example module names
   - Store: Related Quint examples and patterns for user reference

### Phase 2: Interactive User Choice

**Objective**: Present options and get user decisions on what to model.

**Steps**:

6. **Present Discovered Concepts**
   - Display summary:
     ```
     📋 Documentation Analysis Complete

     Found documentation files: 3
       • docs/consensus-protocol.md
       • docs/architecture.md
       • README.md

     Identified modelable concepts:

     🔄 State Machines (3):
       1. Consensus Protocol - Multi-round voting protocol with propose/vote/decide phases
       2. Transaction Lifecycle - Transaction states from pending → validated → committed
       3. Node Membership - Join/leave protocol for distributed system

     📦 Data Structures (2):
       1. Message Format - Network message types (Propose, Vote, Decide)
       2. Node State - Node configuration and runtime state

     🔧 Pure Functions (2):
       1. Quorum Check - Validate if set of nodes forms a quorum
       2. Signature Verification - Verify message signatures
     ```

7. **Ask User What to Model**
   - Use: `AskUserQuestion` tool
   - Question 1: "What would you like to model first?"
     - Options:
       - "Data structures" - "Start by defining types and data structures"
       - "Pure functions" - "Start by modeling pure functions with tests"
       - "State machine" - "Start by modeling a protocol state machine"
       - "Everything" - "Create a comprehensive model with all components"
   - Store: User's primary choice

8. **If State Machine Chosen, Ask Which One**
   - If state machine candidates > 1:
     - Use: `AskUserQuestion` tool
     - Question 2: "Which state machine would you like to model?"
       - Options: Dynamically generated from state machine candidates
       - Each option: Name + brief description from docs
   - Store: Selected state machine

9. **Ask About Scope and Detail Level**
   - Use: `AskUserQuestion` tool
   - Question 3: "What level of detail?"
     - Options:
       - "Skeleton" - "Basic types and action signatures only"
       - "Standard" - "Complete types, state, actions, and init"
       - "Comprehensive" - "Include invariants, pure functions, and test scenarios"
   - Store: Detail level

### Phase 2.5: Choreo Framework Detection

**Objective**: Detect if Choreo framework is available and should be used.

**Steps**:

9.5. **Check for Choreo Installation**
     - Check: File exists at `specs/choreo/choreo.qnt`
     - Also check: `specs/choreo/spells/basicSpells.qnt` exists
     - If both exist:
       - Set: `use_choreo = true`
       - Parse choreo.qnt to verify it's valid
       - Display: "✓ Choreo framework detected, will use Choreo patterns"
     - If not found:
       - Set: `use_choreo = false`
       - Display: "Using standard Quint (run /mine:setup-choreo to enable Choreo framework)"
     - Store: `use_choreo` flag for generation phase

9.6. **Inform User About Framework Choice**
     - If `use_choreo = true` and modeling state machine:
       - Display: "Your spec will use Choreo's listener-based architecture for distributed protocols"
       - Explain: "Choreo provides message handling, effects, and structured transitions"
     - If `use_choreo = false`:
       - Display: "Your spec will use standard Quint actions and state variables"

### Phase 3: Quint Knowledge Base Consultation

**Objective**: Retrieve relevant Quint examples and patterns.

**Steps**:

10. **Fetch Relevant Examples**
    - Based on user's choice, query MCP quint-kb:
      - If modeling consensus: `mcp__quint-kb__get_example("consensus")`
      - If modeling state machine: `mcp__quint-kb__hybrid_search("state machine actions")`
      - If modeling data structures: `mcp__quint-kb__get_doc("type-system")`
    - Extract: Code patterns, naming conventions, structure
    - Store: Example code snippets to guide generation

11. **Fetch Applicable Patterns**
    - Query patterns based on modeling choice:
      - For state machines without Choreo: `mcp__quint-kb__get_pattern("thin-actions")`
      - For pure functions: `mcp__quint-kb__get_doc("pure-functions")`
    - Store: Pattern guidelines for generation phase

11.5. **Fetch Choreo Resources (if use_choreo = true)**
     - Read: `specs/choreo/template.qnt` to understand structure
     - Extract from template:
       - Required type definitions (Node, Message, StateFields, CustomEffects, Event)
       - Listener pattern (choreo::cue usage)
       - Effect types (Broadcast, Send, TriggerEvent)
       - Transition structure (post_state and effects)
     - Query KB: Search "choreo listener" or "choreo effects" if available
     - Store: Choreo patterns and structure for generation

### Phase 4: Specification Generation

**Objective**: Generate Quint specification file.

**Steps**:

12. **Design Module Structure**
    - Determine module name:
      - If state machine selected: Use state machine name (e.g., "Consensus")
      - If data structures: Use domain name (e.g., "Types")
      - Ask user: Confirm or customize module name
    - Design imports:
      - **If use_choreo = true**:
        - Add: `import basicSpells.* from "choreo/spells/basicSpells"`
        - Determine node set name (e.g., NODES)
        - Add: `import choreo(processes = NODES) as choreo from "choreo/choreo"`
        - Add any additional spells if needed
      - **If use_choreo = false**:
        - Check if examples use Spells module: Add `import Spells.*` if useful
        - Check if builtin types needed: Plan which to import

13. **Generate Types**
    - **If use_choreo = true**:
      - Generate the 5 mandatory Choreo type definitions:
        1. **Node**: Process identifier type (usually `type Node = str`)
        2. **Message**: Union of all message types from docs
           - Extract message types from protocol description
           - Example: `type Message = Propose({from: Node, value: int}) | Vote({from: Node, value: int})`
        3. **StateFields**: Record of local state variables per process
           - Extract state from docs: phase, round, votes, etc.
           - Example: `type StateFields = { phase: Phase, round: int, votes: Set[Node] }`
        4. **CustomEffects**: Custom side effects (use `type CustomEffects = unit` if none)
        5. **Event**: External events like timeouts (use `type Event = unit` if none)
      - Add any additional helper types (Phase enums, Value types, etc.)
      - Add boilerplate type aliases:
        - `type LocalContext = choreo::LocalContext[Node, StateFields, Message, Event]`
        - `type Transition = choreo::Transition[Node, StateFields, Message, CustomEffects, Event]`
    - **If use_choreo = false**:
      - Extract type definitions from docs:
        - If docs mention "node", "replica", "validator": Create `Node` type
        - If docs mention "message", "packet": Create `Message` type
        - If docs mention "phase", "round", "view": Create enums for phases
      - Follow Quint type syntax:
        - Sum types: `type Message = Propose({...}) | Vote({...}) | Decide({...})`
        - Records: `type Node = { id: str, ... }`
        - Type aliases: `type NodeId = str`
      - Reference: KB examples for syntax patterns

14. **Generate State Variables**
    - **If use_choreo = true**:
      - No global state variables needed (Choreo manages this)
      - State is encapsulated in StateFields per process
      - Skip this step for Choreo specs
    - **If use_choreo = false**:
      - If modeling state machine:
        - Identify state components from docs:
          - "Nodes in the system" → `var nodes: Set[Node]`
          - "Messages sent" → `var messages: Set[Message]`
          - "Current phase" → `var currentPhase: Phase`
        - Follow state variable conventions from KB patterns
      - If skeleton mode: Generate with placeholder initialization

15. **Generate Pure Functions**
    - If user chose pure functions or comprehensive detail:
      - Per pure function candidate:
        - Extract signature from doc description:
          - "quorum is 2f+1" → `pure def isQuorum(votes: Set[Node]): bool`
          - "valid message has signature" → `pure def isValid(msg: Message): bool`
        - Generate skeleton implementation or placeholder
        - Add inline comments referencing doc sections
    - Reference: KB pure function examples

16. **Generate Actions or Listeners**
    - **If use_choreo = true and modeling state machine**:
      - Extract protocol transitions from docs
      - Per transition, generate Choreo listener pattern:
        1. **Listener function** (checks conditions, extracts params):
           ```quint
           pure def proposeListener(ctx: LocalContext): Set[Value] =
             if (ctx.state.phase == ProposalPhase and ...) {
               // Return set of possible values to propose
               Set(...)
             } else Set()
           ```
        2. **Action function** (performs transition):
           ```quint
           pure def proposeAction(ctx: LocalContext, value: Value): Transition =
             val effects = choreo::Broadcast(Propose({ from: ctx.state.process_id, value: value }))
             {
               post_state: { ...ctx.state, phase: VotingPhase, proposed: value },
               effects: effects
             }
           ```
        3. **Combine with choreo::cue**:
           ```quint
           val proposeTransition = choreo::cue(proposeListener, proposeAction)
           ```
      - Create main listener combining all transitions:
        ```quint
        val listeners = List(proposeTransition, voteTransition, decideTransition)
        ```
      - Generate custom effect processor if CustomEffects != unit:
        ```quint
        pure def processCustomEffects(e: CustomEffects): bool = true  // TODO
        ```
    - **If use_choreo = false and modeling state machine**:
      - Extract actions from protocol steps in docs:
        - "Propose a value" → `action propose(n: Node, v: Value)`
        - "Vote for proposal" → `action vote(n: Node, proposal: Value)`
        - "Decide on value" → `action decide(n: Node, v: Value)`
      - Follow thin-actions pattern if KB suggests:
        - Action: Update state
        - Pure def: Contain logic
      - Add `step` action if multiple actions defined:
        - `action step = any { propose(...), vote(...), decide(...) }`
      - If skeleton mode: Actions with `all { ... }` placeholders
      - If comprehensive: Include preconditions and postconditions

17. **Generate Init Action and Configuration**
    - **If use_choreo = true**:
      - Define node set:
        ```quint
        pure val NODES: Set[Node] = Set("n1", "n2", "n3", "n4")  // Example
        ```
      - Define protocol constants from docs (if any):
        ```quint
        pure val QUORUM_SIZE = 3
        ```
      - Generate init action using Choreo:
        ```quint
        action init = {
          val initial_state = { phase: InitialPhase, round: 0, votes: Set() }
          choreo::Init(NODES, initial_state)
        }
        ```
      - Generate step action:
        ```quint
        action step = choreo::Step(listeners, processCustomEffects)
        ```
    - **If use_choreo = false**:
      - Create initialization:
        - Set initial state values based on docs:
          - `nodes' = Set()` or initial set
          - `messages' = Set()`
          - `currentPhase' = InitialPhase`
        - Follow init pattern from KB examples

18. **Generate Invariants (if comprehensive)**
    - If detail level == comprehensive:
      - Identify safety properties from docs:
        - "No two nodes decide different values" → `val agreement`
        - "Decided value was proposed" → `val validity`
      - Generate invariant templates:
        ```quint
        val agreement =
          // TODO: formalize agreement property
          true
        ```
      - Add TODO comments for user to complete

19. **Generate Tests (if comprehensive)**
    - If detail level == comprehensive and user chose pure functions:
      - Per pure function:
        - Generate `run` tests:
          ```quint
          run isQuorumTest = all {
            assert(isQuorum(Set("n1", "n2", "n3"))),
            assert(not(isQuorum(Set("n1"))))
          }
          ```
    - If state machine:
      - Generate scenario runs:
        ```quint
        run canReachDecisionTest = init.then(propose(...)).then(vote(...)).then(decide(...))
        ```

20. **Add Documentation Comments**
    - Per generated item:
      - Add module-level comment with overview
      - Reference source documentation:
        ```quint
        // Consensus Protocol
        // Based on: docs/consensus-protocol.md
        //
        // This module models the consensus protocol described in the documentation,
        // including the propose-vote-decide phases.
        module Consensus {
          ...
        }
        ```
      - Add inline comments for complex types/actions
      - Include TODO markers for user completion

### Phase 5: Validation and Output

**Objective**: Validate generated spec and provide guidance.

**Steps**:

21. **Determine Output Path**
    - If `output_path` provided: Use it
    - Else: Construct default:
      - Format: `specs/<module_name_lowercase>.qnt`
      - Check: `specs/` directory exists
      - If not: Create `specs/` directory
    - Confirm: No file exists at path (or ask to overwrite)

22. **Write Specification File**
    - Write: Generated Quint code to output_path
    - Format: Proper indentation (2 spaces)
    - Check: File written successfully

23. **Validate with LSP**
    - Call: `mcp__quint-lsp__diagnostics` with filePath = output_path
    - Parse diagnostics:
      - Errors: Syntax errors, type errors
      - Warnings: Unused vars, style issues
    - If critical errors found:
      - Attempt auto-fix for common issues:
        - Missing imports
        - Syntax formatting
      - Re-write file if fixes applied
      - Re-run diagnostics
    - Store: Final diagnostic status

24. **Generate Guidance for User**
    - Create next steps based on what was generated:
      - If skeleton: "Complete the action implementations with logic"
      - If state machine: "Add invariants to verify safety properties"
      - If comprehensive: "Run tests with: quint test <spec_path>"
    - Include relevant Quint commands:
      - `quint typecheck <spec_path>`
      - `quint test <spec_path>`
      - `quint run <spec_path> --main=<module> --max-steps=20`
    - Reference: KB examples for learning

25. **Display Success Summary**
    - Show output message (see Output Contract > Success)
    - Include:
      - Spec file path
      - Module name
      - Components generated (count by category)
      - Documentation sources analyzed
      - Next steps with commands
      - MCP tools used

## Tools Used

- `Glob`: Find documentation and code files
- `Read`: Read documentation and code files
- `Write`: Write generated Quint specification
- `Grep`: Search for patterns in docs/code (optional)
- `AskUserQuestion`: Interactive choices about what to model
- `Bash`: Create directories if needed (`mkdir -p specs`)
- MCP `quint-kb` (critical):
  - `mcp__quint-kb__hybrid_search` - Find relevant examples
  - `mcp__quint-kb__get_example` - Fetch specific examples
  - `mcp__quint-kb__get_doc` - Get documentation on Quint features
  - `mcp__quint-kb__get_pattern` - Fetch design patterns
- MCP `quint-lsp` (critical):
  - `mcp__quint-lsp__diagnostics` - Validate generated spec
  - `mcp__quint-lsp__hover` - Get type info (if analyzing existing specs)

## Knowledge Base Queries

### Common Query Patterns

**Protocol Types**:
- Consensus: Search "consensus", "Byzantine", "quorum"
- Distributed systems: Search "replicated state machine"
- Transactions: Search "transaction", "commit"

**Modeling Approaches**:
- State machines: Get pattern "thin-actions"
- Pure functions: Get doc "pure-functions"
- Data types: Get doc "type-system", "sum-types"

**Examples**:
- Consensus examples: `get_example("consensus")`
- ERC20: `get_example("erc20")`
- Simple protocols: Search "state machine example"

### Search Strategy

1. Start broad: Hybrid search with key terms from docs
2. Narrow down: Fetch specific examples if good matches found
3. Get patterns: Retrieve applicable design patterns
4. Validate: Use LSP to ensure syntax is correct

## Error Handling

### No Documentation Found
- **Condition**: No .md files found in repository
- **Action**: Return error with guidance to specify `doc_paths`
- **Recovery**: User provides explicit paths or creates documentation

### Empty Documentation
- **Condition**: Documentation files found but contain no useful content
- **Action**: Return error "Documentation files found but no modelable concepts detected"
- **Recovery**: User specifies what to model manually

### MCP KB Unavailable
- **Condition**: Quint KB MCP server not accessible
- **Action**: Continue without KB examples, use generic Quint templates
- **Recovery**: Generate spec without example enrichment, warn user

### MCP LSP Unavailable
- **Condition**: Quint LSP MCP server not accessible
- **Action**: Skip validation step, warn user to validate manually
- **Recovery**: Write spec without LSP validation, include command to run manually

### Generated Spec Has Errors
- **Condition**: LSP diagnostics show critical errors after generation
- **Action**: Attempt auto-fixes (add imports, fix syntax), else warn user
- **Recovery**: Save spec anyway, provide error details and suggested fixes

### Ambiguous Modeling Scope
- **Condition**: Cannot determine clear boundaries for what to model
- **Action**: Use `AskUserQuestion` to get clarification
- **Recovery**: User provides specific scope or accepts suggestion

## Example Execution

**Input**:
```
/play:open:spec-from-docs
```

**Process**:

1. Scan repository, find:
   - `docs/consensus-protocol.md` - Describes 3-phase consensus
   - `README.md` - Overview mentioning "Byzantine consensus"

2. Analyze docs, identify:
   - State machine: "Consensus Protocol" (propose → vote → decide)
   - Data structures: Message types, Node structure
   - Pure functions: Quorum check

3. Present to user:
   ```
   📋 Documentation Analysis Complete

   Identified modelable concepts:

   🔄 State Machines (1):
     1. Consensus Protocol - Three-phase Byzantine consensus

   📦 Data Structures (2):
     1. Message types
     2. Node structure
   ```

4. Ask user: "What would you like to model first?"
   - User selects: "State machine"

5. Ask user: "What level of detail?"
   - User selects: "Standard"

6. Query KB:
   - Search: "consensus Byzantine"
   - Fetch: consensus example, thin-actions pattern

7. Generate spec:
   ```quint
   // Consensus Protocol
   // Based on: docs/consensus-protocol.md
   module Consensus {
     type Node = str
     type Value = str
     type Message =
       | Propose({sender: Node, value: Value})
       | Vote({sender: Node, value: Value})
       | Decide({sender: Node, value: Value})

     var nodes: Set[Node]
     var messages: Set[Message]
     var decisions: Node -> Value

     action init = all {
       nodes' = Set(),
       messages' = Set(),
       decisions' = Map()
     }

     action propose(n: Node, v: Value): bool = all {
       nodes.contains(n),
       messages' = messages.union(Set(Propose({sender: n, value: v}))),
       nodes' = nodes,
       decisions' = decisions
     }

     // ... vote, decide actions ...

     action step = any {
       nondet n = oneOf(nodes)
       nondet v = oneOf(values)
       any {
         propose(n, v),
         vote(n, v),
         decide(n, v)
       }
     }
   }
   ```

8. Validate with LSP:
   - Run diagnostics
   - Result: No critical errors

9. Display success:
   ```
   ✅ Quint specification created successfully!

   Specification: specs/consensus.qnt
   Module: Consensus

   Components Generated:
     • Types: 3 (Node, Value, Message)
     • State variables: 3 (nodes, messages, decisions)
     • Actions: 4 (init, propose, vote, decide, step)

   Next Steps:
     1. Review the generated specification
     2. Run: quint typecheck specs/consensus.qnt
     3. Add invariants for safety properties
   ```

## Quality Standards

**Checklist**:
- [ ] At least 1 documentation file analyzed
- [ ] User presented with clear choices
- [ ] Generated spec includes module comment with source references
- [ ] All generated code is syntactically valid Quint (or flagged as TODO)
- [ ] LSP validation performed (or skipped with warning)
- [ ] Output includes next steps and relevant commands
- [ ] KB examples consulted if available
- [ ] Success message shows what was generated

## Notes

- This command is **exploratory and creative** - it helps bootstrap Quint modeling
- The generated spec is a **starting point**, not a complete formal model
- User refinement is expected and encouraged
- The command should be **educational**, showing Quint patterns from KB
- Multiple iterations are fine - user can run command again to model different aspects
- **Documentation quality impacts result** - better docs → better generated specs
