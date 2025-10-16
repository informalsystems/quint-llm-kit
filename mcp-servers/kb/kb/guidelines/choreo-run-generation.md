# Tutorial on how to get test runs that cover certain listeners

## Step 1: Add custom effects/extensions for logging

At each action in main_listener, when something relevant is done, produce an (additional) effect like `choreo::CustomEffect(Log(BroadcastedNotarFallbackVote(ctx.state.process_id, params)))`. On `apply_custom_effect`, extract the string and add it to an environment extension called `log` with a sum type. 

Then, create `action init_diplayer` and replace `action step` with versions that use a `displayer`:
```
 // keep action init for the tests

 action init_displayer = choreo::init_with_displayer({
    // keep the original initialization
    system: ...,
    messages: ...,
    events: ...,
    extensions: ...,
  }, displayer)

  action step = choreo::step_with_displayer(
    main_listener,
    apply_custom_effect,
    displayer
  )
```

Define `displayer` as
```
  pure def displayer(ctx) = {
    ctx.extensions.log
  }
```

Use `quint typecheck file.qnt` to make sure you got it right.

## Step 2: Witness

Now write a witness like
```
val my_wit = match choreo::s.extensions.log {
  | BroadcastedNotarFallbackVote(_) => false
  | _ => true
}
```

and run the following, where <module> is the module that imports choreo (where `import choreo` is written):

```
quint run file.qnt --main my_protocol --invariant my_wit --hide <module>::choreo::s --init init_displayer
```

This should result in a violation and give you a counterexample.

If it timesout or returns ok: INCREASE the number of steps until you find a violation. If you can't report a problems as this means this action can be unreacheable.

If it returns a violation, GREAT! Try to minimize the counterexample by DECREASING the number of steps
```
quint run file.qnt --main my_protocol --invariant my_wit --max-steps=19 --hide <module>::choreo::s --init init_displayer
```

with smaller and smaller `--max-steps` until you can't find a violation anymore. Then, use the smallest violation you found for the next step.

## Step 3: Convert the counterexample into a run

Examine the counterexample, specially the log field, and, for each pair of consecutive states, write a `then()` statement that correspond what happen from one state to the other.

### Detailed instructions for the particular choreo::cue pattern use case

Suppose you see the log `BroadcastedNotarFallbackVote` in State 1 of the counterexample.

And you have this in the `main_listener`:
```
  pure def main_listener(ctx: LocalContext): Set[Transition] =
    Set(
      choreo::cue(ctx, listen_block_inputs, process_block_input),
      choreo::cue(ctx, listen_timeouts, skip_window_if_voted),
      choreo::cue(ctx, listen_block_notarized, try_finalize_block),
      choreo::cue(ctx, listen_parent_ready, check_pending_and_start_timeout),
      choreo::cue(ctx, listen_safe_to_notar, broadcast_fallback_notar_vote),
      choreo::cue(ctx, listen_safe_to_skip, broadcast_fallback_skip_vote)
    ).flatten()
```

and the only place in the code you can find this log is in
```
  pure def broadcast_fallback_notar_vote(ctx: LocalContext, params: { slot: Slot, hash: Blockhash }): Transition = {
    val s1 = trySkipWindow(ctx.state, params.slot)
    if (not(ItsOver.in(s1.post_state.state[params.slot])))
      // Notar-fallback vote
      val effects = s1.effects.union(
        Set(
          choreo::Broadcast({
            sender: ctx.state.process_id,
            msg: NotarFallBackVoteMsg({ slot: params.slot, hash: params.hash })
          }),
          choreo::CustomEffect(Log(BroadcastedNotarFallbackVote(ctx.state.process_id, params))),
        )
      )
      { effects: effects, post_state: addObjects(s1.post_state, params.slot, Set(BadWindow)) }
    else
      s1
```

Then you know the only way to get from state 0 to state 1 is by calling:
```
<process_id>.with_cue(listen_safe_to_notar, <params>).perform(broadcast_fallback_notar_vote)
```

You MUST use `with_cue` and `perform` as they run important checks to make sure your testing is not "cheating".

Doing this for every state, you'll end up with something like:
```
run myTest =
  init
    .then("p1".with_cue(listen_proposal_in_propose, v0_proposal).perform(broadcast_prevote_for_proposal))
    .then("p2".with_cue(listen_proposal_in_propose, v1_proposal).perform(broadcast_prevote_for_proposal))
    .then("p1".with_cue(listen_proposal_in_prevote_commit, v0_proposal).perform(lock_value_and_precommit))
    .then("p2".with_cue(listen_proposal_in_prevote_commit, v1_proposal).perform(lock_value_and_precommit))
    .then("p1".with_cue(listen_proposal_in_precommit_no_decision, v0_proposal).perform(decide_on_proposal))
    .then("p2".with_cue(listen_proposal_in_precommit_no_decision, v1_proposal).perform(decide_on_proposal))
```

test it with
```
quint test file.qnt --main my_protocol --match myTest
```
(or ommit `--match myTest` for all tests)

## Step 4: Remove all the instrumentation

Keep only the tests, and remove the logs and extensions you added.

## Step 3.1: Working with Complex Counterexamples

For complex actions that require specific preconditions, the counterexample may be quite long (10+ states). Here are strategies for handling them:

### Analyzing the Counterexample Structure
1. **Identify the target action**: Look for the specific log entry you want to test in the final state
2. **Trace backwards**: Each log entry shows what action was performed and by which process
3. **Map logs to listener/action pairs**: Use your main_listener structure to identify which listener/action combination produces each log

### Converting Complex Traces
When you see a log entry like `ProcessedBlockInput({ block: { hash: 48, parent: 43, slot: 2 }, process: "v4" })`, convert it to:
```
.then("v4".with_cue(listen_block_inputs, { hash: 48, parent: 43, slot: 2 }).perform(process_block_input))
```

The pattern is:
- Process ID from the log entry
- Listener function that would trigger this action (infer from main_listener structure)
- Parameters extracted from the log entry data
- Action function that produces this log

### Practical Tips
1. **Start simple**: Try to minimize max-steps first to get the shortest counterexample
2. **Work sequentially**: Convert each state transition one by one
3. **Validate as you go**: Test intermediate runs with fewer steps to catch errors early
4. **Handle repeated actions**: The same action may appear multiple times with different parameters

## Additional Learnings from Alpenglow Application

### Single vs Multi-Log Approaches
The original approach stored per-process log history (`log: ProcessID -> Set[LogType]`), but a simpler single-log approach works better (`log: LogType`):
- Easier to write witnesses: `match s.extensions.log { | MyAction(_) => false | _ => true }`
- Cleaner counterexample output
- Sufficient for finding reachable actions

### Apply Custom Effect Function
The `apply_custom_effect` function signature for choreo::step must be:
```
def apply_custom_effect(env: GlobalContext, effect: CustomEffects): GlobalContext
```

For single-log approach, simplify to:
```
def apply_custom_effect(env: GlobalContext, effect: CustomEffects): GlobalContext =
  match effect {
    | Log(logType) => {
      { ...env, extensions: { ...env.extensions, log: logType } }
    }
    | _ => env
  }
```

### Removing Instrumentation
When removing instrumentation, make sure to:
1. Remove LogType definitions
2. Remove log field from Extensions
3. Remove all Log(...) custom effects from action functions
4. Restore original apply_custom_effect signature to `(c, _) => c`
5. Update tests to check actual effects (messages, state changes) rather than log entries

### Test Coverage Strategy
1. **Simple actions first**: Test actions with easily satisfied preconditions using direct test runs
2. **Complex actions via witnesses**: Use witness-based counterexample generation for actions requiring complex state setups
3. **Convert select complex cases**: Pick 1-2 complex actions to manually convert counterexamples to test runs for documentation purposes
4. **Focus on edge cases**: The manually constructed runs serve as documentation of the complex preconditions required
