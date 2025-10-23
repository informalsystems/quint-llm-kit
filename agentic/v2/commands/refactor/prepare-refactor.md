---
command: /refactor:prepare-refactor
description: Initialize workspace for refactoring operation
version: 4.0.0
---

# Refactor Prepare Command

## Objective

Initialize and validate workspace for refactoring operations, ensuring artifacts are valid and output dir is ready.

## Input Contract

### Required Parameters
- `refactor_plan`: Path to refactor-plan.json
- `spec_structure`: Path to spec-structure.json
- `output_dir`: Destination dir for refactored specs

### Optional Parameters
None

## Output Contract

### Success
```json
{
 "status": "ready",
 "workspace": {
 "output_dir": "./refactored",
 "created": true
 },
 "validated_artifacts": {
 "refactor_plan": "valid",
 "spec_structure": "valid"
 },
 "plan_summary": {
 "modules": 2,
 "total_changes": 7,
 "adds": 4,
 "modifies": 2,
 "removes": 1
 },
 "summary": "Workspace ready for 2 modules with 7 changes"
}
```

### Warning (Can Proceed)
```json
{
 "status": "warning",
 "workspace": {"output_dir": "...", "created": true},
 "issues": [
 "Module 'Bridge' in plan not found in structure",
 "Line 45 referenced in plan, but spec only has 40 lines"
 ],
 "can_proceed": true,
 "recommendation": "Review inconsistencies before proceeding"
}
```

### Failure
```json
{
 "status": "failed",
 "error": "Specific error description",
 "phase": "validate_artifacts | create_workspace | cross_check"
}
```

## Execution Procedure

### Phase 1: Artifact Validation

Objective: Verify planning artifacts are valid and complete.

Steps:

1. **Load Artifacts**
 - Run: Read refactor_plan from path
 - Run: Read spec_structure from path
 - Action on missing file: Return error "Artifact not found: <path>"

2. **Validate Schemas**
 - Check: refactor_plan conforms to `schemas/refactor-plan.json`
 - Check: spec_structure conforms to `schemas/spec-structure.json`
 - If validation fails: Return error with specific schema violations
 - If validation passes: Proceed to Phase 2

3. **Extract Metadata**
 - From refactor_plan:
 - Extract: Module list with changes
 - Extract: Total change counts by type (add/modify/remove)
 - Extract: Patterns to apply
 - Extract: Validation plan
 - From spec_structure:
 - Extract: Module definitions
 - Extract: File paths

### Phase 2: Workspace Creation

Objective: Create separate output dir for refactored specs.

Steps:

4. **Check Output Directory**
 - Check: `output_dir` exists:
 - If exists and contains .qnt files:
 - Return error "Output dir contains .qnt files - choose different dir or remove existing files"
 - If exists and empty: Use it
 - If not exists: Proceed to create
 - Action on check failure: Return error with specific issue

5. **Create Directory**
 - Run: Create `output_dir` directory
 - Check: Write permissions on created directory
 - Action on failure: Return error "Cannot write to output directory"

6. **Verify Workspace Isolation**
 - Check: `output_dir` is different from source spec directories
 - If same: Return error "Output dir must be separate from source specs"
 - Purpose: Ensure originals remain untouched

### Phase 3: Cross-Check Plan vs Structure

Objective: Verify refactor plan references valid modules and elements.

Steps:

7. **Validate Module References**
 - Per module M in refactor_plan.modules:
 - Check: Module M exists in spec_structure.modules
 - If not found: Add issue "Module '<name>' in plan not found in structure"

8. **Validate Change References**
 - Per change in module:
 - If change type == MODIFY or REMOVE:
 - Check: `line_ref` is specified
 - Check: Target element exists in spec_structure AST
 - If element not found: Add issue "Element '<name>' not found in module"
 - If change type == ADD:
 - Check: Name does not conflict with existing definitions
 - If conflict: Add issue "Name '<name>' already exists in module"

9. **Collect Inconsistencies**
 - Aggregate all issues found in steps 7-8
 - Classify issues:
 - Errors: Module not found, invalid schema
 - Warnings: Line reference mismatch, element not found (may be acceptable)

### Phase 4: Generate Summary

Objective: Provide overview of planned refactoring.

Steps:

10. **Calculate Statistics**
 - Count: Total modules affected
 - Count: Changes by type (adds, modifies, removes)
 - Extract: Patterns to apply
 - Extract: Validation commands queued

11. **Assess Readiness**
 - If critical issues found: Set `status = "failed"`
 - If warnings only: Set `status = "warning"`, `can_proceed = true`
 - If no issues: Set `status = "ready"`

12. **Return Response**
 - Include: Workspace details
 - Include: Validation results
 - Include: Plan summary statistics
 - Include: Issues list (if any)
 - Include: Next step recommendation

## Tools Used

- `Read`: Load JSON artifacts
- `Bash(mkdir)`: Create output directory
- `Bash(ls)`: Check dir contents

## Error Handling

### Missing Artifact
- **Condition**: `refactor_plan` or `spec_structure` file not found
- **Action**: Return error "Artifact not found: <path>"
- **Recovery**: Ensure analyzer completed successfully, check file paths

### Schema Validation Failure
- **Condition**: Artifact does not conform to expected schema
- **Action**: Return error with specific schema violations
- **Recovery**: Re-run analyzer to regenerate valid artifacts

### Plan/Structure Inconsistency
- **Condition**: Module in plan not found in structure, or line references invalid
- **Action**:
 - If critical: Return error "Cannot proceed with invalid plan"
 - If minor: Return warning with issues list, allow proceeding
- **Recovery**: Review and fix plan manually, or re-run analyzer

### Permission Denied
- **Condition**: Cannot create or write to `output_dir`
- **Action**: Return error "Cannot write to output directory: permission denied"
- **Recovery**: Fix dir permissions or choose different output directory

### Output Directory Conflict
- **Condition**: `output_dir` same as source dir or contains existing .qnt files
- **Action**: Return error with specific conflict description
- **Recovery**: Choose different output dir or clean existing directory

## Example Execution

**Input**:
```
/refactor:prepare-refactor \
 --refactor_plan=.artifacts/refactor-plan.json \
 --spec_structure=.artifacts/spec-structure.json \
 --output_dir=./refactored
```

**Process**:
1. Load refactor-plan.json: Valid, 2 modules, 7 changes
2. Load spec-structure.json: Valid, 2 modules defined
3. Validate schemas: Both conform
4. Check output directory: Doesn't exist
5. Create ./refactored: Success
6. Cross-check: Module "Consensus" found in structure
7. Cross-check: Module "Types" found in structure
8. Validate change references: All elements exist
9. Calculate statistics: 4 adds, 2 modifies, 1 remove
10. Assess readiness: No issues, status = ready

**Output**:
```json
{
 "status": "ready",
 "workspace": {
 "output_dir": "./refactored",
 "created": true
 },
 "validated_artifacts": {
 "refactor_plan": "valid",
 "spec_structure": "valid"
 },
 "plan_summary": {
 "modules": 2,
 "total_changes": 7,
 "adds": 4,
 "modifies": 2,
 "removes": 1,
 "patterns": ["thin-actions"],
 "validations": 6
 },
 "summary": "Workspace ready for 2 modules with 7 changes"
}
```

## Side Effects

**Directory Creation**:
- Creates `output_dir` dir if it doesn't exist
- This is a NEW workspace, completely separate from original specs

**No Modifications**:
- Does NOT modify any original spec files
- Does NOT pre-copy source files (copying happens during apply-refactor)
- Does NOT execute any refactoring operations

