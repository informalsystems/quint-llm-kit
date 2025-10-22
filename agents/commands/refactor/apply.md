# Refactor Apply Command

**Purpose**: Apply changes from refactor plan to Quint spec files, modifying structure while preserving correctness.

**Version**: 3.0.0

## Arguments

```
/refactor/apply \
  --spec_path=<path> \
  --refactor_plan=<path> \
  --module_name=<name> \
  [--output_path=<path>]
```

- `spec_path`: Path to original spec file
- `refactor_plan`: Path to refactor-plan.json
- `module_name`: Which module from plan to apply
- `output_path`: Optional destination (default: overwrite spec_path)

## Output

Returns JSON:
```json
{
  "status": "completed",
  "modified_file": "path/to/spec.qnt",
  "changes_applied": {
    "added": ["TimeoutEvent", "handleTimeout"],
    "modified": ["step"],
    "removed": []
  },
  "verification": {
    "parse": "passed",
    "typecheck": "passed"
  }
}
```

## Process

This is the most complex command. Take an **iterative approach**: apply one change, verify, repeat.

### Phase 1: Setup and Planning

1. Load refactor plan and extract changes for specified module
2. Order changes strategically:
   - Types first (needed for state vars and actions)
   - State variables second (needed for actions)
   - Pure definitions third (helper functions)
   - Actions last (depend on everything else)
3. Verify starting state: `quint parse` and `quint typecheck` must pass

### Phase 2: Apply Changes (Iterative)

**For each change in ordered list**, follow detailed implementation strategies in `guidelines/implementation.md`:

#### ADDING New Definitions

1. Determine insertion point using Grep and heuristics (see guideline)
2. Generate code from plan details (use KB for syntax)
3. Insert using Edit tool
4. Verify immediately with parse/typecheck
5. Document change

#### MODIFYING Existing Definitions

1. Locate definition using Grep
2. Read current implementation
3. Determine modification type
4. Apply using Edit tool (see common patterns in guideline)
5. Verify immediately
6. Use LSP to verify semantics

#### REMOVING Definitions

1. Check safety using LSP references
2. Locate complete definition
3. Remove using Edit tool
4. Verify with parse/typecheck

### Phase 3: Final Verification

1. Comprehensive parse/typecheck
2. Run existing tests if any
3. Verify refactor plan goals met
4. Generate diff if baseline exists

### Phase 4: Report

Return structured JSON with changes applied, verification results, and any warnings.

## Implementation Guidelines

For detailed guidance, see `guidelines/implementation.md`.

The guideline contains:
- Insertion heuristics for all definition types
- Code generation patterns with KB usage
- Common modification patterns (with examples)
- Error recovery strategies (parse, type, semantic errors)
- Tool usage patterns
- Complete implementation examples
- Quality checklist

## Error Recovery

Consult guideline for detailed recovery strategies:
- **Parse errors**: KB queries, alternate insertion points, syntax fixes
- **Type errors**: Import checks, LSP inspection, type rules
- **Semantic errors**: LSP verification, pattern checks, user review

## Quality Checklist

After applying all changes:
- [ ] All changes from refactor plan applied
- [ ] Spec parses without errors
- [ ] Spec typechecks without errors
- [ ] No unintended modifications (check diff)
- [ ] Indentation and formatting preserved


