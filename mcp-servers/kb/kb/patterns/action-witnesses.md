---
id: action-witnesses
name: Action Witness Pattern
category: testing
when_to_use:
  - Verifying every action can be executed
  - Finding unreachable code
  - Debugging action preconditions
examples:
---

# Action Witness Pattern

Create witnesses (invariants that should be violated) to verify actions are reachable.

## Template

```quint
// For action: doOperation
val canDoOperationSuccessfully = not(
  lastActionSuccess and
  // Evidence the action succeeded
  field' != field
)

// Run with:
// quint run --invariant=canDoOperationSuccessfully --mbt spec.qnt
// Expected: VIOLATION = ✅ (action is reachable)
// Bad: SATISFIED = ❌ (action is unreachable)
```

## Key Principles

- Witness = invariant that SHOULD be violated
- VIOLATION = good (action reachable)
- SATISFIED = bad (action unreachable)
- Create one witness per action

