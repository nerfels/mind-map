const fs = require('fs');
const path = require('path');

console.log('🔍 Testing MCP scan from demo project directory');
console.log('Working directory:', process.cwd());
console.log('Directory contents:', fs.readdirSync('.'));

try {
  // Try to import the MCP engine
  const mcpPath = path.join('..', 'dist', 'core', 'MindMapEngine.js');
  console.log('Attempting to import MCP from:', path.resolve(mcpPath));

  if (fs.existsSync(path.resolve(mcpPath))) {
    console.log('✅ MCP file exists');

    const { MindMapEngine } = require(mcpPath);
    console.log('✅ MindMapEngine imported successfully');

    const engine = new MindMapEngine();
    console.log('✅ MindMapEngine instance created');

    // Test scan from current directory (demo project)
    console.log('Scanning current directory...');
    const scanResult = engine.scan_project({
      force_rescan: true,
      include_analysis: true
    });

    console.log('Scan results:');
    console.log('- Working directory during scan:', process.cwd());
    console.log('- Stats:', JSON.stringify(scanResult.stats, null, 2));

    // Test query functionality
    console.log('\nTesting query functionality...');
    const queryResult = engine.query_mindmap({
      query: 'package.json',
      limit: 5
    });

    console.log('Query results:');
    console.log('- Results found:', queryResult.results?.length || 0);
    if (queryResult.results?.length > 0) {
      queryResult.results.forEach((result, i) => {
        console.log(`  ${i+1}. ${result.id} (confidence: ${result.confidence})`);
      });
    }

  } else {
    console.log('❌ MCP file not found at:', path.resolve(mcpPath));
    console.log('Available files in parent dist/core:');
    const distCorePath = path.resolve('..', 'dist', 'core');
    if (fs.existsSync(distCorePath)) {
      console.log(fs.readdirSync(distCorePath));
    } else {
      console.log('dist/core directory does not exist');
    }
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}