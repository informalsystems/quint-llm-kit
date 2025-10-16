import type { SearchResult, SearchScope } from './types.js';

export interface RankedResult {
  id: string;
  scope: SearchScope;
  score: number;
  title?: string;
  snippet?: string;
  source?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  highlights?: string[];
  strategy: 'lexical' | 'semantic';
}

const DEFAULT_RRF_K = 60;

export function reciprocalRankFusion(
  lexicalResults: RankedResult[],
  semanticResults: RankedResult[],
  rrfK: number = DEFAULT_RRF_K
): SearchResult[] {
  const scores = new Map<string, number>();
  const base = new Map<string, RankedResult>();

  const updateScore = (result: RankedResult, rank: number) => {
    const key = result.id;
    base.set(key, result);
    const increment = 1 / (rrfK + rank + 1);
    scores.set(key, (scores.get(key) || 0) + increment);
  };

  lexicalResults.forEach((result, index) => updateScore(result, index));
  semanticResults.forEach((result, index) => updateScore(result, index));

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id, fusedScore]) => {
      const original = base.get(id);
      if (!original) {
        throw new Error(`Missing base result for id ${id}`);
      }
      return {
        id,
        scope: original.scope,
        title: original.title ?? id,
        snippet: original.snippet,
        source: original.source,
        tags: original.tags,
        metadata: original.metadata,
        highlights: original.highlights,
        score: fusedScore,
        strategy: 'fused' as const
      };
    });
}
