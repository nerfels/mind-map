#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, './dist/index.js');

console.log('🔒 Testing Input Validation and Security Fixes...\n');

// Test validation edge cases
const validationTests = [
  {
    name: 'Valid Query',
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'query_mindmap',
        arguments: {
          query: 'typescript files',
          limit: 5
        }
      }
    },
    expectError: false
  },
  {
    name: 'Empty Query (should fail)',
    request: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'query_mindmap',
        arguments: {
          query: '',
          limit: 5
        }
      }
    },
    expectError: true
  },
  {
    name: 'Query Too Long (should fail)',
    request: {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'query_mindmap',
        arguments: {
          query: 'a'.repeat(1001), // Exceeds 1000 char limit
          limit: 5
        }
      }
    },
    expectError: true
  },
  {
    name: 'Invalid Limit (should fail)',
    request: {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'query_mindmap',
        arguments: {
          query: 'test',
          limit: -1
        }
      }
    },
    expectError: true
  },
  {
    name: 'Invalid Type (should fail)',
    request: {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'query_mindmap',
        arguments: {
          query: 'test',
          type: 'invalid_type'
        }
      }
    },
    expectError: true
  },
  {
    name: 'Valid Update Task',
    request: {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'update_mindmap',
        arguments: {
          task_description: 'Fixed a bug in validation',
          files_involved: ['src/index.ts'],
          outcome: 'success'
        }
      }
    },
    expectError: false
  },
  {
    name: 'Invalid Outcome (should fail)',
    request: {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'update_mindmap',
        arguments: {
          task_description: 'Test task',
          outcome: 'invalid_outcome'
        }
      }
    },
    expectError: true
  }
];

function runValidationTests() {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    let currentTest = 0;
    let buffer = '';
    let passedTests = 0;
    let failedTests = 0;

    server.stdout.on('data', (data) => {
      buffer += data.toString();
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            const test = validationTests[currentTest - 1];
            
            if (!test) continue;
            
            const hasError = response.result?.isError === true || 
                            (response.result?.content?.[0]?.text?.includes('Error') === true);
            
            if (test.expectError === hasError) {
              console.log(`✅ ${test.name}: ${test.expectError ? 'Correctly rejected' : 'Accepted'}`);
              passedTests++;
            } else {
              console.log(`❌ ${test.name}: Expected ${test.expectError ? 'error' : 'success'}, got ${hasError ? 'error' : 'success'}`);
              if (response.result?.content?.[0]?.text) {
                console.log(`   Response: ${response.result.content[0].text.substring(0, 100)}...`);
              }
              failedTests++;
            }
            
            // Send next test
            if (currentTest < validationTests.length) {
              setTimeout(() => {
                sendNextTest();
              }, 100);
            } else {
              console.log(`\n📊 Test Results: ${passedTests} passed, ${failedTests} failed`);
              server.kill();
              resolve({ passed: passedTests, failed: failedTests });
            }
          } catch (error) {
            // Ignore non-JSON lines (server startup messages)
          }
        }
      }
    });

    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      reject(error);
    });

    server.on('exit', (code) => {
      if (code !== 0 && code !== null && currentTest < validationTests.length) {
        console.error(`❌ Server exited unexpectedly with code ${code}`);
        reject(new Error(`Server exited with code ${code}`));
      } else {
        resolve({ passed: passedTests, failed: failedTests });
      }
    });

    function sendNextTest() {
      if (currentTest < validationTests.length) {
        const test = validationTests[currentTest];
        console.log(`\n🧪 ${test.name}:`);
        server.stdin.write(JSON.stringify(test.request) + '\n');
        currentTest++;
      }
    }

    // Initialize and start tests
    setTimeout(() => {
      server.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'validation-test', version: '1.0.0' }
        }
      }) + '\n');
      
      setTimeout(() => {
        sendNextTest();
      }, 1000);
    }, 500);
  });
}

// Run validation tests
runValidationTests()
  .then((results) => {
    if (results.failed === 0) {
      console.log('\n🎉 All validation tests passed! Security fixes working correctly.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some validation tests failed. Review the output above.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n💥 Validation tests failed:', error);
    process.exit(1);
  });