---
id: separate-test-files
name: Separate Test Files Pattern
category: best-practice
when_to_use:
  - Always - never put tests in main spec
---

# Separate Test Files Pattern

Keep test scenarios in separate files that import the main spec. Main spec stays clean.

## Template

```quint
// File: system.qnt (main spec)
module system {
  // ... spec code ...
}

// File: systemTest.qnt (tests)
module systemTest {
  import system.* from "./system"
  
  run testScenario = {
    init
      .then(operation("alice", 100))
      .expect(balances.get("alice") == 100)
  }
}
```

## Key Principles

- Main spec has no test scenarios
- Test file imports with from "./fileName"
- One test module per spec module
- Test file name: specNameTest.qnt

## Anti-patterns

### ❌ DON'T: module system { ... run testScenario = {...} }...

```quint
module system { ... run testScenario = {...} }
```

**Why?** Tests clutter the main specification

### ✅ DO:

```quint
Separate systemTest.qnt file
```

