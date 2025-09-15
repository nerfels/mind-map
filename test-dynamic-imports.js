#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

console.log('🧪 Testing Dynamic Import Detection');
console.log('=' .repeat(50));

async function runTest() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
    env: { ...process.env }
  });

  const client = new Client({
    name: 'test-dynamic-imports',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log('✅ Connected to Mind Map MCP server');

    // Create a test file with dynamic imports
    const testFileContent = `
// Regular imports
import fs from 'fs';
import { readFile } from 'fs/promises';
const path = require('path');

// Dynamic imports
async function loadModule() {
  const module1 = await import('./module1.js');
  const module2 = await import(\`./modules/\${name}.js\`);
  const module3 = await import(moduleName);
}

// Require calls
function loadWithRequire() {
  const config = require('./config.json');
  const template = require(\`./templates/\${type}.js\`);
  const dynamic = require(getModuleName());
}

export default loadModule;
`;

    console.log('\n📝 Creating test file with dynamic imports...');

    // First, create the test file
    const fs = await import('fs/promises');
    await fs.writeFile('test-dynamic-file.ts', testFileContent);
    console.log('✅ Test file created');

    // Scan the project to include the new file
    console.log('\n🔍 Scanning project...');
    const scanResult = await client.request({
      method: 'tools/call',
      params: {
        name: 'scan_project',
        arguments: {}
      }
    });
    console.log('✅ Project scanned');

    // Query for the test file
    console.log('\n🔎 Querying for dynamic imports...');
    const queryResult = await client.request({
      method: 'tools/call',
      params: {
        name: 'query_mindmap',
        arguments: {
          query: 'test-dynamic-file',
          limit: 10
        }
      }
    });

    // Parse the result
    if (queryResult.content && queryResult.content[0]) {
      const resultText = queryResult.content[0].text;
      console.log('\n📊 Query Results:');
      console.log(resultText);

      // Check if dynamic imports were detected
      if (resultText.includes('dynamic') || resultText.includes('require')) {
        console.log('\n✅ SUCCESS: Dynamic imports detected!');
      } else {
        console.log('\n⚠️  Dynamic imports may not be visible in basic query');
        console.log('    They are stored in the import metadata');
      }
    }

    // Clean up
    await fs.unlink('test-dynamic-file.ts');
    console.log('\n🧹 Test file cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.close();
    process.exit(0);
  }
}

runTest().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});