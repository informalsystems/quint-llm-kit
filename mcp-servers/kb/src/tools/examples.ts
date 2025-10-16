import fs from 'fs';
import path from 'path';

const EXAMPLES_ROOT = path.join(process.cwd(), 'content', 'quint', 'examples');

export function getExample(examplePath: string): any {
  const fullPath = path.join(EXAMPLES_ROOT, examplePath);

  if (!fs.existsSync(fullPath)) {
    // Try to suggest alternatives
    const category = examplePath.split('/')[0];
    const suggestions = listExamples(category);

    return {
      error: `Example '${examplePath}' not found`,
      suggestion: `Try one of: ${suggestions.slice(0, 5).join(', ')}`,
      availableCategories: getCategories()
    };
  }

  const stats = fs.statSync(fullPath);

  // If it's a directory, list contents
  if (stats.isDirectory()) {
    const files = fs.readdirSync(fullPath);
    const qntFiles = files.filter(f => f.endsWith('.qnt'));

    return {
      path: examplePath,
      type: 'directory',
      files: qntFiles,
      suggestion: `This is a directory. Try: ${qntFiles.map(f => `${examplePath}/${f}`).slice(0, 3).join(', ')}`
    };
  }

  // Return file content
  const content = fs.readFileSync(fullPath, 'utf8');
  const category = examplePath.split('/')[0];

  return {
    path: examplePath,
    category,
    content,
    lines: content.split('\n').length,
    type: 'file',
    relativePath: examplePath
  };
}

export function listExamples(category?: string): string[] {
  if (category) {
    const categoryPath = path.join(EXAMPLES_ROOT, category);
    if (!fs.existsSync(categoryPath)) {
      return [];
    }

    return findQntFiles(categoryPath).map(f =>
      f.replace(EXAMPLES_ROOT + '/', '')
    );
  }

  // List all examples
  return findQntFiles(EXAMPLES_ROOT).map(f =>
    f.replace(EXAMPLES_ROOT + '/', '')
  );
}

function findQntFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(currentPath: string) {
    const entries = fs.readdirSync(currentPath);

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith('.qnt')) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

export function getCategories(): string[] {
  if (!fs.existsSync(EXAMPLES_ROOT)) {
    return [];
  }

  return fs.readdirSync(EXAMPLES_ROOT)
    .filter(entry => {
      const fullPath = path.join(EXAMPLES_ROOT, entry);
      return fs.statSync(fullPath).isDirectory();
    })
    .filter(name => !name.startsWith('.'));
}

export function browseExamples(): any {
  const categories = getCategories();
  const result: any = {
    total: 0,
    categories: {}
  };

  for (const category of categories) {
    const examples = listExamples(category);
    result.categories[category] = {
      count: examples.length,
      examples: examples.slice(0, 10), // First 10 per category
      hasMore: examples.length > 10
    };
    result.total += examples.length;
  }

  return result;
}
