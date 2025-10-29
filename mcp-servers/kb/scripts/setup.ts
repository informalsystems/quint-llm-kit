#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { buildBuiltinIndex } from '../src/indexers/builtin-indexer.js';
import { buildDocIndexFile } from '../src/indexers/doc-indexer.js';
import { buildExtraDocsIndex } from '../src/indexers/doc-extra-indexer.js';
import { buildGuidelinesIndex } from '../src/indexers/guidelines-indexer.js';
import { buildExamplesIndex } from '../src/indexers/examples-indexer.js';
import { buildVectorIndices } from '../src/indexers/vector-indexer.js';
import { buildLexicalIndices } from '../src/indexers/lexical-indexer.js';

console.log('🚀 Setting up Quint KB MCP Server v2...\n');

const kbDir = path.join(process.cwd(), 'kb');

async function main() {
  console.log('1. Verifying knowledge base directory...');
  if (!fs.existsSync(kbDir)) {
    console.error('   ✗ kb/ directory not found!');
    console.error('   Please ensure kb/ directory exists with required content.');
    process.exit(1);
  }

  const requiredDirs = ['docs', 'choreo', 'posts', 'guidelines', 'examples'];
  for (const dir of requiredDirs) {
    const dirPath = path.join(kbDir, dir);
    if (!fs.existsSync(dirPath)) {
      console.error(`   ✗ Required directory kb/${dir}/ not found!`);
      process.exit(1);
    }
  }
  console.log('   ✓ All required directories present');

  console.log('\n2. Building knowledge base indices...');

  const dataDir = path.join(process.cwd(), 'data');
  const embeddingsDir = path.join(dataDir, 'embeddings');
  const vectorIndexDir = path.join(dataDir, 'vector-indices');
  const lexicalDir = path.join(dataDir, 'lexical-indices');
  const modelsDir = path.join(dataDir, 'models');

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(modelsDir, { recursive: true });

  try {
    console.log('   Indexing builtin operators...');
    const builtinMdPath = path.join(kbDir, 'docs', 'builtin.md');
    const builtinsOutput = path.join(dataDir, 'builtins.json');
    buildBuiltinIndex(builtinMdPath, builtinsOutput);
  } catch (error: any) {
    console.error('   ✗ Failed to index builtins:', error.message);
    process.exit(1);
  }

  try {
    console.log('   Indexing documentation structure...');
    const docsDir = path.join(kbDir, 'docs');
    const docsOutput = path.join(dataDir, 'docs-index.json');
    buildDocIndexFile(docsDir, docsOutput);
  } catch (error: any) {
    console.error('   ✗ Failed to index docs:', error.message);
    process.exit(1);
  }

  try {
    console.log('   Indexing Choreo docs and blog posts...');
    const postsDir = path.join(kbDir, 'posts');
    const choreoDir = path.join(kbDir, 'choreo');
    const extraDocsOutput = path.join(dataDir, 'docs-extra-index.json');
    buildExtraDocsIndex(postsDir, choreoDir, extraDocsOutput);
  } catch (error: any) {
    console.error('   ✗ Failed to index extra docs:', error.message);
    process.exit(1);
  }

  try {
    console.log('   Indexing guidelines and patterns...');
    const guidelinesDir = path.join(kbDir, 'guidelines');
    const guidelinesOutput = path.join(dataDir, 'guidelines-index.json');
    buildGuidelinesIndex(guidelinesDir, guidelinesOutput);
  } catch (error: any) {
    console.error('   ✗ Failed to index guidelines:', error.message);
    process.exit(1);
  }

  try {
    console.log('   Indexing Quint examples...');
    const examplesDir = path.join(kbDir, 'examples');
    const examplesOutput = path.join(dataDir, 'examples-index.json');
    buildExamplesIndex(examplesDir, examplesOutput);
  } catch (error: any) {
    console.error('   ✗ Failed to index examples:', error.message);
    process.exit(1);
  }

  console.log('\n3. Building semantic vector indices...');
  await buildVectorIndices({
    dataDir,
    kbDir,
    embeddingsDir,
    vectorIndexDir,
    onProgress: (scope, processed, total) => {
      const pct = Math.floor((processed / total) * 100);
      process.stdout.write(`   [${scope}] ${processed}/${total} (${pct}%)\r`);
      if (processed === total) {
        process.stdout.write('');
      }
    }
  });
  process.stdout.write('');
  console.log('   ✓ Vector indices ready');

  console.log('\n4. Building lexical indices...');
  buildLexicalIndices({
    dataDir,
    kbDir,
    lexicalDir
  });
  console.log('   ✓ Lexical indices ready');

  console.log('\n5. Verifying setup...');

  const checks = [
    { name: 'Builtins index', path: path.join(dataDir, 'builtins.json') },
    { name: 'Documentation index', path: path.join(dataDir, 'docs-index.json') },
    { name: 'Extra docs index', path: path.join(dataDir, 'docs-extra-index.json') },
    { name: 'Guidelines index', path: path.join(dataDir, 'guidelines-index.json') },
    { name: 'Examples index', path: path.join(dataDir, 'examples-index.json') },
    { name: 'Vector indices', path: vectorIndexDir },
    { name: 'Embeddings', path: embeddingsDir },
    { name: 'Lexical indices', path: lexicalDir }
  ];

  let allChecksPass = true;
  for (const check of checks) {
    if (fs.existsSync(check.path)) {
      console.log(`   ✓ ${check.name}`);
    } else {
      console.log(`   ✗ ${check.name} - not found at ${check.path}`);
      allChecksPass = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  if (allChecksPass) {
    console.log('✓ Setup complete! 🎉\n');
    console.log('Next steps:');
    console.log('  1. Build the server:  npm run build');
    console.log('  2. Start the server:  npm start');
    console.log('\nOr run in dev mode:   npm run dev');
  } else {
    console.log('✗ Setup incomplete - some checks failed\n');
    console.log('Please check the errors above and try again.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\nFatal setup error:', error);
  process.exit(1);
});
