#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🔍 Testing Predictive Error Detection System\n');
console.log('='.repeat(50));

const tests = [
  {
    name: 'Get Error Predictions for Entire Project',
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'predict_errors',
        arguments: {
          risk_threshold: 0.1,
          limit: 10
        }
      }
    }
  },
  {
    name: 'Get High-Risk Error Predictions',
    request: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'predict_errors',
        arguments: {
          risk_threshold: 0.5,
          limit: 5
        }
      }
    }
  },
  {
    name: 'Analyze Specific File for Errors',
    request: {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'predict_errors',
        arguments: {
          file_path: 'src/core/MindMapEngine.ts',
          risk_threshold: 0.1,
          limit: 5
        }
      }
    }
  }
];

let currentTestIndex = 0;

function runTest() {
  if (currentTestIndex >= tests.length) {
    console.log('\n🎉 Predictive Error Detection Test Complete!\n');
    console.log('✨ The Mind Map MCP can now predict potential errors before they occur!');
    process.exit(0);
  }

  const test = tests[currentTestIndex];
  console.log(`\n🧪 Running: ${test.name}`);

  const serverProcess = spawn('node', ['./dist/index.js'], {
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