import subprocess
import re
import pandas as pd

# Parameters
max_steps_list = [10, 25, 50, 75, 100]
witnesses = ["stages", "all_decided", "one_decided"]

# Store results
results = []

for max_steps in max_steps_list:
    print(f"Running with max_steps={max_steps}...")
    
    # Build and run the command
    cmd = [
        "quint", "run", "tendermint.qnt",
        "--main", "valid",
        f"--max-steps={max_steps}",
        "--max-samples", "100",
        "--verbosity", "1",
        "--witnesses", *witnesses
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    output = proc.stdout

    # Parse runtime: [ok] No violation found (35473ms at 3 traces/second).
    runtime_match = re.search(r"No violation found \((\d+)ms", output)
    time_ms = int(runtime_match.group(1)) if runtime_match else None

    # Parse each witness percentage
    witness_data = {w: None for w in witnesses}
    for line in output.splitlines():
        match = re.match(rf"({'|'.join(witnesses)}) was witnessed in \d+ trace\(s\) out of 100 explored \(([\d\.]+)%\)", line)
        if match:
            witness, percentage = match.groups()
            witness_data[witness] = float(percentage)

    results.append({
        "max_steps": max_steps,
        "time_ms": time_ms,
        **witness_data
    })

# Present results
df = pd.DataFrame(results)
print("\nBenchmark Results:\n")
print(df.to_string(index=False))

# Optional: Save
# df.to_csv("quint_benchmark_results.csv", index=False)
