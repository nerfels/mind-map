#!/usr/bin/env node

/**
 * Integration Test Runner
 *
 * Executes all test-*.js integration test scripts and provides consolidated reporting.
 * These tests verify end-to-end MCP functionality with real file system operations.
 *
 * Usage:
 *   npm run test:integration              # Run all tests
 *   node run-integration-tests.js         # Run all tests
 *   node run-integration-tests.js simple  # Run test-simple-query.js
 *   node run-integration-tests.js --parallel  # Run tests in parallel
 */

import { spawn } from 'child_process';
import { readdir } from 'fs/promises';
import { basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

class IntegrationTestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  /**
   * Get all test files
   */
  async getTestFiles() {
    const files = await readdir(__dirname);
    return files
      .filter(f => f.startsWith('test-') && f.endsWith('.js'))
      .map(f => join(__dirname, f));
  }

  /**
   * Run a single test file
   */
  async runTest(testFile) {
    const testName = basename(testFile);

    return new Promise((resolve) => {
      const startTime = Date.now();
      let output = '';
      let errorOutput = '';

      console.log(`${colors.cyan}▶${colors.reset} Running ${colors.bright}${testName}${colors.reset}...`);

      const child = spawn('node', [testFile], {
        cwd: __dirname,
        env: { ...process.env, FORCE_COLOR: '1' }
      });

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        const success = code === 0;

        const result = {
          name: testName,
          success,
          duration,
          exitCode: code,
          output: output.trim(),
          error: errorOutput.trim()
        };

        this.results.push(result);

        if (success) {
          console.log(`${colors.green}✓${colors.reset} ${testName} ${colors.gray}(${duration}ms)${colors.reset}`);
        } else {
          console.log(`${colors.red}✗${colors.reset} ${testName} ${colors.gray}(${duration}ms)${colors.reset}`);
          if (errorOutput) {
            console.log(`${colors.red}  Error: ${errorOutput.split('\n')[0]}${colors.reset}`);
          }
        }

        resolve(result);
      });
    });
  }

  /**
   * Run tests in sequence
   */
  async runSequential(testFiles) {
    for (const testFile of testFiles) {
      await this.runTest(testFile);
    }
  }

  /**
   * Run tests in parallel
   */
  async runParallel(testFiles) {
    await Promise.all(testFiles.map(file => this.runTest(file)));
  }

  /**
   * Print summary
   */
  printSummary() {
    const totalDuration = Date.now() - this.startTime;
    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => r.success === false).length;

    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bright}Integration Test Summary${colors.reset}`);
    console.log('='.repeat(60));

    console.log(`Total tests:   ${totalTests}`);
    console.log(`${colors.green}Passed:${colors.reset}        ${passed}`);
    if (failed > 0) {
      console.log(`${colors.red}Failed:${colors.reset}        ${failed}`);
    }
    console.log(`Total time:    ${totalDuration}ms`);

    if (failed > 0) {
      console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  ${colors.red}✗${colors.reset} ${r.name}`);
          if (r.error) {
            console.log(`    ${colors.gray}${r.error.split('\n')[0]}${colors.reset}`);
          }
        });
    }

    console.log('='.repeat(60));

    const avgDuration = totalDuration / totalTests;
    console.log(`Average test duration: ${avgDuration.toFixed(0)}ms`);

    if (passed === totalTests) {
      console.log(`\n${colors.green}${colors.bright}All tests passed!${colors.reset} 🎉`);
    } else {
      console.log(`\n${colors.red}${failed} test(s) failed${colors.reset}`);
    }
  }

  /**
   * Get exit code based on results
   */
  getExitCode() {
    return this.results.some(r => !r.success) ? 1 : 0;
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const parallel = args.includes('--parallel') || args.includes('-p');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const filterArg = args.find(arg => !arg.startsWith('-'));

  console.log(`${colors.bright}${colors.cyan}Mind Map MCP Integration Test Runner${colors.reset}\n`);

  const runner = new IntegrationTestRunner();

  try {
    // Get all test files
    let testFiles = await runner.getTestFiles();

    // Filter if argument provided
    if (filterArg) {
      testFiles = testFiles.filter(f => basename(f).includes(filterArg));
      if (testFiles.length === 0) {
        console.error(`${colors.red}No tests matching "${filterArg}" found${colors.reset}`);
        process.exit(1);
      }
      console.log(`${colors.yellow}Running ${testFiles.length} test(s) matching "${filterArg}"${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}Running ${testFiles.length} integration tests${colors.reset}\n`);
    }

    // Run tests
    if (parallel) {
      console.log(`${colors.cyan}Running tests in parallel...${colors.reset}\n`);
      await runner.runParallel(testFiles);
    } else {
      await runner.runSequential(testFiles);
    }

    // Print summary
    runner.printSummary();

    // Show verbose output if requested
    if (verbose && runner.results.some(r => !r.success)) {
      console.log(`\n${colors.bright}Detailed Output:${colors.reset}\n`);
      runner.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`${colors.bright}${r.name}:${colors.reset}`);
          console.log(r.output || r.error);
          console.log();
        });
    }

    process.exit(runner.getExitCode());
  } catch (error) {
    console.error(`${colors.red}Error running tests:${colors.reset}`, error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(`${colors.red}Uncaught exception:${colors.reset}`, error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error(`${colors.red}Unhandled rejection:${colors.reset}`, error);
  process.exit(1);
});

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { IntegrationTestRunner };
