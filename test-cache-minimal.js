#!/usr/bin/env node

import { QueryCache } from './dist/core/QueryCache.js';

async function testCacheMinimal() {
  console.log('🧪 Testing QueryCache Implementation...\n');

  try {
    const cache = new QueryCache({
      maxEntries: 100,
      maxMemoryMB: 10,
      contextSimilarityThreshold: 0.8,
      ttlMinutes: 60
    });

    // Mock query results
    const createMockResult = (query, count) => ({
      nodes: Array(count).fill(0).map((_, i) => ({
        id: `node_${query}_${i}`,
        name: `${query}_result_${i}`,
        type: 'test',
        confidence: 0.8 + (i * 0.1)
      })),
      edges: [],
      totalMatches: count,
      queryTime: 10,
      cached: false
    });

    console.log('📊 Initial Cache Stats:', JSON.stringify(cache.getStats(), null, 2));

    // Test 1: Cache miss and set
    console.log('\n🔍 Test 1: Cache miss and set');
    const query1 = 'typescript files';
    const context1 = JSON.stringify({ limit: 5, type: 'file' });

    console.log(`Query: "${query1}"`);

    // First call - should be cache miss
    let startTime = Date.now();
    let result = await cache.get(query1, context1);
    let getTime = Date.now() - startTime;

    console.log(`Cache get: ${getTime}ms - Result: ${result ? 'HIT' : 'MISS'}`);

    // Set result
    const mockResult1 = createMockResult('typescript', 3);
    startTime = Date.now();
    await cache.set(query1, context1, mockResult1);
    let setTime = Date.now() - startTime;

    console.log(`Cache set: ${setTime}ms`);

    // Test 2: Cache hit
    console.log('\n⚡ Test 2: Cache hit');
    startTime = Date.now();
    result = await cache.get(query1, context1);
    getTime = Date.now() - startTime;

    console.log(`Cache get: ${getTime}ms - Result: ${result ? 'HIT' : 'MISS'}`);
    if (result) {
      console.log(`Retrieved ${result.nodes.length} nodes`);
    }

    // Test 3: Different context (should be miss)
    console.log('\n🧠 Test 3: Different context');
    const context2 = JSON.stringify({ limit: 10, type: 'file' });

    startTime = Date.now();
    result = await cache.get(query1, context2);
    getTime = Date.now() - startTime;

    console.log(`Cache get (different context): ${getTime}ms - Result: ${result ? 'HIT' : 'MISS'}`);

    // Test 4: Similar context (might be hit based on similarity)
    console.log('\n🔄 Test 4: Similar context');
    const context3 = JSON.stringify({ limit: 5, type: 'file', extra: 'ignored' });

    startTime = Date.now();
    result = await cache.get(query1, context3);
    getTime = Date.now() - startTime;

    console.log(`Cache get (similar context): ${getTime}ms - Result: ${result ? 'HIT' : 'MISS'}`);

    // Test 5: Multiple queries to test hit rate
    console.log('\n📈 Test 5: Multiple queries for hit rate');

    const queries = [
      'javascript files',
      'python functions',
      'typescript classes',
      'test methods',
      'config files'
    ];

    for (const query of queries) {
      const context = JSON.stringify({ limit: 5 });
      const mockResult = createMockResult(query.replace(' ', '_'), 2);

      // Set in cache
      await cache.set(query, context, mockResult);
    }

    // Now test hit rate
    let hits = 0;
    let total = 0;

    for (const query of [...queries, ...queries]) { // Query each twice
      const context = JSON.stringify({ limit: 5 });
      total++;

      startTime = Date.now();
      result = await cache.get(query, context);
      getTime = Date.now() - startTime;

      if (result) hits++;

      console.log(`Query "${query}": ${getTime}ms - ${result ? 'HIT' : 'MISS'}`);
    }

    const hitRate = (hits / total) * 100;
    console.log(`\nHit rate: ${hits}/${total} = ${hitRate.toFixed(1)}%`);

    // Final stats
    const finalStats = cache.getStats();
    console.log('\n📊 Final Cache Stats:', JSON.stringify(finalStats, null, 2));

    // Performance targets check
    console.log('\n🎯 Performance Targets:');
    console.log(`Target hit rate: 65%`);
    console.log(`Actual hit rate: ${(finalStats.hitRate * 100).toFixed(1)}%`);
    console.log(`Hit rate target met: ${finalStats.hitRate * 100 >= 65 ? '✅' : '❌'}`);

    console.log(`\nTarget cache lookup time: <1ms`);
    console.log(`Actual lookup time: ~${getTime}ms`);
    console.log(`Speed target met: ${getTime < 1 ? '✅' : '❌'}`);

    console.log(`\nMemory usage: ${(finalStats.memoryUsage / 1024).toFixed(2)} KB / ${(finalStats.maxMemoryUsage / 1024 / 1024).toFixed(1)} MB`);

    console.log('\n🎉 QueryCache test completed successfully!');

    // Test 6: Cache invalidation
    console.log('\n🗑️ Test 6: Cache invalidation');
    const invalidated = await cache.invalidate(['typescript']);
    console.log(`Invalidated ${invalidated} entries`);

    const afterInvalidation = cache.getStats();
    console.log('Stats after invalidation:', JSON.stringify(afterInvalidation, null, 2));

  } catch (error) {
    console.error('❌ Error during cache testing:', error);
    console.error('Stack trace:', error.stack);
  }
}

testCacheMinimal().catch(console.error);