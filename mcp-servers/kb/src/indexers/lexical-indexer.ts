import fs from 'fs';
import path from 'path';
import MiniSearch from 'minisearch';
import { buildSearchDocumentCollections } from './search-documents.js';
import type { LexicalIndexFile, SearchDocument, SearchScope } from '../search/types.js';

type BaseScope = Exclude<SearchScope, 'all'>;

export interface LexicalIndexOptions {
  dataDir: string;
  kbDir: string;
  lexicalDir: string;
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

type LexicalDoc = SearchDocument & { tagsText: string };

function buildMiniSearch(docs: SearchDocument[]) {
  const miniSearch = new MiniSearch<LexicalDoc>({
    fields: ['title', 'content', 'tagsText'],
    storeFields: ['id', 'scope', 'title', 'snippet', 'source', 'tags', 'metadata'],
    preprocess: (text: string) => text.toLowerCase()
  });

  miniSearch.addAll(
    docs.map((doc) => ({
      ...doc,
      tagsText: (doc.tags ?? []).join(' ')
    }))
  );

  return miniSearch;
}

function writeLexicalFile(filePath: string, payload: LexicalIndexFile) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

export function buildLexicalIndices(options: LexicalIndexOptions): void {
  const { dataDir, kbDir, lexicalDir } = options;

  ensureDir(lexicalDir);

  const collections = buildSearchDocumentCollections(dataDir, kbDir);

  const scopeEntries = Object.entries(collections) as [BaseScope, SearchDocument[]][];

  for (const [scope, docs] of scopeEntries) {
    if (docs.length === 0) continue;
    const engine = buildMiniSearch(docs);
    const fileContent: LexicalIndexFile = {
      config: {
        scope,
        createdAt: new Date().toISOString(),
        fields: ['title', 'content', 'tagsText'],
        storedFields: ['id', 'scope', 'title', 'snippet', 'source', 'tags', 'metadata']
      },
      index: engine.toJSON(),
      documents: docs
    };

    const filePath = path.join(lexicalDir, `${scope}-lexical.json`);
    writeLexicalFile(filePath, fileContent);
  }

  // Build aggregate "all" scope
  const allDocs = scopeEntries.flatMap(([, docs]) => docs);
  if (allDocs.length > 0) {
    const engine = buildMiniSearch(allDocs);
    const fileContent: LexicalIndexFile = {
      config: {
        scope: 'all',
        createdAt: new Date().toISOString(),
        fields: ['title', 'content', 'tagsText'],
        storedFields: ['id', 'scope', 'title', 'snippet', 'source', 'tags', 'metadata']
      },
      index: engine.toJSON(),
      documents: allDocs
    };

    const filePath = path.join(lexicalDir, 'all-lexical.json');
    writeLexicalFile(filePath, fileContent);
  }
}
