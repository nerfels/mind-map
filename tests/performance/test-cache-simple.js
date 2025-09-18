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

async function testCache() {
  console.log('🚀 Testing Cache Implementation...\n');
  
  const server = spawn('node', ['./dist/index.js'], { stdio: ['pipe', 'pipe', 'inherit'] });
  
  // Initialize
  server.stdin.write(createRequest(1, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0' }
  }));

  // Wait a bit for initialization
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Get cache stats (initial)
  console.log('📊 Getting initial cache stats...');
  server.stdin.write(createRequest(2, 'tools/call', {
    name: 'get_cache_stats',
    arguments: {}
  }));

  // Wait and then perform query
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('🔍 Performing first query...');
  server.stdin.write(createRequest(3, 'tools/call', {
    name: 'query_mindmap',
    arguments: { query: 'TypeScript', limit: 3 }
  }));

  // Wait and then perform same query again
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('🔍 Performing same query again (should be cached)...');
  server.stdin.write(createRequest(4, 'tools/call', {
    name: 'query_mindmap',
    arguments: { query: 'TypeScript', limit: 3 }
  }));

  // Wait and get final cache stats
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('📊 Getting final cache stats...');
  server.stdin.write(createRequest(5, 'tools/call', {
    name: 'get_cache_stats', 
    arguments: {}
  }));

  // Wait and then cleanup
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  server.kill();
  
  console.log('\n✅ Cache test completed! Check the output above for cache hit/miss messages.');
  console.log('Expected: Second query should show "Cache hit for query: TypeScript"');
}

testCache().catch(console.error);