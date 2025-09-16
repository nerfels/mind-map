#!/usr/bin/env node

import { CallPatternAnalyzer } from './dist/core/CallPatternAnalyzer.js';
import fs from 'fs';

async function testVariableDetection() {
  console.log('Testing variable detection in CallPatternAnalyzer...');

  const analyzer = new CallPatternAnalyzer();

  // Test on a simple TypeScript file
  const testFile = './src/core/MindMapEngine.ts';

  try {
    console.log(`\nAnalyzing file: ${testFile}`);
    const result = await analyzer.analyzeFile(testFile);

    console.log('\n=== Analysis Results ===');
    console.log(`Total nodes: ${result.nodes.length}`);
    console.log(`Total edges: ${result.edges.length}`);
    console.log(`Call patterns: ${result.callPatterns.length}`);
    console.log(`Variable declarations: ${result.variableAnalysis?.declarations.length || 0}`);
    console.log(`Variable usages: ${result.variableAnalysis?.usages.length || 0}`);

    // Show variable nodes
    const variableNodes = result.nodes.filter(n => n.type === 'variable');
    console.log(`\n=== Variable Nodes (${variableNodes.length}) ===`);
    variableNodes.slice(0, 5).forEach(node => {
      console.log(`- ${node.name} (${node.metadata?.variableType || 'unknown'}) at line ${node.metadata?.lineNumber || '?'}`);
    });

    // Show variable usage edges
    const usageEdges = result.edges.filter(e => e.type === 'used_by');
    console.log(`\n=== Variable Usage Edges (${usageEdges.length}) ===`);
    usageEdges.slice(0, 5).forEach(edge => {
      console.log(`- ${edge.source} used by ${edge.target} (${edge.metadata?.usageType || 'unknown'})`);
    });

    console.log('\n✅ Variable detection test completed!');

  } catch (error) {
    console.error('❌ Error during analysis:', error);
  }
}

testVariableDetection().catch(console.error);