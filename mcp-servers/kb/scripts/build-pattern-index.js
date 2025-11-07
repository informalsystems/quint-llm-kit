#!/usr/bin/env node

/**
 * Build patterns-index.json from kb/patterns/*.md files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PATTERNS_DIR = path.join(__dirname, '..', 'kb', 'patterns');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'patterns-index.json');

/**
 * Parse YAML frontmatter from markdown
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yamlContent = match[1];
  const body = match[2];
  const frontmatter = {};

  // Parse YAML (simple key: value and key: array format)
  const lines = yamlContent.split('\n');
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
    if (line.match(/^(\w+):\s*$/)) {
      // Array start
      currentKey = line.match(/^(\w+):\s*$/)[1];
      currentArray = [];
      frontmatter[currentKey] = currentArray;
    } else if (line.match(/^  - (.+)$/)) {
      // Array item
      if (currentArray) {
        currentArray.push(line.match(/^  - (.+)$/)[1]);
      }
    } else if (line.match(/^(\w+):\s*(.+)$/)) {
      // Simple key: value
      const [, key, value] = line.match(/^(\w+):\s*(.+)$/);
      frontmatter[key] = value;
      currentKey = null;
      currentArray = null;
    }
  }

  return { frontmatter, body: body.trim() };
}

/**
 * Extract code blocks from markdown
 */
function extractCodeBlocks(markdown) {
  const blocks = [];
  const regex = /```(\w+)?\n([\s\S]+?)\n```/g;
  let match;

  while ((match = regex.exec(markdown)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2]
    });
  }

  return blocks;
}

/**
 * Parse anti-patterns section
 */
function parseAntiPatterns(body) {
  const antiPatterns = [];
  const sections = body.split(/### ❌ DON'T:/);

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const doMatch = section.match(/### ✅ DO:/);

    if (!doMatch) continue;

    const dontPart = section.substring(0, doMatch.index);
    const doPart = section.substring(doMatch.index + doMatch[0].length);

    // Extract code and reason
    const dontCodeMatch = dontPart.match(/```\w*\n([\s\S]+?)\n```/);
    const reasonMatch = dontPart.match(/\*\*Why\?\*\*\s*(.+)/);
    const doCodeMatch = doPart.match(/```\w*\n([\s\S]+?)\n```/);

    if (dontCodeMatch && doCodeMatch) {
      antiPatterns.push({
        dont: dontCodeMatch[1].trim(),
        reason: reasonMatch ? reasonMatch[1].trim() : '',
        do: doCodeMatch[1].trim()
      });
    }
  }

  return antiPatterns.length > 0 ? antiPatterns : undefined;
}

/**
 * Parse rules section (for syntax patterns)
 */
function parseRules(body) {
  const rules = [];
  const sections = body.split(/### \d+\./);

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const ruleMatch = section.match(/^(.+?)\n/);
    const wrongMatch = section.match(/\*\*Wrong:\*\*\n```\w*\n([\s\S]+?)\n```/);
    const correctMatch = section.match(/\*\*Correct:\*\*\n```\w*\n([\s\S]+?)\n```/);
    const explanationMatch = section.match(/```\n\n(.+?)(?:\n\n|$)/);

    if (ruleMatch && wrongMatch && correctMatch) {
      rules.push({
        rule: ruleMatch[1].trim(),
        wrong: wrongMatch[1].trim(),
        correct: correctMatch[1].trim(),
        explanation: explanationMatch ? explanationMatch[1].trim() : ''
      });
    }
  }

  return rules.length > 0 ? rules : undefined;
}

/**
 * Extract template from markdown
 */
function extractTemplate(body) {
  const templateMatch = body.match(/## Template\n\n```quint\n([\s\S]+?)\n```/);
  return templateMatch ? templateMatch[1] : undefined;
}

/**
 * Extract key principles from markdown
 */
function extractKeyPrinciples(body) {
  const principlesMatch = body.match(/## Key Principles\n\n((?:- .+\n)+)/);
  if (!principlesMatch) return undefined;

  return principlesMatch[1]
    .split('\n')
    .filter(line => line.trim())
    .map(line => line.replace(/^- /, '').trim());
}

/**
 * Extract description from markdown (first paragraph after heading)
 */
function extractDescription(body) {
  const descMatch = body.match(/# .+\n\n(.+?)(?:\n\n|$)/);
  return descMatch ? descMatch[1].trim() : '';
}

/**
 * Convert markdown file to pattern object
 */
function processPatternFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const { frontmatter, body } = parseFrontmatter(content);

  const pattern = {
    name: frontmatter.name,
    category: frontmatter.category,
    description: extractDescription(body)
  };

  // Add optional fields from frontmatter
  if (frontmatter.when_to_use) {
    pattern.when_to_use = frontmatter.when_to_use;
  }

  // Extract template
  const template = extractTemplate(body);
  if (template) {
    pattern.template = template;
  }

  // Extract key principles
  const keyPrinciples = extractKeyPrinciples(body);
  if (keyPrinciples) {
    pattern.key_principles = keyPrinciples;
  }

  // Add optional frontmatter fields
  if (frontmatter.required_builtins) {
    pattern.required_builtins = frontmatter.required_builtins;
  }

  if (frontmatter.examples) {
    pattern.examples = frontmatter.examples;
  }

  if (frontmatter.related) {
    pattern.related_patterns = frontmatter.related;
  }

  // Parse anti-patterns
  const antiPatterns = parseAntiPatterns(body);
  if (antiPatterns) {
    pattern.anti_patterns = antiPatterns;
  }

  // Parse rules (for syntax patterns)
  const rules = parseRules(body);
  if (rules) {
    pattern.rules = rules;
  }

  return pattern;
}

function main() {
  // Read all markdown files from kb/patterns/
  const files = fs.readdirSync(PATTERNS_DIR)
    .filter(file => file.endsWith('.md'));

  const patterns = {};
  let count = 0;

  for (const file of files) {
    const id = file.replace('.md', '');
    const filepath = path.join(PATTERNS_DIR, file);

    try {
      patterns[id] = processPatternFile(filepath);
      console.log(`✓ Processed ${file}`);
      count++;
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message);
    }
  }

  // Write index file
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(patterns, null, 2),
    'utf8'
  );

  console.log(`\n✅ Generated patterns-index.json with ${count} patterns`);
}

main();
