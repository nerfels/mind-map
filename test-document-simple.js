#!/usr/bin/env node

/**
 * Simple Document Intelligence Test (Phase 7.5)
 * Tests the basic document analysis functionality
 */

import { MindMapEngine } from './dist/core/MindMapEngine.js';
import fs from 'fs/promises';
import path from 'path';

const projectRoot = process.cwd();

async function runSimpleDocumentTest() {
  console.log('🧠📚 Simple Document Intelligence Test (Phase 7.5)');
  console.log('=' .repeat(50));

  try {
    // Initialize the mind map
    const mindMap = new MindMapEngine(projectRoot);
    await mindMap.initialize();

    // Create a simple test markdown file
    const testMarkdownPath = path.join(projectRoot, 'simple-test.md');
    const testContent = `# Test Document

This is a simple test document.

## Features

- Link to [source code](./src/core/MindMapEngine.ts)
- External link to [GitHub](https://github.com)

## Code Example

\`\`\`javascript
function test() {
  return "Hello World";
}
\`\`\`
`;

    await fs.writeFile(testMarkdownPath, testContent);

    console.log('📝 Created test markdown file');

    // Test 1: Analyze project documentation
    console.log('\n1. Testing analyze_project_documentation...');
    try {
      const result = await mindMap.analyzeProjectDocumentation();
      console.log(`✅ Found ${result.analyses?.length || 0} documents`);
      console.log(`📊 Total words: ${result.statistics?.totalWords || 0}`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    // Test 2: Get documentation statistics
    console.log('\n2. Testing get_documentation_statistics...');
    try {
      const stats = await mindMap.getDocumentationStatistics();
      console.log(`✅ Statistics generated`);
      console.log(`📄 Total documents: ${stats.totalDocuments || 0}`);
      console.log(`🔗 Total links: ${stats.totalLinks || 0}`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    // Test 3: Get documentation insights
    console.log('\n3. Testing get_documentation_insights...');
    try {
      const insights = await mindMap.getDocumentationInsights();
      console.log(`✅ Found ${insights.length} insights`);
      if (insights.length > 0) {
        console.log(`💡 First insight: ${insights[0].title}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    // Test 4: Get document relationships
    console.log('\n4. Testing get_document_relationships...');
    try {
      const relationships = await mindMap.getDocumentRelationships();
      console.log(`✅ Found ${relationships.length} relationships`);
      if (relationships.length > 0) {
        console.log(`🔗 First relationship: ${relationships[0].relationType}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    // Test 5: Analyze specific document
    console.log('\n5. Testing analyze_document...');
    try {
      const analysis = await mindMap.analyzeDocument(testMarkdownPath);
      console.log(`✅ Document analyzed`);
      console.log(`📋 Headers: ${analysis.structure?.headers?.length || 0}`);
      console.log(`🔗 Links: ${analysis.links?.length || 0}`);
      console.log(`💻 Code blocks: ${analysis.structure?.codeBlocks?.length || 0}`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    // Clean up
    await fs.unlink(testMarkdownPath);
    console.log('\n🧹 Cleaned up test file');

    console.log('\n✨ Document Intelligence Test completed!');

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
runSimpleDocumentTest().catch(console.error);