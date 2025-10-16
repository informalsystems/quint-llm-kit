#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

import { getBuiltin, listBuiltins } from './tools/builtins.js';
import { searchDocs } from './tools/search.js';
import { getDoc, listDocs } from './tools/docs.js';
import { suggestFramework, explainFrameworks } from './tools/routing.js';
import { getExample, listExamples, browseExamples } from './tools/examples.js';
import { getPattern, listPatterns, searchPatterns } from './tools/patterns.js';
import { getTemplate, listTemplates } from './tools/templates.js';
import { runHybridSearch } from './tools/hybrid-search.js';
import { getDocOutline } from './tools/doc-outline.js';
import { getExampleInfo } from './tools/example-info.js';

const server = new Server(
  {
    name: 'quint-kb-mcp',
    version: '0.4.0'
  },
  {
    name: 'quint_hybrid_search',
    description: 'Advanced hybrid search combining lexical BM25 and semantic embeddings with Reciprocal Rank Fusion. Supports querying multiple scopes in a single call.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query string'
        },
        scope: {
          type: 'string',
          enum: ['all', 'builtins', 'docs', 'examples', 'guidelines', 'extra'],
          description: 'Optional single scope (deprecated; use scopes instead)'
        },
        scopes: {
          type: 'array',
          description: 'Optional list of scopes to search. Results are grouped per scope when provided.',
          items: {
            type: 'string',
            enum: ['all', 'builtins', 'docs', 'examples', 'guidelines', 'extra']
          }
        },
        k: {
          type: 'number',
          description: 'Number of results to return when using a single scope (default: 10)'
        },
        limitPerScope: {
          type: 'number',
          description: 'Maximum number of results per scope when using scopes[] (default: 5)'
        }
      },
      required: ['query']
    }
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Define available tools
const TOOLS: Tool[] = [
  {
    name: 'quint_get_builtin',
    description: 'Get detailed documentation for a specific Quint builtin operator. Returns signature, description, examples, and usage information.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the builtin operator (e.g., "union", "filter", "map", "Set", "List")'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'quint_list_builtins',
    description: 'List all Quint builtin operators, optionally filtered by category (set, list, map, integer, logical, temporal, utility). Returns organized list with signatures.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional category filter: "set", "list", "map", "integer", "logical", "temporal", or "utility"'
        }
      }
    }
  },
  {
    name: 'quint_search_docs',
    description: 'Search across Quint documentation, examples, and lessons. Returns matching files and lines with context.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query string'
        },
        scope: {
          type: 'string',
          enum: ['all', 'builtins', 'lessons', 'examples'],
          description: 'Search scope: "all" (default), "builtins", "lessons", or "examples"'
        },
        contextLines: {
          type: 'number',
          description: 'Number of context lines around matches (default: 2)',
          minimum: 0,
          maximum: 10
        }
      },
      required: ['query']
    }
  },
  {
    name: 'quint_get_doc',
    description: 'Get full content of a Quint documentation file (markdown/mdx). Supports core docs, Choreo docs, and lessons.',
    inputSchema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'Doc filename with optional path: "builtin.md", "choreo/tutorial.mdx", "docs/language-basics.mdx"'
        }
      },
      required: ['filename']
    }
  },
  {
    name: 'quint_suggest_framework',
    description: 'Suggest which Quint framework (Choreo vs standard) to use based on the system description. Critical for routing to the correct approach.',
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Brief description of what the user wants to build (e.g., "Tendermint consensus", "ERC20 token")'
        }
      },
      required: ['description']
    }
  },
  {
    name: 'quint_get_example',
    description: 'Get a Quint example file (.qnt) by path. Returns the full spec content.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Example path like "cosmos/tendermint/tendermint.qnt" or "solidity/ERC20/erc20.qnt"'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'quint_list_examples',
    description: 'Browse available Quint examples, optionally filtered by category.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional category: "cosmos", "solidity", "games", "classic", "tutorials", etc.'
        }
      }
    }
  },
  {
    name: 'quint_list_docs',
    description: 'List all available Quint documentation files organized by category (core docs, Choreo docs, lessons).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'quint_get_pattern',
    description: 'Get a Quint coding pattern with template, best practices, and anti-patterns. Essential for writing correct Quint code.',
    inputSchema: {
      type: 'object',
      properties: {
        patternId: {
          type: 'string',
          description: 'Pattern ID like "state-type-pattern", "choreo-pattern", "pure-functions", "map-initialization", "thin-actions"'
        }
      },
      required: ['patternId']
    }
  },
  {
    name: 'quint_list_patterns',
    description: 'List all available Quint patterns, optionally filtered by category (core, best-practice, testing, workflow, syntax, anti-pattern).',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional category filter: "core", "best-practice", "testing", "workflow", "syntax", "anti-pattern"'
        }
      }
    }
  },
  {
    name: 'quint_search_patterns',
    description: 'Search patterns by keywords. Returns relevant patterns ranked by relevance.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query like "map", "consensus", "testing", "undefined behavior"'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'quint_get_template',
    description: 'Get a Quint spec template with boilerplate code ready to use. Returns complete file content with instructions.',
    inputSchema: {
      type: 'object',
      properties: {
        templateId: {
          type: 'string',
          description: 'Template ID: "spec-template" for main spec, "test-template" for test file'
        }
      },
      required: ['templateId']
    }
  },
  {
    name: 'quint_list_templates',
    description: 'List all available Quint templates, optionally filtered by framework (standard, choreo).',
    inputSchema: {
      type: 'object',
      properties: {
        framework: {
          type: 'string',
          description: 'Optional framework filter: "standard" or "choreo"'
        }
      }
    }
  },
  {
    name: 'quint_doc_outline',
    description: 'Get the section outline (titles, levels, line numbers) for a documentation file.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Doc identifier, e.g., "builtin.md", "docs/lang.md", "choreo/tutorial.mdx", "posts/alpenglow.mdx"'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'quint_example_info',
    description: 'Get metadata about a Quint example without fetching the full source (category, modules, functions, keywords, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Example path such as "classic/distributed/Bakery/bakery.qnt"'
        }
      },
      required: ['path']
    }
  }
];

// Handle tool list request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (!args) {
      throw new Error('Missing arguments');
    }

    let result: any;

    switch (name) {
      case 'quint_get_builtin':
        result = getBuiltin(args.name as string);
        break;

      case 'quint_list_builtins':
        result = listBuiltins(args.category as string | undefined);
        break;

      case 'quint_search_docs':
        result = searchDocs(args.query as string, {
          scope: args.scope as any,
          contextLines: args.contextLines as number | undefined
        });
        break;

      case 'quint_get_doc':
        result = getDoc(args.filename as string);
        break;

      case 'quint_suggest_framework':
        result = suggestFramework(args.description as string);
        break;

      case 'quint_get_example':
        result = getExample(args.path as string);
        break;

      case 'quint_list_examples':
        if (args.category) {
          result = { examples: listExamples(args.category as string) };
        } else {
          result = browseExamples();
        }
        break;

      case 'quint_list_docs':
        result = listDocs();
        break;

      case 'quint_get_pattern':
        result = getPattern(args.patternId as string);
        break;

      case 'quint_list_patterns':
        result = listPatterns(args.category as string | undefined);
        break;

      case 'quint_search_patterns':
        result = searchPatterns(args.query as string);
        break;

      case 'quint_get_template':
        result = getTemplate(args.templateId as string);
        break;

      case 'quint_list_templates':
        result = listTemplates(args.framework as string | undefined);
        break;

      case 'quint_hybrid_search':
        result = await runHybridSearch(args.query as string, {
          scope: args.scope as string | undefined,
          scopes: args.scopes as string[] | undefined,
          k: args.k as number | undefined,
          limitPerScope: args.limitPerScope as number | undefined
        });
        break;

      case 'quint_doc_outline':
        result = getDocOutline(args.path as string);
        break;

      case 'quint_example_info':
        result = getExampleInfo(args.path as string);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    // Format result
    let text: string;
    if (typeof result === 'string') {
      text = result;
    } else if (result.formatted) {
      // For builtins with formatted doc
      text = result.formatted;
    } else if (result.error) {
      // Error response
      text = `Error: ${result.error}\n${result.suggestion || ''}`;
    } else {
      // JSON response
      text = JSON.stringify(result, null, 2);
    }

    return {
      content: [
        {
          type: 'text',
          text: text
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Quint KB MCP Server v0.4.0');
  console.error('Tools: builtins, docs, examples, patterns, templates, framework routing, search');
  console.error('Ready for requests via stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
