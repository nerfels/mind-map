#!/usr/bin/env node
/**
 * Test activation spreading functionality
 */

import { spawn } from 'child_process';

const server = spawn('node', ['./dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  cwd: process.cwd().replace('/tests/brain-inspired', '')
});

let responseId = 1;

function sendRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const request = {
      jsonrpc: '2.0',
      id: responseId++,
      method,
      params
    };

    const messageData = JSON.stringify(request) + '\n';
    server.stdin.write(messageData);

    const timeout = setTimeout(() => {
      reject(new Error(`Request timeout for ${method}`));
    }, 10000);

    function handleData(data) {
      clearTimeout(timeout);
      server.stdout.removeListener('data', handleData);
      
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          if (response.id === request.id) {
            resolve(response);
            return;
          }
        } catch (e) {
          // Ignore non-JSON lines
        }
      }
    }

    server.stdout.on('data', handleData);
  });
}

async function runTest() {
  console.log('🧠 Testing Activation Spreading System...\n');

  try {
    // Initialize server
    console.log('🧪 Running test: Initialize server');
    await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'test-client', version: '1.0.0' }
    });
    console.log('✅ Server initialized\n');

    // Scan project first
    console.log('🧪 Running test: Scan project');
    const scanResult = await sendRequest('tools/call', {
      name: 'scan_project',
      arguments: { force_rescan: true }
    });
    console.log('✅ Project scanned:', scanResult.result.content[0].text.split('\n')[0]);

    // Get stats before activation test
    console.log('\n🧪 Running test: Get statistics');
    const statsResult = await sendRequest('tools/call', {
      name: 'get_stats',
      arguments: {}
    });
    console.log('✅ Statistics:', statsResult.result.content[0].text.split('\n').slice(0, 5).join(', '));

    // Test activation spreading with different queries
    console.log('\n🧪 Running test: Activation spreading query (default enabled)');
    const activationResult = await sendRequest('tools/call', {
      name: 'query_mindmap',
      arguments: {
        query: 'mind map engine core functionality',
        limit: 5,
        include_metadata: true
      }
    });
    
    console.log('✅ Activation query result:');
    const activationText = activationResult.result.content[0].text;
    console.log('   ' + activationText.split('\n').slice(0, 8).join('\n   '));
    
    // Check if activation was used
    if (activationText.includes('Activation query')) {
      console.log('🧠 SUCCESS: Activation spreading was used!');
    } else {
      console.log('⚠️  WARNING: Activation spreading may not have been used');
    }

    // Test linear query for comparison
    console.log('\n🧪 Running test: Linear query (activation disabled)');
    const linearResult = await sendRequest('tools/call', {
      name: 'query_mindmap', 
      arguments: {
        query: 'mind map engine core functionality',
        limit: 5,
        include_metadata: true,
        use_activation: false
      }
    });
    
    console.log('✅ Linear query result:');
    const linearText = linearResult.result.content[0].text;
    console.log('   ' + linearText.split('\n').slice(0, 6).join('\n   '));

    // Performance comparison
    const activationTime = parseFloat(activationText.match(/query took (\d+\.?\d*)ms/)?.[1] || '0');
    const linearTime = parseFloat(linearText.match(/query took (\d+\.?\d*)ms/)?.[1] || '0');
    
    console.log('\n📊 Performance Comparison:');
    console.log(`   Activation spreading: ${activationTime}ms`);
    console.log(`   Linear search: ${linearTime}ms`);
    
    if (activationTime > 0 && linearTime > 0) {
      const speedup = linearTime > activationTime ? (linearTime / activationTime).toFixed(2) : 'slower';
      console.log(`   Performance: ${speedup}x ${speedup === 'slower' ? 'slower' : 'faster'}`);
      
      if (activationTime < 10) {
        console.log('🎯 SUCCESS: Response time under 10ms target!');
      } else {
        console.log('⚠️  WARNING: Response time exceeds 10ms target');
      }
    }

    // Test context-aware activation
    console.log('\n🧪 Running test: Context-aware activation');
    const contextResult = await sendRequest('tools/call', {
      name: 'query_mindmap',
      arguments: {
        query: 'error handling patterns',
        limit: 3,
        current_task: 'fixing bugs in the system',
        framework_context: ['typescript', 'node.js'],
        language_context: ['typescript', 'javascript']
      }
    });
    
    console.log('✅ Context-aware query result:');
    console.log('   ' + contextResult.result.content[0].text.split('\n').slice(0, 5).join('\n   '));

    console.log('\n🎉 Activation spreading tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    server.kill();
    process.exit(0);
  }
}

runTest().catch(console.error);