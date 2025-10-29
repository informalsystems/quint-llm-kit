#!/usr/bin/env node

/**
 * Quick test script for the Quint KB MCP server
 * Run with: node test-server.js
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

const serverPath = '../dist/server.js';

console.log('🚀 Starting Quint KB MCP Server Test\n');

// Start the server
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

const rl = createInterface({
  input: server.stdout,
  crlfDelay: Infinity
});

let messageId = 1;

// Send JSON-RPC request
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: messageId++,
    method,
    params
  };

  console.log(`📤 Sending: ${method}`);
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Initialize
server.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: messageId++,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
}) + '\n');

// Wait a bit for initialization
setTimeout(() => {
  console.log('\n✅ Server initialized. Running tests...\n');

  // Test 1: List tools
  sendRequest('tools/list');

  setTimeout(() => {
    // Test 2: Get pattern
    sendRequest('tools/call', {
      name: 'quint_get_pattern',
      arguments: { patternId: 'state-type-pattern' }
    });
  }, 500);

  setTimeout(() => {
    // Test 3: List templates
    sendRequest('tools/call', {
      name: 'quint_list_templates',
      arguments: {}
    });
  }, 1000);

  setTimeout(() => {
    // Test 4: Suggest framework
    sendRequest('tools/call', {
      name: 'quint_suggest_framework',
      arguments: { description: 'Build Raft consensus algorithm' }
    });
  }, 1500);

  setTimeout(() => {
    // Test 5: Hybrid search
    sendRequest('tools/call', {
      name: 'quint_hybrid_search',
      arguments: { query: 'mapby', scope: 'builtins', k: 5 }
    });
  }, 2000);

  setTimeout(() => {
    console.log('\n✅ All tests sent. Check responses above.\n');
    server.kill();
    process.exit(0);
  }, 3200);
}, 1000);

// Handle responses
rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    if (response.result) {
      console.log('📥 Response:', JSON.stringify(response.result, null, 2).substring(0, 500));
      console.log('');
    } else if (response.error) {
      console.error('❌ Error:', response.error);
    }
  } catch (err) {
    // Ignore non-JSON lines (like server startup messages)
  }
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});
