# Interactive Quint Specification Builder

## Essential Patterns for Writing Quint Specifications

### File Structure
- **Main spec**: `system.qnt` - core logic only
- **Tests**: Create `systemTest.qnt` later when needed after reviewing main spec

### Core Architecture Pattern

```quint
// -*- mode: Bluespec; -*-

module System {
  // 1. TYPES - Define your data structures
  type Address = str
  type Amount = int
  
  // Always use a State type to encapsulate everything
  type State = {
    field1: SomeType,
    field2: Map[Address, Amount],
    users: Set[Address]
  }
  
  // 2. CONSTANTS - Configuration values
  pure val INITIAL_BALANCE = 1000
  pure val INITIAL_USERS = Set("alice", "bob", "charlie")
  
  // 3. PURE FUNCTIONS - All business logic goes here
  /// Core operation logic - pure function does ALL the work
  pure def calculateOperation(
    state: State,
    user: Address,
    params: SomeParams
  ): {success: bool, newState: State} = {
    // Validation
    val canPerform = state.users.contains(user) and /* other checks */
    
    if (canPerform) {
      // Calculate new state
      val newField1 = /* computation */
      val newField2 = state.field2.set(user, /* new value */)
      
      {
        success: true,
        newState: { ...state, field1: newField1, field2: newField2 }
      }
    } else {
      {success: false, newState: state}
    }
  }
  
  // 4. STATE VARIABLES
  var field1: SomeType
  var field2: Map[Address, Amount] 
  var users: Set[Address]
  
  // Helper to get current state
  val currentState = {
    field1: field1,
    field2: field2,
    users: users
  }
  
  // 5. INVARIANTS - What should always be true
  val noNegativeBalances = users.forall(u => field2.get(u) >= 0)
  
  // 6. ACTIONS - Thin wrappers that call pure functions
  action unchanged_all = all {
    field1' = field1,
    field2' = field2, 
    users' = users
  }
  
  // 6.1. ACTION WITNESSES - Reachability tests for action execution
  /// Check if operations can execute successfully (action witness should be violated)
  val canPerformOperationSuccessfully = not(lastActionSuccess and /* evidence of successful operation */)
  /// Check if complex workflow can complete (action witness should be violated)  
  val canCompleteWorkflow = not(/* state indicating successful completion */)
  
  action performOperation(user: Address, params: SomeParams): bool = {
    val result = calculateOperation(currentState, user, params)
    
    if (result.success) {
      all {
        field1' = result.newState.field1,
        field2' = result.newState.field2,
        users' = result.newState.users
      }
    } else {
      unchanged_all
    }
  }
  
  // 7. INITIALIZATION
  action init = all {
    field1' = initialValue,
    field2' = INITIAL_USERS.mapBy(user => INITIAL_BALANCE),
    users' = INITIAL_USERS
  }
  
  // 8. STEP ACTION  
  action step = {
    nondet user = INITIAL_USERS.oneOf()
    nondet param = 1.to(100).oneOf()
    
    any {
      performOperation(user, param),
      // other operations
    }
  }
}
```

### Test File Template (Create When Needed)

**Only create a test file after reviewing and finalizing the main specification.** When ready, create `systemTest.qnt`:

```quint
// -*- mode: Bluespec; -*-

module systemTest {
  import System.* from "./system"
  
  /// Working concrete test
  run basicOperationTest = {
    init
    .expect(
      // Check initial state
      and {
        field1 == initialValue,
        users.size() == 3,
        field2.get("alice") == INITIAL_BALANCE
      }
    )
    .then(
      performOperation("alice", 42)
    )
    .expect(
      // Check expected result
      and {
        field1 == expectedValue,
        field2.get("alice") == expectedBalance
      }
    )
  }
  
  /// Non-deterministic test (fix later if needed)
  run variableTest = {
    nondet user = INITIAL_USERS.oneOf()
    nondet amount = 1.to(100).oneOf()
    
    init
    .then(performOperation(user, amount))
    .expect(
      // Flexible expectations
      and {
        field2.get(user) >= 0,  // Basic safety
        users.contains(user)     // User still exists
      }
    )
  }
}
```

## Key Rules to Follow

### ✅ Do This
- **State type**: Encapsulate all variables in one `State` record
- **Pure functions**: Put ALL logic in pure functions that take `State` and return `{success, newState}`
- **Thin actions**: Actions just call pure functions and update state
- **Pre-populate maps**: Use `mapBy` to avoid empty map access errors
- **Separate files**: Main spec has no tests, test file imports with `from "./fileName"`

### ❌ Avoid This
- Don't put business logic in actions
- Don't use `localStorage` or `sessionStorage`
- Don't use `oneOf(collection)` - use `collection.oneOf()`
- Don't use `pure def name() = ...` - use `pure def name = ...` for no parameters
- Don't put test scenarios in the main specification file
- Don't use `.with()` syntax - use spread syntax `{ ...state, field: newValue }` instead
- Don't use `Map[TypeA, TypeB]` - use `TypeA -> TypeB` for map types
- **Don't use multiple parameters in variant constructors** - Quint variant constructors can only take a single argument. Use tuples instead: `TimeoutInput((height, round))` not `TimeoutInput(height, round)`
- **Don't destructure tuples in pattern matching** - Quint doesn't allow `| TimeoutInput((height, round)) =>`. Instead bind the tuple and use `._1`, `._2`: `| TimeoutInput(height_round) => ... height_round._1, height_round._2`
- **Don't use `map.get(key)` without ensuring key exists** - This has undefined behavior. Pre-populate maps with `mapBy` or check with `keys().contains(key)` first
- **Don't use `set.getOnlyElement()` on sets that aren't size 1** - This has undefined behavior. Use `chooseSome()` for deterministic selection or `oneOf()` for non-deterministic
- **Don't use `list.head()` or `list.tail()` on empty lists** - This has undefined behavior. Check `list.length() > 0` first
- **Don't use `list.nth(i)` with invalid indices** - Ensure `i >= 0` and `i < list.length()` to avoid undefined behavior
- **Don't use `range(i, j)` or `i.to(j)` with `i > j`** - This has undefined behavior. Ensure `i <= j`

## Interactive Checklist Workflow

When you ask me to "use the Interactive Quint Specification Builder", I will walk through each step interactively:

### Step-by-Step Process
1. **Types** - I'll ask: "What are your core data types? What entities and structures does your system need?"
   - You describe your domain (users, assets, positions, etc.)
   - I add the types including a comprehensive `State` type

2. **Constants** - I'll ask: "What are your initial configuration values? Starting balances, limits, parameters?"
   - You specify initial users, balances, system parameters
   - I add the constants section

3. **Pure Functions** - I'll ask: "What are your core operations? What business logic do you need?"
   - You describe each operation (supply, borrow, swap, etc.)
   - I implement pure functions that take `State` and return `{success, newState}`

4. **State Variables** - I'll ask: "Should I create state variables matching your State type?"
   - Usually yes - I create variables matching all State fields
   - I add the `currentState` helper

5. **Invariants** - I'll ask: "What properties should always hold? Safety conditions?"
   - You describe what should never break (no negative balances, conservation laws, etc.)
   - I add invariant definitions

6. **Actions** - I'll ask: "Should I create thin action wrappers for each pure function?"
   - Usually yes - I create actions that call pure functions and update state
   - I add the `unchanged_all` helper

7. **Initialization** - I'll ask: "How should the system start? What are the initial values?"
   - You specify starting state
   - I create `init` action with pre-populated maps

8. **Step Action** - I'll ask: "What operations should be available for exploration? What parameters?"
   - You specify which actions and parameter ranges
   - I create non-deterministic `step` action
   - **Then I verify**: Check that the spec follows the Core Architecture Pattern order: (1) Types, (2) Constants, (3) Pure Functions, (4) State Variables, (5) Invariants, (6) Actions, (7) Initialization, (8) Step Action

9. **STOP HERE** - I'll say: "Main spec complete! Review it thoroughly before we create any tests."

### Usage
Simply say: **"Use the Interactive Quint Specification Builder for [your system name]"** and I'll start the interactive process.

## Quick Checklist
1. [ ] Types defined (including State type)
2. [ ] Constants for initial setup
3. [ ] Pure functions for all business logic
4. [ ] State variables match State type fields
5. [ ] Invariants defined
6. [ ] Actions call pure functions
7. [ ] Init pre-populates all maps
8. [ ] Step action for exploration
9. [ ] **STOP HERE** - Review main spec before creating tests
10. [ ] Create separate test file only when main spec is finalized

## Common Patterns

**Map updates**: `map.set(key, map.get(key).setBy(field, old => old + amount))`

**Fold initialization**: 
```quint
val maxVal = collection.fold(0, (acc, x) => max(acc, x))
val minVal = collection.fold(maxVal, (acc, x) => min(acc, x))
```

**Non-deterministic choice**: `collection.oneOf()` and `any { action1, action2 }`

**File imports**: `import ModuleName.* from "./fileName"`

## Blueprint Example: Real AMM Implementation

Here's how these patterns look in a complete DeFi AMM specification:

### Type Hierarchy
```quint
type Address = str
type Amount = int
type Denomination = str

// Pool reserves stored as a map from denomination to amount
type Pool = {
  reserves: Denomination -> Amount,
  totalSupply: Amount,  // Total LP tokens
  k: Amount            // Constant product
}

// Complete system state
type State = {
  pool: Pool,
  balances: Address -> Denomination -> Amount,
  lpShares: Address -> Amount,
  users: Set[Address],
  denominations: Set[Denomination]
}
```

### Pure Function Example
```quint
/// Core swap logic - pure function that calculates swap output
pure def calculateSwap(
  state: State,
  user: Address,
  sourceDenom: Denomination,
  targetDenom: Denomination,
  amountIn: Amount
): {success: bool, newState: State} = {
  
  val sourceReserve = state.pool.reserves.get(sourceDenom)
  val targetReserve = state.pool.reserves.get(targetDenom)
  val k = calculateK(state.pool.reserves)
  val userHasFunds = state.balances.get(user).get(sourceDenom) >= amountIn
  
  val canSwap = and {
    amountIn > 0,
    sourceReserve > 0,
    targetReserve > 0,
    sourceDenom != targetDenom,
    userHasFunds
  }
  
  if (canSwap) {
    val newSourceReserve = sourceReserve + amountIn
    val newTargetReserve = k / newSourceReserve
    val amountOut = targetReserve - newTargetReserve
    
    if (amountOut > 0 and newTargetReserve > 0) {
      val newReserves = state.pool.reserves.set(sourceDenom, newSourceReserve)
                                           .set(targetDenom, newTargetReserve)
      val newUserBalances = state.balances.get(user)
                                          .setBy(sourceDenom, old => old - amountIn)
                                          .setBy(targetDenom, old => old + amountOut)
      
      {
        success: true,
        newState: { 
          ...state, 
          pool: { ...state.pool, reserves: newReserves, k: calculateK(newReserves) },
          balances: state.balances.set(user, newUserBalances)
        }
      }
    } else {
      {success: false, newState: state}
    }
  } else {
    {success: false, newState: state}
  }
}
```

### Thin Action Wrapper
```quint
/// Swap tokens using the core logic
action swap(user: Address, sourceDenom: Denomination, targetDenom: Denomination, amountIn: Amount): bool = {
  val result = calculateSwap(currentState, user, sourceDenom, targetDenom, amountIn)
  
  if (result.success) {
    all {
      pool' = result.newState.pool,
      balances' = result.newState.balances,
      lpShares' = result.newState.lpShares,
      users' = result.newState.users,
      denominations' = result.newState.denominations
    }
  } else {
    unchanged_all
  }
}
```

### Comprehensive Invariants
```quint
/// The constant product should be maintained
val constantProductInvariant = 
  pool.k == calculateK(pool.reserves) or pool.totalSupply == 0

/// No negative balances
val noNegativeBalances = 
  users.forall(user => 
    denominations.forall(denom =>
      balances.get(user).get(denom) >= 0
    ) and lpShares.get(user) >= 0
  )

/// Pool reserves should be non-negative
val nonNegativeReserves = 
  denominations.forall(denom => pool.reserves.get(denom) >= 0)
```

### Proper Initialization
```quint
action init = all {
  pool' = {
    reserves: INITIAL_DENOMINATIONS.mapBy(_ => 0),
    totalSupply: 0,
    k: 0
  },
  balances' = INITIAL_USERS.mapBy(user => 
    INITIAL_DENOMINATIONS.mapBy(denom => INITIAL_BALANCE)),
  lpShares' = INITIAL_USERS.mapBy(user => 0),
  users' = INITIAL_USERS,
  denominations' = INITIAL_DENOMINATIONS
}
```

Start with this template and modify for your specific domain! Review the main specification thoroughly before adding any tests.

## Writing Action Witnesses for Reachability Testing

### What are Action Witnesses?
Action witnesses are **reachability tests** that verify your actions can execute successfully. They complement invariants by testing that the specification isn't over-constrained. Unlike general witnesses for interesting scenarios, action witnesses specifically focus on verifying that core operations remain executable.

### When to Add Action Witnesses
Add action witnesses **after creating actions** (section 6.1) to verify each action can reach successful execution.

### Action Witness Pattern
```quint
// Template: Check if [action] can execute successfully
val can[Action]Successfully = not(lastActionSuccess and [evidence_of_successful_execution])
```

### Key Principles
1. **Action witnesses should be VIOLATED in healthy specs** - violations mean successful execution paths exist
2. **Action witnesses should be SATISFIED in broken specs** - satisfaction means no successful execution found
3. **Use `not()` to invert logic** - we want to find successful cases, so negate the failure condition

### Common Action Witness Examples

#### Basic Action Witnesses
```quint
// For staking systems
val canDelegateSuccessfully = not(lastActionSuccess and delegations.size() > 0)
val canUndelegateSuccessfully = not(lastActionSuccess and users.exists(u => balances.get(u) > INITIAL_BALANCE))
val canClaimRewardsSuccessfully = not(lastActionSuccess and users.exists(u => rewards.get(u) == 0 and balances.get(u) > INITIAL_BALANCE))

// For lending systems  
val canBorrowSuccessfully = not(lastActionSuccess and totalBorrowed > 0)
val canRepaySuccessfully = not(lastActionSuccess and users.exists(u => debt.get(u) < initialDebt))

// For trading systems
val canTradeSuccessfully = not(lastActionSuccess and trades.size() > 0)
val canCancelOrderSuccessfully = not(lastActionSuccess and activeOrders.size() < maxOrders)
```

#### Complex Workflow Action Witnesses
```quint
// Multi-step workflows
val canCompleteFullCycle = not(and {
  // Evidence that full delegate->distribute->claim cycle completed
  users.exists(u => balances.get(u) > INITIAL_BALANCE),
  delegations.size() == 0,  // All undelegated
  users.forall(u => rewards.get(u) == 0)  // All claimed
})

// State transitions
val canReachNonTrivialState = not(and {
  delegations.size() > 2,  // Multiple delegations exist
  users.exists(u => rewards.get(u) > 50),  // Significant rewards accumulated
  totalDelegated > INITIAL_BALANCE / 2  // Substantial staking activity
})
```

### Action Witness Design Patterns

#### Pattern 1: Success + Evidence
```quint
val can[Action]Successfully = not(lastActionSuccess and [state_evidence])
// Examples:
val canDelegateSuccessfully = not(lastActionSuccess and delegations.size() > 0)
val canSwapSuccessfully = not(lastActionSuccess and totalVolume > 0)
```

#### Pattern 2: State Change Evidence
```quint  
val can[Action]Successfully = not([evidence_of_state_change])
// Examples:
val canWithdrawSuccessfully = not(users.exists(u => balances.get(u) > INITIAL_BALANCE))
val canLiquidateSuccessfully = not(liquidatedPositions.size() > 0)
```

#### Pattern 3: Complex Conditions
```quint
val canComplexActionSuccessfully = not(and {
  lastActionSuccess,
  [condition1],
  [condition2], 
  [condition3]
})
```

### Best Practices
1. **Add witnesses for every major action** to ensure all operations are reachable
2. **Test witnesses immediately** after adding them to verify they work correctly
3. **Use specific state evidence** - check for concrete changes that prove success
4. **Document expected outcomes** - violations = good, satisfied = problem
5. **Combine with comprehensive test suites** for complete specification validation

### Debugging Action Witness Issues
- **Action witness always satisfied**: Action is over-constrained or has bugs preventing execution
- **Action witness never satisfied**: Witness logic might be incorrect, or action has no success criteria
- **Unexpected violation traces**: Review the counterexample to understand what successful execution looks like