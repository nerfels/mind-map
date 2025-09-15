#!/usr/bin/env node

import { spawn } from 'child_process';

async function testQuery(query, description) {
  console.log(`\n=== Testing: ${description} ===`);
  console.log(`Query: "${query}"`);

  return new Promise((resolve) => {
    const child = spawn('node', ['-e', `
      const mindMap = require('./dist/index.js');

      setTimeout(async () => {
        try {
          console.log('\\n--- Raw query result ---');
          const result = await mindMap.queryMindMap({
            query: "${query}",
            limit: 10,
            include_metadata: true
          });
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          console.error('Error:', error.message);
        }
        process.exit(0);
      }, 2000);
    `], { stdio: 'inherit' });

    child.on('exit', () => {
      resolve();
    });
  });
}

async function runTests() {
  console.log('🔍 Testing query matching issues...\n');

  // Test exact file path queries
  await testQuery('src/core/MindMapEngine.ts', 'Exact file path');
  await testQuery('MindMapEngine.ts', 'File name only');
  await testQuery('/src/core/MindMapEngine.ts', 'Absolute-style path');

  // Test function name queries
  await testQuery('queryMindMap', 'Exact function name');
  await testQuery('query_mindmap', 'Snake case function name');

  // Test partial matches
  await testQuery('MindMap', 'Partial class name');
  await testQuery('Engine', 'Partial file name');

  console.log('\n✅ Query tests completed');
}

runTests().catch(console.error);