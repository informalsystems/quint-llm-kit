import fs from 'fs';
import path from 'path';
import hnswlib from 'hnswlib-node';
import { EmbeddingGenerator } from '../search/embedding-generator.js';
import { buildSearchDocumentCollections } from './search-documents.js';
import type {
  EmbeddingFile,
  EmbeddingRecord,
  SearchDocument,
  SearchScope
} from '../search/types.js';

type BaseScope = Exclude<SearchScope, 'all'>;

const DEFAULT_BATCH_SIZE = 16;
const HNSW_M = 16;
const HNSW_EF_CONSTRUCTION = 200;

const { HierarchicalNSW } = hnswlib as { HierarchicalNSW: any };

export interface VectorIndexOptions {
  dataDir: string;
  kbDir: string;
  embeddingsDir: string;
  vectorIndexDir: string;
  batchSize?: number;
  onProgress?: (scope: SearchScope, processed: number, total: number) => void;
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeEmbeddingFile(filePath: string, payload: EmbeddingFile) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

async function buildScopeIndex(
  scope: SearchScope,
  documents: SearchDocument[],
  generator: EmbeddingGenerator,
  embeddingsDir: string,
  vectorDir: string,
  batchSize: number,
  onProgress?: (scope: SearchScope, processed: number, total: number) => void
) {
  if (documents.length === 0) {
    return;
  }

  const embeddings = await generator.generateBatch(
    documents.map((doc) => doc.content),
    batchSize,
    (processed, total) => onProgress?.(scope, processed, total)
  );

  const dimension = generator.dimension;
  const records: EmbeddingRecord[] = documents.map((doc, index) => {
    const embeddingVector = embeddings[index] ?? new Array(dimension).fill(0);
    return {
      id: doc.id,
      scope: doc.scope,
      title: doc.title,
      text: doc.content,
      embedding: embeddingVector,
      snippet: doc.snippet,
      source: doc.source,
      tags: doc.tags,
      metadata: doc.metadata
    };
  });

  const embeddingFile: EmbeddingFile = {
    config: {
      scope,
      dimension: generator.dimension,
      count: records.length,
      createdAt: new Date().toISOString()
    },
    records
  };

  const embeddingsPath = path.join(embeddingsDir, `${scope}-embeddings.json`);
  writeEmbeddingFile(embeddingsPath, embeddingFile);

  const index = new HierarchicalNSW('cosine', generator.dimension);
  index.initIndex(records.length, HNSW_M, HNSW_EF_CONSTRUCTION);

  records.forEach((record, idx) => {
    index.addPoint(Array.from(record.embedding), idx);
  });

  const vectorPath = path.join(vectorDir, `${scope}.hnsw`);
  index.writeIndex(vectorPath);
}

export async function buildVectorIndices(options: VectorIndexOptions): Promise<void> {
  const { dataDir, kbDir, embeddingsDir, vectorIndexDir } = options;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;

  ensureDir(embeddingsDir);
  ensureDir(vectorIndexDir);

  const collections = buildSearchDocumentCollections(dataDir, kbDir);
  const generator = new EmbeddingGenerator();

  const scopeEntries = Object.entries(collections) as [BaseScope, SearchDocument[]][];

  for (const [scope, docs] of scopeEntries) {
    await buildScopeIndex(scope, docs, generator, embeddingsDir, vectorIndexDir, batchSize, options.onProgress);
  }

  const allDocs = scopeEntries.flatMap(([, docs]) => docs);
  await buildScopeIndex('all', allDocs, generator, embeddingsDir, vectorIndexDir, batchSize, options.onProgress);
}
