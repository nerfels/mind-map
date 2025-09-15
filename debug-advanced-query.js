#!/usr/bin/env node

import { MindMapEngine } from './dist/core/MindMapEngine.js';

async function debugAdvancedQuery() {
  console.log('🔍 Debugging advanced query parsing and execution...\n');

  const mindMap = new MindMapEngine(process.cwd());
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Force a scan to ensure nodes are loaded
  console.log('Scanning project...');
  await mindMap.scanProject();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Get some sample nodes
  const allNodes = Array.from(mindMap.storage.getGraph().nodes.values());
  console.log(`Found ${allNodes.length} total nodes\n`);

  // Test a few file nodes
  const fileNodes = allNodes.filter(n => n.type === 'file').slice(0, 3);
  console.log('Sample file nodes:');
  fileNodes.forEach(node => {
    console.log(`  ${node.id}: ${node.name} (type: ${node.type})`);
  });
  console.log('');

  // Now test the advanced query engine directly
  const advancedEngine = mindMap.advancedQueryEngine;

  try {
    console.log('=== Testing Advanced Query ===');
    const query = 'MATCH (n) WHERE n.type = \'file\' RETURN n.name LIMIT 3';
    console.log(`Query: ${query}`);

    const result = await advancedEngine.executeQuery(query);
    console.log(`Result: ${result.nodes.length} matches found`);
    console.log(`Query time: ${result.queryTime}ms`);

    if (result.nodes.length > 0) {
      console.log('Matched nodes:');
      result.nodes.forEach(node => {
        console.log(`  ${node.id}: ${node.name} (type: ${node.type})`);
      });
    } else {
      console.log('No matches found - this is the bug!');
    }

  } catch (error) {
    console.error('Query failed:', error.message);
  }

  console.log('\n✅ Advanced query debugging completed');
  process.exit(0);
}

debugAdvancedQuery().catch(console.error);