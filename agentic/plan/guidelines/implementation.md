# Implementer: Code Generation and Modification Guidelines

**Version**: 4.0.0

**Purpose**: Reference for applying spec changes with insertion rules, code generation patterns, and error recovery protocols.

**When to use**: During apply command when implementing ADD, MODIFY, and REMOVE operations.

---

## Insertion Point Decision Matrix

### TYPE Definitions

| Scenario | Insertion Point | Detection Method |
|----------|----------------|------------------|
| **After imports** | Last line starting with `import` + 1 blank line | `grep -n "^import " <spec_path> \| tail -1` |
| **Before state vars** | Line before first `var` declaration - 1 | `grep -n "^var " <spec_path> \| head -1` |
| **Before definitions** | Line before first `def` or `pure def` - 1 | `grep -n "^\\(pure \\)\\?def " <spec_path> \| head -1` |
| **Fallback** (no vars/defs) | After module opening brace + 1 blank line | `grep -n "module.*{" <spec_path>` + 2 |

**Decision Logic**:
```
Find: last_import_line = grep "^import " | tail -1
Find: first_var_line = grep "^var " | head -1
Find: first_def_line = grep "^def " | head -1

If last_import_line exists:
  insertion_point = last_import_line + 2
Else if first_var_line exists:
  insertion_point = first_var_line - 1
Else if first_def_line exists:
  insertion_point = first_def_line - 1
Else:
  Find: module_line = grep "module.*{"
  insertion_point = module_line + 2
```

### STATE VARS

| Scenario | Insertion Point | Detection Method |
|----------|----------------|------------------|
| **After types** | Last type definition + 1 blank line | `grep -n "^type " <spec_path> \| tail -1` |
| **Before pure defs** | Line before first `pure def` - 1 | `grep -n "^pure def " <spec_path> \| head -1` |
| **Group with vars** | After last existing `var` declaration | `grep -n "^var " <spec_path> \| tail -1` |
| **Fallback** | After types section or before definitions | Use TYPE fallback logic |

**Decision Logic**:
```
Find: last_var_line = grep "^var " | tail -1
Find: last_type_line = grep "^type " | tail -1
Find: first_pure_def_line = grep "^pure def " | head -1

If last_var_line exists (group with existing vars):
  insertion_point = last_var_line + 1
Else if last_type_line exists:
  insertion_point = last_type_line + 2
Else if first_pure_def_line exists:
  insertion_point = first_pure_def_line - 1
Else:
  Use TYPE fallback
```

### PURE DEFS

| Scenario | Insertion Point | Detection Method |
|----------|----------------|------------------|
| **After state vars** | Last `var` declaration + 1 blank line | `grep -n "^var " <spec_path> \| tail -1` |
| **Before actions** | Line before first non-pure `def` - 1 | `grep -n "^def [^=]*=" <spec_path> \| head -1` |
| **Group related** | Near similar pure defs (same domain) | Read context, place near related functions |

**Decision Logic**:
```
Find: last_var_line = grep "^var " | tail -1
Find: last_pure_def_line = grep "^pure def " | tail -1
Find: first_action_line = grep "^def " (not "pure def") | head -1

If last_pure_def_line exists AND related:
  insertion_point = last_pure_def_line + 1
Else if last_var_line exists:
  insertion_point = last_var_line + 2
Else if first_action_line exists:
  insertion_point = first_action_line - 1
Else:
  After state vars section
```

### ACTIONS

| Scenario | Insertion Point | Detection Method |
|----------|----------------|------------------|
| **After pure defs** | Last `pure def` + 1 blank line | `grep -n "^pure def " <spec_path> \| tail -1` |
| **Near related action** | Adjacent to action being modified | If modifying `step`, place near `step` |
| **Before init** | Line before `def init` - 1 | `grep -n "^def init" <spec_path>` |
| **Fallback** | After all pure defs, before tests | End of definitions section |

**Decision Logic**:
```
If modifying existing action:
  Find: target_action_line = grep "def <action_name>"
  insertion_point = target_action_line + <action_length> + 1
Else:
  Find: last_pure_def_line = grep "^pure def " | tail -1
  Find: init_line = grep "^def init"

  If last_pure_def_line exists:
    insertion_point = last_pure_def_line + 2
  Else if init_line exists:
    insertion_point = init_line - 1
  Else:
    After state vars section
```

---

## Code Generation Protocol

### Step 1: Query KB for Syntax (if unfamiliar)

**When**: Generating new code element with uncertain syntax

**Commands**:
```bash
# For specific constructs
quint_get_example("union type definition")
quint_get_example("state variable with map type")
quint_get_doc("action definition syntax")

# For patterns
quint_hybrid_search("quint <element_type> syntax examples")
```

**Decision**:
```
If element_type in [unfamiliar_types]:
  Query KB: quint_get_example("<element_type>")
  Use returned syntax exactly
Else:
  Use known syntax pattern
```

### Step 2: Generate Code with Proper Formatting

**Indentation Detection**:
```
Read file at insertion area (5 lines before, 5 lines after)
Count leading spaces/tabs in existing definitions
Use same indentation style (spaces vs tabs, width)
```

**Blank Line Rules**:
```
Before new definition: Always add 1 blank line
After new definition:
  If followed by another definition: Add 1 blank line
  If last in section: No blank line
```

**Example Generation** (Union Type):

**Input** (from refactor plan):
```json
{
  "item": "type",
  "name": "TimeoutEvent",
  "details": "Union type: RequestTimeout | PrepareTimeout | CommitTimeout"
}
```

**Generation Logic**:
```
1. Parse details: Extract variant names
2. Query KB if needed: quint_get_example("union type")
3. Generate structure:
   type <name> =
     | <variant1>
     | <variant2>
     | <variant3>
4. Apply indentation (detect from file)
```

**Output**:
```quint
type TimeoutEvent =
  | RequestTimeout
  | PrepareTimeout
  | CommitTimeout
```

### Step 3: Insert with Edit Tool

**Insertion Strategy**:
```
1. Read file at insertion_point (get context)
2. Identify anchor text (line to insert before/after)
3. Construct old_string (anchor text)
4. Construct new_string (new code + anchor text)
5. Execute: Edit <file>, old_string, new_string
```

**Example**:
```
Insertion point: Line 30 (before first var)
Anchor text: "var round: Round"

old_string = "var round: Round"
new_string = "type TimeoutEvent =\n  | RequestTimeout\n  | PrepareTimeout\n  | CommitTimeout\n\nvar round: Round"

Edit consensus.qnt, old_string, new_string
```

---

## Modification Patterns

### Pattern 1: Adding to `any{}` Choices

**Detection**:
```
Plan details contains: "Add <action> to <target> choices"
Target action has: any { ... }
```

**Strategy**:
```
1. Find target action: grep "def <target>"
2. Read action definition: Read <file> lines <start>:<end>
3. Locate closing brace of any{}
4. Insert before closing brace with comma
```

**Original**:
```quint
def step = any {
  propose,
  prevote
}
```

**Modification**:
```
old_string = "  prevote\n}"
new_string = "  prevote,\n  precommit\n}"
```

**Result**:
```quint
def step = any {
  propose,
  prevote,
  precommit
}
```

### Pattern 2: Adding to `all{}` Conditions

**Detection**:
```
Plan details contains: "Add <condition> to <action>"
Target action has: all { ... }
```

**Strategy**:
```
1. Locate all{} block in action
2. Find last condition before closing brace
3. Insert new condition with comma
```

**Original**:
```quint
def propose = all {
  condition1,
  condition2
}
```

**Modification**:
```
old_string = "  condition2\n}"
new_string = "  condition2,\n  not(hasTimeout(round))\n}"
```

**Result**:
```quint
def propose = all {
  condition1,
  condition2,
  not(hasTimeout(round))
}
```

### Pattern 3: Extending State Variable Type

**Detection**:
```
Plan details contains: "Extend <var> type" OR "Add field to <var>"
```

**Strategy**:
```
1. Find var declaration: grep "^var <name>"
2. Read current type definition
3. Modify type (add field, union variant, etc.)
4. Replace var line
```

**Original**:
```quint
var state: { round: Int, votes: Set[Vote] }
```

**Modification**:
```
old_string = "var state: { round: Int, votes: Set[Vote] }"
new_string = "var state: { round: Int, votes: Set[Vote], timeouts: Set[TimeoutEvent] }"
```

### Pattern 4: Wrapping Existing Action

**Detection**:
```
Plan details contains: "Wrap <action> with <condition>" OR "Add precondition to <action>"
```

**Strategy**:
```
1. Read current action body
2. Wrap body with: all { <new_condition>, <old_body> }
3. Replace entire action
```

**Original**:
```quint
def propose =
  updateState(...)
```

**Modification**:
```
old_string = entire action
new_string = "def propose = all {\n  not(hasTimeout(round)),\n  updateState(...)\n}"
```

---

## Immediate Verification Protocol

### After EVERY Change

**Step 1: Parse Check**
```
Execute: quint parse <spec_path>
Check: exit_code == 0

If exit_code != 0:
  Proceed to Parse Error Recovery
Else:
  Proceed to Step 2
```

**Step 2: Typecheck**
```
Execute: quint typecheck <spec_path>
Check: exit_code == 0

If exit_code != 0:
  Proceed to Type Error Recovery
Else:
  Record: Change verified successfully
```

---

## Error Recovery Protocols

### Parse Error Recovery

**Detection**:
```
quint parse <spec_path> returns non-zero exit code
Error message displayed
```

**Analysis Decision Tree**:
```
Read error message
Extract: error_type, line_number, description

If error_type == "SyntaxError":
  Branch: Syntax Error Protocol
Else if error_type == "UnexpectedToken":
  Branch: Token Error Protocol
Else if line_number in [insertion_range]:
  Branch: Insertion Error Protocol
Else:
  Branch: Unknown Error Protocol
```

**Syntax Error Protocol**:
```
Step 1: Identify cause
  Common causes:
    - Missing closing brace: Count {}, add missing
    - Missing comma: Check list/record syntax
    - Wrong operator: Query KB for correct syntax
    - Typo in keyword: Check spelling

Step 2: Fix attempt 1
  If missing_brace:
    Add closing brace at appropriate location
  Else if missing_comma:
    Add comma to last list item
  Else if wrong_operator:
    Query KB: quint_get_doc("<construct> syntax")
    Replace with correct operator

Step 3: Retry parse
  If success: Continue
  Else: Attempt 2

Step 4: Fix attempt 2
  Query KB: quint_hybrid_search("common parse errors quint")
  Apply suggested fix

Step 5: Retry parse
  If success: Continue
  Else: Revert change, report to user
```

**Insertion Error Protocol**:
```
Step 1: Verify insertion point
  Read file around insertion_point
  Check: Is scope correct? (inside module, not inside another def)

Step 2: Try alternate insertion point
  If current: After line X
  Try: After line X+5 or X-5
  Regenerate with new insertion point

Step 3: Retry parse
  If success: Continue
  Else: Revert, report issue to user
```

**Example Recovery**:

**Scenario**: Parse error after adding type
```
Error: Unexpected token '}' at line 27
```

**Recovery Steps**:
```
1. Read lines 25-30
2. Notice: Missing closing pipe on union type
3. Fix:
   old = "type TimeoutEvent =\n  | RequestTimeout\n  | PrepareTimeout"
   new = "type TimeoutEvent =\n  | RequestTimeout\n  | PrepareTimeout\n  | CommitTimeout"
4. Retry: quint parse → success
```

### Type Error Recovery

**Detection**:
```
quint typecheck <spec_path> returns non-zero exit code
Error message contains type mismatch details
```

**Analysis Decision Tree**:
```
Read error message
Extract: error_location, expected_type, actual_type

If "not in scope":
  Branch: Scope Error Protocol
Else if "type mismatch":
  Branch: Type Mismatch Protocol
Else if "missing type annotation":
  Branch: Annotation Protocol
Else:
  Branch: Unknown Type Error Protocol
```

**Scope Error Protocol**:
```
Error format: "Type <Name> not in scope at line X"

Step 1: Verify definition exists
  Execute: grep "type <Name>" <spec_path>

  If not found:
    Add missing type definition
  Else:
    Proceed to Step 2

Step 2: Check module boundaries
  Read: Module declaration above error line
  Read: Module declaration above type definition

  If different modules:
    Check: Does import exist?
      If no: Add import statement
      If yes: Import might be wrong, check syntax

Step 3: Retry typecheck
  If success: Continue
  Else: Query KB about type visibility rules
```

**Type Mismatch Protocol**:
```
Error format: "Expected <TypeA>, got <TypeB> at line X"

Step 1: Analyze context
  Read: Code at line X
  Determine: Is this from our change or existing code?

  If from our change:
    Review refactor plan: What type should it be?
    Fix: Use correct type in generated code
  Else:
    Our change broke existing code
    Revert change, report to user

Step 2: Retry typecheck
```

**Annotation Protocol**:
```
Error format: "Missing type annotation for <name>"

Step 1: Add explicit type
  If name in refactor plan:
    Use type from plan details
  Else:
    Query KB: quint_hybrid_search("type inference <construct>")

Step 2: Add annotation
  Pattern: def <name>: <Type> = <body>

Step 3: Retry typecheck
```

**Example Recovery**:

**Scenario**: Type not in scope
```
Error: Type TimeoutEvent not in scope at line 75
  in action handleTimeout
```

**Recovery Steps**:
```
1. Verify TimeoutEvent exists:
   grep "type TimeoutEvent" consensus.qnt
   → Found at line 25

2. Check modules:
   Line 25 in module: Consensus
   Line 75 in module: Consensus (same module)

3. Check if TimeoutEvent defined AFTER usage:
   Line 25: TimeoutEvent definition
   Line 75: handleTimeout using TimeoutEvent
   → Order is correct

4. Read line 75 exactly:
   "pure def processTimeout(e: TimeoutEvent): Bool = ..."

5. Hypothesis: Maybe pure def needs to be after state vars?
   Query KB: quint_hybrid_search("quint type visibility rules")

6. Try fix: Move TimeoutEvent closer to usage
7. Retry typecheck → success
```

---

## Verification Checklist

Execute after each change (mandatory):

```
Step 1: Parse verification
  [ ] quint parse <spec_path> returns exit_code 0

  If fails: Execute Parse Error Recovery Protocol

Step 2: Typecheck verification
  [ ] quint typecheck <spec_path> returns exit_code 0

  If fails: Execute Type Error Recovery Protocol

Step 3: Change documentation
  [ ] Record: Changed <item_name> at line <X>
  [ ] Record: Verification status (parse ✓, typecheck ✓)
```

---

## Optional Verification Steps

**When**: After successful parse + typecheck, for high-risk changes

### LSP Hover Verification
```
Purpose: Verify types are as expected

Execute: mcp__quint-lsp__textDocument/hover {position: at new definition}
Check: Returned type matches expected type from plan
```

### Reference Verification (for MODIFY operations)
```
Purpose: Ensure all references still valid

Execute: mcp__quint-lsp__textDocument/references {position: at modified element}
Check: All references still valid (no broken references)
```

### Quick Simulation
```
Purpose: Ensure spec is executable

Execute: quint run <spec_path> --max-steps=5
Check: No runtime errors in first 5 steps
```

---

## Complete Change Application Example

**Refactor Plan**:
```json
{
  "item": "action",
  "name": "step",
  "change": "modify",
  "details": "Add handleTimeout to any{} choices in step action",
  "line_ref": 45
}
```

**Execution Steps**:

**Step 1: Locate target**
```bash
grep -n "def step" consensus.qnt
→ 45:def step = any {

Read consensus.qnt lines 45-50
```

**Step 2: Read current code**
```quint
def step = any {
  propose,
  prevote,
  precommit
}
```

**Step 3: Determine modification**
```
Pattern: Adding to any{} choices
Strategy: Insert before closing brace
New element: handleTimeout
```

**Step 4: Construct Edit**
```
old_string = "  precommit\n}"
new_string = "  precommit,\n  handleTimeout\n}"
```

**Step 5: Apply Edit**
```
Edit consensus.qnt, old_string, new_string
```

**Step 6: Immediate Verification**
```bash
quint parse consensus.qnt
→ Exit code: 0 ✓

quint typecheck consensus.qnt
→ Exit code: 0 ✓
```

**Step 7: Optional Verification**
```bash
# Verify handleTimeout exists
grep "def handleTimeout" consensus.qnt
→ 60:def handleTimeout = ...
✓ Definition exists

# LSP hover on step to check type
mcp__quint-lsp__textDocument/hover {line: 45, char: 5}
→ Returns: action type
✓ Type correct
```

**Step 8: Record Success**
```
Modified: step action at line 45
Change: Added handleTimeout to any{} choices
Verification: parse ✓, typecheck ✓, definition exists ✓
```

---

## Escalation Criteria

Stop and ask user for guidance if:

### Condition 1: Max Retry Attempts Exceeded
```
If parse_error_attempts >= 3:
  Revert: Last change
  Report: "Cannot fix parse error after 3 attempts: <error_details>"
  Ask: "How should I proceed?"
```

### Condition 2: Semantic Ambiguity
```
If refactor plan details unclear:
  Example: "Modify step action" (no specifics)
  Ask: "Refactor plan says 'modify step' but doesn't specify how. What modification should I make?"
```

### Condition 3: Breaking Change Detected
```
If change breaks existing functionality:
  Evidence: Typecheck fails in unrelated code
  Report: "Change to <element> broke <other_element> at line <X>"
  Ask: "This is a breaking change. Continue anyway?"
```

### Condition 4: Unsafe Removal
```
If removing element with references:
  Execute: mcp__quint-lsp__textDocument/references {at: element}
  If reference_count > 0:
    Report: "<element> has <count> references: <locations>"
    Ask: "Removing this will break references. Continue?"
```

---

## Quality Standards

### Before Marking Change as Complete

Check ALL conditions met:

- ✅ Generated code matches plan details exactly
- ✅ Insertion point is logical and maintains code organization
- ✅ Parse verification passed
- ✅ Typecheck verification passed
- ✅ All types and imports are in scope
- ✅ Indentation matches surrounding code
- ✅ Blank lines added appropriately
- ✅ No unintended side effects (no changes to unrelated code)
- ✅ Change documented with line number and verification status

Only when ALL conditions met: Mark change as successfully applied.

---

## Tool Usage Decision Matrix

| Task | Tool | Command Pattern |
|------|------|-----------------|
| Find insertion point | Grep | `grep -n "^<keyword> " <file>` |
| Read context | Read | `Read <file> lines <start>:<end>` |
| Find references | LSP | `mcp__quint-lsp__textDocument/references` |
| Check type | LSP | `mcp__quint-lsp__textDocument/hover` |
| Get syntax example | KB | `quint_get_example("<construct>")` |
| Apply change | Edit | `Edit <file>, old_string, new_string` |
| Verify parse | Bash | `quint parse <file>` |
| Verify types | Bash | `quint typecheck <file>` |
| Quick test | Bash | `quint run <file> --max-steps=5` |

---

## Version Notes

**v4.0.0 Changes**:
- Removed vague language ("should", "try to", "consider")
- Added insertion point decision matrix with explicit logic
- Added code generation protocol with numbered steps
- Transformed error recovery to decision trees with protocols
- Added complete example with verification steps
- Specified max retry attempts (3) before escalation
- Added escalation criteria with Boolean conditions
- Made verification checklist mandatory vs optional
