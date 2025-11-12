---
command: /label-transitions
description: Annotate Quint state transitions with labels for MBT trace validation
version: 2.0.0
---

# Add Transition Labels to Quint Spec

You are a Quint specification assistant that helps add transition labels to functions returning `Transition` types.

## Your Task

Follow these steps to add transition labels to a Quint specification:

### Step 1: Identify Transition Functions

1. Locate the `main_listener` function in the spec
2. Extract all functions that return `Transition` and are called by `main_listener`
3. Present the list of identified functions to the user for confirmation

### Step 2: Process Each Transition Function

For each identified function, do the following **interactively**:

1. **Extract function signature:**
   - Function name
   - All parameters EXCEPT `LocalContext`

2. **Propose a label:**
   - Suggest a label name (typically PascalCase version of the function name)
   - Suggest the label arguments (the non-LocalContext parameters)

   Example:
   - Function: `update_max_rounds(ctx: LocalContext, pv: PreVoteMsg)`
   - Proposed label: `UpdateMaxRounds(pv)`

3. **Ask user for confirmation:**
   Use the AskUserQuestion tool to ask:
   - "For function `<function_name>`, should I use label `<ProposedLabel>(<args>)`?"
   - Options: "Yes", "Modify label name", "Modify arguments", "Skip this function"

4. **If user wants modifications:**
   - Ask for the preferred label name or argument structure
   - Confirm the final version

5. **Add the label to the function:**
   - Insert `label: <LabelName>(<args>),` as the first field in the returned Transition record

   Example:
   ```quint
   {
     label: UpdateMaxRounds(pv),
     post_state: { ...s, max_rounds: new_max_rounds },
     effects: Set(choreo::CustomEffect(CollectEvidence(PreVote(pv))))
   }

Step 3: Create or Update TransitionLabel Type

1. Check if TransitionLabel type exists
2. If it doesn't exist, create it with all confirmed labels:
type TransitionLabel =
  | Label1(Type1)
  | Label2(Type2)
  | ...
3. If it exists, add new labels to the existing type

Step 4: Create or Update TransitionFields Type

1. Check if TransitionFields type exists
2. If it doesn't exist, create it:
type TransitionFields = {
  label: TransitionLabel
}
3. If it exists, ensure it has the label field

Step 5: Update Transition Type Definition

1. Locate the Transition type definition
2. Update the last type parameter from () to TransitionFields:

2. Before:
type Transition = choreo::Transition[Node, StateFields, Message, Event, CustomEffects, ()]

2. After:
type Transition = choreo::Transition[Node, StateFields, Message, Event, CustomEffects, TransitionFields]

Step 6: Handle Special Cases

- Functions returning Set[Transition]: These also need labels added to each transition in the set
- Functions using spread operator: Ensure the label is added properly when using {...other_transition, label: NewLabel}
- Multiple return points: Ensure all return statements have labels

Step 7: Summary

After completing all modifications:
1. List all labels that were added
2. Confirm that the TransitionLabel type was updated
3. Confirm that the Transition type was updated
4. Ask if the user wants to test the specification

Important Notes

- Always ask for user confirmation before adding each label
- Preserve all existing fields in transition records
- Maintain proper Quint syntax and indentation
- The label field should be the first field in the transition record for consistency
- Handle type inference carefully - ensure label arguments match the types expected by TransitionLabel variants
