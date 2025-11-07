/**
 * Centralized path configuration for the Quint KB MCP server.
 * Uses import.meta.url to reliably locate the project root,
 * independent of where the process was started (process.cwd()).
 */

import path from 'path';
import { fileURLToPath } from 'url';

// Determine the actual location of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root is two levels up from src/config/
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// Define all paths relative to PROJECT_ROOT
export const PATHS = {
  root: PROJECT_ROOT,

  // Data directories
  data: path.join(PROJECT_ROOT, 'data'),

  // Knowledge base directories
  kb: path.join(PROJECT_ROOT, 'kb'),
  kbDocs: path.join(PROJECT_ROOT, 'kb', 'docs'),
  kbChoreo: path.join(PROJECT_ROOT, 'kb', 'choreo'),
  kbPosts: path.join(PROJECT_ROOT, 'kb', 'posts'),
  kbExamples: path.join(PROJECT_ROOT, 'kb', 'examples'),
  kbTemplates: path.join(PROJECT_ROOT, 'kb', 'templates'),
  kbPatterns: path.join(PROJECT_ROOT, 'kb', 'patterns'),
  kbGuidelines: path.join(PROJECT_ROOT, 'kb', 'guidelines'),

  // Content directories (legacy path)
  content: path.join(PROJECT_ROOT, 'content', 'quint'),

  // Specific data files
  builtins: path.join(PROJECT_ROOT, 'data', 'builtins.json'),
  patterns: path.join(PROJECT_ROOT, 'data', 'patterns-index.json'),
  docsIndex: path.join(PROJECT_ROOT, 'data', 'docs-index.json'),
  docsExtraIndex: path.join(PROJECT_ROOT, 'data', 'docs-extra-index.json'),
  templatesIndex: path.join(PROJECT_ROOT, 'data', 'templates-index.json'),

  // Search indexes
  lexicalDir: path.join(PROJECT_ROOT, 'data', 'lexical'),
  vectorDir: path.join(PROJECT_ROOT, 'data', 'vectors'),

  // Models (for embeddings)
  models: path.join(PROJECT_ROOT, 'data', 'models'),
} as const;

/**
 * Safe path join that ensures the result stays within the base directory.
 * Protects against path traversal attacks.
 *
 * @param base - The base directory that must contain the result
 * @param segments - Path segments to join
 * @returns The safe resolved path, or null if traversal detected
 */
export function safePath(base: string, ...segments: string[]): string | null {
  const resolved = path.resolve(path.join(base, ...segments));
  const normalizedBase = path.resolve(base);

  // Check if resolved path is within base directory
  if (!resolved.startsWith(normalizedBase + path.sep) && resolved !== normalizedBase) {
    console.warn(`Path traversal attempt blocked: ${segments.join('/')}`);
    return null;
  }

  return resolved;
}

/**
 * Get a path relative to the project root, with normalized separators.
 * Always uses forward slashes for consistency.
 *
 * @param absolutePath - The absolute path to make relative
 * @returns Relative path with forward slashes
 */
export function toRelativePath(absolutePath: string): string {
  return path.relative(PROJECT_ROOT, absolutePath).replace(/\\/g, '/');
}
