import fs from 'fs';
import { PATHS } from '../config/paths.js';

const PATTERNS_PATH = PATHS.patterns;

interface Pattern {
  name: string;
  category: string;
  description: string;
  when_to_use?: string[];
  template?: string;
  key_principles?: string[];
  required_builtins?: string[];
  examples?: string[];
  related_patterns?: string[];
  anti_patterns?: Array<{
    dont: string;
    reason: string;
    do: string;
  }>;
  rules?: Array<{
    rule: string;
    wrong: string;
    correct: string;
    explanation: string;
  }>;
}

let patternsCache: Record<string, Pattern> | null = null;

function loadPatterns(): Record<string, Pattern> {
  if (patternsCache) {
    return patternsCache;
  }

  if (!fs.existsSync(PATTERNS_PATH)) {
    throw new Error(`Patterns file not found at ${PATTERNS_PATH}`);
  }

  const content = fs.readFileSync(PATTERNS_PATH, 'utf8');
  patternsCache = JSON.parse(content);
  return patternsCache!;
}

export function getPattern(patternId: string): any {
  const patterns = loadPatterns();
  const pattern = patterns[patternId];

  if (!pattern) {
    // Suggest similar patterns
    const available = Object.keys(patterns);
    const similar = available.filter(id =>
      id.includes(patternId) || patternId.includes(id.replace(/-/g, ''))
    );

    return {
      error: `Pattern '${patternId}' not found`,
      suggestion: similar.length > 0
        ? `Did you mean: ${similar.join(', ')}?`
        : `Available patterns: ${available.join(', ')}`,
      availablePatterns: available
    };
  }

  return pattern;
}

export function listPatterns(category?: string): any {
  const patterns = loadPatterns();

  if (category) {
    const filtered = Object.entries(patterns)
      .filter(([_, p]) => p.category === category)
      .map(([id, p]) => ({
        id,
        name: p.name,
        description: p.description
      }));

    return {
      category,
      count: filtered.length,
      patterns: filtered
    };
  }

  // Group by category
  const byCategory: Record<string, any[]> = {};

  for (const [id, pattern] of Object.entries(patterns)) {
    const cat = pattern.category || 'other';
    if (!byCategory[cat]) {
      byCategory[cat] = [];
    }
    byCategory[cat].push({
      id,
      name: pattern.name,
      description: pattern.description
    });
  }

  return {
    total: Object.keys(patterns).length,
    categories: byCategory
  };
}

export function searchPatterns(query: string): any {
  const patterns = loadPatterns();
  const queryLower = query.toLowerCase();
  const matches: any[] = [];

  for (const [id, pattern] of Object.entries(patterns)) {
    let relevance = 0;

    // Check name
    if (pattern.name.toLowerCase().includes(queryLower)) {
      relevance += 3;
    }

    // Check description
    if (pattern.description.toLowerCase().includes(queryLower)) {
      relevance += 2;
    }

    // Check when_to_use
    if (pattern.when_to_use?.some(use => use.toLowerCase().includes(queryLower))) {
      relevance += 2;
    }

    // Check key_principles
    if (pattern.key_principles?.some(prin => prin.toLowerCase().includes(queryLower))) {
      relevance += 1;
    }

    if (relevance > 0) {
      matches.push({
        id,
        name: pattern.name,
        category: pattern.category,
        description: pattern.description,
        relevance
      });
    }
  }

  // Sort by relevance
  matches.sort((a, b) => b.relevance - a.relevance);

  return {
    query,
    total: matches.length,
    matches
  };
}
