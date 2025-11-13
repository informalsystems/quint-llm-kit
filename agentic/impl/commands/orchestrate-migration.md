---
command: /orchestrate-migration
description: Orchestrate the ping-pong workflow between implementation and MBT validation agents, managing the spec migration from start to finish with approval gates
version: 2.0.0
---

# Orchestrate Specification Migration

## Objective

Guide and orchestrate the complete migration workflow, alternating between `@spec-implementer` and `@mbt-validator` agents in a ping-pong pattern. Manages agent resumption, tracks progress, and provides approval gates at each checkpoint.

## Prerequisites

You **must** run `/plan-migration` first to create the implementation plan.

Required files:
- `SPEC_MIGRATION_TASKS.md`: Implementation plan with interleaved impl + MBT parts
- `DECISIONS.md`: Architectural decisions (if exists)

## Core Principles

- **Ping-Pong Orchestration**: Alternate between implementation and MBT validation
- **Stateful Agents**: Maintain and resume agent IDs throughout migration
- **Approval Gates**: Request user approval before each major step
- **Progress Tracking**: Update SPEC_MIGRATION_TASKS.md after each checkpoint
- **User Control**: Allow user to pause, review, or stop at any point

## Orchestration Workflow

### Phase 1: Initialization

1. **Verify Prerequisites**:
   - Check that `SPEC_MIGRATION_TASKS.md` exists
   - If not: Stop and instruct user to run `/plan-migration` first

2. **Read Plan**:
   - Parse `SPEC_MIGRATION_TASKS.md`
   - Identify all parts (implementation and MBT)
   - Check which parts are already complete
   - Determine where to start/resume

3. **Initialize Agent Tracking**:
   - Check if agent IDs are stored (from previous orchestration session)
   - If resuming: Load `spec_implementer_agent_id` and `mbt_validator_agent_id`
   - If starting fresh: Both agent IDs are null

### Phase 2: Implementation Batch

1. **Launch @spec-implementer**:
   - If first time: `@spec-implementer` (via Task tool)
   - If resuming: `@spec-implementer --resume {spec_implementer_agent_id}` (via Task tool with resume parameter)
   - Agent will ask user for confirmation before starting (with detailed plan)
   - Wait for agent to complete

2. **After Implementation Completes**:
   - Agent returns with agent ID
   - Store/update `spec_implementer_agent_id`
   - Agent reports which parts completed (e.g., "Parts 0-1 complete")
   - Update progress tracking

3. **Review Gate**:
   - Use `AskUserQuestion`: "Implementation batch complete (Parts X-Y). Review commits and code before MBT validation?"
   - Options:
     - "Looks good, proceed to MBT" → Continue to Phase 3
     - "Need to fix something" → Pause orchestration, let user fix, then resume
     - "Stop here" → End orchestration

### Phase 3: MBT Validation

1. **Identify MBT Part**:
   - Read SPEC_MIGRATION_TASKS.md to find next MBT validation part
   - Example: "Part 2: MBT Validation for runBasicTest"
   - Determine which implementation parts it validates

2. **Launch @mbt-validator**:
   - If first time: `@mbt-validator` (via Task tool)
   - If resuming: `@mbt-validator --resume {mbt_validator_agent_id}` (via Task tool with resume parameter)
   - Agent auto-detects which MBT part to work on from SPEC_MIGRATION_TASKS.md
   - Agent will ask user for confirmation before starting (with detailed plan)
   - Wait for agent to complete

3. **After MBT Validation Completes**:
   - Agent returns with agent ID
   - Store/update `mbt_validator_agent_id`
   - Agent reports validation results
   - Update progress tracking in SPEC_MIGRATION_TASKS.md

4. **Validation Results Gate**:
   - If validation **passed**:
     - Use `AskUserQuestion`: "MBT validation passed! Continue to next implementation batch?"
     - Options:
       - "Continue" → Return to Phase 2 for next batch
       - "Stop here" → End orchestration

   - If validation **failed**:
     - Report divergence details
     - Use `AskUserQuestion`: "MBT validation found divergences. What would you like to do?"
     - Options:
       - "Fix implementation and retry" → Pause for user fixes, then rerun MBT validation
       - "Debug together" → Help user debug the issue
       - "Stop here" → End orchestration

### Phase 4: Completion

When all parts in SPEC_MIGRATION_TASKS.md are complete:

1. **Final Summary**:
   - Total implementation parts completed: X
   - Total MBT validation parts passed: Y
   - Total commits created: Z
   - Agent IDs used:
     - spec-implementer: {spec_implementer_agent_id}
     - mbt-validator: {mbt_validator_agent_id}

2. **Cleanup**:
   - Mark migration as complete in SPEC_MIGRATION_TASKS.md
   - Suggest final steps (e.g., "Run full test suite", "Review all changes", "Create PR")

## Agent Management

### Tracking Agent State

Store agent IDs in memory throughout orchestration:

```
spec_implementer_agent_id: abc123 (or null if not started)
mbt_validator_agent_id: def456 (or null if not started)
```

### Resume Behavior

When orchestration is paused and restarted:
- Read SPEC_MIGRATION_TASKS.md to see where we left off
- Check if agent IDs are available (from previous session or stored in file)
- If agent IDs lost: Start fresh agents (they can still read progress from SPEC_MIGRATION_TASKS.md)
- If agent IDs available: Resume both agents

**Note**: Agent IDs are ephemeral per orchestration session. If user exits and restarts `/orchestrate-migration` later, new agent instances may be needed, but they can read the saved progress.

## Error Handling

### Plan Not Found
- **Condition**: SPEC_MIGRATION_TASKS.md doesn't exist
- **Action**: "Error: No migration plan found. Please run `/plan-migration` first."
- **Recovery**: User runs `/plan-migration`, then reruns `/orchestrate-migration`

### Implementation Agent Fails
- **Condition**: @spec-implementer returns error or exits unexpectedly
- **Action**: Report error, show last known state
- **Recovery**: Use `AskUserQuestion` to offer: retry, debug, or stop

### MBT Validation Fails
- **Condition**: @mbt-validator reports test failures
- **Action**: Show divergence details, suggest fixes
- **Recovery**: User fixes implementation, then retry MBT validation with same agent ID (resume)

### User Cancels Mid-Flow
- **Condition**: User interrupts orchestration
- **Action**: Save current state (agent IDs, progress)
- **Recovery**: User can restart `/orchestrate-migration` and continue from where they left off

## Tools Used

- `Task`: Launch `@spec-implementer` and `@mbt-validator` agents with resume support
- `Read`: Read SPEC_MIGRATION_TASKS.md to track progress
- `Edit`: Update SPEC_MIGRATION_TASKS.md with progress
- `AskUserQuestion`: Get approval at each gate

## Output Formatting Standards

**CRITICAL**: Use box-drawing characters consistently for all major sections and summaries. This provides visual clarity and professional presentation.

### Standard Formats

**Orchestration Start:**
```
╔══════════════════════════════════════════════════════╗
║  Specification Migration Orchestration               ║
╚══════════════════════════════════════════════════════╝
 - Plan: SPEC_MIGRATION_TASKS.md
 - Total Parts: [N]
 - Starting from: Part [X]
```

**Implementation Phase:**
```
╔══════════════════════════════════════════════════════╗
║  Phase 2: Implementation Batch [N]                   ║
╚══════════════════════════════════════════════════════╝
 - Action: Launching @spec-implementer
 - Will implement: Parts X-Y
 - Agent ID: [abc123 or "new"]
```

**MBT Validation Phase:**
```
╔══════════════════════════════════════════════════════╗
║  Phase 3: MBT Validation                             ║
╚══════════════════════════════════════════════════════╝
 - Action: Launching @mbt-validator
 - Auto-detected: Part Z (MBT Validation for [test_name])
 - Validates: Parts X-Y
 - Agent ID: [def456 or "new"]
```

**Progress Updates:**
```
╔══════════════════════════════════════════════════════╗
║  Progress Update                                     ║
╚══════════════════════════════════════════════════════╝
 - Parts complete: X/N ([percentage]%)
 - Implementation: X parts
 - MBT Validation: Y parts
 - Total commits: Z
```

**Migration Complete:**
```
╔══════════════════════════════════════════════════════╗
║  Migration Complete!                                 ║
╚══════════════════════════════════════════════════════╝
 - Implementation Parts: X/X (100%)
 - MBT Validations: Y/Y passing
 - Total Commits: Z
 - Agent IDs:
   • spec-implementer: [abc123]
   • mbt-validator: [def456]

Next steps:
 • Run full test suite
 • Review all changes
 • Create pull request
```

## Output Format Example

Throughout orchestration, display progress using the standard formats above:

```
╔══════════════════════════════════════════════════════╗
║  Specification Migration Orchestration               ║
╚══════════════════════════════════════════════════════╝

[Phase 2: Implementation Batch 1]
Launching @spec-implementer...
✓ Parts 0-1 implemented (8 commits)
Agent ID: abc123

[Approval Gate]
Ready to proceed to MBT validation?

[Phase 3: MBT Validation]
Launching @mbt-validator...
Auto-detected: Part 2 - MBT Validation for runBasicTest
✓ Validation passed - Parts 0-1 match spec
Agent ID: def456

[Progress: 3/10 parts complete (30%)]

[Approval Gate]
Ready to continue to next implementation batch?

[Phase 2: Implementation Batch 2]
Resuming @spec-implementer (abc123)...
✓ Parts 3-4 implemented (6 commits)

... continues until all parts complete ...

╔══════════════════════════════════════════════════════╗
║  Migration Complete!                                 ║
╚══════════════════════════════════════════════════════╝

Implementation Parts: 8/8 (100%)
MBT Validations: 3/3 passing
Total Commits: 32
Duration: 2 hours

Next steps:
• Run full test suite
• Review all changes
• Create pull request
══════════════════════════════════════════════════════
```

## Critical Guidelines

1. **Always use AskUserQuestion**: Never proceed without user approval at gates
2. **Track agent IDs**: Maintain state throughout entire migration
3. **Update progress**: Keep SPEC_MIGRATION_TASKS.md current
4. **Respect stops**: If user wants to stop, save state cleanly
5. **Handle failures gracefully**: Don't lose progress on errors
6. **One batch at a time**: Never skip MBT validation gates

## Usage Examples

### Start Fresh Migration

```bash
# Step 1: Create plan
/plan-migration specs/v1.qnt specs/v2.qnt /path/to/impl

# Step 2: Start orchestration
/orchestrate-migration
```

The orchestrator handles everything from there!

### Resume After Interruption

If you stopped mid-migration:

```bash
# Just run the same command
/orchestrate-migration
```

Orchestrator reads progress and continues from where you left off.

### Manual Control Alternative

If you prefer manual control instead of orchestration:

```bash
# Create plan
/plan-migration specs/v1.qnt specs/v2.qnt /path/to/impl

# Manually invoke agents
@spec-implementer                      # Returns abc123
@mbt-validator                         # Returns def456, auto-detects Part 2
@spec-implementer --resume abc123      # Implements next batch
@mbt-validator --resume def456         # Auto-detects Part 5
# ... repeat ...
```

Both approaches work!

## Summary

`/orchestrate-migration` provides a **guided, automated experience** for the ping-pong workflow:
- Manages agent state and resumption
- Provides approval gates for user control
- Tracks progress throughout migration
- Handles errors gracefully
- Makes the complex workflow simple

For maximum control, users can still manually invoke agents. For ease of use, let the orchestrator handle it!
