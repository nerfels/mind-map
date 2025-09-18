#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🔧 Testing Configuration Relationship Tracking...\n');

// Test configuration analysis
function testConfigurationAnalysis() {
  return new Promise((resolve, reject) => {
    console.log('📋 Testing: analyze_configuration_relationships');

    const mcpProcess = spawn('node', ['./dist/index.js'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    mcpProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    mcpProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    mcpProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Process failed with code:', code);
        console.error('Error output:', errorOutput);
        reject(new Error(`Process exited with code ${code}`));
        return;
      }

      // Parse MCP responses
      const lines = output.split('\n').filter(line => line.trim());
      const responses = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'response') {
            responses.push(parsed);
          }
        } catch (e) {
          // Skip non-JSON lines
        }
      }

      if (responses.length > 0) {
        const lastResponse = responses[responses.length - 1];
        if (lastResponse.body && lastResponse.body.content) {
          const content = lastResponse.body.content[0];
          if (content.type === 'text') {
            console.log('✅ Configuration Analysis Response:');
            console.log(content.text);
            resolve();
          } else {
            reject(new Error('Unexpected response format'));
          }
        } else {
          reject(new Error('No content in response'));
        }
      } else {
        reject(new Error('No valid responses received'));
      }
    });

    // Send MCP requests
    const requests = [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'analyze_configuration_relationships',
          arguments: {
            include_recommendations: true,
            min_confidence: 0.5
          }
        }
      }
    ];

    for (const request of requests) {
      mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    }

    mcpProcess.stdin.end();
  });
}

// Test configuration analysis with filters
function testConfigurationAnalysisWithFilters() {
  return new Promise((resolve, reject) => {
    console.log('\n📋 Testing: analyze_configuration_relationships with filters');

    const mcpProcess = spawn('node', ['./dist/index.js'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    mcpProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    mcpProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    mcpProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Process failed with code:', code);
        console.error('Error output:', errorOutput);
        reject(new Error(`Process exited with code ${code}`));
        return;
      }

      // Parse MCP responses
      const lines = output.split('\n').filter(line => line.trim());
      const responses = [];

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'response') {
            responses.push(parsed);
          }
        } catch (e) {
          // Skip non-JSON lines
        }
      }

      if (responses.length > 0) {
        const lastResponse = responses[responses.length - 1];
        if (lastResponse.body && lastResponse.body.content) {
          const content = lastResponse.body.content[0];
          if (content.type === 'text') {
            console.log('✅ Filtered Configuration Analysis Response:');
            console.log(content.text);
            resolve();
          } else {
            reject(new Error('Unexpected response format'));
          }
        } else {
          reject(new Error('No content in response'));
        }
      } else {
        reject(new Error('No valid responses received'));
      }
    });

    // Send MCP requests with package and build type filters
    const requests = [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      },
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'analyze_configuration_relationships',
          arguments: {
            include_recommendations: true,
            min_confidence: 0.8,
            config_types: ['package', 'build']
          }
        }
      }
    ];

    for (const request of requests) {
      mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    }

    mcpProcess.stdin.end();
  });
}

// Run tests
async function runTests() {
  try {
    await testConfigurationAnalysis();
    await testConfigurationAnalysisWithFilters();
    console.log('\n🎉 All configuration tracking tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();