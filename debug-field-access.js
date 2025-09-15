#!/usr/bin/env node

import { MindMapEngine } from './dist/core/MindMapEngine.js';

async function testFieldAccess() {
  console.log('🔍 Testing field access directly...\n');

  const mindMap = new MindMapEngine(process.cwd());
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Force a scan to ensure nodes are loaded
  console.log('Scanning project...');
  await mindMap.scanProject();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Get first few nodes to test field access
  const allNodes = Array.from(mindMap.storage.getGraph().nodes.values());
  console.log(`Found ${allNodes.length} total nodes\n`);

  // Test first 5 nodes
  const testNodes = allNodes.slice(0, 5);

  testNodes.forEach((node, i) => {
    console.log(`=== Node ${i + 1} ===`);
    console.log(`ID: ${node.id}`);
    console.log(`Name: ${node.name}`);
    console.log(`Type: ${node.type}`);
    console.log(`Type field exists on node:`, 'type' in node);
    console.log(`Direct type access: ${node.type}`);
    console.log(`Object keys:`, Object.keys(node));
    if (node.metadata) {
      console.log(`Metadata keys:`, Object.keys(node.metadata));
      console.log(`Type in metadata:`, 'type' in node.metadata);
    }
    console.log('');
  });

  // Test aggregate grouping logic
  console.log('=== Testing Grouping Logic ===');
  const typeGroups = new Map();

  for (const node of allNodes) {
    const nodeType = node.type;
    if (!typeGroups.has(nodeType)) {
      typeGroups.set(nodeType, []);
    }
    typeGroups.get(nodeType).push(node);
  }

  console.log('Group counts by type:');
  for (const [type, nodes] of typeGroups.entries()) {
    console.log(`  ${type}: ${nodes.length} nodes`);
  }

  console.log('\n✅ Field access test completed');
  process.exit(0);
}

testFieldAccess().catch(console.error);