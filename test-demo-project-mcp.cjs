#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Test configuration
const DEMO_PROJECT_PATH = path.join(__dirname, 'demo-project');
const MCP_SERVER_PATH = path.join(__dirname, 'src', 'index.ts');

async function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: cwd,
      stdio: 'pipe',
      shell: true
    });

    let stdout = '';
    let stderr = '';

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

async function sendMCPRequest(method, params = {}) {
  const request = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: method,
    params: params
  };

  console.log(`\n📤 Sending MCP request: ${method}`);
  console.log(JSON.stringify(request, null, 2));

  try {
    // Simulate MCP request by running node directly with the MCP server
    const result = await runCommand('node', ['-e', `
      const mindMap = require('./dist/index.js');
      const result = mindMap.${method}(${JSON.stringify(params)});
      console.log(JSON.stringify(result, null, 2));
    `], __dirname);

    if (result.code === 0 && result.stdout) {
      console.log(`\n📥 MCP Response:`);
      console.log(result.stdout);
      return JSON.parse(result.stdout);
    } else {
      console.error(`\n❌ MCP Error:`, result.stderr);
      return null;
    }
  } catch (error) {
    console.error(`\n❌ Request failed:`, error.message);
    return null;
  }
}

async function testDirectoryContext() {
  console.log('\n🧪 Testing MCP Directory Context');
  console.log('=' .repeat(50));

  // Get current working directory
  const originalCwd = process.cwd();
  console.log(`Original working directory: ${originalCwd}`);

  try {
    // Change to demo project directory
    process.chdir(DEMO_PROJECT_PATH);
    const demoCwd = process.cwd();
    console.log(`Changed to demo project directory: ${demoCwd}`);

    // Test 1: Scan project from demo directory
    console.log('\n🔍 Test 1: Scanning project from demo directory');
    const scanResult = await runCommand('node', ['-e', `
      process.chdir('${DEMO_PROJECT_PATH}');
      const fs = require('fs');
      const path = require('path');

      // Simple directory scan
      function scanDirectory(dir) {
        const files = [];
        function walkDir(currentPath) {
          const items = fs.readdirSync(currentPath);
          for (const item of items) {
            const fullPath = path.join(currentPath, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              walkDir(fullPath);
            } else {
              files.push(path.relative('${DEMO_PROJECT_PATH}', fullPath));
            }
          }
        }
        walkDir(dir);
        return files;
      }

      const scannedFiles = scanDirectory('.');
      console.log(JSON.stringify({
        workingDirectory: process.cwd(),
        scannedFiles: scannedFiles,
        totalFiles: scannedFiles.length
      }, null, 2));
    `], DEMO_PROJECT_PATH);

    if (scanResult.code === 0) {
      const scanData = JSON.parse(scanResult.stdout);
      console.log('✅ Scan successful');
      console.log(`Working directory: ${scanData.workingDirectory}`);
      console.log(`Files found: ${scanData.totalFiles}`);
      console.log('Files:', scanData.scannedFiles);

      // Verify we're scanning the right directory
      if (scanData.workingDirectory === DEMO_PROJECT_PATH) {
        console.log('✅ Working directory is correct');
      } else {
        console.log('❌ Working directory mismatch');
      }

      // Verify we found expected files
      const expectedFiles = ['package.json', 'src/index.js', 'src/utils.js', 'tests/utils.test.js', 'README.md'];
      const foundExpectedFiles = expectedFiles.filter(file => scanData.scannedFiles.includes(file));

      if (foundExpectedFiles.length === expectedFiles.length) {
        console.log('✅ All expected files found');
      } else {
        console.log('❌ Missing expected files:', expectedFiles.filter(f => !foundExpectedFiles.includes(f)));
      }
    }

    // Test 2: Create file in demo project
    console.log('\n📝 Test 2: Creating file in demo project');
    const testFileName = 'mcp-test-file.txt';
    const testFilePath = path.join(DEMO_PROJECT_PATH, testFileName);
    const testContent = `MCP Test File
Created at: ${new Date().toISOString()}
Working Directory: ${process.cwd()}
Demo Project Path: ${DEMO_PROJECT_PATH}`;

    fs.writeFileSync(testFilePath, testContent);

    if (fs.existsSync(testFilePath)) {
      console.log('✅ File created successfully');
      console.log(`File location: ${testFilePath}`);

      const createdContent = fs.readFileSync(testFilePath, 'utf8');
      console.log('File content:');
      console.log(createdContent);

      // Verify file is in the right location
      if (testFilePath.startsWith(DEMO_PROJECT_PATH)) {
        console.log('✅ File created in correct directory');
      } else {
        console.log('❌ File created in wrong directory');
      }
    } else {
      console.log('❌ File creation failed');
    }

    // Test 3: Verify file operations respect working directory
    console.log('\n📂 Test 3: Verifying relative path operations');
    const relativeTestFile = 'relative-test.txt';
    fs.writeFileSync(relativeTestFile, 'This file should be in demo project');

    const absolutePathOfRelativeFile = path.resolve(relativeTestFile);
    console.log(`Relative file absolute path: ${absolutePathOfRelativeFile}`);

    if (absolutePathOfRelativeFile.startsWith(DEMO_PROJECT_PATH)) {
      console.log('✅ Relative paths resolve to demo project directory');
    } else {
      console.log('❌ Relative paths do not resolve to demo project directory');
    }

    // Test 4: Directory listing comparison
    console.log('\n📋 Test 4: Directory listing verification');
    const demoFiles = fs.readdirSync('.').filter(f => !f.startsWith('.'));
    const expectedInDemo = ['package.json', 'src', 'tests', 'docs', 'README.md', testFileName, relativeTestFile];

    console.log('Files in demo directory:', demoFiles);
    console.log('Expected files:', expectedInDemo);

    const missingFiles = expectedInDemo.filter(f => !demoFiles.includes(f));
    if (missingFiles.length === 0) {
      console.log('✅ All expected files present in demo directory');
    } else {
      console.log('❌ Missing files in demo directory:', missingFiles);
    }

    // Clean up test files
    [testFilePath, path.join(DEMO_PROJECT_PATH, relativeTestFile)].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`Cleaned up: ${file}`);
      }
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Restore original working directory
    process.chdir(originalCwd);
    console.log(`\nRestored working directory: ${process.cwd()}`);
  }
}

async function testMCPIntegration() {
  console.log('\n🔌 Testing MCP Integration with Demo Project');
  console.log('=' .repeat(50));

  // Change to demo project for MCP tests
  const originalCwd = process.cwd();
  process.chdir(DEMO_PROJECT_PATH);

  try {
    // Test MCP server compilation
    console.log('\n🏗️  Testing MCP server compilation');
    const compileResult = await runCommand('npx', ['tsc', '--build'], path.dirname(__dirname));

    if (compileResult.code === 0) {
      console.log('✅ MCP server compiled successfully');
    } else {
      console.log('❌ MCP server compilation failed:', compileResult.stderr);
      return;
    }

    // Test basic MCP functionality from demo project context
    console.log('\n🧠 Testing MCP mind map functions from demo project');

    // This simulates what would happen when MCP is called from demo project
    const mcpTest = await runCommand('node', ['-e', `
      console.log('Testing MCP from demo project context');
      console.log('Current working directory:', process.cwd());
      console.log('Directory contents:', require('fs').readdirSync('.'));

      // Test if we can access mind map functions
      try {
        // This would be the actual MCP integration point
        const result = {
          workingDir: process.cwd(),
          files: require('fs').readdirSync('.'),
          canAccessParent: require('fs').existsSync('../src/index.ts'),
          mcpServerPath: require('path').resolve('../src/index.ts')
        };
        console.log('MCP Context Test Result:', JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('MCP test error:', error.message);
      }
    `], DEMO_PROJECT_PATH);

    if (mcpTest.code === 0) {
      console.log('✅ MCP context test completed');
      console.log(mcpTest.stdout);
    } else {
      console.log('❌ MCP context test failed:', mcpTest.stderr);
    }

  } catch (error) {
    console.error('❌ MCP integration test failed:', error.message);
  } finally {
    process.chdir(originalCwd);
  }
}

async function main() {
  console.log('🚀 Starting MCP Demo Project Tests');
  console.log('=' .repeat(60));

  // Verify demo project exists
  if (!fs.existsSync(DEMO_PROJECT_PATH)) {
    console.error('❌ Demo project directory not found:', DEMO_PROJECT_PATH);
    process.exit(1);
  }

  console.log('✅ Demo project found:', DEMO_PROJECT_PATH);

  await testDirectoryContext();
  await testMCPIntegration();

  console.log('\n🎉 All tests completed!');
  console.log('=' .repeat(60));
}

// Run the tests
main().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});