---
command: /plan-migration
description: Create an implementation plan to migrate codebase from one Quint specification to another, with architectural decisions and task breakdown
version: 1.0.0
---

# Plan Specification Migration

## Objective

Analyze Quint specifications and codebase to create a detailed implementation plan with architectural decisions and task breakdown. This command handles ONLY planning - no implementation.

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

## Output Contract

### Success
```json
{
  "status": "plan_created",
  "decisions_made": 3,
  "total_parts": 12,
  "total_tasks": 36,
  "artifacts": ["DECISIONS.md", "SPEC_MIGRATION_TASKS.md"],
  "ready_for_implementation": true
}
```

## Core Principles

- **Spec is Source of Truth**: The Quint spec defines WHAT to implement. Protocol description provides HOW to implement. If they conflict, STOP immediately and use `AskUserQuestion` tool.
- **User Interaction**: ALWAYS use `AskUserQuestion` tool for all user questions - never prompt in prose.
- **Planning Only**: This command creates the plan but does NOT implement anything.
- **Approval Gates**: Get explicit user approval at critical points.

## Planning Workflow

### Phase 1: Specification Analysis

1. **Analyze the Original Specification**:
   - Examine the original Quint specification that matches current codebase behavior
   - Identify all state variables, invariants, transitions, and temporal properties

2. **Study the Protocol Description** (if provided):
   - This document may contain:
     - High-level protocol design and goals
     - Context on why changes were made
     - **CRITICAL**: Concrete implementation guidance for realizing abstract spec concepts in code
     - Implementation details not captured in the formal spec
     - Clarifications and optimization strategies

   **CRITICAL REQUIREMENTS FOR PROTOCOL DESCRIPTION ANALYSIS**:

   a) **The Quint spec is ALWAYS the source of truth for behavior**:
      - If you find ANY divergence between protocol description and Quint spec, STOP immediately
      - Document the divergence and use `AskUserQuestion` for clarification
      - Never override spec behavior based on the description

   b) **Actively search for implementation-specific guidance**:
      - Search document for keywords: "implementation", "code", "architecture", "data structure", "optimization", "performance"
      - Look for implementation sections and phrases like "in practice", "should be implemented as", "for efficiency"
      - Extract data structure choices (HashMap vs Set, Vec vs BTreeSet, etc.)
      - Extract performance optimizations (short-circuiting, caching, indexing)
      - Extract architectural guidance (module boundaries, API design)
      - Extract what should NOT be implemented (model-checking artifacts, proof helpers, byzantine generators)

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

3. **Inspect the Current Implementation**:
   - Map spec concepts to code structures:
     - State variables → data structures, class fields, database schemas
     - Transitions → functions, methods, API endpoints, event handlers
     - Preconditions → validation logic, guards, authorization checks
     - Postconditions → assertions, state updates, side effects
     - Invariants → consistency checks, validation rules

4. **Compare Specifications**:
   - Identify differences between original and target specs
   - Categorize changes as:
     - New transitions (new behavior to implement)
     - Modified transitions (existing behavior to update)
     - Removed transitions (behavior to deprecate/remove)
     - State variable changes (data structure modifications)
     - Invariant changes (new consistency requirements)

### Phase 2: Architectural Decisions

**DECISION-MAKING ALGORITHM** (for each listener/handler):

```
For each listener/handler in main_listener:
  1. Read the Quint spec section about it and analyze the diff with the original spec
     - What changed? New fields? Different logic? Removed concepts?
     - What are the preconditions, postconditions, state changes?

  2. Read the documentation file for implementation guidance
     - Look for data structure guidance, architectural notes, performance hints
     - Look for phrases like "should be implemented as", "in practice", "architecture"

  3. Identify 2-5 plausible implementation approaches from existing code
     - Consider: where it lives, what structures it needs, how it integrates

  4. If the best option is OBVIOUS or CLEARLY STATED in the documentation:
       Choose this option and define the sub-tasks for it directly
       Document your reasoning in task description
     Else:
       Create DECISIONS.md file with the options
       Mark affected tasks as "Pending Decision N"
```

**CRITICAL**: Do NOT ask questions you can answer by examining the protocol description, Quint spec, or existing code patterns. Only ask when genuinely ambiguous.

**ASK USER FOR CLARIFICATION** when:
- A new data structure is needed but multiple reasonable implementations exist (e.g., HashMap vs BTreeMap, Vec vs LinkedList)
- The spec has an abstract concept but the codebase structure is unclear (e.g., where should a new state field live - in State, in an existing manager, or in a new struct?)
- Protocol description mentions a module/component that doesn't obviously map to existing code
- A spec transition requires creating a new subsystem or significant architectural change
- Implementation guidance conflicts with apparent codebase conventions
- You find yourself guessing between 2+ plausible approaches

**DO NOT ASK** for:
- Obvious mappings (spec collections → existing collection types)
- Standard patterns already in codebase
- Simple type additions to existing structs
- Clear one-to-one mappings from spec to code
- Questions answered by code reading

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

**CRITICAL - APPROVAL GATE FOR DECISIONS**:
- If DECISIONS.md is created, IMMEDIATELY use `AskUserQuestion` to gather all decisions
- DO NOT give options about editing the file manually vs chat
- Ask one question per decision with the options listed
- Update DECISIONS.md with user choices
- DO NOT proceed to task creation until all decisions are made

### Phase 3: Create Implementation Plan

Generate `SPEC_MIGRATION_TASKS.md` with implementation parts and MBT validation parts interleaved.

**CRITICAL UNDERSTANDING**: The plan is NOT "all implementation parts, then all MBT parts". Instead, it's an INTERLEAVED sequence where MBT parts appear IMMEDIATELY after the transitions they validate. Example: Impl Part 0 → Impl Part 1 → **MBT Part 2 validates 0-1** → Impl Part 3 → Impl Part 4 → **MBT Part 5 validates 3-4** → etc.

**Planning Steps**:

a) Extract listener/handler pairs from `main_listener` in target spec as implementation parts in order:
   - Find the function aggregating all transitions (`main_listener`, `step`, or similar)
   - Create one Part per entry: Each `cue(listen_fn, handler_fn)` or `on_timeout_X()` becomes one Part
   - Preserve EXACT order from spec

b) Analyze ALL Quint test functions (usually prefixed with `run`) in the target spec. For each test:
   - Identify which transitions (listener/handler pairs) it exercises
   - Determine the last implementation part it depends on
   - Plan to insert an MBT validation part IMMEDIATELY after that implementation part
   - **CRITICAL**: MBT parts are QUALITY GATES - they BLOCK further implementation until passing

c) Create a merged sequence where:
   - Implementation parts follow the `main_listener` order
   - MBT validation parts are inserted IMMEDIATELY after their dependencies
   - Example: If `runBasicTest` exercises transitions from Parts 0-1, the sequence is:
     - Part 0: [implementation for first transition]
     - Part 1: [implementation for second transition]
     - Part 2: MBT Validation for `runBasicTest` ← IMMEDIATE insertion (BLOCKS Part 3)
     - Part 3: [implementation for third transition]
     - ...

d) For each Part, create high-level tasks with **Agent Assignment**:
   - **Implementation Part structure** (executed by implementation agent):
     - Task N.1: Implement the listener function (guard/condition checking) - **Agent**: @{implementation_agent}
     - Task N.2: Implement the handler function (state transition) - **Agent**: @{implementation_agent}
     - Task N.3: Add any data structures needed (only if required by this Part) - **Agent**: @{implementation_agent}
     - Task N.4: Add unit tests for this transition - **Agent**: @{implementation_agent}
   - **MBT Validation Part structure** (executed by MBT agent):
     - Task N.1: Setup MBT infrastructure and validate transitions - **Agent**: @{mbt_agent}
       - Note: Agent handles both MBT setup (first time only) and validation
   - **Incorporate protocol description guidance**:
     - Add "Implementation Guidance" section to each Part with line references
     - Include relevant implementation notes in each task
     - Follow concrete implementation mappings provided
     - Note when spec behavior is for model checking only (e.g., byzantine behavior)
   - **Mark tasks affected by architectural decisions**:
     - If task depends on user decision, add "**Pending Decision N**" to the task

e) Generate SPEC_MIGRATION_TASKS.md with this merged, interleaved sequence using the configured agent names

**Task File Format** (use configured agent names from parameters):

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

## Part 0: [listener_name → handler_name] (Spec lines X-Y)

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

### Task 0.1: Implement listener `listen_X`
**Agent**: @{implementation_agent}

- [ ] Implement guard conditions and return correct parameter type
- **Spec Mapping**: Lines A-B → [code location]
- **Implementation Guidance**: [specific guidance for this listener]

---

### Task 0.2: Implement handler `handler_Y`
**Agent**: @{implementation_agent}

- [ ] Implement state transitions and effects from spec
- [ ] **CRITICAL**: Ensure code integrates into actual codebase, not isolated test-only code
- **Spec Mapping**: Lines C-D → [code location]
- **Implementation Guidance**: [specific guidance for this handler]

---

### Task 0.3: Add required data structures (if needed)
**Agent**: @{implementation_agent}

- [ ] Add type/field X (only if needed by this part)
- **Implementation note**: [e.g., "Use Vec instead of Set for deterministic ordering"]

---

### Task 0.4: Add unit tests for this transition
**Agent**: @{implementation_agent}

- [ ] Test preconditions, state transitions, and postconditions

---

## Part 1: [next listener/handler from main_listener]

**Type**: Implementation
**Agent**: @{implementation_agent}

[Tasks 1.1, 1.2, 1.3, 1.4 follow same structure as Part 0]

---

## Part 2: MBT Validation for `runBasicTest` (Spec test lines X-Y)

**Type**: Model-Based Testing validation
**Agent**: @{mbt_agent}
**Dependencies**: Parts 0, 1 must be complete
**Quint Test**: `runBasicTest` from target spec (lines X-Y)
**Validates**: Transitions from Parts 0-1 match spec behavior

**Note**: This MBT part is inserted IMMEDIATELY after Parts 0-1 because `runBasicTest` only exercises those transitions. Additional transitions are implemented AFTER validation passes.

### Task 2.1: Setup MBT infrastructure and validate transitions
**Agent**: @{mbt_agent}

- [ ] Setup MBT test crate (if first MBT part only)
- [ ] Implement MBT handlers for transitions from Parts 0-1
- [ ] Validate against `runBasicTest` from spec
- **Spec path**: [target spec path]
- **Quint Test**: runBasicTest
- **Validates**: Transitions from Parts 0-1

**Note**: The agent handles both MBT infrastructure setup (on first invocation) and validation of transitions.

---

## Part 3: [next listener/handler from main_listener]

**Type**: Implementation
**Agent**: @{implementation_agent}

...

---

## Progress Tracking

**Part 0**: 0/4 tasks complete
**Part 1**: 0/4 tasks complete
**Part 2**: 0/2 tasks complete
...
**Overall**: 0/N tasks complete (0%)

## Notes

- Implementation parts follow the EXACT order from `main_listener` in target spec
- MBT validation parts are INTERLEAVED immediately after their dependencies
- Example sequence: Impl Part 0 → Impl Part 1 → MBT Part 2 (validates 0-1) → Impl Part 3 → Impl Part 4 → MBT Part 5 (validates 3-4)
- Each implementation part implements one transition (listener + handler)
- Each MBT validation part validates multiple transitions against one Quint test
- Tasks may break existing tests - this is expected
- Data structures added only when needed by specific part
- **CRITICAL**: Code must integrate into actual codebase, not isolated test-only implementations
```

**Additional Task Guidelines**:

**CRITICAL - Task Granularity**:
- Tasks are **organizational units** for planning and tracking, NOT separate agent invocations
- The agent assigned to a Part implements ALL tasks for that Part in a single invocation
- Example: `@spec-implementer` implements Part 0's Tasks 0.1, 0.2, 0.3, 0.4 together, not separately
- Tasks help the agent understand what needs to be done, but agent executes the entire Part

**Task Execution**:
- Each task within a Part is one atomic commit
- Task numbering: Part N, Task N.M (e.g., Part 0 has Tasks 0.1, 0.2, 0.3, 0.4)
- Parts are implemented in order, but tasks within a Part can sometimes be reordered if dependencies require it
- Tasks may not compile initially if they depend on types not yet added - mark as "Compiles: After Task N.M"
- Include specific file paths, line numbers, function names, and spec line references in each task
- Note dependencies between tasks/parts clearly
- Keep commits small and focused on implementing one piece of the spec

### Phase 4: Plan Approval

**CRITICAL - APPROVAL GATE**:

After creating SPEC_MIGRATION_TASKS.md, STOP immediately and use `AskUserQuestion`:

Ask: "I've created the implementation plan in SPEC_MIGRATION_TASKS.md. The plan has [N] parts with [M] total tasks. Would you like to review it before proceeding to implementation?"

Options:
- **"Approve plan"** - Plan is ready for implementation (via implementation agent)
- **"Request changes"** - User will provide specific changes needed
- **"Review first"** - User wants to review the file before deciding

**If user requests changes**:
- Make ONLY the requested changes
- DO NOT re-run entire analysis
- DO NOT re-analyze specs unless specifically asked
- Update SPEC_MIGRATION_TASKS.md with targeted changes
- Ask for approval again

**After approval**:
- Confirm plan is ready
- Inform user to use implementation agent for executing parts: `@spec-implementer Part 0`

## Tools Used

- `Read`: Read spec files, protocol description, codebase
- `Glob`: Find relevant code files
- `Grep`: Search for patterns in codebase
- `Write`: Create DECISIONS.md and SPEC_MIGRATION_TASKS.md
- `AskUserQuestion`: Gather architectural decisions and plan approval
- `TodoWrite`: Track planning progress

## Error Handling

### Specification File Not Found
- **Condition**: `original_spec` or `target_spec` does not exist
- **Action**: Display error with path
- **Recovery**: User provides correct path, retry command

### Divergence Between Spec and Protocol Description
- **Condition**: Protocol description contradicts Quint spec behavior
- **Action**: Document in SPEC_MIGRATION_TASKS.md under "Divergences Found"
- **Recovery**: Use `AskUserQuestion` to clarify which is correct

### Ambiguous Architectural Decision
- **Condition**: Multiple valid implementation approaches exist
- **Action**: Create DECISIONS.md, use `AskUserQuestion` to gather decision
- **Recovery**: Update plan with user's decision

## Critical Guidelines

**Mandatory Rules**:

1. **Planning Only**: This command does NOT implement code. It only creates the plan.

2. **Always Use AskUserQuestion**: NEVER prompt in prose. Always use the tool for decisions and approvals.

3. **Approval Gates**:
   - After creating DECISIONS.md → Ask for decisions immediately
   - After creating SPEC_MIGRATION_TASKS.md → Ask for plan approval

4. **No Re-runs on Changes**: If user requests plan changes, make ONLY those changes without re-analyzing everything.

5. **Spec is Truth**: Protocol description provides HOW, but spec defines WHAT. Divergences must be clarified.

6. **Integration Required**: Task descriptions must emphasize integrating code into actual codebase, not isolated test-passing code.

## Usage Examples

**Basic usage**:
```
/plan-migration specs/consensus_v1.qnt specs/consensus_v2.qnt /path/to/impl
```

**With protocol description**:
```
/plan-migration specs/consensus_v1.qnt specs/consensus_v2.qnt /path/to/impl docs/migration.md
```