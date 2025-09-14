#!/usr/bin/env node

/**
 * Episodic Memory Test Suite
 *
 * Tests the episodic memory enhancement system including:
 * - Episode storage with rich context
 * - Similarity matching for episode retrieval
 * - Episode-based suggestions for similar tasks
 * - Memory consolidation over time
 * - Episode confidence tracking
 */

import { MindMapEngine } from '../../dist/core/MindMapEngine.js';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';

class EpisodicMemoryTestSuite {
  constructor() {
    this.testDir = join(process.cwd(), 'test-temp-episodic-memory');
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

    // Create test files for realistic context
    const testFiles = {
      'src/main.js': `
const express = require('express');
const app = express();

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(3000);
      `,
      'src/utils.js': `
function validateEmail(email) {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}

module.exports = { validateEmail };
      `,
      'package.json': `
{
  "name": "test-project",
  "dependencies": {
    "express": "^4.18.0"
  }
}
      `,
      'test/users.test.js': `
const request = require('supertest');
const app = require('../src/main');

test('GET /api/users', async () => {
  const response = await request(app).get('/api/users');
  expect(response.status).toBe(200);
});
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

  async setupMindMapEngine() {
    this.engine = new MindMapEngine(this.testDir);
    await this.engine.initialize();

    // Scan the test project to create initial nodes
    await this.engine.scanProject();

    console.log(`📊 MindMapEngine initialized for episodic memory testing`);
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

  async testEpisodeStorage() {
    console.log(`   💾 Testing episode storage with rich context`);

    // Create test actions
    const actions = [
      {
        type: 'query',
        target: 'express routes',
        parameters: { query: 'find API endpoints' },
        timestamp: new Date(),
        success: true,
        duration: 150
      },
      {
        type: 'file_access',
        target: 'src/main.js',
        parameters: {},
        timestamp: new Date(),
        success: true,
        duration: 50
      },
      {
        type: 'edit',
        target: 'src/main.js',
        parameters: { changes: 'added middleware' },
        timestamp: new Date(),
        success: true,
        duration: 300
      }
    ];

    // Store episode
    const context = {
      taskDescription: 'Add authentication middleware to Express API',
      projectType: 'nodejs',
      languages: ['javascript'],
      frameworks: ['express'],
      fileTypes: ['.js'],
      userGoals: ['implement authentication', 'secure API'],
      activeFiles: ['src/main.js']
    };

    const episodeId = await this.engine.storeEpisode(
      context.taskDescription,
      context,
      actions,
      'success'
    );

    console.log(`   ✓ Episode stored with ID: ${episodeId}`);

    // Verify episode was stored
    const stats = this.engine.getEpisodicStats();
    if (stats.totalEpisodes === 0) {
      throw new Error('Episode was not stored properly');
    }

    console.log(`   📊 Total episodes: ${stats.totalEpisodes}`);
    console.log(`   📈 Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
  }

  async testSimilarityMatching() {
    console.log(`   🔍 Testing similarity matching for episode retrieval`);

    // Store multiple episodes with different contexts
    const episodes = [
      {
        taskDescription: 'Add user authentication to Node.js API',
        context: {
          projectType: 'nodejs',
          languages: ['javascript'],
          frameworks: ['express'],
          userGoals: ['authentication', 'security']
        },
        actions: [
          { type: 'query', target: 'express auth', parameters: {}, timestamp: new Date(), success: true, duration: 100 }
        ],
        outcome: 'success'
      },
      {
        taskDescription: 'Implement JWT tokens in Express application',
        context: {
          projectType: 'nodejs',
          languages: ['javascript'],
          frameworks: ['express'],
          userGoals: ['jwt', 'tokens', 'security']
        },
        actions: [
          { type: 'file_access', target: 'src/auth.js', parameters: {}, timestamp: new Date(), success: true, duration: 80 }
        ],
        outcome: 'success'
      },
      {
        taskDescription: 'Debug Python Flask routing issue',
        context: {
          projectType: 'python',
          languages: ['python'],
          frameworks: ['flask'],
          userGoals: ['debugging', 'routing']
        },
        actions: [
          { type: 'search', target: 'flask routes', parameters: {}, timestamp: new Date(), success: false, duration: 200 }
        ],
        outcome: 'failure'
      }
    ];

    // Store episodes
    for (const episode of episodes) {
      await this.engine.storeEpisode(
        episode.taskDescription,
        episode.context,
        episode.actions,
        episode.outcome
      );
    }

    // Test similarity matching - should find Express/auth related episodes
    const queryContext = {
      taskDescription: 'Secure Express API with authentication',
      projectType: 'nodejs',
      languages: ['javascript'],
      frameworks: ['express'],
      userGoals: ['security', 'authentication']
    };

    const similarEpisodes = await this.engine.findSimilarEpisodes(queryContext, 5, 0.3);

    console.log(`   ✓ Found ${similarEpisodes.length} similar episodes`);

    if (similarEpisodes.length < 2) {
      throw new Error(`Expected at least 2 similar episodes, found ${similarEpisodes.length}`);
    }

    // Verify similarity scores
    for (const match of similarEpisodes.slice(0, 3)) {
      console.log(`   📋 Episode: "${match.episode.context.taskDescription.substring(0, 50)}..."`);
      console.log(`   💪 Similarity: ${(match.similarity * 100).toFixed(1)}%`);
      console.log(`   🎯 Matching features: ${match.matchingFeatures.join(', ')}`);
    }

    // Verify that Express/Node.js episodes have higher similarity than Python/Flask
    const topMatch = similarEpisodes[0];
    if (!topMatch.matchingFeatures.some(f => f.includes('express') || f.includes('javascript'))) {
      console.warn('   ⚠️  Top match might not be the most relevant');
    } else {
      console.log(`   ✓ Most similar episode is correctly Express/JavaScript related`);
    }
  }

  async testEpisodeBasedSuggestions() {
    console.log(`   💡 Testing episode-based suggestions for similar tasks`);

    // Create a context for getting suggestions
    const currentContext = {
      taskDescription: 'Add middleware to Express server',
      projectType: 'nodejs',
      languages: ['javascript'],
      frameworks: ['express'],
      userGoals: ['middleware', 'express setup']
    };

    const suggestions = await this.engine.getEpisodeBasedSuggestions(currentContext);

    console.log(`   ✓ Generated ${suggestions.suggestions.length} suggestions`);
    console.log(`   📊 Based on ${suggestions.basedOnEpisodes.length} past episodes`);
    console.log(`   💪 Confidence: ${(suggestions.confidence * 100).toFixed(1)}%`);

    if (suggestions.suggestions.length === 0) {
      console.log(`   📝 No suggestions - this is expected with minimal episode history`);
    } else {
      // Display suggestions
      suggestions.suggestions.slice(0, 3).forEach((suggestion, i) => {
        console.log(`   ${i + 1}. ${suggestion}`);
      });
    }

    // Verify suggestion structure
    if (typeof suggestions.confidence !== 'number' ||
        !Array.isArray(suggestions.suggestions) ||
        !Array.isArray(suggestions.basedOnEpisodes)) {
      throw new Error('Invalid suggestion structure returned');
    }

    console.log(`   ✓ Suggestion structure is valid`);
  }

  async testMemoryConsolidation() {
    console.log(`   🧠 Testing memory consolidation over time`);

    // Get initial stats
    const initialStats = this.engine.getEpisodicStats();
    console.log(`   📊 Initial consolidation: ${(initialStats.averageConsolidation * 100).toFixed(1)}%`);

    // Consolidate memories
    await this.engine.consolidateEpisodicMemories();

    // Get updated stats
    const updatedStats = this.engine.getEpisodicStats();
    console.log(`   📊 After consolidation: ${(updatedStats.averageConsolidation * 100).toFixed(1)}%`);

    // Verify consolidation process ran
    console.log(`   ✓ Memory consolidation completed`);

    // Check consolidation distribution
    const { fresh, developing, consolidated } = updatedStats.consolidationStats;
    console.log(`   📈 Consolidation levels - Fresh: ${fresh}, Developing: ${developing}, Consolidated: ${consolidated}`);

    if (fresh + developing + consolidated !== updatedStats.totalEpisodes) {
      throw new Error('Consolidation level counts do not match total episodes');
    }

    console.log(`   ✓ Consolidation statistics are consistent`);
  }

  async testEpisodeConfidenceTracking() {
    console.log(`   📊 Testing episode confidence tracking`);

    // Store episodes with different outcomes and action success rates
    const testScenarios = [
      {
        description: 'High success scenario',
        actions: [
          { type: 'query', target: 'test', parameters: {}, timestamp: new Date(), success: true, duration: 100 },
          { type: 'edit', target: 'file', parameters: {}, timestamp: new Date(), success: true, duration: 200 },
          { type: 'file_access', target: 'file', parameters: {}, timestamp: new Date(), success: true, duration: 50 }
        ],
        outcome: 'success',
        expectedHighConfidence: true
      },
      {
        description: 'Mixed success scenario',
        actions: [
          { type: 'query', target: 'test', parameters: {}, timestamp: new Date(), success: true, duration: 100 },
          { type: 'edit', target: 'file', parameters: {}, timestamp: new Date(), success: false, duration: 200 },
          { type: 'file_access', target: 'file', parameters: {}, timestamp: new Date(), success: true, duration: 50 }
        ],
        outcome: 'partial',
        expectedHighConfidence: false
      },
      {
        description: 'Low success scenario',
        actions: [
          { type: 'query', target: 'test', parameters: {}, timestamp: new Date(), success: false, duration: 100 },
          { type: 'edit', target: 'file', parameters: {}, timestamp: new Date(), success: false, duration: 200 }
        ],
        outcome: 'failure',
        expectedHighConfidence: false
      }
    ];

    const confidenceResults = [];

    for (const scenario of testScenarios) {
      const episodeId = await this.engine.storeEpisode(
        scenario.description,
        {
          projectType: 'test',
          languages: ['javascript'],
          frameworks: ['test']
        },
        scenario.actions,
        scenario.outcome
      );

      // We can't directly access episode confidence, but we can infer it from suggestions
      const context = {
        projectType: 'test',
        languages: ['javascript'],
        frameworks: ['test']
      };

      const suggestions = await this.engine.getEpisodeBasedSuggestions(context);
      confidenceResults.push({
        scenario: scenario.description,
        suggestionConfidence: suggestions.confidence,
        expectedHigh: scenario.expectedHighConfidence
      });
    }

    // Analyze confidence patterns
    console.log(`   📊 Confidence analysis:`);
    for (const result of confidenceResults) {
      console.log(`   - ${result.scenario}: ${(result.suggestionConfidence * 100).toFixed(1)}% confidence`);
    }

    // Verify that success scenarios generally have higher confidence
    const successScenarios = confidenceResults.filter(r => r.expectedHigh);
    const failureScenarios = confidenceResults.filter(r => !r.expectedHigh);

    if (successScenarios.length > 0 && failureScenarios.length > 0) {
      const avgSuccessConfidence = successScenarios.reduce((sum, r) => sum + r.suggestionConfidence, 0) / successScenarios.length;
      const avgFailureConfidence = failureScenarios.reduce((sum, r) => sum + r.suggestionConfidence, 0) / failureScenarios.length;

      console.log(`   ✓ Average success confidence: ${(avgSuccessConfidence * 100).toFixed(1)}%`);
      console.log(`   ✓ Average failure confidence: ${(avgFailureConfidence * 100).toFixed(1)}%`);

      if (avgSuccessConfidence <= avgFailureConfidence) {
        console.warn(`   ⚠️  Expected success scenarios to have higher confidence than failure scenarios`);
      } else {
        console.log(`   ✓ Success scenarios show higher confidence than failure scenarios`);
      }
    }
  }

  async testEpisodicMemoryStats() {
    console.log(`   📈 Testing episodic memory statistics`);

    const stats = this.engine.getEpisodicStats();

    // Verify all required stat fields are present
    const requiredFields = [
      'totalEpisodes', 'successRate', 'averageConsolidation',
      'topTags', 'recentActivity', 'consolidationStats'
    ];

    for (const field of requiredFields) {
      if (!(field in stats)) {
        throw new Error(`Missing required stat field: ${field}`);
      }
    }

    console.log(`   📊 Total episodes: ${stats.totalEpisodes}`);
    console.log(`   📈 Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`   🧠 Average consolidation: ${(stats.averageConsolidation * 100).toFixed(1)}%`);

    // Check recent activity
    console.log(`   📅 Recent activity - Last week: ${stats.recentActivity.lastWeek}, Last month: ${stats.recentActivity.lastMonth}`);

    // Check top tags
    if (stats.topTags.length > 0) {
      console.log(`   🏷️  Top tags: ${stats.topTags.slice(0, 5).map(t => `${t.tag}(${t.count})`).join(', ')}`);
    }

    // Verify consolidation stats add up
    const { fresh, developing, consolidated } = stats.consolidationStats;
    const total = fresh + developing + consolidated;
    if (total !== stats.totalEpisodes) {
      throw new Error(`Consolidation stats don't add up: ${total} !== ${stats.totalEpisodes}`);
    }

    console.log(`   ✓ All statistics are valid and consistent`);
  }

  async runAllTests() {
    console.log('🧪 Starting Episodic Memory Test Suite\n');

    try {
      await this.setupTestEnvironment();
      await this.setupMindMapEngine();

      await this.runTest('Episode Storage', () => this.testEpisodeStorage());
      await this.runTest('Similarity Matching', () => this.testSimilarityMatching());
      await this.runTest('Episode-Based Suggestions', () => this.testEpisodeBasedSuggestions());
      await this.runTest('Memory Consolidation', () => this.testMemoryConsolidation());
      await this.runTest('Episode Confidence Tracking', () => this.testEpisodeConfidenceTracking());
      await this.runTest('Episodic Memory Statistics', () => this.testEpisodicMemoryStats());

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

    console.log('\n🧠 Episodic Memory Enhancement Test Complete');
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new EpisodicMemoryTestSuite();
  testSuite.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export { EpisodicMemoryTestSuite };