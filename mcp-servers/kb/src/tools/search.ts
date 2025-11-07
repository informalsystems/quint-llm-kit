import fs from 'fs';
import path from 'path';
import { PATHS } from '../config/paths.js';
import { SearchOptions, SearchResult, SearchMatch } from '../types.js';

export function searchDocs(query: string, options?: SearchOptions): SearchResult {
  const scope = options?.scope || 'all';
  const contextLines = options?.contextLines || 2;

  const contentDir = PATHS.content;

  // Determine search paths based on scope
  const searchPaths: string[] = [];
  const extensions: string[] = [];

  switch (scope) {
    case 'examples':
      searchPaths.push(path.join(contentDir, 'examples'));
      extensions.push('.qnt');
      break;
    case 'lessons':
      searchPaths.push(path.join(contentDir, 'docs', 'content', 'docs', 'lessons'));
      extensions.push('.md', '.mdx');
      break;
    case 'builtins':
      searchPaths.push(path.join(contentDir, 'docs', 'content', 'docs'));
      extensions.push('.md');
      break;
    default: // 'all'
      searchPaths.push(
        path.join(contentDir, 'docs'),
        path.join(contentDir, 'examples')
      );
      extensions.push('.md', '.mdx', '.qnt');
  }

  const matches: SearchMatch[] = [];

  for (const searchPath of searchPaths) {
    if (!fs.existsSync(searchPath)) continue;
    searchInDirectory(searchPath, query, contextLines, extensions, contentDir, matches);
  }

  return {
    matches,
    total: matches.length,
    query
  };
}

function searchInDirectory(
  dir: string,
  query: string,
  contextLines: number,
  extensions: string[],
  contentDir: string,
  results: SearchMatch[]
) {
  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      searchInDirectory(fullPath, query, contextLines, extensions, contentDir, results);
    } else if (extensions.some(ext => entry.endsWith(ext))) {
      searchInFile(fullPath, query, contextLines, contentDir, results);
    }
  }
}

function searchInFile(
  filePath: string,
  query: string,
  contextLines: number,
  contentDir: string,
  results: SearchMatch[]
) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const queryLower = query.toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(queryLower)) {
        const relativePath = filePath.startsWith(contentDir)
          ? filePath.substring(contentDir.length + 1)
          : filePath;

        const contextBefore = lines.slice(Math.max(0, i - contextLines), i);
        const contextAfter = lines.slice(i + 1, Math.min(lines.length, i + 1 + contextLines));

        results.push({
          file: relativePath,
          line: i + 1, // 1-indexed
          content: lines[i],
          context: [...contextBefore, ...contextAfter]
        });
      }
    }
  } catch (err: any) {
    // Skip files that can't be read
    console.error(`Warning: Could not read ${filePath}: ${err.message}`);
  }
}
