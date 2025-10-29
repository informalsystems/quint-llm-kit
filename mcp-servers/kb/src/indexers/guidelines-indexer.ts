import fs from 'fs';
import path from 'path';

export interface Pattern {
  id: string;
  name: string;
  category: 'architecture' | 'testing' | 'workflow' | 'consensus' | 'choreo';
  description: string;
  code?: string;
  applicability: 'general' | 'consensus' | 'choreo';
  related: string[];
  source: string;
  deprecated?: boolean;
  replacement?: string;
}

export interface Guideline {
  id: string;
  type: 'do' | 'dont';
  rule: string;
  rationale?: string;
  examples?: string[];
  category: 'safety' | 'correctness' | 'performance' | 'syntax' | 'testing';
  source: string;
}

export interface Workflow {
  id: string;
  name: string;
  purpose: string;
  steps: string[];
  tips?: string[];
  applicability: 'general' | 'consensus' | 'choreo';
  source: string;
}

export interface CodeExample {
  id: string;
  title: string;
  description: string;
  code: string;
  language: 'quint' | 'bash' | 'typescript';
  category: string;
  source: string;
}

export interface GuidelinesIndex {
  patterns: Pattern[];
  guidelines: Guideline[];
  workflows: Workflow[];
  examples: CodeExample[];
  deprecated: Array<{
    name: string;
    replacement: string;
    reason: string;
  }>;
  stats: {
    totalPatterns: number;
    totalGuidelines: number;
    totalWorkflows: number;
    totalExamples: number;
  };
}

/**
 * Extract patterns from spec-builder.md
 */
function extractSpecBuilderPatterns(): Pattern[] {
  return [
    {
      id: 'state-type-pattern',
      name: 'State Type Pattern',
      category: 'architecture',
      description: 'Encapsulate all system state in a single State record type',
      code: `type State = {
  field1: SomeType,
  field2: Map[Address, Amount],
  users: Set[Address]
}`,
      applicability: 'general',
      related: ['pure-functions', 'thin-actions', 'currentState-helper'],
      source: 'spec-builder.md'
    },
    {
      id: 'pure-functions-pattern',
      name: 'Pure Functions Pattern',
      category: 'architecture',
      description: 'All business logic in pure functions that take State and return {success, newState}',
      code: `pure def calculateOperation(
  state: State,
  user: Address,
  params: SomeParams
): {success: bool, newState: State} = {
  if (canPerform) {
    {success: true, newState: {...state, field: newValue}}
  } else {
    {success: false, newState: state}
  }
}`,
      applicability: 'general',
      related: ['state-type-pattern', 'thin-actions'],
      source: 'spec-builder.md'
    },
    {
      id: 'thin-actions-pattern',
      name: 'Thin Actions Pattern',
      category: 'architecture',
      description: 'Actions are thin wrappers that call pure functions and update state',
      code: `action performOperation(user: Address, params: SomeParams): bool = {
  val result = calculateOperation(currentState, user, params)
  if (result.success) {
    all {
      field1' = result.newState.field1,
      field2' = result.newState.field2
    }
  } else {
    unchanged_all
  }
}`,
      applicability: 'general',
      related: ['pure-functions-pattern', 'unchanged-all-helper'],
      source: 'spec-builder.md'
    },
    {
      id: 'map-initialization-pattern',
      name: 'Map Pre-population Pattern',
      category: 'architecture',
      description: 'Pre-populate all maps using mapBy to avoid undefined behavior',
      code: `action init = all {
  field2' = INITIAL_USERS.mapBy(user => INITIAL_BALANCE),
  balances' = INITIAL_USERS.mapBy(u =>
    INITIAL_DENOMINATIONS.mapBy(d => INITIAL_BALANCE))
}`,
      applicability: 'general',
      related: ['state-type-pattern'],
      source: 'spec-builder.md'
    },
    {
      id: 'action-witnesses-pattern',
      name: 'Action Witnesses Pattern',
      category: 'testing',
      description: 'Verify actions are reachable using witness predicates that should be violated',
      code: `val canDelegateSuccessfully = not(lastActionSuccess and delegations.size() > 0)
val canCompleteWorkflow = not(and {
  users.exists(u => balances.get(u) > INITIAL_BALANCE),
  delegations.size() == 0
})`,
      applicability: 'general',
      related: ['witness-driven-testing'],
      source: 'spec-builder.md'
    }
  ];
}

/**
 * Extract patterns from cons-specer.md
 */
function extractConsensusPatterns(): Pattern[] {
  return [
    {
      id: 'algorithm-consensus-split',
      name: 'Algorithm/Consensus Split Pattern',
      category: 'consensus',
      description: 'Separate pure algorithm logic from distributed system state',
      code: `// algorithm.qnt - pure functions
pure def processConsensusInput(
  state: LocalState,
  input: ConsensusInput,
  processId: ProcessID
): Result

// consensus.qnt - distributed state
type Environment = {
  processes: ProcessID -> LocalState,
  messageBuffer: Set[NetworkMessage]
}`,
      applicability: 'consensus',
      related: ['message-soup-pattern', 'fault-model-pattern'],
      source: 'cons-specer.md',
      deprecated: true,
      replacement: 'choreo-framework'
    },
    {
      id: 'message-soup-pattern',
      name: 'Message Soup Pattern',
      category: 'consensus',
      description: 'Model network as unordered message buffer with asynchronous delivery',
      code: `type NetworkMessage = {
  sender: ProcessID,
  receiver: ProcessID,
  message: Message
}

type Environment = {
  messageBuffer: Set[NetworkMessage],
  // ...
}`,
      applicability: 'consensus',
      related: ['algorithm-consensus-split'],
      source: 'cons-specer.md',
      deprecated: true,
      replacement: 'choreo-framework'
    },
    {
      id: 'fault-model-pattern',
      name: 'Fault Model Pattern',
      category: 'consensus',
      description: 'Define process sets with Byzantine/correct distinction and voting power',
      code: `const correctProcesses: Set[ProcessID]
const byzantineProcesses: Set[ProcessID]
const votingPower: ProcessID -> int

assume faultTolerance = all {
  correctProcesses.intersect(byzantineProcesses) == Set(),
  totalVotingPower > byzantineVotingPower * 3
}`,
      applicability: 'consensus',
      related: ['message-soup-pattern'],
      source: 'cons-specer.md',
      deprecated: true,
      replacement: 'choreo-framework'
    }
  ];
}

/**
 * Extract patterns from choreo-run-generation.md
 */
function extractChoreoPatterns(): Pattern[] {
  return [
    {
      id: 'choreo-cue-pattern',
      name: 'Choreo Cue Pattern',
      category: 'choreo',
      description: 'Separate "when" from "what" using listen-then-act pattern',
      code: `choreo::cue(ctx, listen_operator, upon_operator)

// listen_operator: Returns parameters when conditions met
// act_operator: Takes parameters and returns transition`,
      applicability: 'choreo',
      related: ['choreo-witness-pattern', 'choreo-custom-effects'],
      source: 'choreo-run-generation.md'
    },
    {
      id: 'choreo-witness-pattern',
      name: 'Choreo Witness for Reachability',
      category: 'choreo',
      description: 'Use custom effects and witnesses to test action reachability',
      code: `// 1. Add logging via custom effects
choreo::CustomEffect(Log(BroadcastedNotarVote(ctx.state.process_id, params)))

// 2. Write witness
val my_wit = match choreo::s.extensions.log {
  | BroadcastedNotarVote(_) => false
  | _ => true
}

// 3. Run to find counterexample
quint run file.qnt --main module --invariant my_wit`,
      applicability: 'choreo',
      related: ['choreo-cue-pattern', 'choreo-test-conversion'],
      source: 'choreo-run-generation.md'
    },
    {
      id: 'choreo-test-conversion',
      name: 'Choreo Test Conversion Pattern',
      category: 'choreo',
      description: 'Convert counterexamples to executable test runs',
      code: `run myTest =
  init
  .then("p1".with_cue(listen_operator, params).perform(action))
  .then("p2".with_cue(listen_operator, params).perform(action))`,
      applicability: 'choreo',
      related: ['choreo-witness-pattern'],
      source: 'choreo-run-generation.md'
    }
  ];
}

/**
 * Extract guidelines (do/don't rules)
 */
function extractGuidelines(): Guideline[] {
  return [
    {
      id: 'use-state-type',
      type: 'do',
      rule: 'Encapsulate all variables in one State record',
      rationale: 'Maintains single source of truth and makes state management explicit',
      category: 'correctness',
      source: 'spec-builder.md'
    },
    {
      id: 'logic-in-pure-functions',
      type: 'do',
      rule: 'Put ALL business logic in pure functions that return {success, newState}',
      rationale: 'Separates logic from state mutation, makes testing easier',
      category: 'correctness',
      source: 'spec-builder.md'
    },
    {
      id: 'pre-populate-maps',
      type: 'do',
      rule: 'Use mapBy to pre-populate all maps in init',
      rationale: 'Avoids undefined behavior from accessing non-existent keys',
      examples: [`balances' = INITIAL_USERS.mapBy(u => INITIAL_BALANCE)`],
      category: 'safety',
      source: 'spec-builder.md'
    },
    {
      id: 'separate-test-files',
      type: 'do',
      rule: 'Create separate test files, do not put tests in main spec',
      rationale: 'Keeps specification clean and focused',
      category: 'correctness',
      source: 'spec-builder.md'
    },
    {
      id: 'no-logic-in-actions',
      type: 'dont',
      rule: 'Do not put business logic in actions',
      rationale: 'Actions should be thin wrappers that call pure functions',
      category: 'correctness',
      source: 'spec-builder.md'
    },
    {
      id: 'no-multiple-variant-params',
      type: 'dont',
      rule: 'Do not use multiple parameters in variant constructors',
      rationale: 'Quint variants only accept single argument, use tuples instead',
      examples: ['TimeoutInput((height, round)) ✅', 'TimeoutInput(height, round) ❌'],
      category: 'syntax',
      source: 'spec-builder.md'
    },
    {
      id: 'no-map-get-without-check',
      type: 'dont',
      rule: 'Do not use map.get(key) without ensuring key exists',
      rationale: 'Causes undefined behavior, pre-populate or check with keys().contains()',
      category: 'safety',
      source: 'spec-builder.md'
    },
    {
      id: 'no-empty-operations',
      type: 'dont',
      rule: 'Do not use head(), tail(), nth() on empty collections',
      rationale: 'Causes undefined behavior, check size first',
      category: 'safety',
      source: 'spec-builder.md'
    },
    {
      id: 'use-expect-in-tests',
      type: 'do',
      rule: 'Every .then(action) should be followed by .expect(predicate)',
      rationale: 'Tests without expectations are useless, failed expectations reveal bugs',
      category: 'testing',
      source: 'CLAUDE.md'
    },
    {
      id: 'use-nondet-tests',
      type: 'do',
      rule: 'Use nondet for robust testing with broad parameter coverage',
      rationale: 'Tests thousands of cases vs single hardcoded scenarios',
      examples: ['nondet amount = 50.to(300).oneOf()'],
      category: 'testing',
      source: 'CLAUDE.md'
    },
    {
      id: 'repl-first-debugging',
      type: 'do',
      rule: 'Use REPL to discover actual behavior before writing tests',
      rationale: 'REPL results may reveal specification bugs, not wrong expectations',
      category: 'testing',
      source: 'CLAUDE.md'
    }
  ];
}

/**
 * Extract workflows (step-by-step processes)
 */
function extractWorkflows(): Workflow[] {
  return [
    {
      id: 'repl-first-testing',
      name: 'REPL-First Test Development',
      purpose: 'Discover actual behavior and find bugs before writing formal tests',
      steps: [
        'Design test scenario - plan actions and expected outcomes',
        'Debug with REPL - discover actual behavior (may reveal spec bugs!)',
        'Fix specification if needed - adjust logic based on discoveries',
        'Write test as action sequence - structure with .then() and .expect()',
        'Run tests with quint test - validate with proper command'
      ],
      tips: [
        'If REPL results surprise you, the spec likely has a bug',
        'Use input redirection: { echo "init"; echo "action"; } | quint repl',
        'Put entire all{} block on single line to avoid multiline issues'
      ],
      applicability: 'general',
      source: 'CLAUDE.md'
    },
    {
      id: 'witness-driven-testing',
      name: 'Witness-Driven Test Development',
      purpose: 'Systematically discover interesting scenarios and convert to tests',
      steps: [
        'Design interesting witness - predicate that should be false in reachable states',
        'Run witness as invariant - get violation showing interesting behavior',
        'Analyze counterexample - study trace for essential steps',
        'Extract essential path - focus on minimal sequence demonstrating behavior',
        'Transform into test - write focused test with nondeterministic parameters'
      ],
      tips: [
        'Violations indicate healthy specs - counterexamples show successful paths',
        'Use --mbt flag to see action calls and nondeterministic picks',
        'Start with intuitive claims like "Users never profit"'
      ],
      applicability: 'general',
      source: 'CLAUDE.md'
    },
    {
      id: 'choreo-reachability-testing',
      name: 'Choreo Action Reachability Testing',
      purpose: 'Test that Choreo actions can be reached using custom effects',
      steps: [
        'Add custom effects for logging at each relevant action',
        'Create init_displayer and step_with_displayer actions',
        'Write witness checking for log entries',
        'Run with --invariant to find counterexample',
        'Minimize counterexample by decreasing --max-steps',
        'Convert counterexample to test using with_cue and perform',
        'Remove instrumentation keeping only tests'
      ],
      tips: [
        'Use single-log approach: log: LogType not ProcessID -> Set[LogType]',
        'Increase steps if timeout, decrease to minimize counterexample',
        'Use with_cue and perform to ensure tests are not "cheating"'
      ],
      applicability: 'choreo',
      source: 'choreo-run-generation.md'
    },
    {
      id: 'interactive-spec-building',
      name: 'Interactive Quint Specification Builder',
      purpose: 'Build specifications incrementally through guided questions',
      steps: [
        'Types - define domain entities and State type',
        'Constants - specify initial configuration values',
        'Pure Functions - implement business logic',
        'State Variables - create variables matching State type',
        'Invariants - define properties that must always hold',
        'Actions - create thin wrappers calling pure functions',
        'Initialization - set up initial state with pre-populated maps',
        'Step Action - enable non-deterministic exploration',
        'STOP - review main spec before creating tests'
      ],
      applicability: 'general',
      source: 'spec-builder.md'
    }
  ];
}

/**
 * Build complete guidelines index
 */
export function buildGuidelinesIndex(guidelinesDir: string, outputPath: string): void {
  console.log('Building guidelines and patterns index...');

  const patterns: Pattern[] = [
    ...extractSpecBuilderPatterns(),
    ...extractConsensusPatterns(),
    ...extractChoreoPatterns()
  ];

  const guidelines = extractGuidelines();
  const workflows = extractWorkflows();

  // Extract code examples from files
  const examples: CodeExample[] = [
    {
      id: 'amm-pure-function',
      title: 'AMM Swap Pure Function',
      description: 'Complete swap logic with constant product formula',
      code: `pure def calculateSwap(
  state: State,
  user: Address,
  sourceDenom: Denomination,
  targetDenom: Denomination,
  amountIn: Amount
): {success: bool, newState: State} = {
  val sourceReserve = state.pool.reserves.get(sourceDenom)
  val targetReserve = state.pool.reserves.get(targetDenom)
  val k = calculateK(state.pool.reserves)

  if (canSwap) {
    val newSourceReserve = sourceReserve + amountIn
    val newTargetReserve = k / newSourceReserve
    val amountOut = targetReserve - newTargetReserve

    {success: true, newState: {...state, ...}}
  } else {
    {success: false, newState: state}
  }
}`,
      language: 'quint',
      category: 'pure-functions',
      source: 'spec-builder.md'
    }
  ];

  const deprecated = [
    {
      name: 'cons-specer',
      replacement: 'choreo',
      reason: 'Consensus Specer pattern replaced by Choreo framework for distributed protocols'
    }
  ];

  const index: GuidelinesIndex = {
    patterns,
    guidelines,
    workflows,
    examples,
    deprecated,
    stats: {
      totalPatterns: patterns.length,
      totalGuidelines: guidelines.length,
      totalWorkflows: workflows.length,
      totalExamples: examples.length
    }
  };

  // Write to output
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(index, null, 2));

  console.log(`✓ Indexed ${patterns.length} patterns, ${guidelines.length} guidelines, ${workflows.length} workflows`);
  console.log('\nPatterns by category:');
  const patternsByCategory = new Map<string, number>();
  patterns.forEach(p => {
    patternsByCategory.set(p.category, (patternsByCategory.get(p.category) || 0) + 1);
  });
  patternsByCategory.forEach((count, category) => {
    console.log(`  ${category}: ${count} patterns`);
  });

  console.log('\nGuidelines by type:');
  const guidelinesByType = { do: 0, dont: 0 };
  guidelines.forEach(g => guidelinesByType[g.type]++);
  console.log(`  ✅ DO: ${guidelinesByType.do}`);
  console.log(`  ❌ DON'T: ${guidelinesByType.dont}`);
}
