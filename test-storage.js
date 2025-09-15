#!/usr/bin/env node

import { MindMapEngine } from './dist/core/MindMapEngine.js';

async function testStorage() {
  console.log('🔍 Testing node storage directly...\n');

  const mindMap = new MindMapEngine(process.cwd());

  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Access storage directly to see what nodes exist
  console.log('=== Checking all nodes with "MindMap" in name ===');
  const allNodes = mindMap.storage.findNodes(node =>
    node.name.toLowerCase().includes('mindmap')
  );

  console.log(`Found ${allNodes.length} nodes with "mindmap" in name:`);
  allNodes.forEach((node, i) => {
    console.log(`${i + 1}. Name: "${node.name}", Type: ${node.type}, Path: ${node.path || 'N/A'}`);
    console.log(`   Properties: ${JSON.stringify(node.properties || {})}`);
    console.log(`   Metadata: ${JSON.stringify(node.metadata || {})}`);
  });

  console.log('\n=== Checking all function nodes ===');
  const functionNodes = mindMap.storage.findNodes(node => node.type === 'function');
  console.log(`Found ${functionNodes.length} function nodes`);

  // Look for queryMindMap specifically
  const queryMindMapNodes = functionNodes.filter(node =>
    node.name.toLowerCase().includes('querymindmap')
  );
  console.log(`Found ${queryMindMapNodes.length} nodes with "querymindmap"`);
  queryMindMapNodes.forEach((node, i) => {
    console.log(`${i + 1}. Name: "${node.name}", Path: ${node.path || 'N/A'}`);
  });

  console.log('\n✅ Storage test completed');
  process.exit(0);
}

testStorage().catch(console.error);