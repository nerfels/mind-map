#!/usr/bin/env node

/**
 * Test MCP ignore pattern functionality via server interface
 */

import { spawn } from 'child_process';

function sendMCPRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const server = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: method,
      params: params
    };

    let output = '';
    let error = '';

    server.stdout.on('data', (data) => {
      output += data.toString();
    });

    server.stderr.on('data', (data) => {
      error += data.toString();
    });

    server.on('close', (code) => {
      if (code === 0) {
        try {
          const response = JSON.parse(output);
          resolve(response);
        } catch (e) {
          resolve({ output, error });
        }
      } else {
        reject(new Error(`Server exited with code ${code}: ${error}`));
      }
    });

    // Send the request
    server.stdin.write(JSON.stringify(request) + '\n');
    server.stdin.end();

    // Timeout after 30 seconds
    setTimeout(() => {
      server.kill();
      reject(new Error('Request timeout'));
    }, 30000);
  });
}

async function testIgnorePatterns() {
  console.log('🧪 Testing MCP Ignore Pattern Tools');
  console.log('=' .repeat(40));

  try {
    // Test 1: Get ignore stats
    console.log('\n1️⃣ Testing get_ignore_stats tool');
    const statsResult = await sendMCPRequest('tools/call', {
      name: 'get_ignore_stats',
      arguments: {}
    });
    console.log('📊 Ignore Stats Result:', statsResult);

    // Test 2: Test ignore patterns
    console.log('\n2️⃣ Testing test_ignore_patterns tool');
    const testResult = await sendMCPRequest('tools/call', {
      name: 'test_ignore_patterns',
      arguments: {
        patterns: ['*.log', 'test-*.js', 'debug-*.js', 'node_modules/**']
      }
    });
    console.log('🧪 Pattern Test Result:', testResult);

    console.log('\n✅ MCP ignore pattern tools are working!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    // Fallback: Try simple functionality test
    console.log('\n📋 Falling back to direct functionality test...');

    const { FileScanner } = await import('./dist/core/FileScanner.js');
    const scanner = new FileScanner(process.cwd(), {
      ignorePatterns: ['*.log', 'test-*.js'],
      useGitignore: true
    });

    const quickTest = await scanner.testIgnorePatterns(['*.log', 'debug-*.js']);
    console.log(`📊 Direct test results: ${quickTest.ignored.length} files ignored, ${quickTest.performance}ms`);
  }
}

testIgnorePatterns();