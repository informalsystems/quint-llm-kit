#!/usr/bin/env node

/**
 * Test a specific MCP tool
 * Usage: node test-specific-tool.js <tool-name> <args-json>
 * Example: node test-specific-tool.js quint_get_pattern '{"patternId":"map-initialization"}'
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

const toolName = process.argv[2];
const argsJson = process.argv[3] || '{}';

if (!toolName) {
  console.log('Usage: node test-specific-tool.js <tool-name> <args-json>');
  console.log('\nExamples:');
  console.log('  node test-specific-tool.js quint_list_patterns');
  console.log('  node test-specific-tool.js quint_get_pattern \'{"patternId":"map-initialization"}\'');
  console.log('  node test-specific-tool.js quint_get_template \'{"templateId":"spec-template"}\'');
  console.log('  node test-specific-tool.js quint_search_docs \'{"query":"mapBy","scope":"all"}\'');
  console.log('  node test-specific-tool.js quint_suggest_framework \'{"description":"ERC20 token"}\'');
  process.exit(1);
}

const args = JSON.parse(argsJson);

const server = spawn('node', ['../dist/server.js'], {
  stdio: ['pipe', 'pipe', 'inherit']
});

const rl = createInterface({
  input: server.stdout,
  crlfDelay: Infinity
});

// Initialize
server.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  }
}) + '\n');

setTimeout(() => {
  console.log(`\n🔧 Testing tool: ${toolName}\n`);
  console.log(`📋 Arguments: ${JSON.stringify(args, null, 2)}\n`);

  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args
    }
  }) + '\n');

  setTimeout(() => {
    server.kill();
    process.exit(0);
  }, 1000);
}, 500);

rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    if (response.id === 2 && response.result) {
      console.log('📥 Result:\n');
      console.log(response.result.content[0].text);
      console.log('');
    } else if (response.error) {
      console.error('❌ Error:', response.error);
    }
  } catch (err) {
    // Ignore non-JSON
  }
});
