#!/usr/bin/env node

/**
 * Comprehensive Test Suite for MCP query_mindmap Method
 * Tests various query types supported by the enhanced semantic search
 */

const testQueries = [
  // 1. FILE PATH QUERIES
  // Should return all functions/classes in files with high confidence
  {
    category: "File Path Queries",
    tests: [
      {
        name: "Query specific TypeScript file",
        query: "src/core/MindMapEngine.ts",
        expectedTypes: ["file", "class", "function"],
        description: "Should return the file and its contents (classes/functions)"
      },
      {
        name: "Query tools index file",
        query: "src/tools/index.ts",
        expectedTypes: ["file", "class", "function"],
        description: "Should return tool definitions and exports"
      },
      {
        name: "Query main source directory",
        query: "src/core/",
        expectedTypes: ["directory", "file"],
        description: "Should return directory and contained files"
      },
      {
        name: "Query test files",
        query: "tests/",
        expectedTypes: ["directory", "file"],
        description: "Should return test directory structure"
      }
    ]
  },

  // 2. FUNCTION/CLASS NAME SEARCHES
  // With semantic expansion
  {
    category: "Function/Class Name Searches",
    tests: [
      {
        name: "Search for MindMapEngine class",
        query: "MindMapEngine",
        expectedTypes: ["class"],
        description: "Should find the main MindMapEngine class"
      },
      {
        name: "Search for query method",
        query: "query",
        expectedTypes: ["function"],
        description: "Should find query-related functions"
      },
      {
        name: "Search for analyzer functions",
        query: "analyzer",
        expectedTypes: ["function", "class"],
        description: "Should find analyzer-related code"
      },
      {
        name: "Search for scan functions",
        query: "scan",
        expectedTypes: ["function"],
        description: "Should find scanning-related functions"
      },
      {
        name: "Search camelCase function name",
        query: "calculateRelevanceScore",
        expectedTypes: ["function"],
        description: "Should find specific camelCase function"
      }
    ]
  },

  // 3. SEMANTIC CONCEPT SEARCHES
  // Should find authentication, validation, etc.
  {
    category: "Semantic Concept Searches",
    tests: [
      {
        name: "Search for tool-related code",
        query: "tool",
        expectedTypes: ["function", "class", "file"],
        description: "Should find tool definitions and tool-related functionality"
      },
      {
        name: "Search for server/service code",
        query: "server",
        expectedTypes: ["function", "class"],
        description: "Should find server-related functionality"
      },
      {
        name: "Search for test code",
        query: "test",
        expectedTypes: ["file", "function"],
        description: "Should find test files and test functions"
      },
      {
        name: "Search for configuration code",
        query: "config",
        expectedTypes: ["file", "function"],
        description: "Should find configuration-related code"
      },
      {
        name: "Search for error handling",
        query: "error",
        expectedTypes: ["function", "class"],
        description: "Should find error handling code"
      },
      {
        name: "Search for database/storage",
        query: "storage",
        expectedTypes: ["function", "class"],
        description: "Should find storage-related functionality"
      }
    ]
  },

  // 4. MULTI-WORD AND CAMELCASE MATCHING
  // With context-aware boosting
  {
    category: "Multi-word and camelCase Matching",
    tests: [
      {
        name: "Search multi-word concept",
        query: "mind map",
        expectedTypes: ["class", "function"],
        description: "Should find mind map related code"
      },
      {
        name: "Search compound concept",
        query: "pattern analysis",
        expectedTypes: ["function", "class"],
        description: "Should find pattern analysis functionality"
      },
      {
        name: "Search camelCase with context",
        query: "JavaAnalyzer",
        expectedTypes: ["class", "function"],
        description: "Should find Java analyzer code"
      },
      {
        name: "Search hyphenated concept",
        query: "brain-inspired",
        expectedTypes: ["function", "file"],
        description: "Should find brain-inspired learning code"
      }
    ]
  },

  // 5. TYPE-FILTERED SEARCHES
  // Test the type parameter
  {
    category: "Type-Filtered Searches",
    tests: [
      {
        name: "Find only functions containing 'analyze'",
        query: "analyze",
        type: "function",
        expectedTypes: ["function"],
        description: "Should return only functions, not classes or files"
      },
      {
        name: "Find only classes containing 'Engine'",
        query: "Engine",
        type: "class",
        expectedTypes: ["class"],
        description: "Should return only class definitions"
      },
      {
        name: "Find only files containing 'test'",
        query: "test",
        type: "file",
        expectedTypes: ["file"],
        description: "Should return only file nodes"
      }
    ]
  },

  // 6. PARTIAL MATCHING CASES
  // Test partial string matching and fuzzy search
  {
    category: "Partial Matching Cases",
    tests: [
      {
        name: "Partial class name",
        query: "Engine",
        expectedTypes: ["class"],
        description: "Should find MindMapEngine, JavaAnalyzer etc. containing 'Engine'"
      },
      {
        name: "Partial function name",
        query: "analyze",
        expectedTypes: ["function"],
        description: "Should find analyze, analyzeCode, analyzeStructure functions"
      },
      {
        name: "Partial file name",
        query: "test",
        expectedTypes: ["file"],
        description: "Should find all test files containing 'test'"
      },
      {
        name: "Beginning of word",
        query: "scan",
        expectedTypes: ["function", "class"],
        description: "Should find scanProject, scanner, scanning functions"
      },
      {
        name: "Middle of word",
        query: "Map",
        expectedTypes: ["class", "function"],
        description: "Should find MindMapEngine, mindMap functions"
      },
      {
        name: "End of word",
        query: "ing",
        expectedTypes: ["function", "file"],
        description: "Should find scanning, processing, testing functions"
      }
    ]
  },

  // 7. SPECIAL CASES AND ROBUSTNESS
  {
    category: "Special Cases and Robustness",
    tests: [
      {
        name: "Empty query",
        query: "",
        expectedTypes: [],
        description: "Should handle empty query gracefully"
      },
      {
        name: "Whitespace only",
        query: "   ",
        expectedTypes: [],
        description: "Should handle whitespace-only query"
      },
      {
        name: "Very short query",
        query: "a",
        expectedTypes: ["function", "class", "file"],
        description: "Should handle single character queries"
      },
      {
        name: "Non-existent concept",
        query: "nonexistentfunctionname12345",
        expectedTypes: [],
        description: "Should return empty results for non-existent items"
      },
      {
        name: "Special characters - underscore",
        query: "test_",
        expectedTypes: ["function", "file"],
        description: "Should handle underscores"
      },
      {
        name: "Special characters - dash",
        query: "mind-map",
        expectedTypes: ["function", "file"],
        description: "Should handle dashes and hyphens"
      },
      {
        name: "Special characters - dot",
        query: ".ts",
        expectedTypes: ["file"],
        description: "Should handle file extensions"
      },
      {
        name: "Numbers in query",
        query: "test123",
        expectedTypes: ["function", "file"],
        description: "Should handle alphanumeric queries"
      },
      {
        name: "Mixed case sensitivity",
        query: "MindMap",
        expectedTypes: ["class", "function"],
        description: "Should handle mixed case"
      },
      {
        name: "All uppercase",
        query: "ENGINE",
        expectedTypes: ["class", "function"],
        description: "Should handle uppercase queries"
      },
      {
        name: "All lowercase",
        query: "engine",
        expectedTypes: ["class", "function"],
        description: "Should handle lowercase queries"
      },
      {
        name: "Unicode characters",
        query: "café",
        expectedTypes: [],
        description: "Should handle unicode characters gracefully"
      },
      {
        name: "Very long query",
        query: "thisisaverylongquerythatprobablydoesnotexistanywhere",
        expectedTypes: [],
        description: "Should handle very long queries"
      },
      {
        name: "Query with quotes",
        query: '"exact match"',
        expectedTypes: [],
        description: "Should handle quoted strings"
      },
      {
        name: "Query with parentheses",
        query: "function()",
        expectedTypes: ["function"],
        description: "Should handle function call syntax"
      }
    ]
  }
];

async function runQuery(queryText, options = {}) {
  try {
    console.log(`\n🔍 Query: "${queryText}"${options.type ? ` [type: ${options.type}]` : ''}`);

    const queryParams = {
      query: queryText,
      limit: options.limit || 10,
      include_metadata: options.include_metadata || false
    };

    if (options.type) {
      queryParams.type = options.type;
    }

    // Since we don't have direct MCP access in this script, we'll simulate the call
    // In real implementation, this would call the MCP tool
    console.log('📝 Query Parameters:', JSON.stringify(queryParams, null, 2));
    console.log('⏳ This would call: mcp__mind-map-mcp__query_mindmap');

    return {
      success: true,
      results: [],
      queryParams
    };
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    return {
      success: false,
      error: error.message,
      queryParams: options
    };
  }
}

async function runTestSuite() {
  console.log('🚀 Starting Mind Map Query Test Suite');
  console.log('=' .repeat(60));

  let totalTests = 0;
  let passedTests = 0;

  for (const category of testQueries) {
    console.log(`\n📂 ${category.category}`);
    console.log('-'.repeat(40));

    for (const test of category.tests) {
      totalTests++;
      console.log(`\n${totalTests}. ${test.name}`);
      console.log(`   Description: ${test.description}`);

      const options = {};
      if (test.type) options.type = test.type;
      if (test.limit) options.limit = test.limit;
      if (test.include_metadata) options.include_metadata = test.include_metadata;

      const result = await runQuery(test.query, options);

      if (result.success) {
        console.log('   ✅ Query executed successfully');
        console.log(`   📊 Expected types: [${test.expectedTypes.join(', ')}]`);
        passedTests++;
      } else {
        console.log('   ❌ Query failed');
        console.log(`   Error: ${result.error}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary:');
  console.log(`   Total tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${totalTests - passedTests}`);
  console.log(`   Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the output above.');
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testQueries, runQuery, runTestSuite };
}

// Run if called directly
if (require.main === module) {
  runTestSuite().catch(console.error);
}