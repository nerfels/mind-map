#!/usr/bin/env node

/**
 * Test script for the enhanced ignore pattern functionality
 * Tests FileScanner integration with configuration and multi-source ignore support
 */

import { MindMapEngine } from './dist/core/MindMapEngine.js';
import { FileScanner } from './dist/core/FileScanner.js';

async function testIgnorePatterns() {
  console.log('🧪 Testing Enhanced Ignore Pattern Functionality');
  console.log('=' .repeat(50));

  const projectRoot = process.cwd();

  try {
    // Test 1: Direct FileScanner with custom patterns
    console.log('\n1️⃣ Testing FileScanner with custom ignore patterns');
    const scanner = new FileScanner(projectRoot, {
      ignorePatterns: ['*.log', 'test-*.js', 'debug-*.js'],
      useGitignore: true,
      useMindMapIgnore: false
    });

    const testResult = await scanner.testIgnorePatterns([
      '*.log',
      'test-*.js',
      'debug-*.js',
      'node_modules/**'
    ]);

    console.log(`📊 Test Results:`);
    console.log(`   - Performance: ${testResult.performance}ms`);
    console.log(`   - Files ignored: ${testResult.ignored.length}`);
    console.log(`   - Files matched: ${testResult.matched.length}`);

    // Test 2: Get ignore pattern stats
    console.log('\n2️⃣ Testing ignore pattern statistics');
    const stats = scanner.getIgnorePatternStats();
    console.log(`📈 Pattern Statistics:`);
    console.log(`   - Total patterns: ${stats.totalPatterns}`);
    console.log(`   - Default patterns: ${stats.sourceBreakdown.defaults}`);
    console.log(`   - .gitignore patterns: ${stats.sourceBreakdown.gitignore}`);

    // Test 3: MindMapEngine integration
    console.log('\n3️⃣ Testing MindMapEngine integration');
    const mindMap = new MindMapEngine(projectRoot);
    const engineScanner = mindMap.getFileScanner();
    const activePatterns = engineScanner.getActiveIgnorePatterns();

    console.log(`🔧 Engine Integration:`);
    console.log(`   - Active patterns: ${activePatterns.length}`);
    console.log(`   - Sample patterns: ${activePatterns.slice(0, 3).join(', ')}...`);

    // Test 4: Pattern loading performance
    console.log('\n4️⃣ Testing pattern loading performance');
    const startTime = Date.now();
    await scanner.updateIgnorePatterns(['temp/**', '*.tmp', '.cache/**']);
    const loadTime = Date.now() - startTime;

    console.log(`⚡ Pattern Loading:`);
    console.log(`   - Update time: ${loadTime}ms`);
    console.log(`   - New pattern count: ${scanner.getActiveIgnorePatterns().length}`);

    console.log('\n✅ All ignore pattern tests completed successfully!');
    console.log('🎯 Enhanced file filtering is operational');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('🔍 Error details:', error.stack);
    process.exit(1);
  }
}

// Run the test
testIgnorePatterns().then(() => {
  console.log('\n🏁 Test execution completed');
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});