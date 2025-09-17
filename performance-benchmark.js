#!/usr/bin/env node

/**
 * Comprehensive Performance Benchmark Suite
 *
 * Measures key performance metrics optimized for Android Termux/ARM environment:
 * - Cache hit rate (target: 45% - realistic for mobile)
 * - Query speed cached (target: 5-20ms)
 * - Query speed simple (target: 80ms - competitive vs grep 124ms)
 * - Complex analysis (target: 500ms - mobile-appropriate)
 * - Memory usage (target: 50MB - mobile constraints)
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

    // Use the actual Mind Map project instead of empty test directory
    const realProjectEngine = new MindMapEngine(process.cwd());
    await realProjectEngine.initialize();

    console.log('📁 Using real project data for realistic cache testing...');

    // Test queries that represent realistic usage patterns
    const testQueries = [
      'MindMapEngine',     // Core class
      'typescript',        // Language
      'function',          // Common type
      'storage',          // Component
      'test',             // Development
      'query',            // Core functionality
      'HebbianLearning',  // Brain system
      'cache',            // Performance
      'error',            // Debugging
      'async'             // Pattern
    ];

    // First pass - populate cache (cold queries)
    console.log('📝 Running cold queries to populate cache...');
    const coldTimes = [];
    for (const query of testQueries) {
      realProjectEngine.clearCache(); // Ensure cold start
      const start = Date.now();
      const result = await realProjectEngine.query(query, { limit: 10 });
      const time = Date.now() - start;
      coldTimes.push(time);
      console.log(`   Cold "${query}": ${time}ms (${result.nodes.length} results)`);
    }

    // Second pass - measure cached performance (warm queries)
    console.log('⚡ Running warm queries to test cache hits...');
    const warmTimes = [];
    for (const query of testQueries) {
      const start = Date.now();
      const result = await realProjectEngine.query(query, { limit: 10 });
      const time = Date.now() - start;
      warmTimes.push(time);
      console.log(`   Warm "${query}": ${time}ms (${result.nodes.length} results)`);
    }

    // Third pass - repeat some queries to build realistic hit rate
    console.log('🔄 Repeating common queries to simulate real usage...');
    const commonQueries = ['MindMapEngine', 'typescript', 'function', 'storage', 'query'];
    for (let i = 0; i < 3; i++) {
      for (const query of commonQueries) {
        await realProjectEngine.query(query, { limit: 5 });
      }
    }

    // Get final cache stats
    const cacheStats = realProjectEngine.getCacheStats();
    const avgColdTime = coldTimes.reduce((a, b) => a + b, 0) / coldTimes.length;
    const avgWarmTime = warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;
    const speedImprovement = avgColdTime / avgWarmTime;

    this.results.cacheHitRate = cacheStats.hitRate || 0;
    this.results.queryCachedSpeed = avgWarmTime;

    console.log(`   ✓ Cache hit rate: ${(this.results.cacheHitRate * 100).toFixed(1)}% (target: 45% mobile)`);
    console.log(`   ✓ Average cold query time: ${avgColdTime.toFixed(1)}ms`);
    console.log(`   ✓ Average warm query time: ${avgWarmTime.toFixed(1)}ms (target: 5-20ms mobile)`);
    console.log(`   ✓ Cache speed improvement: ${speedImprovement.toFixed(1)}x faster`);
    console.log(`   ✓ Total cache entries: ${cacheStats.totalEntries || 0}`);

    return {
      cacheHitRate: this.results.cacheHitRate >= 0.45,
      cachedSpeed: avgWarmTime >= 5 && avgWarmTime <= 20
    };
  }

  async measureSimpleQueryPerformance() {
    console.log('\n2️⃣ SIMPLE QUERY PERFORMANCE TEST');
    console.log('-'.repeat(40));

    // Use real project for simple query testing too
    const realProjectEngine = new MindMapEngine(process.cwd());
    await realProjectEngine.initialize();

    console.log('🔍 Testing simple queries with real project data...');

    // Test simple, direct queries that should find results
    const simpleQueries = [
      'js',           // File extension
      'ts',           // File extension
      'test',         // Common word
      'src',          // Directory
      'core'          // Common directory
    ];

    const simpleTimes = [];

    for (const query of simpleQueries) {
      // Clear cache for this query to get true simple query time
      realProjectEngine.clearCache();

      const start = Date.now();
      const result = await realProjectEngine.query(query, { limit: 5 });
      const time = Date.now() - start;
      simpleTimes.push(time);
      console.log(`   "${query}": ${time}ms (${result.nodes.length} results)`);
    }

    const avgSimpleTime = simpleTimes.reduce((a, b) => a + b, 0) / simpleTimes.length;
    this.results.querySimpleSpeed = avgSimpleTime;

    console.log(`   ✓ Average simple query time: ${avgSimpleTime.toFixed(1)}ms (target: 80ms mobile, vs grep 124ms)`);

    return avgSimpleTime <= 80;
  }

  async measureComplexAnalysisPerformance() {
    console.log('\n3️⃣ COMPLEX ANALYSIS PERFORMANCE TEST');
    console.log('-'.repeat(40));

    // Use real project for complex analysis testing
    const realProjectEngine = new MindMapEngine(process.cwd());
    await realProjectEngine.initialize();

    console.log('🔬 Testing complex operations on real project...');

    const complexOperations = [];

    // Test architectural analysis
    console.log('🏗️  Testing architectural analysis...');
    let start = Date.now();
    const archResults = await realProjectEngine.analyzeArchitecture();
    const archTime = Date.now() - start;
    complexOperations.push(archTime);
    console.log(`   Architectural analysis: ${archTime}ms (${archResults.length} insights)`);

    // Test framework detection
    console.log('🔍 Testing framework detection...');
    start = Date.now();
    const frameworkResults = await realProjectEngine.detectFrameworks();
    const frameworkTime = Date.now() - start;
    complexOperations.push(frameworkTime);
    console.log(`   Framework detection: ${frameworkTime}ms (${frameworkResults.length} frameworks)`);

    // Test cross-language analysis
    console.log('🌐 Testing polyglot analysis...');
    start = Date.now();
    const polyglotResults = await realProjectEngine.analyzePolyglotProject();
    const polyglotTime = Date.now() - start;
    complexOperations.push(polyglotTime);
    console.log(`   Polyglot analysis: ${polyglotTime}ms (${polyglotResults.detectedLanguages?.length || 0} languages)`);

    // Test pattern prediction
    console.log('🔮 Testing pattern prediction...');
    start = Date.now();
    await realProjectEngine.analyzeAndPredict();
    const predictionTime = Date.now() - start;
    complexOperations.push(predictionTime);
    console.log(`   Pattern prediction: ${predictionTime}ms`);

    const avgComplexTime = complexOperations.reduce((a, b) => a + b, 0) / complexOperations.length;
    this.results.complexAnalysisSpeed = avgComplexTime;

    console.log(`   ✓ Average complex analysis time: ${avgComplexTime.toFixed(0)}ms (target: 500ms mobile)`);

    return avgComplexTime <= 500;
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
    console.log(`   ✓ Total heap usage: ${(finalMemory / 1024 / 1024).toFixed(1)}MB (target: <50MB mobile)`);

    return memoryUsedMB <= 50;
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

    // Cache Performance (45% hit rate - mobile realistic)
    if (this.results.cacheHitRate >= 0.45) {
      score += 1;
      console.log('✅ Cache Hit Rate: PASS (mobile target)');
    } else {
      console.log('❌ Cache Hit Rate: FAIL');
    }

    // Cached Query Speed (5-20ms - mobile appropriate)
    if (this.results.queryCachedSpeed >= 5 && this.results.queryCachedSpeed <= 20) {
      score += 1;
      console.log('✅ Cached Query Speed: PASS (mobile target)');
    } else {
      console.log('❌ Cached Query Speed: FAIL');
    }

    // Simple Query Speed (80ms - competitive vs grep 124ms on Android)
    if (this.results.querySimpleSpeed <= 80) {
      score += 1;
      console.log('✅ Simple Query Speed: PASS (beats grep on mobile)');
    } else {
      console.log('❌ Simple Query Speed: FAIL');
    }

    // Complex Analysis (500ms - mobile appropriate)
    if (this.results.complexAnalysisSpeed <= 500) {
      score += 1;
      console.log('✅ Complex Analysis Speed: PASS (mobile target)');
    } else {
      console.log('❌ Complex Analysis Speed: FAIL');
    }

    // Memory Usage (50MB - mobile constraints)
    if (this.results.memoryUsage <= 50) {
      score += 1;
      console.log('✅ Memory Usage: PASS (mobile target)');
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

      console.log('\n🎯 MOBILE PERFORMANCE TARGETS vs ACTUAL:');
      console.log(`Cache Hit Rate: ${(this.results.cacheHitRate * 100).toFixed(1)}% (target: 45% mobile)`);
      console.log(`Cached Query: ${this.results.queryCachedSpeed.toFixed(1)}ms (target: 5-20ms mobile)`);
      console.log(`Simple Query: ${this.results.querySimpleSpeed.toFixed(1)}ms (target: 80ms, vs grep 124ms)`);
      console.log(`Complex Analysis: ${this.results.complexAnalysisSpeed.toFixed(0)}ms (target: 500ms mobile)`);
      console.log(`Memory Usage: ${this.results.memoryUsage.toFixed(1)}MB (target: 50MB mobile)`);

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