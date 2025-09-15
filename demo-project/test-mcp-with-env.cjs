#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🧪 Testing MCP Server with Demo Project Environment Variable');
console.log('=' .repeat(60));

const DEMO_PROJECT_PATH = path.resolve(__dirname);
const MCP_SERVER_PATH = path.resolve(__dirname, '..', 'dist', 'index.js');

console.log('📁 Demo project path:', DEMO_PROJECT_PATH);
console.log('🖥️  MCP server path:', MCP_SERVER_PATH);
console.log('📊 Files in demo project:', fs.readdirSync(DEMO_PROJECT_PATH).filter(f => !f.startsWith('.')).length);

// Function to send MCP request to the server
function sendMCPRequest(proc, method, params = {}) {
  const request = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: method,
    params: params
  };

  console.log(`\n📤 Sending request: ${method}`);
  proc.stdin.write(JSON.stringify(request) + '\n');
}

// Function to start MCP server with environment variable
function startMCPServer() {
  console.log('\n🚀 Starting MCP server with MCP_PROJECT_ROOT environment variable...');

  const env = {
    ...process.env,
    MCP_PROJECT_ROOT: DEMO_PROJECT_PATH
  };

  console.log('🌍 Environment variable set:', { MCP_PROJECT_ROOT: DEMO_PROJECT_PATH });

  const proc = spawn('node', [MCP_SERVER_PATH], {
    env: env,
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: DEMO_PROJECT_PATH // Run from demo project directory
  });

  let buffer = '';

  proc.stdout.on('data', (data) => {
    buffer += data.toString();

    // Try to parse complete JSON-RPC responses
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    lines.forEach(line => {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          console.log('\n📥 Response received:');

          if (response.result && response.result.content) {
            // Handle scan_project response
            const content = response.result.content[0];
            if (content && content.text) {
              console.log(content.text);

              // Check if it scanned the right number of files
              const match = content.text.match(/Scanned (\d+) files/);
              if (match) {
                const filesScanned = parseInt(match[1]);
                if (filesScanned < 20) {
                  console.log('✅ SUCCESS: Scanned demo project files only!');
                } else {
                  console.log('❌ FAILED: Still scanning main project files');
                }
              }
            }
          } else if (response.result && response.result.tools) {
            console.log(`Found ${response.result.tools.length} tools`);
          }
        } catch (e) {
          // Not a complete JSON response yet
        }
      }
    });
  });

  proc.stderr.on('data', (data) => {
    const output = data.toString();

    // Look for our debug messages
    if (output.includes('🎯') || output.includes('📁') || output.includes('🖥️') || output.includes('🌍')) {
      console.log('\n🔍 Debug output from MCP server:');
      console.log(output);
    } else if (output.includes('Starting project scan')) {
      console.log('📋 Server log:', output.trim());
    }
  });

  proc.on('close', (code) => {
    console.log(`\n🛑 MCP server exited with code ${code}`);
  });

  return proc;
}

// Main test function
async function runTest() {
  const proc = startMCPServer();

  // Wait a bit for server to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Send list tools request first
  sendMCPRequest(proc, 'tools/list');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Send scan_project request
  sendMCPRequest(proc, 'tools/call', {
    name: 'scan_project',
    arguments: {
      force_rescan: true,
      include_analysis: true
    }
  });

  // Wait for scan to complete
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Check if .mindmap-cache was created in demo project
  const cacheDir = path.join(DEMO_PROJECT_PATH, '.mindmap-cache');
  if (fs.existsSync(cacheDir)) {
    console.log('\n✅ SUCCESS: .mindmap-cache created in demo project!');
    console.log('Cache files:', fs.readdirSync(cacheDir));
  } else {
    console.log('\n❌ FAILED: .mindmap-cache not created in demo project');

    // Check if it was created in parent directory
    const parentCache = path.join(DEMO_PROJECT_PATH, '..', '.mindmap-cache');
    if (fs.existsSync(parentCache)) {
      console.log('⚠️  Cache found in parent directory instead');
    }
  }

  // Clean up
  console.log('\n🧹 Cleaning up...');
  proc.kill();

  // Wait for process to exit
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n✅ Test complete!');
}

// Run the test
runTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});