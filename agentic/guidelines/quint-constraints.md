# Quint Language Constraints

**CRITICAL**: These are fundamental limitations of the Quint language. Violating these constraints will result in compilation errors that cannot be worked around.

## 1. String Manipulation is NOT Supported

Quint treats strings as **opaque values** for comparison only.

### ❌ NOT ALLOWED:
- String concatenation: `"hello" + "world"`
- String interpolation: `"value: ${x}"`
- String indexing: `str[0]`
- String methods: `.length()`, `.substring()`, `.toUpperCase()`, etc.
- Converting values to strings: `toString(42)`

### ✅ ALLOWED:
- String literals: `"hello"`
- String comparison: `name == "Alice"`
- Strings as map keys or set elements

### Solution for String-Like Behavior:

When you need to represent something like "convert integer to string" or "print a value", use a **sum type wrapper**:

```quint
// Instead of trying to convert to string, wrap in a type
type Printed =
  | PrintedInt(int)
  | PrintedBool(bool)
  | PrintedString(str)

// Usage
val printed_value = PrintedInt(42)
```

If you need to combine multiple data into one value, use records, not strings.

**Rule**: If you find yourself needing string manipulation, you're thinking in the wrong abstraction layer. Use IDs, sum types, or structured data instead.

## 2. Nested Pattern Matching is NOT Supported

Quint pattern matching works on **one level only**.

### ❌ NOT ALLOWED:

```quint
// Cannot match nested patterns
match msg
  | Request(Prepare(n, v)) => ...  // ERROR: nested match
  | Response({ status: Ok, data: Some(x) }) => ...  // ERROR: nested destructure
```

### ✅ ALLOWED:

```quint
// Match outer layer first, then match inner layer separately
match msg
  | Request(inner) =>
      match inner
        | Prepare(n, v) => ...
        | Promise(n, r) => ...
  | Response(resp) =>
      val status = resp.status
      match status
        | Ok => ...
        | Error => ...
```

**Rule**: Use sequential `match` statements or intermediate bindings. Match one layer at a time.

## 3. Destructuring is NOT Supported

You cannot destructure tuples or records in binding positions.

### ❌ NOT ALLOWED:

```quint
// Tuple destructuring
val (x, y) = get_pair()  // ERROR

// Record destructuring
val { name, age } = person  // ERROR

// Parameter destructuring
def process_pair((a, b)) = a + b  // ERROR

// Pattern in val binding
val Some(value) = optional  // ERROR
```

### ✅ ALLOWED:

```quint
// Access fields one at a time
val pair = get_pair()
val x = pair._1
val y = pair._2

// Access record fields individually
val person_name = person.name
val person_age = person.age

// Use explicit parameter, then extract
def process_pair(p) = p._1 + p._2

// Use match for sum types
val value = match optional
  | Some(v) => v
  | None => default_value
```

**Rule**: Always use explicit field access (`.field`, `._1`, `._2`) or `match` expressions. Never try to unpack in binding positions.

## 4. Additional Constraints

### No Mutable Variables
- `val` bindings are immutable
- Use state variables (with `'` suffix) for mutable state across transitions
- Within a definition, you cannot reassign: `var x = 1; x = 2` is not valid

### No Loops
- Use recursion or set comprehensions instead
- Example: `S.map(x => x + 1)` instead of `for x in S: x + 1`

### No Early Returns
- Functions must have a single expression as their body
- Use `if-then-else` or `match` to handle conditional logic

### Type Inference Limitations
- Quint has good type inference, but sometimes you need explicit annotations
- Especially when using polymorphic operators or empty collections
- Example: `Set()` needs type context, prefer `Set(1, 2, 3)` or annotated binding

## Debugging Workflow

When you encounter a compilation error:

1. **Check these constraints first** - Most errors stem from violating these rules
2. **Read the error message carefully** - Quint's type checker is precise
3. **Simplify the expression** - Break complex expressions into smaller steps
4. **Use intermediate bindings** - `val temp = expr1` then use `temp` in `expr2`
5. **Match one level at a time** - Never try to match nested patterns

## When in Doubt

- **Strings**: Don't manipulate them. Use structured types.
- **Patterns**: Match one level only. Use sequential matches.
- **Destructuring**: Don't. Use explicit field access.
- **Complex expressions**: Break them down with `val` bindings.

---

**Remember**: Quint is a specification language, not a general-purpose programming language. These constraints are by design to keep specifications simple and analyzable.
