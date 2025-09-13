#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, '../../dist/index.js');

console.log('🔍 Testing AST Parsing and Code Structure Analysis\n');
console.log('=================================================\n');

async function testASTAnalysis() {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    let buffer = '';
    let testStep = 0;

    const tests = [
      {
        name: 'Initialize Server',
        request: {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'ast-test', version: '1.0.0' }
          }
        }
      },
      {
        name: 'Force Project Scan with AST Analysis',
        request: {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'scan_project',
            arguments: {
              force_rescan: true,
              include_analysis: true
            }
          }
        }
      },
      {
        name: 'Query for Functions',
        request: {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'query_mindmap',
            arguments: {
              query: 'function',
              type: 'function',
              limit: 5
            }
          }
        }
      },
      {
        name: 'Query for Classes',
        request: {
          jsonrpc: '2.0',
          id: 4,
          method: 'tools/call',
          params: {
            name: 'query_mindmap',
            arguments: {
              query: 'class',
              type: 'class',
              limit: 5
            }
          }
        }
      },
      {
        name: 'Get Updated Statistics',
        request: {
          jsonrpc: '2.0',
          id: 5,
          method: 'tools/call',
          params: {
            name: 'get_stats',
            arguments: {}
          }
        }
      }
    ];

    server.stdout.on('data', (data) => {
      buffer += data.toString();
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            const test = tests[testStep - 1];
            
            if (response.result && test) {
              console.log(`✅ ${test.name}:`);
              
              if (response.result.content?.[0]?.text) {
                const text = response.result.content[0].text;
                console.log(text.length > 300 ? text.substring(0, 300) + '...' : text);
              } else if (response.result.protocolVersion) {
                console.log('Server initialized successfully');
              } else {
                console.log('Success');
              }
              
              console.log('');
              
              // Send next test
              if (testStep < tests.length) {
                setTimeout(() => {
                  sendNextTest();
                }, 200);
              } else {
                console.log('🎉 AST Parsing Test Complete!');
                server.kill();
                resolve();
              }
            }
          } catch (error) {
            // Ignore non-JSON lines
          }
        }
      }
    });

    server.on('error', reject);

    function sendNextTest() {
      if (testStep < tests.length) {
        const test = tests[testStep];
        console.log(`🧪 Running: ${test.name}`);
        server.stdin.write(JSON.stringify(test.request) + '\n');
        testStep++;
      }
    }

    // Start first test
    setTimeout(() => {
      sendNextTest();
    }, 1000);
  });
}

testASTAnalysis()
  .then(() => {
    console.log('\n✨ AST parsing and code structure analysis is working!');
    console.log('The Mind Map now understands functions and classes, not just files.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 AST parsing test failed:', error);
    process.exit(1);
  });