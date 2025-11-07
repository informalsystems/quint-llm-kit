# Quint Templates Index

This file is the source of truth for template metadata. Edit this file to update templates.
Run `node scripts/build-templates-index.js` to regenerate `templates.json`.

---

## spec-template

**Name:** Standard Quint Spec Template

**Description:** Complete boilerplate for a new Quint specification following State type + Pure functions + Thin actions pattern

**Filename:** spec-template.qnt

**Framework:** standard

**Use for:**
- Smart contracts
- State machines
- DeFi protocols
- General systems

**Includes:**
- State type definition
- Constants
- Pure functions
- State variables
- Invariants
- Thin actions
- Action witnesses
- Initialization
- Step action

**Instructions:**
1. Replace 'System' with your module name
2. Define your types in section 1
3. Add constants in section 2
4. Implement business logic in pure functions (section 3)
5. Declare state variables matching State type (section 4)
6. Add invariants (section 5)
7. Create thin actions that call pure functions (section 6)
8. Add action witnesses for reachability testing (section 6.1)
9. Initialize state with mapBy for maps (section 7)
10. Configure step action for exploration (section 8)

---

## test-template

**Name:** Quint Test File Template

**Description:** Template for test file that imports and tests a Quint specification

**Filename:** test-template.qnt

**Framework:** standard

**Use for:**
- Testing specs after main spec is finalized

**Includes:**
- Import statement
- Concrete deterministic tests
- Non-deterministic tests with oneOf()

**Instructions:**
1. Create test file AFTER reviewing main spec
2. Replace 'system' with your module name
3. Replace 'System' with your imported module
4. Update test names and expectations
5. Start with concrete tests, add non-deterministic tests later

**Workflow:** Only create test file after reviewing and finalizing the main specification

---

## choreo-template

**Name:** Choreo Spec Template

**Description:** Complete boilerplate for a Choreo-based distributed protocol specification with listeners, messages, and state transitions

**Filename:** choreo-template.qnt

**Framework:** choreo

**Use for:**
- Consensus algorithms (PBFT, Tendermint, HotStuff, Raft)
- Byzantine fault tolerant protocols
- Multi-phase commit protocols
- Distributed coordination protocols
- Message-passing systems

**Includes:**
- Choreo import and setup
- Mandatory Choreo types (Node, Message, StateFields, etc.)
- Boilerplate type definitions
- Helper functions for message filtering
- Listener functions returning Set[Transition]
- Main listener combining all sub-listeners
- Initialization with choreo::init
- Step action with choreo::step
- Invariants and witnesses
- Testing helper step_with

**Instructions:**
1. Replace 'ProtocolName' with your protocol name
2. Define protocol roles in the Role type (section 1)
3. Define protocol stages in the Stage type (section 1)
4. Define all message types in the Message type (section 2)
5. Add protocol-specific fields to StateFields (section 2)
6. Create helper functions to filter/extract messages (section 4)
7. Write one listener function per protocol transition (section 5)
8. Combine all listeners in main_listener (section 6)
9. Define your nodes and assign roles (section 7)
10. Initialize each node's state in initialize() (section 8)
11. Add invariants for safety properties (section 10)
12. Add witnesses to test listener reachability (section 11)

**Workflow:** Use this template when building distributed protocols that require message passing, Byzantine fault tolerance, or consensus mechanisms

---

## choreo-test-template

**Name:** Choreo Test File Template

**Description:** Complete test file boilerplate for Choreo protocol specifications with multiple test scenarios: happy-path, timeouts, message injection, and complex workflows

**Filename:** choreo-test-template.qnt

**Framework:** choreo

**Use for:**
- Testing Choreo consensus protocols
- Testing Byzantine fault tolerant systems
- Testing multi-phase commit protocols
- Verifying distributed protocol behavior
- Testing timeout and recovery scenarios

**Includes:**
- Import with protocol parameters
- Test 1: Basic happy-path execution
- Test 2: Timeout handling and recovery
- Test 3: Message injection with .step_with_messages()
- Test 4: Multi-stage workflow with message extraction
- Test 5: Complex scenario with justification sets
- Helper patterns for common test operations

**Instructions:**
1. Replace 'protocol' and 'protocolTest' with your module names
2. Update import parameters (section 1) to match your protocol
3. Replace 'listener_name', 'action_name' with your actual listener/action names
4. Replace 'MessageType' with your actual message variant constructors
5. Update 'ExpectedStage', 'FinalStage' with your protocol stages
6. Replace 's.system.get(node).field' with your actual state fields
7. Update 'get_message_type()' with your message extraction helper
8. Modify test scenarios to match your protocol's behavior
9. Add/remove tests as needed for your specific protocol
10. Use helper patterns (section 7) for common operations

**Workflow:** Create this test file AFTER your Choreo protocol spec is complete. Use it to test happy paths, timeouts, message injection, and complex multi-stage workflows.

**Key patterns:**
- .with_cue(listener, params).perform(action) - Execute specific listener with parameters
- .step_with(listener) - Execute listener without parameters (timeouts)
- .step_with_messages(listener_fn, msg_fn) - Inject messages and filter listeners
- .find(predicate).unwrap() - Extract specific messages from message sets
- .expect(predicate) - Verify state after each step
- NODES.forall(n => condition) - Verify all nodes satisfy condition

