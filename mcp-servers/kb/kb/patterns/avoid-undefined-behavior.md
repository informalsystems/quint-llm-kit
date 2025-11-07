---
id: avoid-undefined-behavior
name: Avoid Undefined Behavior
category: anti-pattern
---

# Avoid Undefined Behavior

Collection of common operations that have undefined behavior if preconditions aren't met.

## Anti-patterns

### ❌ DON'T: map.get(key)...

```quint
map.get(key)
```

**Why?** Undefined if key doesn't exist

### ✅ DO:

```quint
Pre-populate map with mapBy, or check keys().contains(key) first
```

### ❌ DON'T: set.getOnlyElement()...

```quint
set.getOnlyElement()
```

**Why?** Undefined if set size != 1

### ✅ DO:

```quint
Use chooseSome() for deterministic or oneOf() for non-deterministic
```

### ❌ DON'T: list.head() or list.tail()...

```quint
list.head() or list.tail()
```

**Why?** Undefined if list is empty

### ✅ DO:

```quint
Check list.length() > 0 first
```

### ❌ DON'T: list.nth(i)...

```quint
list.nth(i)
```

**Why?** Undefined if i < 0 or i >= list.length()

### ✅ DO:

```quint
Check bounds: i >= 0 and i < list.length()
```

### ❌ DON'T: range(i, j) or i.to(j) with i > j...

```quint
range(i, j) or i.to(j) with i > j
```

**Why?** Undefined behavior

### ✅ DO:

```quint
Ensure i <= j
```

