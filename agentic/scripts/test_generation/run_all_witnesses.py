#!/usr/bin/env python3
"""
Run all witnesses for a configured spec
Usage: python3 run_all_witnesses.py <configured_spec.qnt> <module_name> [max_steps]
Example: python3 run_all_witnesses.py tendermint_configured.qnt tendermint_configured 20
"""

import re
import subprocess
import sys
from pathlib import Path


def extract_witnesses(spec_path):
    """Extract all witness names from the configured spec."""
    content = spec_path.read_text()
    # Find all val definitions starting with witness_
    pattern = r'val\s+(witness_\w+)\s*='
    matches = re.findall(pattern, content)
    return matches


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 run_all_witnesses.py <configured_spec.qnt> <module_name> [max_steps]")
        print("Example: python3 run_all_witnesses.py tendermint_configured.qnt tendermint_configured 20")
        sys.exit(1)

    configured_spec = Path(sys.argv[1])
    module_name = sys.argv[2]
    max_steps = int(sys.argv[3]) if len(sys.argv) > 3 else 100

    if not configured_spec.exists():
        print(f"Error: Configured spec not found: {configured_spec}")
        sys.exit(1)

    # Extract witnesses from the spec file
    witnesses = extract_witnesses(configured_spec)

    print("=" * 60)
    print("Running All Witnesses")
    print("=" * 60)
    print(f"Configured spec: {configured_spec}")
    print(f"Module: {module_name}")
    print(f"Max steps: {max_steps}")
    print(f"Total witnesses: {len(witnesses)}")
    print()

    results = []
    for i, witness_name in enumerate(witnesses, 1):
        print(f"  [{i}/{len(witnesses)}] {witness_name}...", end=" ", flush=True)

        try:
            cmd = [
                'quint', 'run', str(configured_spec),
                f'--main={module_name}',
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

                seed = seed_match.group(1) if seed_match else 'unknown'
                steps = int(steps_match.group(1)) if steps_match else max_steps

                print(f"✓ reachable ({steps} steps, seed: {seed})")
                results.append({
                    'witness': witness_name,
                    'found': True,
                    'steps': steps,
                    'seed': seed
                })
            else:
                print("✗ unreachable")
                results.append({
                    'witness': witness_name,
                    'found': False
                })

        except subprocess.TimeoutExpired:
            print("✗ timeout")
            results.append({
                'witness': witness_name,
                'found': False
            })
        except Exception as e:
            print(f"✗ error: {e}")
            results.append({
                'witness': witness_name,
                'found': False
            })

    print()

    # Summary
    reachable = [r for r in results if r['found']]
    unreachable = [r for r in results if not r['found']]

    print("=" * 60)
    print("Results")
    print("=" * 60)
    print(f"Reachable: {len(reachable)}/{len(witnesses)}")
    print()

    if reachable:
        print("✓ Reachable witnesses:")
        for r in reachable:
            print(f"  • {r['witness']} ({r['steps']} steps, seed: {r['seed']})")
        print()

    if unreachable:
        print("✗ Unreachable witnesses (may need more steps):")
        for r in unreachable:
            print(f"  • {r['witness']}")
        print()


if __name__ == '__main__':
    main()
