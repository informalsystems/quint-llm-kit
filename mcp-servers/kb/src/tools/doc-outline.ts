import fs from 'fs';
import path from 'path';
import { PATHS } from '../config/paths.js';

interface RawSection {
  title: string;
  level: number;
  line: number;
}

interface OutlineSection extends RawSection {
  anchor: string;
}

interface OutlineEntry {
  path: string;
  title: string;
  type: 'docs' | 'extra';
  sections: OutlineSection[];
  topics?: string[];
}

const outlineCache: Map<string, OutlineEntry> = new Map();
let outlineIndexLoaded = false;

const DATA_DIR = PATHS.data;

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeKey(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').trim().toLowerCase();
}

function addEntry(key: string, entry: OutlineEntry) {
  outlineCache.set(normalizeKey(key), entry);
}

function addEntryVariants(entry: OutlineEntry) {
  const normalizedPath = entry.path.startsWith('/') ? entry.path.slice(1) : entry.path;
  const pathWithPrefix = entry.type === 'docs' && !normalizedPath.startsWith('docs/')
    ? `docs/${normalizedPath}`
    : normalizedPath;

  const variants = new Set<string>([
    entry.path,
    normalizedPath,
    pathWithPrefix,
    entry.title,
    entry.title.toLowerCase(),
    entry.path.split('/').pop() ?? entry.path
  ]);

  variants.forEach((variant) => addEntry(variant, entry));
}

function buildOutlineEntries() {
  if (outlineIndexLoaded) {
    return;
  }

  const docsIndexPath = path.join(DATA_DIR, 'docs-index.json');
  const extraIndexPath = path.join(DATA_DIR, 'docs-extra-index.json');

  if (fs.existsSync(docsIndexPath)) {
    const raw = JSON.parse(fs.readFileSync(docsIndexPath, 'utf8')) as {
      documents: Array<{
        filename: string;
        path: string;
        title: string;
        sections: RawSection[];
        topics?: string[];
      }>;
    };

    for (const doc of raw.documents) {
      const entry: OutlineEntry = {
        path: doc.path || doc.filename,
        title: doc.title,
        type: 'docs',
        topics: doc.topics,
        sections: doc.sections.map((section) => ({
          ...section,
          anchor: slugify(section.title)
        }))
      };

      addEntryVariants(entry);
    }
  }

  if (fs.existsSync(extraIndexPath)) {
    const raw = JSON.parse(fs.readFileSync(extraIndexPath, 'utf8')) as {
      blogPosts: Array<{
        filename: string;
        path: string;
        title: string;
        sections: RawSection[];
        topics?: string[];
      }>;
      choreoDocs: Array<{
        filename: string;
        path: string;
        title: string;
        sections: RawSection[];
        topics?: string[];
      }>;
    };

    const addExtra = (doc: { filename: string; path: string; title: string; sections: RawSection[]; topics?: string[] }) => {
      const entry: OutlineEntry = {
        path: doc.path || doc.filename,
        title: doc.title,
        type: 'extra',
        topics: doc.topics,
        sections: doc.sections.map((section) => ({
          ...section,
          anchor: slugify(section.title)
        }))
      };
      addEntryVariants(entry);
    };

    raw.blogPosts.forEach(addExtra);
    raw.choreoDocs.forEach(addExtra);
  }

  outlineIndexLoaded = true;
}

function findEntry(pathOrName: string): OutlineEntry | undefined {
  buildOutlineEntries();
  const key = normalizeKey(pathOrName);
  if (outlineCache.has(key)) {
    return outlineCache.get(key);
  }

  // Try to find by endsWith for partial matches
  for (const [candidateKey, entry] of outlineCache.entries()) {
    if (candidateKey.endsWith(key)) {
      return entry;
    }
  }

  return undefined;
}

export function getDocOutline(pathOrName: string) {
  if (!pathOrName || typeof pathOrName !== 'string') {
    throw new Error('Path must be a non-empty string');
  }

  const entry = findEntry(pathOrName);
  if (!entry) {
    const suggestions = Array.from(outlineCache.keys())
      .filter((candidate) => candidate.includes(pathOrName.toLowerCase()))
      .slice(0, 10);

    return {
      error: `Document '${pathOrName}' not found`,
      suggestion: suggestions.length > 0 ? `Did you mean: ${suggestions.join(', ')}?` : undefined
    };
  }

  return {
    path: entry.path,
    title: entry.title,
    type: entry.type,
    topics: entry.topics,
    totalSections: entry.sections.length,
    sections: entry.sections
  };
}
