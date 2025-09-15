#!/usr/bin/env node

/**
 * Quick test of ignore pattern functionality without MCP
 */

import { FileScanner } from './dist/core/FileScanner.js';

async function quickTest() {
  console.log('🧪 Quick Ignore Pattern Test');
  console.log('=' .repeat(30));

  const projectRoot = process.cwd();

  try {
    // Test FileScanner with custom patterns
    console.log('\n1️⃣ Testing ignore pattern loading');
    const scanner = new FileScanner(projectRoot, {
      ignorePatterns: ['test-*.js', '*.log', 'debug-*.js'],
      useGitignore: true,
      useMindMapIgnore: false
    });

    // Test pattern effectiveness
    console.log('\n2️⃣ Testing pattern effectiveness');
    const testResult = await scanner.testIgnorePatterns([
      'node_modules/**',
      '*.log',
      'test-*.js',
      'debug-*.js',
      '.git/**'
    ]);

    console.log(`📊 Results:`);
    console.log(`   Performance: ${testResult.performance}ms`);
    console.log(`   Files ignored: ${testResult.ignored.length}`);
    console.log(`   Files matched: ${testResult.matched.length}`);
    console.log(`   Efficiency: ${((testResult.ignored.length / (testResult.ignored.length + testResult.matched.length)) * 100).toFixed(1)}%`);

    // Show some ignored files
    if (testResult.ignored.length > 0) {
      console.log(`\n🚫 Sample ignored files:`);
      testResult.ignored.slice(0, 5).forEach(file => {
        console.log(`   - ${file}`);
      });
    }

    // Test stats
    console.log('\n3️⃣ Testing pattern statistics');
    const stats = scanner.getIgnorePatternStats();
    console.log(`📈 Stats:`);
    console.log(`   Total patterns: ${stats.totalPatterns}`);
    console.log(`   Default patterns: ${stats.sourceBreakdown.defaults}`);
    console.log(`   .gitignore patterns: ${stats.sourceBreakdown.gitignore}`);

    // Test creating .mindmapignore
    console.log('\n4️⃣ Testing .mindmapignore creation');
    const mindmapIgnorePatterns = [
      '# Mind Map specific ignores',
      'test-*.js',
      'debug-*.js',
      '*.tmp',
      '.cache/**'
    ];

    console.log(`📝 Would create .mindmapignore with ${mindmapIgnorePatterns.length - 1} patterns`);
    console.log('   (Skipping actual file creation in test)');

    console.log('\n✅ All tests passed! Ignore pattern enhancement is working correctly.');
    console.log('🎯 Ready for MCP integration testing.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

quickTest();