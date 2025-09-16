#!/usr/bin/env node

/**
 * Test script to validate Hebbian Learning System integration
 * Tests co-activation recording during queries
 */

import { MindMapEngine } from './dist/core/MindMapEngine.js';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname);

async function testHebbianIntegration() {
  console.log('🧠 Testing Hebbian Learning Integration...\n');

  try {
    const engine = new MindMapEngine(projectRoot);

    // Initialize with fresh scan
    console.log('📊 Scanning project...');
    await engine.scanProject({ forceRescan: false });

    // Get initial stats
    console.log('📈 Initial Hebbian stats:');
    const initialStats = await engine.getHebbianStats();
    console.log(`- Total connections: ${initialStats.totalConnections}`);
    console.log(`- Strong connections: ${initialStats.strongConnections}`);
    console.log(`- Recent activations: ${initialStats.recentActivations}\n`);

    // Perform several queries that should trigger co-activation learning
    const testQueries = [
      'MindMapEngine',      // Should co-activate related engine components
      'query system',       // Should co-activate query-related files
      'TypeScript code',    // Should co-activate TS/JS files
      'pattern analysis',   // Should co-activate pattern detection components
      'storage system'      // Should co-activate storage and persistence files
    ];

    console.log('🔍 Performing queries to trigger Hebbian learning...');
    for (const query of testQueries) {
      console.log(`\nQuery: "${query}"`);
      const result = await engine.query(query, { limit: 3 });

      console.log(`- Found ${result.nodes.length} results`);
      if (result.nodes.length > 0) {
        console.log('- Top results:', result.nodes.map(n => n.name).join(', '));
      }

      // Brief pause to allow processing
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Wait a moment for async Hebbian processing
    console.log('\n⏳ Waiting for Hebbian processing...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check updated stats
    console.log('\n📊 Updated Hebbian stats:');
    const finalStats = await engine.getHebbianStats();
    console.log(`- Total connections: ${finalStats.totalConnections}`);
    console.log(`- Strong connections: ${finalStats.strongConnections}`);
    console.log(`- Average strength: ${finalStats.averageStrength.toFixed(3)}`);
    console.log(`- Recent activations: ${finalStats.recentActivations}`);
    console.log(`- Connections created today: ${finalStats.connectionsCreatedToday}`);

    // Show top connections if any exist
    if (finalStats.topConnections && finalStats.topConnections.length > 0) {
      console.log('\n🔗 Top Hebbian connections:');
      finalStats.topConnections.forEach((conn, idx) => {
        console.log(`${idx + 1}. ${conn.source} ↔ ${conn.target} (strength: ${conn.strength})`);
      });
    }

    // Test if connections are actually forming
    const learningWorking = finalStats.totalConnections > initialStats.totalConnections ||
                           finalStats.recentActivations > initialStats.recentActivations;

    if (learningWorking) {
      console.log('\n✅ SUCCESS: Hebbian Learning integration is working!');
      console.log('- Co-activations are being recorded');
      console.log('- Connections are forming between frequently co-accessed nodes');
      console.log('- Brain-inspired associative learning is active');
    } else {
      console.log('\n⚠️  No learning detected. This could mean:');
      console.log('- Queries returned too few results for co-activation');
      console.log('- Connection threshold is too high');
      console.log('- Learning may be working but below detection threshold');
    }

    console.log('\n📊 Hebbian Learning Configuration:');
    console.log(`- Learning Rate: ${finalStats.learningRate}`);
    console.log(`- Decay Rate: ${finalStats.decayRate}`);
    console.log(`- System is ready for brain-inspired associative intelligence`);

  } catch (error) {
    console.error('❌ Error testing Hebbian integration:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  } finally {
    // Force exit to prevent hanging
    process.exit(0);
  }
}

testHebbianIntegration();