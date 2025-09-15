#!/usr/bin/env node

import { MindMapEngine } from './dist/core/MindMapEngine.js';

async function debugQuery() {
  console.log('🔍 Debugging query issue...\n');

  const engine = new MindMapEngine('./');
  await engine.initialize();

  // Force scan
  console.log('📁 Scanning project...');
  await engine.scanProject(true, true);

  // Get basic stats
  const stats = engine.getStats();
  console.log('📊 Stats:', stats);

  // Try to get some nodes directly from storage
  console.log('\n🗂️  Direct storage access:');
  const storage = engine.storage;
  const graph = storage.getGraph();
  console.log('Nodes in graph:', graph.nodes.size);
  console.log('Edges in graph:', graph.edges.size);

  // Show first few nodes
  let count = 0;
  for (const [id, node] of graph.nodes) {
    if (count < 5) {
      console.log(`Node ${count + 1}:`, {
        id,
        type: node.type,
        name: node.name,
        path: node.path
      });
      count++;
    }
  }

  // Test different query methods
  console.log('\n🔍 Testing query methods:');

  try {
    const basicQuery = await engine.query('MindMapEngine');
    console.log('Basic query result:', basicQuery.nodes?.length || 0, 'nodes');
  } catch (err) {
    console.error('Basic query error:', err.message);
  }

  try {
    const advancedQuery = await engine.executeAdvancedQuery('MATCH (n) RETURN n LIMIT 3');
    console.log('Advanced query result:', advancedQuery);
  } catch (err) {
    console.error('Advanced query error:', err.message);
  }
}

debugQuery().catch(console.error);