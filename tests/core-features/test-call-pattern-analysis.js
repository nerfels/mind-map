#!/usr/bin/env node

import { MindMapEngine } from '../../dist/core/MindMapEngine.js';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

class CallPatternAnalysisTestSuite {
  constructor() {
    this.testDir = null;
    this.engine = null;
    this.passedTests = 0;
    this.totalTests = 0;
  }

  async setup() {
    console.log('✅ Test environment created');

    // Create a temporary test directory
    this.testDir = await mkdtemp(join(tmpdir(), 'test-call-patterns-'));
    console.log('✅ Test environment created:', this.testDir);

    // Initialize the MindMapEngine
    this.engine = new MindMapEngine(this.testDir);
    await this.engine.initialize();
    console.log('📊 MindMapEngine initialized for call pattern testing');
  }

  async cleanup() {
    if (this.testDir) {
      try {
        await rm(this.testDir, { recursive: true });
        console.log('🗑️  Cleaned up test directory');
      } catch (error) {
        console.warn('⚠️  Failed to clean up test directory:', error);
      }
    }
  }

  async runTest(name, testFn) {
    this.totalTests++;
    console.log(`🧪 Running: ${name}`);

    try {
      await testFn();
      this.passedTests++;
      const duration = Date.now() - start;
      console.log(`✅ PASSED: ${name} (${duration}ms)`);
    } catch (error) {
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error: ${error.message}`);
    }
  }

  async runAllTests() {
    console.log('🧪 Starting Call Pattern Analysis Test Suite\n');

    await this.setup();

    try {
      // Test 1: Basic Function Call Detection
      await this.runTest('Basic Function Call Detection', async () => {
        const testCode = `
function calculateSum(a, b) {
  return a + b;
}

function processData(data) {
  const result = calculateSum(data.x, data.y);
  return result * 2;
}

function main() {
  const data = { x: 5, y: 3 };
  const processed = processData(data);
  console.log(processed);
}
        `;

        const testFile = join(this.testDir, 'basic-calls.js');
        await writeFile(testFile, testCode);

        const analysis = await this.engine.analyzeCallPatterns([testFile]);

        // Verify basic statistics
        if (analysis.statistics.totalCallPatterns < 3) {
          throw new Error(`Expected at least 3 call patterns, found ${analysis.statistics.totalCallPatterns}`);
        }

        if (analysis.statistics.directCalls < 2) {
          throw new Error(`Expected at least 2 direct calls, found ${analysis.statistics.directCalls}`);
        }

        // Verify call graph structure
        if (analysis.callGraph.nodes.size < 3) {
          throw new Error(`Expected at least 3 functions, found ${analysis.callGraph.nodes.size}`);
        }

        // Check for specific function calls
        const callPatterns = analysis.callPatterns;
        const hasCalculateSumCall = callPatterns.some(p => p.calleeName === 'calculateSum');
        const hasProcessDataCall = callPatterns.some(p => p.calleeName === 'processData');

        if (!hasCalculateSumCall) {
          throw new Error('calculateSum call not detected');
        }

        if (!hasProcessDataCall) {
          throw new Error('processData call not detected');
        }

        console.log(`   📊 Found ${analysis.statistics.totalCallPatterns} call patterns`);
        console.log(`   🔗 Functions: ${Array.from(analysis.callGraph.nodes.values()).map(n => n.name).join(', ')}`);
      });

      // Test 2: Method Call Detection
      await this.runTest('Method Call Detection', async () => {
        const testCode = `
class DataProcessor {
  constructor() {
    this.data = [];
  }

  addData(item) {
    this.data.push(item);
    this.validateData();
  }

  validateData() {
    return this.data.length > 0;
  }

  process() {
    this.data.forEach(item => {
      this.transform(item);
    });
  }

  transform(item) {
    return item * 2;
  }
}

const processor = new DataProcessor();
processor.addData(5);
processor.process();
        `;

        const testFile = join(this.testDir, 'method-calls.js');
        await writeFile(testFile, testCode);

        const analysis = await this.engine.analyzeCallPatterns([testFile]);

        // Verify method calls are detected
        if (analysis.statistics.methodCalls < 3) {
          throw new Error(`Expected at least 3 method calls, found ${analysis.statistics.methodCalls}`);
        }

        // Check for constructor call
        if (analysis.statistics.constructorCalls < 1) {
          throw new Error(`Expected at least 1 constructor call, found ${analysis.statistics.constructorCalls}`);
        }

        // Verify class methods are detected
        const methodNames = Array.from(analysis.callGraph.nodes.values())
          .filter(n => n.type === 'method')
          .map(n => n.name);

        const expectedMethods = ['addData', 'validateData', 'process', 'transform'];
        const missingMethods = expectedMethods.filter(m => !methodNames.includes(m));

        if (missingMethods.length > 0) {
          throw new Error(`Missing methods: ${missingMethods.join(', ')}`);
        }

        console.log(`   📋 Found ${analysis.statistics.methodCalls} method calls`);
        console.log(`   🏗️  Found ${analysis.statistics.constructorCalls} constructor calls`);
        console.log(`   📝 Methods: ${methodNames.join(', ')}`);
      });

      // Test 3: Async Function Detection
      await this.runTest('Async Function Detection', async () => {
        const testCode = `
async function fetchData(url) {
  const response = await fetch(url);
  return response.json();
}

async function processItems(urls) {
  const promises = urls.map(url => fetchData(url));
  const results = await Promise.all(promises);
  return results.map(data => transformData(data));
}

function transformData(data) {
  return { ...data, processed: true };
}

async function main() {
  const urls = ['api/1', 'api/2'];
  const processed = await processItems(urls);
  console.log(processed);
}
        `;

        const testFile = join(this.testDir, 'async-calls.js');
        await writeFile(testFile, testCode);

        const analysis = await this.engine.analyzeCallPatterns([testFile]);

        // Verify async calls are detected
        if (analysis.statistics.asyncCalls < 2) {
          throw new Error(`Expected at least 2 async calls, found ${analysis.statistics.asyncCalls}`);
        }

        // Check for async context detection
        const asyncCallPatterns = analysis.callPatterns.filter(p => p.callType === 'async_call');
        if (asyncCallPatterns.length < 2) {
          throw new Error(`Expected at least 2 async call patterns, found ${asyncCallPatterns.length}`);
        }

        // Verify async context metadata
        const hasAsyncContext = analysis.callPatterns.some(p => p.context.isAsyncContext);
        if (!hasAsyncContext) {
          throw new Error('Async context not detected in call patterns');
        }

        console.log(`   ⚡ Found ${analysis.statistics.asyncCalls} async calls`);
        console.log(`   🔄 Async patterns: ${asyncCallPatterns.map(p => `${p.callerName} → ${p.calleeName}`).join(', ')}`);
      });

      // Test 4: Recursion Detection
      await this.runTest('Recursion Detection', async () => {
        const testCode = `
function factorial(n) {
  if (n <= 1) {
    return 1;
  }
  return n * factorial(n - 1);
}

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

function power(base, exp) {
  if (exp === 0) return 1;
  if (exp === 1) return base;
  return base * power(base, exp - 1);
}

console.log(factorial(5));
console.log(fibonacci(8));
console.log(power(2, 4));
        `;

        const testFile = join(this.testDir, 'recursive-calls.js');
        await writeFile(testFile, testCode);

        const analysis = await this.engine.analyzeCallPatterns([testFile]);

        // Verify recursive functions are detected
        if (analysis.statistics.recursiveFunctions < 3) {
          throw new Error(`Expected at least 3 recursive functions, found ${analysis.statistics.recursiveFunctions}`);
        }

        // Check specific recursive functions
        const recursiveFunctions = Array.from(analysis.callGraph.nodes.values())
          .filter(n => n.isRecursive)
          .map(n => n.name);

        const expectedRecursive = ['factorial', 'fibonacci', 'power'];
        const missingRecursive = expectedRecursive.filter(f => !recursiveFunctions.includes(f));

        if (missingRecursive.length > 0) {
          throw new Error(`Missing recursive functions: ${missingRecursive.join(', ')}`);
        }

        console.log(`   🔄 Found ${analysis.statistics.recursiveFunctions} recursive functions`);
        console.log(`   ↻ Recursive: ${recursiveFunctions.join(', ')}`);
      });

      // Test 5: Complexity and Call Depth Analysis
      await this.runTest('Complexity and Call Depth Analysis', async () => {
        const testCode = `
function level1() {
  level2();
}

function level2() {
  level3();
  level3();
}

function level3() {
  level4();
}

function level4() {
  return "deep";
}

function complexFunction(data) {
  if (data.length > 10) {
    for (let i = 0; i < data.length; i++) {
      if (data[i] > 5) {
        try {
          processItem(data[i]);
        } catch (error) {
          handleError(error);
        }
      }
    }
  }
  return data.filter(x => x > 0);
}

function processItem(item) {
  return item * 2;
}

function handleError(error) {
  console.error(error);
}
        `;

        const testFile = join(this.testDir, 'complexity-calls.js');
        await writeFile(testFile, testCode);

        const analysis = await this.engine.analyzeCallPatterns([testFile]);

        // Verify call depth is calculated
        if (analysis.statistics.maxCallDepth < 3) {
          throw new Error(`Expected call depth of at least 3, found ${analysis.statistics.maxCallDepth}`);
        }

        // Check complexity calculation
        if (analysis.statistics.averageComplexity < 1.5) {
          throw new Error(`Expected average complexity > 1.5, found ${analysis.statistics.averageComplexity}`);
        }

        // Find the complex function
        const complexFunc = Array.from(analysis.callGraph.nodes.values())
          .find(n => n.name === 'complexFunction');

        if (!complexFunc) {
          throw new Error('complexFunction not found in call graph');
        }

        if (complexFunc.complexity < 5) {
          throw new Error(`Expected complexFunction to have complexity > 5, found ${complexFunc.complexity}`);
        }

        // Check for conditional and loop context detection
        const conditionalCalls = analysis.callPatterns.filter(p => p.context.isConditional);
        const loopCalls = analysis.callPatterns.filter(p => p.context.isLoop);
        const tryCatchCalls = analysis.callPatterns.filter(p => p.context.isTryCatch);

        if (conditionalCalls.length === 0) {
          throw new Error('No conditional calls detected');
        }

        if (loopCalls.length === 0) {
          throw new Error('No loop calls detected');
        }

        if (tryCatchCalls.length === 0) {
          throw new Error('No try-catch calls detected');
        }

        console.log(`   📏 Max call depth: ${analysis.statistics.maxCallDepth}`);
        console.log(`   📊 Average complexity: ${analysis.statistics.averageComplexity.toFixed(2)}`);
        console.log(`   🔥 Complex function complexity: ${complexFunc.complexity}`);
        console.log(`   ↔️  Conditional calls: ${conditionalCalls.length}`);
        console.log(`   🔄 Loop calls: ${loopCalls.length}`);
        console.log(`   🛡️  Try-catch calls: ${tryCatchCalls.length}`);
      });

      // Test 6: Entry Points and Popular Functions
      await this.runTest('Entry Points and Popular Functions', async () => {
        const testCode = `
function utilityFunction() {
  return Math.random();
}

function popularFunction(data) {
  return data * utilityFunction();
}

function caller1() {
  return popularFunction(1);
}

function caller2() {
  return popularFunction(2);
}

function caller3() {
  return popularFunction(3);
}

function main() {
  caller1();
  caller2();
  caller3();
}
        `;

        const testFile = join(this.testDir, 'entry-points.js');
        await writeFile(testFile, testCode);

        const analysis = await this.engine.analyzeCallPatterns([testFile]);

        // Check for entry points (functions with no incoming calls)
        if (analysis.callGraph.entryPoints.length === 0) {
          throw new Error('No entry points detected');
        }

        // Find popularFunction and check its incoming calls
        const popularFunc = Array.from(analysis.callGraph.nodes.values())
          .find(n => n.name === 'popularFunction');

        if (!popularFunc) {
          throw new Error('popularFunction not found in call graph');
        }

        if (popularFunc.incomingCalls < 3) {
          throw new Error(`Expected popularFunction to have >= 3 incoming calls, found ${popularFunc.incomingCalls}`);
        }

        // Check that main is an entry point
        const mainIsEntryPoint = analysis.callGraph.entryPoints.some(id => {
          const node = analysis.callGraph.nodes.get(id);
          return node && node.name === 'main';
        });

        if (!mainIsEntryPoint) {
          throw new Error('main function should be an entry point');
        }

        console.log(`   🚪 Entry points: ${analysis.callGraph.entryPoints.length}`);
        console.log(`   📈 popularFunction incoming calls: ${popularFunc.incomingCalls}`);

        const entryPointNames = analysis.callGraph.entryPoints.map(id => {
          const node = analysis.callGraph.nodes.get(id);
          return node ? node.name : 'unknown';
        });
        console.log(`   📝 Entry point functions: ${entryPointNames.join(', ')}`);
      });

    } catch (error) {
      console.error('Test suite error:', error);
    } finally {
      await this.cleanup();
    }

    // Print results
    console.log('\n📊 TEST RESULTS');
    console.log('==================================================');
    console.log(`✅ Passed: ${this.passedTests}`);
    console.log(`❌ Failed: ${this.totalTests - this.passedTests}`);
    console.log(`📈 Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);

    if (this.passedTests === this.totalTests) {
      console.log('\n🎉 Call Pattern Analysis Test Complete - All Tests Passed!');
    } else {
      console.log(`\n⚠️  Call Pattern Analysis Test Complete - ${this.totalTests - this.passedTests} tests failed`);
    }
  }
}

// Run the test suite
const suite = new CallPatternAnalysisTestSuite();

// Fix: Add start variable for duration calculation
let start;

// Override runTest method to properly calculate duration
const originalRunTest = suite.runTest.bind(suite);
suite.runTest = async function(name, testFn) {
  this.totalTests++;
  console.log(`🧪 Running: ${name}`);

  start = Date.now(); // Set start time here

  try {
    await testFn();
    this.passedTests++;
    const duration = Date.now() - start;
    console.log(`✅ PASSED: ${name} (${duration}ms)`);
  } catch (error) {
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);
  }
};

suite.runAllTests().catch(console.error);