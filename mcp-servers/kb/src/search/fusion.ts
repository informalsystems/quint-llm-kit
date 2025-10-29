import type { SearchResult } from './types.js';

const DEFAULT_RRF_K = 60;

export function reciprocalRankFusion(
  lexicalResults: SearchResult[],
  semanticResults: SearchResult[],
  rrfK: number = DEFAULT_RRF_K
): SearchResult[] {
  const scores = new Map<string, number>();
  const base = new Map<string, SearchResult>();

  const updateScore = (result: SearchResult, rank: number) => {
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
        ...original,
        score: fusedScore,
        strategy: 'fused' as const,
        title: original.title ?? id
      };
    });
}
