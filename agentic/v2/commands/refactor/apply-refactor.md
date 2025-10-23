---
command: /refactor:apply-refactor
description: Apply changes from refactor plan to Quint spec files in new workspace
version: 4.0.0
---

# Refactor Apply Command

## Objective

Execute refactor plan changes on spec file copy in new workspace, applying modifications iteratively with immediate verification after each change.

## Input Contract

### Required Parameters
- `spec_path`: Path to original spec file (READ ONLY - never modified)
- `refactor_plan`: Path to refactor-plan.json
- `module_name`: Which module from plan to apply changes to
- `output_path`: Destination path for refactored spec (REQUIRED - must be in new workspace)

### Optional Parameters
None

## Output Contract

### Success
```json
{
 "status": "completed",
 "modified_file": "./refactored/consensus.qnt",
 "changes_applied": {
 "added": ["TimeoutEvent", "handleTimeout"],
 "modified": ["step"],
 "removed": []
 },
 "verification": {
 "parse": "passed",
 "typecheck": "passed"
 },
 "iterations": 4
}
```

### Failure
```json
{
 "status": "failed",
 "error": "Specific error description",
 "phase": "setup | apply_changes | final_verification",
 "change_failed": "handleTimeout",
 "partial_changes": ["TimeoutEvent", "timeouts"],
 "recovery_steps": [
 "Fix parse error at line 45",
 "Retry with corrected syntax"
 ]
}
```

## Execution Procedure

### Phase 1: Setup and Planning

Objective: Copy original spec to workspace and prepare for modifications.

Steps:

1. **Copy Original to Output**
 - Run: Copy file from `spec_path` to `output_path`
 - Check: Copy successful, file readable
 - Action on failure: Return error "Cannot copy spec to output path"
 - **Critical**: Original at `spec_path` remains READ ONLY

2. **Verify Starting State**
 - Run: `quint parse <output_path>`
 - Run: `quint typecheck <output_path>`
 - If either fails: Return error "Original spec does not parse/typecheck"
 - Purpose: Ensure starting point is valid

3. **Load Refactor Plan**
 - Run: Read refactor_plan from path
 - Extract: Changes for specified `module_name`
 - If module not found: Return error "Module '<name>' not in plan"

4. **Order Changes by Dependency**
 - Sort changes by category:
 1. Types (needed for state vars and actions)
 2. Constants (needed for pure defs)
 3. State variables (needed for actions)
 4. Pure definitions (helper functions)
 5. Actions (depend on everything else)
 - Within category, order by dependencies if detectable
 - Store ordered change list

### Phase 2: Apply Changes Iteratively

Objective: Apply each change with immediate verification.

Steps:

5. **Per Change in Ordered List**:

 **ADD Operation**:

 a. **Determine Insertion Point**
 - Based on change.item category:
 - type: After module declaration, before constants
 - const: After types, before state vars
 - state: After constants, before pure defs
 - pure def: After state vars, before actions
 - action: After pure defs, before module end
 - Use Grep to find appropriate location markers
 - Reference `guidelines/implementation.md` for detailed heuristics

 b. **Generate Code**
 - Use change.details from plan
 - If pattern specified in plan: Apply pattern during generation
 - Example: If plan says "thin-actions" for this action → generate action + pure helper
 - Query KB for syntax if needed:
 - Run: `quint_get_doc` or `quint_get_example` for reference
 - Ensure proper indentation matching existing code

 c. **Insert Code**
 - Run: Edit tool to insert at determined location
 - Check: Insertion successful

 d. **Verify Immediately**
 - Run: `quint parse <output_path>`
 - If parse fails:
 - Consult `guidelines/implementation.md` for parse error recovery
 - Attempt fix (max 2 retries)
 - If still fails: Return error with recovery steps
 - Run: `quint typecheck <output_path>`
 - If typecheck fails:
 - Consult `guidelines/implementation.md` for type error recovery
 - Attempt fix (max 2 retries)
 - If still fails: Return error with recovery steps

 e. **Record Success**
 - Add change.name to changes_applied.added
 - Increment iteration count

 **MODIFY Operation**:

 a. **Locate Definition**
 - Use change.line_ref as starting point
 - Run: Read output_path at line_ref
 - Use Grep to find complete definition (handle multi-line)

 b. **Apply Modification**
 - Determine modification type from change.details:
 - Extend: Add new cases/branches
 - Update: Change specific expression
 - Refactor: Restructure while preserving semantics
 - Run: Edit tool with old_string/new_string
 - Reference `guidelines/implementation.md` for common patterns

 c. **Verify Immediately**
 - Run: Parse and typecheck as in ADD operation
 - Use LSP to verify semantics if available:
 - Run: `mcp__quint-lsp__textDocument/definition` to check references

 d. **Record Success**
 - Add change.name to changes_applied.modified

 **REMOVE Operation**:

 a. **Check Safety**
 - Use LSP to find references:
 - Run: `mcp__quint-lsp__textDocument/references` for element
 - If references exist: Flag warning, continue only if safe

 b. **Locate Complete Definition**
 - Use Grep to find definition boundaries
 - Include all lines (handle multi-line definitions)

 c. **Remove**
 - Run: Edit tool to remove complete definition

 d. **Verify Immediately**
 - Run: Parse and typecheck

 e. **Record Success**
 - Add change.name to changes_applied.removed

6. **Handle Change Failure**
 - If change fails after retries:
 - Record: Which change failed
 - Record: Changes successfully applied so far
 - Return: Partial failure with recovery steps

### Phase 3: Final Verification

Objective: Comprehensive validation of refactored spec.

Steps:

7. **Comprehensive Checks**
 - Run: `quint parse <output_path>`
 - Run: `quint typecheck <output_path>`
 - If either fails: Return error "Final verification failed" with details

8. **Verify Plan Goals**
 - Per change in plan:
 - Check: Change was applied successfully
 - If any missing: Return error "Not all changes applied"

9. **Optional: Run Existing Tests**
 - If spec has existing tests:
 - Run: `quint test <output_path>`
 - If tests fail: Include warning in response (not fatal)

### Phase 4: Report

Objective: Return detailed results.

Steps:

10. **Construct Response**
 - Include: Modified file path
 - Include: Changes applied (categorized)
 - Include: Verification results
 - Include: Iteration count
 - Include: Any warnings

11. **Return Success**
 - Status: "completed"
 - All requested changes applied and verified

## Tools Used

- `Read`: Read spec file and plan
- `Write`: Initial copy of spec to output
- `Edit`: Apply modifications to spec
- `Grep`: Find definitions and insertion points
- `Bash(quint)`: Parse, typecheck, test commands
- MCP `quint-lsp`: Semantic verification (optional)
- MCP `quint-kb`: Syntax reference queries (optional)

## Error Handling

### Copy Failure
- **Condition**: Cannot copy `spec_path` to `output_path`
- **Action**: Return error "Cannot copy spec to output path: <reason>"
- **Recovery**: Check file permissions, verify paths are valid

### Parse Error After Change
- **Condition**: `quint parse` fails after applying change
- **Action**:
 - Identify: Syntax error location
 - Consult: `guidelines/implementation.md` for recovery patterns
 - Retry: Fix syntax (max 2 attempts)
 - If unrecoverable: Return error with partial changes and recovery steps
- **Recovery**: Review generated code syntax, query KB for correct pattern

### Type Error After Change
- **Condition**: `quint typecheck` fails after applying change
- **Action**:
 - Identify: Type mismatch details
 - Check: Imports are correct
 - Check: Type definitions match usage
 - Retry: Fix types (max 2 attempts)
 - If unrecoverable: Return error with recovery steps
- **Recovery**: Add missing imports, correct type annotations

### Change Not Applicable
- **Condition**: Cannot apply change (e.g., modify line that doesn't exist)
- **Action**: Skip change, add warning to output
- **Recovery**: Review refactor plan, update if needed

### Final Verification Failure
- **Condition**: All changes applied but final parse/typecheck fails
- **Action**: Return error with full change list and failure details
- **Recovery**: Manual review required, possible interaction between changes

## Implementation Guidelines

For detailed implementation strategies, consult `guidelines/implementation.md`:

**Insertion Heuristics**:
- Where to place each type of definition
- How to maintain code organization
- Handling edge cases (empty modules, etc.)

**Code Generation Patterns**:
- KB queries for syntax
- Pattern application during generation
- Indentation and formatting

**Modification Patterns**:
- Extending actions with new cases
- Updating state transitions
- Refactoring while preserving semantics

**Error Recovery**:
- Parse error diagnosis and fixes
- Type error resolution strategies
- Semantic error handling

## Quality Checklist

After completion:
- [ ] All changes from refactor plan applied
- [ ] Spec parses without errors
- [ ] Spec typechecks without errors
- [ ] No unintended modifications
- [ ] Indentation and formatting preserved
- [ ] Patterns applied during code generation (not post-processing)

