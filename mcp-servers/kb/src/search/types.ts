import type { Reranker } from './reranker.js';

export type SearchScope =
  | 'builtins'
  | 'docs'
  | 'examples'
  | 'patterns'
  | 'extra'
  | 'all';

export interface SearchDocument {
  id: string;
  scope: SearchScope;
  title: string;
  content: string;
  snippet?: string;
  source?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface EmbeddingRecord {
  id: string;
  scope: SearchScope;
  title: string;
  text: string;
  embedding: number[];
  snippet?: string;
  source?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface EmbeddingFile {
  config: {
    scope: SearchScope;
    dimension: number;
    count: number;
    createdAt: string;
  };
  records: EmbeddingRecord[];
}

export interface LexicalIndexFile {
  config: {
    scope: SearchScope;
    createdAt: string;
    fields: string[];
    storedFields: string[];
  };
  index: Record<string, unknown>;
  documents: SearchDocument[];
}

export interface SearchResult {
  id: string;
  scope: SearchScope;
  title: string;
  score: number;
  snippet?: string;
  source?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  highlights?: string[];
  strategy: 'lexical' | 'semantic' | 'fused' | 'reranked';
}

export interface HybridSearchOptions {
  k?: number;
  scope?: Exclude<SearchScope, 'all'> | 'all';
  reranker?: Reranker;
}
