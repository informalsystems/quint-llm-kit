#!/usr/bin/env node

/**
 * Build kb/templates/templates.json from kb/templates/templates.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES_MD = path.join(__dirname, '..', 'kb', 'templates', 'templates.md');
const OUTPUT_FILE = path.join(__dirname, '..', 'kb', 'templates', 'templates.json');

/**
 * Parse templates.md and extract template metadata
 */
function parseTemplatesMd(content) {
  const templates = {};

  // Split by template sections (## template-id)
  const sections = content.split(/^## /m).filter(s => s.trim());

  for (const section of sections) {
    const lines = section.split('\n');
    const id = lines[0].trim();

    if (!id || id.startsWith('#')) continue; // Skip header

    const template = {};
    let currentField = null;
    let currentArray = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Field headers like **Name:** value
      if (line.match(/^\*\*(.+?):\*\*\s*(.*)$/)) {
        // Save previous array if any
        if (currentField && currentArray.length > 0) {
          template[currentField] = currentArray;
          currentArray = [];
        }

        const [, fieldName, value] = line.match(/^\*\*(.+?):\*\*\s*(.*)$/);
        const fieldKey = fieldName.toLowerCase().replace(/\s+/g, '_');

        if (value.trim()) {
          template[fieldKey] = value.trim();
          currentField = null; // Reset since we got a value
        } else {
          currentField = fieldKey; // Expect array items to follow
        }
      }
      // List items
      else if (currentField && line.match(/^- (.+)$/)) {
        const [, value] = line.match(/^- (.+)$/);
        currentArray.push(value);
      }
      // Numbered list items
      else if (currentField && line.match(/^\d+\.\s+(.+)$/)) {
        const [, value] = line.match(/^\d+\.\s+(.+)$/);
        currentArray.push(value);
      }
      // Empty line or section break
      else if (line.trim() === '' || line.trim() === '---') {
        if (currentField && currentArray.length > 0) {
          template[currentField] = currentArray;
          currentArray = [];
          currentField = null;
        }

        if (line.trim() === '---') {
          break;
        }
      }
    }

    // Add last array if any
    if (currentField && currentArray.length > 0) {
      template[currentField] = currentArray;
    }

    // Only add if we got meaningful data
    if (Object.keys(template).length > 0) {
      templates[id] = template;
    }
  }

  return templates;
}

function main() {
  console.log('Building templates.json from templates.md...\n');

  // Read markdown
  if (!fs.existsSync(TEMPLATES_MD)) {
    console.error(`✗ Error: ${TEMPLATES_MD} not found`);
    process.exit(1);
  }

  const content = fs.readFileSync(TEMPLATES_MD, 'utf8');
  const templates = parseTemplatesMd(content);

  // Write JSON
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(templates, null, 2),
    'utf8'
  );

  const count = Object.keys(templates).length;
  console.log(`✅ Generated templates.json with ${count} templates`);

  // Show what was created
  console.log('\nTemplates:');
  for (const [id, template] of Object.entries(templates)) {
    console.log(`  - ${id}: ${template.name}`);
  }
}

main();
