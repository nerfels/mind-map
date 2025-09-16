#!/usr/bin/env node

import { MindMapEngine } from './dist/core/MindMapEngine.js';

async function testCachePerformance() {
  console.log('🧪 Testing Query Result Caching Performance...\n');

  const engine = new MindMapEngine('/data/data/com.termux/files/home/projects/mind-map');

  try {
    // Initialize the engine
    console.log('📊 Initializing MindMapEngine...');
    await engine.scanProject();

    // Get initial cache stats
    const initialStats = await engine.getCacheStats();
    console.log('📈 Initial Cache Stats:', JSON.stringify(initialStats, null, 2));

    // Test queries for cache performance
    const testQueries = [
      'TypeScript files',
      'MindMapEngine class',
      'query methods',
      'src/core files',
      'brain inspired'
    ];

    console.log('\n🔍 Running initial queries (should be cache misses)...');
    const firstRunTimes = [];

    for (const query of testQueries) {
      const startTime = Date.now();
      const result = await engine.queryMindmap(query, { limit: 5 });
      const queryTime = Date.now() - startTime;
      firstRunTimes.push(queryTime);

      console.log(`Query: "${query}" - ${queryTime}ms - ${result.nodes.length} results - Cached: ${result.cached || false}`);
    }

    console.log('\n⚡ Running same queries again (should be cache hits)...');
    const secondRunTimes = [];

    for (const query of testQueries) {
      const startTime = Date.now();
      const result = await engine.queryMindmap(query, { limit: 5 });
      const queryTime = Date.now() - startTime;
      secondRunTimes.push(queryTime);

      console.log(`Query: "${query}" - ${queryTime}ms - ${result.nodes.length} results - Cached: ${result.cached || false}`);
    }

    // Get final cache stats
    const finalStats = await engine.getCacheStats();
    console.log('\n📈 Final Cache Stats:', JSON.stringify(finalStats, null, 2));

    // Calculate performance improvements
    const avgFirstRun = firstRunTimes.reduce((a, b) => a + b, 0) / firstRunTimes.length;
    const avgSecondRun = secondRunTimes.reduce((a, b) => a + b, 0) / secondRunTimes.length;
    const speedImprovement = ((avgFirstRun - avgSecondRun) / avgFirstRun * 100);

    console.log('\n🎯 Performance Results:');
    console.log(`Average first run: ${avgFirstRun.toFixed(1)}ms`);
    console.log(`Average second run: ${avgSecondRun.toFixed(1)}ms`);
    console.log(`Speed improvement: ${speedImprovement.toFixed(1)}%`);
    console.log(`Cache hit rate: ${(finalStats.hitRate * 100).toFixed(1)}%`);

    // Test context-aware caching
    console.log('\n🧠 Testing context-aware caching...');

    const contextQuery = 'TypeScript files';
    const context1 = { activeFiles: ['src/core/MindMapEngine.ts'], limit: 5 };
    const context2 = { activeFiles: ['src/handlers/QueryHandlers.ts'], limit: 5 };
    const context3 = { activeFiles: ['src/core/MindMapEngine.ts'], limit: 5 }; // Same as context1

    await engine.queryMindmap(contextQuery, context1);
    console.log('Context 1 query completed');

    await engine.queryMindmap(contextQuery, context2);
    console.log('Context 2 query completed');

    const startTime = Date.now();
    const result3 = await engine.queryMindmap(contextQuery, context3);
    const contextCacheTime = Date.now() - startTime;

    console.log(`Context 3 (same as 1) query: ${contextCacheTime}ms - Cached: ${result3.cached || false}`);

    // Final stats
    const endStats = await engine.getCacheStats();
    console.log('\n📊 Final Cache Statistics:');
    console.log(`Total entries: ${endStats.totalEntries}`);
    console.log(`Memory usage: ${(endStats.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Hit rate: ${(endStats.hitRate * 100).toFixed(1)}%`);
    console.log(`Cache hits: ${endStats.cacheHits}`);
    console.log(`Cache misses: ${endStats.cacheMisses}`);

    // Test cache targets from TASKS.md
    const targetHitRate = 65; // 65% target from TASKS.md
    const targetResponseTime = 1; // sub-1ms for cached responses

    console.log('\n🎯 Testing Against Targets:');
    console.log(`Target cache hit rate: ${targetHitRate}%`);
    console.log(`Actual cache hit rate: ${(endStats.hitRate * 100).toFixed(1)}%`);
    console.log(`Target met: ${endStats.hitRate * 100 >= targetHitRate ? '✅' : '❌'}`);

    console.log(`\nTarget cached response time: <${targetResponseTime}ms`);
    console.log(`Actual cached response time: ${avgSecondRun.toFixed(1)}ms`);
    console.log(`Target met: ${avgSecondRun < targetResponseTime ? '✅' : '❌'}`);

    console.log('\n🎉 Cache performance test completed!');

  } catch (error) {
    console.error('❌ Error during cache testing:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testCachePerformance().catch(console.error);