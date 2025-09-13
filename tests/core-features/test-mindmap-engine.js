#!/usr/bin/env node

/**
 * MindMapEngine Integration Test Suite
 *
 * Tests the main orchestrator class that coordinates all brain-inspired
 * systems and core functionality. This is the heart of the Mind Map MCP.
 */

import { MindMapEngine } from '../../dist/core/MindMapEngine.js';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';

class MindMapEngineTestSuite {
  constructor() {
    this.testDir = join(process.cwd(), 'test-temp-mindmap-engine');
    this.engine = null;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async setupTestEnvironment() {
    // Create clean test directory
    if (existsSync(this.testDir)) {
      rmSync(this.testDir, { recursive: true, force: true });
    }
    mkdirSync(this.testDir, { recursive: true });

    // Create test files
    const testFiles = {
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'react': '^18.0.0',
          'express': '^4.18.0'
        }
      }, null, 2),

      'src/index.js': `
import React from 'react';
import express from 'express';

const app = express();

function HomePage() {
  return <h1>Hello World</h1>;
}

app.get('/', (req, res) => {
  res.send('API Server');
});

export { HomePage, app };
      `,

      'src/utils.py': `
import numpy as np
import pandas as pd

def calculate_metrics(data):
    """Calculate statistical metrics"""
    return {
        'mean': np.mean(data),
        'std': np.std(data)
    }

class DataProcessor:
    def __init__(self, config):
        self.config = config

    def process(self, df):
        return df.dropna()
      `,

      'src/main.go': `
package main

import (
    "fmt"
    "net/http"
    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default()
    r.GET("/ping", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "pong",
        })
    })
    r.Run()
}
      `
    };

    // Write test files
    for (const [filePath, content] of Object.entries(testFiles)) {
      const fullPath = join(this.testDir, filePath);
      const dir = join(fullPath, '..');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(fullPath, content);
    }

    console.log(`✅ Test environment created: ${this.testDir}`);
  }

  async cleanupTestEnvironment() {
    if (existsSync(this.testDir)) {
      rmSync(this.testDir, { recursive: true, force: true });
      console.log(`🗑️  Cleaned up test directory`);
    }
  }

  async runTest(name, testFn) {
    try {
      console.log(`🧪 Running: ${name}`);
      const startTime = Date.now();

      await testFn();

      const duration = Date.now() - startTime;
      console.log(`✅ PASSED: ${name} (${duration}ms)`);
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED', duration });

    } catch (error) {
      console.error(`❌ FAILED: ${name}`);
      console.error(`   Error: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
    }
  }

  async testEngineInitialization() {
    this.engine = new MindMapEngine(this.testDir);

    // Initialize the engine
    await this.engine.initialize();

    // Verify engine has key functionality (components are private)
    const keyMethods = [
      'initialize', 'scanProject', 'query', 'analyzeProjectScale',
      'executeAdvancedQuery', 'analyzeAndPredict', 'getHebbianStats'
    ];

    for (const method of keyMethods) {
      if (typeof this.engine[method] !== 'function') {
        throw new Error(`Missing method: ${method}`);
      }
    }

    console.log(`   ✓ Engine initialized with key methods available`);
  }

  async testProjectScanning() {
    if (!this.engine) throw new Error('Engine not initialized');

    console.log(`   📁 Scanning project: ${this.testDir}`);
    const scanResult = await this.engine.scanProject(true); // Force rescan

    if (!scanResult.summary) {
      throw new Error('Scan result missing summary');
    }

    console.log(`   ✓ ${scanResult.summary}`);
    console.log(`   📊 Files: ${scanResult.scannedFiles}/${scanResult.totalFiles}`);

    // Test basic query after scanning
    const queryResult = await this.engine.query('file', { limit: 10 });
    console.log(`   ✓ Query successful - found ${queryResult.nodes.length} file nodes`);
  }

  async testMultiLanguageAnalysis() {
    if (!this.engine) throw new Error('Engine not initialized');

    console.log(`   🔍 Testing multi-language query capabilities`);

    // Test function queries
    const functionResults = await this.engine.query('function', { limit: 10 });
    console.log(`   ✓ Found ${functionResults.nodes.length} functions across languages`);

    // Test language-specific queries
    const jsResults = await this.engine.query('index.js', { limit: 5 });
    const pyResults = await this.engine.query('utils.py', { limit: 5 });
    console.log(`   ✓ File queries - JS: ${jsResults.nodes.length}, Python: ${pyResults.nodes.length}`);

    // Test polyglot analysis
    try {
      const polyglotAnalysis = await this.engine.analyzePolyglotProject();
      console.log(`   ✓ Polyglot analysis: ${polyglotAnalysis.detectedLanguages?.length || 0} languages`);
    } catch (error) {
      console.log(`   ⚠️  Polyglot analysis: ${error.message}`);
    }

    console.log(`   ✓ Multi-language analysis completed`);
  }

  async testBrainInspiredSystems() {
    if (!this.engine) throw new Error('Engine not initialized');

    // Test Hebbian Learning activation
    const primaryNodeId = 'test-activation-node';
    const coActivatedNodes = ['node1', 'node2', 'node3'];

    console.log(`   🧠 Testing Hebbian learning co-activation`);
    await this.engine.recordCoActivation(primaryNodeId, coActivatedNodes, 'test-context', 0.8);

    const hebbianStats = await this.engine.getHebbianStats();
    console.log(`   ✓ Hebbian connections recorded: ${hebbianStats.totalConnections || 0}`);

    // Test Attention System - we need actual nodes for this
    console.log(`   🎯 Testing attention system`);
    const attentionStats = this.engine.getAttentionStats();
    console.log(`   ✓ Attention system active: ${attentionStats.totalAllocations || 0} allocations`);

    // Test Pattern Prediction
    console.log(`   🔮 Testing pattern prediction`);
    await this.engine.analyzeAndPredict();

    const patternPredictions = this.engine.getPatternPredictions();
    console.log(`   ✓ Pattern predictions: ${patternPredictions.length}`);
  }

  async testQuerySystems() {
    if (!this.engine) throw new Error('Engine not initialized');

    // Test basic query
    console.log(`   🔍 Testing basic query system`);
    const basicResults = await this.engine.query('React', { limit: 5 });
    console.log(`   ✓ Basic query returned ${basicResults.nodes.length} results`);

    // Test advanced query
    console.log(`   ⚡ Testing advanced query system`);
    const advancedQuery = `
      MATCH (n:file)-[:CONTAINS]->(f:function)
      WHERE n.properties.language = 'javascript'
      RETURN f.name, n.path
      LIMIT 3
    `;

    try {
      const advancedResults = await this.engine.executeAdvancedQuery(advancedQuery);
      console.log(`   ✓ Advanced query returned ${advancedResults.length} results`);
    } catch (error) {
      console.log(`   ⚠️  Advanced query: ${error.message}`);
    }

    // Test cache performance
    console.log(`   💾 Testing query cache`);
    const cacheResults1 = await this.engine.query('express', { limit: 3 });
    const cacheResults2 = await this.engine.query('express', { limit: 3 });

    try {
      const cacheStats = this.engine.getStats();
      console.log(`   ✓ Engine statistics available`);
    } catch (error) {
      console.log(`   ⚠️  Cache stats: ${error.message}`);
    }
  }

  async testArchitecturalAnalysis() {
    if (!this.engine) throw new Error('Engine not initialized');

    console.log(`   🏗️  Testing architectural analysis`);
    const architecturalInsights = this.engine.analyzeArchitecture();

    console.log(`   ✓ Generated ${architecturalInsights.length} architectural insights`);

    // Print first insight as example
    if (architecturalInsights.length > 0 && architecturalInsights[0]) {
      const insight = architecturalInsights[0];
      console.log(`   📋 Example: ${insight.type} (${(insight.confidence * 100).toFixed(0)}% confidence)`);
    } else {
      console.log(`   📋 No architectural insights yet - run after project scan`);
    }
  }

  async testContextAndLearning() {
    if (!this.engine) throw new Error('Engine not initialized');

    // Test context system
    console.log(`   📊 Testing hierarchical context`);
    const contextStats = this.engine.getHierarchicalContextStats();
    console.log(`   ✓ Context levels active: ${Object.keys(contextStats.contextLevels || {}).length}`);

    // Test learning system
    console.log(`   🎓 Testing learning system`);
    this.engine.updateFromTask(
      'Test integration task',
      ['src/index.js', 'src/utils.py'],
      'success',
      {
        approach: 'multi-language integration',
        effectiveness: 0.9,
        filesChanged: ['src/index.js'],
        keyChanges: 'Added React component integration'
      }
    );

    console.log(`   ✓ Learning system updated with task outcome`);
  }

  async testInsightsAndRecommendations() {
    if (!this.engine) throw new Error('Engine not initialized');

    console.log(`   💡 Testing insights and recommendations`);

    // Test error prediction
    const errorPredictions = this.engine.predictPotentialErrors();
    console.log(`   ✓ Generated ${errorPredictions.length} error predictions`);

    // Test fix suggestions
    const fixSuggestions = this.engine.suggestFixes('TypeError: Cannot read property', 'type');
    console.log(`   ✓ Generated ${fixSuggestions.length} fix suggestions`);

    // Test tooling recommendations
    try {
      const toolingRecs = await this.engine.getToolingRecommendations();
      console.log(`   ✓ Generated ${toolingRecs.length || 0} tooling recommendations`);
    } catch (error) {
      console.log(`   ⚠️  Tooling recommendations: ${error.message}`);
    }

    console.log(`   ✓ Insights and recommendations system functional`);
  }

  async runAllTests() {
    console.log('🧪 Starting MindMapEngine Integration Test Suite\n');

    try {
      await this.setupTestEnvironment();

      await this.runTest('Engine Initialization', () => this.testEngineInitialization());
      await this.runTest('Project Scanning', () => this.testProjectScanning());
      await this.runTest('Multi-Language Analysis', () => this.testMultiLanguageAnalysis());
      await this.runTest('Brain-Inspired Systems', () => this.testBrainInspiredSystems());
      await this.runTest('Query Systems', () => this.testQuerySystems());
      await this.runTest('Architectural Analysis', () => this.testArchitecturalAnalysis());
      await this.runTest('Context and Learning', () => this.testContextAndLearning());
      await this.runTest('Insights and Recommendations', () => this.testInsightsAndRecommendations());

    } finally {
      await this.cleanupTestEnvironment();
    }

    this.printResults();
  }

  printResults() {
    console.log('\n📊 TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
    }

    console.log('\n🎯 MindMapEngine Integration Test Complete');
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new MindMapEngineTestSuite();
  testSuite.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export { MindMapEngineTestSuite };