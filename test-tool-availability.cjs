#!/usr/bin/env node

const { spawn } = require('child_process');

async function testToolAvailability() {
    console.log('🔍 Testing MCP Tool Availability');
    console.log('=' .repeat(40));

    const mcp = spawn('node', ['dist/index.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
    });

    const timeout = setTimeout(() => {
        console.log('❌ Test timed out');
        mcp.kill('SIGTERM');
        process.exit(1);
    }, 15000);

    let toolsFound = [];
    let output = '';

    mcp.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        
        // Look for tool definitions
        if (dataStr.includes('detect_cross_language_apis') || 
            dataStr.includes('analyze_architecture') ||
            dataStr.includes('Cross-Language API Detection')) {
            console.log('✅ Found API detection capability:', dataStr.trim().substring(0, 100) + '...');
            if (!toolsFound.includes('api_detection')) {
                toolsFound.push('api_detection');
            }
        }
    });

    mcp.stderr.on('data', (data) => {
        const stderr = data.toString();
        if (!stderr.includes('WebSocket connection closed')) {
            console.log('🔧 Debug:', stderr.trim());
        }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
        // Test simple query first
        console.log('📡 Testing basic mindmap query...');
        const queryRequest = {
            method: 'query_mindmap',
            params: { query: 'API Flask', limit: 3 }
        };

        mcp.stdin.write(JSON.stringify(queryRequest) + '\n');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Test architectural analysis
        console.log('📡 Testing architectural analysis...');
        const archRequest = {
            method: 'analyze_architecture',
            params: { min_confidence: 0.1 }
        };

        mcp.stdin.write(JSON.stringify(archRequest) + '\n');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('\n📊 Results Summary:');
        console.log(`Tools Found: ${toolsFound.length > 0 ? toolsFound.join(', ') : 'None detected'}`);
        
        if (toolsFound.length > 0) {
            console.log('✅ API detection capabilities are available through existing tools');
        } else {
            console.log('⚠️  Direct API detection tool may need server restart');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        clearTimeout(timeout);
        mcp.kill('SIGTERM');
    }
}

testToolAvailability().catch(console.error);
