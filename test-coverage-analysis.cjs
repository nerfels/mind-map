#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('=== Testing Test Coverage Analysis Tool ===\n');

const testAnalyzeTestCoverage = () => {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['dist/index.js'], {
      stdio: 'pipe',
      cwd: process.cwd()
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ output, errorOutput });
      } else {
        reject(new Error(`Process exited with code ${code}\nStderr: ${errorOutput}`));
      }
    });

    // Send the test request
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'analyze_test_coverage',
        arguments: {
          include_orphans: true,
          include_untested: true,
          min_confidence: 0.5,
          group_by: 'file'
        }
      }
    };

    child.stdin.write(JSON.stringify(request) + '\n');
    child.stdin.end();

    // Set timeout
    setTimeout(() => {
      child.kill();
      reject(new Error('Test timed out after 60 seconds'));
    }, 60000);
  });
};

async function runTest() {
  try {
    console.log('🧪 Testing analyze_test_coverage tool...');
    const result = await testAnalyzeTestCoverage();

    console.log('✅ Test completed successfully!');
    console.log('\n📋 Output:');
    console.log(result.output);

    if (result.errorOutput) {
      console.log('\n⚠️ Stderr:');
      console.log(result.errorOutput);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTest();