import fs from 'fs';
import path from 'path';
import { PATHS } from '../config/paths.js';

const TEMPLATES_DIR = PATHS.kbTemplates;
const TEMPLATES_META = path.join(TEMPLATES_DIR, 'templates.json');

interface TemplateMetadata {
  name: string;
  description: string;
  filename: string;
  framework: string;
  use_for: string[];
  includes: string[];
  instructions: string[];
  workflow?: string;
  key_patterns?: string[];
}

let metadataCache: Record<string, TemplateMetadata> | null = null;

function loadMetadata(): Record<string, TemplateMetadata> {
  if (metadataCache) {
    return metadataCache;
  }

  if (!fs.existsSync(TEMPLATES_META)) {
    throw new Error(`Templates metadata not found at ${TEMPLATES_META}`);
  }

  const content = fs.readFileSync(TEMPLATES_META, 'utf8');
  metadataCache = JSON.parse(content);
  return metadataCache!;
}

export function getTemplate(templateId: string): any {
  const metadata = loadMetadata();
  const templateMeta = metadata[templateId];

  if (!templateMeta) {
    const available = Object.keys(metadata);
    return {
      error: `Template '${templateId}' not found`,
      suggestion: `Available templates: ${available.join(', ')}`,
      availableTemplates: available
    };
  }

  // Read template file
  const templatePath = path.join(TEMPLATES_DIR, templateMeta.filename);

  if (!fs.existsSync(templatePath)) {
    return {
      error: `Template file not found: ${templateMeta.filename}`,
      metadata: templateMeta
    };
  }

  const content = fs.readFileSync(templatePath, 'utf8');

  return {
    id: templateId,
    name: templateMeta.name,
    description: templateMeta.description,
    framework: templateMeta.framework,
    use_for: templateMeta.use_for,
    includes: templateMeta.includes,
    instructions: templateMeta.instructions,
    workflow: templateMeta.workflow,
    key_patterns: templateMeta.key_patterns,
    content: content,
    filename: templateMeta.filename,
    lines: content.split('\n').length
  };
}

export function listTemplates(framework?: string): any {
  const metadata = loadMetadata();

  if (framework) {
    const filtered = Object.entries(metadata)
      .filter(([_, meta]) => meta.framework === framework)
      .map(([id, meta]) => ({
        id,
        name: meta.name,
        description: meta.description,
        filename: meta.filename
      }));

    return {
      framework,
      count: filtered.length,
      templates: filtered
    };
  }

  // All templates
  const templates = Object.entries(metadata).map(([id, meta]) => ({
    id,
    name: meta.name,
    description: meta.description,
    framework: meta.framework,
    filename: meta.filename
  }));

  return {
    total: templates.length,
    templates
  };
}
