import { pipeline, env } from '@xenova/transformers';
import { PATHS } from '../config/paths.js';

const DEFAULT_MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const DEFAULT_BATCH_SIZE = 16;
const DEFAULT_DIMENSION = 384;
const MAX_TOKEN_LENGTH = 512;

type FeatureExtractionPipeline = Awaited<ReturnType<typeof pipeline>>;

let embeddingPipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

env.allowLocalModels = true;
env.localModelPath = PATHS.models;

async function getEmbeddingPipeline(modelId: string): Promise<FeatureExtractionPipeline> {
  if (!embeddingPipelinePromise) {
    embeddingPipelinePromise = pipeline('feature-extraction', modelId);
  }
  return embeddingPipelinePromise;
}

function sanitizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\u0000/g, '')
    .trim();
}

function truncateTokens(text: string, maxTokens: number): string {
  const tokens = text.split(/\s+/);
  if (tokens.length <= maxTokens) {
    return text;
  }
  return tokens.slice(0, maxTokens).join(' ');
}

function toArray(data: unknown): number[] {
  if (Array.isArray(data)) {
    const flat: number[] = [];
    for (const item of data) {
      flat.push(...toArray(item));
    }
    return flat;
  }

  if (data instanceof Float32Array || data instanceof Float64Array) {
    return Array.from(data);
  }

  if (typeof data === 'number') {
    return [data];
  }

  if (typeof data === 'object' && data !== null) {
    if ('data' in (data as Record<string, unknown>)) {
      return toArray((data as Record<string, unknown>).data);
    }
    if ('array' in (data as Record<string, unknown>)) {
      return toArray((data as Record<string, unknown>).array);
    }
  }

  throw new Error('Unexpected embedding tensor format');
}

function normalizeEmbedding(vector: number[], dimension: number): number[] {
  if (vector.length === dimension) {
    return vector;
  }

  if (vector.length % dimension === 0) {
    const tokens = vector.length / dimension;
    const aggregated = new Array(dimension).fill(0);

    for (let i = 0; i < tokens; i++) {
      for (let j = 0; j < dimension; j++) {
        aggregated[j] += vector[i * dimension + j];
      }
    }

    for (let j = 0; j < dimension; j++) {
      aggregated[j] /= tokens;
    }

    return aggregated;
  }

  throw new Error(
    `Unexpected embedding length ${vector.length}; cannot reshape to dimension ${dimension}`
  );
}

export class EmbeddingGenerator {
  readonly modelId: string;
  readonly dimension: number;

  constructor(modelId: string = DEFAULT_MODEL_ID, dimension: number = DEFAULT_DIMENSION) {
    this.modelId = modelId;
    this.dimension = dimension;
  }

  async generate(text: string): Promise<number[]> {
    const [embedding] = await this.generateBatch([text]);
    return embedding;
  }

  async generateBatch(
    texts: string[],
    batchSize: number = DEFAULT_BATCH_SIZE,
    onProgress?: (processed: number, total: number) => void
  ): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const sanitized = texts
      .map((text) => truncateTokens(sanitizeText(text), MAX_TOKEN_LENGTH))
      .map((text) => (text.length === 0 ? '.' : text));
    const total = sanitized.length;

    const model = await getEmbeddingPipeline(this.modelId);
    const results: number[][] = [];

    for (let i = 0; i < sanitized.length; i += batchSize) {
      const batch = sanitized.slice(i, i + batchSize);
      const output = await model(batch as any, { pooling: 'mean', normalize: true } as any);

      if (Array.isArray(output)) {
        for (const item of output) {
          const embedding = normalizeEmbedding(toArray(item), this.dimension);
          results.push(embedding);
        }
      } else {
        results.push(normalizeEmbedding(toArray(output), this.dimension));
      }

      if (onProgress) {
        onProgress(Math.min(i + batch.length, total), total);
      }
    }

    // Validate embedding lengths
    for (const embedding of results) {
      if (embedding.length !== this.dimension) {
        throw new Error(
          `Unexpected embedding dimension: expected ${this.dimension}, got ${embedding.length}`
        );
      }
    }

    return results;
  }
}
