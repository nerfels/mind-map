#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing MCP Context from Demo Project');
console.log('=' .repeat(50));

// Test what's actually being scanned
console.log('Current working directory:', process.cwd());

// Count files in current directory
const filesInCurrent = [];
function findFiles(dir, baseDir = dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !item.startsWith('.')) {
      findFiles(fullPath, baseDir);
    } else if (stat.isFile()) {
      filesInCurrent.push(path.relative(baseDir, fullPath));
    }
  }
}

findFiles('.');
console.log('Files in demo project:', filesInCurrent.length);
console.log('Files:', filesInCurrent);

// Check if .mindmap-cache exists here
const localCache = '.mindmap-cache';
const parentCache = '../.mindmap-cache';

console.log('\nCache directory check:');
console.log('- Local cache exists:', fs.existsSync(localCache));
console.log('- Parent cache exists:', fs.existsSync(parentCache));

if (fs.existsSync(parentCache)) {
  const parentCacheFiles = fs.readdirSync(parentCache);
  console.log('- Parent cache contents:', parentCacheFiles);
}

// Create a test to see if MCP would create cache here
console.log('\nTesting cache creation in demo project...');
const testCacheDir = '.test-mindmap-cache';

try {
  fs.mkdirSync(testCacheDir, { recursive: true });
  fs.writeFileSync(path.join(testCacheDir, 'test.txt'), 'test');
  console.log('✅ Can create cache directory in demo project');

  // Clean up
  fs.rmSync(testCacheDir, { recursive: true });
} catch (error) {
  console.log('❌ Cannot create cache directory:', error.message);
}

console.log('\n📊 Summary:');
console.log(`- Demo project has ${filesInCurrent.length} files`);
console.log(`- MCP reported scanning 150 files (mismatch!)`);
console.log(`- Cache is in parent directory (should be in demo project)`);
console.log(`- This indicates MCP is scanning from parent, not demo project`);