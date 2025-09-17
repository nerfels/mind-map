#!/usr/bin/env node

/**
 * Test Safe Memory Optimization using MCP directly
 */

console.log('🧠 Testing Safe Memory Optimization via MCP');
console.log('=' .repeat(60));

console.log('📊 Current Statistics:');
console.log('  Use MCP tools to get current state and test optimization');
console.log('  This avoids the empty graph issue with direct MindMapEngine');

console.log('\n🔍 Steps to test:');
console.log('1. mcp__mind-map-mcp__get_stats - Get current state');
console.log('2. Test edge analysis with dry run');
console.log('3. Validate memory file size before/after');
console.log('4. Check data integrity');

console.log('\n📈 Expected Results:');
console.log('  - Should see 12k+ nodes, 49k+ edges');
console.log('  - Conservative edge pruning (5-10% max)');
console.log('  - File size reduction while preserving data');
console.log('  - Safety limits prevent data loss');

console.log('\n✅ Test completed - use MCP tools for actual testing');