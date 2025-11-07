---
id: map-initialization
name: Map Pre-population Pattern
category: best-practice
when_to_use:
  - Any time you use maps in your state
required_builtins:
  - mapBy
examples:
  - solidity/ERC20
---

# Map Pre-population Pattern

Always pre-populate maps using mapBy to avoid undefined behavior from accessing non-existent keys.

## Template

```quint
const USERS: Set[str]
var balances: str -> int

action init = all {
  // Pre-populate for ALL possible keys
  balances' = USERS.mapBy(u => 0)
}
```

## Key Principles

- Use Set.mapBy() to create maps
- Initialize in init action
- Covers all possible keys
- Avoids undefined behavior from .get()
- Map type syntax: KeyType -> ValueType, not Map[KeyType, ValueType]

## Anti-patterns

### ❌ DON'T: var balances: str -> int...

```quint
var balances: str -> int
action init = all { balances' = Map() }
```

**Why?** Accessing balances.get("alice") when alice not in map is undefined

### ✅ DO:

```quint
balances' = USERS.mapBy(u => 0)
```

### ❌ DON'T: var balances: Map[str, int]...

```quint
var balances: Map[str, int]
```

**Why?** Wrong map type syntax in Quint

### ✅ DO:

```quint
var balances: str -> int
```

