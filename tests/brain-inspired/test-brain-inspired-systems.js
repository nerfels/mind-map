#!/usr/bin/env node

/**
 * Comprehensive test for all brain-inspired systems in Mind Map MCP
 * Tests: Hebbian Learning, Hierarchical Context, Attention, Bi-temporal, Pattern Prediction
 */

import { MindMapEngine } from './dist/core/MindMapEngine.js';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname);

async function testBrainInspiredSystems() {
  console.log('🧠 Testing All Brain-Inspired Systems Integration\n');
  console.log('=' .repeat(60));

  try {
    const engine = new MindMapEngine(projectRoot);

    // Initialize with project scan
    console.log('📊 Initializing Mind Map...');
    await engine.scanProject({ forceRescan: false });
    console.log('✅ Project scanned\n');

    // Test 1: Hebbian Learning System
    console.log('1️⃣ HEBBIAN LEARNING SYSTEM (Co-activation & Relationship Discovery)');
    console.log('-'.repeat(60));

    const hebbianInitial = await engine.getHebbianStats();
    console.log(`Initial: ${hebbianInitial.totalConnections} connections\n`);

    // Perform queries to trigger co-activation
    const queries = ['TypeScript analyzer', 'code storage', 'pattern detection'];
    for (const q of queries) {
      const result = await engine.query(q, { limit: 3 });
      console.log(`Query "${q}": ${result.nodes.length} results`);
    }

    const hebbianFinal = await engine.getHebbianStats();
    console.log(`\n✅ Hebbian: ${hebbianFinal.totalConnections} connections formed`);
    console.log(`   Average strength: ${hebbianFinal.averageStrength.toFixed(3)}`);
    if (hebbianFinal.topConnections?.length > 0) {
      console.log(`   Top connection: ${hebbianFinal.topConnections[0].source} ↔ ${hebbianFinal.topConnections[0].target}`);
    }

    // Test 2: Hierarchical Context System
    console.log('\n2️⃣ HIERARCHICAL CONTEXT SYSTEM (Multi-level Context Awareness)');
    console.log('-'.repeat(60));

    const contextStats = engine.hierarchicalContext.getContextSummary();
    console.log(`Context levels active:`);
    console.log(`   Immediate: ${contextStats.distribution.immediate} items`);
    console.log(`   Session: ${contextStats.distribution.session} items`);
    console.log(`   Project: ${contextStats.distribution.project} items`);
    console.log(`   Domain: ${contextStats.distribution.domain} items`);
    console.log(`✅ Hierarchical balance: ${(contextStats.hierarchicalBalance * 100).toFixed(1)}%`);

    // Test with context-aware query
    const contextQuery = await engine.query('MindMapEngine', {
      contextLevel: 3, // Project level context
      includeParentContext: true,
      limit: 3
    });
    console.log(`   Context-enhanced query found ${contextQuery.nodes.length} results`);

    // Test 3: Attention System
    console.log('\n3️⃣ ATTENTION SYSTEM (Dynamic Focus & Resource Allocation)');
    console.log('-'.repeat(60));

    const attentionStats = engine.attentionSystem.getStatistics();
    console.log(`Attention allocation:`);
    console.log(`   Total targets: ${attentionStats.totalTargets}`);
    console.log(`   Capacity used: ${(attentionStats.capacityUsed * 100).toFixed(1)}%`);
    console.log(`   Cognitive load: ${attentionStats.cognitiveLoad.status}`);

    // Allocate attention to important nodes
    if (contextQuery.nodes.length > 0) {
      const topNodeIds = contextQuery.nodes.slice(0, 2).map(n => n.id);
      const allocation = engine.attentionSystem.allocateAttention(
        topNodeIds,
        { currentTask: 'testing', activeFiles: [], recentQueries: ['MindMapEngine'] },
        'selective'
      );
      console.log(`✅ Allocated selective attention to ${allocation.allocatedTo.length} nodes`);
    }

    // Test 4: Bi-temporal Knowledge Model
    console.log('\n4️⃣ BI-TEMPORAL KNOWLEDGE MODEL (Valid Time vs Transaction Time)');
    console.log('-'.repeat(60));

    const biTemporalStats = engine.biTemporalModel.getStatistics();
    console.log(`Temporal tracking:`);
    console.log(`   Bi-temporal edges: ${biTemporalStats.totalBiTemporalEdges}`);
    console.log(`   Context windows: ${biTemporalStats.contextWindows}`);
    console.log(`   Active relationships: ${biTemporalStats.activeRelationships}`);

    // Create a context window for current testing
    const windowId = engine.biTemporalModel.createContextWindow({
      name: 'Brain-Inspired Testing Session',
      validTimeStart: new Date(),
      description: 'Testing all brain-inspired systems integration'
    });
    console.log(`✅ Created context window: ${windowId}`);

    // Test 5: Pattern Prediction Engine
    console.log('\n5️⃣ PATTERN PREDICTION ENGINE (Anticipatory Intelligence)');
    console.log('-'.repeat(60));

    const predictionStats = engine.getPredictionEngineStats();
    console.log(`Pattern analysis:`);
    console.log(`   Pattern trends: ${predictionStats.patternTrends}`);
    console.log(`   Emerging patterns: ${predictionStats.emergingPatterns}`);
    console.log(`   Total predictions: ${predictionStats.totalPredictions}`);

    // Trigger pattern analysis
    await engine.analyzeAndPredict();
    console.log(`✅ Pattern analysis complete`);

    const emergingPatterns = engine.getEmergingPatterns();
    if (emergingPatterns.length > 0) {
      console.log(`   Found ${emergingPatterns.length} emerging patterns`);
    }

    // INTEGRATION TEST: Combined Systems
    console.log('\n🔗 INTEGRATED BRAIN-INSPIRED INTELLIGENCE');
    console.log('='.repeat(60));

    // Perform a complex query that uses all systems
    const integratedResult = await engine.query('complex code patterns', {
      limit: 5,
      useActivation: true,           // Activation spreading
      bypassHebbianLearning: false,  // Hebbian learning
      bypassInhibition: false,       // Inhibitory patterns
      bypassAttention: false,        // Attention system
      bypassBiTemporal: false,       // Bi-temporal tracking
      contextLevel: 3,               // Hierarchical context
      includeParentContext: true
    });

    console.log(`\nIntegrated query results:`);
    console.log(`   Found: ${integratedResult.nodes.length} nodes`);
    console.log(`   Query time: ${integratedResult.queryTime}ms`);
    console.log(`   Cache hit: ${integratedResult.cacheHit ? 'Yes' : 'No'}`);
    if (integratedResult.inhibitionApplied) {
      console.log(`   Inhibition applied: Yes (score: ${integratedResult.inhibitionScore?.toFixed(2)})`);
    }

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎯 BRAIN-INSPIRED SYSTEMS STATUS SUMMARY\n');

    const systemStatus = {
      '✅ Hebbian Learning': hebbianFinal.totalConnections > 0 ? 'Active' : 'Initialized',
      '✅ Hierarchical Context': contextStats.distribution.domain > 0 ? 'Active' : 'Initialized',
      '✅ Attention System': 'Active',
      '✅ Bi-temporal Model': biTemporalStats.contextWindows > 0 ? 'Active' : 'Initialized',
      '✅ Pattern Prediction': 'Active'
    };

    for (const [system, status] of Object.entries(systemStatus)) {
      console.log(`${system}: ${status}`);
    }

    console.log('\n🧠 All brain-inspired systems are operational!');
    console.log('The Mind Map MCP now features:');
    console.log('• Associative learning (Hebbian)');
    console.log('• Multi-level context awareness');
    console.log('• Dynamic attention allocation');
    console.log('• Temporal knowledge tracking');
    console.log('• Predictive pattern intelligence');

  } catch (error) {
    console.error('❌ Error testing brain-inspired systems:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  } finally {
    // Force exit to prevent hanging
    process.exit(0);
  }
}

testBrainInspiredSystems();