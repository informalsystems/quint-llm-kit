---
id: pure-functions
name: Pure Functions Pattern
category: best-practice
when_to_use:
  - Always - this is a fundamental Quint pattern
examples:
  - solidity/ERC20
  - games/tic-tac-toe
---

# Pure Functions Pattern

Put ALL business logic in pure functions that take State and return {success, newState}. Never put logic in actions.

## Template

```quint
pure def operation(
  state: State,
  param1: Type1,
  param2: Type2
): {success: bool, newState: State} = {
  if (preconditions_met(state, param1, param2)) {
    val updatedState = {...state, field: computeNewValue(param1, param2)}
    {success: true, newState: updatedState}
  } else {
    {success: false, newState: state}
  }
}
```

## Key Principles

- Pure functions cannot access state variables directly
- Pass currentState as parameter
- Return {success: bool, newState: State}
- All business logic goes in pure functions
- Actions only call pure functions and update state

## Anti-patterns

### ❌ DON'T: action doOperation(param): bool = { if (condition) field' = ...

```quint
action doOperation(param): bool = { if (condition) field' = value }
```

**Why?** Logic in actions makes it hard to test and reason about

### ✅ DO:

```quint
Pure function with logic, thin action that calls it
```

