#!/usr/bin/env node

/**
 * Convert patterns.json to individual markdown files with YAML frontmatter
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PATTERNS_JSON = path.join(__dirname, '..', 'data', 'patterns.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'kb', 'patterns');

function convertPatternToMarkdown(id, pattern) {
  let markdown = '---\n';

  // YAML frontmatter
  markdown += `id: ${id}\n`;
  markdown += `name: ${pattern.name}\n`;
  markdown += `category: ${pattern.category}\n`;

  if (pattern.when_to_use) {
    markdown += 'when_to_use:\n';
    pattern.when_to_use.forEach(item => {
      markdown += `  - ${item}\n`;
    });
  }

  if (pattern.related_patterns) {
    markdown += 'related:\n';
    pattern.related_patterns.forEach(item => {
      markdown += `  - ${item}\n`;
    });
  }

  if (pattern.required_builtins) {
    markdown += 'required_builtins:\n';
    pattern.required_builtins.forEach(item => {
      markdown += `  - ${item}\n`;
    });
  }

  if (pattern.examples) {
    markdown += 'examples:\n';
    pattern.examples.forEach(item => {
      markdown += `  - ${item}\n`;
    });
  }

  markdown += '---\n\n';

  // Body
  markdown += `# ${pattern.name}\n\n`;
  markdown += `${pattern.description}\n\n`;

  // Template
  if (pattern.template) {
    markdown += '## Template\n\n';
    markdown += '```quint\n';
    markdown += pattern.template;
    markdown += '\n```\n\n';
  }

  // Key Principles
  if (pattern.key_principles) {
    markdown += '## Key Principles\n\n';
    pattern.key_principles.forEach(principle => {
      markdown += `- ${principle}\n`;
    });
    markdown += '\n';
  }

  // Anti-patterns
  if (pattern.anti_patterns && pattern.anti_patterns.length > 0) {
    markdown += '## Anti-patterns\n\n';
    pattern.anti_patterns.forEach((antiPattern, i) => {
      markdown += `### ❌ DON'T: ${antiPattern.dont.split('\n')[0].substring(0, 60)}...\n\n`;
      markdown += '```quint\n';
      markdown += antiPattern.dont;
      markdown += '\n```\n\n';
      markdown += `**Why?** ${antiPattern.reason}\n\n`;
      markdown += `### ✅ DO:\n\n`;
      markdown += '```quint\n';
      markdown += antiPattern.do;
      markdown += '\n```\n\n';
    });
  }

  // Rules (for syntax patterns)
  if (pattern.rules && pattern.rules.length > 0) {
    markdown += '## Rules\n\n';
    pattern.rules.forEach((rule, i) => {
      markdown += `### ${i + 1}. ${rule.rule}\n\n`;
      markdown += `**Wrong:**\n\`\`\`quint\n${rule.wrong}\n\`\`\`\n\n`;
      markdown += `**Correct:**\n\`\`\`quint\n${rule.correct}\n\`\`\`\n\n`;
      markdown += `${rule.explanation}\n\n`;
    });
  }

  return markdown;
}

function main() {
  // Read patterns.json
  const patternsData = fs.readFileSync(PATTERNS_JSON, 'utf8');
  const patterns = JSON.parse(patternsData);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Convert each pattern
  let count = 0;
  for (const [id, pattern] of Object.entries(patterns)) {
    const filename = `${id}.md`;
    const filepath = path.join(OUTPUT_DIR, filename);
    const markdown = convertPatternToMarkdown(id, pattern);

    fs.writeFileSync(filepath, markdown, 'utf8');
    console.log(`✓ Created ${filename}`);
    count++;
  }

  console.log(`\n✅ Converted ${count} patterns to markdown`);
}

main();
