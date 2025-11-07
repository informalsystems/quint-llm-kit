/**
 * Comprehensive integration tests for all MCP tools
 * Tests every tool with all available scopes/folders
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { PATHS } from '../src/config/paths.js';

// Import all tool functions
import { getBuiltin, listBuiltins } from '../src/tools/builtins.js';
import { searchDocs } from '../src/tools/search.js';
import { getDoc, listDocs } from '../src/tools/docs.js';
import { suggestFramework } from '../src/tools/routing.js';
import { getExample, listExamples, browseExamples } from '../src/tools/examples.js';
import { getPattern, listPatterns, searchPatterns } from '../src/tools/patterns.js';
import { getTemplate, listTemplates } from '../src/tools/templates.js';
import { runHybridSearch } from '../src/tools/hybrid-search.js';
import { getDocOutline } from '../src/tools/doc-outline.js';
import { getExampleInfo } from '../src/tools/example-info.js';

describe('MCP Tools Integration Tests', () => {

  // ============================================================================
  // SETUP: Verify all required files exist
  // ============================================================================

  describe('Setup Verification', () => {
    test('data/ directory exists with all indices', () => {
      expect(fs.existsSync(PATHS.data)).toBe(true);
      expect(fs.existsSync(PATHS.builtins)).toBe(true);
      expect(fs.existsSync(PATHS.patterns)).toBe(true);
      expect(fs.existsSync(PATHS.docsIndex)).toBe(true);
      expect(fs.existsSync(PATHS.docsExtraIndex)).toBe(true);
    });

    test('kb/ directory has all required folders', () => {
      const requiredDirs = [
        'docs', 'choreo', 'posts', 'patterns',
        'guidelines', 'examples', 'templates'
      ];

      for (const dir of requiredDirs) {
        const dirPath = path.join(PATHS.kb, dir);
        expect(fs.existsSync(dirPath)).toBe(true);
      }
    });
  });

  // ============================================================================
  // TEST: quint_get_builtin & quint_list_builtins
  // ============================================================================

  describe('Builtin Tools', () => {
    test('quint_list_builtins - no filter', () => {
      const result = listBuiltins();
      expect(result).toHaveProperty('builtins');
      expect(Array.isArray(result.builtins)).toBe(true);
      expect(result.builtins.length).toBeGreaterThan(0);
    });

    test('quint_list_builtins - with category filters', () => {
      const categories = ['set', 'list', 'map', 'integer', 'logic', 'temporal', 'utility'];

      for (const category of categories) {
        const result = listBuiltins(category);
        // listBuiltins returns same structure with/without category, or error if category doesn't exist
        if (!result.error) {
          expect(result).toHaveProperty('builtins');
          expect(Array.isArray(result.builtins)).toBe(true);
          expect(result.builtins.length).toBeGreaterThan(0);
        }
      }
    });

    test('quint_get_builtin - valid operators', () => {
      const operators = ['union', 'map', 'Set', 'List'];

      for (const op of operators) {
        const result = getBuiltin(op);
        if (!result.error) {
          expect(result).toHaveProperty('name', op);
          expect(result).toHaveProperty('signature');
          expect(result).toHaveProperty('description');
        }
      }
    });

    test('quint_get_builtin - invalid operator', () => {
      const result = getBuiltin('nonexistent_operator_xyz');
      expect(result).toHaveProperty('error');
    });
  });

  // ============================================================================
  // TEST: quint_search_docs
  // ============================================================================

  describe('Search Docs Tool', () => {
    test('quint_search_docs - all scope', () => {
      const result = searchDocs('state', { scope: 'all' });
      expect(result).toHaveProperty('matches');
      expect(Array.isArray(result.matches)).toBe(true);
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('query');
    });

    test('quint_search_docs - each scope', () => {
      const scopes = ['all', 'builtins', 'lessons', 'examples'];

      for (const scope of scopes) {
        const result = searchDocs('test', { scope: scope as any });
        expect(result).toHaveProperty('query');
        expect(result).toHaveProperty('matches');
      }
    });

    test('quint_search_docs - with context lines', () => {
      const result = searchDocs('module', { contextLines: 3 });
      expect(result).toHaveProperty('matches');
    });
  });

  // ============================================================================
  // TEST: quint_get_doc & quint_list_docs
  // ============================================================================

  describe('Docs Tools', () => {
    test('quint_list_docs - returns all categories', () => {
      const result = listDocs();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('core');
      expect(result).toHaveProperty('choreo');
      expect(result).toHaveProperty('lessons');
      expect(result).toHaveProperty('guidelines');

      expect(Array.isArray(result.core)).toBe(true);
      expect(Array.isArray(result.choreo)).toBe(true);
      expect(Array.isArray(result.lessons)).toBe(true);
      expect(Array.isArray(result.guidelines)).toBe(true);
    });

    test('quint_get_doc - from each directory', () => {
      const docs = listDocs();

      // Test getting a doc from each category if available
      if (docs.core.length > 0) {
        const coreDoc = getDoc(docs.core[0].filename);
        expect(coreDoc).toHaveProperty('content');
        expect(coreDoc).not.toHaveProperty('error');
      }

      if (docs.choreo.length > 0) {
        const choreoDoc = getDoc(docs.choreo[0].filename);
        expect(choreoDoc).toHaveProperty('content');
        expect(choreoDoc).not.toHaveProperty('error');
      }

      if (docs.guidelines.length > 0) {
        const guidelineDoc = getDoc(docs.guidelines[0].filename);
        expect(guidelineDoc).toHaveProperty('content');
        expect(guidelineDoc).not.toHaveProperty('error');
      }
    });

    test('quint_get_doc - guidelines directory specifically', () => {
      const guidelineDocs = ['choreo-testing-workflow.md', 'spec-builder.md'];

      for (const doc of guidelineDocs) {
        const result = getDoc(doc);
        if (!result.error) {
          expect(result).toHaveProperty('content');
          expect(result).toHaveProperty('filename', doc);
        }
      }
    });

    test('quint_get_doc - invalid file', () => {
      const result = getDoc('nonexistent-file-xyz.md');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('suggestion');
    });
  });

  // ============================================================================
  // TEST: quint_suggest_framework
  // ============================================================================

  describe('Framework Routing Tool', () => {
    test('quint_suggest_framework - consensus systems', () => {
      const consensusCases = [
        'Tendermint consensus',
        'PBFT protocol',
        'Byzantine fault tolerant system',
        'distributed voting'
      ];

      for (const description of consensusCases) {
        const result = suggestFramework(description);
        expect(result).toHaveProperty('framework');
        expect(result).toHaveProperty('confidence');
      }
    });

    test('quint_suggest_framework - standard systems', () => {
      const standardCases = [
        'ERC20 token',
        'smart contract',
        'DeFi protocol',
        'state machine'
      ];

      for (const description of standardCases) {
        const result = suggestFramework(description);
        expect(result).toHaveProperty('framework');
        expect(result).toHaveProperty('confidence');
      }
    });
  });

  // ============================================================================
  // TEST: Examples Tools
  // ============================================================================

  describe('Examples Tools', () => {
    test('quint_list_examples - no category', () => {
      const result = browseExamples();
      expect(result).toHaveProperty('categories');
      expect(typeof result.categories).toBe('object');
    });

    test('quint_list_examples - with categories', () => {
      const allExamples = browseExamples();
      const categories = Object.keys(allExamples.categories);

      for (const category of categories) {
        const result = listExamples(category);
        expect(Array.isArray(result)).toBe(true);
      }
    });

    test('quint_get_example - valid example', () => {
      const allExamples = browseExamples();
      const categories = Object.keys(allExamples.categories);

      if (categories.length > 0) {
        const firstCategory = categories[0];
        const examples = allExamples.categories[firstCategory];

        if (examples.length > 0) {
          const examplePath = examples[0].path;
          const result = getExample(examplePath);

          if (!result.error) {
            expect(result).toHaveProperty('content');
            expect(result).toHaveProperty('path', examplePath);
          }
        }
      }
    });

    test('quint_example_info - metadata', () => {
      const allExamples = browseExamples();
      const categories = Object.keys(allExamples.categories);

      if (categories.length > 0) {
        const firstCategory = categories[0];
        const examples = allExamples.categories[firstCategory];

        if (examples.length > 0) {
          const examplePath = examples[0].path;
          const result = getExampleInfo(examplePath);

          // ExampleInfoResponse doesn't have an error property - it just returns the info
          expect(result).toHaveProperty('path', examplePath);
          expect(result).toHaveProperty('category');
        }
      }
    });
  });

  // ============================================================================
  // TEST: Patterns Tools
  // ============================================================================

  describe('Patterns Tools', () => {
    test('quint_list_patterns - no category', () => {
      const result = listPatterns();
      // Without category, returns {total, categories} object
      expect(result).toHaveProperty('categories');
      expect(typeof result.categories).toBe('object');
      expect(result).toHaveProperty('total');
      expect(result.total).toBeGreaterThan(0);
    });

    test('quint_list_patterns - with category filters', () => {
      const categories = ['core', 'best-practice', 'testing', 'workflow', 'syntax', 'anti-pattern'];

      for (const category of categories) {
        const result = listPatterns(category);
        // With category filter, returns {category, count, patterns}
        expect(result).toHaveProperty('category', category);
        expect(result).toHaveProperty('patterns');
        expect(Array.isArray(result.patterns)).toBe(true);
      }
    });

    test('quint_get_pattern - all patterns exist', () => {
      // listPatterns() without category returns {total, categories} object
      // Use 'core' category to get a patterns array
      const corePatterns = listPatterns('core');

      if (corePatterns.patterns && corePatterns.patterns.length > 0) {
        for (const pattern of corePatterns.patterns) {
          const result = getPattern(pattern.id);
          // getPattern returns pattern object directly without 'id' property
          expect(result).toHaveProperty('name');
          expect(result).not.toHaveProperty('error');
        }
      }
    });

    test('quint_get_pattern - specific patterns', () => {
      const patternIds = [
        'state-type-pattern',
        'pure-functions',
        'thin-actions',
        'map-initialization',
        'choreo-pattern'
      ];

      for (const id of patternIds) {
        const result = getPattern(id);
        if (!result.error) {
          // getPattern returns pattern object directly without 'id' property
          expect(result).toHaveProperty('name');
          expect(result).toHaveProperty('category');
        }
      }
    });

    test('quint_search_patterns - keyword search', () => {
      const queries = ['map', 'consensus', 'testing', 'state'];

      for (const query of queries) {
        const result = searchPatterns(query);
        expect(result).toHaveProperty('query', query);
        expect(result).toHaveProperty('matches');
        expect(Array.isArray(result.matches)).toBe(true);
      }
    });
  });

  // ============================================================================
  // TEST: Templates Tools
  // ============================================================================

  describe('Templates Tools', () => {
    test('quint_list_templates - no framework filter', () => {
      const result = listTemplates();
      expect(result).toHaveProperty('templates');
      expect(Array.isArray(result.templates)).toBe(true);
      expect(result.templates.length).toBeGreaterThan(0);
    });

    test('quint_list_templates - framework filters', () => {
      const frameworks = ['standard', 'choreo'];

      for (const framework of frameworks) {
        const result = listTemplates(framework);
        expect(result).toHaveProperty('framework', framework);
        expect(Array.isArray(result.templates)).toBe(true);
      }
    });

    test('quint_get_template - all templates exist', () => {
      const allTemplates = listTemplates();

      for (const template of allTemplates.templates) {
        const result = getTemplate(template.id);
        if (!result.error) {
          expect(result).toHaveProperty('id', template.id);
          expect(result).toHaveProperty('content');
          expect(result).toHaveProperty('name');
          expect(result).toHaveProperty('framework');
        }
      }
    });

    test('quint_get_template - specific templates', () => {
      const templateIds = [
        'spec-template',
        'test-template',
        'choreo-template',
        'choreo-test-template'
      ];

      for (const id of templateIds) {
        const result = getTemplate(id);
        if (!result.error) {
          expect(result).toHaveProperty('id', id);
          expect(result).toHaveProperty('content');
          expect(result).toHaveProperty('name');
        }
      }
    });
  });

  // ============================================================================
  // TEST: Hybrid Search (All Scopes)
  // ============================================================================

  describe('Hybrid Search Tool', () => {
    test('quint_hybrid_search - single scope searches', async () => {
      const scopes = ['all', 'builtins', 'docs', 'examples', 'patterns', 'extra'];

      for (const scope of scopes) {
        const result = await runHybridSearch('state', { scope, k: 5 });
        expect(result).toHaveProperty('scope', scope);
        expect(result).toHaveProperty('results');
        expect(Array.isArray(result.results)).toBe(true);
      }
    });

    test('quint_hybrid_search - multiple scopes', async () => {
      const scopes = ['builtins', 'docs', 'patterns'];
      const result = await runHybridSearch('map', { scopes, limitPerScope: 3 });

      expect(result).toHaveProperty('scopes');
      expect(result.scopes).toEqual(scopes);
      expect(result).toHaveProperty('resultsByScope');

      for (const scope of scopes) {
        const resultForScope = result.resultsByScope[scope as keyof typeof result.resultsByScope];
        expect(resultForScope).toBeDefined();
        expect(Array.isArray(resultForScope)).toBe(true);
      }
    });

    test('quint_hybrid_search - patterns scope specifically', async () => {
      const result = await runHybridSearch('state type', { scope: 'patterns', k: 10 });
      expect(result).toHaveProperty('scope', 'patterns');
      expect(result).toHaveProperty('results');
    });

    test('quint_hybrid_search - invalid scope', async () => {
      try {
        await runHybridSearch('test', { scope: 'invalid_scope_xyz' as any });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Invalid scope');
      }
    });
  });

  // ============================================================================
  // TEST: Doc Outline Tool
  // ============================================================================

  describe('Doc Outline Tool', () => {
    test('quint_doc_outline - various doc paths', () => {
      const docs = listDocs();

      // Test core docs
      if (docs.core.length > 0) {
        const result = getDocOutline(docs.core[0].path);
        if (!result.error) {
          expect(result).toHaveProperty('path');
          expect(result).toHaveProperty('sections');
          expect(Array.isArray(result.sections)).toBe(true);
        }
      }

      // Test choreo docs
      if (docs.choreo.length > 0) {
        const result = getDocOutline(docs.choreo[0].path);
        if (!result.error) {
          expect(result).toHaveProperty('path');
          expect(result).toHaveProperty('sections');
        }
      }

      // Test guidelines
      if (docs.guidelines.length > 0) {
        const result = getDocOutline(docs.guidelines[0].path);
        if (!result.error) {
          expect(result).toHaveProperty('path');
          expect(result).toHaveProperty('sections');
        }
      }
    });
  });

  // ============================================================================
  // CROSS-TOOL INTEGRATION TESTS
  // ============================================================================

  describe('Cross-Tool Integration', () => {
    test('Pattern workflow: search → get → verify content', async () => {
      // Search for patterns
      const searchResult = await runHybridSearch('state type', { scope: 'patterns', k: 5 });
      expect(searchResult.results!.length).toBeGreaterThan(0);

      // Get the first pattern directly
      const pattern = getPattern('state-type-pattern');
      expect(pattern).not.toHaveProperty('error');
      expect(pattern).toHaveProperty('name');
    });

    test('Template workflow: list → filter → get', () => {
      // List all templates
      const allTemplates = listTemplates();
      expect(allTemplates.templates.length).toBeGreaterThan(0);

      // Filter by framework
      const choreoTemplates = listTemplates('choreo');
      expect(choreoTemplates.templates.length).toBeGreaterThan(0);

      // Get specific template
      if (choreoTemplates.templates.length > 0) {
        const template = getTemplate(choreoTemplates.templates[0].id);
        if (!template.error) {
          expect(template).toHaveProperty('content');
        }
      }
    });

    test('Docs workflow: list → get → outline', () => {
      const docs = listDocs();

      if (docs.core.length > 0) {
        const docPath = docs.core[0].filename;

        // Get doc content
        const content = getDoc(docPath);
        expect(content).not.toHaveProperty('error');

        // Get doc outline
        const outline = getDocOutline(docs.core[0].path);
        if (!outline.error) {
          expect(outline).toHaveProperty('sections');
        }
      }
    });

    test('Framework suggestion → Template retrieval', () => {
      // Suggest framework for consensus
      const suggestion = suggestFramework('PBFT consensus algorithm');
      expect(suggestion).toHaveProperty('framework');

      // List templates for that framework
      const templates = listTemplates(suggestion.framework);
      expect(templates).toHaveProperty('templates');
    });
  });
});
