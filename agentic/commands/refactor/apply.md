---
command: /refactor:apply
description: Apply changes from refactor plan to Quint spec files in new workspace
version: 4.0.0
---

# Refactor Apply Command

## Objective

Execute refactor plan changes on spec file copy in new workspace, applying modifications iteratively with immediate verification after each change.

## File Operation Constraints

**CRITICAL**: Refactored specs MUST be written to workspace (typically `refactored/`).
- NEVER use `/tmp` or system temp directories
- NEVER modify original spec files (spec_path is READ ONLY)
- Output path must be within workspace

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
      - Reference `.claude/guidelines/implementation.md` for detailed heuristics

   b. **Generate Code**
      - Use change.details from plan
      - If pattern specified in plan: Apply pattern during generation
      - Example: If plan says "thin-actions" for this action → generate action + pure helper
      - Query KB for syntax if needed:
        - Run: `quint_get_doc` or `quint_get_example` for reference
      - Ensure proper indentation matching existing code

   c. **Insert Code** (LSP edit_file)
      - Call: `mcp__quint-lsp__edit_file` with:
        ```json
        {
          "filePath": "<output_path>",
          "edits": [
            {
              "range": {
                "start": {"line": <insert_line>, "character": 0},
                "end": {"line": <insert_line>, "character": 0}
              },
              "newText": "<generated_code>"
            }
          ]
        }
        ```
      - Benefit: Atomic edit operation with LSP awareness
      - Check: Edit applied successfully

   d. **Verify Immediately** (CLI + LSP validation)
      - Run: `quint parse <output_path>` (PRIMARY validation)
      - If parse fails:
        - Consult `.claude/guidelines/implementation.md` for parse error recovery
        - Iterate fix attempts until parse succeeds or cannot proceed
        - If cannot proceed: Return error with recovery steps
      - Run: `quint typecheck <output_path>` (PRIMARY validation)
      - If typecheck fails:
        - Consult `.claude/guidelines/implementation.md` for type error recovery
        - Iterate fix attempts until typecheck succeeds or cannot proceed
        - If cannot proceed: Return error with recovery steps
      - Call: `mcp__quint-lsp__diagnostics` with filePath=<output_path> (ENHANCED validation)
      - Parse LSP response for additional insights:
        - Warnings: Best practice violations, unused vars
        - Suggestions: Code quality improvements
      - Purpose: CLI is source of truth, LSP provides extra feedback
      - Tight feedback loop: Catch errors immediately after each change

   e. **Record Success**
      - Add change.name to changes_applied.added
      - Increment iteration count

   **MODIFY Operation**:

   a. **Locate Definition**
      - Use change.line_ref as starting point
      - Run: Read output_path at line_ref
      - Use Grep to find complete definition (handle multi-line)

   b. **Apply Modification** (LSP edit_file)
      - Determine modification type from change.details:
        - Extend: Add new cases/branches
        - Update: Change specific expression
        - Refactor: Restructure while preserving semantics
      - Call: `mcp__quint-lsp__edit_file` with:
        ```json
        {
          "filePath": "<output_path>",
          "edits": [
            {
              "range": {
                "start": {"line": <start_line>, "character": <start_char>},
                "end": {"line": <end_line>, "character": <end_char>}
              },
              "newText": "<modified_code>"
            }
          ]
        }
        ```
      - Benefit: Atomic replacement with position-aware editing
      - Reference `.claude/guidelines/implementation.md` for common patterns

   c. **Verify Immediately** (CLI + LSP validation)
      - Run: `quint parse <output_path>` (PRIMARY)
      - Run: `quint typecheck <output_path>` (PRIMARY)
      - If either fails: Apply recovery from `.claude/guidelines/implementation.md`
      - Call: `mcp__quint-lsp__diagnostics` with filePath=<output_path> (ENHANCED)
      - Parse LSP response for warnings and suggestions
      - Check: No new errors compared to pre-modification state

   d. **Record Success**
      - Add change.name to changes_applied.modified

   **REMOVE Operation**:

   a. **Check Safety** (LSP references)
      - Call: `mcp__quint-lsp__references` with symbolName="ModuleName.elementName"
      - Parse response to find all usages
      - If references exist:
        - Count: Total reference locations
        - Check: Are all references in refactor plan as intentional removals?
        - If unintended references: Return error "Cannot safely remove '<name>' - still referenced"
      - Purpose: Prevent breaking changes

   b. **Locate Complete Definition**
      - Use Grep to find definition boundaries
      - Include all lines (handle multi-line definitions)

   c. **Remove** (LSP edit_file)
      - Call: `mcp__quint-lsp__edit_file` with:
        ```json
        {
          "filePath": "<output_path>",
          "edits": [
            {
              "range": {
                "start": {"line": <def_start_line>, "character": 0},
                "end": {"line": <def_end_line + 1>, "character": 0}
              },
              "newText": ""
            }
          ]
        }
        ```
      - Removes complete definition including blank lines

   d. **Verify Immediately** (CLI + LSP validation)
      - Run: `quint parse <output_path>` (PRIMARY)
      - Run: `quint typecheck <output_path>` (PRIMARY)
      - Call: `mcp__quint-lsp__diagnostics` with filePath=<output_path> (ENHANCED)
      - Check: No undefined symbol errors for legitimate code
      - Expected: May show errors if removed symbol was referenced (should have been caught in step a)

   e. **Record Success**
      - Add change.name to changes_applied.removed

   **RENAME Operation** (if supported by plan):

   a. **Validate Symbol Exists**
      - Call: `mcp__quint-lsp__definition` with symbolName="ModuleName.oldName"
      - Verify: Symbol found and is renamable
      - If not found: Return error "Cannot rename - symbol '<name>' not found"

   b. **Check Impact** (LSP references)
      - Call: `mcp__quint-lsp__references` with symbolName="ModuleName.oldName"
      - Count: Total references that will be updated
      - Extract: Affected files and line numbers
      - Purpose: User awareness of rename scope

   c. **Perform Rename** (LSP rename_symbol)
      - Call: `mcp__quint-lsp__rename_symbol` with:
        ```json
        {
          "filePath": "<output_path>",
          "line": <symbol_line>,
          "column": <symbol_column>,
          "newName": "<new_name>"
        }
        ```
      - Benefit: Safely updates all references in file atomically
      - LSP handles: Definition + all usages automatically

   d. **Verify Immediately** (CLI + LSP validation)
      - Run: `quint parse <output_path>` (PRIMARY)
      - Run: `quint typecheck <output_path>` (PRIMARY)
      - Call: `mcp__quint-lsp__diagnostics` with filePath=<output_path> (ENHANCED)
      - Check: No undefined symbols from rename
      - Check: No duplicate definition errors
      - Expected: Clean validation after successful rename

   e. **Record Success**
      - Add: "oldName → newName" to changes_applied.renamed

6. **Handle Change Failure**
   - If change fails and cannot proceed further:
     - Record: Which change failed
     - Record: Changes successfully applied so far
     - Return: Partial failure with recovery steps

### Phase 3: Final Verification

Objective: Comprehensive validation of refactored spec.

Steps:

7. **Comprehensive Checks** (CLI primary + LSP enhanced)
   - Run: `quint parse <output_path>` (PRIMARY validation - source of truth)
   - Run: `quint typecheck <output_path>` (PRIMARY validation - source of truth)
   - If either fails: Return error "Final verification failed" with details
   - Call: `mcp__quint-lsp__diagnostics` with filePath=<output_path> (ENHANCED validation)
   - Parse LSP response:
     - Warnings: Code quality issues (unused vars, etc.)
     - Suggestions: Best practices
   - Purpose: CLI determines pass/fail, LSP provides additional insights

8. **Verify Plan Goals**
   - Per change in plan:
     - Check: Change was applied successfully
     - If any missing: Return error "Not all changes applied"

9. **Verify Spec Executability and Run Existing Tests**
   - Run: `quint run <output_path> --max-steps=100 --backend=rust` 
   - Check: Spec can execute without errors
   - If run fails: Include warning in response (not fatal)
   - If spec has existing tests:
     - Check: Is module parameterized (from refactor_plan metadata)
     - If parameterized:
       - Run: `quint test <output_path> --main=<param_module_name> --match=<test_name>`
     - If not parameterized:
       - Run: `quint test <output_path> --match=<test_name>`
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
- `Edit`: Fallback for simple edits (prefer LSP edit_file)
- `Grep`: Find definitions and insertion points
- `Bash(quint)`: Parse, typecheck commands (PRIMARY validation - source of truth)
- MCP `quint-lsp` (critical enhancements):
  - `mcp__quint-lsp__edit_file` - Atomic, position-aware code edits (all ADD/MODIFY/REMOVE)
  - `mcp__quint-lsp__diagnostics` - Enhanced validation after each change (warnings, suggestions, additional insights)
  - `mcp__quint-lsp__references` - Safety checks before REMOVE operations, impact analysis for RENAME
  - `mcp__quint-lsp__rename_symbol` - Safe atomic rename with automatic reference updates
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
  - Consult: `.claude/guidelines/implementation.md` for recovery patterns
  - Iterate: Fix syntax until parse succeeds or cannot proceed
  - If cannot proceed: Return error with partial changes and recovery steps
- **Recovery**: Review generated code syntax, query KB for correct pattern

### Type Error After Change
- **Condition**: `quint typecheck` fails after applying change
- **Action**:
  - Identify: Type mismatch details
  - Check: Imports are correct
  - Check: Type definitions match usage
  - Iterate: Fix types until typecheck succeeds or cannot proceed
  - If cannot proceed: Return error with recovery steps
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

For detailed implementation strategies, consult `.claude/guidelines/implementation.md`:

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

