import fs from 'fs';
import path from 'path';

export interface DocSection {
  title: string;
  level: number;  // h1=1, h2=2, h3=3, etc.
  content: string;
  line: number;
  keywords: string[];
}

export interface DocMetadata {
  filename: string;
  path: string;
  title: string;
  sections: DocSection[];
  topics: string[];  // Main topics covered
  keywords: string[];  // All keywords from all sections
  type: 'markdown' | 'mdx';
  size: number;
}

/**
 * Extract markdown headings and their content
 */
export function parseMarkdownStructure(content: string, filename: string): DocSection[] {
  const sections: DocSection[] = [];
  const lines = content.split('\n');

  let currentSection: DocSection | null = null;
  let currentContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        currentSection.keywords = extractKeywords(currentSection.content);
        sections.push(currentSection);
      }

      // Start new section
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();

      currentSection = {
        title,
        level,
        content: '',
        line: i + 1,
        keywords: []
      };
      currentContent = [];
    } else {
      // Add to current section content
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim();
    currentSection.keywords = extractKeywords(currentSection.content);
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Extract keywords from text using simple heuristics
 */
export function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();
  const content = text.toLowerCase();

  // Technical terms and concepts (add more as needed)
  const concepts = [
    'action', 'state', 'variable', 'operator', 'pure', 'temporal',
    'invariant', 'property', 'module', 'import', 'type', 'def', 'val',
    'run', 'init', 'step', 'next', 'always', 'eventually',
    'set', 'map', 'list', 'record', 'tuple', 'variant',
    'consensus', 'byzantine', 'distributed', 'protocol',
    'specification', 'verification', 'model', 'checking',
    'repl', 'simulator', 'test', 'example',
    'quint', 'apalache', 'tla+', 'itf'
  ];

  for (const concept of concepts) {
    if (content.includes(concept)) {
      keywords.add(concept);
    }
  }

  // Extract code identifiers (simple pattern)
  const codeMatches = text.matchAll(/`([a-zA-Z_][a-zA-Z0-9_]*)`/g);
  for (const match of codeMatches) {
    const identifier = match[1].toLowerCase();
    if (identifier.length > 2) {  // Skip very short identifiers
      keywords.add(identifier);
    }
  }

  return Array.from(keywords);
}

/**
 * Infer main topics from sections and keywords
 */
export function inferTopics(sections: DocSection[]): string[] {
  const topics = new Set<string>();

  // Topic patterns based on section titles
  const topicPatterns: Record<string, string> = {
    'getting started': 'tutorial',
    'installation': 'setup',
    'quickstart': 'tutorial',
    'example': 'examples',
    'tutorial': 'tutorial',
    'type': 'types',
    'operator': 'operators',
    'builtin': 'builtins',
    'action': 'actions',
    'temporal': 'temporal-logic',
    'state': 'state-machines',
    'specification': 'specifications',
    'verification': 'verification',
    'model checking': 'model-checking',
    'consensus': 'consensus',
    'protocol': 'protocols',
    'test': 'testing',
    'repl': 'repl',
    'simulator': 'simulation'
  };

  for (const section of sections) {
    const title = section.title.toLowerCase();

    for (const [pattern, topic] of Object.entries(topicPatterns)) {
      if (title.includes(pattern)) {
        topics.add(topic);
      }
    }

    // Check keywords too
    for (const keyword of section.keywords) {
      if (topicPatterns[keyword]) {
        topics.add(topicPatterns[keyword]);
      }
    }
  }

  return Array.from(topics);
}

/**
 * Build documentation index from a directory
 */
export function buildDocIndex(docsDir: string): DocMetadata[] {
  const index: DocMetadata[] = [];

  function processFile(filePath: string) {
    if (!filePath.endsWith('.md') && !filePath.endsWith('.mdx')) {
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    const filename = path.basename(filePath);
    const relativePath = filePath.replace(docsDir + '/', '');

    const sections = parseMarkdownStructure(content, filename);
    const allKeywords = new Set<string>();

    for (const section of sections) {
      section.keywords.forEach(k => allKeywords.add(k));
    }

    const topics = inferTopics(sections);

    // Get document title (from first h1 or filename)
    const firstH1 = sections.find(s => s.level === 1);
    const title = firstH1 ? firstH1.title : filename.replace(/\.(md|mdx)$/, '');

    index.push({
      filename,
      path: relativePath,
      title,
      sections,
      topics,
      keywords: Array.from(allKeywords),
      type: filename.endsWith('.mdx') ? 'mdx' : 'markdown',
      size: stats.size
    });
  }

  function walkDir(dir: string) {
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        // Skip certain directories
        if (!entry.startsWith('.') && entry !== 'node_modules') {
          walkDir(fullPath);
        }
      } else {
        processFile(fullPath);
      }
    }
  }

  walkDir(docsDir);
  return index;
}

/**
 * Build inverted index for fast keyword search
 */
export interface InvertedIndex {
  keyword: string;
  documents: Array<{
    path: string;
    sections: number[];  // Section indices where keyword appears
    frequency: number;
  }>;
}

export function buildInvertedIndex(docIndex: DocMetadata[]): Map<string, InvertedIndex> {
  const invertedIndex = new Map<string, InvertedIndex>();

  for (const doc of docIndex) {
    for (let i = 0; i < doc.sections.length; i++) {
      const section = doc.sections[i];

      for (const keyword of section.keywords) {
        let entry = invertedIndex.get(keyword);

        if (!entry) {
          entry = {
            keyword,
            documents: []
          };
          invertedIndex.set(keyword, entry);
        }

        let docEntry = entry.documents.find(d => d.path === doc.path);
        if (!docEntry) {
          docEntry = {
            path: doc.path,
            sections: [],
            frequency: 0
          };
          entry.documents.push(docEntry);
        }

        if (!docEntry.sections.includes(i)) {
          docEntry.sections.push(i);
        }
        docEntry.frequency++;
      }
    }
  }

  return invertedIndex;
}

/**
 * Main function to build and save doc index
 */
export function buildDocIndexFile(docsDir: string, outputPath: string): void {
  if (!fs.existsSync(docsDir)) {
    throw new Error(`Docs directory not found at ${docsDir}`);
  }

  console.log('Building documentation index...');
  const docIndex = buildDocIndex(docsDir);

  console.log('Building inverted index for keyword search...');
  const invertedIndex = buildInvertedIndex(docIndex);

  // Convert Map to object for JSON serialization
  const invertedIndexObj: Record<string, InvertedIndex> = {};
  invertedIndex.forEach((value, key) => {
    invertedIndexObj[key] = value;
  });

  const output = {
    documents: docIndex,
    invertedIndex: invertedIndexObj,
    stats: {
      totalDocs: docIndex.length,
      totalSections: docIndex.reduce((sum, doc) => sum + doc.sections.length, 0),
      totalKeywords: invertedIndex.size,
      averageSectionsPerDoc: (docIndex.reduce((sum, doc) => sum + doc.sections.length, 0) / docIndex.length).toFixed(1)
    }
  };

  // Write to output
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`✓ Indexed ${docIndex.length} documents with ${invertedIndex.size} unique keywords`);
  console.log(`  Average sections per doc: ${output.stats.averageSectionsPerDoc}`);
  console.log(`  Total sections: ${output.stats.totalSections}`);

  // Show top topics
  const topicCounts = new Map<string, number>();
  for (const doc of docIndex) {
    for (const topic of doc.topics) {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    }
  }

  console.log('\nTop topics:');
  const sortedTopics = Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  for (const [topic, count] of sortedTopics) {
    console.log(`  ${topic}: ${count} documents`);
  }
}
