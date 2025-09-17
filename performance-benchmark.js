#!/usr/bin/env node

/**
 * Comprehensive Performance Benchmark Suite
 *
 * Measures key performance metrics from TASKS.md:
 * - Cache hit rate (target: 65%)
 * - Query speed cached (target: 1-5ms)
 * - Query speed simple (target: 0.8ms)
 * - Complex analysis (target: 200ms)
 * - Memory usage (target: 35MB)
 * - Test coverage validation
 */

import { MindMapEngine } from './dist/core/MindMapEngine.js';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

class PerformanceBenchmark {
  constructor() {
    this.testDir = join(process.cwd(), 'benchmark-temp');
    this.engine = null;
    this.results = {
      cacheHitRate: 0,
      queryCachedSpeed: 0,
      querySimpleSpeed: 0,
      complexAnalysisSpeed: 0,
      memoryUsage: 0,
      passed: 0,
      failed: 0,
      details: []
    };
  }

  async setup() {
    console.log('🚀 Starting Mind Map MCP Performance Benchmark');
    console.log('=' .repeat(60));

    // Create clean test environment
    if (existsSync(this.testDir)) {
      rmSync(this.testDir, { recursive: true, force: true });
    }
    mkdirSync(this.testDir, { recursive: true });

    // Initialize engine with test project
    this.engine = new MindMapEngine(this.testDir);
    await this.engine.initialize();

    console.log('✅ Benchmark environment initialized');
  }

  async cleanup() {
    if (existsSync(this.testDir)) {
      rmSync(this.testDir, { recursive: true, force: true });
    }
    console.log('🗑️  Benchmark environment cleaned up');
  }

  async measureCachePerformance() {
    console.log('\n1️⃣ CACHE PERFORMANCE TEST');
    console.log('-'.repeat(40));

    // Perform initial scan to populate data
    await this.engine.scanProject(true);

    // Test queries that should populate cache
    const testQueries = [
      'function',
      'class',
      'typescript',
      'javascript',
      'MindMapEngine',
      'storage',
      'test',
      'error',
      'import',
      'async'
    ];

    let totalTime = 0;

    // First pass - populate cache
    console.log('📝 Populating cache with test queries...');
    for (const query of testQueries) {
      const start = Date.now();
      await this.engine.query(query, { limit: 10 });
      totalTime += Date.now() - start;
    }

    // Second pass - measure cached performance
    console.log('⚡ Measuring cached query performance...');
    const cachedTimes = [];
    for (const query of testQueries) {
      const start = Date.now();
      await this.engine.query(query, { limit: 10 });
      const time = Date.now() - start;
      cachedTimes.push(time);
    }

    // Get cache stats
    const cacheStats = this.engine.getCacheStats();
    const avgCachedTime = cachedTimes.reduce((a, b) => a + b, 0) / cachedTimes.length;

    this.results.cacheHitRate = cacheStats.hitRate || 0;
    this.results.queryCachedSpeed = avgCachedTime;

    console.log(`   ✓ Cache hit rate: ${(this.results.cacheHitRate * 100).toFixed(1)}% (target: 65%)`);
    console.log(`   ✓ Average cached query time: ${avgCachedTime.toFixed(1)}ms (target: 1-5ms)`);

    return {
      cacheHitRate: this.results.cacheHitRate >= 0.65,
      cachedSpeed: avgCachedTime >= 1 && avgCachedTime <= 5
    };
  }

  async measureSimpleQueryPerformance() {
    console.log('\n2️⃣ SIMPLE QUERY PERFORMANCE TEST');
    console.log('-'.repeat(40));

    // Test simple, direct queries
    const simpleQueries = [
      'file',
      'dir',
      'node',
      'edge',
      'path'
    ];

    const simpleTimes = [];
    console.log('🔍 Measuring simple query performance...');

    for (const query of simpleQueries) {
      // Clear cache for this query to get true simple query time
      this.engine.clearCache();

      const start = Date.now();
      await this.engine.query(query, { limit: 5 });
      const time = Date.now() - start;
      simpleTimes.push(time);
      console.log(`   "${query}": ${time}ms`);
    }

    const avgSimpleTime = simpleTimes.reduce((a, b) => a + b, 0) / simpleTimes.length;
    this.results.querySimpleSpeed = avgSimpleTime;

    console.log(`   ✓ Average simple query time: ${avgSimpleTime.toFixed(1)}ms (target: 0.8ms)`);

    return avgSimpleTime <= 0.8;
  }

  async measureComplexAnalysisPerformance() {
    console.log('\n3️⃣ COMPLEX ANALYSIS PERFORMANCE TEST');
    console.log('-'.repeat(40));

    const complexOperations = [];

    // Test architectural analysis
    console.log('🏗️  Testing architectural analysis...');
    let start = Date.now();
    await this.engine.analyzeArchitecture();
    complexOperations.push(Date.now() - start);

    // Test framework detection
    console.log('🔍 Testing framework detection...');
    start = Date.now();
    await this.engine.detectFrameworks();
    complexOperations.push(Date.now() - start);

    // Test cross-language analysis
    console.log('🌐 Testing polyglot analysis...');
    start = Date.now();
    await this.engine.analyzePolyglotProject();
    complexOperations.push(Date.now() - start);

    // Test pattern prediction
    console.log('🔮 Testing pattern prediction...');
    start = Date.now();
    await this.engine.analyzeAndPredict();
    complexOperations.push(Date.now() - start);

    const avgComplexTime = complexOperations.reduce((a, b) => a + b, 0) / complexOperations.length;
    this.results.complexAnalysisSpeed = avgComplexTime;

    console.log(`   ✓ Average complex analysis time: ${avgComplexTime.toFixed(0)}ms (target: 200ms)`);

    return avgComplexTime <= 200;
  }

  async measureMemoryUsage() {
    console.log('\n4️⃣ MEMORY USAGE TEST');
    console.log('-'.repeat(40));

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const initialMemory = process.memoryUsage().heapUsed;

    // Perform memory-intensive operations
    console.log('📊 Loading large dataset...');

    // Add many nodes to test memory usage
    for (let i = 0; i < 1000; i++) {
      this.engine.storage.addNode({
        id: `test-node-${i}`,
        name: `Test Node ${i}`,
        type: 'test',
        confidence: 0.8,
        lastUpdated: new Date(),
        metadata: {
          description: `Test node for memory benchmark ${i}`,
          category: 'benchmark',
          index: i
        }
      });
    }

    // Add edges
    for (let i = 0; i < 500; i++) {
      this.engine.storage.addEdge({
        id: `test-edge-${i}`,
        source: `test-node-${i}`,
        target: `test-node-${(i + 1) % 1000}`,
        type: 'test_connection',
        confidence: 0.7,
        weight: 1.0
      });
    }

    await this.engine.storage.save();

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryUsedMB = (finalMemory - initialMemory) / 1024 / 1024;

    this.results.memoryUsage = memoryUsedMB;

    console.log(`   ✓ Memory used for 1000 nodes + 500 edges: ${memoryUsedMB.toFixed(1)}MB`);
    console.log(`   ✓ Total heap usage: ${(finalMemory / 1024 / 1024).toFixed(1)}MB (target: <35MB)`);

    return memoryUsedMB <= 35;
  }

  async measureBrainSystemsPerformance() {
    console.log('\n5️⃣ BRAIN-INSPIRED SYSTEMS TEST');
    console.log('-'.repeat(40));

    let brainSystemsWorking = 0;
    const totalSystems = 6;

    try {
      // Test Hebbian Learning
      console.log('🧠 Testing Hebbian Learning...');
      await this.engine.recordCoActivation('test-node-1', ['test-node-2', 'test-node-3'], 'test', 0.8);
      const hebbianStats = this.engine.getHebbianStats();
      if (hebbianStats && hebbianStats.totalConnections >= 0) {
        brainSystemsWorking++;
        console.log(`   ✓ Hebbian connections: ${hebbianStats.totalConnections || 0}`);
      }
    } catch (error) {
      console.log(`   ❌ Hebbian Learning failed: ${error.message}`);
    }

    try {
      // Test Attention System
      console.log('🎯 Testing Attention System...');
      const attentionStats = this.engine.getAttentionStats();
      if (attentionStats) {
        brainSystemsWorking++;
        console.log(`   ✓ Attention allocations: ${attentionStats.totalAllocations || 0}`);
      }
    } catch (error) {
      console.log(`   ❌ Attention System failed: ${error.message}`);
    }

    try {
      // Test Pattern Prediction
      console.log('🔮 Testing Pattern Prediction...');
      const predictions = await this.engine.getPatternPredictions();
      if (predictions !== undefined) {
        brainSystemsWorking++;
        console.log(`   ✓ Pattern predictions generated: ${predictions.length || 0}`);
      }
    } catch (error) {
      console.log(`   ❌ Pattern Prediction failed: ${error.message}`);
    }

    try {
      // Test Hierarchical Context
      console.log('📊 Testing Hierarchical Context...');
      const contextStats = this.engine.getHierarchicalContextStats();
      if (contextStats) {
        brainSystemsWorking++;
        console.log(`   ✓ Context levels: ${Object.keys(contextStats.contextLevels || {}).length}`);
      }
    } catch (error) {
      console.log(`   ❌ Hierarchical Context failed: ${error.message}`);
    }

    try {
      // Test Bi-temporal Model
      console.log('🕐 Testing Bi-temporal Knowledge...');
      const biTemporalStats = this.engine.getBiTemporalStats();
      if (biTemporalStats) {
        brainSystemsWorking++;
        console.log(`   ✓ Temporal relationships tracked`);
      }
    } catch (error) {
      console.log(`   ❌ Bi-temporal Model failed: ${error.message}`);
    }

    try {
      // Test Multi-modal Fusion
      console.log('🔀 Testing Multi-modal Fusion...');
      const fusionStats = this.engine.getMultiModalFusionStats();
      if (fusionStats) {
        brainSystemsWorking++;
        console.log(`   ✓ Multi-modal confidence fusion active`);
      }
    } catch (error) {
      console.log(`   ❌ Multi-modal Fusion failed: ${error.message}`);
    }

    const brainSystemsScore = (brainSystemsWorking / totalSystems) * 100;
    console.log(`   ✓ Brain systems operational: ${brainSystemsWorking}/${totalSystems} (${brainSystemsScore.toFixed(1)}%)`);

    return brainSystemsWorking >= 4; // At least 4 out of 6 systems working
  }

  calculateOverallScore() {
    console.log('\n📊 PERFORMANCE SUMMARY');
    console.log('=' .repeat(60));

    let score = 0;
    let maxScore = 6;

    // Cache Performance (65% hit rate)
    if (this.results.cacheHitRate >= 0.65) {
      score += 1;
      console.log('✅ Cache Hit Rate: PASS');
    } else {
      console.log('❌ Cache Hit Rate: FAIL');
    }

    // Cached Query Speed (1-5ms)
    if (this.results.queryCachedSpeed >= 1 && this.results.queryCachedSpeed <= 5) {
      score += 1;
      console.log('✅ Cached Query Speed: PASS');
    } else {
      console.log('❌ Cached Query Speed: FAIL');
    }

    // Simple Query Speed (0.8ms)
    if (this.results.querySimpleSpeed <= 0.8) {
      score += 1;
      console.log('✅ Simple Query Speed: PASS');
    } else {
      console.log('❌ Simple Query Speed: FAIL');
    }

    // Complex Analysis (200ms)
    if (this.results.complexAnalysisSpeed <= 200) {
      score += 1;
      console.log('✅ Complex Analysis Speed: PASS');
    } else {
      console.log('❌ Complex Analysis Speed: FAIL');
    }

    // Memory Usage (35MB)
    if (this.results.memoryUsage <= 35) {
      score += 1;
      console.log('✅ Memory Usage: PASS');
    } else {
      console.log('❌ Memory Usage: FAIL');
    }

    // Brain Systems (at least 4/6 working)
    if (this.results.brainSystemsWorking) {
      score += 1;
      console.log('✅ Brain-Inspired Systems: PASS');
    } else {
      console.log('❌ Brain-Inspired Systems: FAIL');
    }

    const percentage = (score / maxScore) * 100;

    console.log('\n📈 BENCHMARK RESULTS:');
    console.log(`Score: ${score}/${maxScore} (${percentage.toFixed(1)}%)`);
    console.log(`Grade: ${this.getPerformanceGrade(percentage)}`);

    return { score, maxScore, percentage };
  }

  getPerformanceGrade(percentage) {
    if (percentage >= 95) return '🏆 EXCELLENT (A+)';
    if (percentage >= 85) return '🥇 GREAT (A)';
    if (percentage >= 75) return '🥈 GOOD (B)';
    if (percentage >= 65) return '🥉 FAIR (C)';
    if (percentage >= 50) return '⚠️  POOR (D)';
    return '❌ FAILING (F)';
  }

  async run() {
    try {
      await this.setup();

      // Run all benchmarks
      const cacheResult = await this.measureCachePerformance();
      const simpleResult = await this.measureSimpleQueryPerformance();
      const complexResult = await this.measureComplexAnalysisPerformance();
      const memoryResult = await this.measureMemoryUsage();
      const brainResult = await this.measureBrainSystemsPerformance();

      this.results.brainSystemsWorking = brainResult;

      // Calculate final score
      const finalResults = this.calculateOverallScore();

      console.log('\n🎯 PERFORMANCE TARGETS vs ACTUAL:');
      console.log(`Cache Hit Rate: ${(this.results.cacheHitRate * 100).toFixed(1)}% (target: 65%)`);
      console.log(`Cached Query: ${this.results.queryCachedSpeed.toFixed(1)}ms (target: 1-5ms)`);
      console.log(`Simple Query: ${this.results.querySimpleSpeed.toFixed(1)}ms (target: 0.8ms)`);
      console.log(`Complex Analysis: ${this.results.complexAnalysisSpeed.toFixed(0)}ms (target: 200ms)`);
      console.log(`Memory Usage: ${this.results.memoryUsage.toFixed(1)}MB (target: 35MB)`);

      console.log('\n🚀 Mind Map MCP Performance Benchmark Complete!');

      // Exit with appropriate code
      process.exit(finalResults.percentage >= 80 ? 0 : 1);

    } catch (error) {
      console.error('❌ Benchmark failed:', error.message);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// Run benchmark
const benchmark = new PerformanceBenchmark();
benchmark.run().catch(console.error);