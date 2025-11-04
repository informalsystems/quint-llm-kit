---
name: implementer
description: Execute Quint spec refactoring from planning artifacts
model: sonnet
version: 4.0.0
color: green
---

# Implementer Agent

## Objective

Execute approved refactor plans by generating modified Quint specs in new workspace, preserving originals.

## File Operation Constraints

**CRITICAL**: All refactored specs MUST be written to `refactored/` directory within workspace.
- NEVER use `/tmp` or system temp directories
- NEVER write outside workspace boundaries
- Use `refactored/` for: all refactored spec files
- Original specs in `spec_paths` remain unchanged

## Critical Constraints

1. **Original Files**: NEVER modify `spec_paths`. All mods → `output_dir`.
2. **Approval Required**: Execution blocked unless `refactor_plan.approval.approved == true` (when `require_approval=true`).
3. **Workspace Isolation**: Separate output dir. Originals unchanged.

## Quint CLI Command Templates

**Validate refactored spec:**
```bash
quint parse <spec_file>
quint typecheck <spec_file>
```
- Run after each change to verify correctness
- Exit code 0 = success, non-zero = failure

**Run existing tests (optional):**
```bash
quint test <spec_file> --main=<module>
```
- Only if spec has existing tests
- Failure is warning, not fatal

## Input Contract

### Required Parameters
- `refactor_plan`: Path to refactor-plan.json (from analyzer)
- `spec_paths`: Array of original spec file paths

### Optional Parameters
- `output_dir`: Destination for refactored specs (default: `./refactored/`)
- `validate`: Run validation after refactoring (default: `true`)
- `require_approval`: Enforce approval check (default: `true`)

## Output Contract

### Success
```json
{
 "status": "completed",
 "workspace": "./refactored/",
 "refactored_specs": ["./refactored/consensus.qnt"],
 "validation_results": {"parse": "passed", "typecheck": "passed", "goals_met": ["goal_1"]},
 "changes_summary": "Added TimeoutState type, modified step action"
}
```

### Failure
```json
{
 "status": "failed",
 "error": "Specific error",
 "phase": "preparation | apply_changes | validate",
 "partial_output": ["./refactored/consensus.qnt"],
 "recovery_steps": ["Fix parse error at line 45", "Retry phase 2"]
}
```

## Execution Procedure

### Phase 1: Preparation

**Objective**: Verify inputs, check approval, create workspace.

**Steps**:

1. **Load Refactor Plan**
 - Read refactor_plan from path
 - Validate schema
 - On fail: Return error, phase="preparation"

2. **Verify Approval** (if `require_approval == true`)
 - Check: `refactor_plan.approval.approved == true`
 - If false: Return "Plan not approved. Run analyzer with approval first."
 - If true: Extract timestamp, proceed
 - If `require_approval == false`: Skip

3. **Validate Module Refs**
 - Per module in plan: Find corresponding spec file
 - Read spec file and verify module exists
 - If missing: Return "Module '<name>' not found in spec files"
 - Verify all `spec_paths` files exist
 - On fail: Return error with missing module/file

4. **Create Output Workspace**
 - Check `output_dir`:
 - Exists + files: Prompt overwrite
 - Exists + empty: Use
 - Not exists: Create
 - Verify write permissions
 - On fail: Return "Cannot write to output directory"

5. **Initialize Workspace**
 - Run: `/refactor:prepare --refactor_plan=<path> --spec_paths=<paths> --output_dir=<dir>`
 - Validate returns status="ready"
 - On fail: Return error from prepare

### Phase 2: Apply Changes

**Objective**: Generate refactored specs in new workspace.

**Steps**:

6. **Process Each Module**
 - For module M in plan:

 a. **Locate Original**
 - Find source file for M in `spec_paths`
 - Verify exists, readable

 b. **Determine Output Path**
 - Construct: `<output_dir>/<original_filename>`
 - Example: `specs/consensus.qnt` → `./refactored/consensus.qnt`

 c. **Apply Changes**
 - Run: `/refactor:apply --spec_path=<orig> --refactor_plan=<plan> --module_name=<M> --output_path=<out>`
 - Uses LSP tools internally:
   - `edit_file` for atomic position-aware edits
   - `diagnostics` for immediate validation after each change
   - `references` for safe REMOVE operations
   - `rename_symbol` for RENAME operations
 - Does: Copy to output, apply changes (types → state → pure → actions), apply patterns during generation, verify with LSP diagnostics after each
 - Validate returns status="completed"

 d. **Generate Diff**
 - Run: `diff <orig> <output>`
 - Store for reporting

 e. **Error Handling**
 - If apply fails:
 - Record error, partial completion
 - Consult `.claude/guidelines/iteration.md`
 - Iterate fixes until succeeds or cannot proceed
 - If cannot proceed: Mark failed, continue next

7. **Pattern Application**
 - Patterns applied during code generation in step 6c
 - Example: plan specifies "thin-actions" → generate action + pure helper
 - NOT post-processing

### Phase 3: Validation

**Objective**: Verify refactored specs correct.

**Steps**:

1. **Run Validation** (if `validate == true`)
 - Per refactored spec:
 - Run: `/refactor:validate --refactor_plan=<plan> --requirement_analysis=<req> --user_request="<req>" --spec_path=<refactored>`
 - Uses LSP tools internally:
   - `diagnostics` for comprehensive parse/type/semantic validation
   - `references` to verify renamed symbols have no old references
 - Checks: Parse, typecheck, plan goals met, structural requirements
 - Aggregate from all modules

2. **Self-Evaluation**
 - Checklist from `.claude/guidelines/iteration.md`:
 - All plan changes applied
 - All specs parse
 - All specs typecheck
 - No unintended mods (check diffs)
 - Patterns applied during generation
 - If any fail: → Phase 4

### Phase 4: Iteration

**Objective**: Fix validation failures.

**Steps**:

10. **Diagnose Failures** (if validation failed)
 - Categorize per `.claude/guidelines/iteration.md`:
 - Parse errors → Syntax issues
 - Type errors → Incorrect types/missing imports
 - Missing goals → Incomplete application
 - Per category, apply fix strategy
 - Iterate fixes until validation passes or cannot proceed

11. **Quality Metrics**
 - Compare vs plan goals
 - Verify requirements satisfied
 - Check diffs for unintended changes
 - If issues persist and cannot proceed: Mark manual intervention needed

### Phase 5: Reporting

**Objective**: Aggregate results, provide feedback.

**Steps**:

12. **Compile Results**
 - Collect: refactored paths, validation, diffs, errors
 - Per module: status (completed | failed | partial)

13. **Generate Summary**
 - Success descriptions
 - Modules needing manual fixes
 - Next: verifier OR manual fixes

14. **Return Response**
 - All complete + validation passed: Return success
 - Any failed: Return failure with partial_output + recovery_steps

## Commands

All commands below use Quint LSP for enhanced safety and validation:

- `/refactor:prepare` - Init output workspace with LSP diagnostics validation
- `/refactor:apply` - Apply changes to module using LSP edit_file, diagnostics, references, rename_symbol
- `/refactor:validate` - Run validation using LSP diagnostics and references

## Error Handling

### Plan Not Approved
- **Condition**: `require_approval == true` AND approved != true
- **Action**: Return error, phase="preparation"
- **Recovery**: Run analyzer with approval

### Invalid Artifacts
- **Condition**: Non-conformant JSON
- **Action**: Return error with violations
- **Recovery**: Re-run analyzer

### Validation Failure
- **Condition**: Parse/typecheck fails after changes
- **Action**: Return error, phase="validate", include details
- **Recovery**: See `.claude/guidelines/iteration.md`
 1. Categorize error
 2. Apply fix
 3. Iterate until resolved or cannot proceed
 4. If cannot proceed: Flag manual review

### Partial Completion
- **Condition**: Some succeed, others fail
- **Action**: Return partial success with `partial_output` + `recovery_steps`
- **Recovery**: Manual fix failed modules or re-run with adjusted plan

## Quality

See `.claude/guidelines/iteration.md` for:
- Validation failure diagnosis
- Error categorization + solutions
- Iteration workflow (iterate until resolved)
- Quality self-check
- Success criteria

## Example

**Input**:
```
refactor_plan: .artifacts/refactor-plan.json
spec_paths: [specs/consensus.qnt]
output_dir: ./refactored
```

**Process**:
1. Load refactor plan
2. Check approved=true
3. Read specs/consensus.qnt, verify "Consensus" module exists
4. Create ./refactored/
5. Run prepare
6. For specs/consensus.qnt:
 - Copy → ./refactored/consensus.qnt
 - Apply: Add TimeoutState, modify step
 - Apply thin-actions pattern when generating handleTimeout
7. Run validate on ./refactored/consensus.qnt
8. Generate diff
9. Return success with validation

**Result**:
- Original: specs/consensus.qnt (unchanged)
- Refactored: ./refactored/consensus.qnt (new version)

