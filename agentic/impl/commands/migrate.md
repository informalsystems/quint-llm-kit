---
command: /migrate
description: Migrate codebase from one Quint specification to another using formal-spec-implementer agent
version: 1.0.0
---

# Specification Migration

## Objective

Orchestrate codebase migration from original Quint specification to target specification, coordinating the formal-spec-implementer agent through planning, architectural decisions, and incremental implementation with MBT validation.

## File Operation Constraints

**CRITICAL**: Workspace organization:
- **Decisions**: `DECISIONS.md` in workspace root
- **Tasks**: `SPEC_MIGRATION_TASKS.md` in workspace root
- **Implementation**: Modified in `codebase_root` as specified
- **NEVER use `/tmp` or system temp directories**

## Input Contract

### Required Parameters
- `original_spec`: Path to Quint spec matching current codebase behavior
- `target_spec`: Path to Quint spec defining desired behavior

### Optional Parameters
- `protocol_description`: Path to document with implementation guidance
- `codebase_root`: Root directory of implementation (default: current directory)

## Output Contract

### Success
```json
{
  "status": "completed",
  "agent": "formal-spec-implementer",
  "phases_completed": ["planning", "implementation"],
  "decisions_made": 3,
  "parts_implemented": 16,
  "mbt_validations_passed": 4,
  "artifacts": ["DECISIONS.md", "SPEC_MIGRATION_TASKS.md"]
}
```

### In Progress
```json
{
  "status": "in_progress",
  "current_part": "Part 6: MBT Validation for runBasicTest",
  "progress": "6/16 parts (37%)",
  "can_resume": true
}
```

## Execution Procedure

### Phase 1: Invoke Agent

**Objective**: Launch formal-spec-implementer agent with provided specifications.

**Steps**:

1. **Validate Inputs**
   - Check: `original_spec` and `target_spec` files exist
   - If missing: Return error "Specification file not found: <path>"

2. **Invoke Agent**
   - Execute: Launch @formal-spec-implementer with task:
     ```
     Migrate from <original_spec> to <target_spec>.
     Protocol description: <protocol_description> (if provided)
     Codebase root: <codebase_root>
     ```
   - Wait: Agent begins work

3. **Monitor Progress**
   - Agent will:
     - Analyze specifications (Phase 1)
     - Ask architectural decisions via `AskUserQuestion`
     - Generate DECISIONS.md and SPEC_MIGRATION_TASKS.md
     - Implement transitions incrementally (Phase 2)
     - Run MBT validation gates (Phase 2)
     - Update progress across sessions (Phase 3)

### Phase 2: Resumption (if interrupted)

**Objective**: Resume work from last completed part.

**Steps**:

4. **Check State**
   - Execute: Read `SPEC_MIGRATION_TASKS.md`
   - If exists: Agent resumes from last incomplete part
   - If not exists: Agent starts from Phase 1

5. **Continue Work**
   - Agent reads progress and continues
   - No user action required

## Output Format

Agent produces:

```
╔══════════════════════════════════════════════════════╗
║  Specification Migration Complete                    ║
╚══════════════════════════════════════════════════════╝

Implementation Parts: 12/12 (100%)
MBT Validations: 4/4 passing
Total Commits: 38
Decisions Made: 3

Report: SPEC_MIGRATION_TASKS.md
══════════════════════════════════════════════════════
```

## Tools Used

- `Task`: Launch formal-spec-implementer agent
- `Read`: Check for SPEC_MIGRATION_TASKS.md (resumption)

## Error Handling

### Specification File Not Found
- **Condition**: `original_spec` or `target_spec` does not exist
- **Action**: Display error with path
- **Recovery**: User provides correct path, retry command

### Agent Invocation Failure
- **Condition**: Agent fails to launch
- **Action**: Record error details
- **Recovery**: Prompt user "Agent failed: <error>. Retry? (yes/no)"

### Interrupted Session
- **Condition**: User stops work mid-migration
- **Action**: Agent saves progress to SPEC_MIGRATION_TASKS.md
- **Recovery**: Run same command again - agent resumes automatically

## Critical Guidelines

**Mandatory Rules**:

1. **Agent Usage Required**: The formal-spec-implementer agent MUST be used. Do not perform migration work directly.

2. **Resumable**: Agent reads SPEC_MIGRATION_TASKS.md and continues from last point. Safe to interrupt and resume.

3. **User Decisions**: Agent uses `AskUserQuestion` for architectural decisions during planning. User must respond.

4. **MBT Blocking**: Agent stops at MBT validation gates until tests pass. This is expected behavior.

5. **Tests Will Break**: Existing tests may fail during migration - agent updates them for new behavior.

## Usage Examples

**Simple migration**:
```
/migrate-spec specs/consensus_v1.qnt specs/consensus_v2.qnt
```

**With protocol description**:
```
/migrate-spec specs/consensus_v1.qnt specs/consensus_v2.qnt docs/migration.md
```

**Resume interrupted work** (same command):
```
/migrate-spec specs/consensus_v1.qnt specs/consensus_v2.qnt
```
