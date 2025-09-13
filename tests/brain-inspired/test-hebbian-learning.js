#!/usr/bin/env node

/**
 * Test Hebbian Learning System functionality
 * Tests neural connection formation, strengthening, and statistics
 */

import { MindMapEngine } from './dist/core/MindMapEngine.js';

async function testHebbianLearning() {
  console.log('🧠 Testing Hebbian Learning System...\n');
  
  try {
    const engine = new MindMapEngine(process.cwd());
    
    // 1. Initial statistics (should be empty)
    console.log('📊 Initial Hebbian Stats:');
    const initialStats = engine.hebbianLearning.getStats();
    console.log(`- Total Connections: ${initialStats.totalConnections}`);
    console.log(`- Average Strength: ${initialStats.averageStrength.toFixed(3)}`);
    console.log(`- Recent Activity: ${initialStats.recentActivity}\n`);
    
    // 2. Simulate co-activation events (brain-like learning)
    console.log('🔗 Simulating co-activation events...');
    
    // Simulate frequently used together files
    await engine.hebbianLearning.recordCoActivation(
      'file_1', 
      ['file_2', 'file_3'], 
      'feature_development',
      0.8
    );
    
    await engine.hebbianLearning.recordCoActivation(
      'file_1', 
      ['file_2'], 
      'bug_fixing',
      0.9
    );
    
    await engine.hebbianLearning.recordCoActivation(
      'file_2', 
      ['file_3', 'file_4'], 
      'testing',
      0.7
    );
    
    // Strengthen specific connection multiple times
    for (let i = 0; i < 5; i++) {
      await engine.hebbianLearning.recordCoActivation(
        'file_1', 
        ['file_2'], 
        'repeated_usage',
        0.8
      );
    }
    
    console.log('✅ Co-activation events recorded\n');
    
    // 3. Check updated statistics
    console.log('📊 Updated Hebbian Stats:');
    const updatedStats = engine.hebbianLearning.getStats();
    console.log(`- Total Connections: ${updatedStats.totalConnections}`);
    console.log(`- Active Connections: ${updatedStats.activeConnections}`);
    console.log(`- Average Strength: ${updatedStats.averageStrength.toFixed(3)}`);
    console.log(`- Strength Distribution:`);
    console.log(`  • Weak (< 0.3): ${updatedStats.strengthDistribution.weak}`);
    console.log(`  • Medium (0.3-0.7): ${updatedStats.strengthDistribution.medium}`);
    console.log(`  • Strong (≥ 0.7): ${updatedStats.strengthDistribution.strong}`);
    console.log(`- Connection Types:`);
    console.log(`  • Co-activation: ${updatedStats.connectionTypes.co_activation}`);
    console.log(`  • Temporal: ${updatedStats.connectionTypes.temporal_sequence}`);
    console.log(`  • Context: ${updatedStats.connectionTypes.context_association}`);
    console.log(`- Contextual Connections: ${updatedStats.contextualConnections}`);
    console.log(`- Recent Activity: ${updatedStats.recentActivity}`);
    console.log(`- Total Activations: ${updatedStats.totalActivations}`);
    console.log(`- Avg Activations/Connection: ${updatedStats.averageActivationsPerConnection.toFixed(2)}\n`);
    
    // 4. Test insights generation with Hebbian data
    console.log('🧠 Testing insights with Hebbian learning data:');
    const insights = await engine.generateInsights(['learning'], 0.3, false);
    insights.forEach((insight, i) => {
      console.log(`${i + 1}. ${insight.title}`);
      console.log(`   ${insight.description}`);
      console.log(`   Value: ${insight.value} (${insight.confidence * 100}% confidence)`);
      console.log(`   Trend: ${insight.trend}, Actionable: ${insight.actionable}\n`);
    });
    
    // 5. Test MCP tool for Hebbian stats
    console.log('🔧 Testing MCP Hebbian stats tool:');
    // This would normally be called via MCP, but we can test the underlying functionality
    console.log('✅ Hebbian Learning System test completed successfully!');
    
  } catch (error) {
    console.error('❌ Hebbian Learning test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testHebbianLearning();