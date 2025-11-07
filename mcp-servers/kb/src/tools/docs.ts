import fs from 'fs';
import path from 'path';
import { PATHS } from '../config/paths.js';

const CONTENT_ROOT = PATHS.kb;

// Cache for frequently accessed docs
const docCache: Map<string, { content: string; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function stripMDXFeatures(content: string): string {
  let cleaned = content;

  // Remove import statements (at the beginning of file)
  cleaned = cleaned.replace(/^import\s+.*?from\s+['"].*?['"]\s*$/gm, '');

  // Remove JSX self-closing tags like <Steps /> or <Callout />
  cleaned = cleaned.replace(/<\w+\s*\/>/g, '');

  // Remove opening JSX tags like <Steps> or <Callout type="info">
  cleaned = cleaned.replace(/<\w+(\s+\w+="[^"]*")*>/g, '');

  // Remove closing JSX tags like </Steps>
  cleaned = cleaned.replace(/<\/\w+>/g, '');

  // Remove export statements
  cleaned = cleaned.replace(/^export\s+.*$/gm, '');

  // Remove empty lines left behind (multiple newlines)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

export function getDoc(filePath: string): any {
  // Normalize the path - remove leading slash if present
  const normalizedPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;

  // Check cache first (use normalized path as key)
  const cached = docCache.get(normalizedPath);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return JSON.parse(cached.content);
  }

  // Construct full path from kb root
  const fullPath = path.join(CONTENT_ROOT, normalizedPath);

  // Check if file exists at the specified path
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    const isMDX = normalizedPath.endsWith('.mdx');

    // Strip MDX features if it's an MDX file
    if (isMDX) {
      content = stripMDXFeatures(content);
    }

    const result = {
      filename: path.basename(normalizedPath),
      path: normalizedPath,
      content,
      size: content.length,
      type: isMDX ? 'mdx' : normalizedPath.endsWith('.md') ? 'markdown' : 'text',
      processed: isMDX
    };

    // Cache the result
    docCache.set(normalizedPath, {
      content: JSON.stringify(result),
      timestamp: Date.now()
    });

    return result;
  }

  // File not found - list available docs
  const docsDir = path.join(CONTENT_ROOT, 'docs');
  const choreoDir = path.join(CONTENT_ROOT, 'choreo');

  const availableDocs: string[] = [];

  if (fs.existsSync(docsDir)) {
    const docFiles = fs.readdirSync(docsDir)
      .filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
    availableDocs.push(...docFiles.map(f => `docs/${f}`));
  }

  if (fs.existsSync(choreoDir)) {
    const choreoFiles = fs.readdirSync(choreoDir)
      .filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
    availableDocs.push(...choreoFiles.map(f => `choreo/${f}`));
  }

  return {
    error: `Document '${normalizedPath}' not found`,
    suggestion: `Try one of: ${availableDocs.slice(0, 10).join(', ')}`,
    availableDocs
  };
}

export function listDocs(): any {
  const docsDir = path.join(CONTENT_ROOT, 'docs');
  const choreoDir = path.join(CONTENT_ROOT, 'choreo');
  const guidelinesDir = path.join(CONTENT_ROOT, 'guidelines');

  const result: any = {
    core: [],
    choreo: [],
    lessons: [],
    guidelines: []
  };

  // Core docs
  if (fs.existsSync(docsDir)) {
    const files = fs.readdirSync(docsDir);
    for (const file of files) {
      const filePath = path.join(docsDir, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile() && (file.endsWith('.md') || file.endsWith('.mdx'))) {
        result.core.push({
          filename: file,
          path: `docs/${file}`,
          size: stats.size
        });
      }
    }
  }

  // Choreo docs
  if (fs.existsSync(choreoDir)) {
    const files = fs.readdirSync(choreoDir);
    for (const file of files) {
      const filePath = path.join(choreoDir, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile() && (file.endsWith('.md') || file.endsWith('.mdx'))) {
        result.choreo.push({
          filename: file,
          path: `choreo/${file}`,
          size: stats.size
        });
      }
    }
  }

  // Lessons
  const lessonsDir = path.join(docsDir, 'lessons');
  if (fs.existsSync(lessonsDir)) {
    const files = fs.readdirSync(lessonsDir);
    for (const file of files) {
      const filePath = path.join(lessonsDir, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile() && (file.endsWith('.md') || file.endsWith('.mdx'))) {
        result.lessons.push({
          filename: file,
          path: `docs/lessons/${file}`,
          size: stats.size
        });
      }
    }
  }

  // Guidelines (tutorials)
  if (fs.existsSync(guidelinesDir)) {
    const files = fs.readdirSync(guidelinesDir);
    for (const file of files) {
      const filePath = path.join(guidelinesDir, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile() && (file.endsWith('.md') || file.endsWith('.mdx'))) {
        result.guidelines.push({
          filename: file,
          path: `guidelines/${file}`,
          size: stats.size
        });
      }
    }
  }

  return {
    total: result.core.length + result.choreo.length + result.lessons.length + result.guidelines.length,
    ...result
  };
}
