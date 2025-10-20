import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { SearchDocument, SearchScope } from '../search/types.js';

interface SearchDocumentCollections {
  builtins: SearchDocument[];
  docs: SearchDocument[];
  examples: SearchDocument[];
  guidelines: SearchDocument[];
  extra: SearchDocument[];
}

type DocSection = {
  title: string;
  level: number;
  content: string;
  line: number;
};

const DEFAULT_CHUNK_SIZE = 1200;
const MIN_CHUNK_SIZE = 400;

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function loadJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected data file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

function summarize(text: string, limit = 240): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= limit ? clean : `${clean.substring(0, limit - 1)}…`;
}

function chunkContent(content: string, chunkSize: number = DEFAULT_CHUNK_SIZE): string[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (normalized.length <= chunkSize) {
    return normalized ? [normalized] : [];
  }

  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const candidate = current.length === 0 ? paragraph : `${current}\n\n${paragraph}`;
    if (candidate.length > chunkSize && current.length > MIN_CHUNK_SIZE) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

function buildBuiltinDocuments(dataDir: string): SearchDocument[] {
  const builtinsPath = path.join(dataDir, 'builtins.json');
  const builtins = loadJson<Record<string, any>>(builtinsPath);

  return Object.values(builtins).map((builtin) => {
    const contentParts = [
      builtin.name,
      builtin.signature,
      builtin.description,
      ...(builtin.examples ?? [])
    ].filter(Boolean);

    const content = contentParts.join('\n\n');

    return {
      id: `builtin:${builtin.name}`,
      scope: 'builtins' as SearchScope,
      title: builtin.name,
      content,
      snippet: summarize(builtin.description || ''),
      source: `builtin.md#${slugify(builtin.name)}`,
      tags: [builtin.category].filter(Boolean),
      metadata: {
        signature: builtin.signature,
        category: builtin.category
      }
    };
  });
}

function buildDocDocuments(dataDir: string): SearchDocument[] {
  const docsPath = path.join(dataDir, 'docs-index.json');
  const docsData = loadJson<{
    documents: Array<{
      filename: string;
      path: string;
      title: string;
      sections: DocSection[];
      topics: string[];
    }>;
  }>(docsPath);

  const documents: SearchDocument[] = [];

  for (const doc of docsData.documents) {
    for (const section of doc.sections) {
      const content = `${section.title}\n\n${section.content}`.trim();
      if (!content) continue;

      const id = `doc:${doc.path}#${slugify(section.title)}:${section.line}`;
      documents.push({
        id,
        scope: 'docs',
        title: `${doc.title} › ${section.title}`,
        content,
        snippet: summarize(section.content),
        source: doc.path,
        tags: doc.topics,
        metadata: {
          sectionTitle: section.title,
          level: section.level,
          path: doc.path,
          line: section.line
        }
      });
    }
  }

  return documents;
}

function buildExampleDocuments(dataDir: string): SearchDocument[] {
  const examplesPath = path.join(dataDir, 'examples-index.json');
  const data = loadJson<{
    examples: Array<{
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
    }>;
  }>(examplesPath);

  return data.examples.map((example) => {
    const sections = [
      example.description,
      example.modules.length ? `Modules: ${example.modules.join(', ')}` : '',
      example.types.length ? `Types: ${example.types.join(', ')}` : '',
      example.functions.length ? `Functions: ${example.functions.join(', ')}` : '',
      example.actions.length ? `Actions: ${example.actions.join(', ')}` : '',
      example.keywords.length ? `Keywords: ${example.keywords.join(', ')}` : ''
    ].filter(Boolean);

    const content = sections.join('\n\n');
    const tags = [
      example.category,
      example.subcategory,
      ...example.modules,
      ...example.keywords
    ].filter((tag): tag is string => Boolean(tag));

    return {
      id: `example:${example.path}`,
      scope: 'examples',
      title: example.path.split('/').pop() ?? example.path,
      content,
      snippet: summarize(example.description),
      source: example.path,
      tags,
      metadata: {
        category: example.category,
        subcategory: example.subcategory,
        modules: example.modules,
        functions: example.functions
      }
    };
  });
}

function buildGuidelineDocuments(dataDir: string): SearchDocument[] {
  const guidelinesPath = path.join(dataDir, 'guidelines-index.json');
  const data = loadJson<{
    patterns: Array<{
      id: string;
      name: string;
      category: string;
      description: string;
      code?: string;
      applicability?: string;
      related?: string[];
    }>;
    guidelines: Array<{
      id: string;
      type: string;
      rule: string;
      rationale?: string;
      examples?: string[];
      category: string;
    }>;
    workflows: Array<{
      id: string;
      name: string;
      purpose: string;
      steps: string[];
      tips?: string[];
      applicability?: string;
    }>;
  }>(guidelinesPath);

  const documents: SearchDocument[] = [];

  for (const pattern of data.patterns) {
    const parts = [
      pattern.description,
      pattern.code ? `Code:\n${pattern.code}` : '',
      pattern.related?.length ? `Related: ${pattern.related.join(', ')}` : ''
    ].filter(Boolean);

    documents.push({
      id: `guideline:pattern:${pattern.id}`,
      scope: 'guidelines',
      title: pattern.name,
      content: parts.join('\n\n'),
      snippet: summarize(pattern.description),
      source: `patterns#${pattern.id}`,
      tags: [pattern.category, ...(pattern.related ?? [])],
      metadata: {
        category: pattern.category,
        applicability: pattern.applicability
      }
    });
  }

  for (const guideline of data.guidelines) {
    const parts = [
      guideline.rule,
      guideline.rationale ? `Rationale: ${guideline.rationale}` : '',
      guideline.examples?.length ? `Examples:\n${guideline.examples.join('\n')}` : ''
    ].filter(Boolean);

    documents.push({
      id: `guideline:rule:${guideline.id}`,
      scope: 'guidelines',
      title: guideline.rule,
      content: parts.join('\n\n'),
      snippet: summarize(guideline.rule),
      source: `guidelines#${guideline.id}`,
      tags: [guideline.category, guideline.type],
      metadata: {
        category: guideline.category,
        type: guideline.type
      }
    });
  }

  for (const workflow of data.workflows) {
    const parts = [
      workflow.purpose,
      workflow.steps.length ? `Steps:\n- ${workflow.steps.join('\n- ')}` : '',
      workflow.tips?.length ? `Tips:\n- ${workflow.tips.join('\n- ')}` : ''
    ].filter(Boolean);

    documents.push({
      id: `guideline:workflow:${workflow.id}`,
      scope: 'guidelines',
      title: workflow.name,
      content: parts.join('\n\n'),
      snippet: summarize(workflow.purpose),
      source: `workflows#${workflow.id}`,
      tags: [workflow.applicability ?? 'general'],
      metadata: {
        applicability: workflow.applicability
      }
    });
  }

  return documents;
}

function buildExtraDocuments(dataDir: string, kbDir: string): SearchDocument[] {
  const extraPath = path.join(dataDir, 'docs-extra-index.json');
  const data = loadJson<{
    blogPosts: Array<{
      filename: string;
      path: string;
      title: string;
      sections: DocSection[];
      topics: string[];
      keywords: string[];
    }>;
    choreoDocs: Array<{
      filename: string;
      path: string;
      title: string;
      sections: DocSection[];
      topics: string[];
      keywords: string[];
    }>;
  }>(extraPath);

  const documents: SearchDocument[] = [];

  const handleDoc = (doc: {
    filename: string;
    path: string;
    title: string;
    sections: DocSection[];
    topics: string[];
  }) => {
    if (doc.sections.length === 0) {
      const absolute = path.join(kbDir, doc.path);
      if (!fs.existsSync(absolute)) {
        return;
      }
      const raw = fs.readFileSync(absolute, 'utf8');
      const chunks = chunkContent(raw);
      chunks.forEach((chunk, index) => {
        documents.push({
          id: `extra:${doc.path}#chunk-${index}`,
          scope: 'extra',
          title: `${doc.title} (Part ${index + 1})`,
          content: chunk,
          snippet: summarize(chunk),
          source: doc.path,
          tags: doc.topics
        });
      });
      return;
    }

    doc.sections.forEach((section) => {
      const content = `${section.title}\n\n${section.content}`.trim();
      if (!content) return;
      documents.push({
        id: `extra:${doc.path}#${slugify(section.title)}:${section.line}`,
        scope: 'extra',
        title: `${doc.title} › ${section.title}`,
        content,
        snippet: summarize(section.content),
        source: doc.path,
        tags: doc.topics
      });
    });
  };

  data.blogPosts.forEach(handleDoc);
  data.choreoDocs.forEach(handleDoc);

  return documents;
}

export function buildSearchDocumentCollections(
  dataDir: string = path.join(rootDir, '..', 'data'),
  kbDir: string = path.join(rootDir, '..', 'kb')
): SearchDocumentCollections {
  return {
    builtins: buildBuiltinDocuments(dataDir),
    docs: buildDocDocuments(dataDir),
    examples: buildExampleDocuments(dataDir),
    guidelines: buildGuidelineDocuments(dataDir),
    extra: buildExtraDocuments(dataDir, kbDir)
  };
}
