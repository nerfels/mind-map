#!/usr/bin/env node

import { JavaAnalyzer } from './dist/core/JavaAnalyzer.js';
import { readFile } from 'fs/promises';

async function testJavaAnalyzer() {
    console.log('🔍 Testing Java Analyzer directly...\n');

    const analyzer = new JavaAnalyzer();
    const testFile = './test-java-project/src/main/java/com/example/Calculator.java';

    try {
        console.log('📁 Reading file:', testFile);
        const content = await readFile(testFile, 'utf-8');
        console.log('✅ File read successfully, length:', content.length);
        console.log('📝 First 200 chars:', content.substring(0, 200) + '...\n');

        console.log('🔬 Testing canAnalyze...');
        const canAnalyze = analyzer.canAnalyze(testFile);
        console.log('✅ Can analyze:', canAnalyze);

        if (canAnalyze) {
            console.log('\n🚀 Running analyzeFile...');
            const result = await analyzer.analyzeFile(testFile);
            console.log('📊 Analysis result:', JSON.stringify(result, null, 2));

            if (result) {
                console.log('\n📈 Summary:');
                console.log('- Classes found:', result.classes.length);
                console.log('- Functions found:', result.functions.length);
                console.log('- Imports found:', result.imports.length);
                console.log('- Java imports found:', result.javaImports.length);
                console.log('- Package declaration:', result.packageDeclaration);
            }
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testJavaAnalyzer().catch(console.error);