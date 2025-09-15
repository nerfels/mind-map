#!/usr/bin/env node

console.log('🔍 Debug MCP Context');
console.log('Current working directory:', process.cwd());
console.log('Demo project files:', require('fs').readdirSync('.').length);

// Test if we can access the MCP server's context
try {
  const path = require('path');

  // These would be the paths the MCP server should be seeing
  const currentWorkingDir = process.cwd();
  const mainProjectRoot = path.resolve('..');

  console.log('Expected comparison:');
  console.log('- Current (demo):', currentWorkingDir);
  console.log('- Main project:', mainProjectRoot);
  console.log('- Are they different?:', currentWorkingDir !== mainProjectRoot);

} catch (error) {
  console.error('Error:', error.message);
}