import fs from 'fs';
import path from 'path';

const CONTENT_ROOT = path.join(process.cwd(), 'content', 'quint');

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

export function getDoc(filename: string): any {
  // Check cache first
  const cached = docCache.get(filename);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return JSON.parse(cached.content); // Return cached copy
  }

  // Support multiple doc locations
  const possiblePaths = [
    path.join(CONTENT_ROOT, 'docs', 'content', filename),
    path.join(CONTENT_ROOT, 'docs', 'content', 'docs', filename),
    path.join(CONTENT_ROOT, 'docs', 'content', 'choreo', filename)
  ];

  for (const docPath of possiblePaths) {
    if (fs.existsSync(docPath)) {
      let content = fs.readFileSync(docPath, 'utf8');
      const isMDX = filename.endsWith('.mdx');

      // Strip MDX features if it's an MDX file
      if (isMDX) {
        content = stripMDXFeatures(content);
      }

      const result = {
        filename,
        path: docPath.replace(CONTENT_ROOT + '/', ''),
        content,
        size: content.length,
        type: isMDX ? 'mdx' : filename.endsWith('.md') ? 'markdown' : 'text',
        processed: isMDX // Indicate if we processed/cleaned the content
      };

      // Cache the result
      docCache.set(filename, {
        content: JSON.stringify(result),
        timestamp: Date.now()
      });

      return result;
    }
  }

  // File not found - suggest similar files
  const docsDir = path.join(CONTENT_ROOT, 'docs', 'content', 'docs');
  const choreoDir = path.join(CONTENT_ROOT, 'docs', 'content', 'choreo');

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
    error: `Document '${filename}' not found`,
    suggestion: `Try one of: ${availableDocs.slice(0, 10).join(', ')}`,
    availableDocs
  };
}

export function listDocs(): any {
  const docsDir = path.join(CONTENT_ROOT, 'docs', 'content', 'docs');
  const choreoDir = path.join(CONTENT_ROOT, 'docs', 'content', 'choreo');

  const result: any = {
    core: [],
    choreo: [],
    lessons: []
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

  return {
    total: result.core.length + result.choreo.length + result.lessons.length,
    ...result
  };
}
