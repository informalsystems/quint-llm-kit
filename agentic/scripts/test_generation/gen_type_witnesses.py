#!/usr/bin/env python3
"""
Generate witnesses for sum type variants in Choreo specs
Usage: python3 gen_witnesses.py <spec.qnt> TYPE ACCESS_EXPR [TYPE ACCESS_EXPR ...] [--config CONFIG]

Arguments:
  spec.qnt        Path to the Quint spec file
  TYPE            Name of a sum type to generate witnesses for
  ACCESS_EXPR     Quint expression that evaluates to a collection of values of that type
  --config        Optional configuration string for module instantiation

Example:
  python3 gen_witnesses.py tendermint.qnt \
    Message "s.messages.values().flatten()" \
    TimeoutKind "s.events.values().flatten().map(e => e.kind)" \
    Step "s.system.values().map(st => st.step)" \
    --config "F=1"

The ACCESS_EXPR should be a Quint expression that produces a collection (Set, List, or via .map())
of values of the specified TYPE, starting from 's' (the global state).
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple


def extract_module_name(spec_content):
    """Extract module name from spec."""
    match = re.search(r'module\s+(\w+)', spec_content)
    return match.group(1) if match else None


def extract_type_variants(spec_content, type_name):
    """
    Extract all variants from a sum type definition.
    Example: type Message = | Propose(...) | PreVote(...) | Decision(...)
    Or: type Step = ProposeStep | PreproposeStep | PrevoteStep
    Returns list of variant names (without parameters).
    """
    # Find type definition
    pattern = rf'type\s+{re.escape(type_name)}\s*=\s*([^}}]+?)(?=\n\s*(?:type|pure|val|def|action|import|module|}}))'
    match = re.search(pattern, spec_content, re.DOTALL)

    if not match:
        return []

    type_def = match.group(1).strip()

    # Split by | and extract variant names
    # Handle both: "| Variant" and "Variant | Variant"
    parts = type_def.split('|')
    variants = []

    for part in parts:
        part = part.strip()
        if not part:
            continue
        # Extract the variant name (word before '(' or whitespace)
        variant_match = re.match(r'(\w+)', part)
        if variant_match:
            variants.append(variant_match.group(1))

    return variants


def has_variant_parameter(spec_content, type_name, variant_name):
    """
    Check if a variant has parameters.
    Example: | Propose(...) -> True, | ProposeTimeout -> False
    """
    # Find the type definition
    pattern = rf'type\s+{re.escape(type_name)}\s*=\s*([^}}]+?)(?=\n\s*(?:type|pure|val|def|action|import|module|}}))'
    match = re.search(pattern, spec_content, re.DOTALL)

    if not match:
        return False

    type_def = match.group(1)

    # Look for the specific variant
    variant_pattern = rf'\|\s*{re.escape(variant_name)}\s*\('
    return bool(re.search(variant_pattern, type_def))


def generate_witness_spec(spec_path, module_name, config, type_access_pairs):
    """
    Generate a witness spec file.

    Args:
        type_access_pairs: List of (type_name, access_expression) tuples
    """
    spec_dir = spec_path.parent
    spec_name = spec_path.stem
    witness_spec_path = spec_dir / f"{spec_name}_witnesses.qnt"

    spec_content = spec_path.read_text()

    module_lines = []
    module_lines.append(f'module {module_name}_witnesses {{')
    module_lines.append(f'  import basicSpells.* from "./spells/basicSpells"')

    if config:
        module_lines.append(f'  import {module_name}({config}).* from "./{spec_name}"')
    else:
        module_lines.append(f'  import {module_name}.* from "./{spec_name}"')

    module_lines.append('')

    all_variants = []

    # Generate witnesses for each type
    for type_name, access_expr in type_access_pairs:
        variants = extract_type_variants(spec_content, type_name)

        if not variants:
            print(f"  Warning: No variants found for type '{type_name}'")
            continue

        print(f"  Type '{type_name}': found {len(variants)} variants")
        for variant in variants:
            print(f"    • {variant}")

        module_lines.append(f'  // Witnesses for {type_name}')

        for variant in variants:
            witness_name = f"witness_{variant}_appears"
            all_variants.append((witness_name, type_name, variant))

            # Check if variant has parameters
            has_params = has_variant_parameter(spec_content, type_name, variant)

            # Generate match pattern
            if has_params:
                match_pattern = f'{variant}(_)'
            else:
                match_pattern = variant

            # Generate witness
            module_lines.append(f'  val {witness_name} =')
            module_lines.append(f'    ({access_expr}).forall(x => match x {{')
            module_lines.append(f'      | {match_pattern} => false  // Violation: {variant} found!')
            module_lines.append(f'      | _ => true')
            module_lines.append(f'    }})')
            module_lines.append('')

        module_lines.append('')

    module_lines.append('}')

    witness_spec_path.write_text('\n'.join(module_lines))
    return witness_spec_path, all_variants


def parse_args(args):
    """Parse command line arguments into (spec_path, type_access_pairs, config)."""
    if len(args) < 3:
        return None, None, None

    spec_path = Path(args[0])
    config = None
    type_access_pairs = []

    i = 1
    while i < len(args):
        if args[i] == '--config':
            if i + 1 < len(args):
                config = args[i + 1]
                i += 2
            else:
                print("Error: --config requires a value")
                return None, None, None
        else:
            # Expect TYPE ACCESS_EXPR pair
            if i + 1 < len(args) and not args[i + 1].startswith('--'):
                type_name = args[i]
                access_expr = args[i + 1]
                type_access_pairs.append((type_name, access_expr))
                i += 2
            else:
                print(f"Error: Expected ACCESS_EXPR after TYPE '{args[i]}'")
                return None, None, None

    return spec_path, type_access_pairs, config


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    spec_path, type_access_pairs, config = parse_args(sys.argv[1:])

    if spec_path is None or not type_access_pairs:
        print(__doc__)
        sys.exit(1)

    if not spec_path.exists():
        print(f"Error: Spec file not found: {spec_path}")
        sys.exit(1)

    print("=" * 60)
    print("Witness Generation")
    print("=" * 60)
    print(f"Spec: {spec_path}")
    print(f"Config: {config or 'none'}")
    print(f"Types to witness: {len(type_access_pairs)}")
    print()

    spec_content = spec_path.read_text()
    module_name = extract_module_name(spec_content)

    if not module_name:
        print("Error: Could not find module name in spec")
        sys.exit(1)

    print(f"Module: {module_name}")
    print()

    print("Extracting variants...")
    witness_spec, all_variants = generate_witness_spec(
        spec_path, module_name, config, type_access_pairs
    )

    print()
    print("=" * 60)
    print(f"Generated {len(all_variants)} witnesses")
    print("=" * 60)
    print(f"Witness spec: {witness_spec}")
    print()
    print("Next steps:")
    print(f"  1. Typecheck: quint typecheck {witness_spec}")
    print(f"  2. Run witnesses: python3 run_all_witnesses.py {witness_spec} {module_name}_witnesses <max_steps>")


if __name__ == '__main__':
    main()
