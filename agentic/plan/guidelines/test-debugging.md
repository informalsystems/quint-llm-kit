# Test Debugging (Run Definitions)

**Use this guide when debugging failed `run` definitions executed by `quint test`.**

**What are `run` definitions?**
- Test cases defined in your spec using the `run` keyword
- Use `.then()` to chain actions and `.expect()` for assertions
- Example: `run myTest = init.then(action1).then(action2).expect(condition)`
- Executed with: `quint test spec.qnt --match="myTest"`

## Critical: Error Location ≠ Failure Point

**Quint reports errors at test chain START (`init`), NOT where `.expect()` failed.**

### Example

```quint
run myTest = {
  init                                    // ← Error reported HERE (line 99)
    .then(action1)
    .then(action2)
    .expect(some_condition)               // ← Actual failure HERE (line 106)
    .then(action3)
    .expect(another_condition)            // ← Or HERE (line 108)
}
```

**Error:**
```
error: [QNT508] Expect condition does not hold true
99:     init
```

**Why:** Test chains are single expressions starting at `init`. When any `.expect()` fails, Quint reports where expression started.

---

## Debugging Process

### 1. Run with Verbosity

```bash
quint test file.qnt --main=Module --match="testName" --verbosity=3
```

### 2. Count Frames

```
[Frame 0] init => true
[Frame 1] action1 => true
[Frame 2] action2 => true
[Frame 3] action3 => true
# Fails here - no Frame 4
```

### 3. Map Frames to Code

```quint
run myTest = {
  init                          // Frame 0
    .then(node1.perform(act1))  // Frame 1
    .then(node2.perform(act2))  // Frame 2
    .expect(condition1)         // Checked after Frame 2
    .then(node3.perform(act3))  // Frame 3
    .expect(condition2)         // Checked after Frame 3 ← FAILS HERE
}
```

**If reaches Frame 3 but fails:** Expectation after Frame 3 failed.

### 4. List All Expectations

```
Line 105: .expect(field1 == value1)
Line 108: .expect(field2 == value2)
Line 110: .expect(field3 == value3)
```

### 5. Check State in Last Frame

From verbosity output:
```
field1: actual_value1
field2: actual_value2
field3: actual_value3
```

Compare with expected values.

### 6. Trace Action in Spec

```quint
pure def someAction(...) = {
  {
    post_state: { ...s, fieldA: newValue, fieldB: anotherValue },
    effects: Set(...)
  }
}
```

**Check:** Does action set the field test expects?

### 7. Compare with Passing Tests

```quint
// Passing
run passingTest = {
  init
    .then(action1)
    .expect(fieldA == value)  // ✓ Checks field action1 sets
}

// Failing
run failingTest = {
  init
    .then(action1)
    .expect(fieldB == value)  // ✗ Checks field action1 doesn't set
}
```

### 8. Classify Bug

**Test Bug:**
- Checks field before action that sets it
- Expects wrong value
- Checks implementation details not properties

**Spec Bug:**
- Action doesn't set field it should
- Action sets wrong value
- Protocol invariants violated

---

## Checklist

- [ ] Run with `--verbosity=3`
- [ ] Count frames → identify last successful action
- [ ] Map frames to test code
- [ ] List ALL `.expect()` statements
- [ ] Check state values in last frame
- [ ] Compare actual vs expected
- [ ] Trace action to see what it sets
- [ ] Compare failing vs passing tests
- [ ] Classify: spec bug or test bug?

---

## Complete Example

**Error:**
```
Test myTest FAILED
Error at line 99: Expect condition does not hold true
```

**Test:**
```quint
99:  run myTest = {
102:   init
103:     .then("p1".perform(broadcast_prevote))
104:     .then("p2".perform(broadcast_prevote))
105:     .then("p3".perform(broadcast_prevote))
108:     .expect(evidence.size() >= 3)
110:     .then("p1".perform(decide))
111:     .expect(node.decision == Some("v0"))
113: }
```

**Verbosity Output:**
```
[Frame 0] init => true
[Frame 1] p1.broadcast => true
[Frame 2] p2.broadcast => true
[Frame 3] p3.broadcast => true
# Fails - no Frame 4

Frame 3 state:
  evidence: Set()  // ← Size is 0, not >= 3
```

**Analysis:**
- Error at line 99 (test start)
- Frames 0-3 completed
- Fails after Frame 3
- **Actual failure:** Line 108's `.expect(evidence.size() >= 3)`

**Root Cause:**
```quint
// Spec:
pure def broadcast_prevote(...) = {
  {
    post_state: { ...s, prevotedValue: value },
    effects: Set(...)  // ← No evidence collection
  }
}

pure def decide(...) = {
  val evidence_collection = ...  // ← Evidence collected HERE
}
```

**Conclusion:** Test bug - checks `evidence` before line 110's `decide` action, which collects evidence.

**Fix:** Move line 108's expectation after line 110, or remove.

---

## Key Takeaways

1. **Error line ≠ Failing line** - Use `--verbosity=3` to find actual failing expectation
2. **Count frames** - Map execution to test code to identify failed `.expect()`
3. **Read entire test** - Find all `.expect()` statements
4. **Check actual values** - Compare state in last frame with expected
5. **Trace actions** - Verify what each action sets in spec
6. **Compare patterns** - Passing tests reveal correct patterns
7. **Classify carefully** - Distinguish spec bugs from test bugs

---

## Quint Test Command Templates

**Run test with detailed trace:**
```bash
quint test <file.qnt> --main=<Module> --match="<testName>" --verbosity=3
```
- `<file.qnt>`: Test file path
- `<Module>`: Module containing test
- `<testName>`: Exact test name or pattern
- `--verbosity=3`: Show detailed execution trace
- **IMPORTANT**: Always use `--match` to specify which tests to run

**Reproduce with seed:**
```bash
quint test <file.qnt> --main=<Module> --match="<testName>" --seed=<0x...>
```
- `<0x...>`: Seed value from error (format: 0x1234567890abcd)

**Run all tests in module:**
```bash
quint test <file.qnt> --main=<Module> --match=".*"
```
- `--match=".*"`: Regex matching all test names
- **IMPORTANT**: Always include `--match` parameter, even when running all tests

### Test Chain Syntax
```quint
run test = {
  init                          // Frame 0
    .then(action1)              // Frame 1
    .expect(cond1)              // Checked after Frame 1
    .then(action2)              // Frame 2
    .expect(cond2)              // Checked after Frame 2
}
```

**Note:** Multiple `.expect()` after same `.then()` are all checked against that frame's state.
