---
id: thin-actions
name: Thin Actions Pattern
category: best-practice
when_to_use:
  - Always - paired with pure functions pattern
required_builtins:
examples:
  - solidity/ERC20
---

# Thin Actions Pattern

Actions should be thin wrappers that call pure functions and update state. No business logic in actions.

## Template

```quint
action doOperation(params: Params): bool = {
  val result = operation(currentState, params)
  if (result.success) {
    all {
      field1' = result.newState.field1,
      field2' = result.newState.field2
    }
  } else {
    unchanged_all
  }
}
```

## Key Principles

- Call pure function with currentState
- Check result.success
- Update state variables from result.newState
- Use unchanged_all for failure case
- No conditional logic beyond success check

