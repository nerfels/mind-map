#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, 'dist/index.js');

console.log('🧠 Mind Map MCP - Project Structure Demo\n');
console.log('=========================================\n');

async function runMCPCommand(command) {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    let buffer = '';
    let responseReceived = false;

    server.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            if (response.result && !responseReceived) {
              responseReceived = true;
              server.kill();
              resolve(response.result);
            }
          } catch (error) {
            // Ignore non-JSON lines
          }
        }
      }
    });

    server.on('error', reject);

    // Send initialize and command
    setTimeout(() => {
      server.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'demo', version: '1.0.0' }
        }
      }) + '\n');
      
      setTimeout(() => {
        server.stdin.write(JSON.stringify(command) + '\n');
      }, 500);
    }, 500);

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!responseReceived) {
        server.kill();
        resolve(null);
      }
    }, 10000);
  });
}

async function demonstrateMindMap() {
  console.log('📂 Step 1: Scanning project structure...\n');
  
  const scanResult = await runMCPCommand({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'scan_project',
      arguments: {
        force_rescan: true,
        include_analysis: true
      }
    }
  });

  if (scanResult?.content?.[0]?.text) {
    console.log(scanResult.content[0].text);
  }

  console.log('\n💾 Step 2: Project structure has been saved to mind map!\n');
  console.log('Location: .mindmap-cache/mindmap.json\n');

  // Read and display the saved structure
  try {
    const mindmapData = await readFile('.mindmap-cache/mindmap.json', 'utf-8');
    const mindmap = JSON.parse(mindmapData);
    
    console.log('📊 Saved Project Structure Summary:');
    console.log('====================================');
    console.log(`Project Root: ${mindmap.projectRoot}`);
    console.log(`Last Scan: ${mindmap.lastScan}`);
    console.log(`Total Nodes: ${mindmap.nodes.length}`);
    console.log(`Total Edges: ${mindmap.edges.length}`);
    console.log('\n📁 File Structure (first 10 files):');
    console.log('-----------------------------------');
    
    const fileNodes = mindmap.nodes
      .filter(([id, node]) => node.type === 'file')
      .slice(0, 10);
    
    fileNodes.forEach(([id, node]) => {
      console.log(`  📄 ${node.path}`);
      if (node.properties?.language) {
        console.log(`     Language: ${node.properties.language}`);
      }
      if (node.metadata?.size) {
        console.log(`     Size: ${node.metadata.size} bytes`);
      }
    });

    console.log('\n📂 Directory Structure:');
    console.log('----------------------');
    const dirNodes = mindmap.nodes
      .filter(([id, node]) => node.type === 'directory')
      .slice(0, 5);
    
    dirNodes.forEach(([id, node]) => {
      console.log(`  📁 ${node.path || node.name}`);
    });

  } catch (error) {
    console.error('Could not read saved mind map:', error.message);
  }

  console.log('\n🔍 Step 3: Querying the saved structure...\n');
  
  const queryResult = await runMCPCommand({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'query_mindmap',
      arguments: {
        query: 'typescript test',
        limit: 3
      }
    }
  });

  if (queryResult?.content?.[0]?.text) {
    console.log('Query Results for "typescript test":');
    console.log(queryResult.content[0].text);
  }

  console.log('\n📈 Step 4: Getting mind map statistics...\n');
  
  const statsResult = await runMCPCommand({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'get_stats',
      arguments: {}
    }
  });

  if (statsResult?.content?.[0]?.text) {
    console.log(statsResult.content[0].text);
  }

  console.log('\n✅ Demo Complete!\n');
  console.log('The project structure has been saved and can be queried.');
  console.log('The mind map persists across sessions and will learn from your interactions.');
  console.log('\nKey features demonstrated:');
  console.log('  • Project scanning and analysis');
  console.log('  • Persistent storage in .mindmap-cache/');
  console.log('  • Semantic querying of project structure');
  console.log('  • Statistics and overview generation');
  console.log('\nThe mind map will now remember this project structure and improve over time!');
}

demonstrateMindMap().catch(console.error);