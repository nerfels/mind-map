#!/usr/bin/env node

/**
 * Test script for brain-inspired activation spreading system
 * Tests neural activation network and associative memory
 */

import { MindMapEngine } from './dist/core/MindMapEngine.js';

async function testActivationSystem() {
    console.log('🧠 Testing Brain-Inspired Activation Spreading System\n');
    
    const engine = new MindMapEngine(process.cwd());
    
    try {
        // First, ensure the project is scanned
        console.log('📊 Scanning project for activation test...');
        await engine.scanProject(false, true);
        
        const stats = await engine.getStats();
        console.log(`Project loaded: ${stats.nodes} nodes, ${stats.edges} edges\n`);
        
        // Test 1: Compare activation spreading vs linear search
        console.log('🔍 Test 1: Activation Spreading vs Linear Search');
        const query = 'function analysis';
        
        // Query with activation spreading (default)
        console.log('Testing with activation spreading...');
        const startActivation = process.hrtime.bigint();
        const activationResult = await engine.query(query, { 
            useActivation: true,
            limit: 10,
            activationLevels: 3
        });
        const endActivation = process.hrtime.bigint();
        const activationTime = Number(endActivation - startActivation) / 1_000_000;
        
        // Query with linear search
        console.log('Testing with linear search...');
        const startLinear = process.hrtime.bigint();
        const linearResult = await engine.query(query, { 
            useActivation: false,
            limit: 10
        });
        const endLinear = process.hrtime.bigint();
        const linearTime = Number(endLinear - startLinear) / 1_000_000;
        
        console.log('\n📊 Comparison Results:');
        console.log(`Activation Spreading: ${activationResult.nodes.length} results in ${activationTime.toFixed(2)}ms`);
        console.log(`Linear Search: ${linearResult.nodes.length} results in ${linearTime.toFixed(2)}ms`);
        
        // Show top results from each approach
        console.log('\n🔥 Top Activation Results:');
        activationResult.nodes.slice(0, 5).forEach((node, i) => {
            const confidence = (node.confidence * 100).toFixed(1);
            console.log(`  ${i+1}. ${node.name} (${node.type}) - ${confidence}% confidence`);
        });
        
        console.log('\n📝 Top Linear Results:');
        linearResult.nodes.slice(0, 5).forEach((node, i) => {
            const confidence = (node.confidence * 100).toFixed(1);
            console.log(`  ${i+1}. ${node.name} (${node.type}) - ${confidence}% confidence`);
        });
        
        // Test 2: Context-aware activation
        console.log('\n\n🎯 Test 2: Context-Aware Activation');
        const contextQuery = 'error handling';
        const contextResult = await engine.query(contextQuery, {
            useActivation: true,
            currentTask: 'debugging application errors',
            activeFiles: ['src/core/MindMapEngine.ts'],
            frameworkContext: ['typescript', 'node'],
            activationLevels: 4
        });
        
        console.log(`Context-aware query found ${contextResult.nodes.length} results:`);
        contextResult.nodes.slice(0, 3).forEach((node, i) => {
            console.log(`  ${i+1}. ${node.name} (${node.type}) - path: ${node.path || 'N/A'}`);
        });
        
        // Test 3: Multi-hop activation spreading
        console.log('\n\n🔗 Test 3: Multi-Hop Activation Spreading');
        const deepQuery = 'AST parser';
        const deepResult = await engine.query(deepQuery, {
            useActivation: true,
            activationLevels: 5,
            limit: 15
        });
        
        console.log(`Multi-hop activation found ${deepResult.nodes.length} results:`);
        
        // Group by type to see spread across different node types
        const typeGroups = new Map();
        deepResult.nodes.forEach(node => {
            if (!typeGroups.has(node.type)) {
                typeGroups.set(node.type, []);
            }
            typeGroups.get(node.type).push(node);
        });
        
        console.log('\n📊 Results by node type:');
        for (const [type, nodes] of typeGroups) {
            console.log(`  ${type}: ${nodes.length} nodes`);
            nodes.slice(0, 2).forEach(node => {
                console.log(`    - ${node.name}`);
            });
        }
        
        // Test 4: Activation with inhibitory learning
        console.log('\n\n🚫 Test 4: Activation + Inhibitory Learning');
        const inhibitedResult = await engine.query('test function', {
            useActivation: true,
            bypassInhibition: false // Enable inhibitory learning
        });
        
        console.log(`Query with inhibition: ${inhibitedResult.nodes.length} results`);
        if (inhibitedResult.inhibitionApplied) {
            console.log(`Inhibition applied! Original: ${inhibitedResult.originalResultCount}, Final: ${inhibitedResult.nodes.length}`);
            console.log(`Inhibition score: ${(inhibitedResult.inhibitionScore * 100).toFixed(1)}%`);
        } else {
            console.log('No inhibitory patterns applied');
        }
        
        // Test 5: Performance analysis
        console.log('\n\n⚡ Test 5: Performance Analysis');
        const performanceTests = [
            { query: 'file system', activationLevels: 1 },
            { query: 'code analysis', activationLevels: 2 },
            { query: 'pattern recognition', activationLevels: 3 },
            { query: 'brain inspired', activationLevels: 4 }
        ];
        
        for (const test of performanceTests) {
            const start = process.hrtime.bigint();
            const result = await engine.query(test.query, {
                useActivation: true,
                activationLevels: test.activationLevels,
                limit: 10
            });
            const end = process.hrtime.bigint();
            const duration = Number(end - start) / 1_000_000;
            
            console.log(`"${test.query}" (${test.activationLevels} levels): ${result.nodes.length} results in ${duration.toFixed(2)}ms`);
        }
        
        // Test 6: Activation network statistics
        console.log('\n\n📈 Test 6: System Statistics');
        const systemStats = await engine.getStats();
        console.log(`Total nodes: ${systemStats.nodes}`);
        console.log(`Total edges: ${systemStats.edges}`);
        console.log(`Average confidence: ${(systemStats.averageConfidence * 100).toFixed(1)}%`);
        
        // Node type distribution
        if (systemStats.nodesByType) {
            console.log('\nNode distribution:');
            for (const [type, count] of Object.entries(systemStats.nodesByType)) {
                console.log(`  ${type}: ${count}`);
            }
        }
        
        console.log('\n✅ Activation spreading system test completed successfully!');
        console.log('\n🧠 Key Findings:');
        console.log(`- Activation spreading found ${activationResult.nodes.length} vs ${linearResult.nodes.length} linear results`);
        console.log(`- Performance: ${activationTime.toFixed(2)}ms vs ${linearTime.toFixed(2)}ms`);
        console.log(`- Context-aware results: ${contextResult.nodes.length} relevant matches`);
        console.log(`- Multi-hop spreading reached ${typeGroups.size} different node types`);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testActivationSystem().catch(console.error);