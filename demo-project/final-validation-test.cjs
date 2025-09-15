#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎯 Final MCP Demo Project Validation Test');
console.log('=' .repeat(50));

function testResult(testName, passed, message) {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${testName}: ${message}`);
  return passed;
}

function main() {
  let totalTests = 0;
  let passedTests = 0;

  // Test 1: Verify working directory
  totalTests++;
  const currentDir = process.cwd();
  const isInDemoProject = currentDir.endsWith('demo-project');
  if (testResult('Working Directory', isInDemoProject, `Current directory: ${currentDir}`)) {
    passedTests++;
  }

  // Test 2: Verify demo project structure
  totalTests++;
  const expectedFiles = ['package.json', 'README.md'];
  const expectedDirs = ['src', 'tests', 'docs'];

  const allExpectedExists = [...expectedFiles, ...expectedDirs].every(item =>
    fs.existsSync(path.join(currentDir, item))
  );

  if (testResult('Demo Project Structure', allExpectedExists, 'All expected files and directories present')) {
    passedTests++;
  }

  // Test 3: Verify file creation in correct location
  totalTests++;
  const testFile = 'validation-test-file.tmp';
  const testContent = 'Validation test content';

  try {
    fs.writeFileSync(testFile, testContent);
    const absolutePath = path.resolve(testFile);
    const isInCorrectLocation = absolutePath.includes('demo-project');

    // Clean up
    fs.unlinkSync(testFile);

    if (testResult('File Creation Location', isInCorrectLocation, `Files created in demo project: ${isInCorrectLocation}`)) {
      passedTests++;
    }
  } catch (error) {
    testResult('File Creation Location', false, `Error: ${error.message}`);
  }

  // Test 4: Verify demo project files exist
  totalTests++;
  const demoProjectFiles = [
    'src/index.js',
    'src/utils.js',
    'tests/utils.test.js'
  ];

  const allDemoFilesExist = demoProjectFiles.every(file => fs.existsSync(file));
  if (testResult('Demo Project Files', allDemoFilesExist, 'All demo project source files exist')) {
    passedTests++;
  }

  // Test 5: Verify MCP cache location (should be in parent)
  totalTests++;
  const parentCacheExists = fs.existsSync('../.mindmap-cache');
  if (testResult('MCP Cache Location', parentCacheExists, 'MCP cache exists in parent directory')) {
    passedTests++;
  }

  // Test 6: Verify package.json content
  totalTests++;
  try {
    const packageContent = fs.readFileSync('package.json', 'utf8');
    const packageJson = JSON.parse(packageContent);
    const isValidPackage = packageJson.name === 'demo-project' && packageJson.dependencies;

    if (testResult('Package.json Content', isValidPackage, `Package name: ${packageJson.name}`)) {
      passedTests++;
    }
  } catch (error) {
    testResult('Package.json Content', false, `Error reading package.json: ${error.message}`);
  }

  // Final summary
  console.log('\n' + '=' .repeat(50));
  console.log(`🎯 Test Results: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! MCP demo project validation successful.');
    console.log('\n📋 Summary:');
    console.log('- ✅ Working directory is demo project');
    console.log('- ✅ Demo project structure is correct');
    console.log('- ✅ Files are created in the right location');
    console.log('- ✅ All demo project files exist');
    console.log('- ✅ MCP cache is properly located');
    console.log('- ✅ Package configuration is valid');

    return 0;
  } else {
    console.log(`❌ ${totalTests - passedTests} tests failed. Please check the issues above.`);
    return 1;
  }
}

// Run the validation
process.exit(main());