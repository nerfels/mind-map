#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🔧 Testing Fix Suggestion System\n');
console.log('='.repeat(50));

const tests = [
  {
    name: 'Import Error - Module Not Found',
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'suggest_fixes',
        arguments: {
          error_message: 'Cannot resolve module @types/node',
          error_type: 'import',
          file_path: 'src/index.ts',
          limit: 3
        }
      }
    }
  },
  {
    name: 'Type Error - Property Does Not Exist',
    request: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'suggest_fixes',
        arguments: {
          error_message: 'Property handleSuggestFixes does not exist on type MindMapMCPServer',
          error_type: 'type',
          file_path: 'src/index.ts',
          function_name: 'handleToolCall',
          limit: 3
        }
      }
    }
  },
  {
    name: 'Runtime Error - Undefined Reference',
    request: {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'suggest_fixes',
        arguments: {
          error_message: 'Cannot read property of undefined',
          error_type: 'runtime',
          file_path: 'src/core/MindMapEngine.ts',
          function_name: 'suggestFixes',
          line_number: 42,
          limit: 3
        }
      }
    }
  },
  {
    name: 'Auto-Detect Error Type',
    request: {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'suggest_fixes',
        arguments: {
          error_message: 'Unexpected token } in JSON',
          file_path: 'package.json',
          limit: 2
        }
      }
    }
  },
  {
    name: 'Historical Fix (Import Error with History)',
    request: {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'suggest_fixes',
        arguments: {
          error_message: 'Cannot resolve module path',
          error_type: 'import',
          file_path: 'src/core/MindMapEngine.ts',
          limit: 5
        }
      }
    }
  }
];

let currentTestIndex = 0;

function runTest() {
  if (currentTestIndex >= tests.length) {
    console.log('\n🎉 Fix Suggestion System Test Complete!\n');
    console.log('✨ The Mind Map MCP can now provide intelligent fix suggestions!');
    process.exit(0);
  }

  const test = tests[currentTestIndex];
  console.log(`\n🧪 Running: ${test.name}`);

  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  let hasResult = false;

  serverProcess.stdout.on('data', (data) => {
    output += data.toString();
    
    // Look for JSON response
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.trim() && line.includes('"jsonrpc"')) {
        if (!hasResult) {
          hasResult = true;
          try {
            const result = JSON.parse(line);
            if (result.error) {
              console.log(`❌ ${test.name}:`);
              console.log(`Error: ${result.error.message}\n`);
            } else if (result.result && result.result.content) {
              console.log(`✅ ${test.name}:`);
              console.log(result.result.content[0].text + '\n');
            }
          } catch (e) {
            console.log(`⚠️ Parse error for ${test.name}: ${e.message}`);
          }
          
          setTimeout(() => {
            serverProcess.kill();
            currentTestIndex++;
            runTest();
          }, 100);
        }
      }
    }
  });

  serverProcess.stderr.on('data', (data) => {
    // Ignore server startup messages
    const message = data.toString();
    if (!message.includes('Mind Map MCP Server started')) {
      console.log(`Server stderr: ${message}`);
    }
  });

  // Send the request
  setTimeout(() => {
    serverProcess.stdin.write(JSON.stringify(test.request) + '\n');
  }, 1000);

  // Timeout fallback
  setTimeout(() => {
    if (!hasResult) {
      console.log(`⏱️ Timeout for ${test.name}`);
      serverProcess.kill();
      currentTestIndex++;
      runTest();
    }
  }, 5000);
}

// Start testing
runTest();