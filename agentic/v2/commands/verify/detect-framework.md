---
command: /verify:detect-framework
description: Identify spec framework and catalog existing verification artifacts
version: 4.0.0
---

# Verify Detect Framework Command

## Objective

Determine specification framework type (standard or choreo) and catalog all existing tests, invariants, witnesses, and actions for test design guidance.

## Input Contract

### Required Parameters
- `spec_path`: Path to Quint spec file

### Optional Parameters
None

## Output Contract

### Success
```json
{
 "status": "completed",
 "framework": "standard" | "choreo",
 "existing_tests": [
 {"module": "ModuleName", "tests": [{"name": "testName", "line": 100}]}
 ],
 "existing_invariants": [
 {"module": "ModuleName", "invariants": [{"name": "invName", "line": 50}]}
 ],
 "existing_witnesses": [],
 "listeners": [],
 "actions": [{"name": "actionName", "line": 30}],
 "recommendation": "Design tests using specific pattern guidance"
}
```

### Failure
```json
{
 "status": "failed",
 "error": "Specific error description",
 "framework": null
}
```

## Execution Procedure

### Phase 1: Framework Detection

Objective: Determine if spec uses standard or choreo framework.

Steps:

1. **Read Spec File**
 - Run: Read file at `spec_path`
 - Action on missing file: Return error "Spec file not found"
 - Action on read failure: Return error "Cannot read spec file"

2. **Detect Framework Type**
 - Search file content for framework indicators:
 - Check imports for `choreo::` prefix:
 - If found: Set `framework = "choreo"`
 - Check for choreo-specific patterns:
 - Pattern `Transition` type usage
 - Pattern `choreo::s` references
 - Pattern listener definitions (`pure def listen_`)
 - If any found: Set `framework = "choreo"`
 - If no choreo indicators found:
 - Set `framework = "standard"`
 - Store framework type for output

### Phase 2: Extract Existing Tests

Objective: Catalog existing scenario tests.

Steps:

3. **Query for Run Definitions**
 - Run: `mcp__quint-lsp__textDocument/documentSymbol` (if available)
 - Extract symbols where kind = "run"
 - Per run definition:
 - Record: Name, line number, module name
 - Add to `existing_tests` array

4. **Fallback Text Search** (if LSP unavailable)
 - Run: Grep for pattern `run\s+(\w+)\s*=`
 - Extract: Test name and line number from matches
 - Add to `existing_tests` array

### Phase 3: Extract Invariants and Witnesses

Objective: Catalog existing properties for verification.

Steps:

5. **Extract Invariant Definitions**
 - Search for val definitions with boolean type:
 - Pattern: `val\s+(\w+)\s*=.*`
 - Filter by naming convention (agreement, validity, safety, etc.)
 - Per potential invariant:
 - Check if used in previous verification (optional)
 - Record: Name, line number, module name
 - Add to `existing_invariants` array

6. **Extract Witness Definitions**
 - Search for val definitions representing liveness properties:
 - Typically negated conditions
 - Naming patterns: canProgress, canDecide, eventually_*
 - Per witness:
 - Record: Name, line number, module name
 - Add to `existing_witnesses` array

### Phase 4: Framework-Specific Analysis

Objective: Extract framework-specific elements for test design guidance.

Steps:

7. **Choreo Framework Analysis** (if `framework == "choreo"`)
 - Extract listeners:
 - Pattern: `pure def listen_(\w+)`
 - Record: Name, line number
 - Add to `listeners` array
 - Extract cue types:
 - Search for type definitions used in listeners
 - Identify transition actions:
 - Pattern: Actions returning `Transition` type
 - Add to `actions` array
 - Generate choreo-specific recommendation:
 ```
 "Design tests using choreo pattern: .then(\"nodeId\".with_cue(listener, data).perform(action)). Reference existing test <name> as template."
 ```

8. **Standard Framework Analysis** (if `framework == "standard"`)
 - Extract all actions:
 - Pattern: `def\s+(\w+).*:\s*bool` OR actions modifying state
 - Record: Name, line number
 - Add to `actions` array
 - Extract state variables:
 - Pattern: `var\s+(\w+)`
 - Record for context (not returned in output)
 - Generate standard-specific recommendation:
 ```
 "Design tests using standard pattern: .then(action(params))"
 ```

### Phase 5: Generate Recommendation

Objective: Provide actionable guidance for test design phase.

Steps:

9. **Build Recommendation String**
 - Include framework-specific pattern guidance
 - If existing tests found:
 - Reference test names as templates
 - Example: "Reference existing test happyPathTest as template"
 - If no existing tests:
 - Recommend KB document reference
 - Example: "Reference quint-kb documentation on [framework] testing patterns"

10. **Construct Output JSON**
 - Assemble all extracted information:
 - Framework type
 - Existing tests array
 - Existing invariants array
 - Existing witnesses array
 - Listeners array (choreo only)
 - Actions array
 - Recommendation string
 - Use empty arrays `[]` for missing data (NOT null)

11. **Return Success Response**
 - Return: Complete JSON structure
 - Status: "completed"

## Tools Used

- `Read`: Read spec file contents
- `Grep`: Search for definition patterns
- MCP `quint-lsp__textDocument/documentSymbol`: Extract symbols (if available)
- MCP `quint-kb__quint_get_doc`: Fetch framework docs for recommendations (optional)

## Error Handling

### File Not Found
- **Condition**: `spec_path` does not exist
- **Action**: Return error "Spec file not found"
- **Recovery**: User must provide valid spec file path

### Read Failure
- **Condition**: File exists but cannot be read (permissions, encoding)
- **Action**: Return error "Cannot read spec file: <reason>"
- **Recovery**: Fix file permissions or encoding issues

### Ambiguous Framework
- **Condition**: File contains choreo imports but no choreo patterns
- **Action**:
 - Set `framework = "standard"` (safe default)
 - Add warning to output: "Found choreo imports but no choreo patterns - assuming standard"
- **Recovery**: Manual verification or framework annotation in spec

### LSP Unavailable
- **Condition**: MCP quint-lsp tools not accessible
- **Action**: Fall back to grep-based text search
- **Recovery**: Extract what's possible with regex, continue with degraded quality

## Example Execution

### Example 1: Choreo Spec

**Input**:
```
/verify:detect-framework specs/consensus.qnt
```

**Spec Content** (excerpt):
```quint
module consensus {
 import choreo::s.*

 pure def listen_proposal = ...
 pure def listen_prevote = ...

 val agreement = ...
 val validity = ...

 run happyPathTest = ...
}
```

**Process**:
1. Read specs/consensus.qnt
2. Detect framework: Found `import choreo::s` → choreo
3. Extract tests: Found 1 run definition "happyPathTest"
4. Extract invariants: Found "agreement", "validity"
5. Extract listeners: Found "listen_proposal", "listen_prevote"
6. Generate recommendation with choreo pattern

**Output**:
```json
{
 "status": "completed",
 "framework": "choreo",
 "existing_tests": [
 {
 "module": "consensus",
 "tests": [{"name": "happyPathTest", "line": 120}]
 }
 ],
 "existing_invariants": [
 {
 "module": "consensus",
 "invariants": [
 {"name": "agreement", "line": 45},
 {"name": "validity", "line": 50}
 ]
 }
 ],
 "existing_witnesses": [],
 "listeners": [
 {"name": "listen_proposal", "line": 60},
 {"name": "listen_prevote", "line": 75}
 ],
 "actions": [
 {"name": "broadcast_prevote", "line": 100},
 {"name": "decide", "line": 110}
 ],
 "recommendation": "Design tests using choreo pattern: .then(\"nodeId\".with_cue(listener, data).perform(action)). Reference existing test happyPathTest as template."
}
```

### Example 2: Standard Spec

**Input**:
```
/verify:detect-framework specs/token.qnt
```

**Spec Content** (excerpt):
```quint
module token {
 import quint::set.*

 var balances: NodeId -> Int

 def transfer(from: NodeId, to: NodeId, amount: Int): bool = ...
 def mint(to: NodeId, amount: Int): bool = ...

 val totalSupplyConstant = ...
}
```

**Process**:
1. Read specs/token.qnt
2. Detect framework: No choreo indicators → standard
3. Extract tests: None found
4. Extract invariants: Found "totalSupplyConstant"
5. Extract actions: Found "transfer", "mint"
6. Generate recommendation with standard pattern

**Output**:
```json
{
 "status": "completed",
 "framework": "standard",
 "existing_tests": [],
 "existing_invariants": [
 {
 "module": "token",
 "invariants": [{"name": "totalSupplyConstant", "line": 30}]
 }
 ],
 "existing_witnesses": [],
 "listeners": [],
 "actions": [
 {"name": "transfer", "line": 20},
 {"name": "mint", "line": 25}
 ],
 "recommendation": "Design tests using standard pattern: .then(action(params))"
}
```

## Quality Standards

**Checklist**:
- [ ] Framework detection is accurate (critical for test design)
- [ ] All existing tests listed with names and line numbers
- [ ] All invariants identified (even if not previously used)
- [ ] Actions include line numbers for reference
- [ ] Recommendation is actionable and framework-specific
- [ ] Ambiguous cases flagged with warnings

