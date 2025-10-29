# Refactor Plan Rendering Guidelines

## Purpose

This guideline defines deterministic formatting functions for rendering refactor plan components. All renderers are **pure functions**: same input JSON → same output markdown.

## Design Principles

1. **Deterministic**: Same JSON data always produces identical markdown output
2. **Modular**: Each renderer handles one view type independently
3. **Reusable**: Renderers can be composed (e.g., change detail used in multiple views)
4. **Readable**: Output is GitHub-flavored markdown with clear hierarchy

## Renderer Catalog

### 1. Summary Header Renderer

**Input**: Full plan JSON object

**Output**: Header section with quick statistics

**Template**:
```markdown
╔══════════════════════════════════════════════════════════╗
║  Refactor Plan: {objective_truncated_50}                 ║
╚══════════════════════════════════════════════════════════╝

📋 Objective: {objective_full}

📊 Plan Overview:
  • Modules affected: {module_count}
  • Changes: ADD ({add_count}), REMOVE ({remove_count}), MODIFY ({modify_count})
  • Validation checks: {validation_count}
  • Risks: {risk_count}
  • Open questions: {question_count}
```

**Logic**:
- `objective_truncated_50`: Truncate objective to 50 chars, append "..." if longer
- `module_count`: `len(plan.modules)`
- `add_count`: `len([c for c in plan.changes if c.type == "ADD"])`
- `remove_count`: `len([c for c in plan.changes if c.type == "REMOVE"])`
- `modify_count`: `len([c for c in plan.changes if c.type == "MODIFY"])`
- `validation_count`: `len(plan.validation_plan)`
- `risk_count`: `len(plan.risks)` (if risks array exists)
- `question_count`: `len(plan.open_questions)` (if array exists)

---

### 2. Change List Renderer (by Type)

**Input**:
- `changes`: Array of change objects
- `change_type`: "ADD" | "REMOVE" | "MODIFY"

**Output**: Compact list of changes of given type

**Template**:
```markdown
{type_emoji} {change_type} ({count} changes)

{for each change with index}
{change_prefix}{index}: {title}
    Module: {module} {if line}(line {line}){endif}
    {if cascading}Cascading: {cascading_count} dependent items{endif}
    {if risk}Risk: {risk.severity}{endif}
{endfor}
```

**Emoji Mapping**:
- ADD: ➕
- MODIFY: ✏️
- REMOVE: ➖

**Change Prefix Mapping**:
- ADD: "A"
- MODIFY: "M"
- REMOVE: "R"

**Logic**:
- Filter changes by type
- Sort by module name, then line number
- Assign sequential IDs within type (A1, A2, ..., M1, M2, ..., R1, R2, ...)
- Truncate title to 60 chars if needed

**Example Output**:
```markdown
➖ REMOVE (2 changes)

R1: Remove Precommit phase
    Module: Consensus (line 45)
    Cascading: 3 dependent items
    Risk: MEDIUM

R2: Remove lockValue mechanism
    Module: Consensus (line 120)
    Cascading: 5 dependent items
    Risk: LOW
```

---

### 3. Change List Renderer (by Module)

**Input**:
- `changes`: Array of change objects
- `module_name`: String

**Output**: All changes for given module, grouped by type

**Template**:
```markdown
┌─ Module: {module_name} ────────────────────────────────┐
│                                                         │
{if has_adds}
│ ➕ ADD ({add_count} items)                              │
{for each add}
│   • {change_id}: {title_truncated_40}                   │
{endfor}
│                                                         │
{endif}
{if has_modifies}
│ ✏️  MODIFY ({modify_count} items)                      │
{for each modify}
│   • {change_id}: {title_truncated_40} (line {line})     │
{endfor}
│                                                         │
{endif}
{if has_removes}
│ ➖ REMOVE ({remove_count} items)                       │
{for each remove}
│   • {change_id}: {title_truncated_40} (line {line})     │
{endfor}
│                                                         │
{endif}
└─────────────────────────────────────────────────────────┘
```

**Logic**:
- Filter changes to only those in specified module
- Group by type (ADD, MODIFY, REMOVE)
- Truncate titles to 40 chars to fit in box
- Only show sections with count > 0
- Box width: 59 characters (matches header template)

---

### 4. Change Detail Renderer

**Input**: Single change object with full details

**Output**: Detailed view with all change information

**Template**:
```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{change_id}: {title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Location: {module} {if line}(line {line}){endif}
🏷️  Type: {type}

📝 Description:
{details_wrapped_80}

{if before_code}
📄 Before:
```quint
{before_code}
```
{endif}

{if after_code}
📄 After:
```quint
{after_code}
```
{endif}

{if diff_code}
📄 Changes:
```diff
{diff_code}
```
{endif}

{if cascading}
🔗 Cascading Changes ({cascading_count}):
{for each cascading_item}
  • {item_type}: {item_name} {if line}(line {line}){endif}
    {description_wrapped_76}
{endfor}
{endif}

{if dependencies}
🔄 Dependencies:
{for each dep}
  • Depends on: {dep.change_id} ({dep.title})
{endfor}
{endif}

{if affected_by}
⚡ Affected By:
{for each affected}
  • Modified by: {affected.change_id} ({affected.title})
{endfor}
{endif}

{if risk}
⚠️  Risk: [{risk.severity}] {risk.description}
{if mitigation}
   💡 Mitigation: {mitigation_wrapped_76}
{endif}
{endif}

{if rationale}
💭 Rationale:
{rationale_wrapped_80}
{endif}

{if validation_notes}
✅ Validation Notes:
{validation_notes_wrapped_80}
{endif}
```

**Logic**:
- `details_wrapped_80`: Word-wrap description to 80 chars per line
- `cascading_count`: `len(change.cascading)` if exists
- `description_wrapped_76`: Word-wrap to 76 chars (account for indentation)
- `mitigation_wrapped_76`: Word-wrap to 76 chars
- Show sections only if data exists (if before_code, if cascading, etc.)
- For MODIFY type: prioritize diff_code if available, otherwise show before/after

---

### 5. Type Overview Renderer

**Input**: Full plan JSON with all changes

**Output**: Summary counts by type

**Template**:
```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Changes by Type
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{if add_count > 0}➕ ADD ({add_count} changes){endif}
{if modify_count > 0}✏️  MODIFY ({modify_count} changes){endif}
{if remove_count > 0}➖ REMOVE ({remove_count} changes){endif}
```

---

### 6. Module Overview Renderer

**Input**: Full plan JSON with all changes

**Output**: Summary counts by module

**Template**:
```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Changes by Module
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{for each module}
📦 {module_name}
   • ADD: {module_add_count}
   • MODIFY: {module_modify_count}
   • REMOVE: {module_remove_count}
   • Total: {module_total_count}
{endfor}
```

**Logic**:
- Extract unique module names from changes
- For each module, count changes by type
- Sort modules alphabetically

---

### 7. Validation Plan Renderer

**Input**: `plan.validation_plan` array

**Output**: Formatted validation checklist

**Template**:
```markdown
✅ Validation Plan ({validation_count} checks)

{for each validation with 1-based index}
  {index}. {command_short}
     Purpose: {purpose}
     {if expected_outcome}Expected: {expected_outcome}{endif}
     {if timeout}Timeout: {timeout}s{endif}
{endfor}
```

**Logic**:
- `command_short`: Truncate command to 60 chars if needed (e.g., "quint typecheck specs/...")
- Show expected outcome and timeout only if present

**Example**:
```markdown
✅ Validation Plan (3 checks)

  1. quint parse specs/consensus.qnt
     Purpose: Verify syntax correctness

  2. quint typecheck specs/consensus.qnt
     Purpose: Ensure type safety
     Expected: All types valid, no errors

  3. quint run --invariant=agreement --max-steps=100
     Purpose: Verify agreement invariant preserved
     Expected: Invariant satisfied for all executions
     Timeout: 120s
```

---

### 8. Risks Renderer

**Input**: `plan.risks` array

**Output**: Formatted risk list

**Template**:
```markdown
⚠️  Risks ({risk_count})

{for each risk}
  • [{severity}] {description_wrapped_76}
    {if mitigation}Mitigation: {mitigation_wrapped_76}{endif}
    {if affected_changes}Affects: {change_id_list}{endif}
{endfor}
```

**Logic**:
- Sort risks by severity: HIGH, MEDIUM, LOW
- `change_id_list`: Comma-separated list of affected change IDs (e.g., "R1, M3, A2")

**Example**:
```markdown
⚠️  Risks (2)

  • [MEDIUM] Removing precommit phase may affect safety proof structure
    Mitigation: Verify agreement invariant with model checker
    Affects: R1, M5

  • [LOW] New timeout mechanism adds complexity to state transitions
    Mitigation: Add comprehensive timeout tests
    Affects: A3, M2
```

---

### 9. Open Questions Renderer

**Input**: `plan.open_questions` array

**Output**: Formatted question list

**Template**:
```markdown
❓ Open Questions ({question_count})

{for each question with 1-based index}
  {index}. {question_text}
     {if context}Context: {context}{endif}
     {if options}Options: {option_list}{endif}
{endfor}
```

**Example**:
```markdown
❓ Open Questions (2)

  1. Should we preserve backward compatibility with old message format?
     Context: Spec changes message structure significantly
     Options: Add translation layer, Break compatibility, Gradual migration

  2. What timeout value should be used for propose phase?
     Context: FaB paper doesn't specify concrete timeout values
```

---

### 10. Patterns Renderer

**Input**: `plan.patterns` array

**Output**: Formatted pattern list

**Template**:
```markdown
🎨 Patterns to Apply ({pattern_count})

{for each pattern}
  • {pattern_id}: {reason}
    {if modules}Applies to: {module_list}{endif}
    {if examples}Example: {example}{endif}
{endfor}
```

**Example**:
```markdown
🎨 Patterns to Apply (2)

  • thin-actions: Keep handleTimeout logic in pure functions
    Applies to: Consensus
    Example: Extract timeout logic to pure def checkTimeout

  • explicit-state: Make phase transitions explicit in state machine
    Applies to: Consensus
```

---

### 11. Full Document Renderer

**Input**: Full plan JSON object

**Output**: Complete plan document combining all renderers

**Template**:
```markdown
{render: Summary Header}

{render: Type Overview}

{render: Change List by Type - REMOVE}
{render: Change List by Type - ADD}
{render: Change List by Type - MODIFY}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{render: Module Overview}

{for each module}
{render: Change List by Module}
{endfor}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{if patterns}
{render: Patterns}
{endif}

{render: Validation Plan}

{if risks}
{render: Risks}
{endif}

{if open_questions}
{render: Open Questions}
{endif}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Logic**: Compose all renderers in sequence, with section separators

---

## Utility Functions

### Word Wrapping

**Function**: `wrap_text(text, width, indent=0)`

**Logic**:
```python
def wrap_text(text: str, width: int, indent: int = 0) -> str:
    """Wrap text to specified width with optional indentation."""
    import textwrap
    wrapper = textwrap.TextWrapper(
        width=width,
        initial_indent=' ' * indent,
        subsequent_indent=' ' * indent,
        break_long_words=False,
        break_on_hyphens=False
    )
    return wrapper.fill(text)
```

### Truncation

**Function**: `truncate(text, max_len)`

**Logic**:
```python
def truncate(text: str, max_len: int) -> str:
    """Truncate text to max length, append '...' if truncated."""
    if len(text) <= max_len:
        return text
    return text[:max_len-3] + "..."
```

### Change ID Assignment

**Function**: `assign_change_ids(changes)`

**Logic**:
```python
def assign_change_ids(changes: list) -> list:
    """Assign IDs to changes: A1, A2... M1, M2... R1, R2..."""
    prefixes = {"ADD": "A", "MODIFY": "M", "REMOVE": "R"}
    counters = {"ADD": 1, "MODIFY": 1, "REMOVE": 1}

    for change in changes:
        change_type = change["type"]
        prefix = prefixes[change_type]
        change["id"] = f"{prefix}{counters[change_type]}"
        counters[change_type] += 1

    return changes
```

### Module Grouping

**Function**: `group_by_module(changes)`

**Logic**:
```python
def group_by_module(changes: list) -> dict:
    """Group changes by module name."""
    groups = {}
    for change in changes:
        module = change["module"]
        if module not in groups:
            groups[module] = []
        groups[module].append(change)
    return groups
```

## Testing Renderers

Each renderer should be tested with:
1. **Minimal input**: Empty arrays, no optional fields
2. **Typical input**: Realistic plan with all sections
3. **Edge cases**: Very long text, special characters, empty strings
4. **Consistency**: Same input → identical output (determinism check)

Example test:
```python
def test_change_detail_renderer():
    change = {
        "id": "R1",
        "type": "REMOVE",
        "title": "Remove Precommit phase",
        "module": "Consensus",
        "line": 45,
        "details": "FaB eliminates precommit phase",
        "before_code": "type Phase = Propose | Prevote | Precommit",
        "after_code": "type Phase = Propose | Prevote",
        "cascading": [
            {"name": "precommitTimeout", "line": 89, "description": "Remove timeout"}
        ],
        "risk": {
            "severity": "MEDIUM",
            "description": "May affect safety proof"
        }
    }

    output1 = render_change_detail(change)
    output2 = render_change_detail(change)

    assert output1 == output2  # Deterministic
    assert "R1: Remove Precommit phase" in output1
    assert "```quint" in output1
    assert "🔗 Cascading Changes (1):" in output1
    assert "[MEDIUM]" in output1
```

## Usage in Review Command

The review-plan command uses these renderers as follows:

```python
# In /commands/refactor/review-plan.md execution

# Step 3: Display Summary
output = render_summary_header(plan)
print(output)

# Step 8: Display Change List (by type)
changes_of_type = [c for c in plan.changes if c.type == "REMOVE"]
output = render_change_list_by_type(changes_of_type, "REMOVE")
print(output)

# Step 15: Display Change Detail
selected_change = plan.changes[selected_index]
output = render_change_detail(selected_change)
print(output)
```

All rendering logic is **deterministic** and **testable** - no LLM generation needed for display formatting.
