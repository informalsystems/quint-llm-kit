import fs from 'fs';
import path from 'path';
import hnswlib from 'hnswlib-node';
import { PATHS } from '../config/paths.js';
import type { EmbeddingFile, SearchResult, SearchScope } from './types.js';

interface LoadedVectorIndex {
  index: any;
  records: EmbeddingFile['records'];
  dimension: number;
}

const EF_SEARCH = 64;

const { HierarchicalNSW } = hnswlib as { HierarchicalNSW: any };

export class VectorStore {
  private cache = new Map<SearchScope, LoadedVectorIndex>();

  constructor(
    private readonly dataDir: string = PATHS.data,
    private readonly embeddingsDirName: string = 'embeddings',
    private readonly vectorDirName: string = 'vector-indices'
  ) {}

  clear(scope?: SearchScope): void {
    if (scope) {
      this.cache.delete(scope);
    } else {
      this.cache.clear();
    }
  }

  async search(scope: SearchScope, queryEmbedding: number[], k: number): Promise<SearchResult[]> {
    const vector = Array.isArray(queryEmbedding)
      ? Array.from(queryEmbedding)
      : Array.from(queryEmbedding as Iterable<number>);
    const { index, records } = await this.load(scope);

    if (!index) {
      return [];
    }

    const { neighbors, distances } = index.searchKnn(vector, Math.min(k, records.length));
    const neighborIds: number[] = Array.from(neighbors);
    const neighborDistances: number[] = Array.from(distances);

    return neighborIds.map((label: number, position: number) => {
      const record = records[label];
      if (!record) {
        throw new Error(`Vector store corrupt: missing record for label ${label}`);
      }
      const distance = neighborDistances[position];
      const score = 1 - distance; // cosine distance -> similarity

      return {
        id: record.id,
        scope: record.scope,
        title: record.title ?? record.id,
        snippet: record.snippet,
        source: record.source,
        tags: record.tags,
        metadata: record.metadata,
        score,
        strategy: 'semantic' as const
      };
    });
  }

  private async load(scope: SearchScope): Promise<LoadedVectorIndex> {
    const cached = this.cache.get(scope);
    if (cached) {
      return cached;
    }

    const embeddingsFile = path.join(
      this.dataDir,
      this.embeddingsDirName,
      `${scope}-embeddings.json`
    );
    const indexFile = path.join(this.dataDir, this.vectorDirName, `${scope}.hnsw`);

    if (!fs.existsSync(embeddingsFile) || !fs.existsSync(indexFile)) {
      throw new Error(
        `Vector index missing for scope '${scope}'. Expected files:\n  ${embeddingsFile}\n  ${indexFile}`
      );
    }

    const raw = fs.readFileSync(embeddingsFile, 'utf8');
    const embeddingData = JSON.parse(raw) as EmbeddingFile;

    const index = new HierarchicalNSW('cosine', embeddingData.config.dimension);
    index.readIndexSync(indexFile);
    index.setEf(EF_SEARCH);

    const loaded: LoadedVectorIndex = {
      index,
      records: embeddingData.records,
      dimension: embeddingData.config.dimension
    };

    this.cache.set(scope, loaded);
    return loaded;
  }
}
