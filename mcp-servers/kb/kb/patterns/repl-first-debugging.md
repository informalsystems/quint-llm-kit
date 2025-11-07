---
id: repl-first-debugging
name: REPL-First Debugging Pattern
category: workflow
when_to_use:
  - Before writing tests
  - Debugging spec behavior
  - Understanding state changes
---

# REPL-First Debugging Pattern

Always test with REPL before writing formal tests. If REPL results surprise you, the spec has a bug.

## Template

```quint
# Test pure functions
{ 
  echo 'val testState = {field1: value1, field2: value2}'
  echo 'operation(testState, params)'
  echo '.exit'
} | quint repl -r spec.qnt::Module

# Test actions sequentially
{ 
  echo 'init'
  echo 'doOperation(args)'
  echo 'stateVariable'
  echo '.exit'
} | quint repl -r spec.qnt::Module
```

## Key Principles

- REPL first, tests second
- Pipe commands to quint repl
- Test pure functions with sample states
- Test actions to see state changes
- If REPL surprises you, spec is wrong

