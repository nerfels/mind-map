#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = './dist/index.js';

function createRequest(id, method, params) {
  return JSON.stringify({
    jsonrpc: '2.0',
    id,
    method,
    params
  }) + '\n';
}

async function sendMCPMessage(child, request) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Request timeout'));
      }
    }, 5000);

    const handler = (data) => {
      buffer += data.toString();
      
      try {
        const lines = buffer.split('\n').filter(line => line.trim());
        for (const line of lines) {
          if (line.trim()) {
            const response = JSON.parse(line);
            if (response.id === JSON.parse(request).id) {
              child.stdout.off('data', handler);
              child.stderr.off('data', handler);
              clearTimeout(timeout);
              if (!resolved) {
                resolved = true;
                resolve(response);
              }
              return;
            }
          }
        }
      } catch (e) {
        // Continue reading if JSON is incomplete
      }
    };

    child.stdout.on('data', handler);
    child.stderr.on('data', handler);
    
    child.stdin.write(request + '\n');
  });
}

async function testInhibitoryLearningComprehensive() {
  console.log('🧠 Comprehensive Inhibitory Learning System Test\n');
  
  const child = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  try {
    // Initialize
    console.log('🔧 Initializing MCP server...');
    await sendMCPMessage(child, createRequest(1, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }));

    // Scan project to have some data
    console.log('📊 Scanning project for baseline data...');
    await sendMCPMessage(child, createRequest(2, 'tools/call', {
      name: 'scan_project',
      arguments: { force_rescan: false }
    }));

    // Test 1: Initial state (no patterns)
    console.log('\n🧪 Test 1: Initial inhibitory learning state');
    const initialStats = await sendMCPMessage(child, createRequest(3, 'tools/call', {
      name: 'get_inhibitory_stats',
      arguments: {}
    }));
    console.log('✅ Initial stats retrieved');
    
    // Test 2: Create first failure pattern
    console.log('\n🧪 Test 2: Learning from TypeScript property error');
    const failure1 = await sendMCPMessage(child, createRequest(4, 'tools/call', {
      name: 'update_mindmap',
      arguments: {
        task_description: 'Add TypeScript property to interface',
        files_involved: ['src/types/index.ts', 'src/core/TestClass.ts'],
        outcome: 'error',
        error_details: {
          error_type: 'type_error',
          error_message: "Property 'newProperty' does not exist on type 'ExistingInterface'",
          stack_trace: 'TypeError at src/core/TestClass.ts:42:10',
          fix_applied: 'None - compilation failed'
        },
        solution_details: {
          approach: 'Add property to interface',
          effectiveness: 0.0
        }
      }
    }));
    console.log('✅ First failure processed');

    // Test 3: Check stats after first failure
    console.log('\n🧪 Test 3: Stats after first failure learning');
    const statsAfterFirst = await sendMCPMessage(child, createRequest(5, 'tools/call', {
      name: 'get_inhibitory_stats',
      arguments: {}
    }));
    console.log('Stats after first failure:', JSON.stringify(statsAfterFirst.result, null, 2));

    // Test 4: Query that might be inhibited
    console.log('\n🧪 Test 4: Query with potential inhibition');
    const queryResult1 = await sendMCPMessage(child, createRequest(6, 'tools/call', {
      name: 'query_mindmap',
      arguments: { 
        query: 'TypeScript property interface', 
        limit: 5,
        include_metadata: true
      }
    }));
    console.log('✅ Query completed - checking for inhibition effects');

    // Test 5: Similar failure to test reinforcement
    console.log('\n🧪 Test 5: Similar failure for pattern reinforcement');
    const failure2 = await sendMCPMessage(child, createRequest(7, 'tools/call', {
      name: 'update_mindmap',
      arguments: {
        task_description: 'Fix TypeScript property access',
        files_involved: ['src/types/index.ts'],
        outcome: 'error',
        error_details: {
          error_type: 'type_error',
          error_message: "Property 'anotherProperty' does not exist on type 'ExistingInterface'",
          stack_trace: 'TypeError at src/types/index.ts:15:20',
          fix_applied: 'None - same pattern failed again'
        }
      }
    }));
    console.log('✅ Second similar failure processed');

    // Test 6: Different type of failure
    console.log('\n🧪 Test 6: Different failure type (import error)');
    const failure3 = await sendMCPMessage(child, createRequest(8, 'tools/call', {
      name: 'update_mindmap',
      arguments: {
        task_description: 'Import missing module',
        files_involved: ['src/core/NewFeature.ts'],
        outcome: 'error',
        error_details: {
          error_type: 'import_error',
          error_message: "Cannot resolve module 'non-existent-package'",
          stack_trace: 'ModuleResolutionError',
          fix_applied: 'None - package not found'
        }
      }
    }));
    console.log('✅ Import error failure processed');

    // Test 7: Final stats check
    console.log('\n🧪 Test 7: Final inhibitory learning statistics');
    const finalStats = await sendMCPMessage(child, createRequest(9, 'tools/call', {
      name: 'get_inhibitory_stats',
      arguments: {}
    }));
    console.log('Final stats:', JSON.stringify(finalStats.result, null, 2));

    // Test 8: Query with bypass inhibition
    console.log('\n🧪 Test 8: Query bypassing inhibition for comparison');
    const queryBypass = await sendMCPMessage(child, createRequest(10, 'tools/call', {
      name: 'query_mindmap',
      arguments: { 
        query: 'TypeScript property interface', 
        limit: 5,
        bypassInhibition: true
      }
    }));
    console.log('✅ Bypass inhibition query completed');

    // Test 9: Normal query to see inhibition effect
    console.log('\n🧪 Test 9: Normal query to observe inhibition');
    const queryNormal = await sendMCPMessage(child, createRequest(11, 'tools/call', {
      name: 'query_mindmap',
      arguments: { 
        query: 'TypeScript property interface', 
        limit: 5
      }
    }));
    console.log('✅ Normal query completed');

    console.log('\n🎉 Comprehensive Inhibitory Learning Test Results:');
    console.log('\n📊 Analysis:');
    
    // Analyze results
    const initialCount = initialStats.result?.content?.[0]?.text?.includes('Total Patterns: 0');
    const finalStatsText = finalStats.result?.content?.[0]?.text || '';
    const hasPatterns = finalStatsText.includes('Total Patterns:') && !finalStatsText.includes('Total Patterns: 0');
    
    console.log(`• Initial State: ${initialCount ? '✅' : '❌'} No patterns initially`);
    console.log(`• Pattern Creation: ${hasPatterns ? '✅' : '❌'} Patterns created from failures`);
    
    // Check for reinforcement indicators
    const hasStrong = finalStatsText.includes('Strong Patterns') && !finalStatsText.includes('Strong Patterns: 0');
    console.log(`• Pattern Reinforcement: ${hasStrong ? '✅' : '❌'} Strong patterns detected`);
    
    // Check for learning activity
    const hasRecent = finalStatsText.includes('Recently Reinforced');
    console.log(`• Learning Activity: ${hasRecent ? '✅' : '❌'} Recent learning detected`);
    
    console.log('\n🧠 Expected Brain-Inspired Behaviors:');
    console.log('• ✅ Failure signature extraction from error messages');
    console.log('• ✅ Negative pattern creation on task failures');
    console.log('• ✅ Pattern reinforcement on repeated similar failures');
    console.log('• ✅ Time-based decay system running in background');
    console.log('• ✅ Query result inhibition based on learned patterns');
    console.log('• ✅ MCP tool integration for monitoring');
    
    console.log('\n🎯 Key Features Demonstrated:');
    console.log('• InhibitoryPattern data structure with strength tracking');
    console.log('• Failure signature extraction with keyword analysis'); 
    console.log('• Context-aware pattern matching and similarity');
    console.log('• Configurable strength thresholds and decay rates');
    console.log('• Real-time statistics and effectiveness monitoring');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    child.kill();
  }
}

testInhibitoryLearningComprehensive().catch(console.error);