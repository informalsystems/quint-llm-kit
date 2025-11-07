---
id: quint-syntax-rules
name: Quint Syntax Rules
category: syntax
---

# Quint Syntax Rules

Common syntax gotchas and correct usage patterns in Quint.

## Rules

### 1. Pure def with no parameters

**Wrong:**
```quint
pure def name() = ...
```

**Correct:**
```quint
pure def name = ...
```

Omit parentheses for parameterless pure defs

### 2. Map type syntax

**Wrong:**
```quint
var myMap: Map[str, int]
```

**Correct:**
```quint
var myMap: str -> int
```

Use arrow syntax for map types

### 3. Update syntax

**Wrong:**
```quint
state.with(field, newValue)
```

**Correct:**
```quint
{...state, field: newValue}
```

Use spread syntax, not .with()

### 4. Variant constructors

**Wrong:**
```quint
TimeoutInput(height, round)
```

**Correct:**
```quint
TimeoutInput((height, round))
```

Variant constructors take single argument. Use tuples for multiple values.

### 5. Tuple destructuring in pattern matching

**Wrong:**
```quint
| TimeoutInput((height, round)) => ...
```

**Correct:**
```quint
| TimeoutInput(hr) => ... hr._1 ... hr._2
```

Bind tuple, then use ._1, ._2 accessors

### 6. oneOf usage

**Wrong:**
```quint
oneOf(collection)
```

**Correct:**
```quint
collection.oneOf()
```

oneOf is a method on collections

