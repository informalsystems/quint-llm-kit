---
command: /connect
description: Generate a Model Based Test (MBT) suite using Quint specifications and the quint-connect library
version: 1.0.0
---
# Quint-Connect MBT Generator

Generate a Model Based Test (MBT) suite using Quint specifications and the quint-connect library. This command follows Test-Driven Development (TDD) principles, implementing one transition at a time.

**Usage**: `/quint-connect <spec_path>`

Example: `/quint-connect specs/tendermint5f/tendermint5f.qnt`

## Core Principles

- **Interactive Wizard**: This command stops after each transition for user review and confirmation before proceeding
- **Use AskUserQuestion Tool**: ALWAYS use `AskUserQuestion` tool for all user interactions - never prompt in prose
- **Spec Order Matters**: Transitions in `switch!` MUST match the order in spec's main listener
- **Method Order Matches**: Driver impl methods MUST match `switch!` case order
- **Event Assertions Required**: Assert ALL events from spec (messages, timers, votes, state changes)
- **TDD Workflow**: Implement one transition at a time, run tests after each
- **No Warnings**: Code must compile cleanly with no warnings

## Input Requirements

### Command Argument
- `spec_path`: Path to Quint specification file (provided as command argument)

### Gathered via AskUserQuestion
- `crate_name`: Name for the test crate
- `crate_location`: Directory to create the test crate
- `first_test`: Name of initial Quint test to implement

## Workflow

You are an agent that automates the creation of MBT test suites. Follow this structured workflow:

### Phase 1: Information Gathering

**Objective**: Collect remaining required inputs from user.

The spec path is already provided as command argument. Use `AskUserQuestion` to gather:

1. **Crate Name**: Suggest `{project}-mbt` pattern
2. **Crate Location**: Offer options like `tests/mbt` or `code/crates/test/mbt`
3. **First Test**: Ask which Quint test to implement first (suggest `basicTest` if found)

### Phase 2: Specification Analysis

**Objective**: Extract all types, transitions, and tests from Quint spec.

1. Read and analyze the Quint specification file
2. Identify and extract:
   - All type definitions (Value, Round, Message types, etc.)
   - State fields (from StateFields type)
   - All transition labels (from TransitionLabel enum)
   - Message types (ProposeMsg, VoteMsg, etc.)
   - **The main listener** (e.g., `main_listener`) and its transition order
   - **All test definitions** (functions with `run` in their name)

3. Create a list of all transitions that need to be implemented **IN THE ORDER they appear in the main listener**
4. Create a list of all Quint tests to implement

### Phase 3: Codebase Analysis

**Objective**: Identify implementation types and crates to test.

1. **Identify process abstractions**: Based on the Quint spec's process model, find corresponding Rust structs or traits:
   - Look for types that represent processes/nodes
   - Identify types that match the spec's state structure
   - Find message types that correspond to the spec
2. **Determine dependencies**: Identify which workspace crates need to be added to Cargo.toml
3. **Map processes to types**: Create a mental model of how processes from the spec maps to Rust types

Present your findings and use `AskUserQuestion` to confirm the mappings before proceeding (process type, implementation crate, dependencies).

### Phase 4: Initial Project Structure

**Objective**: Generate MBT crate scaffold with first test.

Create the following files:

#### 1. Create `{crate_dir}/Cargo.toml`:
```toml
[package]
name = "{crate_name}"
description = "Library for model-based testing of {spec_name}"
publish = false

version.workspace = true
edition.workspace = true
repository.workspace = true
license.workspace = true
rust-version.workspace = true

[dependencies]
{implementation_dependencies}

quint-connect = { git = "ssh://git@github.com/informalsystems/quint-private.git", branch = "erick/connect-and-observe" }
pretty_assertions = { workspace = true }
serde = { workspace = true }
itf = { workspace = true }
```

#### 2. Create `{crate_dir}/src/lib.rs`:
```rust
#[cfg(test)]
mod tests;
```

#### 3. Create symlink to specs:
```bash
ln -s {spec_dir} {crate_dir}/specs
```

#### 4. Create `{crate_dir}/src/tests.rs`:

**IMPORTANT**: Start with ONLY the first Quint test. Do NOT add `#[quint_run]` simulation test yet.

```rust
mod driver;
mod message;
mod state;
mod transition;

use driver::{DriverName};
use quint_connect::{quint_run, quint_test};

#[quint_test(
    spec = "specs/{spec_file}.qnt",
    test = "{first_test}",
    main = "{main_module}",
    max_samples = 1
)]
fn {first_test_snake_case}() -> {DriverName} {
    {DriverName}::new()
}
```

#### 5. Create `{crate_dir}/src/tests/driver.rs` (skeleton):

**IMPORTANT**:
- Include a HashMap from process ID (String) to implementation structs/traits
- Transition order in `switch!` MUST match the order in the spec's main listener
- Method order in the impl block MUST match the order of cases in `switch!`

```rust
use std::{
    collections::{BTreeMap, HashMap},
    panic::AssertUnwindSafe,
};
use quint_connect::{Driver as QuintDriver, *};
use pretty_assertions::assert_eq;

use crate::tests::{
    state::SpecState,
    transition,
};

pub struct {DriverName} {
    processes: AssertUnwindSafe<HashMap<String, {ProcessImplType}>>,
}

impl {DriverName} {
    pub fn new() -> Self {
        Self {
            processes: AssertUnwindSafe::default()
        }
    }
}

impl QuintDriver for {DriverName} {
    fn nondet_picks<'a>(&'a self, step: &'a Step) -> NondetPicks<'a> {
        transition::nondet_picks(step)
    }

    fn action_taken(&self, step: &Step) -> Option<String> {
        self.nondet_picks(step).get("action")
    }

    fn step(&mut self, step: &Step) -> Status {
        switch! {
            (self, step) {
                init,
            }
        }
    }

    fn check(&self, step: &Step) {
        let spec_states: BTreeMap<String, SpecState> = step
            .get_in(&["tendermint5f::choreo::s", "system"])
            .expect("missing spec state");

        for (process, impl) in self.processes.iter() {
            let spec_state = spec_states.get(proc).expect("unknown process");
            let impl_state = impl.into();

            assert_eq!(
                *spec_state, impl_state,
                "spec and implementation states diverged for process {}",
                process
            );
        }
    }
}

impl {DriverName} {
    fn init(&mut self) {
        todo!()
    }
}
```

#### 6. Create `{crate_dir}/src/tests/state.rs`:

**IMPORTANT**: Use From traits for converting spec types from/to implementation types when possible. Otherwise, use methods when additional parameters are needed.

**IMPORTANT**: Fields of type `Option<T>` MUST be decoded with `serde(with = "As::<de::Option<_>>")`.

```rust
use serde::Deserialize;
use itf::de::{self, As};

#[derive(Eq, PartialEq, Deserialize, Debug)]
pub struct SpecState {
}

impl From<&{ProcessImplType}> for SpecState {
    fn from(impl: &{ProcessImplType}) -> Self {
        todo!()
    }
}
```

#### 7. Create `{crate_dir}/src/tests/transition.rs`:

**IMPORTANT**: Only include `Init` in the scaffold. Other transitions MUST be added later as needed.

```rust
use quint_connect::{NondetBuilder, NondetPicks, Step};
use serde::Deserialize;
use itf::de::{self, As};

use crate::tests::message::*;

#[derive(Deserialize, Debug)]
struct Transition {
    label: Label,
}

#[derive(Deserialize, Debug)]
#[serde(tag = "tag", content = "value")]
enum Label {
    Init,
}

pub fn nondet_picks<'a>(step: &'a Step) -> NondetPicks<'a> {
    let nondet = NondetPicks::from(step).expect("missing nondet picks");
    let mut builder = NondetBuilder::default();

    if let Some(process) = nondet.get::<String>("process") {
        builder = builder.insert("process", process);
    }

    let label = nondet
        .get("transition")
        .map(|t: Transition| t.label)
        .unwrap_or(Label::Init);

    builder = match label {
        Label::Init => builder.insert("action", "init"),
    };

    builder.build()
}
```

#### 8. Create `{crate_dir}/src/tests/message.rs`:

**IMPORTANT**: Use From traits for converting spec messages from/to implementation messages when possible. Otherwise, use methods when additional parameters are needed.

**IMPORTANT**: Fields of type `Option<T>` MUST be decoded with `serde(with = "As::<de::Option<_>>")`.

**IMPORTANT**: DO NOT convert numeric values with `serde(with = "As::<de::Integer>")`.

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct {QuintMessageType} {
}

impl {QuintMessageType} {
    pub fn to_impl(&self) -> {ImplMessageType} {
       todo!()
    }
}
```

### Phase 5: Transition Implementation Loop

**Objective**: Implement transitions one at a time with user confirmation between each.

**CRITICAL**: After implementing each transition, STOP and wait for user confirmation before proceeding.

1. **Inspect the Quint specification**: Read the transition definition to understand:
   - What arguments/parameters it takes (these MUST match `switch!` arguments)
   - What state changes occur
   - **What events are emitted** (messages broadcast, proposals sent, votes cast, etc.)
   
2. Run the test with `QUINT_VERBOSE=1` to identify what transition to implement
   - Run: `QUINT_VERBOSE=1 cargo test --package {crate_name} {test_name} -- --nocapture`
   - Look for `Unimplemented action` errors or trace output
   - Extract the nondet picks list (e.g., `process: "p1"`, `value: "v1"`)
   - These picks will be used as arguments in the `switch!` macro

3. Add the reported missing transition to the `Label` enum in `transition.rs`
   
   NOTE: Only add a single transition to the `Label` enum. Other transitions will be added as needed.

4. Add the action mapping in the `nondet_picks` match statement

5. Add the transition to the `switch!` macro in `driver.rs`:
   - **IMPORTANT**: Add it in the SAME ORDER as it appears in the spec's main listener
   - **CRITICAL**: Arguments MUST match EXACTLY the label parameters from the Quint spec
   - Example: If spec has `NewRound(proc, round)`, use `new_round(proc, round)` in switch!
   
   NOTE: The `init` transition is special and it's handler method MUST NEVER receive any arguments other than `&mut self`.
   NOTE: The `check(..)` method MUST be implemented after the `init` transition is implemented.

6. Add necessary spec types and their conversions to concrete types in `message.rs`

7. Implement the complete transition handler method in the driver:
   - **CRITICAL**: Add the method in the impl block in the SAME ORDER as switch! cases
   - **CRITICAL**: Inspect the Quint spec and add assertions for ALL events that occur:
     - If the transition broadcasts a message, assert the implementation emitted it
     - If the transition updates a timer, assert the timer was updated
     - If the transition records a vote, assert the vote was recorded
     - Use `assert_eq!` form equality comparisons, and `assert!` for simple boolean checks
   - Example:
     ```rust
     fn broadcast_proposal(&mut self, proposer: String, proposal: SpecProposal) {
         let impl_proposal = proposal.to_impl();
         let process = &self.processes[&proposer];

         // Execute the implementation logic
         let emitted_msgs = process.broadcast_proposal(impl_proposal.clone());

         // ASSERT: Check that the expected message was actually broadcast
         assert!(
             emitted_msgs.contains(&impl_proposal),
             "Implementation should have broadcast proposal: {:?}",
             impl_proposal
         );
     }
     ```

8. **Extract helper methods** if you notice repeated patterns:

    Extract helpers when:
    - The same pattern appears in 2+ transition handlers
    - Logic can be reused across different message/event/handler types

9. Run with `QUINT_VERBOSE=1`: `QUINT_VERBOSE=1 cargo test --package {crate_name} {test_name} -- --nocapture`

10. If tests fail with "Reproduce the error with QUINT_SEED=X":
    - Extract the seed value X
    - Run: `QUINT_VERBOSE=1 QUINT_SEED=X cargo test --package {crate_name} {test_name} -- --nocapture`
    - Analyze the verbose trace output
    - Identify where spec and implementation diverge
    - Check if events/assertions are failing
    - Fix the implementation
    - Repeat until tests pass

11. **Fix all warnings**: Ensure no compiler warnings remain
    - Run: `cargo check --package {crate_name} --all-targets`
    - Fix all warnings
    
12. Ensure consistent code style
    - Run: `cargo fmt --package {crate_name}`
    
13. Mark the transition as completed and show progress: "Implemented X of Y transitions"

14. **STOP and use `AskUserQuestion` to confirm before proceeding to next transition**

### Phase 6: Adding More Quint Tests

**Objective**: Incrementally add remaining Quint tests and implement their transitions.

As transitions are implemented, add more Quint tests from the spec:

1. After implementing transitions required for the first test, identify the next Quint test
2. Add the test to `tests.rs`:
   ```rust
   #[quint_test(
       spec = "specs/{spec_file}.qnt",
       test = "{next_test}",
       main = "{main_module}",
       max_samples = 1
   )]
   fn {next_test_snake_case}() -> {DriverName} {
       {DriverName}::new()
   }
   ```
3. Run tests to see what new transitions are needed
4. Implement those transitions following the implementation loop
5. Repeat until all Quint tests are added and passing

### Phase 7: Final Validation

**Objective**: Verify all tests pass and generate summary.

1. Run all tests: `cargo test --package {crate_name} -- --nocapture --test-threads=1`
2. Verify all tests pass with no warnings
3. Generate a summary report

## Output Format

Throughout the process:
- Show clear progress indicators ("Implemented X of Y transitions")
- Display test results after each transition
- Show debugging output when tests fail
- Show nondet picks extracted from verbose output
- Use `AskUserQuestion` if stuck on a failing test

## Error Handling

### Test Fails with QUINT_SEED
- **Condition**: Test fails with "Reproduce the error with QUINT_SEED=X"
- **Action**:
  1. Extract seed value X
  2. Run: `QUINT_VERBOSE=1 QUINT_SEED=X cargo test --package {crate_name} {test_name} -- --nocapture`
  3. Analyze verbose trace output
  4. Identify where spec and implementation diverge
  5. Check if events/assertions are failing
- **Recovery**: Fix the implementation, retry until tests pass

### Unimplemented Action Error
- **Condition**: Test fails with "Unimplemented action" error
- **Action**:
  1. Note the action name from error
  2. Add to `Label` enum in `transition.rs`
  3. Add action mapping in `nondet_picks` match statement
  4. Add to `switch!` macro in driver.rs (maintain spec order)
  5. Implement handler method
- **Recovery**: Run tests again to verify

### Compiler Warnings
- **Condition**: Code compiles but has warnings
- **Action**: Run `cargo check --package {crate_name} --all-targets`
- **Recovery**: Fix all warnings before marking transition as complete

### State Divergence
- **Condition**: Assertion fails in `check()` method
- **Action**:
  1. Review spec state definition
  2. Check `SpecState` struct has all fields
  3. Verify `From` trait implementation is correct
  4. Check implementation state updates match spec
- **Recovery**: Fix state mapping or implementation logic

## Success Criteria

- ✅ Codebase analyzed to identify proper abstraction level (no manual crate specification)
- ✅ QuintDriver contains HashMap from process ID (String) to implementation types
- ✅ Transitions in `switch!` follow a logical, implementation-driven order
- ✅ Method order in Driver impl matches `switch!` case order
- ✅ Arguments in `switch!` match exactly the label parameters from Quint spec
- ✅ Event assertions added for all transitions (messages, timers, votes, etc.)
- ✅ ALL state fields mapped in `SpecState` (not just a subset)
- ✅ All Quint tests from the spec are implemented and passing
- ✅ State checking (`check(..)`) implemented
- ✅ No compiler warnings
- ✅ Code is well-structured, with clear documentation, and well formatted

Begin by asking the user for the required information listed in Phase 1.
