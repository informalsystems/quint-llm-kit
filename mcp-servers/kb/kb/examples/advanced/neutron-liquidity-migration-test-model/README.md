# Model-based Fuzzing for Liquidity Migration

This Quint model was used as a part of Neutron liquidity migration [security audit](https://github.com/informalsystems/audits/blob/main/Neutron/2024-03-21_liquidity_migration_audit_report.pdf).

The main idea was to use a simplified model of the system to generate a large number of traces corresponding to the migration.
Upon executing each step of those traces, we check the step postconditons.

Checking only for postconditions (and not full conformance of the model's state) enables us to have a simplistic model: 
It only models what step may be taken and chooses the parameters of the step (instead of modelling the evolution of the whole system).

## Running

As an example:
  - `quint run --out-itf=trace.itf.json --invariant=allPCLLiquidityWithdrawn migration_fuzzing.qnt `
  - `quint run --out-itf=trace.itf.json --invariant=fullMigrationHappened migration_fuzzing.qnt`
