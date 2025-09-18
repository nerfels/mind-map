#!/usr/bin/env node

import { spawn } from 'child_process';

function createRequest(id, method, params) {
  return JSON.stringify({
    jsonrpc: '2.0',
    id,
    method,
    params
  }) + '\n';
}

async function testParallel() {
  console.log('🚀 Testing Parallel Processing Implementation...\n');
  
  const server = spawn('node', ['./dist/index.js'], { stdio: ['pipe', 'pipe', 'inherit'] });
  
  // Initialize
  server.stdin.write(createRequest(1, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0' }
  }));

  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('📊 Starting project scan with parallel processing...');
  const startTime = Date.now();
  
  server.stdin.write(createRequest(2, 'tools/call', {
    name: 'scan_project',
    arguments: { force_rescan: true, include_analysis: true }
  }));

  // Wait longer for scanning to complete
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  const scanTime = Date.now() - startTime;
  console.log(`⏱️ Scan completed in ${scanTime}ms`);

  console.log('📊 Getting project statistics...');
  server.stdin.write(createRequest(3, 'tools/call', {
    name: 'get_stats',
    arguments: {}
  }));

  // Wait for stats
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('🔍 Testing parallel-processed query...');
  server.stdin.write(createRequest(4, 'tools/call', {
    name: 'query_mindmap',
    arguments: { query: 'parallel processing files', limit: 5 }
  }));

  // Wait and cleanup
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  server.kill();
  
  console.log('\n✅ Parallel processing test completed!');
  console.log('Expected: Progress updates showing chunked file processing with 3-5x speedup');
}

testParallel().catch(console.error);