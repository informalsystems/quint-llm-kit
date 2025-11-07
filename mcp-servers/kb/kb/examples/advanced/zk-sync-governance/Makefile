
.PHONY: test unit check repl verify smoke prepare-upgradability prepare-frezability prepare
unit:
	quint test ./tests.qnt

repl:
	echo "init\n step\n step\n step" | quint -r main.qnt::main 

check:
	quint typecheck main.qnt

test: check repl unit

prepare: prepare-upgradability prepare-frezability

prepare-upgradability:
	./scripts/prepare-invariants.sh upgradabilityInv main.qnt upgradabilityInv.csv

prepare-frezability:
	./scripts/prepare-invariants.sh freezeSafetyFastInv main.qnt freezeSafetyFastInv.csv

smoke: prepare
	./scripts/test-invariants.sh ./main.qnt ./upgradabilityInv.csv 1 20 1 init step
	./scripts/test-invariants.sh ./main.qnt ./freezeSafetyFastInv.csv 1 20 1 init step

verify: prepare
	./scripts/test-invariants.sh ./main.qnt ./upgradability.csv 7 20 1 init step
	./scripts/test-invariants.sh ./main.qnt ./freezeSafetyFastInv.csv 7 20 1 init step

run-benchmarks: prepare
	./scripts/test-invariants.sh main.qnt experiments/fast.csv 10 30 1
