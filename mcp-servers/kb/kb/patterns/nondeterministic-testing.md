---
id: nondeterministic-testing
name: Nondeterministic Testing Pattern
category: testing
when_to_use:
  - Testing with multiple possible values
  - Exploring state space
  - Finding edge cases
required_builtins:
  - oneOf
  - to
---

# Nondeterministic Testing Pattern

Use nondet with oneOf() for broad test coverage with random value selection.

## Template

```quint
run nondetTest = {
  nondet amount = 50.to(300).oneOf()
  nondet user = USERS.oneOf()
  init
    .then(operation(user, amount))
    .expect(invariant_holds)
}
```

## Key Principles

- Use nondet to declare non-deterministic value
- Use .oneOf() on collections or ranges
- Syntax: collection.oneOf() not oneOf(collection)
- Multiple nondet values test combinations

## Anti-patterns

### ❌ DON'T: nondet user = oneOf(USERS)...

```quint
nondet user = oneOf(USERS)
```

**Why?** Wrong syntax - oneOf is a method on collections

### ✅ DO:

```quint
nondet user = USERS.oneOf()
```

