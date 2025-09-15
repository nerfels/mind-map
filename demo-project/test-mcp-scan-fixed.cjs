const fs = require('fs');
const path = require('path');

console.log('🔍 Testing MCP scan from demo project directory');
console.log('Working directory:', process.cwd());
console.log('Directory contents:', fs.readdirSync('.'));

try {
  // Try to import the MCP engine
  const mcpPath = path.join('..', 'dist', 'core', 'MindMapEngine.js');
  console.log('Attempting to import MCP from:', path.resolve(mcpPath));

  const { MindMapEngine } = require(mcpPath);
  console.log('✅ MindMapEngine imported successfully');

  // Initialize with the current directory (demo project) as the project root
  const projectRoot = process.cwd();
  console.log('Using project root:', projectRoot);

  const engine = new MindMapEngine(projectRoot);
  console.log('✅ MindMapEngine instance created with project root');

  // Test scan from current directory (demo project)
  console.log('Scanning current directory...');
  const scanResult = engine.scan_project({
    force_rescan: true,
    include_analysis: true
  });

  console.log('Scan results:');
  console.log('- Working directory during scan:', process.cwd());
  console.log('- Project root used:', projectRoot);
  console.log('- Stats:', JSON.stringify(scanResult.stats, null, 2));

  // Check if mindmap cache was created
  const cacheDir = path.join(projectRoot, '.mindmap_cache');
  if (fs.existsSync(cacheDir)) {
    console.log('✅ MindMap cache created at:', cacheDir);
    const cacheFiles = fs.readdirSync(cacheDir);
    console.log('Cache files:', cacheFiles);
  } else {
    console.log('❌ MindMap cache not created');
  }

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

  // Test querying for JavaScript files
  console.log('\nTesting query for JavaScript files...');
  const jsQueryResult = engine.query_mindmap({
    query: 'javascript',
    limit: 10
  });

  console.log('JavaScript query results:');
  console.log('- Results found:', jsQueryResult.results?.length || 0);
  if (jsQueryResult.results?.length > 0) {
    jsQueryResult.results.forEach((result, i) => {
      console.log(`  ${i+1}. ${result.id} (confidence: ${result.confidence})`);
    });
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}