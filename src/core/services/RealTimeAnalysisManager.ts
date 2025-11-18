/**
 * Real-Time Analysis Manager - Phase 4.3
 *
 * Unified high-level API that integrates all real-time analysis components:
 * - TreeSitterLanguageAnalyzer (Phase 3.3) - Multi-language AST parsing
 * - IncrementalParseManager (Phase 3.4) - Fast re-parsing with caching
 * - FileWatcherService (Phase 4.1) - Real-time file monitoring
 * - IncrementalUpdateManager (Phase 4.2) - Dependency-aware batch updates
 *
 * Provides a single entry point for real-time code intelligence with:
 * - Automatic file watching and incremental parsing
 * - Dependency tracking and cascade updates
 * - Event-driven architecture for easy integration
 * - Production-ready performance and error handling
 */

import { EventEmitter } from 'events';
import { FileWatcherService, type FileChangeEvent } from './FileWatcherService.js';
import { IncrementalUpdateManager, type UpdateEvent, type UpdateStats, type DependencyType } from './IncrementalUpdateManager.js';
import { TreeSitterLanguageAnalyzer } from '../parsers/TreeSitterLanguageAnalyzer.js';
import { CodeStructure } from '../base/BaseLanguageAnalyzer.js';

/**
 * Configuration for real-time analysis
 */
export interface RealTimeAnalysisConfig {
  // Watch paths
  paths: string | string[];

  // File watching
  ignored?: string | string[];
  ignoreInitial?: boolean;
  debounceDelay?: number;

  // Batch processing
  batchDelay?: number;
  maxBatchSize?: number;

  // Dependency tracking
  enableDependencyTracking?: boolean;
  enableCascadeUpdates?: boolean;
  maxCascadeDepth?: number;

  // Incremental parsing
  enableIncrementalParsing?: boolean;
  maxCacheSize?: number;

  // Analysis options
  analyzeOnAdd?: boolean;
  analyzeOnChange?: boolean;
  analyzeOnDelete?: boolean;
}

/**
 * Combined analysis event
 */
export interface AnalysisEvent {
  filePath: string;
  changeType: 'added' | 'changed' | 'deleted';
  analysis?: CodeStructure;
  dependencies: string[];
  cascadeDepth: number;
  parseTime: number;
  wasIncremental: boolean;
  timestamp: Date;
}

/**
 * Dependency information
 */
export interface DependencyInfo {
  source: string;
  target: string;
  type: DependencyType;
  symbol?: string;
}

/**
 * Combined statistics
 */
export interface RealTimeStats {
  // File watching
  filesWatched: number;
  totalChanges: number;

  // Updates
  totalUpdates: number;
  batchedUpdates: number;
  cascadeUpdates: number;
  averageBatchSize: number;

  // Performance
  averageParseTime: number;
  averageUpdateTime: number;
  cacheHitRate: number;

  // Dependencies
  dependencyCount: number;
  averageDependenciesPerFile: number;
}

/**
 * Real-Time Analysis Manager
 *
 * High-level unified API for real-time code analysis:
 * - Monitors file changes automatically
 * - Incrementally re-parses changed files
 * - Tracks dependencies between files
 * - Batches related updates
 * - Cascades updates to dependent files
 *
 * Example usage:
 * ```typescript
 * const manager = new RealTimeAnalysisManager({
 *   paths: 'src',
 *   enableDependencyTracking: true,
 *   enableCascadeUpdates: true
 * });
 *
 * manager.on('analysis', (event) => {
 *   console.log(`Analyzed ${event.filePath} in ${event.parseTime}ms`);
 *   if (event.analysis) {
 *     // Use the analysis results
 *   }
 * });
 *
 * await manager.start();
 * ```
 */
export class RealTimeAnalysisManager extends EventEmitter {
  private fileWatcher: FileWatcherService;
  private updateManager: IncrementalUpdateManager;
  private analyzer: TreeSitterLanguageAnalyzer;
  private config: Required<RealTimeAnalysisConfig>;
  private isRunning = false;

  constructor(config: RealTimeAnalysisConfig) {
    super();

    // Normalize config with defaults
    this.config = {
      paths: config.paths,
      ignored: config.ignored ?? ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
      ignoreInitial: config.ignoreInitial ?? false,
      debounceDelay: config.debounceDelay ?? 300,
      batchDelay: config.batchDelay ?? 500,
      maxBatchSize: config.maxBatchSize ?? 50,
      enableDependencyTracking: config.enableDependencyTracking ?? true,
      enableCascadeUpdates: config.enableCascadeUpdates ?? true,
      maxCascadeDepth: config.maxCascadeDepth ?? 3,
      enableIncrementalParsing: config.enableIncrementalParsing ?? true,
      maxCacheSize: config.maxCacheSize ?? 200,
      analyzeOnAdd: config.analyzeOnAdd ?? true,
      analyzeOnChange: config.analyzeOnChange ?? true,
      analyzeOnDelete: config.analyzeOnDelete ?? false
    };

    // Create shared analyzer instance
    this.analyzer = new TreeSitterLanguageAnalyzer(undefined, {
      enableIncrementalParsing: this.config.enableIncrementalParsing,
      maxCacheSize: this.config.maxCacheSize
    });

    // Create update manager
    this.updateManager = new IncrementalUpdateManager({
      batchDelay: this.config.batchDelay,
      maxBatchSize: this.config.maxBatchSize,
      enableDependencyTracking: this.config.enableDependencyTracking,
      enableCascadeUpdates: this.config.enableCascadeUpdates,
      maxCascadeDepth: this.config.maxCascadeDepth
    });

    // Create file watcher
    this.fileWatcher = new FileWatcherService({
      paths: this.config.paths,
      ignored: this.config.ignored,
      ignoreInitial: this.config.ignoreInitial,
      debounceDelay: this.config.debounceDelay,
      analyzeOnAdd: this.config.analyzeOnAdd,
      analyzeOnChange: this.config.analyzeOnChange,
      enableIncrementalParsing: this.config.enableIncrementalParsing,
      maxCacheSize: this.config.maxCacheSize
    });

    // Wire up event handlers
    this.setupEventHandlers();
  }

  /**
   * Set up event handlers to connect all components
   */
  private setupEventHandlers(): void {
    // Attach update manager to file watcher
    this.updateManager.attachFileWatcher(this.fileWatcher);

    // Forward file watcher events
    this.fileWatcher.on('fileChange', (event: FileChangeEvent) => {
      this.emit('fileChange', event);
    });

    this.fileWatcher.on('error', (error: any) => {
      this.emit('error', error);
    });

    // Forward update manager events with enhanced information
    this.updateManager.on('fileUpdate', (event: UpdateEvent) => {
      const analysisEvent: AnalysisEvent = {
        filePath: event.filePath,
        changeType: event.cascadeDepth === 0 ? 'changed' : 'changed', // Cascade updates are also 'changed'
        analysis: event.analysis,
        dependencies: event.dependencies,
        cascadeDepth: event.cascadeDepth,
        parseTime: event.parseTime,
        wasIncremental: event.wasIncremental,
        timestamp: new Date()
      };

      this.emit('analysis', analysisEvent);
    });

    this.updateManager.on('batchComplete', (data: any) => {
      this.emit('batchComplete', {
        files: data.files,
        count: data.files.length,
        timestamp: new Date()
      });
    });

    this.updateManager.on('updateError', (error: any) => {
      this.emit('analysisError', error);
    });
  }

  /**
   * Start real-time analysis
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('RealTimeAnalysisManager is already running');
    }

    await this.fileWatcher.start();
    this.isRunning = true;

    this.emit('started', {
      paths: this.config.paths,
      timestamp: new Date()
    });
  }

  /**
   * Stop real-time analysis
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    await this.fileWatcher.stop();
    await this.updateManager.stop();
    this.isRunning = false;

    this.emit('stopped', {
      timestamp: new Date()
    });
  }

  /**
   * Manually trigger analysis for a file
   */
  async analyzeFile(filePath: string): Promise<CodeStructure | null> {
    return await this.analyzer.analyzeFile(filePath);
  }

  /**
   * Invalidate a file and trigger re-analysis
   */
  async invalidateFile(filePath: string): Promise<void> {
    await this.updateManager.invalidate(filePath);
  }

  /**
   * Get files that depend on the given file
   */
  getDependents(filePath: string): Set<string> {
    return this.updateManager.getReverseDependencies(filePath);
  }

  /**
   * Get files that this file depends on
   */
  getDependencies(filePath: string): DependencyInfo[] {
    const deps = this.updateManager.getDependencies(filePath);
    return Array.from(deps).map(d => ({
      source: d.source,
      target: d.target,
      type: d.type,
      symbol: d.symbol
    }));
  }

  /**
   * Get all files affected by changes to the given file
   */
  getAffectedFiles(filePath: string, maxDepth?: number): Set<string> {
    return this.updateManager.getAffectedFiles(filePath, maxDepth);
  }

  /**
   * Get complete dependency graph
   */
  getDependencyGraph(): Map<string, string[]> {
    return this.updateManager.getDependencyGraph();
  }

  /**
   * Get combined statistics
   */
  getStats(): RealTimeStats {
    const watcherStats = this.fileWatcher.getStats();
    const updateStats = this.updateManager.getStats();
    const incrementalStats = this.analyzer.getIncrementalStats();

    return {
      filesWatched: watcherStats.filesWatched,
      totalChanges: watcherStats.totalEvents,
      totalUpdates: updateStats.totalUpdates,
      batchedUpdates: updateStats.batchedUpdates,
      cascadeUpdates: updateStats.cascadeUpdates,
      averageBatchSize: updateStats.averageBatchSize,
      averageParseTime: updateStats.averageParseTime,
      averageUpdateTime: watcherStats.averageAnalysisTime,
      cacheHitRate: incrementalStats.cacheSize > 0
        ? incrementalStats.incrementalParses / (incrementalStats.fullParses + incrementalStats.incrementalParses)
        : 0,
      dependencyCount: updateStats.dependencyCount,
      averageDependenciesPerFile: updateStats.averageDependenciesPerFile
    };
  }

  /**
   * Reset all statistics
   */
  resetStats(): void {
    this.fileWatcher.resetStats();
    this.updateManager.resetStats();
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.analyzer.clearAllCache();
    this.updateManager.clearDependencies();
  }

  /**
   * Check if manager is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<RealTimeAnalysisConfig>> {
    return { ...this.config };
  }
}
