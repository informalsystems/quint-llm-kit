#!/usr/bin/env tsx

import path from 'path';
import fs from 'fs';
import { HybridSearch } from '../src/search/hybrid-search.js';
import type { SearchResult } from '../src/search/types.js';
import type { SearchResult as NaiveSearchResult } from '../../quint-kb-mcp/src/types.js';
import { searchDocs } from '../../quint-kb-mcp/src/tools/search.js';

interface QueryConfig {
  query: string;
  scope?: 'all' | 'builtins' | 'docs' | 'examples' | 'guidelines';
  notes?: string;
  expected?: string[];
}

interface EvaluationRow {
  query: string;
  scope: string;
  expected: string[];
  hybridTop: SearchResult[];
  naiveTop: NaiveMatch[];
  hybridHits: number;
  naiveHits: number;
}

interface NaiveMatch {
  file: string;
  line: number;
  content: string;
}

const QUERIES: QueryConfig[] = [
  {
    query: 'How do I create a map from a set?',
    notes: 'Should surface mapBy / setToMap patterns',
    expected: ['mapBy', 'SetToMap']
  },
  {
    query: 'mapby',
    notes: 'Typo handling and builtin lookup',
    expected: ['mapBy']
  },
  {
    query: 'Byzantine consensus',
    notes: 'Distributed consensus documentation and examples',
    expected: ['consensus', 'Byzantine']
  },
  {
    query: 'voting protocols',
    notes: 'Governance specs and voting patterns',
    expected: ['voting', 'governance']
  },
  {
    query: 'temporl',
    notes: 'Misspelling of temporal',
    expected: ['temporal']
  }
];

async function runHybridSearch(
  search: HybridSearch,
  query: string,
  scope: 'all' | 'builtins' | 'docs' | 'examples' | 'guidelines'
): Promise<SearchResult[]> {
  try {
    const results = await search.search(query, { scope, k: 10 });
    return results.slice(0, 5);
  } catch (error) {
    console.error(`Hybrid search error for "${query}": ${(error as Error).message}`);
    return [];
  }
}

function runNaiveSearch(
  projectRoot: string,
  query: string,
  scope: 'all' | 'builtins' | 'docs' | 'examples' | 'guidelines'
): NaiveMatch[] {
  const cwdBefore = process.cwd();
  try {
    process.chdir(projectRoot);
    const result: NaiveSearchResult = searchDocs(query, {
      scope: scope === 'guidelines' ? 'builtins' : scope === 'all' ? 'all' : (scope as any),
      contextLines: 1
    });

    const seen = new Set<string>();
    const topMatches: NaiveMatch[] = [];
    for (const match of result.matches) {
      const key = `${match.file}:${match.line}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      topMatches.push({
        file: match.file,
        line: match.line,
        content: match.content.trim()
      });
      if (topMatches.length >= 5) {
        break;
      }
    }
    return topMatches;
  } finally {
    process.chdir(cwdBefore);
  }
}

function formatHybridResult(result: SearchResult): string {
  const score = result.score.toFixed(3);
  const source = result.source ? ` (${result.source})` : '';
  return `- ${result.title}${source} [${result.strategy}] score=${score}`;
}

function formatNaiveResult(match: NaiveMatch): string {
  return `- ${match.file}:${match.line} :: ${match.content}`;
}

function containsExpected(text: string | undefined, expected: string[]): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return expected.some((term) => lower.includes(term.toLowerCase()));
}

function countExpectedHybrid(results: SearchResult[], expected: string[]): number {
  return results.reduce((count, result) => {
    const fields = [
      result.title,
      result.snippet,
      result.source,
      ...(result.tags ?? []),
      ...(result.metadata ? Object.values(result.metadata).map(String) : [])
    ];
    return count + (fields.some((field) => containsExpected(field, expected)) ? 1 : 0);
  }, 0);
}

function countExpectedNaive(results: NaiveMatch[], expected: string[]): number {
  return results.reduce((count, result) => {
    const fields = [result.file, result.content];
    return count + (fields.some((field) => containsExpected(field, expected)) ? 1 : 0);
  }, 0);
}

async function evaluate(): Promise<void> {
  const v2Root = process.cwd();
  const v1Root = path.resolve(v2Root, '..', 'quint-kb-mcp');
  const contentRoot = path.join(v1Root, 'content', 'quint');

  if (!fs.existsSync(contentRoot)) {
    throw new Error(
      `Baseline server content not found at ${contentRoot}. Ensure content/quint -> kb symlink exists.`
    );
  }

  const hybridSearch = new HybridSearch();

  const rows: EvaluationRow[] = [];
  for (const query of QUERIES) {
    const scope = query.scope ?? 'all';
    const hybridTop = await runHybridSearch(hybridSearch, query.query, scope);
    const naiveTop = runNaiveSearch(v1Root, query.query, scope);
    const row: EvaluationRow = {
      query: query.query,
      scope,
      expected: query.expected ?? [],
      hybridTop,
      naiveTop,
      hybridHits: 0,
      naiveHits: 0
    };
    row.hybridHits = countExpectedHybrid(row.hybridTop, row.expected);
    row.naiveHits = countExpectedNaive(row.naiveTop, row.expected);
    rows.push(row);
  }

  console.log('\n=== Hybrid vs Naive Search Evaluation ===\n');
  for (const row of rows) {
    console.log(`Query: "${row.query}"`);
    console.log(`Scope: ${row.scope}`);
    if (row.expected.length > 0) {
      console.log(`Targets: ${row.expected.join(', ')}`);
      console.log(
        `Hit count — Hybrid: ${row.hybridHits}/${row.hybridTop.length}, Naive: ${row.naiveHits}/${row.naiveTop.length}`
      );
    }
    console.log('\nHybrid (semantic + lexical):');
    if (row.hybridTop.length === 0) {
      console.log('  (no results)');
    } else {
      row.hybridTop.forEach((result) => console.log(`  ${formatHybridResult(result)}`));
    }

    console.log('\nNaive (substring search):');
    if (row.naiveTop.length === 0) {
      console.log('  (no results)');
    } else {
      row.naiveTop.forEach((match) => console.log(`  ${formatNaiveResult(match)}`));
    }

    console.log('\n' + '-'.repeat(60) + '\n');
  }
}

evaluate().catch((error) => {
  console.error('Evaluation failed:', error);
  process.exit(1);
});
