import fs from 'fs';
import path from 'path';
import { DocMetadata, InvertedIndex } from '../indexers/doc-indexer.js';

interface DocIndex {
  documents: DocMetadata[];
  invertedIndex: Record<string, InvertedIndex>;
  stats: {
    totalDocs: number;
    totalSections: number;
    totalKeywords: number;
    averageSectionsPerDoc: string;
  };
}

interface SearchResultItem {
  document: string;
  title: string;
  section: string;
  sectionLevel: number;
  line: number;
  content: string;
  matchedKeywords: string[];
  relevance: number;
}

interface EnhancedSearchResult {
  results: SearchResultItem[];
  total: number;
  query: string;
  searchType: 'keyword' | 'text' | 'topic';
}

let docIndex: DocIndex | null = null;

/**
 * Load documentation index (lazy loading)
 */
function loadDocIndex(): DocIndex {
  if (!docIndex) {
    const indexPath = path.join(process.cwd(), 'data', 'docs-index.json');
    if (!fs.existsSync(indexPath)) {
      throw new Error('Documentation index not found. Run npm run setup to build it.');
    }
    docIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  }
  return docIndex!;
}

/**
 * Search by keywords using inverted index
 */
export function searchByKeywords(query: string, limit: number = 10): EnhancedSearchResult {
  const index = loadDocIndex();
  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
  const results = new Map<string, SearchResultItem>();

  for (const keyword of keywords) {
    const entry = index.invertedIndex[keyword];
    if (!entry) continue;

    for (const docEntry of entry.documents) {
      const doc = index.documents.find(d => d.path === docEntry.path);
      if (!doc) continue;

      for (const sectionIdx of docEntry.sections) {
        const section = doc.sections[sectionIdx];
        const key = `${doc.path}:${sectionIdx}`;

        let item = results.get(key);
        if (!item) {
          item = {
            document: doc.path,
            title: doc.title,
            section: section.title,
            sectionLevel: section.level,
            line: section.line,
            content: section.content.substring(0, 300),  // Preview
            matchedKeywords: [],
            relevance: 0
          };
          results.set(key, item);
        }

        if (!item.matchedKeywords.includes(keyword)) {
          item.matchedKeywords.push(keyword);
          // Boost relevance for keyword matches
          item.relevance += docEntry.frequency * 10;

          // Boost if keyword is in section title
          if (section.title.toLowerCase().includes(keyword)) {
            item.relevance += 50;
          }
        }
      }
    }
  }

  // Sort by relevance and limit
  const sortedResults = Array.from(results.values())
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);

  return {
    results: sortedResults,
    total: results.size,
    query,
    searchType: 'keyword'
  };
}

/**
 * Search by topic
 */
export function searchByTopic(topic: string, limit: number = 10): EnhancedSearchResult {
  const index = loadDocIndex();
  const topicLower = topic.toLowerCase();
  const results: SearchResultItem[] = [];

  for (const doc of index.documents) {
    if (doc.topics.some(t => t.includes(topicLower))) {
      // Include all top-level sections from matching documents
      const topSections = doc.sections.filter(s => s.level <= 2).slice(0, 3);

      for (const section of topSections) {
        results.push({
          document: doc.path,
          title: doc.title,
          section: section.title,
          sectionLevel: section.level,
          line: section.line,
          content: section.content.substring(0, 300),
          matchedKeywords: doc.topics.filter(t => t.includes(topicLower)),
          relevance: doc.topics.filter(t => t === topicLower).length * 100 +
                     doc.topics.filter(t => t.includes(topicLower)).length * 50
        });
      }
    }
  }

  // Sort by relevance
  results.sort((a, b) => b.relevance - a.relevance);

  return {
    results: results.slice(0, limit),
    total: results.length,
    query: topic,
    searchType: 'topic'
  };
}

/**
 * Full-text search with ranking
 */
export function searchFullText(query: string, limit: number = 10): EnhancedSearchResult {
  const index = loadDocIndex();
  const queryLower = query.toLowerCase();
  const results: SearchResultItem[] = [];

  for (const doc of index.documents) {
    for (const section of doc.sections) {
      const contentLower = section.content.toLowerCase();
      const titleLower = section.title.toLowerCase();

      if (contentLower.includes(queryLower) || titleLower.includes(queryLower)) {
        // Count occurrences
        const matches = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;

        // Find the snippet with the match
        const matchIndex = contentLower.indexOf(queryLower);
        const start = Math.max(0, matchIndex - 100);
        const end = Math.min(section.content.length, matchIndex + 200);
        const snippet = section.content.substring(start, end);

        results.push({
          document: doc.path,
          title: doc.title,
          section: section.title,
          sectionLevel: section.level,
          line: section.line,
          content: snippet,
          matchedKeywords: [query],
          relevance: titleLower.includes(queryLower) ? matches * 100 + 1000 : matches * 10
        });
      }
    }
  }

  // Sort by relevance
  results.sort((a, b) => b.relevance - a.relevance);

  return {
    results: results.slice(0, limit),
    total: results.length,
    query,
    searchType: 'text'
  };
}

/**
 * Smart search that tries keyword first, then falls back to full-text
 */
export function smartSearch(query: string, options?: { limit?: number; scope?: string }): EnhancedSearchResult {
  const limit = options?.limit || 10;

  // Try keyword search first
  const keywordResults = searchByKeywords(query, limit);

  // If we have good results, return them
  if (keywordResults.results.length >= 3) {
    return keywordResults;
  }

  // Otherwise, fall back to full-text
  const textResults = searchFullText(query, limit);

  // Combine results if both have some
  if (keywordResults.results.length > 0 && textResults.results.length > 0) {
    const combined = [...keywordResults.results, ...textResults.results];
    const unique = Array.from(
      new Map(combined.map(r => [`${r.document}:${r.line}`, r])).values()
    );

    return {
      results: unique.sort((a, b) => b.relevance - a.relevance).slice(0, limit),
      total: unique.length,
      query,
      searchType: 'keyword'
    };
  }

  return textResults.results.length > 0 ? textResults : keywordResults;
}

/**
 * Format search results as readable text
 */
export function formatSearchResults(result: EnhancedSearchResult): string {
  const lines: string[] = [];

  lines.push(`Found ${result.total} results for "${result.query}" (search type: ${result.searchType})\n`);

  if (result.results.length === 0) {
    lines.push('No results found. Try different keywords or use broader terms.');
    return lines.join('\n');
  }

  for (let i = 0; i < result.results.length; i++) {
    const r = result.results[i];
    lines.push(`${i + 1}. ${r.title} > ${r.section}`);
    lines.push(`   File: ${r.document}:${r.line}`);

    if (r.matchedKeywords.length > 0) {
      lines.push(`   Keywords: ${r.matchedKeywords.join(', ')}`);
    }

    // Show content preview
    const preview = r.content.length > 200 ? r.content.substring(0, 200) + '...' : r.content;
    lines.push(`   ${preview.replace(/\n/g, ' ')}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * List available topics
 */
export function listTopics(): string[] {
  const index = loadDocIndex();
  const topicCounts = new Map<string, number>();

  for (const doc of index.documents) {
    for (const topic of doc.topics) {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    }
  }

  return Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => `${topic} (${count} docs)`);
}
