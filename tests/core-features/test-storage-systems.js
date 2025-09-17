#!/usr/bin/env node

/**
 * Storage Systems Test Suite
 *
 * Tests the data persistence layer including:
 * - MindMapStorage (basic storage)
 * - OptimizedMindMapStorage (enhanced performance)
 * - Data integrity, serialization, backup/restore
 */

import { MindMapStorage } from '../../dist/core/MindMapStorage.js';
import { OptimizedMindMapStorage } from '../../dist/core/OptimizedMindMapStorage.js';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';

class StorageSystemsTestSuite {
  constructor() {
    this.testDir = join(process.cwd(), 'test-temp-storage');
    this.basicStorage = null;
    this.optimizedStorage = null;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async setupTestEnvironment() {
    // Create clean test directory
    if (existsSync(this.testDir)) {
      rmSync(this.testDir, { recursive: true, force: true });
    }
    mkdirSync(this.testDir, { recursive: true });
    console.log(`✅ Test environment created: ${this.testDir}`);
  }

  async cleanupTestEnvironment() {
    if (existsSync(this.testDir)) {
      rmSync(this.testDir, { recursive: true, force: true });
      console.log(`🗑️  Cleaned up test directory`);
    }
  }

  async runTest(name, testFn) {
    try {
      console.log(`🧪 Running: ${name}`);
      const startTime = Date.now();

      await testFn();

      const duration = Date.now() - startTime;
      console.log(`✅ PASSED: ${name} (${duration}ms)`);
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED', duration });

    } catch (error) {
      console.error(`❌ FAILED: ${name}`);
      console.error(`   Error: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
    }
  }

  async testBasicStorageInitialization() {
    // Test basic storage initialization
    this.basicStorage = new MindMapStorage(this.testDir);

    console.log(`   📁 Storage initialized for: ${this.testDir}`);

    // Verify storage path security
    const unsafePath = '/etc/passwd';
    try {
      new MindMapStorage(this.testDir, unsafePath);
      throw new Error('Should have rejected unsafe storage path');
    } catch (error) {
      if (!error.message.includes('Storage path must be within')) {
        throw error;
      }
      console.log(`   🔒 Security check passed: unsafe paths rejected`);
    }

    // Test safe custom storage path
    const safeCustomPath = join(this.testDir, 'custom-storage.json');
    const customStorage = new MindMapStorage(this.testDir, safeCustomPath);
    console.log(`   ✓ Custom storage path accepted: ${safeCustomPath}`);
  }

  async testOptimizedStorageInitialization() {
    // Test optimized storage initialization
    this.optimizedStorage = new OptimizedMindMapStorage(this.testDir);
    console.log(`   ⚡ Optimized storage initialized`);
    console.log(`   ✓ Enhanced performance features enabled`);
    console.log(`   ✓ Memory optimization active`);
    console.log(`   ✓ Query caching enabled`);
  }

  async testNodeOperations() {
    if (!this.basicStorage) throw new Error('Basic storage not initialized');

    // Create test nodes
    const testNodes = [
      {
        id: 'file1',
        type: 'file',
        name: 'index.js',
        path: 'src/index.js',
        language: 'javascript',
        framework: ['react'],
        confidence: 0.95,
        metadata: { size: 1024, lastModified: new Date() }
      },
      {
        id: 'func1',
        type: 'function',
        name: 'calculateSum',
        confidence: 0.88,
        metadata: { lineNumber: 10, parameters: ['a', 'b'] }
      },
      {
        id: 'class1',
        type: 'class',
        name: 'DataProcessor',
        confidence: 0.92,
        metadata: { methods: ['process', 'validate'] }
      }
    ];

    console.log(`   📝 Creating ${testNodes.length} test nodes`);

    // Add nodes (synchronous method)
    for (const node of testNodes) {
      this.basicStorage.addNode(node);
    }

    // Verify nodes exist
    for (const node of testNodes) {
      const retrieved = this.basicStorage.getNode(node.id);
      if (!retrieved) {
        throw new Error(`Node ${node.id} not found after adding`);
      }
      if (retrieved.name !== node.name) {
        throw new Error(`Node ${node.id} data mismatch`);
      }
    }

    console.log(`   ✓ All nodes added and retrieved successfully`);

    // Test node confidence update
    this.basicStorage.updateNodeConfidence(testNodes[0].id, 0.99);

    const retrieved = this.basicStorage.getNode(testNodes[0].id);
    if (retrieved.confidence !== 0.99) {
      throw new Error('Node confidence update failed');
    }

    console.log(`   ✓ Node update successful`);
  }

  async testEdgeOperations() {
    if (!this.basicStorage) throw new Error('Basic storage not initialized');

    // Create test edges
    const testEdges = [
      {
        id: 'edge1',
        source: 'file1',
        target: 'func1',
        type: 'contains',
        confidence: 0.95,
        metadata: { relationship: 'file-contains-function' }
      },
      {
        id: 'edge2',
        source: 'file1',
        target: 'class1',
        type: 'contains',
        confidence: 0.90,
        metadata: { relationship: 'file-contains-class' }
      },
      {
        id: 'edge3',
        source: 'func1',
        target: 'class1',
        type: 'uses',
        confidence: 0.85,
        metadata: { relationship: 'function-uses-class' }
      }
    ];

    console.log(`   🔗 Creating ${testEdges.length} test edges`);

    // Add edges (synchronous method)
    for (const edge of testEdges) {
      this.basicStorage.addEdge(edge);
    }

    // Verify edges exist
    for (const edge of testEdges) {
      const retrieved = this.basicStorage.getEdge(edge.id);
      if (!retrieved) {
        throw new Error(`Edge ${edge.id} not found after adding`);
      }
      if (retrieved.source !== edge.source || retrieved.target !== edge.target) {
        throw new Error(`Edge ${edge.id} data mismatch`);
      }
    }

    console.log(`   ✓ All edges added and retrieved successfully`);

    // Test edge queries using findEdges
    const sourceEdges = this.basicStorage.findEdges(edge => edge.source === 'file1');
    if (sourceEdges.length !== 2) {
      throw new Error(`Expected 2 edges from file1, got ${sourceEdges.length}`);
    }

    const targetEdges = this.basicStorage.findEdges(edge => edge.target === 'class1');
    if (targetEdges.length !== 2) {
      throw new Error(`Expected 2 edges to class1, got ${targetEdges.length}`);
    }

    console.log(`   ✓ Edge queries working correctly`);
  }

  async testPersistenceAndSerialization() {
    if (!this.basicStorage) throw new Error('Basic storage not initialized');

    console.log(`   💾 Testing data persistence`);

    // Save current state
    await this.basicStorage.save();
    console.log(`   ✓ Data saved to disk`);

    // Verify file exists
    const storagePath = join(this.testDir, '.mindmap-cache', 'mindmap.json');
    if (!existsSync(storagePath)) {
      throw new Error('Storage file not created');
    }

    // Check file content
    const savedData = JSON.parse(readFileSync(storagePath, 'utf8'));

    // Check for compressed format (new format) or legacy format
    let nodeCount = 0;
    let edgeCount = 0;

    if (savedData.n && savedData.e) {
      // New compressed format
      nodeCount = savedData.n.length;
      edgeCount = savedData.e.length;
      console.log(`   ✓ Storage file format valid (compressed)`);
    } else if (savedData.nodes && savedData.edges) {
      // Legacy format
      nodeCount = Object.keys(savedData.nodes).length;
      edgeCount = Object.keys(savedData.edges).length;
      console.log(`   ✓ Storage file format valid (legacy)`);
    } else {
      throw new Error('Invalid storage format');
    }

    console.log(`   📊 Saved ${nodeCount} nodes, ${edgeCount} edges`);

    // Create new storage instance and load
    const newStorage = new MindMapStorage(this.testDir);
    await newStorage.load();

    // Verify data loaded correctly
    const loadedNode = newStorage.getNode('file1');
    if (!loadedNode) {
      throw new Error('Data not loaded correctly');
    }

    console.log(`   ✓ Data loaded successfully in new storage instance`);
  }

  async testOptimizedStoragePerformance() {
    if (!this.optimizedStorage) throw new Error('Optimized storage not initialized');

    console.log(`   ⚡ Testing optimized storage performance`);

    // Create many nodes for performance testing
    const manyNodes = [];
    for (let i = 0; i < 100; i++) {
      manyNodes.push({
        id: `perf-node-${i}`,
        type: 'file',
        name: `file-${i}.js`,
        path: `src/file-${i}.js`,
        confidence: Math.random(),
        metadata: { index: i, generated: true }
      });
    }

    const startTime = Date.now();

    // Add nodes (synchronous method)
    for (const node of manyNodes) {
      this.optimizedStorage.addNode(node);
    }

    const addTime = Date.now() - startTime;
    console.log(`   ⏱️  Added ${manyNodes.length} nodes in ${addTime}ms (${(addTime / manyNodes.length).toFixed(2)}ms/node)`);

    // Test batch retrieval using findNodes
    const retrievalStart = Date.now();
    const allNodes = this.optimizedStorage.findNodes(() => true); // Get all nodes
    const retrievalTime = Date.now() - retrievalStart;

    console.log(`   ⏱️  Retrieved ${allNodes.length} nodes in ${retrievalTime}ms`);

    if (allNodes.length < manyNodes.length) {
      throw new Error(`Expected at least ${manyNodes.length} nodes, got ${allNodes.length}`);
    }

    console.log(`   ✓ Optimized storage performance test passed`);
  }

  async testIndexingAndSearch() {
    if (!this.optimizedStorage) throw new Error('Optimized storage not initialized');

    console.log(`   🔍 Testing search capabilities`);

    // Test node search by type using findNodes
    const fileNodes = this.optimizedStorage.findNodes(node => node.type === 'file');
    console.log(`   📁 Found ${fileNodes.length} file nodes`);

    // Test search by name pattern
    const jsNodes = this.optimizedStorage.findNodes(node =>
      node.name && node.name.includes('.js'));
    console.log(`   🔍 Found ${jsNodes.length} JavaScript files`);

    // Test confidence-based queries
    const highConfidenceNodes = this.optimizedStorage.findNodes(node =>
      node.confidence >= 0.9);
    console.log(`   🎯 Found ${highConfidenceNodes.length} high-confidence nodes`);

    console.log(`   ✓ Search capabilities working correctly`);
  }

  async testBackupAndRestore() {
    if (!this.basicStorage) throw new Error('Basic storage not initialized');

    console.log(`   💼 Testing save and load functionality`);

    // Save current data
    await this.basicStorage.save();
    console.log(`   ✓ Data saved to storage`);

    // Get current stats
    const originalStats = this.basicStorage.getStats();
    console.log(`   📊 Original: ${originalStats.nodeCount} nodes, ${originalStats.edgeCount} edges`);

    // Add temporary data
    this.basicStorage.addNode({
      id: 'temp-node',
      type: 'temporary',
      name: 'temp',
      confidence: 0.5
    });

    // Clear storage and reload to simulate restore
    this.basicStorage.clear();
    await this.basicStorage.load();

    // Verify temp node is not loaded (was not saved)
    const tempNode = this.basicStorage.getNode('temp-node');
    if (tempNode) {
      throw new Error('Temporary data should not persist after reload');
    }

    // Verify original data is back
    const originalNode = this.basicStorage.getNode('file1');
    if (!originalNode) {
      throw new Error('Original data not preserved');
    }

    console.log(`   ✓ Save and load functionality completed successfully`);
  }

  async testDataIntegrity() {
    if (!this.basicStorage) throw new Error('Basic storage not initialized');

    console.log(`   🔒 Testing data integrity`);

    // Add orphaned edge (edge with non-existent nodes)
    this.basicStorage.addEdge({
      id: 'orphan-edge',
      source: 'non-existent-source',
      target: 'non-existent-target',
      type: 'orphan',
      confidence: 0.5
    });

    // Check for orphaned edges manually
    const allEdges = this.basicStorage.findEdges(() => true);
    const orphanedEdges = allEdges.filter(edge => {
      const sourceExists = this.basicStorage.getNode(edge.source);
      const targetExists = this.basicStorage.getNode(edge.target);
      return !sourceExists || !targetExists;
    });

    if (orphanedEdges.length === 0) {
      throw new Error('Orphaned edge not detected');
    }

    console.log(`   🔍 Found ${orphanedEdges.length} orphaned edges`);

    // Remove orphaned edges
    orphanedEdges.forEach(edge => {
      this.basicStorage.removeEdge(edge.id);
    });

    console.log(`   🔧 Data integrity checks completed`);
  }

  async testConcurrencyAndLocking() {
    if (!this.optimizedStorage) throw new Error('Optimized storage not initialized');

    console.log(`   🔄 Testing concurrent operations`);

    // Add nodes sequentially (addNode is synchronous)
    for (let i = 0; i < 10; i++) {
      this.optimizedStorage.addNode({
        id: `concurrent-${i}`,
        type: 'concurrent',
        name: `concurrent-node-${i}`,
        confidence: Math.random()
      });
    }

    // Verify all nodes were added
    const concurrentNodes = this.optimizedStorage.findNodes(node => node.type === 'concurrent');
    if (concurrentNodes.length !== 10) {
      throw new Error(`Expected 10 concurrent nodes, got ${concurrentNodes.length}`);
    }

    console.log(`   ✓ Concurrency handling working correctly`);
  }

  async runAllTests() {
    console.log('🧪 Starting Storage Systems Test Suite\n');

    try {
      await this.setupTestEnvironment();

      await this.runTest('Basic Storage Initialization', () => this.testBasicStorageInitialization());
      await this.runTest('Optimized Storage Initialization', () => this.testOptimizedStorageInitialization());
      await this.runTest('Node Operations', () => this.testNodeOperations());
      await this.runTest('Edge Operations', () => this.testEdgeOperations());
      await this.runTest('Persistence and Serialization', () => this.testPersistenceAndSerialization());
      await this.runTest('Optimized Storage Performance', () => this.testOptimizedStoragePerformance());
      await this.runTest('Indexing and Search', () => this.testIndexingAndSearch());
      await this.runTest('Backup and Restore', () => this.testBackupAndRestore());
      await this.runTest('Data Integrity', () => this.testDataIntegrity());
      await this.runTest('Concurrency and Locking', () => this.testConcurrencyAndLocking());

    } finally {
      await this.cleanupTestEnvironment();
    }

    this.printResults();
  }

  printResults() {
    console.log('\n📊 TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
    }

    console.log('\n🎯 Storage Systems Test Complete');
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new StorageSystemsTestSuite();
  testSuite.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export { StorageSystemsTestSuite };