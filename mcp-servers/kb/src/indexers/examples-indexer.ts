import fs from 'fs';
import path from 'path';

export interface ExampleMetadata {
  filename: string;
  path: string;
  category: string;  // e.g., "cosmos", "solidity", "tutorials"
  subcategory?: string;  // e.g., "zero-to-hero" under cosmwasm
  modules: string[];  // Module names defined in file
  description: string;  // Extracted from leading comments
  imports: Array<{
    module: string;
    from: string;
  }>;
  types: string[];  // Type names
  constants: string[];  // Constant names
  functions: string[];  // Function names
  actions: string[];  // Action names
  keywords: string[];  // Keywords for search
  size: number;
  hasTests: boolean;  // Contains run/test blocks
}

export interface ExamplesIndex {
  examples: ExampleMetadata[];
  categories: Record<string, number>;  // Count by category
  invertedIndex: Record<string, {
    keyword: string;
    examples: Array<{
      path: string;
      frequency: number;
    }>;
  }>;
  stats: {
    totalExamples: number;
    totalCategories: number;
    totalModules: number;
    withTests: number;
  };
}

/**
 * Extract module names from file content
 */
function extractModules(content: string): string[] {
  const modules: string[] = [];
  const moduleRegex = /module\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/g;
  let match;

  while ((match = moduleRegex.exec(content)) !== null) {
    modules.push(match[1]);
  }

  return modules;
}

/**
 * Extract description from leading comments
 */
function extractDescription(content: string): string {
  const lines = content.split('\n');
  const descLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines at start
    if (descLines.length === 0 && trimmed === '') continue;

    // Extract comment content
    if (trimmed.startsWith('///')) {
      descLines.push(trimmed.substring(3).trim());
    } else if (trimmed.startsWith('//')) {
      descLines.push(trimmed.substring(2).trim());
    } else if (trimmed.startsWith('*') && !trimmed.startsWith('*/')) {
      descLines.push(trimmed.substring(1).trim());
    } else if (trimmed === '/**' || trimmed === '/*') {
      continue;
    } else if (trimmed === '*/' || trimmed === '') {
      continue;
    } else {
      // Stop at first non-comment line
      break;
    }
  }

  return descLines.join(' ').trim();
}

/**
 * Extract imports
 */
function extractImports(content: string): Array<{ module: string; from: string }> {
  const imports: Array<{ module: string; from: string }> = [];
  const importRegex = /import\s+([a-zA-Z_][a-zA-Z0-9_]*)[^f]*from\s+"([^"]+)"/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push({
      module: match[1],
      from: match[2]
    });
  }

  return imports;
}

/**
 * Extract type definitions
 */
function extractTypes(content: string): string[] {
  const types: string[] = [];
  const typeRegex = /type\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
  let match;

  while ((match = typeRegex.exec(content)) !== null) {
    types.push(match[1]);
  }

  return types;
}

/**
 * Extract constants
 */
function extractConstants(content: string): string[] {
  const constants: string[] = [];
  const constRegex = /(?:const|pure\s+val)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[:=]/g;
  let match;

  while ((match = constRegex.exec(content)) !== null) {
    constants.push(match[1]);
  }

  return constants;
}

/**
 * Extract function definitions
 */
function extractFunctions(content: string): string[] {
  const functions: string[] = [];
  const funcRegex = /(?:pure\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[(\[]/g;
  let match;

  while ((match = funcRegex.exec(content)) !== null) {
    functions.push(match[1]);
  }

  return functions;
}

/**
 * Extract action definitions
 */
function extractActions(content: string): string[] {
  const actions: string[] = [];
  const actionRegex = /action\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[=(:]/g;
  let match;

  while ((match = actionRegex.exec(content)) !== null) {
    actions.push(match[1]);
  }

  return actions;
}

/**
 * Check if file contains tests
 */
function hasTests(content: string): boolean {
  return /\brun\s+[a-zA-Z_]/.test(content) || content.includes('Test');
}

/**
 * Extract keywords from content
 */
function extractKeywords(content: string, metadata: Partial<ExampleMetadata>): string[] {
  const keywords = new Set<string>();
  const lower = content.toLowerCase();

  // Add category and subcategory as keywords
  if (metadata.category) keywords.add(metadata.category.toLowerCase());
  if (metadata.subcategory) keywords.add(metadata.subcategory.toLowerCase());

  // Add module names
  metadata.modules?.forEach(m => keywords.add(m.toLowerCase()));

  // Add types, functions, actions
  metadata.types?.forEach(t => keywords.add(t.toLowerCase()));
  metadata.functions?.forEach(f => keywords.add(f.toLowerCase()));
  metadata.actions?.forEach(a => keywords.add(a.toLowerCase()));

  // Domain-specific concepts
  const concepts = [
    'consensus', 'byzantine', 'protocol', 'distributed',
    'blockchain', 'smart contract', 'token', 'erc20', 'erc721',
    'cosmos', 'tendermint', 'ibc', 'cosmwasm',
    'state machine', 'transition', 'invariant', 'property',
    'verification', 'model checking', 'temporal',
    'raft', 'paxos', 'pbft', 'hotstuff',
    'message passing', 'async', 'sync',
    'hash', 'signature', 'crypto', 'utxo',
    'voting', 'governance', 'staking', 'delegation'
  ];

  for (const concept of concepts) {
    if (lower.includes(concept.replace(' ', ''))) {
      keywords.add(concept);
    }
  }

  return Array.from(keywords);
}

/**
 * Parse a single .qnt example file
 */
function parseExample(filePath: string, examplesDir: string): ExampleMetadata {
  const content = fs.readFileSync(filePath, 'utf8');
  const stats = fs.statSync(filePath);
  const relativePath = path.relative(examplesDir, filePath);
  const pathParts = relativePath.split(path.sep);

  const metadata: Partial<ExampleMetadata> = {
    filename: path.basename(filePath),
    path: relativePath,
    category: pathParts[0],
    subcategory: pathParts.length > 2 ? pathParts[1] : undefined,
    size: stats.size,
  };

  metadata.modules = extractModules(content);
  metadata.description = extractDescription(content);
  metadata.imports = extractImports(content);
  metadata.types = extractTypes(content);
  metadata.constants = extractConstants(content);
  metadata.functions = extractFunctions(content);
  metadata.actions = extractActions(content);
  metadata.hasTests = hasTests(content);
  metadata.keywords = extractKeywords(content, metadata);

  return metadata as ExampleMetadata;
}

/**
 * Index all examples in directory
 */
export function indexExamples(examplesDir: string): ExampleMetadata[] {
  const examples: ExampleMetadata[] = [];

  function walkDir(dir: string) {
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        // Skip hidden directories
        if (!entry.startsWith('.')) {
          walkDir(fullPath);
        }
      } else if (entry.endsWith('.qnt')) {
        try {
          const metadata = parseExample(fullPath, examplesDir);
          examples.push(metadata);
        } catch (error: any) {
          console.warn(`   ⚠ Failed to parse ${fullPath}: ${error.message}`);
        }
      }
    }
  }

  walkDir(examplesDir);
  return examples;
}

/**
 * Build inverted index for keyword search
 */
export function buildExamplesInvertedIndex(examples: ExampleMetadata[]): Map<string, any> {
  const invertedIndex = new Map<string, any>();

  for (const example of examples) {
    for (const keyword of example.keywords) {
      let entry = invertedIndex.get(keyword);

      if (!entry) {
        entry = {
          keyword,
          examples: []
        };
        invertedIndex.set(keyword, entry);
      }

      let exampleEntry = entry.examples.find((e: any) => e.path === example.path);
      if (!exampleEntry) {
        exampleEntry = {
          path: example.path,
          frequency: 0
        };
        entry.examples.push(exampleEntry);
      }

      exampleEntry.frequency++;
    }
  }

  return invertedIndex;
}

/**
 * Main function to build and save examples index
 */
export function buildExamplesIndex(examplesDir: string, outputPath: string): void {
  if (!fs.existsSync(examplesDir)) {
    console.warn(`Examples directory not found: ${examplesDir}`);
    return;
  }

  console.log('Indexing Quint examples...');
  const examples = indexExamples(examplesDir);

  console.log('Building inverted index...');
  const invertedIndex = buildExamplesInvertedIndex(examples);

  // Count categories
  const categories: Record<string, number> = {};
  for (const example of examples) {
    categories[example.category] = (categories[example.category] || 0) + 1;
  }

  // Convert Map to object for JSON
  const invertedIndexObj: Record<string, any> = {};
  invertedIndex.forEach((value, key) => {
    invertedIndexObj[key] = value;
  });

  const index: ExamplesIndex = {
    examples,
    categories,
    invertedIndex: invertedIndexObj,
    stats: {
      totalExamples: examples.length,
      totalCategories: Object.keys(categories).length,
      totalModules: examples.reduce((sum, e) => sum + e.modules.length, 0),
      withTests: examples.filter(e => e.hasTests).length
    }
  };

  // Write to output
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(index, null, 2));

  console.log(`✓ Indexed ${examples.length} examples`);
  console.log(`  Categories: ${Object.keys(categories).length}`);
  console.log(`  Total modules: ${index.stats.totalModules}`);
  console.log(`  With tests: ${index.stats.withTests}`);
  console.log(`  Keywords: ${invertedIndex.size}`);

  console.log('\nExamples by category:');
  const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  for (const [category, count] of sortedCategories) {
    console.log(`  ${category}: ${count} examples`);
  }
}
