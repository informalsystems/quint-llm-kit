# Project Context for Claude

## Permissions
- You are allowed to run quint commands with these options:
  - `quint parse`
  - `quint typecheck` 
  - `quint run`
  - `quint test`
  - `quint repl`

## Project Information
<!-- Add your project details here -->

## Architecture Notes
<!-- Document key architectural decisions and patterns -->

## Coding Standards
<!-- Specify your preferred coding conventions -->

## Build & Test Commands
<!-- List commands I should run for building, testing, linting -->

## Dependencies & Frameworks
<!-- Note key libraries and frameworks in use -->

## Quint Specification Guidelines

### Available Interactive Builders
I have access to two specialized Quint specification builders in `~/informal/repos/protocol-design/guides/`:

1. **Interactive Quint Specification Builder** (`spec-builder.md`)
   - For general system specifications (smart contracts, protocols)
   - Step-by-step interactive process for building specs
   - Core pattern: State type + pure functions + thin actions
   - Usage: "Use the Interactive Quint Specification Builder for [system name]"

2. **Consensus Specer** (`cons-specer.md`) 
   - For distributed consensus algorithms (PBFT, Tendermint, HotStuff, etc.)
   - Specialized patterns for distributed systems with fault tolerance
   - Core pattern: Algorithm module + Consensus state machine
   - Usage: "Use the Consensus Specer to model [algorithm name]"

### Key Quint Patterns to Follow
- Use `State` record type to encapsulate all system state
- Put ALL business logic in pure functions that return `{success, newState}`
- Keep actions thin - just call pure functions and update state
- Pre-populate maps with `mapBy` to avoid undefined behavior
- Use tuples for variant constructors: `Input((a, b))` not `Input(a, b)`
- **Main spec files should contain no tests** - create separate test files (e.g., `specTest.qnt`)
- Test files should import the main spec: `import Spec.* from "./spec"`

### Quint Execution Guidelines
- **For tests**: Use `quint test spec.qnt` to run all `run` blocks as tests
- **For simulation**: Use `quint run --mbt spec.qnt` with `--mbt` flag to see action calls and nondeterministic picks
- **For invariant checking**: Use `quint run --invariant="myInvariant" --mbt spec.qnt`
- The `--mbt` flag shows `mbt::actionTaken` and `mbt::nondetPicks` for better trace analysis

### Writing and Debugging Quint Tests

#### Effective Test Development Process
1. **Design test scenario**: Plan the sequence of actions and expected outcomes
2. **Debug with REPL first**: Use interactive REPL to **discover actual behavior** - this may reveal bugs in your specification!
   ```bash
   { 
     echo 'init'
     echo 'delegateTokens("alice", "validator1", 100)'
     echo 'distributeValidatorRewards("validator1", 20)'
     echo 'rewards'  # Check actual reward calculation - might not match expectations!
     echo '.exit'
   } | quint repl -r spec.qnt::ModuleName
   ```
   **Key insight**: If REPL results don't match your mental model, the spec likely has a bug, not your expectations
3. **Fix specification if needed**: Adjust business logic based on REPL discoveries
4. **Write test as action sequence**: Structure as `init.then(action1).then(action2).then(unchanged_all)`
5. **Run tests with `quint test`**: Use proper testing command, not `quint run`

#### Common Test Patterns
- **Basic workflow test**: `init.then(action).expect(predicate).then(action2).expect(predicate2)`
- **Failure case test**: `init.then(failing_action).expect(not(lastActionSuccess) and unchanged_state)`
- **Multi-step scenario**: `init.then(action1).expect(result1).then(action2).expect(result2)...`
- **Edge case validation**: Test boundary conditions and verify exact failure modes

#### Nondeterministic Testing (Highly Recommended)
- **Use `nondet` for robust testing**: Start tests with `nondet amount = 1.to(500).oneOf()` instead of hardcoded values
- **Arithmetic expressions in expectations**: Use calculations like `INITIAL_BALANCE - delegationAmount` instead of magic numbers
- **Massive test coverage**: Nondeterministic tests run thousands of cases (e.g., 10,000) vs single hardcoded scenarios
- **Example pattern**:
  ```quint
  run nondetTest = {
    nondet amount = 50.to(300).oneOf()
    nondet reward = 10.to(80).oneOf()
    init
    .then(delegateTokens("alice", "validator1", amount))
    .expect(balances.get("alice") == INITIAL_BALANCE - amount)
    .then(distributeValidatorRewards("validator1", reward))
    .expect(rewards.get("alice") == reward - (reward * VALIDATOR1_COMMISSION) / 100)
  }
  ```
- **Use spec constants**: Reference `INITIAL_BALANCE`, `VALIDATOR1_COMMISSION` etc. instead of hardcoded numbers
- **Edge case discovery**: Random values automatically test boundary conditions that hardcoded tests miss
- **Mathematical validation**: Arithmetic expressions verify business logic is mathematically sound across parameter space

#### Advanced: Conditional Properties Based on Input Relationships
- **Test different behaviors based on `nondet` relationships**: Use `if-else` to test multiple scenarios in one run
- **Example - Partial vs Full Undelegation**:
  ```quint
  run conditionalTest = {
    nondet delegated = 100.to(400).oneOf()
    nondet undelegated = 50.to(500).oneOf()
    // ... setup ...
    .expect(if (undelegated > delegated) {
      not(lastActionSuccess) // Should fail - can't undelegate more than delegated
    } else if (undelegated == delegated) {
      balances.get("alice") == INITIAL_BALANCE // Full undelegation
    } else {
      balances.get("alice") == INITIAL_BALANCE - delegated + undelegated // Partial
    })
  }
  ```
- **Power of conditional testing**: One test covers multiple business logic branches based on input relationships
- **Real-world scenarios**: Commission comparisons, balance thresholds, proportional distributions

#### Critical Testing Principle
- **NEVER write tests without `.expect()` clauses** - tests that only execute actions without verification are useless
- **Every `.then(action)` should be followed by `.expect(predicate)`** to verify the action's effect
- **Use `.expect()` to catch specification bugs** - failed expectations reveal logic errors in your business functions

#### Test Debugging Tips  
- **Effect system errors**: If you get "Expected [...] and [] to be the same", you're mixing actions and assertions
- **REPL as bug detector**: Use REPL to discover specification bugs - unexpected results often indicate logic errors in pure functions
- **Question unexpected outcomes**: If REPL results surprise you, investigate the business logic rather than assuming your expectations are wrong
- **Iterative debugging**: Use REPL → fix spec → REPL → test cycle for complex scenarios
- **Test specific scenarios**: Don't try to test everything in one run block, create focused test cases  
- **Check mathematical precision**: Use ranges `assert(value >= min and value <= max)` for integer division results

### Testing Action Witnesses for Reachability

#### What are Action Witnesses?
Action witnesses verify that each action can execute successfully, complementing tests and invariants by ensuring the specification isn't over-constrained.

#### How to Test Action Witnesses
```bash
# Healthy spec (bug-free): ALL action witnesses should be VIOLATED
quint run --invariant="canDelegateSuccessfully" --mbt spec.qnt
# Output: "error: Invariant violated" ✅ GOOD - found successful execution

# Broken spec (with bugs): action witnesses should be SATISFIED  
quint run --invariant="canDelegateSuccessfully" --mbt spec.qnt
# Output: "[ok] No violation found" ❌ BAD - no successful execution possible
```

#### Interpreting Action Witness Results
- **VIOLATION** = 🟢 Action can execute successfully (healthy spec)
- **SATISFIED** = 🔴 Action cannot execute (broken/over-constrained spec)

#### Common Action Witness Patterns
```quint
// Pattern: Success + Evidence
val canDelegateSuccessfully = not(lastActionSuccess and delegations.size() > 0)
val canUndelegateSuccessfully = not(lastActionSuccess and users.exists(u => balances.get(u) > INITIAL_BALANCE))
val canClaimRewardsSuccessfully = not(lastActionSuccess and users.exists(u => rewards.get(u) == 0 and balances.get(u) > INITIAL_BALANCE))
```

#### Action Witness Best Practices
- **Add action witnesses for every major action** to ensure all operations remain reachable
- **Test action witnesses immediately** after adding them to verify they work correctly  
- **Use specific state evidence** that proves the action executed successfully
- **Violations indicate healthy specs** - counterexamples show successful execution paths exist
- **Satisfaction indicates problems** - no successful execution found, but since `quint run` uses random simulation, it might just be chance - report back and ask for guidance

### Using Quint REPL for Interactive Testing
- Start REPL: `quint repl -r spec.qnt::ModuleName`
- Use input redirection to send multiple commands:
  ```bash
  { 
    echo 'val testState = { ... }'
    echo 'functionName(testState, args)'
    echo '.exit'
  } | quint repl -r spec.qnt::ModuleName
  ```

#### Testing Pure Functions
- Create test states and call pure functions directly
- Verify mathematical calculations and business logic
- Debug function return values interactively

#### Testing Actions and State Changes

**Option 1: Start from init**
```bash
{ 
  echo 'init'
  echo 'actionName(args)'
  echo 'stateVariable'  # inspect state after action
  echo '.exit'
} | quint repl -r spec.qnt::ModuleName
```

**Option 2: Set custom state directly**
```bash
{ 
  echo 'all { balances'\'' = Map("alice" -> 500, "bob" -> 300), delegations'\'' = Set({delegator: "alice", validator: "validator1", amount: 200}), validators'\'' = Map("validator1" -> {address: "validator1", commissionRate: 5, active: true}), rewards'\'' = Map("alice" -> 25, "bob" -> 0), users'\'' = Set("alice", "bob"), activeValidators'\'' = Set("validator1"), lastActionSuccess'\'' = true }'
  echo 'actionName(args)'
  echo 'stateVariable'
  echo '.exit'
} | quint repl -r spec.qnt::ModuleName
```

**Testing Guidelines:**
- **Key insight**: Put entire `all { ... }` block on single line to avoid multiline input issues
- **Must assign all state variables** when using custom state
- Build complex scenarios through multiple sequential actions
- Inspect state variables after each action
- Test both successful and failing action scenarios
- Verify state remains unchanged when actions fail

### Witness-Driven Test Development Workflow

This workflow leverages witnesses to systematically discover interesting multi-step scenarios and transform them into focused tests.

#### The Witness-to-Test Pipeline
1. **Design an interesting witness**: Write a predicate that should be false in some reachable states
   ```quint
   // Example: Claim users never profit from staking
   val usersNeverProfit = balances.get("alice") <= INITIAL_BALANCE
   ```

2. **Run witness as invariant**: Use `quint run --invariant="witnessName" --mbt spec.qnt`
   - **Goal**: Get a violation (counterexample) that shows the interesting behavior
   - **If satisfied**: The state might be unreachable, or random simulation didn't find it - report back for guidance

3. **Analyze the counterexample**: Study the trace to understand the essential steps
   - **Look for the core sequence**: What actions actually led to the interesting state?
   - **Identify redundant actions**: Failed actions, irrelevant user actions, noise from random selection
   - **Understand the mathematical relationships**: Why did the interesting behavior occur?

4. **Extract the essential path**: Focus on the minimal sequence that demonstrates the behavior
   ```
   Example: 15-step trace → 3 essential steps
   - Step 4: Alice delegates 40 tokens
   - Step 8: Rewards distributed (Alice gets 21 after commission)  
   - Step 15: Alice claims rewards → balance exceeds initial
   ```

5. **Transform into test**: Write a focused test that captures the essential behavior
   ```quint
   run essentialBehaviorTest = {
     nondet delegationAmount = 30.to(100).oneOf()
     nondet rewardAmount = 50.to(100).oneOf()
     init
     .then(delegateTokens("alice", "validator2", delegationAmount))
     .expect(balances.get("alice") == INITIAL_BALANCE - delegationAmount)
     .then(distributeValidatorRewards("validator2", rewardAmount))
     .expect(rewards.get("alice") == rewardAmount - (rewardAmount * VALIDATOR2_COMMISSION) / 100)
     .then(claimUserRewards("alice"))
     .expect(balances.get("alice") == INITIAL_BALANCE - delegationAmount + actualReward)
   }
   ```

#### Benefits of This Workflow
- **Discovery**: Witnesses help find non-obvious behaviors in complex systems
- **Completeness**: Systematic exploration of state space rather than guessing scenarios  
- **Focus**: Counterexample analysis reveals the minimal essential steps
- **Robustness**: Nondeterministic tests provide broader coverage than hardcoded scenarios
- **Documentation**: Tests serve as executable specifications of interesting behaviors

#### Best Practices for Witnesses
- **Start with intuitive claims**: "Users never profit", "Balances never change", "Actions always succeed"
- **Use single-state predicates**: Witnesses check one state, not temporal properties
- **Focus on interesting outcomes**: States that represent successful complex workflows
- **Expect violations**: Witnesses should be designed to be false in reachable, interesting states

### Variable Scoping in Quint

#### Common Scoping Issues in Tests
When using variables in complex expressions, especially within conditional logic, you may encounter scoping errors:

```quint
// ❌ WRONG - actualReward not in scope for the if condition
.expect(and {
  val actualReward = rewardAmount - commissionAmount
  balances.get("alice") == finalBalance,
  if (actualReward > delegationAmount) {  // ERROR: actualReward not accessible
    balances.get("alice") > INITIAL_BALANCE
  } else {
    true
  }
})
```

#### Solution: Use `all` Blocks for Variable Scope
Wrap complex expressions with shared variables in `all` blocks:

```quint
// ✅ CORRECT - actualReward accessible within all block
.expect(and {
  val actualReward = rewardAmount - commissionAmount
  val finalBalance = INITIAL_BALANCE - delegationAmount + actualReward
  all {
    balances.get("alice") == finalBalance,
    if (actualReward > delegationAmount) {
      balances.get("alice") > INITIAL_BALANCE
    } else {
      true
    }
  }
})
```

#### Key Scoping Rules
- **Variables defined with `val`** are only accessible within their immediate scope
- **Use `all` blocks** to create shared scope for multiple conditions using the same variables
- **Comma-separate conditions** within `all` blocks, not `and` them
- **Test with REPL first** to debug scoping issues before writing complex test expectations

## Additional Context
<!-- Any other information you want me to always consider -->