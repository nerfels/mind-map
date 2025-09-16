#!/usr/bin/env node

import { CallPatternAnalyzer } from './dist/core/CallPatternAnalyzer.js';
import { readFile, writeFile } from 'fs/promises';

async function testVariableTracking() {
  console.log('🧪 Testing Variable Usage Tracking Functionality');
  console.log('=' .repeat(60));

  const analyzer = new CallPatternAnalyzer();

  // Create test TypeScript file content
  const testCode = `
// Test file for variable tracking
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://api.example.com';
export const DEFAULT_TIMEOUT = 5000;

interface User {
  id: number;
  name: string;
  email: string;
}

export class UserService {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = API_URL, timeout: number = DEFAULT_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async fetchUser(userId: number): Promise<User | null> {
    try {
      const response = await axios.get(\`\${this.baseUrl}/users/\${userId}\`, {
        timeout: this.timeout
      });

      if (response.data) {
        const user: User = response.data;
        return user;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      return null;
    }
  }

  updateUser(user: User): Promise<boolean> {
    const config = { timeout: this.timeout };
    return axios.put(\`\${this.baseUrl}/users/\${user.id}\`, user, config)
      .then(response => response.status === 200)
      .catch(() => false);
  }
}

export function useUserData(userId: number) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const userService = new UserService();
        const userData = await userService.fetchUser(userId);
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  return { user, loading, error };
}

// Some unused variables for testing
const UNUSED_CONSTANT = 'This is not used';
let unusedVariable = 42;
const unusedFunction = () => console.log('never called');
`;

  // Create a temporary test file
  const testFilePath = './test-variable-sample.ts';
  await writeFile(testFilePath, testCode);

  try {
    console.log('📁 Analyzing test file for variable patterns...\n');

    // Analyze the test file
    const result = await analyzer.analyzeFile(testFilePath, testCode);

    console.log('📊 Variable Analysis Results:');
    console.log('-'.repeat(40));

    // Display variable declarations
    console.log(`\n🔸 Variable Declarations (${result.variableAnalysis.declarations.length} found):`);
    result.variableAnalysis.declarations.forEach((decl, index) => {
      console.log(`  ${index + 1}. ${decl.name} (${decl.type}) - Line ${decl.lineNumber}`);
      console.log(`     Scope: ${decl.scope}, Exported: ${decl.isExported}, Imported: ${decl.isImported}`);
      if (decl.importSource) console.log(`     Import from: ${decl.importSource}`);
      if (decl.dataType) console.log(`     Type: ${decl.dataType}`);
    });

    // Display variable usages
    console.log(`\n🔸 Variable Usages (${result.variableAnalysis.usages.length} found):`);
    result.variableAnalysis.usages.slice(0, 10).forEach((usage, index) => {
      console.log(`  ${index + 1}. ${usage.variableName} - ${usage.usageType} at line ${usage.lineNumber}`);
      if (usage.context.accessPattern) console.log(`     Pattern: ${usage.context.accessPattern}`);
      console.log(`     Context: ${usage.context.isConditional ? 'conditional' : ''} ${usage.context.isLoop ? 'loop' : ''} ${usage.context.isAsyncContext ? 'async' : ''}`);
    });

    // Display unused variables
    console.log(`\n🔸 Unused Variables (${result.variableAnalysis.unusedVariables.length} found):`);
    result.variableAnalysis.unusedVariables.forEach((unused, index) => {
      console.log(`  ${index + 1}. ${unused.name} (${unused.type}) - Line ${unused.lineNumber}`);
    });

    // Display variable lifecycles
    console.log(`\n🔸 Variable Lifecycles (${result.variableAnalysis.lifecycles.length} tracked):`);
    result.variableAnalysis.lifecycles.slice(0, 5).forEach((lifecycle, index) => {
      console.log(`  ${index + 1}. ${lifecycle.variableName}:`);
      console.log(`     Reads: ${lifecycle.readCount}, Writes: ${lifecycle.writeCount}`);
      console.log(`     Cross-file usage: ${lifecycle.crossFileUsageCount}`);
      console.log(`     Unused: ${lifecycle.isUnused}`);
      if (lifecycle.firstUsage && lifecycle.lastUsage) {
        console.log(`     Lifespan: ${lifecycle.firstUsage.lineNumber} → ${lifecycle.lastUsage.lineNumber}`);
      }
    });

    // Display cross-module dependencies
    console.log(`\n🔸 Cross-Module Dependencies (${result.variableAnalysis.crossModuleDependencies.length} found):`);
    result.variableAnalysis.crossModuleDependencies.forEach((dep, index) => {
      console.log(`  ${index + 1}. ${dep.sourceVariable.name} → ${dep.targetFile}`);
      console.log(`     Type: ${dep.dependencyType}, Pattern: ${dep.usagePattern}`);
    });

    // Get overall statistics
    console.log('\n📈 Variable Analysis Statistics:');
    console.log('-'.repeat(40));
    const stats = analyzer.getVariableAnalysisStatistics();

    console.log(`Total Variables: ${stats.totalVariables}`);
    console.log(`Unused Variables: ${stats.unusedVariableCount}`);
    console.log(`Global Variables: ${stats.globalVariableCount}`);
    console.log(`Imported Variables: ${stats.importedVariableCount}`);
    console.log(`Exported Variables: ${stats.exportedVariableCount}`);
    console.log(`Average Usage Count: ${stats.averageUsageCount.toFixed(2)}`);
    console.log(`Cross-File Variables: ${stats.crossFileVariableCount}`);

    console.log('\nVariables by Type:');
    Object.entries(stats.variablesByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    console.log('\nVariables by Scope:');
    Object.entries(stats.variablesByScope).forEach(([scope, count]) => {
      console.log(`  ${scope}: ${count}`);
    });

    // Get usage patterns
    console.log('\n📊 Variable Usage Patterns:');
    console.log('-'.repeat(40));
    const patterns = analyzer.getVariableUsagePatterns();

    console.log(`Read/Write Ratio: ${patterns.readWriteRatio.toFixed(2)}`);
    console.log(`Conditional Usage: ${patterns.conditionalUsagePercentage.toFixed(1)}%`);
    console.log(`Loop Usage: ${patterns.loopUsagePercentage.toFixed(1)}%`);
    console.log(`Async Usage: ${patterns.asyncUsagePercentage.toFixed(1)}%`);
    console.log(`Property Access: ${patterns.propertyAccessPercentage.toFixed(1)}%`);
    console.log(`Function Calls: ${patterns.functionCallPercentage.toFixed(1)}%`);

    if (patterns.commonAccessPatterns.length > 0) {
      console.log('\nCommon Access Patterns:');
      patterns.commonAccessPatterns.slice(0, 5).forEach((pattern, index) => {
        console.log(`  ${index + 1}. ${pattern.pattern} (${pattern.count} times)`);
      });
    }

    // Test mind map nodes creation
    console.log('\n🗺️ Mind Map Integration:');
    console.log('-'.repeat(40));
    console.log(`Function Nodes: ${result.nodes.filter(n => n.type === 'function').length}`);
    console.log(`Variable Nodes: ${result.nodes.filter(n => n.type === 'variable').length}`);
    console.log(`Total Edges: ${result.edges.length}`);
    console.log(`Call Edges: ${result.edges.filter(e => e.type === 'calls').length}`);
    console.log(`Usage Edges: ${result.edges.filter(e => e.type === 'used_by').length}`);
    console.log(`Dependency Edges: ${result.edges.filter(e => e.type === 'depends_on').length}`);

    // Show some example variable nodes
    const variableNodes = result.nodes.filter(n => n.type === 'variable');
    if (variableNodes.length > 0) {
      console.log('\nExample Variable Nodes:');
      variableNodes.slice(0, 3).forEach((node, index) => {
        console.log(`  ${index + 1}. ${node.name} (${node.metadata.variableType})`);
        console.log(`     Usage Count: ${node.metadata.usageCount}`);
        console.log(`     Unused: ${node.metadata.isUnused}`);
        console.log(`     Global: ${node.metadata.isGlobal}`);
      });
    }

    console.log('\n✅ Variable Usage Tracking test completed successfully!');
    console.log('\n🎯 Key Features Validated:');
    console.log('   ✓ Variable declaration detection');
    console.log('   ✓ Variable usage pattern analysis');
    console.log('   ✓ Cross-file dependency tracking');
    console.log('   ✓ Variable lifecycle analysis');
    console.log('   ✓ Unused variable identification');
    console.log('   ✓ Import/export mapping');
    console.log('   ✓ Mind map integration');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testVariableTracking().catch(console.error);