# Quint Specification Workflow

**Purpose**: Agent-driven workflow for analyzing, refactoring, and verifying Quint specifications with guidelines-based architecture.

**Version**: 3.0.0

---

## Overview

This system provides a structured workflow for working with Quint specifications through three specialized agents:

1. **Guidelines Architecture**: Detailed reference materials separated from agent prompts
2. **Plan Approval Workflow**: User reviews and approves refactor plans before implementation
3. **Self-Evaluation**: Agents check their own work quality using checklists
4. **Iteration Strategies**: 3-attempt loops with detailed error recovery procedures

---

## Key Features

### 1. Guidelines Architecture

Detailed reference materials are separated from agent prompts, keeping them concise while providing comprehensive guidance when needed.

**Available Guidelines**:
- `planning.md` - Plan quality evaluation (for analyzer)
- `implementation.md` - Implementation strategies (for refactor/apply)
- `iteration.md` - Validation failure handling (for implementer)
- `verification.md` - Verification procedures (for verifier)


### 2. Plan Approval Workflow

The analyzer presents refactor plans to users for approval before the implementer makes any changes.

**Process**:
1. Analyzer generates refactor plan
2. Analyzer presents plan to user with `refactor-plan-display.txt` template
3. User reviews and approves/rejects
4. Approval metadata saved in `refactor-plan.json`
5. Implementer verifies approval before proceeding

**Approval Schema**:
```json
{
  "approval": {
    "approved": true,
    "timestamp": "2024-01-15T10:30:00Z",
    "approver": "user"
  }
}
```

### 3. Self-Evaluation

Each agent has a self-evaluation phase using checklists from guidelines to ensure quality before completion.

**Example** (from analyzer):
```markdown
### Phase 4: Plan Quality Self-Evaluation

13. Evaluate refactor plan quality using guidelines/planning.md:
    - Check completeness: All requirement aspects covered?
    - Check specificity: Clear enough for implementer?
    - Check safety: Risky changes identified?
    - Check patterns: Applicable patterns included?

14. If quality issues found, consult guideline for:
    - Common quality issues and fixes
    - Iteration strategy (3-attempt loop)
    - KB usage patterns for enhancement
    - When to ask user for clarification
```

### 4. Iteration Strategies

Detailed iteration strategies in guidelines with diagnosis procedures, error categorization, and targeted fixes.

**Example** (from iteration.md):
```markdown
| Error Type | Diagnosis | Fix Strategy | Max Attempts |
|------------|-----------|--------------|--------------|
| Parse error | KB syntax query | Try alternate insertion point | 3 |
| Type error | LSP inspection | Check imports, type rules | 3 |
| Test failure | Classify bug vs gap | Fix spec or improve test | 2 |
```

---

## Directory Structure

See `structure.txt` for complete directory tree.

**Key directories**:
- `agents/` - 3 high-level orchestrators (analyzer, implementer, verifier)
- `commands/` - 9 atomic operations (spec, refactor, verify)
- `guidelines/` - Detailed reference materials for agents
- `schemas/` - 4 JSON contracts for artifacts
- `templates/` - Output formatting templates

---

## Workflow Overview

```
User Request
  ↓
analyzer (uses guidelines/planning.md)
  ├─> requirement-analysis.json
  ├─> spec-structure.json
  └─> refactor-plan.json
  ↓
[USER APPROVAL]
  ↓
implementer (uses guidelines/iteration.md + implementation.md)
  ├─> refactored/*.qnt
  └─> validation-results.json
  ↓
verifier (uses guidelines/verification.md)
  ├─> *_test.qnt
  └─> verification-report.json
```

See `../COMPLETE_WORKFLOW.md` for detailed mermaid diagram.

---

## Usage Patterns

### Full Pipeline
```
"Add timeout mechanism to specs/consensus.qnt"
→ analyzer → [user approval] → implementer → verifier
```

### Verify Only
```
"Verify specs/consensus.qnt"
→ verifier
```

### Iterative
```
"Add feature X"
→ analyzer → [approval] → implementer → verifier → (fix issues) → verifier
```

---

## File Organization

**Agent prompts** (concise, ~200-250 lines):
- Core logic and process flow
- References to guidelines
- Input/output contracts

**Guidelines** (detailed, ~300-600 lines):
- Step-by-step procedures
- Examples and patterns
- Troubleshooting tables
- Quality checklists

**Commands** (atomic, ~100-150 lines):
- Single responsibility
- Clear input/output
- References to guidelines where needed


---

## Agents

### Analyzer
- **Input**: Natural language change request + spec files
- **Output**: requirement-analysis.json, spec-structure.json, refactor-plan.json
- **Process**: Query Quint KB → Analyze spec → Generate plan → Self-evaluate → Present for approval
- **Reference**: `agents/analyzer.md`

### Implementer
- **Input**: Approved refactor plan + spec files
- **Output**: Refactored .qnt files + validation results
- **Process**: Verify approval → Apply changes → Enforce patterns → Validate → Iterate on failures
- **Reference**: `agents/implementer.md`

### Verifier
- **Input**: Refactored spec
- **Output**: Test files + verification report
- **Process**: Detect framework → Design tests → Execute → Classify results → Generate report
- **Reference**: `agents/verifier.md`

---

## Quality Guarantees

All refactored specs must:
- Parse without errors (`quint parse`)
- Typecheck without errors (`quint typecheck`)
- Pass existing tests (unless explicitly changed in plan)
- Follow Quint patterns specified in refactor plan

All verification reports must:
- Classify results as bugs vs test gaps
- Provide reproduction commands
- Include pass/fail summaries
- Suggest next steps

---

## Key Principles

1. **SEPARATION**: Agents orchestrate, Commands execute
2. **GUIDELINES**: Detailed reference materials separate from agent prompts
3. **CONTRACTS**: All artifacts have JSON schemas
4. **ATOMIC**: Each command does ONE thing well
5. **APPROVAL**: User reviews plans before implementation
6. **ITERATION**: 3-attempt loops for error recovery
7. **SELF-EVALUATION**: Agents check their own work quality
8. **TRACEABLE**: Requirements → Changes → Tests → Results


