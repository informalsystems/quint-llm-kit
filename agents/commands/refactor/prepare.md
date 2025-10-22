# Refactor Prepare Command

**Purpose**: Initialize workspace for refactoring operation.

**Version**: 2.0.0

## Arguments

```
/refactor/prepare \
  --refactor_plan=<path> \
  --spec_structure=<path> \
  --output_dir=<path>
```

- `refactor_plan`: Path to refactor-plan.json
- `spec_structure`: Path to spec-structure.json
- `output_dir`: Destination directory for refactored specs

## Output

Returns JSON:
```json
{
  "status": "ready",
  "workspace": {
    "output_dir": "path",
    "created": true
  },
  "validated_artifacts": {
    "refactor_plan": "valid",
    "spec_structure": "valid"
  },
  "summary": "Workspace ready for 3 modules"
}
```

## Process

### 1. Validate Artifacts
- Load refactor_plan.json and verify against schema
- Load spec_structure.json and verify against schema
- Check that all modules in plan exist in structure
- Flag any mismatches

### 2. Create Output Directory
- Create `output_dir` if it doesn't exist
- Verify write permissions
- Do NOT copy original specs (implementer will write fresh)

### 3. Cross-Check Plan vs Structure
For each module in refactor plan:
- Verify module exists in spec structure
- For "modify" changes, verify target element exists at line_ref
- For "remove" changes, verify element exists
- Collect any inconsistencies

### 4. Generate Manifest
Create summary of:
- Number of modules to refactor
- Total changes planned (adds, modifies, removes)
- Patterns to apply
- Validation commands queued

### 5. Return Status
- Success: All checks passed, workspace ready
- Warning: Minor inconsistencies found, can proceed with caution
- Failure: Critical issues prevent refactoring

## Error Handling

**Missing artifact:**
```json
{
  "status": "failed",
  "error": "refactor_plan not found at path",
  "recovery": "Ensure analyzer agent completed successfully"
}
```

**Schema mismatch:**
```json
{
  "status": "failed",
  "error": "refactor_plan missing required field 'objective'",
  "recovery": "Re-run analyzer or fix JSON manually"
}
```

**Plan/structure inconsistency:**
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

**Permission denied:**
```json
{
  "status": "failed",
  "error": "Cannot write to output_dir: permission denied",
  "recovery": "Check directory permissions or choose different output_dir"
}
```

## Example

Input:
```
/refactor/prepare \
  --refactor_plan=.artifacts/refactor-plan.json \
  --spec_structure=.artifacts/spec-structure.json \
  --output_dir=./refactored
```

Output:
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
    "patterns": ["thin-actions", "state-type"],
    "validations": 6
  },
  "summary": "Workspace ready for 2 modules with 7 changes"
}
```

## Side Effects

- Creates `output_dir` directory if it doesn't exist
- Does NOT modify any existing files
- Does NOT copy source files

## Performance

- Fast operation: <1s for typical plans
- Only validates JSON structure, doesn't parse actual .qnt files
