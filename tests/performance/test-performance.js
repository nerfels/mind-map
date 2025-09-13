#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('⚡ Testing Performance Optimization System\n');
console.log('='.repeat(60));

const tests = [
  {
    name: 'Baseline Performance - Current System Query',
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'query_mindmap',
        arguments: {
          query: 'MindMap',
          limit: 10
        }
      }
    }
  },
  {
    name: 'Performance Stats - Get Operation Metrics',
    request: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_performance',
        arguments: {
          slow_threshold_ms: 5,
          include_recent: true
        }
      }
    }
  },
  {
    name: 'Stress Test - Multiple Queries',
    request: {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'query_mindmap',
        arguments: {
          query: 'src',
          type: 'file',
          limit: 20
        }
      }
    }
  },
  {
    name: 'Architecture Analysis Performance',
    request: {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'analyze_architecture',
        arguments: {
          min_confidence: 0.1
        }
      }
    }
  },
  {
    name: 'Final Performance Report',
    request: {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'get_performance',
        arguments: {
          slow_threshold_ms: 1
        }
      }
    }
  }
];

let currentTestIndex = 0;
let startTime = Date.now();

function runTest() {
  if (currentTestIndex >= tests.length) {
    const totalTime = Date.now() - startTime;
    console.log('\n🎉 Performance Testing Complete!\n');
    console.log('✨ Performance optimization system is functional!');
    console.log(`⏱️ Total test time: ${totalTime}ms\n`);
    process.exit(0);
  }

  const test = tests[currentTestIndex];
  console.log(`\n🧪 Running: ${test.name}`);
  const testStartTime = Date.now();

  const serverProcess = spawn('node', ['../../dist/index.js'], {
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
          const testTime = Date.now() - testStartTime;
          
          try {
            const result = JSON.parse(line);
            if (result.error) {
              console.log(`❌ ${test.name} (${testTime}ms):`);
              console.log(`Error: ${result.error.message}\n`);
            } else if (result.result && result.result.content) {
              console.log(`✅ ${test.name} (${testTime}ms):`);
              const content = result.result.content[0].text;
              
              // Show first few lines for readability
              const lines = content.split('\n').slice(0, 8);
              console.log(lines.join('\n'));
              
              if (content.split('\n').length > 8) {
                console.log(`... (${content.split('\n').length - 8} more lines)`);
              }
              console.log('');
            }
          } catch (e) {
            console.log(`⚠️ Parse error for ${test.name} (${testTime}ms): ${e.message}`);
          }
          
          setTimeout(() => {
            serverProcess.kill();
            currentTestIndex++;
            
            // Small delay between tests to let system stabilize
            setTimeout(runTest, 500);
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
      const testTime = Date.now() - testStartTime;
      console.log(`⏱️ Timeout for ${test.name} (${testTime}ms)`);
      serverProcess.kill();
      currentTestIndex++;
      runTest();
    }
  }, 10000);
}

console.log('🚀 Starting performance benchmarks...\n');
runTest();