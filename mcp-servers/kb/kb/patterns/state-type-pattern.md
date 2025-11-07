---
id: state-type-pattern
name: State Type Pattern
category: core
when_to_use:
  - Smart contracts
  - State machines
  - DeFi protocols
  - Games and puzzles
  - General systems
related:
  - pure-functions
  - thin-actions
  - map-initialization
required_builtins:
  - mapBy
  - oneOf
examples:
  - solidity/ERC20
  - games/tic-tac-toe
---

# State Type Pattern

Encapsulate all state variables in a single State record type. This is the fundamental pattern for most Quint specifications.

## Template

```quint
module System {
  // 1. TYPES - State type encapsulates ALL state
  type State = {
    field1: Type1,
    field2: Type2,
    // ... all state fields
  }
  
  // 2. CONSTANTS
  pure val CONSTANT_NAME = value
  
  // 3. PURE FUNCTIONS - ALL business logic here
  pure def operation(
    state: State,
    params: Params
  ): {success: bool, newState: State} = {
    if (preconditions) {
      {success: true, newState: {...state, field: newValue}}
    } else {
      {success: false, newState: state}
    }
  }
  
  // 4. STATE VARIABLES - Match State type fields
  var field1: Type1
  var field2: Type2
  
  val currentState = {field1: field1, field2: field2}
  
  // 5. INVARIANTS
  val invariantName = property
  
  // 6. ACTIONS - Thin wrappers calling pure functions
  action unchanged_all = all {
    field1' = field1,
    field2' = field2
  }
  
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
  
  // 7. INITIALIZATION - Pre-populate ALL maps
  action init = all {
    field1' = initialValue,
    field2' = USERS.mapBy(u => INITIAL_VALUE)
  }
  
  // 8. STEP ACTION - Nondeterministic exploration
  action step = {
    nondet param = range.oneOf()
    doOperation(param)
  }
}
```

## Key Principles

- State type encapsulates ALL state variables
- Pure functions contain ALL business logic
- Actions are thin wrappers that update state
- Pure functions return {success: bool, newState: State}
- Use spread syntax {...state, field: newValue} for updates

