#!/usr/bin/env node

import { MindMapEngine } from './dist/core/MindMapEngine.js';

async function testLocalQuery() {
  console.log('🔍 Testing local MindMapEngine query directly...\n');

  const mindMap = new MindMapEngine(process.cwd());

  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('=== Testing MindMapEngine class query ===');
  const result1 = await mindMap.query('MindMapEngine', {
    limit: 10,
    bypassInhibition: true,
    bypassAttention: true,
    bypassBiTemporal: true,
    bypassMultiModalFusion: true
  });

  console.log(`Result: nodes=${result1.nodes.length}, total=${result1.totalMatches}`);
  if (result1.nodes.length > 0) {
    console.log('First node:', result1.nodes[0].name, result1.nodes[0].type);
  }

  console.log('\n=== Testing queryMindMap function query ===');
  const result2 = await mindMap.query('queryMindMap', {
    limit: 10,
    bypassInhibition: true,
    bypassAttention: true,
    bypassBiTemporal: true,
    bypassMultiModalFusion: true
  });

  console.log(`Result: nodes=${result2.nodes.length}, total=${result2.totalMatches}`);
  if (result2.nodes.length > 0) {
    console.log('First node:', result2.nodes[0].name, result2.nodes[0].type);
  }

  console.log('\n✅ Local query test completed');
  process.exit(0);
}

testLocalQuery().catch(console.error);