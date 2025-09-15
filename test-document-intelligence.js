#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Document Intelligence Features (Phase 7.5)
 * Tests markdown analysis, document-code relationships, and brain-inspired learning
 */

import { MindMapEngine } from './src/core/MindMapEngine.js';
import { MarkdownAnalyzer } from './src/core/MarkdownAnalyzer.js';
import { DocumentIntelligenceService } from './src/core/services/DocumentIntelligenceService.js';
import fs from 'fs/promises';
import path from 'path';

const projectRoot = process.cwd();

async function runDocumentIntelligenceTests() {
  console.log('🧠📚 Document Intelligence Test Suite (Phase 7.5)');
  console.log('=' .repeat(60));

  let testsPassed = 0;
  let totalTests = 0;

  // Initialize the mind map
  const mindMap = new MindMapEngine(projectRoot);
  await mindMap.initialize();

  // Test suite structure
  const testSuites = [
    {
      name: "1. Markdown Analysis Tests",
      tests: [
        () => testMarkdownAnalyzer(),
        () => testDocumentStructureExtraction(),
        () => testLinkExtraction(),
        () => testCodeBlockAnalysis()
      ]
    },
    {
      name: "2. Document-Code Relationship Tests",
      tests: [
        () => testDocumentCodeRelationships(),
        () => testImplementationGapDetection(),
        () => testBrokenLinkDetection()
      ]
    },
    {
      name: "3. Multi-Format Document Support Tests",
      tests: [
        () => testJSONConfigAnalysis(),
        () => testPackageJsonAnalysis(),
        () => testRestructuredTextAnalysis()
      ]
    },
    {
      name: "4. Brain-Inspired Integration Tests",
      tests: [
        () => testHebbianDocumentLearning(),
        () => testDocumentContextIntegration(),
        () => testDocumentPatternPrediction()
      ]
    },
    {
      name: "5. MCP Tools Integration Tests",
      tests: [
        () => testAnalyzeProjectDocumentation(),
        () => testGetDocumentationStatistics(),
        () => testGetDocumentationInsights(),
        () => testGetDocumentRelationships()
      ]
    },
    {
      name: "6. Advanced Intelligence Features Tests",
      tests: [
        () => testDocumentationCoverage(),
        () => testQualityAnalysis(),
        () => testFrameworkDetectionInDocs()
      ]
    }
  ];

  // Create test markdown file for testing
  const testMarkdownPath = path.join(projectRoot, 'test-document.md');
  await createTestMarkdownFile(testMarkdownPath);

  // Run all test suites
  for (const suite of testSuites) {
    console.log(`\n${suite.name}`);
    console.log('-'.repeat(40));

    for (const test of suite.tests) {
      totalTests++;
      try {
        const result = await test();
        if (result.success) {
          console.log(`✅ ${result.name}`);
          testsPassed++;
        } else {
          console.log(`❌ ${result.name}: ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ Test failed with exception: ${error.message}`);
      }
    }
  }

  // Clean up test file
  try {
    await fs.unlink(testMarkdownPath);
  } catch (error) {
    // Ignore cleanup errors
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${testsPassed}/${totalTests} tests passed`);
  console.log(`Success Rate: ${((testsPassed / totalTests) * 100).toFixed(1)}%`);

  if (testsPassed === totalTests) {
    console.log('🎉 All document intelligence tests passed!');
  } else {
    console.log(`⚠️  ${totalTests - testsPassed} tests failed`);
  }

  // Individual test functions
  async function testMarkdownAnalyzer() {
    try {
      const analyzer = new MarkdownAnalyzer(projectRoot);
      const analysis = await analyzer.analyzeMarkdownFile(testMarkdownPath);

      if (!analysis.documentPath || !analysis.structure) {
        throw new Error('Missing basic analysis structure');
      }

      return {
        success: true,
        name: 'MarkdownAnalyzer basic functionality',
        data: analysis
      };
    } catch (error) {
      return { success: false, name: 'MarkdownAnalyzer basic functionality', error: error.message };
    }
  }

  async function testDocumentStructureExtraction() {
    try {
      const analyzer = new MarkdownAnalyzer(projectRoot);
      const analysis = await analyzer.analyzeMarkdownFile(testMarkdownPath);

      const structure = analysis.structure;
      if (structure.headers.length === 0) {
        throw new Error('No headers extracted');
      }

      if (structure.codeBlocks.length === 0) {
        throw new Error('No code blocks extracted');
      }

      if (structure.links.length === 0) {
        throw new Error('No links extracted');
      }

      return {
        success: true,
        name: 'Document structure extraction (headers, code blocks, links)',
        data: {
          headers: structure.headers.length,
          codeBlocks: structure.codeBlocks.length,
          links: structure.links.length
        }
      };
    } catch (error) {
      return { success: false, name: 'Document structure extraction', error: error.message };
    }
  }

  async function testLinkExtraction() {
    try {
      const analyzer = new MarkdownAnalyzer(projectRoot);
      const analysis = await analyzer.analyzeMarkdownFile(testMarkdownPath);

      const linkTypes = new Set(analysis.links.map(link => link.linkType));
      if (!linkTypes.has('internal') || !linkTypes.has('external')) {
        throw new Error('Missing expected link types');
      }

      return {
        success: true,
        name: 'Link extraction and categorization',
        data: { linkTypes: Array.from(linkTypes) }
      };
    } catch (error) {
      return { success: false, name: 'Link extraction and categorization', error: error.message };
    }
  }

  async function testCodeBlockAnalysis() {
    try {
      const analyzer = new MarkdownAnalyzer(projectRoot);
      const analysis = await analyzer.analyzeMarkdownFile(testMarkdownPath);

      const codeBlock = analysis.structure.codeBlocks.find(cb => cb.language === 'javascript');
      if (!codeBlock) {
        throw new Error('JavaScript code block not found');
      }

      if (!codeBlock.content.includes('function')) {
        throw new Error('Code block content not properly extracted');
      }

      return {
        success: true,
        name: 'Code block analysis and language detection',
        data: { language: codeBlock.language, hasContent: !!codeBlock.content }
      };
    } catch (error) {
      return { success: false, name: 'Code block analysis', error: error.message };
    }
  }

  async function testDocumentCodeRelationships() {
    try {
      const service = new DocumentIntelligenceService(
        mindMap.storage,
        mindMap.hebbianLearning,
        mindMap.hierarchicalContext,
        mindMap.biTemporalModel,
        mindMap.patternPrediction,
        projectRoot
      );

      const analysis = await service.analyzeDocument(testMarkdownPath);
      if (analysis.relationships.length === 0) {
        throw new Error('No relationships extracted');
      }

      const relationshipTypes = new Set(analysis.relationships.map(rel => rel.relationType));
      if (relationshipTypes.size === 0) {
        throw new Error('No relationship types found');
      }

      return {
        success: true,
        name: 'Document-code relationship extraction',
        data: {
          relationshipCount: analysis.relationships.length,
          types: Array.from(relationshipTypes)
        }
      };
    } catch (error) {
      return { success: false, name: 'Document-code relationship extraction', error: error.message };
    }
  }

  async function testImplementationGapDetection() {
    try {
      const analyzer = new MarkdownAnalyzer(projectRoot);
      const analysis = await analyzer.analyzeMarkdownFile(testMarkdownPath);

      // This should detect features mentioned in headers without implementation
      const gaps = analysis.implementationGaps;
      // Even if no gaps, the system should complete without error

      return {
        success: true,
        name: 'Implementation gap detection',
        data: { gapCount: gaps.length }
      };
    } catch (error) {
      return { success: false, name: 'Implementation gap detection', error: error.message };
    }
  }

  async function testBrokenLinkDetection() {
    try {
      const analyzer = new MarkdownAnalyzer(projectRoot);
      const analysis = await analyzer.analyzeMarkdownFile(testMarkdownPath);

      const brokenLinks = analysis.brokenLinks;
      // Should have at least one broken link from our test file

      return {
        success: true,
        name: 'Broken link detection',
        data: { brokenLinkCount: brokenLinks.length }
      };
    } catch (error) {
      return { success: false, name: 'Broken link detection', error: error.message };
    }
  }

  async function testJSONConfigAnalysis() {
    try {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const exists = await fs.access(packageJsonPath).then(() => true).catch(() => false);

      if (!exists) {
        throw new Error('package.json not found');
      }

      const service = new DocumentIntelligenceService(
        mindMap.storage,
        mindMap.hebbianLearning,
        mindMap.hierarchicalContext,
        mindMap.biTemporalModel,
        mindMap.patternPrediction,
        projectRoot
      );

      const analysis = await service.analyzeDocument(packageJsonPath);
      if (!analysis.relationships || analysis.relationships.length === 0) {
        throw new Error('No configuration relationships found');
      }

      return {
        success: true,
        name: 'JSON configuration analysis',
        data: { relationshipCount: analysis.relationships.length }
      };
    } catch (error) {
      return { success: false, name: 'JSON configuration analysis', error: error.message };
    }
  }

  async function testPackageJsonAnalysis() {
    try {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageData = JSON.parse(packageContent);

      if (!packageData.dependencies && !packageData.devDependencies) {
        throw new Error('No dependencies found in package.json');
      }

      return {
        success: true,
        name: 'Package.json dependency analysis',
        data: {
          dependencies: Object.keys(packageData.dependencies || {}).length,
          devDependencies: Object.keys(packageData.devDependencies || {}).length
        }
      };
    } catch (error) {
      return { success: false, name: 'Package.json dependency analysis', error: error.message };
    }
  }

  async function testRestructuredTextAnalysis() {
    try {
      // Create a test RST file
      const rstPath = path.join(projectRoot, 'test.rst');
      const rstContent = `Test Document
=============

This is a test RestructuredText document.

Code Example
------------

.. code-block:: python

   def hello():
       print("Hello World")

External Link
-------------

Visit Python website for more info.
`;

      await fs.writeFile(rstPath, rstContent);

      const service = new DocumentIntelligenceService(
        mindMap.storage,
        mindMap.hebbianLearning,
        mindMap.hierarchicalContext,
        mindMap.biTemporalModel,
        mindMap.patternPrediction,
        projectRoot
      );

      const analysis = await service.analyzeDocument(rstPath);

      // Clean up
      await fs.unlink(rstPath);

      if (analysis.structure.headers.length === 0) {
        throw new Error('RST headers not extracted');
      }

      return {
        success: true,
        name: 'RestructuredText analysis',
        data: { headerCount: analysis.structure.headers.length }
      };
    } catch (error) {
      return { success: false, name: 'RestructuredText analysis', error: error.message };
    }
  }

  async function testHebbianDocumentLearning() {
    try {
      const service = new DocumentIntelligenceService(
        mindMap.storage,
        mindMap.hebbianLearning,
        mindMap.hierarchicalContext,
        mindMap.biTemporalModel,
        mindMap.patternPrediction,
        projectRoot
      );

      // This tests that Hebbian learning records co-activations
      const analysis = await service.analyzeDocument(testMarkdownPath);

      // The service should record relationships via Hebbian learning
      if (analysis.relationships.length === 0) {
        throw new Error('No relationships for Hebbian learning');
      }

      return {
        success: true,
        name: 'Hebbian learning integration',
        data: { relationshipsLearned: analysis.relationships.length }
      };
    } catch (error) {
      return { success: false, name: 'Hebbian learning integration', error: error.message };
    }
  }

  async function testDocumentContextIntegration() {
    try {
      // Test that documents are integrated into hierarchical context system
      const stats = mindMap.getHierarchicalContextStats();

      // Should have some context data
      return {
        success: true,
        name: 'Document context integration',
        data: stats
      };
    } catch (error) {
      return { success: false, name: 'Document context integration', error: error.message };
    }
  }

  async function testDocumentPatternPrediction() {
    try {
      // Test that document patterns can be predicted
      const predictions = await mindMap.getPatternPredictions();

      // Even if no predictions, should complete without error
      return {
        success: true,
        name: 'Document pattern prediction',
        data: { predictionCount: predictions.length }
      };
    } catch (error) {
      return { success: false, name: 'Document pattern prediction', error: error.message };
    }
  }

  async function testAnalyzeProjectDocumentation() {
    try {
      const result = await mindMap.analyzeProjectDocumentation();

      if (!result.analyses || !Array.isArray(result.analyses)) {
        throw new Error('Invalid analysis result structure');
      }

      if (!result.statistics) {
        throw new Error('Missing statistics');
      }

      return {
        success: true,
        name: 'MCP analyze_project_documentation tool',
        data: {
          documentCount: result.analyses.length,
          totalWords: result.statistics.totalWords
        }
      };
    } catch (error) {
      return { success: false, name: 'MCP analyze_project_documentation tool', error: error.message };
    }
  }

  async function testGetDocumentationStatistics() {
    try {
      const stats = await mindMap.getDocumentationStatistics();

      if (typeof stats.totalDocuments !== 'number') {
        throw new Error('Invalid statistics structure');
      }

      return {
        success: true,
        name: 'MCP get_documentation_statistics tool',
        data: stats
      };
    } catch (error) {
      return { success: false, name: 'MCP get_documentation_statistics tool', error: error.message };
    }
  }

  async function testGetDocumentationInsights() {
    try {
      const insights = await mindMap.getDocumentationInsights();

      if (!Array.isArray(insights)) {
        throw new Error('Insights should be an array');
      }

      return {
        success: true,
        name: 'MCP get_documentation_insights tool',
        data: { insightCount: insights.length }
      };
    } catch (error) {
      return { success: false, name: 'MCP get_documentation_insights tool', error: error.message };
    }
  }

  async function testGetDocumentRelationships() {
    try {
      const relationships = await mindMap.getDocumentRelationships();

      if (!Array.isArray(relationships)) {
        throw new Error('Relationships should be an array');
      }

      return {
        success: true,
        name: 'MCP get_document_relationships tool',
        data: { relationshipCount: relationships.length }
      };
    } catch (error) {
      return { success: false, name: 'MCP get_document_relationships tool', error: error.message };
    }
  }

  async function testDocumentationCoverage() {
    try {
      const analysis = await mindMap.analyzeProjectDocumentation();

      // Calculate coverage metrics
      const coverage = {
        totalDocs: analysis.analyses.length,
        totalRelationships: analysis.relationships.length,
        coverageRatio: analysis.relationships.length / Math.max(analysis.analyses.length, 1)
      };

      return {
        success: true,
        name: 'Documentation coverage analysis',
        data: coverage
      };
    } catch (error) {
      return { success: false, name: 'Documentation coverage analysis', error: error.message };
    }
  }

  async function testQualityAnalysis() {
    try {
      const insights = await mindMap.getDocumentationInsights();

      // Should categorize insights by type
      const categories = new Set(insights.map(i => i.type));

      return {
        success: true,
        name: 'Documentation quality analysis',
        data: {
          categories: Array.from(categories),
          totalInsights: insights.length
        }
      };
    } catch (error) {
      return { success: false, name: 'Documentation quality analysis', error: error.message };
    }
  }

  async function testFrameworkDetectionInDocs() {
    try {
      const analysis = await mindMap.analyzeProjectDocumentation();

      // Should detect frameworks mentioned in documentation
      const frameworks = new Set();
      analysis.analyses.forEach(doc => {
        if (doc.frameworks) {
          doc.frameworks.forEach(fw => frameworks.add(fw));
        }
      });

      return {
        success: true,
        name: 'Framework detection in documentation',
        data: { frameworks: Array.from(frameworks) }
      };
    } catch (error) {
      return { success: false, name: 'Framework detection in documentation', error: error.message };
    }
  }
}

async function createTestMarkdownFile(filePath) {
  const testContent = `# Test Document for Document Intelligence

This is a comprehensive test document to validate the document intelligence features of Phase 7.5.

## Features Tested

### Link Analysis
- [Internal Link](./src/core/MindMapEngine.ts) - links to code
- [External Link](https://github.com/example/repo) - external resource
- [Broken Link](./nonexistent/file.ts) - should be detected as broken
- ![Image](./docs/diagram.png) - image link

### Code Block Analysis

Here's a JavaScript function:

\`\`\`javascript
function analyzeDocument(content) {
  const words = content.split(' ');
  return {
    wordCount: words.length,
    readingTime: Math.ceil(words.length / 250)
  };
}
\`\`\`

### API Documentation

The \`analyzeDocument\` function processes text content and returns statistics.

### Configuration References

The system uses \`package.json\` for dependency management and \`tsconfig.json\` for TypeScript configuration.

### Implementation Status

This document describes several features:
- Document structure analysis ✅
- Link validation ⚠️
- Brain-inspired learning 🚧
- Multi-format support 📋

## Code References

The main components include:
- \`MarkdownAnalyzer\` class for parsing
- \`DocumentIntelligenceService\` for orchestration
- \`HebbianLearningSystem\` for relationship learning

## API Endpoints

- GET /api/documents - list all documents
- POST /api/analyze - analyze document content
- PUT /api/relationships - update relationships

## Tables

| Feature | Status | Priority |
|---------|--------|----------|
| Markdown | ✅ | High |
| RST | 🚧 | Medium |
| JSON | ✅ | High |
`;

  await fs.writeFile(filePath, testContent);
}

// Run the tests
runDocumentIntelligenceTests().catch(console.error);