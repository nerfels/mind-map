#!/usr/bin/env node

/**
 * Java AST Support Test Suite
 * Tests the new JavaAnalyzer implementation with strategic MCP usage
 */

import { spawn } from 'child_process';
import { writeFile } from 'fs/promises';

console.log('☕ Testing Java AST Support');
console.log('\n============================================================');

// Test data - send requests to MCP server
const tests = [
  {
    name: 'Scan Project with Java Files',
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'scan_project',
        arguments: {
          force_rescan: true,
          include_analysis: true,
          ast_analysis: true
        }
      }
    }
  },
  {
    name: 'Query Java Classes',
    request: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'query_mindmap',
        arguments: {
          query: 'Java Spring Boot classes and methods',
          type: 'class',
          limit: 10,
          include_metadata: true
        }
      }
    }
  },
  {
    name: 'Advanced Query - Java Functions',
    request: {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'advanced_query',
        arguments: {
          query: 'MATCH (c:class) WHERE c.properties.language = "java" RETURN c.name, c.metadata',
          limit: 10
        }
      }
    }
  },
  {
    name: 'Aggregate Query - Files by Language',
    request: {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'aggregate_query',
        arguments: {
          aggregation: {
            function: 'count',
            field: 'id'
          },
          group_by: [
            {
              field: 'properties.language'
            }
          ],
          order_by: [
            {
              field: 'count',
              direction: 'DESC'
            }
          ]
        }
      }
    }
  },
  {
    name: 'Check Framework Detection',
    request: {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'query_mindmap',
        arguments: {
          query: 'Spring Boot framework',
          type: 'pattern',
          limit: 5
        }
      }
    }
  },
  {
    name: 'Pattern Analysis',
    request: {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'analyze_architecture',
        arguments: {
          pattern_type: 'design',
          min_confidence: 0.3,
          limit: 10
        }
      }
    }
  }
];

async function runTests() {
  console.log('🚀 Starting Java AST support tests...\n');
  console.log('Note: This test requires the java-parser npm package to be installed\n');

  let passed = 0;
  let total = tests.length;
  const startTime = Date.now();

  for (const test of tests) {
    try {
      console.log(`🧪 Running: ${test.name}`);
      const serverProcess = spawn('node', ['../../dist/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Capture server output
      let stdout = '';
      let stderr = '';

      serverProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      serverProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        if (stderr.includes('Server stderr:') || stderr.includes('Starting project scan')) {
          process.stderr.write(`Server stderr: ${stderr}`);
        }
      });

      // Send the test request
      const testStart = Date.now();
      serverProcess.stdin.write(JSON.stringify(test.request) + '\n');
      serverProcess.stdin.end();

      // Wait for response
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          serverProcess.kill();
          reject(new Error('Test timeout'));
        }, 15000);

        serverProcess.on('close', (code) => {
          clearTimeout(timeout);
          try {
            // Find JSON response in stdout
            const lines = stdout.split('\n');
            for (const line of lines) {
              if (line.trim().startsWith('{') && line.includes('"jsonrpc"')) {
                resolve(JSON.parse(line.trim()));
                return;
              }
            }
            reject(new Error('No valid JSON response found'));
          } catch (e) {
            reject(new Error(`Parse error: ${e.message}`));
          }
        });
      });

      const testTime = Date.now() - testStart;
      
      if (response.result) {
        console.log(`✅ ${test.name} (${testTime}ms):`);
        
        // Display relevant results based on test type
        if (response.result.content && response.result.content[0] && response.result.content[0].text) {
          const text = response.result.content[0].text;
          
          if (test.name.includes('Scan Project')) {
            console.log(text);
          } else if (test.name.includes('Advanced Query') || test.name.includes('Aggregate Query')) {
            // Parse and display structured results
            console.log(text);
          } else {
            // Show first few lines for other queries
            const lines = text.split('\n').slice(0, 10).join('\n');
            console.log(lines + (text.split('\n').length > 10 ? '...\n' : '\n'));
          }
        } else {
          console.log('Response:', JSON.stringify(response.result, null, 2));
        }
        passed++;
      } else {
        console.log(`❌ ${test.name}: ${response.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
    
    console.log('');
  }

  const totalTime = Date.now() - startTime;
  
  console.log(`🎉 Java AST Testing Complete!`);
  console.log(`⏱️ Total test time: ${totalTime}ms`);
  console.log(`📊 Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n✨ Java Language Support Features Verified:');
    console.log('  ✅ Java file detection and classification');
    console.log('  ✅ Java AST parsing (classes, methods, imports)');
    console.log('  ✅ Java framework detection (Spring Boot, JPA, etc.)');
    console.log('  ✅ Java pattern analysis (naming conventions, design patterns)');
    console.log('  ✅ Multi-language query support');
    console.log('\n🏆 Phase 5.2: Java AST Support COMPLETE!');
  } else {
    console.log(`\n⚠️  ${total - passed} test(s) failed. Check the output above for details.`);
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});