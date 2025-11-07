import subprocess

import argparse       
def run(num_iterations, invariant_names, output_dir):    
    for invariant_name in invariant_names:
        for i in range(num_iterations):
            trace_name = f"{invariant_name}_trace{i}.itf.json"
            command = f"quint run --max-samples=1000 --max-steps=20 --out-itf={output_dir}/{trace_name} --invariant={invariant_name} migration_fuzzing.qnt"
            result = subprocess.run(command, shell=True, text=True, capture_output=True)
            if result.returncode == 0:
                print("Command executed successfully.")
            else:
                print(f"Error executing command: {result.stderr}")

def main():
    # command args using argparse
    parser = argparse.ArgumentParser(description="Iterated trace generation")
    parser.add_argument("--num-iterations", type=int, default=10, help="Number of iterations")
    parser.add_argument("--invariant-names", nargs="+", default=["allPCLLiquidityWithdrawn", "fullMigrationHappened"], help="Invariant names")
    parser.add_argument("--output-dir", type=str, default="traces", help="Output directory")

    run(**vars(parser.parse_args()))



# main function
if __name__ == "__main__":
    main()