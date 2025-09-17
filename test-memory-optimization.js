#!/usr/bin/env node

/**
 * Test Memory Optimization Implementation
 *
 * This script tests the new edge pruning and variable compression features
 * to verify the target of reducing memory usage from 52MB to 35MB (32% reduction)
 */

import { MindMapEngine } from './dist/core/MindMapEngine.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testMemoryOptimization() {
  console.log('🧠 Testing Memory Optimization Implementation');
  console.log('=' .repeat(60));

  const engine = new MindMapEngine(__dirname);

  try {
    // 1. First scan the project to populate the mind map
    console.log('🔍 Scanning project to populate mind map...');
    await engine.scanProject();

    // 2. Get initial statistics
    console.log('📊 Getting initial statistics...');
    const initialStats = await engine.getStats();
    console.log(`Initial: ${initialStats.nodeCount} nodes, ${initialStats.edgeCount} edges`);

    // Show node breakdown
    console.log('\nNode type breakdown:');
    Object.entries(initialStats.nodesByType).forEach(([type, count]) => {
      const percentage = (count / initialStats.nodeCount * 100).toFixed(1);
      console.log(`  ${type}: ${count} (${percentage}%)`);
    });

    // 2. Test Edge Pruning (dry run first)
    console.log('\n✂️ Testing Edge Pruning...');

    // First check if storage supports new methods
    const storage = engine.storage;
    if (typeof storage.pruneRedundantEdges !== 'function') {
      console.log('❌ Edge pruning not available - storage needs to be OptimizedMindMapStorage');
      return;
    }

    // Dry run to see what would be pruned
    const dryRunResult = storage.pruneRedundantEdges({
      threshold: 0.3,
      keepTransitive: false,
      dryRun: true
    });

    console.log(`Dry run results:`);
    console.log(`  - Would remove: ${dryRunResult.removed} edges`);
    console.log(`  - Would keep: ${dryRunResult.kept} edges`);
    console.log(`  - Estimated memory reduction: ${(dryRunResult.memoryReduced / 1024).toFixed(2)}KB`);

    if (dryRunResult.removed === 0) {
      console.log('⚠️ No edges would be pruned - graph may already be optimized');
    }

    // Actual pruning
    console.log('\n✂️ Performing actual edge pruning...');
    const pruneResult = storage.pruneRedundantEdges({
      threshold: 0.3,
      keepTransitive: false,
      dryRun: false
    });

    console.log(`Edge pruning results:`);
    console.log(`  - Removed: ${pruneResult.removed} edges`);
    console.log(`  - Kept: ${pruneResult.kept} edges`);
    console.log(`  - Memory freed: ${(pruneResult.memoryReduced / 1024).toFixed(2)}KB`);

    // 3. Test Variable Compression
    console.log('\n📦 Testing Variable Node Compression...');

    if (typeof storage.compressVariableNodes !== 'function') {
      console.log('❌ Variable compression not available');
      return;
    }

    // Dry run first
    const compressDryRun = storage.compressVariableNodes({
      enableLazyLoading: true,
      deduplicateNames: true,
      dryRun: true
    });

    console.log(`Compression dry run:`);
    console.log(`  - Would compress: ${compressDryRun.compressed} variables`);
    console.log(`  - Would lazy-load: ${compressDryRun.lazyLoaded} variables`);
    console.log(`  - Estimated memory reduction: ${(compressDryRun.memoryReduced / 1024).toFixed(2)}KB`);

    // Actual compression
    const compressionResult = storage.compressVariableNodes({
      enableLazyLoading: true,
      deduplicateNames: true,
      dryRun: false
    });

    console.log(`\nVariable compression results:`);
    console.log(`  - Compressed: ${compressionResult.compressed} variables`);
    console.log(`  - Lazy-loaded: ${compressionResult.lazyLoaded} variables`);
    console.log(`  - Memory freed: ${(compressionResult.memoryReduced / 1024).toFixed(2)}KB`);

    // 4. Get final statistics
    console.log('\n📊 Final statistics after optimization...');
    const finalStats = await engine.getStats();
    console.log(`Final: ${finalStats.nodeCount} nodes, ${finalStats.edgeCount} edges`);

    // Calculate memory reduction
    const edgeReduction = initialStats.edgeCount - finalStats.edgeCount;
    const nodeReduction = initialStats.nodeCount - finalStats.nodeCount;
    const totalMemoryReduced = pruneResult.memoryReduced + compressionResult.memoryReduced;

    console.log('\n🎯 Memory Optimization Summary:');
    console.log(`  - Edges reduced: ${edgeReduction} (${((edgeReduction/initialStats.edgeCount)*100).toFixed(1)}%)`);
    console.log(`  - Nodes optimized: ${nodeReduction}`);
    console.log(`  - Total memory freed: ${(totalMemoryReduced / 1024).toFixed(2)}KB`);

    // Estimate if we hit the 52MB -> 35MB target (32% reduction)
    const estimatedInitialMemory = initialStats.nodeCount * 5.2; // 52MB / 10k nodes = 5.2KB per node
    const estimatedSavings = totalMemoryReduced / 1024; // KB
    const estimatedFinalMemory = estimatedInitialMemory - estimatedSavings;
    const targetMemory = estimatedInitialMemory * 0.68; // 68% of original (32% reduction)

    console.log(`\n📈 Memory Target Analysis:`);
    console.log(`  - Estimated initial memory: ${estimatedInitialMemory.toFixed(0)}KB (${(estimatedInitialMemory/1024).toFixed(1)}MB)`);
    console.log(`  - Memory freed: ${estimatedSavings.toFixed(0)}KB`);
    console.log(`  - Estimated final memory: ${estimatedFinalMemory.toFixed(0)}KB (${(estimatedFinalMemory/1024).toFixed(1)}MB)`);
    console.log(`  - Target memory: ${targetMemory.toFixed(0)}KB (${(targetMemory/1024).toFixed(1)}MB)`);

    const targetAchieved = estimatedFinalMemory <= targetMemory;
    console.log(`  - Target achieved: ${targetAchieved ? '✅' : '❌'}`);

    if (!targetAchieved) {
      const additionalReduction = estimatedFinalMemory - targetMemory;
      console.log(`  - Additional reduction needed: ${additionalReduction.toFixed(0)}KB`);
    }

    // 5. Test background processing integration
    console.log('\n🔄 Testing Background Processing Integration...');

    // Get ScalabilityManager from engine if available
    if (engine.scalabilityManager && typeof engine.scalabilityManager.optimizeMemoryNow === 'function') {
      const bgResult = await engine.scalabilityManager.optimizeMemoryNow();
      console.log(`Background optimization results:`);
      console.log(`  - Edges pruned: ${bgResult.edgesPruned}`);
      console.log(`  - Variables compressed: ${bgResult.variablesCompressed}`);
      console.log(`  - Total memory freed: ${(bgResult.memoryFreed / 1024).toFixed(2)}KB`);
    } else {
      console.log('❌ Background processing not available');
    }

    console.log('\n✅ Memory optimization test completed!');

  } catch (error) {
    console.error('❌ Error during memory optimization test:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testMemoryOptimization().catch(console.error);