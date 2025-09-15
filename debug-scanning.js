#!/usr/bin/env node

import { FileScanner } from './dist/core/FileScanner.js';
import { MindMapStorage } from './dist/core/MindMapStorage.js';

async function debugScanning() {
  console.log('🔍 Debugging file scanning...\n');

  // Test FileScanner directly
  const scanner = new FileScanner('./');
  console.log('📁 Testing FileScanner...');
  const files = await scanner.scanProject();

  console.log(`Found ${files.length} files total`);

  // Filter for TypeScript files
  const tsFiles = files.filter(f => f.extension === 'ts');
  console.log(`Found ${tsFiles.length} TypeScript files:`);

  tsFiles.slice(0, 5).forEach(file => {
    console.log(`  - ${file.path} (${file.type})`);
  });

  // Test with specific src files
  const srcFiles = files.filter(f => f.path.startsWith('src/'));
  console.log(`\nFound ${srcFiles.length} files in src/ directory:`);

  srcFiles.slice(0, 5).forEach(file => {
    console.log(`  - ${file.path} (${file.type})`);
  });

  // Test storage
  console.log('\n📊 Testing MindMapStorage...');
  const storage = new MindMapStorage('./');
  await storage.initialize();

  // Add a few test files manually
  const testFile = files.find(f => f.path.includes('MindMapEngine.ts'));
  if (testFile) {
    console.log(`Adding test file: ${testFile.path}`);
    storage.addNode({
      id: testFile.path,
      name: testFile.name,
      type: 'file',
      path: testFile.path,
      metadata: {},
      confidence: 0.8,
      lastUpdated: new Date()
    });

    await storage.save();

    // Test querying
    const graph = storage.getGraph();
    console.log(`Nodes in storage: ${graph.nodes.size}`);

    // Search for the added node
    const foundNodes = storage.findNodes(node => node.path.includes('MindMapEngine'));
    console.log(`Found nodes with 'MindMapEngine': ${foundNodes.length}`);
  }
}

debugScanning().catch(console.error);