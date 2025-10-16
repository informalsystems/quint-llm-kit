// Framework routing logic - guides users to the right approach

const CHOREO_KEYWORDS = [
  'consensus', 'bft', 'byzantine', 'distributed',
  'pbft', 'tendermint', 'hotstuff', 'raft', 'paxos',
  'leader', 'voting', 'rounds', 'view change', 'viewchange',
  'two-phase', 'three-phase', '2pc', '3pc',
  'coordinator', 'participant', 'message passing',
  'commit protocol', 'agreement', 'synchronization',
  'broadcast', 'gossip', 'epoch'
];

const STANDARD_KEYWORDS = [
  'smart contract', 'token', 'erc20', 'defi',
  'auction', 'game', 'puzzle', 'state machine',
  'vending machine', 'lock', 'mutex', 'bank account'
];

interface FrameworkSuggestion {
  framework: 'choreo' | 'standard';
  confidence: number;
  reasoning: string;
  docs: string[];
  examples?: string[];
}

export function suggestFramework(description: string): FrameworkSuggestion {
  const lower = description.toLowerCase();

  // Match against Choreo keywords
  const choreoMatches = CHOREO_KEYWORDS.filter(kw => lower.includes(kw));

  // Match against standard keywords
  const standardMatches = STANDARD_KEYWORDS.filter(kw => lower.includes(kw));

  // Choreo is preferred if we match any consensus/distributed keywords
  if (choreoMatches.length > 0) {
    const confidence = Math.min(0.7 + (choreoMatches.length * 0.1), 0.99);

    return {
      framework: 'choreo',
      confidence,
      reasoning: `Matched Choreo keywords: ${choreoMatches.join(', ')}. Choreo is the recommended framework for distributed consensus protocols.`,
      docs: [
        'choreo/tutorial.mdx',
        'choreo/index.mdx'
      ],
      examples: [
        'cosmos/tendermint',
        'cosmos/ics20'
      ]
    };
  }

  // Standard Quint approach
  if (standardMatches.length > 0) {
    return {
      framework: 'standard',
      confidence: 0.8,
      reasoning: `Matched standard patterns: ${standardMatches.join(', ')}. Use State type + Pure functions + Thin actions pattern.`,
      docs: [
        'docs/language-basics.mdx',
        'docs/lessons'
      ],
      examples: [
        'solidity/ERC20',
        'games/tic-tac-toe'
      ]
    };
  }

  // Default to standard but lower confidence
  return {
    framework: 'standard',
    confidence: 0.5,
    reasoning: 'No specific keywords matched. Defaulting to standard Quint approach with State type pattern.',
    docs: [
      'docs/language-basics.mdx',
      'docs/lessons'
    ],
    examples: [
      'language-features',
      'tutorials'
    ]
  };
}

// Helper to explain the differences
export function explainFrameworks(): any {
  return {
    choreo: {
      name: 'Choreo Framework',
      useFor: [
        'Consensus algorithms (Raft, Paxos, PBFT, Tendermint, HotStuff)',
        'Byzantine fault tolerant protocols',
        'Distributed coordination',
        'Message-passing protocols',
        'Multi-phase commit protocols'
      ],
      pattern: 'Roles + Messages + Stages + Effects',
      docs: ['choreo/tutorial.mdx', 'choreo/index.mdx'],
      examples: ['cosmos/tendermint', 'cosmos/ics20']
    },
    standard: {
      name: 'Standard Quint',
      useFor: [
        'Smart contracts',
        'State machines',
        'DeFi protocols',
        'Games and puzzles',
        'General systems'
      ],
      pattern: 'State type + Pure functions + Thin actions',
      docs: ['docs/language-basics.mdx', 'docs/lessons'],
      examples: ['solidity/ERC20', 'games/tic-tac-toe']
    }
  };
}
