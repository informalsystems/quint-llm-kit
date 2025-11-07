import fs from 'fs';
import path from 'path';
import { PATHS } from '../config/paths.js';

interface ExampleRecord {
  filename: string;
  path: string;
  category: string;
  subcategory?: string;
  modules: string[];
  description: string;
  imports: Array<{ module: string; from: string }>;
  types: string[];
  constants: string[];
  functions: string[];
  actions: string[];
  keywords: string[];
  size: number;
  hasTests: boolean;
}

interface ExampleInfoResponse {
  path: string;
  filename: string;
  category: string;
  subcategory?: string;
  modules: string[];
  description: string;
  imports: Array<{ module: string; from: string }>;
  types: string[];
  constants: string[];
  functions: string[];
  actions: string[];
  keywords: string[];
  hasTests: boolean;
  size: number;
}

const exampleCache: Map<string, ExampleRecord> = new Map();
let examplesLoaded = false;

const DATA_DIR = PATHS.data;

function normalizeKey(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').trim().toLowerCase();
}

function buildExampleIndex() {
  if (examplesLoaded) {
    return;
  }

  const examplesPath = path.join(DATA_DIR, 'examples-index.json');
  if (!fs.existsSync(examplesPath)) {
    examplesLoaded = true;
    return;
  }

  const raw = JSON.parse(fs.readFileSync(examplesPath, 'utf8')) as {
    examples: ExampleRecord[];
  };

  for (const example of raw.examples) {
    const key = normalizeKey(example.path);
    exampleCache.set(key, example);
  }

  examplesLoaded = true;
}

export function getExampleInfo(examplePath: string) {
  if (!examplePath || typeof examplePath !== 'string') {
    throw new Error('Path must be a non-empty string');
  }

  buildExampleIndex();

  const normalized = normalizeKey(examplePath);
  const direct = exampleCache.get(normalized);

  if (!direct) {
    const suggestions = Array.from(exampleCache.keys())
      .filter((candidate) => candidate.includes(normalized))
      .slice(0, 10);

    return {
      error: `Example '${examplePath}' not found`,
      suggestion: suggestions.length > 0 ? `Did you mean: ${suggestions.join(', ')}?` : undefined
    };
  }

  const response: ExampleInfoResponse = {
    path: direct.path,
    filename: direct.filename,
    category: direct.category,
    subcategory: direct.subcategory,
    modules: direct.modules,
    description: direct.description,
    imports: direct.imports,
    types: direct.types,
    constants: direct.constants,
    functions: direct.functions,
    actions: direct.actions,
    keywords: direct.keywords,
    hasTests: direct.hasTests,
    size: direct.size
  };

  return response;
}
