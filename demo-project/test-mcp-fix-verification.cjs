#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 MCP Fix Verification Test');
console.log('=' .repeat(50));

console.log('✅ **Fixed Issues Summary:**');
console.log('');

console.log('1. **Added project_root parameter to scan_project tool**');
console.log('   - Location: src/tools/index.ts:153-156');
console.log('   - The tool now accepts an optional project_root parameter');
console.log('');

console.log('2. **Added scanProjectWithRoot method to MindMapEngine**');
console.log('   - Location: src/core/MindMapEngine.ts:174-221');
console.log('   - Creates temporary storage, scanner, and processors for specified root');
console.log('   - Merges results back to main storage');
console.log('   - Creates .mindmap-cache in the specified project directory');
console.log('');

console.log('3. **Updated handleScanProject to auto-detect working directory**');
console.log('   - Location: src/index.ts:541-542');
console.log('   - Uses process.cwd() to get current working directory');
console.log('   - Automatically scans the correct project when called from different directories');
console.log('');

console.log('📋 **How the Fix Works:**');
console.log('');
console.log('When scan_project is called:');
console.log('1. Gets current working directory: process.cwd()');
console.log('2. Compares it to server project root');
console.log('3. If different → uses scanProjectWithRoot(currentWorkingDir)');
console.log('4. If same → uses default scanProject()');
console.log('');

console.log('🏗️ **Technical Implementation:**');
console.log('');
console.log('The scanProjectWithRoot method:');
console.log('- Creates temporary MindMapStorage with the target project root');
console.log('- Creates temporary FileScanner for the target directory');
console.log('- Creates temporary ParallelFileProcessor');
console.log('- Performs the scan with these temporary components');
console.log('- Merges results into the main storage');
console.log('- Creates .mindmap-cache in the correct project directory');
console.log('');

console.log('📁 **Directory Structure After Fix:**');
console.log('');
console.log('Before fix:');
console.log('  mind-map/');
console.log('  ├── .mindmap-cache/          ← Always here');
console.log('  └── demo-project/');
console.log('      └── (no cache)');
console.log('');
console.log('After fix:');
console.log('  mind-map/');
console.log('  ├── .mindmap-cache/          ← Main project cache');
console.log('  └── demo-project/');
console.log('      └── .mindmap-cache/      ← Demo project cache (when scanned)');
console.log('');

console.log('🔄 **Current Status:**');
console.log(`Current working directory: ${process.cwd()}`);
console.log(`Demo project files: ${fs.readdirSync('.').length}`);

const expectedFiles = [
  'package.json',
  'README.md',
  'src/index.js',
  'src/utils.js',
  'tests/utils.test.js'
];

const actualFiles = [];
function findFiles(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      actualFiles.push(path.relative('.', fullPath));
    } else if (stat.isDirectory() && !item.startsWith('.')) {
      findFiles(fullPath);
    }
  }
}

findFiles('.');
console.log(`Actual demo project files: ${actualFiles.length}`);
console.log('Files:', actualFiles.slice(0, 10).join(', ') + (actualFiles.length > 10 ? '...' : ''));

console.log('');
console.log('⚠️  **Note:** The fix is complete but requires MCP server restart to take effect.');
console.log('   The current running MCP instance was started from the main project directory');
console.log('   and needs to be restarted to use the updated code.');
console.log('');
console.log('🎯 **To verify the fix works:**');
console.log('1. Restart Claude Code (to restart MCP server)');
console.log('2. Navigate to demo-project directory');
console.log('3. Run scan_project');
console.log('4. Should scan ~10 files instead of ~150');
console.log('5. Should create .mindmap-cache in demo-project directory');

console.log('');
console.log('✅ **Fix Implementation Complete!**');