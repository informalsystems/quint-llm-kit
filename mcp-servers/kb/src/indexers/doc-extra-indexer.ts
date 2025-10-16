import fs from 'fs';
import path from 'path';
import { DocSection } from './doc-indexer.js';

export interface BlogPostMetadata {
  filename: string;
  path: string;
  title: string;
  sections: DocSection[];
  topics: string[];
  keywords: string[];
  type: 'blog';
  size: number;
  frontmatter: {
    date: string;
    excerpt: string;
    authors: string[];
    tags: string[];
  };
}

export interface ChoreoDocMetadata {
  filename: string;
  path: string;
  title: string;
  sections: DocSection[];
  topics: string[];
  keywords: string[];
  type: 'choreo';
  size: number;
}

export type ExtraDocMetadata = BlogPostMetadata | ChoreoDocMetadata;

/**
 * Parse YAML frontmatter from MDX file
 */
function parseFrontmatter(content: string): { frontmatter: any; content: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, content };
  }

  const yamlText = match[1];
  const mainContent = match[2];

  // Simple YAML parser (handles the specific structure we have)
  const frontmatter: any = {};
  let currentKey = '';
  let inArray = false;
  let arrayItems: any[] = [];

  for (const line of yamlText.split('\n')) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    // Key-value pair
    const kvMatch = trimmed.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kvMatch) {
      // Save previous array if exists
      if (inArray && currentKey) {
        frontmatter[currentKey] = arrayItems;
        arrayItems = [];
        inArray = false;
      }

      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();

      if (value) {
        // Simple value
        frontmatter[currentKey] = value;
        currentKey = '';
      } else {
        // Start of array or object
        inArray = true;
      }
    }
    // Array item
    else if (trimmed.startsWith('- ')) {
      const itemMatch = trimmed.match(/^-\s+(.+)$/);
      if (itemMatch) {
        const itemValue = itemMatch[1].trim();

        // Check if it's an object property
        const propMatch = itemValue.match(/^([a-zA-Z_]+):\s*(.*)$/);
        if (propMatch) {
          // It's like "name: Josef Widder"
          const propKey = propMatch[1];
          const propValue = propMatch[2].trim();

          if (arrayItems.length === 0 || typeof arrayItems[arrayItems.length - 1] !== 'object') {
            arrayItems.push({});
          }

          const lastItem = arrayItems[arrayItems.length - 1];
          if (propKey === 'name' && Object.keys(lastItem).length > 0) {
            // Start new object
            arrayItems.push({ [propKey]: propValue });
          } else {
            lastItem[propKey] = propValue;
          }
        } else {
          // Simple array item
          arrayItems.push(itemValue);
        }
      }
    }
  }

  // Save final array
  if (inArray && currentKey) {
    frontmatter[currentKey] = arrayItems;
  }

  return { frontmatter, content: mainContent };
}

/**
 * Extract sections from markdown content (same as doc-indexer)
 */
function parseMarkdownStructure(content: string, filename: string): DocSection[] {
  const sections: DocSection[] = [];
  const lines = content.split('\n');

  let currentSection: DocSection | null = null;
  let currentContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        currentSection.keywords = extractKeywords(currentSection.content);
        sections.push(currentSection);
      }

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
      currentContent.push(line);
    }
  }

  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim();
    currentSection.keywords = extractKeywords(currentSection.content);
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();
  const content = text.toLowerCase();

  const concepts = [
    'action', 'state', 'variable', 'operator', 'pure', 'temporal',
    'invariant', 'property', 'module', 'import', 'type', 'def', 'val',
    'run', 'init', 'step', 'next', 'always', 'eventually',
    'set', 'map', 'list', 'record', 'tuple', 'variant',
    'consensus', 'byzantine', 'distributed', 'protocol',
    'specification', 'verification', 'model', 'checking',
    'repl', 'simulator', 'test', 'example',
    'quint', 'apalache', 'tla+', 'itf',
    // Choreo-specific
    'choreo', 'cue', 'listen', 'broadcast', 'unicast', 'effect',
    'environment', 'process', 'message', 'transition',
    // Blog-specific
    'tutorial', 'guide', 'pattern', 'case study'
  ];

  for (const concept of concepts) {
    if (content.includes(concept)) {
      keywords.add(concept);
    }
  }

  const codeMatches = text.matchAll(/`([a-zA-Z_][a-zA-Z0-9_:]*)`/g);
  for (const match of codeMatches) {
    const identifier = match[1].toLowerCase();
    if (identifier.length > 2) {
      keywords.add(identifier);
    }
  }

  return Array.from(keywords);
}

/**
 * Infer topics from sections
 */
function inferTopics(sections: DocSection[], category: 'blog' | 'choreo', frontmatter?: any): string[] {
  const topics = new Set<string>();

  // Category-specific topics
  if (category === 'choreo') {
    topics.add('choreo-framework');
  }

  // Add tags from frontmatter (for blog posts)
  if (frontmatter?.tags) {
    frontmatter.tags.forEach((tag: string) => topics.add(tag));
  }

  const topicPatterns: Record<string, string> = {
    'tutorial': 'tutorial',
    'pattern': 'patterns',
    'example': 'examples',
    'consensus': 'consensus',
    'protocol': 'protocols',
    'test': 'testing',
    'verification': 'verification',
    'specification': 'specifications',
    'two-phase': 'distributed-transactions',
    'commit': 'distributed-transactions',
    'cue': 'choreo-patterns',
    'message': 'messaging',
    'invariant': 'invariants',
    'alpenglow': 'consensus-algorithms',
    'tendermint': 'consensus-algorithms',
    'solana': 'blockchains'
  };

  for (const section of sections) {
    const title = section.title.toLowerCase();

    for (const [pattern, topic] of Object.entries(topicPatterns)) {
      if (title.includes(pattern)) {
        topics.add(topic);
      }
    }

    for (const keyword of section.keywords) {
      if (topicPatterns[keyword]) {
        topics.add(topicPatterns[keyword]);
      }
    }
  }

  return Array.from(topics);
}

/**
 * Index blog posts
 */
export function indexBlogPosts(postsDir: string): BlogPostMetadata[] {
  const index: BlogPostMetadata[] = [];

  if (!fs.existsSync(postsDir)) {
    console.warn(`Posts directory not found: ${postsDir}`);
    return index;
  }

  const files = fs.readdirSync(postsDir);

  for (const file of files) {
    if (!file.endsWith('.mdx') || file.startsWith('_')) {
      continue;
    }

    const filePath = path.join(postsDir, file);
    const stats = fs.statSync(filePath);

    if (!stats.isFile()) continue;

    const rawContent = fs.readFileSync(filePath, 'utf8');
    const { frontmatter, content } = parseFrontmatter(rawContent);

    const sections = parseMarkdownStructure(content, file);
    const allKeywords = new Set<string>();

    for (const section of sections) {
      section.keywords.forEach(k => allKeywords.add(k));
    }

    const topics = inferTopics(sections, 'blog', frontmatter);

    // Extract author names
    const authors = frontmatter.authors?.map((a: any) =>
      typeof a === 'string' ? a : a.name
    ) || [];

    const title = frontmatter.title || sections.find(s => s.level === 1)?.title || file.replace('.mdx', '');

    index.push({
      filename: file,
      path: `posts/${file}`,
      title,
      sections,
      topics,
      keywords: Array.from(allKeywords),
      type: 'blog',
      size: stats.size,
      frontmatter: {
        date: frontmatter.date || '',
        excerpt: frontmatter.excerpt || '',
        authors,
        tags: frontmatter.tags || []
      }
    });
  }

  return index;
}

/**
 * Index Choreo documentation
 */
export function indexChoreoDocs(choreoDir: string): ChoreoDocMetadata[] {
  const index: ChoreoDocMetadata[] = [];

  if (!fs.existsSync(choreoDir)) {
    console.warn(`Choreo directory not found: ${choreoDir}`);
    return index;
  }

  const files = fs.readdirSync(choreoDir);

  for (const file of files) {
    if (!file.endsWith('.mdx') || file.startsWith('_')) {
      continue;
    }

    const filePath = path.join(choreoDir, file);
    const stats = fs.statSync(filePath);

    if (!stats.isFile()) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    const sections = parseMarkdownStructure(content, file);
    const allKeywords = new Set<string>();

    for (const section of sections) {
      section.keywords.forEach(k => allKeywords.add(k));
    }

    const topics = inferTopics(sections, 'choreo');
    const title = sections.find(s => s.level === 1)?.title || file.replace('.mdx', '');

    index.push({
      filename: file,
      path: `choreo/${file}`,
      title,
      sections,
      topics,
      keywords: Array.from(allKeywords),
      type: 'choreo',
      size: stats.size
    });
  }

  return index;
}

/**
 * Build inverted index
 */
export function buildInvertedIndex(docs: ExtraDocMetadata[]): Map<string, any> {
  const invertedIndex = new Map<string, any>();

  for (const doc of docs) {
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

        let docEntry = entry.documents.find((d: any) => d.path === doc.path);
        if (!docEntry) {
          docEntry = {
            path: doc.path,
            type: doc.type,
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
 * Main function to build and save extra docs index
 */
export function buildExtraDocsIndex(postsDir: string, choreoDir: string, outputPath: string): void {
  console.log('Indexing blog posts...');
  const blogPosts = indexBlogPosts(postsDir);

  console.log('Indexing Choreo documentation...');
  const choreoDocs = indexChoreoDocs(choreoDir);

  const allDocs = [...blogPosts, ...choreoDocs];

  console.log('Building inverted index...');
  const invertedIndex = buildInvertedIndex(allDocs);

  const invertedIndexObj: Record<string, any> = {};
  invertedIndex.forEach((value, key) => {
    invertedIndexObj[key] = value;
  });

  const output = {
    blogPosts,
    choreoDocs,
    invertedIndex: invertedIndexObj,
    stats: {
      totalBlogPosts: blogPosts.length,
      totalChoreoDocs: choreoDocs.length,
      totalDocs: allDocs.length,
      totalSections: allDocs.reduce((sum, doc) => sum + doc.sections.length, 0),
      totalKeywords: invertedIndex.size
    }
  };

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`✓ Indexed ${blogPosts.length} blog posts and ${choreoDocs.length} Choreo docs`);
  console.log(`  Total sections: ${output.stats.totalSections}`);
  console.log(`  Unique keywords: ${output.stats.totalKeywords}`);

  // Show top topics
  const topicCounts = new Map<string, number>();
  for (const doc of allDocs) {
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
