import fs from 'fs';
import { Builtin } from '../types.js';
import { PATHS } from '../config/paths.js';

let builtinsData: Record<string, Builtin> | null = null;

function loadBuiltins(): Record<string, Builtin> {
  if (builtinsData) {
    return builtinsData;
  }

  const dataPath = PATHS.builtins;

  if (!fs.existsSync(dataPath)) {
    throw new Error(
      `Builtins data not found at ${dataPath}. Please run 'npm run setup' first.`
    );
  }

  const content = fs.readFileSync(dataPath, 'utf8');
  builtinsData = JSON.parse(content);
  return builtinsData!;
}

export function getBuiltin(name: string): any {
  const builtins = loadBuiltins();
  const builtin = builtins[name];

  if (!builtin) {
    const available = Object.keys(builtins).sort();
    const similar = available.filter(n =>
      n.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(n.toLowerCase())
    );

    return {
      error: `Builtin '${name}' not found`,
      suggestion: similar.length > 0
        ? `Did you mean: ${similar.slice(0, 5).join(', ')}?`
        : `Available builtins: ${available.slice(0, 10).join(', ')}...`,
      totalAvailable: available.length
    };
  }

  return {
    ...builtin,
    formatted: formatBuiltinDoc(builtin)
  };
}

export function listBuiltins(category?: string): any {
  const builtins = loadBuiltins();
  const all = Object.values(builtins);

  let filtered = all;
  if (category) {
    filtered = all.filter(b =>
      b.category?.toLowerCase() === category.toLowerCase()
    );

    if (filtered.length === 0) {
      const categories = [...new Set(all.map(b => b.category).filter(Boolean))].sort();
      return {
        error: `No builtins found in category '${category}'`,
        availableCategories: categories
      };
    }
  }

  // Group by category
  const byCategory: Record<string, Builtin[]> = {};
  for (const builtin of filtered) {
    const cat = builtin.category || 'uncategorized';
    if (!byCategory[cat]) {
      byCategory[cat] = [];
    }
    byCategory[cat].push(builtin);
  }

  return {
    total: filtered.length,
    categories: Object.keys(byCategory).sort(),
    builtins: filtered.map(b => ({
      name: b.name,
      signature: b.signature,
      category: b.category,
      description: b.description.split('\n')[0] // First line only
    })),
    byCategory: Object.fromEntries(
      Object.entries(byCategory).map(([cat, items]) => [
        cat,
        items.map(b => ({ name: b.name, signature: b.signature }))
      ])
    )
  };
}

function formatBuiltinDoc(builtin: Builtin): string {
  let doc = `# ${builtin.name}\n\n`;
  doc += `**Signature**: \`${builtin.signature}\`\n\n`;

  if (builtin.category) {
    doc += `**Category**: ${builtin.category}\n\n`;
  }

  doc += `${builtin.description}\n`;

  if (builtin.examples && builtin.examples.length > 0) {
    doc += `\n## Examples\n\n`;
    doc += '```quint\n';
    doc += builtin.examples.join('\n\n');
    doc += '\n```\n';
  }

  doc += `\n[View in documentation](${builtin.sourceUrl})`;

  return doc;
}
