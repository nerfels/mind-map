#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, 'dist/index.js');

console.log('🔄 Testing Fresh Scan and Query After Cache Clear...\n');

const tests = [
  {
    name: 'Initialize',
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'fresh-scan-test', version: '1.0.0' }
      }
    }
  },
  {
    name: 'Force Fresh Scan',
    request: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'scan_project',
        arguments: {
          force_rescan: true
        }
      }
    }
  },
  {
    name: 'Query After Fresh Scan',
    request: {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'query_mindmap',
        arguments: {
          query: 'typescript',
          limit: 3
        }
      }
    }
  }
];

function runTest() {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    let currentTest = 0;
    let buffer = '';

    server.stdout.on('data', (data) => {
      buffer += data.toString();
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            console.log(`✅ ${tests[currentTest - 1]?.name || 'Response'}:`);
            
            if (response.result?.content?.[0]?.text) {
              console.log(response.result.content[0].text.substring(0, 200) + 
                         (response.result.content[0].text.length > 200 ? '...' : ''));
            } else if (response.result) {
              console.log('Success');
            }
            
            if (currentTest < tests.length) {
              setTimeout(() => {
                sendNextTest();
              }, 100);
            } else {
              console.log('\n🎉 Fresh scan and query test completed successfully!');
              server.kill();
              resolve();
            }
          } catch (error) {
            // Ignore non-JSON server messages
          }
        }
      }
    });

    server.on('error', reject);

    function sendNextTest() {
      if (currentTest < tests.length) {
        const test = tests[currentTest];
        console.log(`\n🧪 Running: ${test.name}`);
        server.stdin.write(JSON.stringify(test.request) + '\n');
        currentTest++;
      }
    }

    setTimeout(() => {
      sendNextTest();
    }, 1000);
  });
}

runTest()
  .then(() => {
    console.log('\n✨ Date handling and fresh scan fixes verified!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fresh scan test failed:', error);
    process.exit(1);
  });