# Neutron DEX Model
This repository contains a specification of the Neutron DEX module.



## Repository Structure

 - `lib`: generally useful Quint functions, for modelling arithmetic operatoins
 -  The files that make the model in progress:
    - `dex.qnt`: the core of the model: contains deterministic functions of the form `f(state, message) : updatedState`
    - `dexEvolution.qnt`: defines the state machine: initial state, `step` action (a choice between different actions to run), and individual actions (that nondeterministically choose parameters for the messages)
    - `postconditions.qnt`: contains descriptions of different transitions through the relation between the `before` and the `after` state. (It is mostly equivalent to `dex.qnt`, but may be a more intuitive way to grasp the model and its expected properties)
    - `utils.qnt`: helper functions
    - `consts.qnt`: constants used for simulation (eg, max amounts to trade with etc.)
    - `types.qnt`: basic types used in the model
    - `runs.qnt`: contains sequences of actions and their expected outcomes. Useful for sanity checking the model and for bootstrapping the REPL (more on that below).


## Model Details
For details of the model and instructions on working with it, check [modelReport.md](./modelReport.md).
