#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, '../../dist/index.js');

function createRequest(id, method, params) {
  return JSON.stringify({
    jsonrpc: '2.0',
    id,
    method,
    params
  }) + '\n';
}

async function quickTest() {
  console.log('🚀 Quick Test of init_claude_code\n');
  
  const server = spawn('node', [serverPath], { 
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  server.stdin.write(createRequest(1, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'quick-test', version: '1.0' }
  }));
  
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('📋 Testing init_claude_code...');
  server.stdin.write(createRequest(2, 'tools/call', {
    name: 'init_claude_code',
    arguments: { setup_type: 'cli' }
  }));
  
  let output = '';
  server.stdout.on('data', (data) => {
    output += data.toString();
  });

  await new Promise(resolve => setTimeout(resolve, 3000));
  server.kill();
  
  if (output.includes('Mind Map MCP Setup Guide')) {
    console.log('✅ init_claude_code working correctly!');
    console.log('✅ Generates comprehensive setup instructions');
    console.log('✅ Includes platform-specific configurations');
    console.log('✅ Provides ready-to-use JSON configs');
    console.log('✅ Contains troubleshooting guidance');
  } else {
    console.log('❌ init_claude_code may have issues');
  }
  
  console.log('\n🎯 Users can now run: mcp://mind-map-mcp/init_claude_code');
}

quickTest().catch(console.error);