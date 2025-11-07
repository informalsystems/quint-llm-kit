#!/usr/bin/env bash

if [ "$#" -lt 5 ]; then
    echo "Use: $0 spec.qnt input.csv max-steps max-jobs max-failing-jobs [init] [step]"
    echo "  - spec.qnt is the specification to check"
    echo "  - input.csv is the experiments file that contains one pair per line: invariant,port"
    echo "  - max-steps is the maximal number of protocol steps to check, e.g., 30"
    echo "  - max-jobs is the maximal number of jobs to run in parallel, e.g., 16"
    echo "  - max-failing-jobs is the maximal number of jobs to fail"
    echo "  - init it the initial action, by default: init"
    echo "  - step it the step action, by default: step"
    echo ""
    echo "If you need to pass more arguments, use MORE_ARGS,"
    echo "e.g., MORE_ARGS='--random-transitions=true'"
    exit 1
fi

spec=$1
input=$2
max_steps=$3
max_jobs=$4
max_failing_jobs=$5
init=${6:-"init"}
step=${7:-"step"}

# https://lists.defectivebydesign.org/archive/html/bug-parallel/2017-04/msg00000.html
export LANG= LC_ALL= LC_CTYPE= 

# This command runs "apalache check" by default. As a result, it does check all possible transitions
# up to ${max_steps} steps. This may be very slow. To make it faster by sacrificing completeness,
# you can pass MORE_ARGS='--random-transitions=true' to this script. This will enable random
# symbolic execution with "apalache simulate", which is much faster, but may miss some bugs.

# set -j <cpus> to the number of CPUs - 1
parallel -j ${max_jobs} -v --delay 1 --halt now,fail=${max_failing_jobs} --results out --colsep=, -a ${input} \
  quint verify ${MORE_ARGS} --max-steps=${max_steps} --init=${init} --step=${step} \
    --apalache-config=apalache.json \
    --server-endpoint=localhost:{2} --invariant={1} ${spec}