#!/usr/bin/env node

import { MindMapEngine } from './dist/core/MindMapEngine.js';

async function testQueries() {
  console.log('🚀 Testing Query Fixes');
  console.log('=' .repeat(60));

  const engine = new MindMapEngine('/data/data/com.termux/files/home/projects/mind-map');
  await engine.initialize();

  const testCases = [
    {
      name: 'Multi-word query: "mind map"',
      query: 'mind map',
      expectedToFind: 'MindMapEngine or related'
    },
    {
      name: 'File path query: "src/core/MindMapEngine.ts"',
      query: 'src/core/MindMapEngine.ts',
      expectedToFind: 'MindMapEngine.ts file'
    },
    {
      name: 'Language semantic: "typescript"',
      query: 'typescript',
      expectedToFind: '.ts files'
    },
    {
      name: 'Language semantic: "javascript"',
      query: 'javascript',
      expectedToFind: '.js files'
    },
    {
      name: 'Java query',
      query: 'java',
      expectedToFind: 'Java-related files'
    },
    {
      name: 'MindMapEngine query',
      query: 'MindMapEngine',
      expectedToFind: 'MindMapEngine class'
    }
  ];

  for (const test of testCases) {
    console.log(`\n📝 ${test.name}`);
    console.log(`   Query: "${test.query}"`);
    console.log(`   Expected: ${test.expectedToFind}`);

    try {
      const result = await engine.query(test.query, {
        limit: 5,
        useActivation: false
      });

      if (result.nodes.length > 0) {
        console.log(`   ✅ Found ${result.nodes.length} results:`);
        result.nodes.slice(0, 3).forEach((node, i) => {
          console.log(`      ${i+1}. ${node.name} (${node.type}) - confidence: ${node.confidence?.toFixed(2)}`);
        });
      } else {
        console.log(`   ❌ No results found`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('✅ Test Complete');
}

testQueries().catch(console.error);