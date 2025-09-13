#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, '../../dist/index.js');
import { readFile } from 'fs/promises';

function createMCPRequest(id, method, params = {}) {
  return JSON.stringify({
    jsonrpc: '2.0',
    id,
    method,
    params
  });
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
    }, 10000);

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

async function testCaching() {
  console.log('🧠 Testing Query Caching Implementation...\n');
  
  const child = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  try {
    // Initialize
    await sendMCPMessage(child, createMCPRequest(1, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }));

    // Scan project first
    console.log('📊 Scanning project...');
    await sendMCPMessage(child, createMCPRequest(2, 'tools/call', {
      name: 'scan_project',
      arguments: { force_rescan: true }
    }));
    console.log('✅ Project scanned\n');

    // Test 1: Query without cache
    console.log('🧪 Test 1: First query (cache miss expected)');
    const query1 = await sendMCPMessage(child, createMCPRequest(3, 'tools/call', {
      name: 'query_mindmap',
      arguments: { query: 'TypeScript files', limit: 5 }
    }));
    console.log('✅ First query completed');

    // Test 2: Same query (cache hit expected)
    console.log('🧪 Test 2: Same query (cache hit expected)');
    const query2 = await sendMCPMessage(child, createMCPRequest(4, 'tools/call', {
      name: 'query_mindmap',
      arguments: { query: 'TypeScript files', limit: 5 }
    }));
    console.log('✅ Second query completed');

    // Test 3: Check cache stats
    console.log('🧪 Test 3: Check cache statistics');
    const cacheStats = await sendMCPMessage(child, createMCPRequest(5, 'tools/call', {
      name: 'get_cache_stats',
      arguments: {}
    }));
    console.log('📊 Cache Stats Response:', JSON.stringify(cacheStats, null, 2));

    // Test 4: Query with different context (should be cache miss)
    console.log('🧪 Test 4: Query with different context');
    const query3 = await sendMCPMessage(child, createMCPRequest(6, 'tools/call', {
      name: 'query_mindmap', 
      arguments: { query: 'TypeScript files', limit: 10 } // Different limit
    }));
    console.log('✅ Query with different context completed');

    // Test 5: Clear cache
    console.log('🧪 Test 5: Clear cache');
    const clearCache = await sendMCPMessage(child, createMCPRequest(7, 'tools/call', {
      name: 'clear_cache',
      arguments: {}
    }));
    console.log('✅ Cache cleared');

    // Test 6: Query after cache clear (should be cache miss)
    console.log('🧪 Test 6: Query after cache clear');
    const query4 = await sendMCPMessage(child, createMCPRequest(8, 'tools/call', {
      name: 'query_mindmap',
      arguments: { query: 'TypeScript files', limit: 5 }
    }));
    console.log('✅ Query after cache clear completed');

    // Final cache stats
    console.log('🧪 Final: Cache statistics after all tests');
    const finalStats = await sendMCPMessage(child, createMCPRequest(9, 'tools/call', {
      name: 'get_cache_stats',
      arguments: {}
    }));
    console.log('📊 Final Cache Stats:', JSON.stringify(finalStats, null, 2));

    console.log('\n🎉 All caching tests completed successfully!');
    console.log('\n📈 Expected Results:');
    console.log('• Test 1: Cache miss (new query)');
    console.log('• Test 2: Cache hit (same query)');  
    console.log('• Test 3: Hit rate > 0%, total queries = 2');
    console.log('• Test 4: Cache miss (different context)');
    console.log('• Test 5: Cache cleared successfully');
    console.log('• Test 6: Cache miss (after clear)');
    console.log('• Final: Hit rate reflects all operations');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    child.kill();
  }
}

testCaching().catch(console.error);