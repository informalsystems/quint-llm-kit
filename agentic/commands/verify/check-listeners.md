---
command: /verify:check-listeners
description: Generate and run listener witness tests for a spec
version: 1.0.0
---

# Check Listeners Command

Run listener witness generation scripts with automatic config detection.

## Usage

```bash
/verify:check-listeners --spec_path=<path/to/spec.qnt> [--max_steps=100]
```

## What it does

1. Checks for existing files in the spec directory that contain module configuration if parameterized module.
2. If found, extracts the config from the import statement
3. If not found, asks user for config via AskUserQuestion
4. Runs `gen_listener_witnesses.py` with the config
5. Runs `run_all_witnesses.py` to test all witnesses
6. Reports results

## Steps

1. **Find existing config**
   - Look for module configurations in the spec directory.
   - If found, parse the import statement to extract config
   - Example: `import tendermint(F=1, CORRECT=Set("p1"), ...).*` → config is `F=1, CORRECT=Set("p1"), ...`

2. **Ask user if needed**
   - If no existing config, use AskUserQuestion to ask for configuration string

3. **Run generation script**
   ```bash
   python3 .claude/scripts/test_generation/gen_listener_witnesses.py <spec_path> <config> <max_steps>
   ```

4. **Run witness tests**
   ```bash
   python3 .claude/scripts/test_generation/run_all_witnesses.py <spec_dir>/<spec_name>_configured.qnt <module_name>_configured <max_steps>
   ```

5. **Show results**
   - Display which listeners were reachable/unreachable
   - Provide debug command for unreachable witnesses

## Tools

- `Glob`: Find configured files
- `Read`: Read config from existing files
- `Bash`: Run Python scripts
- `AskUserQuestion`: Get config if needed
