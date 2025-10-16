import { EmbeddingGenerator } from './embedding-generator.js';
import { LexicalSearch } from './lexical-search.js';
import { VectorStore } from './vector-store.js';
import { reciprocalRankFusion } from './fusion.js';
import { NoopReranker } from './reranker.js';
import type { HybridSearchOptions, SearchResult, SearchScope } from './types.js';

const DEFAULT_RESULTS = 10;
const SEMANTIC_CANDIDATES = 20;
const LEXICAL_CANDIDATES = 20;

export class HybridSearch {
  private readonly embeddingGenerator: EmbeddingGenerator;
  private readonly lexicalSearch: LexicalSearch;
  private readonly vectorStore: VectorStore;

  constructor() {
    this.embeddingGenerator = new EmbeddingGenerator();
    this.lexicalSearch = new LexicalSearch();
    this.vectorStore = new VectorStore();
  }

  async search(query: string, options?: HybridSearchOptions): Promise<SearchResult[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const scope: SearchScope = options?.scope ?? 'all';
    const k = options?.k ?? DEFAULT_RESULTS;

    let semanticResults: SearchResult[] = [];
    try {
      const embedding = await this.embeddingGenerator.generate(query);
      semanticResults = await this.vectorStore.search(scope, embedding, SEMANTIC_CANDIDATES);
    } catch (error) {
      console.warn(`Semantic search failed for scope ${scope}: ${(error as Error).message}`);
    }

    let lexicalResults: SearchResult[] = [];
    try {
      lexicalResults = await this.lexicalSearch.search(scope, query, LEXICAL_CANDIDATES);
    } catch (error) {
      console.warn(`Lexical search failed for scope ${scope}: ${(error as Error).message}`);
    }

    let combined: SearchResult[];
    if (lexicalResults.length === 0 && semanticResults.length === 0) {
      combined = [];
    } else if (semanticResults.length === 0) {
      combined = lexicalResults.slice(0, k);
    } else if (lexicalResults.length === 0) {
      combined = semanticResults.slice(0, k);
    } else {
      combined = reciprocalRankFusion(lexicalResults, semanticResults).slice(0, k);
    }

    const reranker = options?.reranker ?? new NoopReranker();
    const reranked = await reranker.rerank(query, combined);

    if (reranker instanceof NoopReranker) {
      return reranked;
    }

    return reranked.map((result) => ({
      ...result,
      strategy: 'reranked'
    }));
  }
}
