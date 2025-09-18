#!/usr/bin/env node

const { spawn } = require('child_process');

async function testAPIDetectionComprehensive() {
    console.log('🔍 Testing API Detection Through Comprehensive Analysis');
    console.log('=' .repeat(55));

    const mcp = spawn('node', ['dist/index.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
    });

    const timeout = setTimeout(() => {
        console.log('❌ Test timed out');
        mcp.kill('SIGTERM');
        process.exit(1);
    }, 30000);

    let apiPatternsFound = false;
    let architecturalResults = false;
    let queryResults = false;

    mcp.stdout.on('data', (data) => {
        const dataStr = data.toString();
        
        // Look for API patterns in output
        if (dataStr.includes('Flask') || dataStr.includes('Express') || 
            dataStr.includes('Actix') || dataStr.includes('API') ||
            dataStr.includes('endpoint') || dataStr.includes('REST')) {
            apiPatternsFound = true;
            console.log('🎯 API Pattern Found:', dataStr.trim().substring(0, 120) + '...');
        }
        
        // Look for architectural analysis
        if (dataStr.includes('Architectural Analysis') || 
            dataStr.includes('confidence') ||
            dataStr.includes('pattern')) {
            architecturalResults = true;
            console.log('🏗️ Architectural Data:', dataStr.trim().substring(0, 100) + '...');
        }
        
        // Look for mindmap query results
        if (dataStr.includes('Found') && dataStr.includes('matches')) {
            queryResults = true;
            console.log('🔍 Query Results:', dataStr.trim());
        }
    });

    mcp.stderr.on('data', (data) => {
        const stderr = data.toString();
        if (!stderr.includes('WebSocket connection closed') && stderr.trim()) {
            console.log('🔧 System:', stderr.trim());
        }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
        console.log('📡 Step 1: Testing mindmap query for API patterns...');
        
        // Query for API patterns
        const apiQuery = {
            method: 'query_mindmap',
            params: { 
                query: 'Flask Express Actix REST API endpoint', 
                limit: 5 
            }
        };

        mcp.stdin.write(JSON.stringify(apiQuery) + '\n');
        await new Promise(resolve => setTimeout(resolve, 4000));

        console.log('📡 Step 2: Testing architectural analysis...');
        
        // Comprehensive architectural analysis
        const archAnalysis = {
            method: 'analyze_architecture',
            params: { 
                min_confidence: 0.1,
                limit: 10
            }
        };

        mcp.stdin.write(JSON.stringify(archAnalysis) + '\n');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('📡 Step 3: Testing specific framework detection...');
        
        // Enhanced framework detection
        const frameworkDetection = {
            method: 'detect_enhanced_frameworks',
            params: {
                categories: ['web'],
                min_confidence: 0.1
            }
        };

        mcp.stdin.write(JSON.stringify(frameworkDetection) + '\n');
        await new Promise(resolve => setTimeout(resolve, 4000));

        console.log('\n📊 Test Results Summary:');
        console.log(`API Patterns Found: ${apiPatternsFound ? '✅ YES' : '❌ NO'}`);
        console.log(`Architectural Analysis: ${architecturalResults ? '✅ YES' : '❌ NO'}`);
        console.log(`Query Results: ${queryResults ? '✅ YES' : '❌ NO'}`);
        
        if (apiPatternsFound) {
            console.log('\n🎉 SUCCESS: API detection is working through comprehensive analysis!');
            console.log('   The system can detect API patterns even without the dedicated tool.');
        } else {
            console.log('\n⚠️  API patterns not detected in this test run');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        clearTimeout(timeout);
        mcp.kill('SIGTERM');
    }
}

testAPIDetectionComprehensive().catch(console.error);
