#!/usr/bin/env node

import { QueryService } from './dist/core/services/QueryService.js';
import { MindMapStorage } from './dist/core/MindMapStorage.js';
import { AdvancedQueryEngine } from './dist/core/AdvancedQueryEngine.js';
import { TemporalQueryEngine } from './dist/core/TemporalQueryEngine.js';
import { AggregateQueryEngine } from './dist/core/AggregateQueryEngine.js';
import { ActivationNetwork } from './dist/core/ActivationNetwork.js';
import { QueryCache } from './dist/core/QueryCache.js';
import { MultiModalConfidenceFusion } from './dist/core/MultiModalConfidenceFusion.js';
import { InhibitoryLearningSystem } from './dist/core/InhibitoryLearningSystem.js';
import { HebbianLearningSystem } from './dist/core/HebbianLearningSystem.js';
import { HierarchicalContextSystem } from './dist/core/HierarchicalContextSystem.js';
import { AttentionSystem } from './dist/core/AttentionSystem.js';
import { BiTemporalKnowledgeModel } from './dist/core/BiTemporalKnowledgeModel.js';

async function testCacheSimple() {
  console.log('🧪 Testing Query Result Caching - Simple Test...\n');

  try {
    // Create minimal components for testing
    const storage = new MindMapStorage('/data/data/com.termux/files/home/projects/mind-map');
    const queryCache = new QueryCache();

    // Create other required components (minimal setup)
    const advancedQueryEngine = new AdvancedQueryEngine(storage);
    const temporalQueryEngine = new TemporalQueryEngine(storage);
    const aggregateQueryEngine = new AggregateQueryEngine(storage);
    const activationNetwork = new ActivationNetwork(storage, 3);
    const multiModalFusion = new MultiModalConfidenceFusion();
    const inhibitoryLearning = new InhibitoryLearningSystem(storage);
    const hebbianLearning = new HebbianLearningSystem(storage);
    const hierarchicalContext = new HierarchicalContextSystem(storage);
    const attentionSystem = new AttentionSystem(storage);
    const biTemporal = new BiTemporalKnowledgeModel(storage);

    const queryService = new QueryService(
      storage,
      advancedQueryEngine,
      temporalQueryEngine,
      aggregateQueryEngine,
      activationNetwork,
      queryCache,
      multiModalFusion,
      inhibitoryLearning,
      hebbianLearning,
      hierarchicalContext,
      attentionSystem,
      biTemporal
    );

    // Add some test nodes to storage for testing
    const graph = storage.getGraph();

    // Add test nodes
    graph.nodes.set('test1', {
      id: 'test1',
      name: 'TestFile.ts',
      type: 'file',
      path: '/test/TestFile.ts',
      confidence: 0.9,
      metadata: { language: 'typescript' }
    });

    graph.nodes.set('test2', {
      id: 'test2',
      name: 'testFunction',
      type: 'function',
      path: '/test/TestFile.ts',
      confidence: 0.8,
      metadata: { language: 'typescript' }
    });

    console.log('📊 Initial Cache Stats:', JSON.stringify(queryService.getCacheStats(), null, 2));

    // Test queries
    const testQueries = [
      'TestFile',
      'testFunction',
      'typescript'
    ];

    console.log('\n🔍 First run (cache misses expected)...');
    const firstRunTimes = [];

    for (const query of testQueries) {
      const startTime = Date.now();
      const result = await queryService.query(query, { limit: 5 });
      const queryTime = Date.now() - startTime;
      firstRunTimes.push(queryTime);

      console.log(`Query: "${query}" - ${queryTime}ms - ${result.nodes.length} results - Cached: ${result.cached || false}`);
    }

    console.log('\n⚡ Second run (cache hits expected)...');
    const secondRunTimes = [];

    for (const query of testQueries) {
      const startTime = Date.now();
      const result = await queryService.query(query, { limit: 5 });
      const queryTime = Date.now() - startTime;
      secondRunTimes.push(queryTime);

      console.log(`Query: "${query}" - ${queryTime}ms - ${result.nodes.length} results - Cached: ${result.cached || false}`);
    }

    // Final cache stats
    const finalStats = queryService.getCacheStats();
    console.log('\n📈 Final Cache Stats:', JSON.stringify(finalStats, null, 2));

    // Performance analysis
    const avgFirstRun = firstRunTimes.reduce((a, b) => a + b, 0) / firstRunTimes.length;
    const avgSecondRun = secondRunTimes.reduce((a, b) => a + b, 0) / secondRunTimes.length;
    const speedImprovement = ((avgFirstRun - avgSecondRun) / avgFirstRun * 100);

    console.log('\n🎯 Performance Results:');
    console.log(`Average first run: ${avgFirstRun.toFixed(1)}ms`);
    console.log(`Average second run: ${avgSecondRun.toFixed(1)}ms`);
    console.log(`Speed improvement: ${speedImprovement.toFixed(1)}%`);
    console.log(`Cache hit rate: ${(finalStats.hitRate * 100).toFixed(1)}%`);

    // Test targets from TASKS.md
    const targetHitRate = 65; // 65% target
    const targetResponseTime = 1; // sub-1ms for cached responses

    console.log('\n🎯 Testing Against Targets:');
    console.log(`Target cache hit rate: ${targetHitRate}%`);
    console.log(`Actual cache hit rate: ${(finalStats.hitRate * 100).toFixed(1)}%`);
    console.log(`Target met: ${finalStats.hitRate * 100 >= targetHitRate ? '✅' : '❌'}`);

    console.log(`\nTarget cached response time: <${targetResponseTime}ms`);
    console.log(`Actual cached response time: ${avgSecondRun.toFixed(1)}ms`);
    console.log(`Target met: ${avgSecondRun < targetResponseTime ? '✅' : '❌'}`);

    // Test context-aware caching
    console.log('\n🧠 Testing context-aware caching...');

    const contextQuery = 'TestFile';
    const result1 = await queryService.query(contextQuery, { activeFiles: ['test1.ts'], limit: 5 });
    const result2 = await queryService.query(contextQuery, { activeFiles: ['test2.ts'], limit: 5 }); // Different context
    const result3 = await queryService.query(contextQuery, { activeFiles: ['test1.ts'], limit: 5 }); // Same as first

    console.log(`Context test 1: ${result1.nodes.length} results - Cached: ${result1.cached || false}`);
    console.log(`Context test 2: ${result2.nodes.length} results - Cached: ${result2.cached || false}`);
    console.log(`Context test 3: ${result3.nodes.length} results - Cached: ${result3.cached || false}`);

    const endStats = queryService.getCacheStats();
    console.log('\n📊 Final Statistics:');
    console.log(`Total queries: ${endStats.totalQueries}`);
    console.log(`Cache hits: ${endStats.cacheHits}`);
    console.log(`Cache misses: ${endStats.cacheMisses}`);
    console.log(`Hit rate: ${(endStats.hitRate * 100).toFixed(1)}%`);
    console.log(`Memory usage: ${(endStats.memoryUsage / 1024).toFixed(2)} KB`);

    console.log('\n🎉 Cache implementation test completed successfully!');

  } catch (error) {
    console.error('❌ Error during cache testing:', error);
    console.error('Stack trace:', error.stack);
  }
}

testCacheSimple().catch(console.error);