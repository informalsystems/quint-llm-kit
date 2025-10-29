#!/usr/bin/env node

import { smartSearch, searchByTopic, listTopics, formatSearchResults } from '../dist/tools/enhanced-search.js';

console.log('='.repeat(60));
console.log('Testing Enhanced Documentation Search');
console.log('='.repeat(60));

// Test 1: Keyword search
console.log('\n1. Searching for "state machine"...\n');
const result1 = smartSearch('state machine', { limit: 5 });
console.log(formatSearchResults(result1));

// Test 2: Topic search
console.log('\n' + '='.repeat(60));
console.log('\n2. Searching by topic "testing"...\n');
const result2 = searchByTopic('testing', 5);
console.log(formatSearchResults(result2));

// Test 3: Available topics
console.log('\n' + '='.repeat(60));
console.log('\n3. Available topics:\n');
const topics = listTopics();
topics.slice(0, 15).forEach(topic => console.log(`  - ${topic}`));

// Test 4: Operator search
console.log('\n' + '='.repeat(60));
console.log('\n4. Searching for "temporal operator"...\n');
const result4 = smartSearch('temporal operator', { limit: 5 });
console.log(formatSearchResults(result4));

console.log('\n' + '='.repeat(60));
console.log('Tests complete!');
console.log('='.repeat(60));
