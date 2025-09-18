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

async function testInhibitoryLearning() {
  console.log('🧠 Testing Inhibitory Learning System...\n');
  
  const server = spawn('node', ['./dist/index.js'], { stdio: ['pipe', 'pipe', 'inherit'] });
  
  // Initialize
  server.stdin.write(createRequest(1, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0' }
  }));

  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('📊 Getting initial inhibitory learning stats...');
  server.stdin.write(createRequest(2, 'tools/call', {
    name: 'get_inhibitory_stats',
    arguments: {}
  }));

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('🔥 Simulating a task failure to create inhibitory patterns...');
  server.stdin.write(createRequest(3, 'tools/call', {
    name: 'update_mindmap',
    arguments: {
      task_description: 'Implement TypeScript property access',
      files_involved: ['src/test.ts', 'src/types.ts'],
      outcome: 'error',
      error_details: {
        error_type: 'type_error',
        error_message: "Property 'nonExistentProp' does not exist on type 'TestInterface'",
        stack_trace: 'TypeError: Property access failed',
        fix_applied: 'None - task failed'
      }
    }
  }));

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('📊 Getting stats after failure learning...');
  server.stdin.write(createRequest(4, 'tools/call', {
    name: 'get_inhibitory_stats',
    arguments: {}
  }));

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('🔍 Testing query with potential inhibition...');
  server.stdin.write(createRequest(5, 'tools/call', {
    name: 'query_mindmap',
    arguments: { 
      query: 'TypeScript property access implementation', 
      limit: 5 
    }
  }));

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('🔄 Simulating same failure again to test reinforcement...');
  server.stdin.write(createRequest(6, 'tools/call', {
    name: 'update_mindmap',
    arguments: {
      task_description: 'Fix TypeScript property access issue',
      files_involved: ['src/test.ts'],
      outcome: 'error',
      error_details: {
        error_type: 'type_error',
        error_message: "Property 'anotherMissingProp' does not exist on type 'TestInterface'",
        stack_trace: 'TypeError: Property access failed again',
        fix_applied: 'None - task failed again'
      }
    }
  }));

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('📊 Final inhibitory learning stats (should show reinforcement)...');
  server.stdin.write(createRequest(7, 'tools/call', {
    name: 'get_inhibitory_stats',
    arguments: {}
  }));

  await new Promise(resolve => setTimeout(resolve, 3000));
  
  server.kill();
  
  console.log('\n✅ Inhibitory learning test completed!');
  console.log('\nExpected Results:');
  console.log('• Initial: 0 inhibitory patterns');
  console.log('• After first failure: 1 pattern created with moderate strength');
  console.log('• Query: Some results potentially inhibited if patterns match');
  console.log('• After second failure: Pattern reinforced, higher strength');
  console.log('• Final: 1-2 patterns with improved learning effectiveness');
}

testInhibitoryLearning().catch(console.error);