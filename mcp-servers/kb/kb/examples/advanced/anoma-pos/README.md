# Namada's Proof-of-stake Quint Specification

This Quint specification models the main functionality of Namada's Proof-of-stake system. Apart from a few libraries ([basicSpells.qnt](basicSpells.qnt), [extraSpells.qnt](extraSpells.qnt), [dec.qnt](dec.qnt)), it includes three files:
- [namada-redelegation.qnt](namada-redelegation.qnt) that includes the main functionality, as well as invariants, actions to run the simulator and tests.
- [namada-types.qnt](namada-types.qnt) that includes all data types definitions and specification parameters.
- [helper-functions.qnt](helper-functions.qnt) that includes all of the auxiliary functions.

## Scope

The specification models the main delegator's transactions: delegate, unbond, withdraw and claim. It also models epochs and evidence submission.

## Definitions

- `PIPELINE_OFFSET`, `UNBONDING_OFFSET` and `CUBIC_OFFSET` define THREE epoch offsets. Note that `UNBONDING_OFFSET` must be greater than or equal to `PIPELINE_OFFSET`. We also have that `PIPELINE_OFFSET` must be at least `2`.

- A redelegation involves two validators. We use `source validator` to refer the validator from which the tokens are taken and `destination validator` to refer to the validator to which the tokens are delegated.

- Given a `redelegation`, the `redelegation's starting epoch` is the epoch at which the redelegation transaction is processed. The `redelegation's ending epoch` is the epoch at which the redelegated tokens start contributing to the destination delegator. In the current design, if a redelegation's starting epoch is `e`, then its ending epoch would be `e + PIPELINE_OFFSET`. Let `redelegation.start` and `redelegation.end` refer to the starting and ending epoch of the redelegation.

- A redelegation is composed of one or more bonds (aka `redelegation bonds`). Each redelegation bond is a pair of the epoch at which the redelegated tokens started contributing to the stake of the source validator and the amount of tokens. It is important to keep track of the starting epochs in order to apply slashes precisely.

- Given a redelegation, we call `redelegation slashing window` the set of consecutive epochs in which the tokens redelegated to the destination validator may be slashed due to a misbehaviour of the source validator.
  - In the current design, the redelegation slashing window of a redelegation spans from `redelegation.start - UNBONDING_OFFSET - CUBIC_OFFSET` up to `redelegation.end - 1`.
  - The window's lower bound is determined by the fact that when a redelegation is created, we apply all slashes of the source validator already known. This means any slash for an infraction committed at an epoch `< redelegation.start - UNBONDING_OFFSET - CUBIC_OFFSET`.
  - The window's upper bound is determined by the epoch at which the redelegated tokens stop contributing to the stake of the source validator.

The aim of these bounds is to provide consistent accountability, in that any stake contributing to an infraction will be punished proportionally regardless of when the infraction is detected.

- We say a redelegation is a `chain redelegation` when the source validator redelegates some tokens that were redelegated by a second validator while infractions of the latter validator can still be processed. In the current design, a redelegation is considered a chain redelegation if already redelegated tokens are redelegated before the end of the initial redelegation `+ UNBONDING_OFFSET + CUBIC_OFFSET`. This is simple to compute:
  - Let `redelegation` be the initial redelegation and assume that `redelegation.start = e`.
  - The redelegation slashing window then spans from `redelegation.start - UNBONDING_OFFSET - CUBIC_OFFSET` up to `redelegation.end - 1`. Thus, the last epoch at which the source validator may misbehave and we need to account for it is `redelegation.end - 1 = redelegation.start + PIPELINE_OFFSET - 1 = e + PIPELINE_OFFSET - 1`.
  - An infraction is processed after `UNBONDING_OFFSET + CUBIC_OFFSET` epochs from the misbehaving epoch. Thus, if the source validator misbehaves at `redelegation.end - 1`, the infraction will be processed at the end of epoch `redelegation.end - 1 + UNBONDING_OFFSET + CUBIC_OFFSET`.
  - Therefore, a redelegation of the redelegated tokens of `redelegation` is only considered a chain redelegation if it occurs before `redelegation.end + UNBONDING_OFFSET + CUBIC_OFFSET` as required.

## How To Run It

### Requirements

- [Quint](https://github.com/informalsystems/quint) (tested with v0.17.1)

### Resources

- [Quint cheatsheet](https://github.com/informalsystems/quint/blob/main/doc/quint-cheatsheet.pdf)
- [Quint tutorials](https://github.com/informalsystems/quint/tree/main/tutorials)

### Interact with the model in a REPL

```shell
# Load the main file
quint --require namada.qnt::namada
```

Then inside the Quint REPL:

```quint
// Initialize the state by executing the `init` action
init

// Run a step which executes one of the possible actions
step

// Evaluate the state of delegators (or any other var)
delegators

// Check which tx was executed by the step
lastTx
```

### Testing

To run successfully, you currently have to change `pure val enforceStateTransition = false` in namada.qnt before running tests.

The test `namadaScenarioTest` requires `UNBONDING_OFFSET == 4` and `PIPELINE_OFFSET == 2`.

```shell
quint test --main=namada namada-redelegation.qnt
```

### Run the Simulator and Check Invariants

```shell
quint run --max-samples=10000 --max-steps=20 --invariant=allInvariantsWithNoSlashPool --main=namada namada-redelegation.qnt
```