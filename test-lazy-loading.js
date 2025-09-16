#!/usr/bin/env node

import { CallPatternAnalyzer } from './dist/core/CallPatternAnalyzer.js';
import fs from 'fs';
import path from 'path';

async function testLazyLoading() {
  console.log('🧪 Testing Variable Lazy Loading Implementation');
  console.log('=' .repeat(50));

  const analyzer = new CallPatternAnalyzer();

  // Test with a TypeScript file that has variables
  const testFile = './src/core/CallPatternAnalyzer.ts';

  if (!fs.existsSync(testFile)) {
    console.error(`❌ Test file not found: ${testFile}`);
    return;
  }

  try {
    console.log(`📝 Analyzing file: ${testFile}`);
    const startTime = Date.now();

    const result = await analyzer.analyzeFile(testFile);
    const analysisTime = Date.now() - startTime;

    console.log(`\n📊 Analysis Results (${analysisTime}ms):`);
    console.log(`   Total nodes created: ${result.nodes.length}`);
    console.log(`   Total edges created: ${result.edges.length}`);
    console.log(`   Variable declarations found: ${result.variableAnalysis?.declarations.length || 0}`);

    // Count different types of nodes
    const nodeTypes = {};
    result.nodes.forEach(node => {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    });

    console.log(`\n🔍 Node Types:`);
    Object.entries(nodeTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    // Look for lazy loading indicators
    const lazyVariablesSummary = result.nodes.find(node =>
      node.metadata?.isLazySummary === true
    );

    if (lazyVariablesSummary) {
      console.log(`\n🎯 Lazy Loading Summary:`);
      console.log(`   Total variables detected: ${lazyVariablesSummary.metadata.totalVariables}`);
      console.log(`   Variables loaded immediately: ${lazyVariablesSummary.metadata.loadedVariables}`);
      console.log(`   Variables lazy-loaded: ${lazyVariablesSummary.metadata.lazyLoadedCount}`);
      console.log(`   Memory reduction: ${(lazyVariablesSummary.metadata.lazyLoadedCount / lazyVariablesSummary.metadata.totalVariables * 100).toFixed(1)}%`);

      console.log(`\n📈 Variable Categories:`);
      console.log(`   Exported: ${lazyVariablesSummary.metadata.exportedCount}`);
      console.log(`   Global: ${lazyVariablesSummary.metadata.globalCount}`);
      console.log(`   Unused: ${lazyVariablesSummary.metadata.unusedCount}`);
    }

    // Test on-demand loading
    console.log(`\n🔄 Testing On-Demand Variable Loading:`);
    const onDemandStart = Date.now();
    const onDemandResult = await analyzer.loadVariablesOnDemand(testFile, 'variable.*');
    const onDemandTime = Date.now() - onDemandStart;

    console.log(`   On-demand nodes loaded: ${onDemandResult.nodes.length}`);
    console.log(`   On-demand edges loaded: ${onDemandResult.edges.length}`);
    console.log(`   Loading time: ${onDemandTime}ms`);
    console.log(`   Pattern matches: ${onDemandResult.summary.matchedPattern}`);

    // Test lazy variable summary
    const lazySummary = analyzer.getLazyVariableSummary(testFile);
    console.log(`\n📊 Lazy Variable Statistics:`);
    console.log(`   Total variables: ${lazySummary.totalVariables}`);
    console.log(`   Currently loaded: ${lazySummary.currentlyLoaded}`);
    console.log(`   Available for loading: ${lazySummary.availableForLoading}`);
    console.log(`   Memory reduction: ${lazySummary.memoryReduction}`);
    console.log(`   Exported variables: ${lazySummary.exportedVariables}`);
    console.log(`   Global variables: ${lazySummary.globalVariables}`);
    console.log(`   Unused variables: ${lazySummary.unusedVariables}`);

    console.log(`\n✅ Lazy Loading Test Completed Successfully!`);
    console.log(`🎯 Memory Usage Reduced by ${lazySummary.memoryReduction}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testLazyLoading().catch(console.error);