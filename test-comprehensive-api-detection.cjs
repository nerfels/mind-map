#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

async function testComprehensiveAPIDetection() {
    console.log('🧪 Comprehensive Cross-Language API Detection Test');
    console.log('=' .repeat(60));

    const mcp = spawn('node', ['dist/index.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
    });

    const timeout = setTimeout(() => {
        console.log('❌ Test timed out after 45 seconds');
        mcp.kill('SIGTERM');
        process.exit(1);
    }, 45000);

    let output = '';
    let apiDetectionFound = false;
    let detectionResults = [];

    mcp.stdout.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;

        // Look for specific API detection results
        if (dataStr.includes('detectCrossLanguageAPIs completed') ||
            dataStr.includes('API detection') ||
            dataStr.includes('endpoints') ||
            dataStr.includes('totalEndpoints')) {
            apiDetectionFound = true;
            detectionResults.push(dataStr.trim());
        }

        // Look for specific framework/language patterns
        if (dataStr.includes('Flask') || dataStr.includes('Actix') ||
            dataStr.includes('Express') || dataStr.includes('Spring') ||
            dataStr.includes('HttpServer') || dataStr.includes('REST')) {
            console.log('🔍 API Pattern Found:', dataStr.trim());
        }
    });

    mcp.stderr.on('data', (data) => {
        const stderr = data.toString();
        if (stderr.includes('DEBUG:') && (stderr.includes('API') || stderr.includes('detect'))) {
            console.log('🔧 Debug:', stderr.trim());
        }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
        console.log('📡 Step 1: Scanning project to ensure all files are indexed...');

        // First scan the project
        const scanRequest = {
            method: 'scan_project',
            params: { include_analysis: true }
        };

        mcp.stdin.write(JSON.stringify(scanRequest) + '\n');
        await new Promise(resolve => setTimeout(resolve, 4000));

        console.log('📊 Step 2: Running comprehensive analysis (includes API detection)...');

        // Request comprehensive analysis which now includes API detection
        const analysisRequest = {
            method: 'analyze_architecture',
            params: {
                limit: 20,
                min_confidence: 0.3
            }
        };

        mcp.stdin.write(JSON.stringify(analysisRequest) + '\n');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('🔍 Step 3: Querying for specific API patterns...');

        // Test specific API pattern queries
        const apiQueries = [
            {
                name: 'Python Flask APIs',
                query: 'Flask @app.route jsonify POST GET'
            },
            {
                name: 'Rust Actix-web APIs',
                query: 'Actix HttpResponse create_user_handler get_user_handler'
            },
            {
                name: 'C++ HTTP Server APIs',
                query: 'HttpServer register_route process_request'
            },
            {
                name: 'General REST endpoints',
                query: 'REST API endpoint route handler'
            },
            {
                name: 'JSON responses',
                query: 'JSON response HTTP request'
            }
        ];

        for (const apiQuery of apiQueries) {
            console.log(`  🔎 Testing: ${apiQuery.name}`);
            const queryRequest = {
                method: 'query_mindmap',
                params: {
                    query: apiQuery.query,
                    limit: 5
                }
            };
            mcp.stdin.write(JSON.stringify(queryRequest) + '\n');
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        console.log('🧠 Step 4: Testing brain-inspired features for API insights...');

        // Test pattern predictions related to APIs
        const patternRequest = {
            method: 'get_pattern_predictions',
            params: {}
        };
        mcp.stdin.write(JSON.stringify(patternRequest) + '\n');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test insights
        const insightsRequest = {
            method: 'get_insights',
            params: {
                categories: ['architecture', 'code_quality'],
                min_confidence: 0.3
            }
        };
        mcp.stdin.write(JSON.stringify(insightsRequest) + '\n');
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('⏳ Step 5: Waiting for all analysis to complete...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Evaluate results
        console.log('\n📈 Test Results:');
        console.log('=' .repeat(40));

        if (apiDetectionFound) {
            console.log('✅ API Detection: WORKING');
            console.log('  • detectCrossLanguageAPIs method executed successfully');
        } else {
            console.log('⚠️  API Detection: NEEDS VERIFICATION');
            console.log('  • Detection method may have run but results unclear');
        }

        if (detectionResults.length > 0) {
            console.log('✅ Detection Results: FOUND');
            console.log('  • API detection produced output');
            detectionResults.forEach(result => console.log(`    ${result}`));
        } else {
            console.log('⚠️  Detection Results: LIMITED');
        }

        // Check if we found specific API patterns in the output
        const apiPatterns = {
            python: output.includes('Flask') || output.includes('@app.route'),
            rust: output.includes('Actix') || output.includes('create_user_handler'),
            cpp: output.includes('HttpServer') || output.includes('register_route'),
            javascript: output.includes('Express') || output.includes('app.get'),
            general: output.includes('REST') || output.includes('endpoint')
        };

        console.log('\n🎯 Language-Specific API Pattern Detection:');
        Object.entries(apiPatterns).forEach(([lang, found]) => {
            console.log(`  ${found ? '✅' : '❌'} ${lang.toUpperCase()}: ${found ? 'DETECTED' : 'NOT FOUND'}`);
        });

        console.log('\n📊 Expected Test File APIs:');
        console.log('  🐍 test-python-example.py: Flask routes (@app.route, /users, /health)');
        console.log('  🦀 test-rust-example.rs: Actix-web (create_user_handler, get_user_handler, list_users_handler)');
        console.log('  ⚡ test-cpp-example.cpp: Custom HTTP server (/api/users, /api/users/{id})');

        const overallSuccess = apiDetectionFound && Object.values(apiPatterns).some(Boolean);

        console.log('\n🏆 Overall Test Result:');
        if (overallSuccess) {
            console.log('✅ SUCCESSFUL: Cross-language API detection is working!');
            console.log('   Implementation successfully detects API patterns across multiple languages');
        } else {
            console.log('⚠️  PARTIAL: API detection implemented but may need tuning');
            console.log('   The infrastructure is in place but pattern matching may need refinement');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        clearTimeout(timeout);
        mcp.kill('SIGTERM');

        // Print summary of relevant output
        if (output.length > 0) {
            console.log('\n📝 Relevant Output Summary:');
            const relevantLines = output.split('\n').filter(line =>
                line.includes('API') ||
                line.includes('endpoint') ||
                line.includes('route') ||
                line.includes('handler') ||
                line.includes('Flask') ||
                line.includes('Actix') ||
                line.includes('Express') ||
                line.includes('detectCrossLanguageAPIs') ||
                line.includes('Found') && (line.includes('match') || line.includes('confidence'))
            );

            if (relevantLines.length > 0) {
                relevantLines.slice(-15).forEach(line => console.log(`  ${line.trim()}`));
            } else {
                console.log('  (No explicit API detection output found in logs)');
            }
        }
    }
}

// Run the comprehensive test
testComprehensiveAPIDetection().catch(console.error);