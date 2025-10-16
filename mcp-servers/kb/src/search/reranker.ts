import type { SearchResult } from './types.js';

export interface Reranker {
  rerank(query: string, results: SearchResult[]): Promise<SearchResult[]>;
}

export class NoopReranker implements Reranker {
  async rerank(_query: string, results: SearchResult[]): Promise<SearchResult[]> {
    return results;
  }
}
