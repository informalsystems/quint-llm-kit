---
command: /plan-migration
description: Create an implementation plan to migrate codebase from one Quint specification to another, with architectural decisions and task breakdown
version: 2.0.0
---

# Plan Specification Migration

## Objective

Analyze Quint specifications and codebase to create a detailed implementation plan with architectural decisions and task breakdown. This command handles ONLY planning - implementation is done by separate agents.

## File Operation Constraints

**CRITICAL**: Workspace organization:
- **Decisions**: `DECISIONS.md` in workspace root
- **Tasks**: `SPEC_MIGRATION_TASKS.md` in workspace root
- **NEVER use `/tmp` or system temp directories**

## Input Contract

### Required Parameters
- `original_spec`: Path to Quint spec matching current codebase behavior
- `target_spec`: Path to Quint spec defining desired behavior
- `codebase_root`: Root directory of implementation

### Optional Parameters
- `protocol_description`: Path to document with implementation guidance
- `implementation_agent`: Name of agent for implementation tasks (default: "spec-implementer")
- `mbt_agent`: Name of agent for MBT validation tasks (default: "mbt-validator")

## Core Principles

- **Spec is Source of Truth**: The Quint spec defines WHAT to implement. Protocol description provides HOW to implement.
- **User Interaction**: ALWAYS use `AskUserQuestion` tool for all user questions - never prompt in prose.
- **Decisions Approval**: User must approve DECISIONS.md before proceeding to task planning.
- **Planning Only**: This command creates the plan but does NOT implement anything.
- **Approval Gates**: Get explicit user approval at critical points.
- **MBT Integration**:
  - Plan must interleave implementation and MBT validation parts.
  - MBT must be implemented as early as possible to validate correctness of the implementation.

## Final CLI Output
  ╔══════════════════════════════════════════════════════╗
  ║  Migration Plan for Protocol Generated               ║
  ╚══════════════════════════════════════════════════════╝
   - DECISIONS.md created at: [path]
   - SPEC_MIGRATION_TASKS.md created at: [path]
   - Decisions Overview:
     - Decision 1: [brief description]
     - Decision 2: [brief description]
     - ...
   - Task Plan Overview:
     - Total Parts: [number]
     - Implementation Parts: [number]
     - MBT Validation Parts: [number]


## Planning Methodology

### Phase 1: Specification Analysis and Mapping

When you begin work, you will:

1. **Analyze the Original Specification**: Thoroughly examine the original Quint specification that matches the current codebase behavior. Understand every state variable, invariant, transition, and temporal property.

2. **Study the Protocol Description** (if provided): The user may provide a protocol/algorithm description document that:
   - Explains the high-level protocol design and goals
   - Provides context on why changes were made
   - **CRITICAL**: Contains concrete implementation guidance that explains how abstract spec concepts should be realized in code
   - May specify implementation details not captured in the formal spec
   - May clarify ambiguities or provide optimization strategies

   **CRITICAL REQUIREMENTS FOR PROTOCOL DESCRIPTION ANALYSIS**:

   a) **The Quint spec is ALWAYS the source of truth for behavior**:
      - If you find ANY divergence between protocol description and Quint spec, STOP immediately
      - Document the divergence clearly
      - Use `AskUserQuestion` tool for clarification before proceeding
      - Never override or modify spec behavior based on the description

   b) **Actively search for implementation-specific guidance**:
      - Search the ENTIRE document for keywords: "implementation", "code", "architecture", "data structure", "optimization", "concrete", "practical", "performance"
      - Look for sections specifically about implementation (e.g., "Implementation Notes", "Architecture", "Data Structures")
      - Identify phrases like "in practice", "in code", "should be implemented as", "for efficiency"
      - Extract ALL data structure choices (HashMap vs Set, Vec vs BTreeSet, etc.)
      - Extract ALL performance optimizations (short-circuiting, caching, indexing)
      - Extract ALL architectural guidance (module boundaries, API design)
      - Extract ALL things that should NOT be implemented (model-checking artifacts, proof helpers, byzantine behavior generators)

   c) **Examples of critical implementation details to find**:
      - Data structure specifications: "use HashMap<NodeId, Message> instead of Set[Message]"
      - Ordering requirements: "maintain insertion order" or "sort by round then sender"
      - Performance shortcuts: "can stop after finding quorum" or "cache this computation"
      - Memory management: "store only last N messages" or "garbage collect old rounds"
      - API boundaries: "this should be a separate module" or "expose as public interface"
      - Serialization: "use protobuf format" or "JSON for debugging"
      - Concurrency: "this can be computed in parallel" or "requires lock"
      - What NOT to implement: "byzantine message generation is for model checking only"

   d) **Documentation in tasks**:
      - Every implementation note MUST include a reference to the source document and line numbers
      - Format: "**Protocol Description (lines X-Y)**: [specific guidance]"
      - If guidance conflicts with spec, document it and mark as "DIVERGENCE - NEEDS CLARIFICATION"

   These implementation notes are authoritative for HOW to implement, but the spec defines WHAT to implement.

3. **Inspect the Current Implementation**: Study the existing codebase to understand how abstract specification concepts map to concrete code structures. Document these mappings explicitly:
   - State variables → data structures, class fields, database schemas
   - Transitions → functions, methods, API endpoints, event handlers
   - Preconditions → validation logic, guards, authorization checks
   - Postconditions → assertions, state updates, side effects
   - Invariants → consistency checks, validation rules

4. **Compare Specifications**: Use `delta` or appropriate diff tools to identify all differences between the original and target specifications. Categorize changes as:
   - New transitions (new behavior to implement)
   - Modified transitions (existing behavior to update)
   - Removed transitions (behavior to deprecate/remove)
   - State variable changes (data structure modifications)
   - Invariant changes (new consistency requirements)

5. **Identify Architectural Decisions and Ask User Interactively**: For each listener/handler transition, systematically determine if user input is needed.

   **DECISION-MAKING ALGORITHM** (for each listener/handler):

   ```
   For each listener/handler in main_listener:
     1. Read the Quint spec section about it and analyze the diff with the original spec
        - What changed? New fields? Different logic? Removed concepts?
        - What are the preconditions, postconditions, state changes?

     2. Read the documentation file and look for anything related to it
        - Focus ESPECIALLY on anything that hints on how it maps to implementation/code
        - Look for data structure guidance, architectural notes, performance hints
        - Look for "should be implemented as", "in practice", "architecture" mentions

     3. Look at the existing code and come up with a few options on how to implement it
        - Identify 2-5 plausible implementation approaches
        - Consider: where it lives, what structures it needs, how it integrates

     4. If the best option is OBVIOUS or CLEARLY STATED in the documentation:
          Choose this option and define the sub-tasks for it directly
          Document your reasoning in task description
        Else:
          Present the options to the user via AskUserQuestion
          Add to DECISIONS.md file
          Mark affected tasks as "Pending Decision N"
   ```

   **CRITICAL**: Do NOT ask the user questions that you can answer by:
   - Examining the protocol description/documentation thoroughly
   - Analyzing the Quint specification carefully
   - Reading and understanding the existing implementation patterns

   Only ask when genuinely ambiguous after exhausting these sources.

   **ASK USER FOR CLARIFICATION** when:
   - A new data structure is needed but multiple reasonable implementations exist (e.g., HashMap vs BTreeMap, Vec vs LinkedList)
   - The spec has an abstract concept but the codebase structure is unclear (e.g., where should a new state field live - in State, in an existing manager, or in a new struct?)
   - Protocol description mentions a module/component that doesn't obviously map to existing code
   - A spec transition requires creating a new subsystem or significant architectural change
   - Implementation guidance conflicts with apparent codebase conventions
   - You find yourself guessing between 2+ plausible approaches

   **DO NOT ASK** for:
   - Obvious mappings (spec collections → existing collection types in codebase)
   - Standard patterns already in codebase (if codebase has a similar pattern, follow it)
   - Simple type additions (adding a field to an existing struct that already has similar fields)
   - Clear one-to-one mappings from spec to existing code patterns
   - Questions answered by careful code reading

   **FORMAT** for DECISIONS.md file:
   ```markdown
   # Architectural Decisions for [Protocol] Migration

   **Date**: [timestamp]
   **Specs**: [original spec] → [target spec]
   **Status**: [Pending User Input / Decisions Made / Implementation Complete]

   ---

   ## Decision 1: [Brief title]

   **Context**: [Why this is ambiguous]
   **Spec Reference**: [Lines in spec]
   **Current Code**: [What exists now]

   **Options**:
   - **A)** [Approach 1] - [Trade-offs]
   - **B)** [Approach 2] - [Trade-offs]
   - **C)** [Approach 3] - [Trade-offs]

   **Agent Recommendation**: [Your analysis]

   **User Decision**: [To be filled]
   **Rationale**: [User's reasoning]

   **Affects Tasks**: [List of task numbers that depend on this]

   ---

   ## Decision 2: [Next decision...]
   ...
   ```

   **WORKFLOW**:
   1. **First run** (Initial Analysis):
      - For each listener/handler, follow the 4-step algorithm above
      - Create DECISIONS.md ONLY for genuinely ambiguous decisions
      - For clear mappings, directly create detailed tasks with reasoning
      - Create SPEC_MIGRATION_TASKS.md with:
        * Complete tasks for clear mappings (most should be clear!)
        * Placeholder tasks marked "Pending Decision N" for ambiguous cases

   2. **User Review**:
      - User reviews DECISIONS.md
      - User provides answers (edits DECISIONS.md or responds in chat)
      - User may also review and approve the clear mappings you made

   3. **Second run** (if decisions were needed):
      - Read user's decisions from DECISIONS.md
      - Generate full detailed tasks for previously pending items
      - Update SPEC_MIGRATION_TASKS.md with complete task breakdown

   4. **Implementation proceeds** with all decisions documented

   **GOAL**: Minimize user questions by doing thorough analysis. Most transitions should have clear implementations derivable from spec + docs + code patterns. Only ask about genuinely ambiguous architectural choices.

6. **Create Implementation Plan**: Generate a comprehensive TODO list in markdown format (named `SPEC_MIGRATION_TASKS.md`) that interleaves implementation parts with MBT validation parts.

   **CRITICAL UNDERSTANDING**: The plan is NOT "all implementation parts, then all MBT parts". Instead, it's an INTERLEAVED sequence where MBT parts appear IMMEDIATELY after the transitions they validate. Example: Impl Part 1 → Impl Part 2 → **MBT Part 3 validates 1-2** → Impl Part 4 → Impl Part 5 → **MBT Part 6 validates 4-5** → etc.

   **CRITICAL - Planning Workflow**:

   **Step 1**: Extract all listener/handler pairs from `main_listener` (or equivalent aggregation function) in the target spec. These become implementation parts in the order they appear in the spec.

   **Step 2**: Analyze ALL Quint test functions (usually prefixed with `run`) in the target spec. For each test:
   - Identify which transitions (listener/handler pairs) it exercises
   - Determine the last implementation part it depends on
   - Plan to insert an MBT validation part IMMEDIATELY after that implementation part

   **Step 3**: Create a merged sequence where:
   - Implementation parts follow the `main_listener` order
   - MBT validation parts are inserted IMMEDIATELY after their dependencies
   - Example: If `runBasicTest` exercises transitions from Parts 1-2, the sequence is:
     * Part 1: [implementation for first transition]
     * Part 2: [implementation for second transition]
     * Part 3: MBT Validation for `runBasicTest` ← IMMEDIATE insertion
     * Part 4: [implementation for third transition]
     * ...

   **Step 4**: Use AskUserQuestion to confirm with the user that this interleaved plan makes sense before finalizing. User can ask to adjust MBT placement if needed.

   **Step 5**: Generate SPEC_MIGRATION_TASKS.md with this merged, interleaved sequence. SPEC_MIGRATION_TASKS.md can only be generated AFTER DECISIONS.md is finalized and after all pending decisions are resolved by the user.

   The format should be:

   ```markdown
   # [Protocol Name] Migration Tasks

   **Generated**: [Date]
   **Based on**: [spec files]
   **Source**: `main_listener` function in target spec (lines X-Y)
   **Total Parts**: [number of implementation parts + MBT validation parts]
   **Implementation Parts**: [number from main_listener]
   **MBT Validation Parts**: [number of Quint test functions]

   **Agents**:
   - Implementation: @{implementation_agent}
   - MBT Validation: @{mbt_agent}

   **Divergences Found**: [List any divergences between spec and protocol description - MUST BE CLARIFIED BEFORE PROCEEDING]

   ---

   ## Part 1: [listener_name → handler_name] (Spec lines X-Y)

   **Type**: Implementation
   **Agent**: @{implementation_agent}

   **Spec Reference**:
   - Listener: `listen_X` (lines A-B in target spec)
   - Handler: `handler_Y` (lines C-D in target spec)

   **Implementation Guidance** (from protocol description):
   - **Protocol Description (lines X-Y)**: [specific implementation guidance with line reference]
   - **Data Structures (lines A-B)**: [specific data structure choices]
   - **Performance (lines M-N)**: [specific optimizations]
   - **DO NOT Implement (lines P-Q)**: [things that are model-checking only]
   - [Additional guidance with line references]

   ### Task 1.1: Implement listener `listen_X`
   **Agent**: @{implementation_agent}

   - [ ] Create/modify function [file:line]
   - [ ] Implement guard conditions from spec
   - [ ] Return correct parameter type
   - [ ] **Apply implementation guidance**: [specific guidance for this listener]
   - **Spec Mapping**: Lines A-B → [code location]
   - **Commit**: `feat: implement listen_X for [transition]`
   - **Compiles**: [Yes/No/After Task N.M] | **Tests Pass**: [status]

   ---

   ### Task 1.2: Implement handler `handler_Y`
   **Agent**: @{implementation_agent}

   - [ ] Create/modify function [file:line]
   - [ ] Implement state transitions from spec
   - [ ] Implement effects from spec
   - [ ] **CRITICAL**: Ensure code integrates into actual codebase, not isolated test-only code
   - [ ] **Apply implementation guidance**: [specific guidance for this handler]
   - **Spec Mapping**: Lines C-D → [code location]
   - **Commit**: `feat: implement handler_Y for [transition]`
   - **Compiles**: [Yes/No/After Task N.M] | **Tests Pass**: [status]

   ---

   ### Task 1.3: Add required data structures (if needed)
   **Agent**: @{implementation_agent}

   - [ ] Add type/field X (only if needed by this part)
   - [ ] **Implementation note**: [e.g., "Use Vec instead of Set for deterministic ordering"]
   - **Commit**: `feat: add types for listen_X/handler_Y`
   - **Compiles**: Yes | **Tests Pass**: [status]

   ---

   ## Part 2: [next listener/handler from main_listener]
   ...

   ---

   ## Part 3: MBT Validation for `runBasicTest` (Spec test lines X-Y)

   **Type**: Model-Based Testing validation
   **Agent**: @{mbt_agent}
   **Dependencies**: Parts 1, 2 must be complete
   **Quint Test**: `runBasicTest` from target spec (lines X-Y)
   **Validates**: Transitions from Parts 1-2 match spec behavior

   **Note**: This MBT part is inserted IMMEDIATELY after Parts 1-2 because `runBasicTest` only exercises those transitions. Additional transitions are implemented AFTER validation passes.

   ### Task 3.1: Setup MBT test crate (if first MBT part only)
   **Agent**: @{mbt_agent}

   - [ ] Invoke `/quint-connect` slash command
   - [ ] Provide inputs:
     - Spec path: [target spec path]
     - Crate name: {project}-mbt
     - Crate location: tests/mbt
     - First test: runBasicTest
   - [ ] Review generated MBT structure
   - [ ] Verify process type mappings
   - **Commit**: `test(mbt): add MBT test infrastructure`
   - **Compiles**: Yes | **Tests Pass**: No (expected - handlers not implemented)

   ---

   ### Task 3.2: Implement MBT handlers for Parts 1-2
   **Agent**: @{mbt_agent}

   - [ ] Add transitions from Parts 1-2 to `Label` enum in `transition.rs`
   - [ ] Add action mappings in `nondet_picks` match statement
   - [ ] Add transitions to `switch!` macro in `driver.rs` (maintain main_listener order)
   - [ ] Implement handler methods with event assertions:
     - Assert ALL events from spec (messages sent, state changes, timers updated)
     - Use spec line references in comments
     - Example: `assert!(emitted.contains(&msg), "spec line 142: must broadcast proposal")`
   - [ ] Run: `QUINT_VERBOSE=1 cargo test --package {mbt_crate} runBasicTest -- --nocapture`
   - [ ] Debug with QUINT_SEED if test fails
   - [ ] Fix implementation (not MBT test) if divergence found
   - [ ] Fix warnings: `cargo check --package {mbt_crate} --all-targets`
   - [ ] Format: `cargo fmt --package {mbt_crate}`
   - **Spec Mapping**: Validates Parts 1-2 against spec test
   - **Commit**: `test(mbt): validate transitions for runBasicTest`
   - **Compiles**: Yes | **MBT Tests Pass**: Yes

   ---

   ## Part 4: [next listener/handler from main_listener]
   ...

   ## Progress Tracking

   **Part 1**: 0/X tasks complete
   **Part 2**: 0/Y tasks complete
   ...
   **Overall**: 0/N tasks complete (0%)

   ## Notes

   - Implementation parts follow the EXACT order from `main_listener` in target spec
   - MBT validation parts are INTERLEAVED immediately after their dependencies
   - Example sequence: Impl Part 1 → Impl Part 2 → MBT Part 3 (validates 1-2) → Impl Part 4 → Impl Part 5 → MBT Part 6 (validates 4-5)
   - Each implementation part implements one transition (listener + handler)
   - Each MBT validation part validates multiple transitions against one Quint test
   - Tasks may break existing tests - this is expected
   - Data structures added only when needed by specific part
   - **CRITICAL**: Code must integrate into actual codebase, not isolated test-only implementations
   ```

7. **Follow `main_listener` Structure for Implementation Parts**:
   - **Extract transitions from `main_listener`**: Find the function in the target spec that aggregates all transitions (usually called `main_listener`, `step`, or similar)
   - **Create one implementation Part per entry**: Each `cue(listen_fn, handler_fn)` or `on_timeout_X()` becomes one implementation Part
   - **Preserve exact order for implementation parts**: Implementation parts must follow the EXACT order from the spec file
   - **Interleave MBT parts**: Insert MBT validation parts IMMEDIATELY after the last implementation part they depend on (see Step 2-3 above)
   - **Break down each Part**:
     * Task N.1: Implement the listener function (the guard/condition checking)
     * Task N.2: Implement the handler function (the state transition)
     * Task N.3: Add any data structures needed (only if required by this Part)
   - **Incorporate protocol description guidance**:
     * Add "Implementation Guidance" section to each Part
     * Include relevant implementation notes in each task
     * Follow the concrete implementation mappings provided
     * Note when spec behavior is for model checking only (e.g., byzantine behavior)
   - **Mark tasks affected by architectural decisions**:
     * If a task depends on a user decision, add "**Pending Decision N**" to the task
     * This helps user know what to review once decisions are made
   - **Why this approach works**:
     * Spec-driven: Every transition in the spec gets implemented
     * Natural ordering: The spec author chose this order for dependencies
     * Quality-gated: MBT validation catches errors before building on incorrect foundations
     * Testable: Each listener/handler is independently testable
     * Traceable: Direct 1:1 mapping between spec entries and task parts
     * Incremental: Build up the system transition-by-transition, validating as you go
   - **MBT validation details** (elaborating on Step 2-3 above):
     * **CRITICAL**: MBT parts are QUALITY GATES inserted IMMEDIATELY after dependencies
     * Example: If `runBasicTest` exercises transitions from Parts 1-2, then Part 3 MUST be "MBT Validation for runBasicTest", NOT Part 4
     * **DO NOT** implement additional transitions (Part 4+) before validating (Part 3) - validation is BLOCKING
     * First MBT part includes Task N.1 (setup MBT crate with `/quint-connect`) and Task N.2 (implement handlers)
     * Subsequent MBT parts only include Task N.2 (implement new handlers for additional transitions)
     * **Rationale**: Immediate validation prevents cascading errors from building on incorrect behavior

8. **Migration Philosophy - Direct Implementation**:
   - **No backward compatibility**: You are changing the codebase to match the new spec, not maintaining parallel implementations
   - **No feature flags**: The old behavior will be replaced by the new behavior
   - **Tests will break and that's OK**: Existing tests may fail during migration phases - update them to expect new behavior
   - **Tests may be obsolete**: Some tests may test transitions that no longer exist in the target spec - these should be removed or completely rewritten
   - **Focus on forward progress**: The goal is a working implementation of the target spec, not preserving the old one
   - Each commit should move the codebase closer to the target spec, even if it temporarily breaks some functionality

9. **Task Organization Principles**:
   - **Two types of Parts**:
     * Implementation Parts: Each corresponds to ONE entry from `main_listener`
     * MBT Validation Parts: Validate multiple transitions against a Quint test
   - Each task within a Part is one atomic commit
   - Task numbering: Part N, Task N.M (e.g., Part 1 has Tasks 1.1, 1.2, 1.3)
   - **Implementation Part structure**:
     * Task N.1: Implement listener
     * Task N.2: Implement handler
     * Task N.3: Add data structures (if needed)
   - **MBT Validation Part structure**:
     * Task N.1: Setup MBT crate (only for first MBT part)
     * Task N.2: Implement MBT handlers for multiple transitions
   - **MBT Parts are quality gates**: They must be inserted IMMEDIATELY after their dependencies, not delayed
   - **Every task must reference protocol description guidance** when applicable
   - Parts are planned in order
   - Tasks may not compile initially if they depend on types not yet added - mark as "Compiles: After Task N.M"
   - Tasks may cause existing tests to fail - this is expected and acceptable
   - Include specific file paths, line numbers, function names, and spec line references
   - Note dependencies between tasks/parts clearly
   - Keep commits small and focused on one piece of the spec
   - **MBT validation tasks ensure spec compliance** - failures indicate implementation errors, not test errors
   - **DO NOT proceed past an MBT part** until all its tests pass - this prevents building on incorrect foundations

## Approval Gates

1. **After DECISIONS.md Created** (if needed):
   - Use `AskUserQuestion` to ask: "I've identified N architectural decisions. Review DECISIONS.md and provide your choices."
   - Wait for user to review and provide decisions
   - Update plan with user's choices

2. **After SPEC_MIGRATION_TASKS.md Created**:
   - Use `AskUserQuestion` to ask: "Plan created with X implementation parts and Y MBT parts. Review SPEC_MIGRATION_TASKS.md and approve?"
   - Wait for user approval before marking planning complete

## Communication Style

- Be explicit about analysis findings and reasoning
- Explain how specification concepts map to code structures
- Highlight any ambiguities or interpretation decisions
- Proactively identify risks or potential issues
- Use `AskUserQuestion` tool for all user questions - never prompt in prose
- Provide concrete examples when explaining abstract concepts
- Use specification terminology consistently

## Output Formatting Standards

Present key results and summaries using box-drawing characters for visual emphasis:

**Plan Generation Summary:**
```
╔══════════════════════════════════════════════════════╗
║  Migration Plan for [Protocol] Generated            ║
╚══════════════════════════════════════════════════════╝
 - DECISIONS.md created at: [path]
 - SPEC_MIGRATION_TASKS.md created at: [path]
 - Decisions Overview:
   - Decision 1: [brief description]
   - Decision 2: [brief description]
   - ...
 - Task Plan Overview:
   - Total Parts: [number]
   - Implementation Parts: [number]
   - MBT Validation Parts: [number]
```

**Phase Completion:**
```
╔══════════════════════════════════════════════════════╗
║  [Phase Name] Complete                               ║
╚══════════════════════════════════════════════════════╝
 - Key deliverables: [list]
 - Next steps: [actions]
```

Use consistent indentation and bullet points for hierarchical information.

## Handling Challenges

- **Specification Ambiguity**: If the Quint spec is unclear, document it in DECISIONS.md and use `AskUserQuestion` for clarification.

- **Implementation Constraints**: If the specification requires something difficult or impossible in the target language/framework, explain the constraint in task notes and propose alternatives in DECISIONS.md.

- **Discovered Dependencies**: If transitions have unexpected dependencies, update the plan structure and note it clearly.

- **Multiple Valid Approaches**: Create DECISIONS.md entry with options and use `AskUserQuestion` to get user choice.

Your goal is to produce a comprehensive, unambiguous plan that enables implementation agents to work systematically toward the target specification. You are methodical, rigorous, and committed to thorough analysis before implementation begins.
