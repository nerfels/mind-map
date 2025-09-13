#!/usr/bin/env node

/**
 * User Configuration Manager Test Suite
 *
 * Tests the user customization and configuration system including:
 * - User preference management
 * - Custom pattern recognition rules
 * - Project-specific learning controls
 * - Privacy settings and data control
 * - User feedback and rating system
 */

import { UserConfigurationManager } from '../../dist/core/UserConfigurationManager.js';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';

class UserConfigurationTestSuite {
  constructor() {
    this.testDir = join(process.cwd(), 'test-temp-user-config');
    this.configManager = null;
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

  async testConfigManagerInitialization() {
    this.configManager = new UserConfigurationManager(this.testDir);

    console.log(`   🔧 Initializing configuration manager for: ${this.testDir}`);
    await this.configManager.initialize();

    // Verify default configuration is created
    const stats = this.configManager.getConfigurationStats();
    if (!stats) {
      throw new Error('Configuration not created after initialization');
    }

    console.log(`   ✓ Default configuration created`);
    console.log(`   📋 User ID: ${stats.userId}`);

    const prefs = this.configManager.getPreferences();
    console.log(`   🎯 Preferences initialized: ${Object.keys(prefs).length} settings`);
  }

  async testUserPreferences() {
    if (!this.configManager) throw new Error('Config manager not initialized');

    console.log(`   ⚙️  Testing user preferences management`);

    // Test preference updates
    const preferenceUpdates = {
      enableLearning: false,
      enableCache: true,
      defaultQueryLimit: 25,
      autoScan: false,
      showAdvanced: true
    };

    await this.configManager.updatePreferences(preferenceUpdates);

    const prefs = this.configManager.getPreferences();

    // Verify updates were applied
    if (prefs.enableLearning !== false) {
      throw new Error('Learning preference not updated correctly');
    }

    if (prefs.defaultQueryLimit !== 25) {
      throw new Error('Query limit preference not updated correctly');
    }

    console.log(`   ✓ Preferences updated successfully`);
    console.log(`   📊 Learning: ${prefs.enableLearning}`);
    console.log(`   💾 Cache: ${prefs.enableCache}`);
    console.log(`   🔢 Query limit: ${prefs.defaultQueryLimit}`);

    // Test invalid preference values
    try {
      await this.configManager.updatePreferences({ defaultQueryLimit: -5 });
      throw new Error('Should have rejected negative query limit');
    } catch (error) {
      if (!error.message.includes('Invalid') && !error.message.includes('negative')) {
        throw error;
      }
      console.log(`   🔒 Validation working: rejected invalid preference`);
    }
  }

  async testPrivacySettings() {
    if (!this.configManager) throw new Error('Config manager not initialized');

    console.log(`   🔒 Testing privacy settings management`);

    const privacyUpdates = {
      shareUsageData: false,
      shareErrorReports: true,
      allowRemoteLogging: false,
      dataPersistenceDays: 30,
      encryptLocalData: true
    };

    await this.configManager.updatePrivacySettings(privacyUpdates);

    const privacy = this.configManager.getPrivacySettings();

    // Verify privacy settings
    if (privacy.shareUsageData !== false) {
      throw new Error('Usage data sharing setting not updated');
    }

    if (privacy.dataPersistenceDays !== 30) {
      throw new Error('Data persistence setting not updated');
    }

    if (privacy.encryptLocalData !== true) {
      throw new Error('Encryption setting not updated');
    }

    console.log(`   ✓ Privacy settings updated successfully`);
    console.log(`   📊 Usage data sharing: ${privacy.shareUsageData}`);
    console.log(`   🛡️  Error reports: ${privacy.shareErrorReports}`);
    console.log(`   🔐 Encryption: ${privacy.encryptLocalData}`);
    console.log(`   📅 Retention: ${privacy.dataPersistenceDays} days`);
  }

  async testCustomPatternManagement() {
    if (!this.configManager) throw new Error('Config manager not initialized');

    console.log(`   🎯 Testing custom pattern management`);

    // Add custom patterns
    const customPatterns = [
      {
        name: 'Custom API Pattern',
        pattern: /api[._-]v\d+/i,
        type: 'api_version',
        description: 'Detects versioned API endpoints',
        enabled: true,
        confidence: 0.85,
        languages: ['javascript', 'python', 'go'],
        metadata: { category: 'web', priority: 'high' }
      },
      {
        name: 'Database Connection',
        pattern: /database[._-]?connect/i,
        type: 'db_connection',
        description: 'Identifies database connection patterns',
        enabled: true,
        confidence: 0.90,
        languages: ['any'],
        metadata: { category: 'data', priority: 'medium' }
      }
    ];

    const patternIds = [];
    for (const pattern of customPatterns) {
      const id = await this.configManager.addCustomPattern(pattern);
      patternIds.push(id);
      console.log(`   ➕ Added pattern: ${pattern.name} (${id})`);
    }

    // Verify patterns were added
    const savedPatterns = this.configManager.getCustomPatterns();

    if (savedPatterns.length !== customPatterns.length) {
      throw new Error(`Expected ${customPatterns.length} patterns, got ${savedPatterns.length}`);
    }

    console.log(`   ✓ Added ${savedPatterns.length} custom patterns`);

    // Test pattern updates
    const firstPatternId = patternIds[0];
    await this.configManager.updateCustomPattern(firstPatternId, {
      confidence: 0.95,
      enabled: false
    });

    const updatedPatterns = this.configManager.getCustomPatterns();
    const updatedPattern = updatedPatterns.find(p => p.id === firstPatternId);

    if (!updatedPattern || updatedPattern.confidence !== 0.95 || updatedPattern.enabled !== false) {
      throw new Error('Pattern update failed');
    }

    console.log(`   ✓ Pattern updated successfully`);

    // Test pattern removal
    await this.configManager.removeCustomPattern(patternIds[1]);

    const finalPatterns = this.configManager.getCustomPatterns();
    if (finalPatterns.length !== 1) {
      throw new Error('Pattern removal failed');
    }

    console.log(`   ✓ Pattern removed successfully`);
  }

  async testProjectSpecificConfig() {
    if (!this.configManager) throw new Error('Config manager not initialized');

    console.log(`   📁 Testing project-specific configuration`);

    const projectConfig = {
      enableBrainInspired: true,
      hebbianLearning: {
        enabled: true,
        learningRate: 0.1,
        decayRate: 0.05,
        strengthThreshold: 0.3
      },
      attentionSystem: {
        enabled: true,
        attentionTypes: ['selective', 'divided'],
        contextLevels: ['immediate', 'session', 'project']
      },
      patternPrediction: {
        enabled: false,
        confidenceThreshold: 0.7
      }
    };

    await this.configManager.updateProjectConfig(projectConfig, 'brain-inspired');

    const savedProjectConfig = this.configManager.getProjectConfig('brain-inspired');

    if (!savedProjectConfig) {
      throw new Error('Project config not saved');
    }

    if (savedProjectConfig.hebbianLearning.learningRate !== 0.1) {
      throw new Error('Project config not saved correctly');
    }

    console.log(`   ✓ Project-specific config saved`);
    console.log(`   🧠 Brain-inspired: ${savedProjectConfig.enableBrainInspired}`);
    console.log(`   🔗 Hebbian learning: ${savedProjectConfig.hebbianLearning.enabled}`);
    console.log(`   🎯 Attention system: ${savedProjectConfig.attentionSystem.enabled}`);

    // Test multiple project configs
    const webConfig = {
      enableBrainInspired: false,
      frameworkDetection: {
        enabled: true,
        frameworks: ['react', 'vue', 'angular']
      }
    };

    await this.configManager.updateProjectConfig(webConfig, 'web-project');

    const webProjectConfig = this.configManager.getProjectConfig('web-project');
    const brainProjectConfig = this.configManager.getProjectConfig('brain-inspired');

    if (!webProjectConfig || !brainProjectConfig) {
      throw new Error('Multiple project configs not handled correctly');
    }

    console.log(`   ✓ Multiple project configs supported`);
  }

  async testUserFeedbackSystem() {
    if (!this.configManager) throw new Error('Config manager not initialized');

    console.log(`   💬 Testing user feedback system`);

    const feedbackItems = [
      {
        type: 'suggestion',
        category: 'performance',
        title: 'Improve query speed',
        description: 'Queries could be faster for large projects',
        rating: 4,
        metadata: { queryTime: '2.5s', projectSize: 'large' }
      },
      {
        type: 'bug_report',
        category: 'brain_inspired',
        title: 'Hebbian learning not working',
        description: 'Connections are not being strengthened properly',
        rating: 2,
        metadata: { system: 'hebbian', reproduction: 'consistent' }
      },
      {
        type: 'feature_request',
        category: 'multi_language',
        title: 'Add Kotlin support',
        description: 'Would like to see Kotlin language analysis',
        rating: 5,
        metadata: { language: 'kotlin', priority: 'medium' }
      }
    ];

    const feedbackIds = [];
    for (const feedback of feedbackItems) {
      const id = await this.configManager.submitFeedback(feedback);
      feedbackIds.push(id);
      console.log(`   📝 Submitted feedback: ${feedback.title} (${id})`);
    }

    // Verify feedback was stored
    const savedFeedback = this.configManager.getFeedback();

    if (savedFeedback.length !== feedbackItems.length) {
      throw new Error(`Expected ${feedbackItems.length} feedback items, got ${savedFeedback.length}`);
    }

    console.log(`   ✓ Submitted ${savedFeedback.length} feedback items`);

    // Verify feedback properties
    const bugReport = savedFeedback.find(f => f.type === 'bug_report');
    if (!bugReport || bugReport.status !== 'pending') {
      throw new Error('Bug report not saved correctly');
    }

    console.log(`   🐛 Bug reports: ${savedFeedback.filter(f => f.type === 'bug_report').length}`);
    console.log(`   💡 Suggestions: ${savedFeedback.filter(f => f.type === 'suggestion').length}`);
    console.log(`   ✨ Feature requests: ${savedFeedback.filter(f => f.type === 'feature_request').length}`);

    // Test feedback categorization
    const categories = [...new Set(savedFeedback.map(f => f.category))];
    console.log(`   📂 Categories: ${categories.join(', ')}`);
  }

  async testConfigurationPersistence() {
    if (!this.configManager) throw new Error('Config manager not initialized');

    console.log(`   💾 Testing configuration persistence`);

    // Get current configuration stats
    const originalStats = this.configManager.getConfigurationStats();
    const originalUserId = originalStats.userId;
    const originalPatternCount = this.configManager.getCustomPatterns().length;

    console.log(`   📊 Original config - Patterns: ${originalPatternCount}, Projects: ${originalStats.projectConfigs}`);

    // Create new manager instance (simulating app restart)
    const newConfigManager = new UserConfigurationManager(this.testDir);
    await newConfigManager.initialize();

    // Verify configuration was loaded
    const loadedStats = newConfigManager.getConfigurationStats();
    const loadedPatterns = newConfigManager.getCustomPatterns();

    if (loadedStats.userId !== originalUserId) {
      throw new Error('User ID not persisted correctly');
    }

    if (loadedPatterns.length !== originalPatternCount) {
      throw new Error('Custom patterns not persisted correctly');
    }

    if (loadedStats.projectConfigs !== originalStats.projectConfigs) {
      throw new Error('Project configs not persisted correctly');
    }

    console.log(`   ✓ Configuration persisted and loaded correctly`);
    console.log(`   🆔 User ID preserved: ${loadedStats.userId}`);
    console.log(`   🎯 Patterns preserved: ${loadedPatterns.length}`);
    console.log(`   📁 Project configs preserved: ${loadedStats.projectConfigs}`);
  }

  async testConfigurationValidation() {
    if (!this.configManager) throw new Error('Config manager not initialized');

    console.log(`   ✅ Testing configuration validation`);

    // Test invalid preference values
    const invalidTests = [
      {
        name: 'negative query limit',
        test: () => this.configManager.updatePreferences({ defaultQueryLimit: -1 })
      },
      {
        name: 'invalid confidence value',
        test: () => this.configManager.addCustomPattern({
          name: 'Invalid Pattern',
          pattern: /test/,
          type: 'test',
          description: 'Test pattern',
          enabled: true,
          confidence: 1.5, // Invalid: > 1
          languages: ['javascript']
        })
      },
      {
        name: 'empty pattern name',
        test: () => this.configManager.addCustomPattern({
          name: '',
          pattern: /test/,
          type: 'test',
          description: 'Test pattern',
          enabled: true,
          confidence: 0.5,
          languages: ['javascript']
        })
      }
    ];

    let validationsPassed = 0;
    for (const invalidTest of invalidTests) {
      try {
        await invalidTest.test();
        throw new Error(`Should have rejected: ${invalidTest.name}`);
      } catch (error) {
        if (error.message.startsWith('Should have rejected')) {
          throw error;
        }
        // Expected validation error
        validationsPassed++;
        console.log(`   🔒 Validation passed: ${invalidTest.name}`);
      }
    }

    if (validationsPassed !== invalidTests.length) {
      throw new Error(`Expected ${invalidTests.length} validations, got ${validationsPassed}`);
    }

    console.log(`   ✓ All ${validationsPassed} validation tests passed`);
  }

  async runAllTests() {
    console.log('🧪 Starting User Configuration Test Suite\n');

    try {
      await this.setupTestEnvironment();

      await this.runTest('Config Manager Initialization', () => this.testConfigManagerInitialization());
      await this.runTest('User Preferences', () => this.testUserPreferences());
      await this.runTest('Privacy Settings', () => this.testPrivacySettings());
      await this.runTest('Custom Pattern Management', () => this.testCustomPatternManagement());
      await this.runTest('Project-Specific Config', () => this.testProjectSpecificConfig());
      await this.runTest('User Feedback System', () => this.testUserFeedbackSystem());
      await this.runTest('Configuration Persistence', () => this.testConfigurationPersistence());
      await this.runTest('Configuration Validation', () => this.testConfigurationValidation());

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

    console.log('\n🎯 User Configuration Test Complete');
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new UserConfigurationTestSuite();
  testSuite.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export { UserConfigurationTestSuite };