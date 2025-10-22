# Refactor/Apply: Implementation Guidelines

**Purpose**: Detailed implementation strategies for applying spec changes.

**When to use**: Throughout Phase 2 (Apply Changes) when implementing additions, modifications, and removals.

---

## Insertion Heuristics

### Finding the Right Location

Use Grep to find structural markers:

```bash
# Find module declaration
grep -n "module ${module_name}" <spec_path>

# Find section boundaries
grep -n "^type " <spec_path>     # Types section
grep -n "^var " <spec_path>      # State vars section
grep -n "^pure def " <spec_path> # Pure defs section
grep -n "^def " <spec_path>      # Actions section
```

### Insertion Rules by Type

#### TYPE Definitions
- **After**: imports (last line starting with `import`)
- **Before**: first `var` or `def`
- **Fallback**: after module opening brace + 1 blank line

#### STATE VARS
- **After**: types section
- **Before**: first `def` or `pure def`
- **Strategy**: Group with other vars (keep together)

#### PURE DEFS
- **After**: state vars
- **Before**: actions (non-pure defs)
- **Strategy**: Group related helpers together

#### ACTIONS
- **After**: pure defs
- **Strategy**: Near related actions (if modifying `step`, add near `step`)
- **Before**: `init` or test definitions

---

## Code Generation Patterns

### Using KB for Syntax

```bash
# Query KB for pattern
quint_hybrid_search("quint union type syntax")
quint_get_example("union type definition")
```

### Example: Generating a Union Type

From refactor plan:
```json
{
  "item": "type",
  "name": "TimeoutEvent",
  "change": "add",
  "details": "Union type: ProposeTimeout | PrevoteTimeout | PrecommitTimeout"
}
```

Generated code:
```quint
type TimeoutEvent =
  | ProposeTimeout
  | PrevoteTimeout
  | PrecommitTimeout
```

### Formatting Rules

- **Indentation**: Match surrounding code (detect from file)
- **Blank lines**: Add before new definition
- **Spacing**: Add blank line after if not last in section

---

## Common Modification Patterns

### Adding to `any{}` Choices

**Original:**
```quint
def step = any {
  propose,
  prevote
}
```

**Plan says**: "Add precommit to step choices"

**Strategy**: Find closing brace, insert before it

```bash
Old: "  prevote\n}"
New: "  prevote,\n  precommit\n}"
```

### Modifying Action Logic

**Original:**
```quint
def propose = all {
  condition1,
  condition2
}
```

**Plan says**: "Add timeout check to propose"

**Strategy**: Add to all{} conditions

```bash
Old: "  condition2\n}"
New: "  condition2,\n  not(hasTimeout(round))\n}"
```

---

## Verification Steps

### Immediate Verification

After each change:

```bash
quint parse <spec_path>
```

If parse fails:
1. Read error message carefully
2. Likely causes:
   - Syntax error in generated code
   - Wrong insertion point (breaks scope)
   - Missing import/dependency
3. Try fix:
   - Correct syntax using KB examples
   - Try alternate insertion point
   - Add missing import
4. If 3 attempts fail: revert change, report to user

If parse succeeds:
```bash
quint typecheck <spec_path>
```

If typecheck fails:
1. Read error message (often has line number and type issue)
2. Common issues:
   - Type not imported
   - Type definition incomplete
   - Name conflicts with existing
3. Fix and retry
4. If stuck: query KB for type rules

### Document Each Change

```
Added ${item_name} at line ${insertion_line}
Verified: parse ✓, typecheck ✓
```

---

## Error Recovery Strategies

### Parse Errors

**Detection:**
```bash
quint parse <spec_path>
# Exit code != 0
```

**Common Causes & Solutions:**

| Cause | Solution | Strategy |
|-------|----------|----------|
| Syntax error in generated code | Query KB for correct syntax | `quint_get_doc("type definition syntax")` |
| Wrong insertion point | Try alternate insertion point | Move down 5 lines, retry |
| Missing closing brace | Check generated code for balanced braces | Count `{` and `}`, add missing |
| Name collision | Append suffix | Try `_v2`, retry |

**Recovery Process:**
1. Revert last change (use Edit to undo)
2. Try fix (query KB, adjust code)
3. Retry change
4. If fails 3 times: ask user for guidance

### Type Errors

**Detection:**
```bash
quint typecheck <spec_path>
# Exit code != 0
# Output contains type mismatch details
```

**Common Causes & Solutions:**

| Cause | Solution | Example |
|-------|----------|---------|
| Type not in scope | Add import or define type | `grep "import" <spec_path>` |
| Incompatible types | Use type coercion or fix definition | `quint_hybrid_search("type coercion")` |
| Missing type annotation | Add explicit type | `def foo: Int = ...` |

**Recovery Process:**
1. Read typecheck error (usually very specific)
2. Identify problematic line/expression
3. Query KB for type rules
4. Fix and retry
5. If stuck: show error to user, ask for help

### Semantic Errors

**Detection:**
- Parses and typechecks but doesn't match intent
- LSP shows warnings
- Tests fail

**Verification:**
```bash
# Use LSP hover to check types
mcp__quint-lsp__textDocument/hover {position: at modified def}

# Check references updated correctly
mcp__quint-lsp__textDocument/references {position: at modified def}

# Run quick simulation
quint run <spec_path> --max-steps=10
```

**Recovery:**
- Review refactor plan details again
- Check similar patterns in spec
- Query KB for idioms
- Ask user to review change

---

## Tool Usage Patterns

### Finding Insertion Points

**Strategy 1: Use Grep to find sections**
```bash
grep -n "^type " spec.qnt    # Line 15: first type
grep -n "^var " spec.qnt     # Line 25: first var
grep -n "^def " spec.qnt     # Line 35: first def

# Insert new type at line 24 (after types, before vars)
```

### Understanding Code Structure

**Strategy 1: LSP document symbols**
```bash
mcp__quint-lsp__textDocument/documentSymbol file:///.../spec.qnt

# Returns hierarchical structure:
# - Module
#   - Types
#   - Vars
#   - Defs
```

**Strategy 2: Read and parse manually**
```bash
Read spec.qnt
# Scan for keywords: type, var, def, pure, val
```

### Generating Code

**Strategy 1: Query KB for examples**
```bash
quint_get_example("state variable definition")
# Returns: var myState: Int
```

**Strategy 2: Find similar code in spec**
```bash
grep "^type.*=" spec.qnt
# Copy pattern, adapt to new name/details
```

**Strategy 3: Use LSP to inspect existing defs**
```bash
mcp__quint-lsp__textDocument/hover {at: existing similar def}
# See exact syntax and types
```

### Verifying Changes

**Must do after EVERY change:**
```bash
quint parse spec.qnt && quint typecheck spec.qnt
```

**Optional but recommended:**
- LSP hover on modified defs
- Quick simulation: `quint run --max-steps=5`
- Diff against original

---

## Complete Examples

### Example 1: Adding a Type

**Refactor plan:**
```json
{
  "item": "type",
  "name": "TimeoutEvent",
  "change": "add",
  "details": "Union type for timeout variants"
}
```

**Step-by-step process:**

1. Find insertion point:
```bash
$ grep -n "^type " consensus.qnt
15:type Round = Int
20:type Vote = { voter: Node, round: Round, value: Val }

$ grep -n "^var " consensus.qnt
30:var round: Round

# Insert after line 20, before line 30
```

2. Generate code:
```quint
type TimeoutEvent =
  | ProposeTimeout
  | PrevoteTimeout
  | PrecommitTimeout
```

3. Insert:
```bash
Read consensus.qnt (lines 18-32)
# Get exact text at line 30

old_string = "var round: Round"
new_string = "type TimeoutEvent =\n  | ProposeTimeout\n  | PrevoteTimeout\n  | PrecommitTimeout\n\nvar round: Round"

Edit consensus.qnt, old_string, new_string
```

4. Verify:
```bash
$ quint parse consensus.qnt
# ✓ Success

$ quint typecheck consensus.qnt
# ✓ Success
```

### Example 2: Modifying an Action

**Refactor plan:**
```json
{
  "item": "action",
  "name": "step",
  "change": "modify",
  "details": "Add handleTimeout to action choices"
}
```

**Step-by-step process:**

1. Locate current definition:
```bash
$ grep -n "def step" consensus.qnt
45:def step = any {

Read consensus.qnt (lines 45-50)
```

Current code:
```quint
def step = any {
  propose,
  prevote,
  precommit
}
```

2. Determine modification:
- Pattern: Adding to `any{}` choices
- Insert: Add `handleTimeout` to list

3. Apply:
```bash
old_string = "  precommit\n}"
new_string = "  precommit,\n  handleTimeout\n}"

Edit consensus.qnt, old_string, new_string
```

4. Verify:
```bash
$ quint parse consensus.qnt
# ✓ Success

$ quint typecheck consensus.qnt
# ✓ Success

# Verify handleTimeout exists
$ grep "def handleTimeout" consensus.qnt
60:def handleTimeout = ...
# ✓ Definition exists
```

### Example 3: Error Recovery

**Scenario:** Added type but typecheck fails

```bash
$ quint typecheck consensus.qnt
Error: Type TimeoutEvent not in scope at line 75
  in action handleTimeout
```

**Recovery steps:**

1. Analyze error:
   - TimeoutEvent referenced but not found
   - Likely: wrong module or missing import

2. Check definition:
```bash
$ grep "type TimeoutEvent" consensus.qnt
25:type TimeoutEvent = ...
# ✓ Definition exists
```

3. Check usage:
```bash
Read consensus.qnt (lines 73-77)
# Shows: pure def processTimeout(e: TimeoutEvent): Bool = ...
```

4. Hypothesis: Module scope issue

5. Try fix: Ensure type is in same module
```bash
$ grep -B5 "type TimeoutEvent" consensus.qnt
# Check module declaration above it
```

6. If still fails: Query KB
```bash
quint_hybrid_search("type scope visibility")
# Learn about module imports
```

7. Apply fix and retry

---

## Self-Evaluation Questions

Before completing, ask yourself:

- ✓ Does the generated code follow Quint syntax exactly?
- ✓ Is the insertion point logical and safe?
- ✓ Are all types in scope and imported?
- ✓ Does the modification preserve the definition's purpose?
- ✓ Can I verify the change with LSP/CLI tools?

---

## Red Flags

Ask user before proceeding if:

- 🚨 Change affects critical invariants
- 🚨 Removing definitions that might be used elsewhere
- 🚨 Type signatures changing in non-obvious ways
- 🚨 Cannot verify change with parse/typecheck

---

## Quality Checklist

After applying all changes:

- [ ] All changes from refactor plan applied
- [ ] Spec parses without errors
- [ ] Spec typechecks without errors
- [ ] No unintended modifications (check diff)
- [ ] Indentation and formatting preserved
- [ ] Comments preserved (if any)
- [ ] Existing tests still pass (if any)
- [ ] Changes documented in output JSON

---

## Iteration Strategy

When stuck:

1. **Simplify**: Try applying one change at a time
2. **Query KB**: Look for similar modifications
3. **Check examples**: Find analogous patterns in spec
4. **Verify assumptions**: Use LSP to inspect types/structure
5. **Ask user**: If 3 attempts fail, explain issue and ask for guidance
