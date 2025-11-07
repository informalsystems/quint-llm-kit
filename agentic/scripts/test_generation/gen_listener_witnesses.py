#!/usr/bin/env python3
"""
Simple listener discovery for Choreo specs
Usage: python3 discover_listeners_simple.py <spec.qnt> [config] [max_steps]
Example: python3 discover_listeners_simple.py consensus.qnt "N=7,f=2" 100

Instruments all listeners with logging and tests reachability.
User can filter out no-op listeners manually if needed.
"""

import re
import subprocess
import sys
import tempfile
import json
from pathlib import Path
from typing import Dict, List, Tuple


def extract_module_name(spec_content):
    """Extract module name from spec."""
    match = re.search(r'module\s+(\w+)', spec_content)
    return match.group(1) if match else None


def extract_cue_listeners(spec_content):
    """
    Extract cue pattern listeners: choreo::cue(ctx, listener, action)
    Returns list of (listener_name, action_name) tuples.
    """
    pattern = r'choreo::cue\s*\(\s*ctx\s*,\s*(\w+)\s*,\s*(\w+)\s*\)'
    matches = re.findall(pattern, spec_content)
    return matches


def extract_direct_listeners(spec_content):
    """Extract direct listener calls: listener(ctx)"""
    pattern = r'(?<![:\w])(\w+)\s*\(\s*ctx\s*\)'
    matches = re.findall(pattern, spec_content)

    # Filter out known non-listeners
    builtins = {'Set', 'Map', 'List', 'flatten', 'filter', 'match', 'cue',
                'main_listener', 'and', 'or', 'not', 'Some', 'None'}

    return [m for m in matches if m not in builtins]


def to_camel_case(snake_str):
    """Convert snake_case to CamelCase."""
    components = snake_str.split('_')
    return ''.join(x.title() for x in components)


def create_instrumented_spec(spec_path: Path, listener_names: List[str], listener_to_action: Dict[str, str]):
    """Create instrumented version of spec with logging."""
    spec_path = spec_path.resolve()
    spec_dir = spec_path.parent
    spec_name = spec_path.stem
    instrumented_path = spec_dir / f"{spec_name}_instrumented.qnt"

    spec_content = spec_path.read_text()

    # Generate LogType variants with default NoLog variant
    log_variants = '  | NoLog\n' + '\n'.join(f'  | {to_camel_case(l)}Triggered' for l in listener_names)

    # 1. Insert LogType definition after imports WITHIN the main module
    # Find the main module opening
    module_match = re.search(r'module\s+(\w+)\s*\{', spec_content)
    if not module_match:
        print("Error: Could not find module definition")
        return None

    module_start = module_match.end()

    # Find where imports end (look for first type/val/def/const/pure keyword after module start)
    rest_of_module = spec_content[module_start:]
    non_import_match = re.search(r'\n\s*(type|val|def|const|pure|action)\s+', rest_of_module)

    if non_import_match:
        insert_pos = module_start + non_import_match.start() + 1  # +1 to keep the newline
    else:
        # No types/defs found, insert right after module opening
        insert_pos = module_start

    log_type_def = f"""// === INSTRUMENTATION: Log Type ===
type LogType =
{log_variants}
// === END INSTRUMENTATION ===

"""
    spec_content = spec_content[:insert_pos] + log_type_def + spec_content[insert_pos:]

    # 2. Extend CustomEffects with Log variant
    custom_effects_pattern = r'(type\s+CustomEffects\s*=\s*)([^\n]+)'
    custom_effects_match = re.search(custom_effects_pattern, spec_content)

    if custom_effects_match:
        prefix = custom_effects_match.group(1)
        existing_def = custom_effects_match.group(2).strip()
        new_def = f"{existing_def} | Log(LogType)"
        spec_content = spec_content[:custom_effects_match.start()] + prefix + new_def + spec_content[custom_effects_match.end():]
    else:
        # No existing CustomEffects, create it
        custom_effects_def = "\ntype CustomEffects = Log(LogType)\n"
        log_type_end = spec_content.find("// === END INSTRUMENTATION ===")
        if log_type_end != -1:
            insert_pos = spec_content.find('\n', log_type_end) + 1
            spec_content = spec_content[:insert_pos] + custom_effects_def + spec_content[insert_pos:]

    # 3. Extend Extensions/Bookkeeping type with log field
    def add_log_field(match):
        prefix = match.group(1)
        fields = match.group(2)
        suffix = match.group(3)

        if 'log:' in fields:
            return match.group(0)

        new_fields = fields.rstrip().rstrip(',') + ',\n    log: LogType'
        return prefix + new_fields + suffix

    extensions_pattern = r'(type\s+Extensions\s*=\s*\{)([^}]*?)(\n\s*\})'
    if re.search(extensions_pattern, spec_content, re.DOTALL):
        spec_content = re.sub(extensions_pattern, add_log_field, spec_content, count=1, flags=re.DOTALL)
    else:
        bookkeeping_pattern = r'(type\s+Bookkeeping\s*=\s*\{)([^}]*?)(\n\s*\})'
        spec_content = re.sub(bookkeeping_pattern, add_log_field, spec_content, count=1, flags=re.DOTALL)

    # 4. Instrument main_listener by wrapping each listener call with .map()
    print("  Instrumenting main_listener calls...")

    for listener in listener_names:
        action = listener_to_action.get(listener, listener)
        camel = to_camel_case(listener)

        # Conditional logging: only log if transition does something
        map_wrapper = (
            f'.map(t => '
            f'if (t.effects.size() > 0 or t.post_state != ctx.state) '
            f'{{ ...t, effects: t.effects.union(Set(choreo::CustomEffect(Log({camel}Triggered)))) }} '
            f'else t)'
        )

        # Pattern 1: choreo::cue(ctx, listener, action)
        cue_pattern = rf'(choreo::cue\s*\(\s*ctx\s*,\s*{re.escape(listener)}\s*,\s*{re.escape(action)}\s*\))'
        cue_replacement = rf'\1{map_wrapper}'
        spec_content = re.sub(cue_pattern, cue_replacement, spec_content)

        # Pattern 2: direct listener(ctx) - only for direct listeners
        if listener == action:
            direct_pattern = rf'({re.escape(listener)}\s*\(\s*ctx\s*\))(?=\s*[,)])'
            direct_replacement = rf'\1{map_wrapper}'
            spec_content = re.sub(direct_pattern, direct_replacement, spec_content)

    # 5. Initialize log field in initial_bookkeeping
    initial_bookkeeping_pattern = r'(pure\s+val\s+initial_bookkeeping\s*=\s*\{[^}]*)(})'
    initial_bookkeeping_match = re.search(initial_bookkeeping_pattern, spec_content, re.DOTALL)

    if initial_bookkeeping_match:
        prefix = initial_bookkeeping_match.group(1)
        suffix = initial_bookkeeping_match.group(2)

        # Check if log field is already present
        if 'log:' not in prefix:
            # Add log field with NoLog default
            new_prefix = prefix.rstrip().rstrip(',') + ',\n    log: NoLog\n  '
            spec_content = spec_content[:initial_bookkeeping_match.start()] + new_prefix + suffix + spec_content[initial_bookkeeping_match.end():]

    # 6. Ensure val s = choreo::s exists (needed for witnesses)
    if not re.search(r'val\s+s\s*=\s*choreo::s', spec_content):
        print("  Adding 'val s = choreo::s' for witness access...")
        # Find the last action or val definition before closing brace
        module_end = spec_content.rfind('}')
        if module_end != -1:
            s_def = "\n  val s = choreo::s\n"
            spec_content = spec_content[:module_end] + s_def + spec_content[module_end:]

    # 7. Extend apply_custom_effect function to handle Log
    if re.search(r'def\s+apply_custom_effect', spec_content):
        func_start = spec_content.find('def apply_custom_effect')
        if func_start != -1:
            match_start = spec_content.find('match effect {', func_start)
            if match_start != -1:
                brace_start = spec_content.find('{', match_start)
                depth = 0
                i = brace_start
                while i < len(spec_content):
                    if spec_content[i] == '{':
                        depth += 1
                    elif spec_content[i] == '}':
                        depth -= 1
                        if depth == 0:
                            log_case = """
      | Log(logType) => { ...env, extensions: { ...env.extensions, log: logType } }
"""
                            spec_content = spec_content[:i] + log_case + '    ' + spec_content[i:]
                            break
                    i += 1
    else:
        # No existing apply_custom_effect, create it
        apply_custom_effect = """
// === INSTRUMENTATION: Custom Effect Handler ===
pure def apply_custom_effect(env: choreo::GlobalContext, effect: CustomEffects): choreo::GlobalContext =
  match effect {
    | Log(logType) => { ...env, extensions: { ...env.extensions, log: logType } }
  }
// === END INSTRUMENTATION ===

"""
        action_match = re.search(r'\n\s*action\s+\w+', spec_content)
        if action_match:
            insert_pos = action_match.start()
            spec_content = spec_content[:insert_pos] + '\n' + apply_custom_effect + spec_content[insert_pos:]
        else:
            spec_content = spec_content + '\n' + apply_custom_effect

    instrumented_path.write_text(spec_content)
    return instrumented_path


def run_witness(spec_dir, spec_name, module_name, config, listener, max_steps):
    """Run witness for a single listener and return result."""
    camel = to_camel_case(listener)
    witness_name = f"witness_{camel}Triggered"

    with tempfile.NamedTemporaryFile(mode='w', suffix='.qnt', dir=spec_dir, delete=False) as f:
        witness_file = Path(f.name)

        if config:
            import_stmt = f'import {module_name}({config}).* from "./{spec_name}_instrumented"'
        else:
            import_stmt = f'import {module_name}.* from "./{spec_name}_instrumented"'

        witness_code = f'''module witness_test {{
  {import_stmt}

  val {witness_name} = match choreo::s.extensions.log {{
    | {camel}Triggered => false
    | _ => true
  }}
}}
'''
        f.write(witness_code)

    try:
        cmd = [
            'quint', 'run', str(witness_file),
            '--main=witness_test',
            f'--invariant={witness_name}',
            f'--max-steps={max_steps}',
            '--max-samples=1000',
            '--backend=rust'
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        output = result.stdout + result.stderr

        if 'violation' in output.lower():
            seed_match = re.search(r'seed:\s*([a-f0-9]+)', output, re.IGNORECASE)
            steps_match = re.search(r'step\s+(\d+)', output, re.IGNORECASE)

            return {
                'found': True,
                'seed': seed_match.group(1) if seed_match else 'unknown',
                'steps': int(steps_match.group(1)) if steps_match else max_steps
            }
        else:
            return {'found': False}

    except subprocess.TimeoutExpired:
        return {'found': False}
    except Exception as e:
        print(f"Warning: Error running witness for {listener}: {e}")
        return {'found': False}
    finally:
        witness_file.unlink(missing_ok=True)


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 discover_listeners_simple.py <spec.qnt> [config] [max_steps]")
        print("Example: python3 discover_listeners_simple.py consensus.qnt 'N=7,f=2' 100")
        sys.exit(1)

    spec_path = Path(sys.argv[1])
    config = sys.argv[2] if len(sys.argv) > 2 else None
    max_steps = int(sys.argv[3]) if len(sys.argv) > 3 else 100

    if not spec_path.exists():
        print(f"Error: Spec file not found: {spec_path}")
        sys.exit(1)

    spec_dir = spec_path.parent
    spec_name = spec_path.stem

    print("=" * 60)
    print("Listener Discovery")
    print("=" * 60)
    print(f"Spec: {spec_path}")
    print(f"Config: {config or 'none'}")
    print(f"Max steps: {max_steps}")
    print()

    spec_content = spec_path.read_text()

    module_name = extract_module_name(spec_content)
    if not module_name:
        print("Error: Could not find module name in spec")
        sys.exit(1)
    print(f"Module: {module_name}")
    print()

    # Extract listeners and actions
    print("Extracting listeners...")
    cue_patterns = extract_cue_listeners(spec_content)
    direct_listeners = extract_direct_listeners(spec_content)

    listener_to_action = {}
    for listener, action in cue_patterns:
        listener_to_action[listener] = action

    for listener in direct_listeners:
        listener_to_action[listener] = listener

    all_listener_names = sorted(set([l for l, a in cue_patterns] + direct_listeners))

    if not all_listener_names:
        print("No listeners found!")
        sys.exit(1)

    print(f"Found {len(all_listener_names)} listeners:")
    for listener in all_listener_names:
        action = listener_to_action.get(listener, listener)
        if listener == action:
            print(f"  • {listener} (direct)")
        else:
            print(f"  • {listener} → {action}")
    print()

    # Create instrumented spec
    print("Creating instrumented spec...")
    instrumented_path = create_instrumented_spec(spec_path, all_listener_names, listener_to_action)
    if instrumented_path is None:
        print("Error: Failed to create instrumented spec")
        sys.exit(1)
    print(f"✓ Instrumented spec: {instrumented_path}")
    print()

    # Create a new instanciation of the spec with config if provided
    if config:
        print("Creating configured spec instanciation...")
        configured_spec_path = spec_dir / f"{spec_name}_configured.qnt"

        # Build the full module content
        module_lines = []
        module_lines.append(f'module {module_name}_configured {{')
        module_lines.append(f'  import basicSpells.* from "./spells/basicSpells"')
        module_lines.append(f'  import {module_name}({config}).* from "./{instrumented_path.stem}"')
        module_lines.append('')

        # Add witness definitions for each listener
        for listener in all_listener_names:
            camel = to_camel_case(listener)
            witness_name = f"witness_{camel}Triggered"
            module_lines.append(f'  val {witness_name} = match s.extensions.log {{')
            module_lines.append(f'    | {camel}Triggered => false')
            module_lines.append(f'    | _ => true')
            module_lines.append(f'  }}')
            module_lines.append('')

        # Close module
        module_lines.append('}')

        # Write the complete file
        configured_spec_path.write_text('\n'.join(module_lines))

        print(f"✓ Configured spec: {configured_spec_path}")
        print()


if __name__ == '__main__':
    main()
