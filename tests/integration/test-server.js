#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, '../../dist/index.js');

console.log('🧠 Testing Mind Map MCP Server...\n');

// Test requests to send to the server
const testRequests = [
  {
    name: 'Initialize',
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    }
  },
  {
    name: 'List Tools',
    request: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    }
  },
  {
    name: 'Scan Project',
    request: {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'scan_project',
        arguments: {
          force_rescan: false,
          include_analysis: true
        }
      }
    }
  },
  {
    name: 'Get Stats',
    request: {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'get_stats',
        arguments: {}
      }
    }
  },
  {
    name: 'Query TypeScript Files',
    request: {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'query_mindmap',
        arguments: {
          query: 'typescript',
          type: 'file',
          limit: 5
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
      
      // Process complete JSON-RPC messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            console.log(`✅ ${testRequests[currentTest - 1]?.name || 'Response'}:`, 
              JSON.stringify(response, null, 2));
            
            // Send next test
            if (currentTest < testRequests.length) {
              setTimeout(() => {
                sendNextTest();
              }, 100);
            } else {
              console.log('\n🎉 All tests completed successfully!');
              server.kill();
              resolve();
            }
          } catch (error) {
            console.log('📝 Server output:', line);
          }
        }
      }
    });

    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      reject(error);
    });

    server.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`❌ Server exited with code ${code}`);
        reject(new Error(`Server exited with code ${code}`));
      } else {
        resolve();
      }
    });

    function sendNextTest() {
      if (currentTest < testRequests.length) {
        const test = testRequests[currentTest];
        console.log(`\n🧪 Running test: ${test.name}`);
        server.stdin.write(JSON.stringify(test.request) + '\n');
        currentTest++;
      }
    }

    // Start the first test after a short delay
    setTimeout(() => {
      sendNextTest();
    }, 1000);
  });
}

// Run the test
runTest()
  .then(() => {
    console.log('\n✨ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });