export interface Builtin {
  name: string;
  signature: string;
  description: string;
  examples: string[];
  sourceUrl: string;
  category?: string;
  tags?: string[];  // Semantic tags for better search
  aliases?: string[];  // Alternative names (e.g., "==" for "eq")
  related?: string[];  // Related operators
  returnType?: string;  // Extracted return type
  paramTypes?: string[];  // Extracted parameter types
}

export interface SearchMatch {
  file: string;
  line: number;
  content: string;
  context: string[];
}

export interface SearchResult {
  matches: SearchMatch[];
  total: number;
  query: string;
}

export interface SearchOptions {
  scope?: 'all' | 'builtins' | 'lessons' | 'examples';
  contextLines?: number;
}
