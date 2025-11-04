---
command: /play:closed:check-types
description: Generate and run type variant witness tests for sum types in a spec
version: 1.0.0
---

# Check Types Command

Generate witnesses for sum type variants with automatic type detection and config reuse.

## Usage

```bash
/play:closed:check-types --spec_path=<path/to/spec.qnt> [--max_steps=100]
```

## What it does

1. Reads the spec and detects all sum type definitions
2. Asks user which types to generate witnesses for
3. For each selected type, asks for the access expression to reach values of that type
4. Checks for existing module configurations (like check-listeners)
5. Runs `gen_type_witnesses.py` with the selected types and access expressions
6. Runs `run_all_witnesses.py` to test all witnesses
7. Reports results

## Steps

1. **Detect sum types**
   - Read spec file
   - Find all type definitions matching: `type <Name> = | Variant1 | Variant2 ...`
   - Extract type names
   - Store: List of detected sum types

2. **Ask user which types to witness**
   - Use AskUserQuestion with multiSelect: true
   - Present all detected sum types as options
   - Example: "Message", "TimeoutKind", "Step", etc.
   - User can select multiple types

3. **Ask for access expressions**
   - For each selected type, use AskUserQuestion to ask:
     - "How to access values of type {TypeName} from the global state?"
     - Provide examples based on common patterns:
       - For Message types: `s.messages.values().flatten()`
       - For Event types: `s.events.values().flatten().map(e => e.kind)`
       - For State types: `s.system.values().map(st => st.step)`
   - User can provide custom expression or select "Other" for manual input
   - Store: List of (type_name, access_expr) pairs

4. **Find existing config**
   - Look for module configurations in the spec directory
   - If found, parse the import statement to extract config
   - Example: `import tendermint(F=1, CORRECT=Set("p1"), ...).*` → config is `F=1, CORRECT=Set("p1"), ...`

5. **Ask user if config needed**
   - If no existing config found, use AskUserQuestion to ask for configuration string
   - If module not parameterized, skip config

6. **Run generation script**
   ```bash
   python3 .claude/scripts/test_generation/gen_type_witnesses.py <spec_path> \
     <TYPE1> <ACCESS_EXPR1> \
     <TYPE2> <ACCESS_EXPR2> \
     ... \
     --config <config_string>
   ```
   - Note: Build command with all TYPE ACCESS_EXPR pairs
   - Add --config only if config is needed

7. **Run witness tests**
   ```bash
   python3 .claude/scripts/test_generation/run_all_witnesses.py \
     <spec_dir>/<spec_name>_witnesses.qnt \
     <module_name>_witnesses \
     <max_steps>
   ```

8. **Show results**
   - Display which type variants were reachable/unreachable
   - Example:
     ```
     Type: Message
       ✓ Propose variant reachable (12 steps)
       ✓ PreVote variant reachable (8 steps)
       ✗ Decision variant unreachable

     Type: TimeoutKind
       ✓ ProposeTimeout reachable (15 steps)
       ✓ PreVoteTimeout reachable (20 steps)
     ```
   - Provide debug command for unreachable variants

## Important Notes

- **Access expressions** must be valid Quint expressions that evaluate to a collection of values
- Access expressions should start from `s` (the global state)
- Use `.values()`, `.flatten()`, `.map()` to extract values from nested structures
- Common patterns:
  - Messages: `s.messages.values().flatten()`
  - Events with field: `s.events.values().flatten().map(e => e.kind)`
  - System state field: `s.system.values().map(st => st.step)`

## Tools

- `Read`: Read spec to detect sum types
- `Grep`: Extract type definitions
- `Glob`: Find configured files
- `Bash`: Run Python scripts
- `AskUserQuestion`: Select types, provide access expressions, get config if needed
