#!/usr/bin/env node

/**
 * Deep Research: Exact Match Query Filtering Bug
 *
 * Issue: "MindMapEngine" query finds 1 match but returns 0 results
 * Working: "CodeAnalyzer" query returns MindMapEngine as result #4
 *
 * This script will trace the exact execution path of both queries
 * to identify where the filtering happens.
 */

import { MindMapEngine } from './dist/core/MindMapEngine.js';

class QueryDebugger {
  constructor() {
    this.mindMap = new MindMapEngine(process.cwd());
    this.debugLogs = [];
  }

  log(step, message, data = null) {
    const entry = {
      step,
      timestamp: new Date().toISOString(),
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    };
    this.debugLogs.push(entry);
    console.log(`[${step}] ${message}`);
    if (data) {
      console.log(`    Data:`, data);
    }
  }

  async deepAnalyzeQuery(query, description) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 DEEP ANALYSIS: ${description}`);
    console.log(`Query: "${query}"`);
    console.log(`${'='.repeat(80)}\n`);

    this.debugLogs = [];

    try {
      // Step 1: Check if file path query
      this.log('STEP_1', 'Checking if file path query');
      const isFilePath = this.mindMap.isFilePathQuery ? this.mindMap.isFilePathQuery(query) : false;
      this.log('STEP_1_RESULT', `File path query: ${isFilePath}`);

      // Step 2: Check query routing
      this.log('STEP_2', 'Determining query route');
      const queryRoute = this.mindMap.determineQueryRoute ?
        this.mindMap.determineQueryRoute(query, {}) :
        { engine: 'unknown' };
      this.log('STEP_2_RESULT', 'Query route determined', queryRoute);

      // Step 3: Execute query with comprehensive options
      this.log('STEP_3', 'Executing query with bypass options');
      const queryOptions = {
        limit: 10,
        useActivation: false,
        bypassInhibition: true,
        bypassHebbianLearning: true,
        bypassAttention: true,
        bypassBiTemporal: true,
        includeParentContext: false,
        includeChildContext: false,
        bypassCache: true, // Force fresh results
        bypassMultiModalFusion: true,
        confidence: 0.0
      };
      this.log('STEP_3_OPTIONS', 'Query options', queryOptions);

      const result = await this.mindMap.query(query, queryOptions);
      this.log('STEP_3_RESULT', 'Raw query result', {
        foundNodes: result.nodes.length,
        totalMatches: result.totalMatches,
        queryTime: result.queryTime
      });

      // Step 4: Analyze each found node
      if (result.nodes.length > 0) {
        this.log('STEP_4', 'Analyzing found nodes');
        result.nodes.forEach((node, i) => {
          this.log(`STEP_4_NODE_${i}`, `Node ${i + 1} details`, {
            id: node.id,
            name: node.name,
            type: node.type,
            path: node.path,
            confidence: node.confidence,
            hasProperties: !!node.properties,
            hasMetadata: !!node.metadata
          });
        });
      } else {
        this.log('STEP_4', 'No nodes returned despite totalMatches > 0');
      }

      // Step 5: Check storage directly
      this.log('STEP_5', 'Direct storage search');
      const directNodes = this.mindMap.storage.findNodes(node => {
        const nameMatch = node.name.toLowerCase() === query.toLowerCase();
        const partialMatch = node.name.toLowerCase().includes(query.toLowerCase());
        return nameMatch || partialMatch;
      });
      this.log('STEP_5_RESULT', `Direct storage found ${directNodes.length} nodes`);

      directNodes.forEach((node, i) => {
        this.log(`STEP_5_NODE_${i}`, `Direct node ${i + 1}`, {
          id: node.id,
          name: node.name,
          type: node.type,
          confidence: node.confidence,
          nameExactMatch: node.name.toLowerCase() === query.toLowerCase(),
          namePartialMatch: node.name.toLowerCase().includes(query.toLowerCase())
        });
      });

      // Step 6: Test matching logic
      this.log('STEP_6', 'Testing matching logic');
      const queryLower = query.toLowerCase();
      const matchingResults = [];

      directNodes.forEach(node => {
        const matchResult = this.testNodeMatching(node, queryLower);
        matchingResults.push({
          nodeId: node.id,
          nodeName: node.name,
          ...matchResult
        });
      });

      this.log('STEP_6_RESULT', 'Matching logic results', matchingResults);

      return {
        query,
        description,
        result,
        directNodes,
        matchingResults,
        logs: this.debugLogs
      };

    } catch (error) {
      this.log('ERROR', 'Query execution failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  testNodeMatching(node, queryLower) {
    // Replicate the matching logic from MindMapEngine
    const results = {};

    // Test exact name match
    results.exactNameMatch = node.name.toLowerCase() === queryLower;

    // Test searchable text
    const searchableText = [
      node.name,
      node.path,
      node.metadata?.extension,
      node.properties?.language,
      node.properties?.framework
    ].filter(Boolean).join(' ').toLowerCase();

    results.searchableTextMatch = searchableText.includes(queryLower);

    // Test camelCase expansion
    const expandedText = searchableText.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    results.camelCaseMatch = expandedText.includes(queryLower);

    // Overall match
    results.shouldMatch = results.exactNameMatch || results.searchableTextMatch || results.camelCaseMatch;

    return results;
  }

  async saveReport(analyses) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        issue: "Exact match queries find nodes but filter them out",
        workingQuery: analyses.find(a => a.result.nodes.length > 0)?.query || 'N/A',
        brokenQuery: analyses.find(a => a.result.nodes.length === 0 && a.result.totalMatches > 0)?.query || 'N/A'
      },
      analyses,
      conclusions: []
    };

    // Add conclusions based on analysis
    const brokenAnalysis = analyses.find(a => a.result.nodes.length === 0 && a.result.totalMatches > 0);
    const workingAnalysis = analyses.find(a => a.result.nodes.length > 0);

    if (brokenAnalysis && workingAnalysis) {
      report.conclusions.push({
        type: 'comparison',
        finding: 'Broken query finds nodes in storage but filters them out during processing',
        brokenQuery: brokenAnalysis.query,
        workingQuery: workingAnalysis.query
      });
    }

    const reportPath = '/data/data/com.termux/files/home/projects/mind-map/query-debug-report.json';
    await import('fs').then(fs => {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    });

    console.log(`\n📊 Debug report saved to: ${reportPath}`);
    return report;
  }
}

async function main() {
  console.log('🚀 Starting deep query debugging...\n');

  const queryDebugger = new QueryDebugger();

  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 3000));

  const analyses = [];

  // Test the broken exact match
  try {
    const brokenAnalysis = await queryDebugger.deepAnalyzeQuery(
      'MindMapEngine',
      'BROKEN - Exact match that gets filtered'
    );
    analyses.push(brokenAnalysis);
  } catch (error) {
    console.error('Failed to analyze broken query:', error.message);
  }

  // Test a working query that returns MindMapEngine
  try {
    const workingAnalysis = await queryDebugger.deepAnalyzeQuery(
      'CodeAnalyzer',
      'WORKING - Query that returns MindMapEngine as result'
    );
    analyses.push(workingAnalysis);
  } catch (error) {
    console.error('Failed to analyze working query:', error.message);
  }

  // Test another exact match that works
  try {
    const workingExactAnalysis = await queryDebugger.deepAnalyzeQuery(
      'FileScanner',
      'WORKING - Exact match that works'
    );
    analyses.push(workingExactAnalysis);
  } catch (error) {
    console.error('Failed to analyze working exact match:', error.message);
  }

  // Test partial match
  try {
    const partialAnalysis = await queryDebugger.deepAnalyzeQuery(
      'Engine',
      'WORKING - Partial match that finds MindMapEngine'
    );
    analyses.push(partialAnalysis);
  } catch (error) {
    console.error('Failed to analyze partial match:', error.message);
  }

  // Generate and save comprehensive report
  const report = await queryDebugger.saveReport(analyses);

  console.log('\n🎯 KEY FINDINGS:');
  console.log('================');

  analyses.forEach(analysis => {
    const status = analysis.result.nodes.length > 0 ? '✅ WORKS' : '❌ BROKEN';
    console.log(`${status} "${analysis.query}": ${analysis.result.nodes.length} results (${analysis.result.totalMatches} total)`);
  });

  console.log('\n✅ Deep research completed. Check query-debug-report.json for details.');
  process.exit(0);
}

main().catch(console.error);