/**
 * Scalability Manager - Handle large codebases efficiently
 *
 * Features:
 * - Adaptive scanning based on project size
 * - Memory usage monitoring and limits
 * - Graph partitioning for large projects
 * - Incremental analysis optimization
 * - Resource usage tracking and cleanup
 */

import { MindMapStorage } from './MindMapStorage.js';
import { FileScanner } from './FileScanner.js';
import { ScalabilityConfig, ProjectScale, ResourceUsage, FileInfo } from '../types/index.js';
import { join } from 'path';
import { promises as fs } from 'fs';

export class ScalabilityManager {
  private storage: MindMapStorage;
  private scanner: FileScanner;
  private config: ScalabilityConfig;
  private projectRoot: string;
  private resourceUsage: ResourceUsage;
  private lastCleanup: Date = new Date();

  constructor(
    storage: MindMapStorage,
    scanner: FileScanner,
    projectRoot: string,
    config?: Partial<ScalabilityConfig>
  ) {
    this.storage = storage;
    this.scanner = scanner;
    this.projectRoot = projectRoot;
    this.config = this.createDefaultConfig(config);
    this.resourceUsage = this.initializeResourceUsage();

    // Start resource monitoring
    this.startResourceMonitoring();
  }

  /**
   * Create default scalability configuration
   */
  private createDefaultConfig(overrides?: Partial<ScalabilityConfig>): ScalabilityConfig {
    const defaults: ScalabilityConfig = {
      // Project size thresholds
      smallProjectThreshold: 1000,
      mediumProjectThreshold: 10000,
      largeProjectThreshold: 100000,

      // Scanning limits
      maxFilesPerScan: 5000,
      maxDepth: 20,
      maxFileSize: 5 * 1024 * 1024, // 5MB

      // Memory limits
      maxNodesInMemory: 50000,
      maxEdgesInMemory: 100000,
      maxCacheSize: 100 * 1024 * 1024, // 100MB

      // Performance thresholds
      scanTimeoutMs: 300000, // 5 minutes
      queryTimeoutMs: 30000,  // 30 seconds
      memoryPressureThreshold: 80, // 80%

      // Partitioning strategy
      enablePartitioning: false,
      partitionSize: 10000,
      partitionOverlap: 10, // 10%

      // Incremental analysis
      enableIncrementalAnalysis: true,
      changeThreshold: 5, // 5% changes trigger full rescan
      watchModeEnabled: false
    };

    return { ...defaults, ...overrides };
  }

  /**
   * Initialize resource usage tracking
   */
  private initializeResourceUsage(): ResourceUsage {
    return {
      memoryUsage: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        percentage: 0
      },
      nodeCount: 0,
      edgeCount: 0,
      cacheUsage: {
        size: 0,
        hitRate: 0,
        evictions: 0
      },
      performanceMetrics: {
        avgScanTime: 0,
        avgQueryTime: 0,
        slowOperations: 0
      }
    };
  }

  /**
   * Analyze project scale and recommend configuration
   */
  async analyzeProjectScale(): Promise<ProjectScale> {
    console.log('📏 Analyzing project scale...');

    const startTime = Date.now();
    let fileCount = 0;
    let directoryCount = 0;
    let totalSize = 0;

    try {
      const files = await this.scanner.scanProject();

      for (const file of files) {
        if (file.type === 'file') {
          fileCount++;
          totalSize += file.size;
        } else if (file.type === 'directory') {
          directoryCount++;
        }
      }
    } catch (error) {
      console.warn('Failed to analyze project scale:', error);
      // Fallback to basic directory scan
      fileCount = await this.estimateFileCount();
    }

    const scale = this.determineScale(fileCount);
    const estimatedMemoryUsage = this.estimateMemoryUsage(fileCount, totalSize);
    const recommendedConfig = this.getRecommendedConfig(scale, fileCount);

    const analysisTime = Date.now() - startTime;
    console.log(`📊 Project scale analysis completed in ${analysisTime}ms`);
    console.log(`   Files: ${fileCount}, Directories: ${directoryCount}, Size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

    return {
      scale,
      fileCount,
      directoryCount,
      totalSize,
      estimatedMemoryUsage,
      recommendedConfig
    };
  }

  /**
   * Determine project scale based on file count
   */
  private determineScale(fileCount: number): 'small' | 'medium' | 'large' | 'enterprise' {
    if (fileCount < this.config.smallProjectThreshold) {
      return 'small';
    } else if (fileCount < this.config.mediumProjectThreshold) {
      return 'medium';
    } else if (fileCount < this.config.largeProjectThreshold) {
      return 'large';
    } else {
      return 'enterprise';
    }
  }

  /**
   * Estimate memory usage based on project size
   */
  private estimateMemoryUsage(fileCount: number, totalSize: number): number {
    // Rough estimates:
    // - 1KB per file node
    // - 500 bytes per edge
    // - 2KB per function/class node
    // - Cache overhead ~30%

    const baseNodeMemory = fileCount * 1024; // 1KB per file
    const estimatedFunctions = fileCount * 5; // ~5 functions per file average
    const functionMemory = estimatedFunctions * 2048; // 2KB per function
    const edgeMemory = (fileCount + estimatedFunctions) * 2 * 500; // ~2 edges per node
    const cacheOverhead = (baseNodeMemory + functionMemory + edgeMemory) * 0.3;

    return Math.round(baseNodeMemory + functionMemory + edgeMemory + cacheOverhead);
  }

  /**
   * Get recommended configuration for project scale
   */
  private getRecommendedConfig(scale: string, fileCount: number): Partial<ScalabilityConfig> {
    const configs = {
      small: {
        maxFilesPerScan: 1000,
        maxDepth: 15,
        enablePartitioning: false,
        maxNodesInMemory: 10000,
        maxEdgesInMemory: 20000
      },
      medium: {
        maxFilesPerScan: 3000,
        maxDepth: 20,
        enablePartitioning: false,
        maxNodesInMemory: 25000,
        maxEdgesInMemory: 50000
      },
      large: {
        maxFilesPerScan: 5000,
        maxDepth: 25,
        enablePartitioning: true,
        partitionSize: 8000,
        maxNodesInMemory: 40000,
        maxEdgesInMemory: 80000
      },
      enterprise: {
        maxFilesPerScan: 10000,
        maxDepth: 30,
        enablePartitioning: true,
        partitionSize: 15000,
        maxNodesInMemory: 50000,
        maxEdgesInMemory: 100000,
        enableIncrementalAnalysis: true,
        watchModeEnabled: true
      }
    };

    return configs[scale as keyof typeof configs] || configs.medium;
  }

  /**
   * Apply adaptive scanning based on project scale
   */
  async adaptiveScan(forceRescan: boolean = false): Promise<{
    scannedFiles: number;
    totalFiles: number;
    skippedFiles: number;
    partitions: number;
    scanTime: number;
  }> {
    const startTime = Date.now();
    console.log('🔄 Starting adaptive scan...');

    // Analyze project scale first
    const projectScale = await this.analyzeProjectScale();
    console.log(`📏 Detected ${projectScale.scale} project (${projectScale.fileCount} files)`);

    // Apply recommended configuration
    this.applyConfiguration(projectScale.recommendedConfig);

    // Get files to scan
    const allFiles = await this.scanner.scanProject();
    let filesToScan = allFiles.filter(f => f.type === 'file');

    // Apply size and depth limits
    filesToScan = this.applyFileLimits(filesToScan);

    // Determine if incremental scan is possible
    const shouldUseIncremental = this.shouldUseIncrementalScan(forceRescan, filesToScan);
    let scannedFiles = 0;
    let partitions = 0;

    if (shouldUseIncremental) {
      console.log('🔄 Using incremental scan...');
      scannedFiles = await this.performIncrementalScan(filesToScan);
    } else {
      console.log('🔄 Using full scan with partitioning...');
      if (this.config.enablePartitioning && filesToScan.length > this.config.partitionSize) {
        const result = await this.performPartitionedScan(filesToScan);
        scannedFiles = result.scannedFiles;
        partitions = result.partitions;
      } else {
        scannedFiles = await this.performBatchScan(filesToScan);
      }
    }

    const scanTime = Date.now() - startTime;
    const skippedFiles = filesToScan.length - scannedFiles;

    console.log(`✅ Adaptive scan completed in ${scanTime}ms`);
    console.log(`   Scanned: ${scannedFiles}, Skipped: ${skippedFiles}, Partitions: ${partitions}`);

    // Update resource usage
    this.updateResourceUsage();

    return {
      scannedFiles,
      totalFiles: filesToScan.length,
      skippedFiles,
      partitions,
      scanTime
    };
  }

  /**
   * Apply file size and depth limits
   */
  private applyFileLimits(files: FileInfo[]): FileInfo[] {
    return files.filter(file => {
      // Check file size limit
      if (file.size > this.config.maxFileSize) {
        return false;
      }

      // Check depth limit
      const depth = file.path.split('/').length - this.projectRoot.split('/').length;
      if (depth > this.config.maxDepth) {
        return false;
      }

      return true;
    });
  }

  /**
   * Determine if incremental scan should be used
   */
  private shouldUseIncrementalScan(forceRescan: boolean, files: FileInfo[]): boolean {
    if (forceRescan || !this.config.enableIncrementalAnalysis) {
      return false;
    }

    const graph = this.storage.getGraph();
    const existingFileCount = Array.from(graph.nodes.values())
      .filter(node => node.type === 'file').length;

    if (existingFileCount === 0) {
      return false; // No existing data, need full scan
    }

    const changePercentage = Math.abs(files.length - existingFileCount) / existingFileCount * 100;
    return changePercentage < this.config.changeThreshold;
  }

  /**
   * Perform incremental scan
   */
  private async performIncrementalScan(files: FileInfo[]): Promise<number> {
    const graph = this.storage.getGraph();
    const existingFiles = new Set(
      Array.from(graph.nodes.values())
        .filter(node => node.type === 'file')
        .map(node => node.path)
    );

    let scanned = 0;
    for (const file of files) {
      if (!existingFiles.has(file.path)) {
        // New file, scan it
        await this.scanSingleFile(file);
        scanned++;
      } else {
        // Check if file was modified
        const existingNode = Array.from(graph.nodes.values())
          .find(node => node.type === 'file' && node.path === file.path);

        if (existingNode && new Date(existingNode.lastUpdated) < file.lastModified) {
          await this.scanSingleFile(file);
          scanned++;
        }
      }

      // Respect memory limits
      if (this.isMemoryPressureHigh()) {
        console.log('⚠️ Memory pressure detected, pausing incremental scan');
        await this.performMemoryCleanup();
      }
    }

    return scanned;
  }

  /**
   * Perform partitioned scan for large projects
   */
  private async performPartitionedScan(files: FileInfo[]): Promise<{
    scannedFiles: number;
    partitions: number;
  }> {
    const partitions = this.createPartitions(files);
    let totalScanned = 0;

    console.log(`📦 Created ${partitions.length} partitions for large project scan`);

    for (let i = 0; i < partitions.length; i++) {
      console.log(`📦 Processing partition ${i + 1}/${partitions.length} (${partitions[i].length} files)`);

      const partitionScanned = await this.performBatchScan(partitions[i]);
      totalScanned += partitionScanned;

      // Memory cleanup between partitions
      if (this.isMemoryPressureHigh()) {
        console.log('🧹 Performing memory cleanup between partitions...');
        await this.performMemoryCleanup();
      }

      // Brief pause between partitions to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      scannedFiles: totalScanned,
      partitions: partitions.length
    };
  }

  /**
   * Create partitions from file list
   */
  private createPartitions(files: FileInfo[]): FileInfo[][] {
    const partitions: FileInfo[][] = [];
    const partitionSize = this.config.partitionSize;
    const overlapSize = Math.floor(partitionSize * this.config.partitionOverlap / 100);

    for (let i = 0; i < files.length; i += partitionSize - overlapSize) {
      const partition = files.slice(i, i + partitionSize);
      if (partition.length > 0) {
        partitions.push(partition);
      }
    }

    return partitions;
  }

  /**
   * Perform batch scan on a set of files
   */
  private async performBatchScan(files: FileInfo[]): Promise<number> {
    let scanned = 0;
    const batchSize = Math.min(this.config.maxFilesPerScan, files.length);

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      // Process batch with timeout
      try {
        const batchPromises = batch.map(file => this.scanSingleFileWithTimeout(file));
        await Promise.allSettled(batchPromises);
        scanned += batch.length;
      } catch (error) {
        console.warn(`⚠️ Batch scan error:`, error);
        // Continue with next batch
      }

      // Check memory pressure
      if (this.isMemoryPressureHigh()) {
        console.log('⚠️ Memory pressure during batch scan, performing cleanup');
        await this.performMemoryCleanup();
      }
    }

    return scanned;
  }

  /**
   * Scan single file with timeout protection
   */
  private async scanSingleFileWithTimeout(file: FileInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Scan timeout for file: ${file.path}`));
      }, this.config.scanTimeoutMs);

      this.scanSingleFile(file)
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Scan a single file (placeholder - integrate with existing scanner)
   */
  private async scanSingleFile(file: FileInfo): Promise<void> {
    // This would integrate with the existing file scanning logic
    // For now, this is a placeholder
    await new Promise(resolve => setTimeout(resolve, 1));
  }

  /**
   * Check if memory pressure is high
   */
  private isMemoryPressureHigh(): boolean {
    const memUsage = process.memoryUsage();
    const percentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    return percentage > this.config.memoryPressureThreshold;
  }

  /**
   * Perform memory cleanup
   */
  private async performMemoryCleanup(): Promise<void> {
    console.log('🧹 Performing memory cleanup...');

    const graph = this.storage.getGraph();

    // Clean up old nodes if memory limit exceeded
    if (graph.nodes.size > this.config.maxNodesInMemory) {
      const nodesToRemove = graph.nodes.size - this.config.maxNodesInMemory;
      console.log(`🧹 Removing ${nodesToRemove} old nodes to free memory`);

      // Remove oldest nodes (simple LRU strategy)
      const sortedNodes = Array.from(graph.nodes.values())
        .sort((a, b) => a.lastUpdated.getTime() - b.lastUpdated.getTime())
        .slice(0, nodesToRemove);

      for (const node of sortedNodes) {
        graph.nodes.delete(node.id);
      }
    }

    // Clean up old edges
    if (graph.edges.size > this.config.maxEdgesInMemory) {
      const edgesToRemove = graph.edges.size - this.config.maxEdgesInMemory;
      console.log(`🧹 Removing ${edgesToRemove} old edges to free memory`);

      const sortedEdges = Array.from(graph.edges.values())
        .sort((a, b) => (a.lastUpdated || a.created || new Date(0)).getTime() -
                        (b.lastUpdated || b.created || new Date(0)).getTime())
        .slice(0, edgesToRemove);

      for (const edge of sortedEdges) {
        graph.edges.delete(edge.id);
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    this.lastCleanup = new Date();
  }

  /**
   * Update resource usage statistics
   */
  private updateResourceUsage(): void {
    const memUsage = process.memoryUsage();
    const graph = this.storage.getGraph();

    this.resourceUsage = {
      memoryUsage: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      nodeCount: graph.nodes.size,
      edgeCount: graph.edges.size,
      cacheUsage: {
        size: 0, // This would be updated by cache system
        hitRate: 0,
        evictions: 0
      },
      performanceMetrics: {
        avgScanTime: 0, // This would be tracked over time
        avgQueryTime: 0,
        slowOperations: 0
      }
    };
  }

  /**
   * Start background resource monitoring
   */
  private startResourceMonitoring(): void {
    setInterval(() => {
      this.updateResourceUsage();

      // Perform cleanup if memory pressure is high
      if (this.isMemoryPressureHigh() &&
          Date.now() - this.lastCleanup.getTime() > 60000) { // At least 1 minute between cleanups
        this.performMemoryCleanup();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Apply configuration updates
   */
  applyConfiguration(config: Partial<ScalabilityConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('⚙️ Applied scalability configuration:', Object.keys(config));
  }

  /**
   * Get current resource usage
   */
  getResourceUsage(): ResourceUsage {
    this.updateResourceUsage();
    return { ...this.resourceUsage };
  }

  /**
   * Get current configuration
   */
  getConfiguration(): ScalabilityConfig {
    return { ...this.config };
  }

  /**
   * Estimate file count quickly (fallback method)
   */
  private async estimateFileCount(): Promise<number> {
    try {
      // Quick estimation by checking a sample of directories
      let estimate = 0;
      const sampleDirs = await this.getSampleDirectories();

      for (const dir of sampleDirs) {
        const files = await fs.readdir(join(this.projectRoot, dir));
        estimate += files.length * 10; // Rough multiplier
      }

      return Math.max(estimate, 100); // Minimum estimate
    } catch {
      return 1000; // Default fallback
    }
  }

  /**
   * Get sample directories for estimation
   */
  private async getSampleDirectories(): Promise<string[]> {
    const commonDirs = ['src', 'lib', 'components', 'utils', 'services'];
    const existingDirs: string[] = [];

    for (const dir of commonDirs) {
      try {
        await fs.access(join(this.projectRoot, dir));
        existingDirs.push(dir);
      } catch {
        // Directory doesn't exist, skip
      }
    }

    return existingDirs.length > 0 ? existingDirs : ['.']; // Root as fallback
  }
}