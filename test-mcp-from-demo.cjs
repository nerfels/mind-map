#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Paths
const DEMO_PROJECT_PATH = path.join(__dirname, 'demo-project');
const MCP_ROOT = __dirname;

async function runCommand(command, args, cwd, input = null) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';
    let stderr = '';

    if (input) {
      proc.stdin.write(input);
      proc.stdin.end();
    }

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

async function testMCPFromDemoProject() {
  console.log('🧪 Testing MCP Mind Map functionality from Demo Project');
  console.log('=' .repeat(60));

  // Build the MCP server first
  console.log('\n🏗️  Building MCP server...');
  const buildResult = await runCommand('npm', ['run', 'build'], MCP_ROOT);

  if (buildResult.code !== 0) {
    console.log('⚠️  Build warnings/errors:', buildResult.stderr);
    // Continue anyway as it might still work
  }

  // Change to demo project directory
  process.chdir(DEMO_PROJECT_PATH);
  console.log(`📁 Working directory: ${process.cwd()}`);

  // Test 1: Scan project using MCP from demo directory
  console.log('\n🔍 Test 1: MCP scan_project from demo directory');
  const scanTest = await runCommand('node', ['-e', `
    const originalCwd = process.cwd();
    console.log('Demo project working directory:', originalCwd);

    // Try to use the built MCP server
    try {
      // This simulates calling the MCP server from the demo project context
      const { MindMapEngine } = require('${path.join(MCP_ROOT, 'dist', 'core', 'MindMapEngine.js')}');

      console.log('✅ Successfully imported MindMapEngine');

      const engine = new MindMapEngine();
      console.log('✅ MindMapEngine instance created');
      console.log('Engine working directory check:', process.cwd());

      // Test scanning current directory (demo project)
      const result = engine.scan_project({});
      console.log('Scan result summary:');
      console.log('- Working directory during scan:', process.cwd());
      console.log('- Files found:', result.stats?.nodes || 'N/A');

    } catch (error) {
      console.error('❌ MCP test error:', error.message);
      console.error('Stack:', error.stack);
    }
  `], DEMO_PROJECT_PATH);

  console.log('Scan test output:');
  console.log(scanTest.stdout);
  if (scanTest.stderr) {
    console.log('Scan test errors:');
    console.log(scanTest.stderr);
  }

  // Test 2: Query mind map from demo project
  console.log('\n🔍 Test 2: MCP query_mindmap from demo directory');
  const queryTest = await runCommand('node', ['-e', `
    try {
      console.log('Query test working directory:', process.cwd());

      const { MindMapEngine } = require('${path.join(MCP_ROOT, 'dist', 'core', 'MindMapEngine.js')}');
      const engine = new MindMapEngine();

      // First scan to populate the mind map
      console.log('Scanning demo project...');
      const scanResult = engine.scan_project({});
      console.log('Scan completed, nodes found:', scanResult.stats?.nodes || 0);

      // Then query for JavaScript files
      console.log('Querying for JavaScript files...');
      const queryResult = engine.query_mindmap({
        query: 'index.js',
        limit: 5
      });

      console.log('Query results:');
      console.log('- Results found:', queryResult.results?.length || 0);
      if (queryResult.results?.length > 0) {
        queryResult.results.forEach((result, i) => {
          console.log(\`  \${i+1}. \${result.id} (confidence: \${result.confidence})\`);
        });
      }

    } catch (error) {
      console.error('❌ Query test error:', error.message);
    }
  `], DEMO_PROJECT_PATH);

  console.log('Query test output:');
  console.log(queryTest.stdout);
  if (queryTest.stderr) {
    console.log('Query test errors:');
    console.log(queryTest.stderr);
  }

  // Test 3: Verify file paths are relative to demo project
  console.log('\n📝 Test 3: Verify file operations respect demo project context');
  const fileTest = await runCommand('node', ['-e', `
    const fs = require('fs');
    const path = require('path');

    console.log('File test working directory:', process.cwd());

    // Create a test file in the current directory (should be demo project)
    const testFile = 'mcp-context-test.md';
    const testContent = \`# MCP Context Test

This file was created during MCP testing.
Created at: \${new Date().toISOString()}
Working directory: \${process.cwd()}
    \`;

    fs.writeFileSync(testFile, testContent);
    console.log('✅ Test file created:', path.resolve(testFile));

    // Verify the file is in the demo project
    const absolutePath = path.resolve(testFile);
    const expectedPath = '${DEMO_PROJECT_PATH}';

    if (absolutePath.startsWith(expectedPath)) {
      console.log('✅ File created in correct directory (demo project)');
    } else {
      console.log('❌ File created in wrong directory');
      console.log('Expected path to start with:', expectedPath);
      console.log('Actual path:', absolutePath);
    }

    // Clean up
    fs.unlinkSync(testFile);
    console.log('✅ Test file cleaned up');

  `], DEMO_PROJECT_PATH);

  console.log('File test output:');
  console.log(fileTest.stdout);
  if (fileTest.stderr) {
    console.log('File test errors:');
    console.log(fileTest.stderr);
  }

  // Test 4: Directory listing verification
  console.log('\n📋 Test 4: Final directory verification');
  const finalList = fs.readdirSync(DEMO_PROJECT_PATH);
  console.log('Final demo project contents:', finalList);

  // Verify expected structure
  const expectedDirs = ['src', 'tests', 'docs'];
  const expectedFiles = ['package.json', 'README.md'];

  const missingDirs = expectedDirs.filter(dir => !finalList.includes(dir));
  const missingFiles = expectedFiles.filter(file => !finalList.includes(file));

  if (missingDirs.length === 0 && missingFiles.length === 0) {
    console.log('✅ Demo project structure intact');
  } else {
    console.log('❌ Demo project structure issues:');
    if (missingDirs.length > 0) console.log('  Missing directories:', missingDirs);
    if (missingFiles.length > 0) console.log('  Missing files:', missingFiles);
  }

  console.log('\n🎉 MCP demo project tests completed!');
}

async function main() {
  const originalCwd = process.cwd();

  try {
    await testMCPFromDemoProject();
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    // Restore original working directory
    process.chdir(originalCwd);
    console.log(`\n🔄 Restored working directory: ${process.cwd()}`);
  }
}

main();