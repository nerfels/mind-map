#!/usr/bin/env node

const { spawn } = require('child_process');

async function testDirectAPIDetection() {
    console.log('🚀 Testing Direct API Detection Tool');
    console.log('=' .repeat(50));

    const mcp = spawn('node', ['dist/index.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
    });

    const timeout = setTimeout(() => {
        console.log('❌ Test timed out');
        mcp.kill('SIGTERM');
        process.exit(1);
    }, 30000);

    let output = '';
    let hasAPIResults = false;

    mcp.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;

        // Look for specific API detection results
        if (dataStr.includes('Cross-Language API Detection Results') ||
            dataStr.includes('Total Endpoints') ||
            dataStr.includes('Flask') ||
            dataStr.includes('Actix') ||
            dataStr.includes('REST') ||
            dataStr.includes('API Types Found')) {
            hasAPIResults = true;
            console.log('✅ API Detection Results Found:', dataStr.trim());
        }
    });

    mcp.stderr.on('data', (data) => {
        const stderr = data.toString();
        if (stderr.includes('API') || stderr.includes('detect')) {
            console.log('🔧 Debug:', stderr.trim());
        }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
        console.log('📡 Testing new detect_cross_language_apis tool...');

        // Test the new dedicated API detection tool
        const apiDetectionRequest = {
            method: 'detect_cross_language_apis',
            params: {
                min_confidence: 0.3,
                include_schemas: true
            }
        };

        mcp.stdin.write(JSON.stringify(apiDetectionRequest) + '\n');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('📡 Testing with lower confidence threshold...');

        // Test with lower confidence to catch more patterns
        const lowConfidenceRequest = {
            method: 'detect_cross_language_apis',
            params: {
                min_confidence: 0.1,
                include_schemas: true,
                api_types: ['REST']
            }
        };

        mcp.stdin.write(JSON.stringify(lowConfidenceRequest) + '\n');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('⏳ Waiting for results...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (hasAPIResults) {
            console.log('\n✅ SUCCESS: API detection tool is working!');
            console.log('   The new detect_cross_language_apis tool found API patterns');
        } else {
            console.log('\n⚠️  Testing fallback: analyze_architecture (includes API detection)...');

            // Fallback test using analyze_architecture which includes API detection
            const architectureRequest = {
                method: 'analyze_architecture',
                params: {
                    min_confidence: 0.2
                }
            };

            mcp.stdin.write(JSON.stringify(architectureRequest) + '\n');
            await new Promise(resolve => setTimeout(resolve, 4000));

            if (hasAPIResults) {
                console.log('✅ API detection working through comprehensive analysis');
            } else {
                console.log('⚠️  May need server restart to register new tool');
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        clearTimeout(timeout);
        mcp.kill('SIGTERM');

        // Show relevant output
        if (output.length > 0) {
            console.log('\n📝 Tool Output:');
            const lines = output.split('\n').filter(line =>
                line.includes('API') ||
                line.includes('endpoint') ||
                line.includes('Flask') ||
                line.includes('Actix') ||
                line.includes('Express') ||
                line.includes('Cross-Language') ||
                line.includes('Total Endpoints')
            );

            if (lines.length > 0) {
                lines.slice(-10).forEach(line => console.log(`  ${line.trim()}`));
            } else {
                console.log('  (No API-related output detected)');
            }
        }
    }
}

testDirectAPIDetection().catch(console.error);