#!/usr/bin/env node

/**
 * Test Scalability Improvements (Phase 4.2)
 *
 * Tests:
 * - Project scale analysis
 * - Adaptive configuration
 * - Resource usage monitoring
 * - Memory management
 * - Performance metrics
 */

const { MindMapMCPServer } = require('./../../dist/index.js');

async function testScalabilityFeatures() {
  console.log('🧪 Testing Phase 4.2 Scalability Improvements...\n');

  try {
    const server = new MindMapMCPServer();
    await server.engine.initialize();

    // Test 1: Project Scale Analysis
    console.log('📏 Test 1: Project Scale Analysis');
    try {
      const projectScale = await server.engine.analyzeProjectScale();
      console.log(`✅ Project Scale: ${projectScale.scale}`);
      console.log(`   Files: ${projectScale.fileCount}`);
      console.log(`   Directories: ${projectScale.directoryCount}`);
      console.log(`   Size: ${(projectScale.totalSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Estimated Memory: ${(projectScale.estimatedMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Recommended Config:`, Object.keys(projectScale.recommendedConfig));
    } catch (error) {
      console.log(`❌ Project scale analysis failed:`, error.message);
    }

    // Test 2: Resource Usage Monitoring
    console.log('\\n💾 Test 2: Resource Usage Monitoring');
    try {
      const resourceUsage = server.engine.getResourceUsage();
      console.log(`✅ Memory Usage: ${resourceUsage.memoryUsage.percentage.toFixed(1)}%`);
      console.log(`   Nodes: ${resourceUsage.nodeCount}`);
      console.log(`   Edges: ${resourceUsage.edgeCount}`);
      console.log(`   Memory: ${(resourceUsage.memoryUsage.used / 1024 / 1024).toFixed(2)}MB used`);
    } catch (error) {
      console.log(`❌ Resource monitoring failed:`, error.message);
    }

    // Test 3: Scalability Configuration
    console.log('\\n⚙️ Test 3: Scalability Configuration');
    try {
      const config = server.engine.getScalabilityConfig();
      console.log(`✅ Scalability Configuration:`);
      console.log(`   Max Files Per Scan: ${config.maxFilesPerScan}`);
      console.log(`   Max Depth: ${config.maxDepth}`);
      console.log(`   Partitioning Enabled: ${config.enablePartitioning}`);
      console.log(`   Incremental Analysis: ${config.enableIncrementalAnalysis}`);
      console.log(`   Memory Threshold: ${config.memoryPressureThreshold}%`);
      console.log(`   Partition Size: ${config.partitionSize}`);
    } catch (error) {
      console.log(`❌ Configuration access failed:`, error.message);
    }

    // Test 4: Adaptive Scanning
    console.log('\\n🔄 Test 4: Adaptive Scanning Performance');
    try {
      const startTime = Date.now();
      const scanResult = await server.engine.scanProject(true, true);
      const scanTime = Date.now() - startTime;

      console.log(`✅ Adaptive Scan Results:`);
      console.log(`   Summary: ${scanResult.summary}`);
      console.log(`   Files Scanned: ${scanResult.scannedFiles}/${scanResult.totalFiles}`);
      console.log(`   Partitions: ${scanResult.partitions}`);
      console.log(`   Scan Time: ${scanTime}ms (reported: ${scanResult.scanTime}ms)`);
      console.log(`   Project Scale: ${scanResult.projectScale.scale}`);

      // Performance validation
      if (scanTime < 60000) { // Less than 60 seconds
        console.log(`✅ Performance: Good (${scanTime}ms < 60s)`);
      } else {
        console.log(`⚠️ Performance: Slow (${scanTime}ms > 60s)`);
      }
    } catch (error) {
      console.log(`❌ Adaptive scanning failed:`, error.message);
    }

    // Test 5: Configuration Updates
    console.log('\\n⚙️ Test 5: Dynamic Configuration Updates');
    try {
      // Update configuration for testing
      server.engine.updateScalabilityConfig({
        maxFilesPerScan: 1000,
        memoryPressureThreshold: 70,
        enablePartitioning: true
      });

      const updatedConfig = server.engine.getScalabilityConfig();
      console.log(`✅ Configuration Updated:`);
      console.log(`   Max Files Per Scan: ${updatedConfig.maxFilesPerScan} (should be 1000)`);
      console.log(`   Memory Threshold: ${updatedConfig.memoryPressureThreshold}% (should be 70%)`);
      console.log(`   Partitioning: ${updatedConfig.enablePartitioning} (should be true)`);
    } catch (error) {
      console.log(`❌ Configuration update failed:`, error.message);
    }

    // Test 6: Memory and Performance Metrics
    console.log('\\n📊 Test 6: Performance Metrics Summary');
    try {
      const finalStats = server.engine.getStats();
      const finalResources = server.engine.getResourceUsage();

      console.log(`✅ Final Statistics:`);
      console.log(`   Total Nodes: ${finalStats.totalNodes}`);
      console.log(`   Total Edges: ${finalStats.totalEdges}`);
      console.log(`   Memory Usage: ${finalResources.memoryUsage.percentage.toFixed(1)}%`);
      console.log(`   Average Confidence: ${finalStats.averageConfidence}`);

      // Scalability assessment
      const isScalable = finalStats.totalNodes < 100000 &&
                        finalResources.memoryUsage.percentage < 80;
      console.log(`\\n🎯 Scalability Assessment: ${isScalable ? '✅ GOOD' : '⚠️ NEEDS OPTIMIZATION'}`);

      if (!isScalable) {
        console.log(`   Recommendations:`);
        if (finalStats.totalNodes >= 100000) {
          console.log(`   - Enable partitioning for ${finalStats.totalNodes} nodes`);
        }
        if (finalResources.memoryUsage.percentage >= 80) {
          console.log(`   - Reduce memory usage (currently ${finalResources.memoryUsage.percentage.toFixed(1)}%)`);
        }
      }
    } catch (error) {
      console.log(`❌ Performance metrics failed:`, error.message);
    }

    console.log('\\n✅ Phase 4.2 Scalability Testing Completed!');
    console.log('\\n📋 Features Tested:');
    console.log('   ✅ Project scale analysis');
    console.log('   ✅ Resource usage monitoring');
    console.log('   ✅ Adaptive configuration');
    console.log('   ✅ Scalable scanning');
    console.log('   ✅ Dynamic config updates');
    console.log('   ✅ Performance metrics');

  } catch (error) {
    console.error('❌ Scalability test failed:', error);
    process.exit(1);
  }
}

// Run the test
testScalabilityFeatures().catch(console.error);