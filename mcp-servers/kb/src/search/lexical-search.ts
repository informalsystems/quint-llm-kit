import fs from 'fs';
import path from 'path';
import MiniSearch from 'minisearch';
import type { LexicalIndexFile, SearchDocument, SearchResult, SearchScope } from './types.js';

type LexicalDoc = SearchDocument & { tagsText?: string };

interface LoadedLexicalIndex {
  engine: MiniSearch<SearchDocument>;
  documents: Map<string, SearchDocument>;
}

const DEFAULT_SEARCH_OPTIONS = {
  prefix: true,
  fuzzy: 0.2,
  boost: { title: 2, content: 1.25 }
} as const;

export class LexicalSearch {
  private cache = new Map<SearchScope, LoadedLexicalIndex>();

  constructor(
    private readonly dataDir: string = path.join(process.cwd(), 'data'),
    private readonly lexicalDirName: string = 'lexical-indices'
  ) {}

  clear(scope?: SearchScope): void {
    if (scope) {
      this.cache.delete(scope);
    } else {
      this.cache.clear();
    }
  }

  async search(scope: SearchScope, query: string, k: number): Promise<SearchResult[]> {
    const { engine, documents } = await this.load(scope);

    const rawResults = engine.search(query, {
      ...DEFAULT_SEARCH_OPTIONS,
      boost: DEFAULT_SEARCH_OPTIONS.boost,
      prefix: DEFAULT_SEARCH_OPTIONS.prefix,
      fuzzy: DEFAULT_SEARCH_OPTIONS.fuzzy
    });

    return rawResults.slice(0, k).map((match) => {
      const doc = documents.get(match.id);
      if (!doc) {
        throw new Error(`Lexical index corrupt: doc ${match.id} missing for scope ${scope}`);
      }

      return {
        id: doc.id,
        scope: doc.scope,
        title: doc.title,
        snippet: doc.snippet,
        source: doc.source,
        tags: doc.tags,
        metadata: doc.metadata,
        highlights: match.terms,
        score: typeof match.score === 'number' ? match.score : 0,
        strategy: 'lexical' as const
      };
    });
  }

  private async load(scope: SearchScope): Promise<LoadedLexicalIndex> {
    const cached = this.cache.get(scope);
    if (cached) {
      return cached;
    }

    const file = path.join(this.dataDir, this.lexicalDirName, `${scope}-lexical.json`);
    if (!fs.existsSync(file)) {
      throw new Error(`Lexical index missing for scope '${scope}' at ${file}`);
    }

    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw) as LexicalIndexFile;

    const engine = MiniSearch.loadJSON<LexicalDoc>(JSON.stringify(data.index), {
      fields: data.config.fields,
      storeFields: data.config.storedFields
    });

    const docs = new Map<string, SearchDocument>();
    for (const doc of data.documents) {
      docs.set(doc.id, doc);
    }

    const loaded = { engine, documents: docs };
    this.cache.set(scope, loaded);
    return loaded;
  }
}
