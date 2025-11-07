#!/usr/bin/env bash
set -uo pipefail   # don’t exit on command failure; -e is omitted

# Number of runs (default: 10)
runs=${1:-10}

# The quint command
cmd=(quint run tendermintFine.qnt \
     --main valid \
     --max-steps=500 \
     --max-samples 1000 \
     --verbosity 2 \
     --invariant one_decided)

times_ms=()       # to hold extracted times
trace_lens=()     # to hold counts of [State ...] lines

echo "Running ${cmd[*]} for $runs runs; extracting time and trace length..."

for ((i=1; i<=runs; i++)); do
  echo -n "Run $i/$runs... "

  # Capture all output (stdout+stderr) without aborting on nonzero exit
  output="$("${cmd[@]}" 2>&1 || true)"

  # 1) Extract time in ms
  if [[ $output =~ \(([0-9]+)ms ]]; then
    t_ms="${BASH_REMATCH[1]}"
  else
    t_ms=0
  fi
  times_ms+=("$t_ms")

  # 2) Count trace states (lines beginning with "[State ")
  cnt=$(grep -c '^\[State [0-9]\+' <<<"$output" || true)
  trace_lens+=("$cnt")

  echo " time=${t_ms}ms  states=${cnt}"
done

# Compute and print stats: expects one number per line on stdin
print_stats() {
  awk '
    {
      sum   += $1
      sum2  += ($1)^2
      n     += 1
    }
    END {
      if (n == 0) {
        mean = std = 0
      } else if (n == 1) {
        mean = sum
        std  = 0
      } else {
        mean = sum / n
        variance = (sum2 - sum*sum/n) / (n-1)
        std = sqrt(variance)
      }
      printf "Average: %.2f\nStdDev : %.2f\n", mean, std
    }
  '
}

echo -e "\n=== Summary over $runs runs ==="

echo -e "\nExecution time (ms):"
printf "%s\n" "${times_ms[@]}" | print_stats

echo -e "\nTrace length (#states):"
printf "%s\n" "${trace_lens[@]}" | print_stats
