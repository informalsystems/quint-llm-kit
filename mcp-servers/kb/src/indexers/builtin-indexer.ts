import fs from 'fs';
import path from 'path';
import { Builtin } from '../types.js';

export function parseBuiltins(builtinMdPath: string): Record<string, Builtin> {
  const content = fs.readFileSync(builtinMdPath, 'utf8');
  const builtins: Record<string, Builtin> = {};

  // Split by ## headers (each operator section)
  const sections = content.split(/\n## /).slice(1); // Skip first (before first ##)

  for (const section of sections) {
    const lines = section.split('\n');
    const name = lines[0].trim();

    // Extract signature (line starting with "Signature:" or "signature:")
    const sigLine = lines.find(l => l.toLowerCase().startsWith('signature:'));
    let signature = '';
    if (sigLine) {
      // Remove "Signature:" prefix and backticks
      signature = sigLine
        .replace(/signature:/i, '')
        .trim()
        .replace(/^`+|`+$/g, '');
    }

    // Find the index of "### Examples" section
    const exampleIdx = lines.findIndex(l => l.trim().startsWith('### Examples'));

    // Extract description (lines between signature and ### Examples or end)
    const sigLineIdx = lines.findIndex(l => l.toLowerCase().startsWith('signature:'));
    const descStartIdx = sigLineIdx >= 0 ? sigLineIdx + 1 : 1;
    const descEndIdx = exampleIdx > 0 ? exampleIdx : lines.length;

    const descLines = lines
      .slice(descStartIdx, descEndIdx)
      .filter(l => {
        const trimmed = l.trim();
        return trimmed.length > 0 && !trimmed.startsWith('###');
      });

    const description = descLines.join('\n').trim();

    // Extract examples (code blocks after ### Examples)
    const examples: string[] = [];
    if (exampleIdx > 0) {
      const exampleSection = lines.slice(exampleIdx).join('\n');
      const codeBlockRegex = /```quint\n([\s\S]*?)```/g;
      let match;
      while ((match = codeBlockRegex.exec(exampleSection)) !== null) {
        examples.push(match[1].trim());
      }
    }

    builtins[name] = {
      name,
      signature,
      description,
      examples,
      sourceUrl: `https://quint-lang.org/docs/builtin#${name.toLowerCase()}`
    };
  }

  return builtins;
}

/**
 * Categorize a builtin operator based on its signature, name, and description.
 * Uses semantic analysis for accurate categorization.
 */
export function categorizeBuiltin(builtin: Builtin): string {
  const name = builtin.name.toLowerCase();
  const signature = builtin.signature.toLowerCase();
  const description = builtin.description.toLowerCase();

  // Temporal operators (specific temporal keyword in signature)
  if (signature.includes('temporal')) {
    return 'temporal';
  }

  // Action operators (action keyword in signature)
  if (signature.includes('action')) {
    return 'action';
  }

  // Boolean/Logical operators
  const booleanOps = ['not', 'iff', 'implies', 'and', 'or', 'eq', 'neq'];
  const logicalKeywords = ['quantifier', 'boolean', 'logical', 'true', 'false'];
  if (
    booleanOps.includes(name) ||
    signature.includes('=> bool') ||
    signature.includes('bool)') && (name === 'exists' || name === 'forall') ||
    logicalKeywords.some(kw => description.includes(kw))
  ) {
    return 'logic';
  }

  // Set operators
  const setKeywords = ['set[', 'set ', 'subset', 'powerset', 'flatten'];
  const setOps = ['union', 'intersect', 'exclude', 'contains', 'filter', 'in', 'subseteq', 'powerset', 'flatten', 'choosesome', 'oneof', 'getonlyelement'];
  if (
    setKeywords.some(kw => signature.includes(kw)) ||
    setOps.includes(name) ||
    (description.includes('set ') && description.includes('element'))
  ) {
    return 'set';
  }

  // Map operators
  const mapOps = ['get', 'keys', 'mapby', 'settomap', 'setofmaps', 'set', 'setby', 'put'];
  if (
    signature.includes('->') ||
    mapOps.includes(name) ||
    description.includes('map ')
  ) {
    return 'map';
  }

  // List operators
  const listKeywords = ['list[', 'list '];
  const listOps = ['append', 'concat', 'head', 'tail', 'length', 'nth', 'indices', 'replaceat', 'slice', 'range', 'select', 'foldl', 'alllists', 'alllistsupto'];
  if (
    listKeywords.some(kw => signature.includes(kw)) ||
    listOps.includes(name) ||
    description.includes('list ')
  ) {
    return 'list';
  }

  // Integer/arithmetic operators
  const intOps = ['iadd', 'isub', 'imul', 'idiv', 'imod', 'ipow', 'ilt', 'igt', 'ilte', 'igte', 'iuminus', 'to'];
  if (
    name.startsWith('i') && intOps.includes(name) ||
    name === 'to' ||
    (signature.includes('int') && (description.includes('integer') || description.includes('addition') || description.includes('subtraction')))
  ) {
    return 'integer';
  }

  // Type/constant values
  const typeValues = ['nat', 'int', 'bool'];
  if (typeValues.includes(name) && signature.includes('set[')) {
    return 'types';
  }

  // Utility/debugging
  const utilityOps = ['q::debug', 'apalache::generate', 'isfinite', 'size'];
  if (utilityOps.includes(name) || name.includes('::')) {
    return 'utility';
  }

  // Testing operators
  const testOps = ['assert', 'expect', 'fail'];
  if (testOps.includes(name)) {
    return 'testing';
  }

  // Higher-order functions
  if (name === 'fold' || name === 'map') {
    return 'higher-order';
  }

  return 'uncategorized';
}

export function buildBuiltinIndex(builtinMdPath: string, outputPath: string): void {
  if (!fs.existsSync(builtinMdPath)) {
    throw new Error(`builtin.md not found at ${builtinMdPath}`);
  }

  console.log('Parsing builtin.md...');
  const builtins = parseBuiltins(builtinMdPath);

  // Add categories
  for (const name in builtins) {
    builtins[name].category = categorizeBuiltin(builtins[name]);
  }

  // Write to output
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(builtins, null, 2));

  console.log(`✓ Indexed ${Object.keys(builtins).length} builtins to ${outputPath}`);

  // Print category breakdown
  const categories: Record<string, number> = {};
  for (const builtin of Object.values(builtins)) {
    const cat = builtin.category || 'unknown';
    categories[cat] = (categories[cat] || 0) + 1;
  }

  console.log('\nCategory breakdown:');
  for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }
}
