/**
 * FileWatcherService - Real-time file watching with incremental analysis
 *
 * Monitors files and directories for changes, triggering incremental analysis
 * using Tree-sitter. Provides ultra-fast real-time code analysis.
 *
 * Features:
 * - Robust file watching using chokidar
 * - Debouncing to avoid excessive re-parsing
 * - Automatic incremental parsing on changes
 * - Configurable ignore patterns
 * - Event callbacks for custom handling
 * - Memory-efficient with LRU caching
 */

import chokidar, { FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import { TreeSitterLanguageAnalyzer } from '../parsers/TreeSitterLanguageAnalyzer.js';
import { CodeStructure } from '../../types/index.js';
import { readFile } from 'fs/promises';

/**
 * File change event types
 */
export enum FileChangeType {
  ADDED = 'added',
  CHANGED = 'changed',
  DELETED = 'deleted'
}

/**
 * File change event
 */
export interface FileChangeEvent {
  type: FileChangeType;
  filePath: string;
  timestamp: Date;
  analysis?: CodeStructure;
  parseTime?: number;
  wasIncremental?: boolean;
}

/**
 * File watcher configuration
 */
export interface FileWatcherConfig {
  /** Paths to watch (files or directories) */
  paths: string | string[];

  /** Glob patterns to ignore */
  ignored?: string | RegExp | (string | RegExp)[];

  /** Debounce delay in milliseconds (default: 300) */
  debounceDelay?: number;

  /** Whether to analyze files on add (default: true) */
  analyzeOnAdd?: boolean;

  /** Whether to analyze files on change (default: true) */
  analyzeOnChange?: boolean;

  /** Enable incremental parsing (default: true) */
  enableIncrementalParsing?: boolean;

  /** Maximum cache size for parsed files (default: 100) */
  maxCacheSize?: number;

  /** Persistent watch (default: true) */
  persistent?: boolean;

  /** Follow symbolic links (default: false) */
  followSymlinks?: boolean;

  /** Use polling instead of native file system events (default: false) */
  usePolling?: boolean;

  /** Polling interval in milliseconds (default: 100) */
  pollingInterval?: number;
}

/**
 * File watcher statistics
 */
export interface FileWatcherStats {
  filesWatched: number;
  totalEvents: number;
  addedEvents: number;
  changedEvents: number;
  deletedEvents: number;
  totalAnalyses: number;
  averageAnalysisTime: number;
  incrementalAnalyses: number;
  fullAnalyses: number;
  uptime: number;
}

/**
 * Real-time file watcher service with incremental analysis
 */
export class FileWatcherService extends EventEmitter {
  private watcher?: FSWatcher;
  private analyzer: TreeSitterLanguageAnalyzer;
  private config: Required<FileWatcherConfig>;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private watchedFiles: Set<string> = new Set();
  private startTime: Date;

  // Statistics
  private stats = {
    totalEvents: 0,
    addedEvents: 0,
    changedEvents: 0,
    deletedEvents: 0,
    totalAnalyses: 0,
    totalAnalysisTime: 0,
    incrementalAnalyses: 0,
    fullAnalyses: 0
  };

  constructor(config: FileWatcherConfig) {
    super();

    // Set default config
    this.config = {
      paths: config.paths,
      ignored: config.ignored || [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.mindmap-cache/**',
        '**/coverage/**'
      ],
      debounceDelay: config.debounceDelay ?? 300,
      analyzeOnAdd: config.analyzeOnAdd ?? true,
      analyzeOnChange: config.analyzeOnChange ?? true,
      enableIncrementalParsing: config.enableIncrementalParsing ?? true,
      maxCacheSize: config.maxCacheSize ?? 100,
      persistent: config.persistent ?? true,
      followSymlinks: config.followSymlinks ?? false,
      usePolling: config.usePolling ?? false,
      pollingInterval: config.pollingInterval ?? 100
    };

    // Create analyzer with incremental parsing
    this.analyzer = TreeSitterLanguageAnalyzer.universal({
      enableIncrementalParsing: this.config.enableIncrementalParsing,
      maxCacheSize: this.config.maxCacheSize
    });

    this.startTime = new Date();
  }

  /**
   * Start watching files
   */
  async start(): Promise<void> {
    if (this.watcher) {
      throw new Error('File watcher is already running');
    }

    this.watcher = chokidar.watch(this.config.paths, {
      ignored: this.config.ignored,
      persistent: this.config.persistent,
      followSymlinks: this.config.followSymlinks,
      usePolling: this.config.usePolling,
      interval: this.config.pollingInterval,
      ignoreInitial: false,  // Emit add events for initial files
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
      }
    });

    // Set up event handlers
    this.watcher
      .on('add', (filePath) => this.handleFileAdded(filePath))
      .on('change', (filePath) => this.handleFileChanged(filePath))
      .on('unlink', (filePath) => this.handleFileDeleted(filePath))
      .on('error', (error) => this.handleError(error))
      .on('ready', () => this.handleReady());

    // Wait for initial scan to complete
    await new Promise<void>((resolve) => {
      this.watcher!.once('ready', resolve);
    });
  }

  /**
   * Stop watching files
   */
  async stop(): Promise<void> {
    if (!this.watcher) {
      return;
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    await this.watcher.close();
    this.watcher = undefined;
    this.watchedFiles.clear();
  }

  /**
   * Handle file added event
   */
  private handleFileAdded(filePath: string): void {
    this.stats.totalEvents++;
    this.stats.addedEvents++;
    this.watchedFiles.add(filePath);

    if (this.config.analyzeOnAdd && this.analyzer.canAnalyze(filePath)) {
      this.debounceAnalysis(filePath, FileChangeType.ADDED);
    } else {
      this.emitEvent({
        type: FileChangeType.ADDED,
        filePath,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle file changed event
   */
  private handleFileChanged(filePath: string): void {
    this.stats.totalEvents++;
    this.stats.changedEvents++;

    if (this.config.analyzeOnChange && this.analyzer.canAnalyze(filePath)) {
      this.debounceAnalysis(filePath, FileChangeType.CHANGED);
    } else {
      this.emitEvent({
        type: FileChangeType.CHANGED,
        filePath,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle file deleted event
   */
  private handleFileDeleted(filePath: string): void {
    this.stats.totalEvents++;
    this.stats.deletedEvents++;
    this.watchedFiles.delete(filePath);

    // Clear cache for deleted file
    this.analyzer.clearCache(filePath);

    this.emitEvent({
      type: FileChangeType.DELETED,
      filePath,
      timestamp: new Date()
    });
  }

  /**
   * Handle watcher ready event
   */
  private handleReady(): void {
    this.emit('ready', {
      filesWatched: this.watchedFiles.size,
      timestamp: new Date()
    });
  }

  /**
   * Handle watcher error
   */
  private handleError(error: Error): void {
    this.emit('error', error);
  }

  /**
   * Debounce file analysis to avoid excessive re-parsing
   */
  private debounceAnalysis(filePath: string, changeType: FileChangeType): void {
    // Clear existing timer for this file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(filePath);
      await this.analyzeFile(filePath, changeType);
    }, this.config.debounceDelay);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Analyze a file
   */
  private async analyzeFile(filePath: string, changeType: FileChangeType): Promise<void> {
    try {
      const startTime = Date.now();

      // Get incremental stats before analysis
      const statsBefore = this.analyzer.getIncrementalStats();
      const incrementalCountBefore = statsBefore?.incrementalParses || 0;

      // Analyze the file (uses incremental parsing if enabled)
      const analysis = await this.analyzer.analyzeFile(filePath);

      // Get stats after analysis
      const statsAfter = this.analyzer.getIncrementalStats();
      const incrementalCountAfter = statsAfter?.incrementalParses || 0;

      const parseTime = Date.now() - startTime;
      const wasIncremental = incrementalCountAfter > incrementalCountBefore;

      // Update statistics
      this.stats.totalAnalyses++;
      this.stats.totalAnalysisTime += parseTime;
      if (wasIncremental) {
        this.stats.incrementalAnalyses++;
      } else {
        this.stats.fullAnalyses++;
      }

      // Emit event with analysis result
      this.emitEvent({
        type: changeType,
        filePath,
        timestamp: new Date(),
        analysis: analysis || undefined,
        parseTime,
        wasIncremental
      });
    } catch (error) {
      this.emit('analysisError', {
        filePath,
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: new Date()
      });
    }
  }

  /**
   * Emit file change event
   */
  private emitEvent(event: FileChangeEvent): void {
    this.emit('fileChange', event);
    this.emit(event.type, event);
  }

  /**
   * Get watcher statistics
   */
  getStats(): FileWatcherStats {
    const uptime = Date.now() - this.startTime.getTime();
    const avgAnalysisTime =
      this.stats.totalAnalyses > 0
        ? this.stats.totalAnalysisTime / this.stats.totalAnalyses
        : 0;

    return {
      filesWatched: this.watchedFiles.size,
      totalEvents: this.stats.totalEvents,
      addedEvents: this.stats.addedEvents,
      changedEvents: this.stats.changedEvents,
      deletedEvents: this.stats.deletedEvents,
      totalAnalyses: this.stats.totalAnalyses,
      averageAnalysisTime: avgAnalysisTime,
      incrementalAnalyses: this.stats.incrementalAnalyses,
      fullAnalyses: this.stats.fullAnalyses,
      uptime
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalEvents: 0,
      addedEvents: 0,
      changedEvents: 0,
      deletedEvents: 0,
      totalAnalyses: 0,
      totalAnalysisTime: 0,
      incrementalAnalyses: 0,
      fullAnalyses: 0
    };
    this.startTime = new Date();
  }

  /**
   * Get list of watched files
   */
  getWatchedFiles(): string[] {
    return Array.from(this.watchedFiles);
  }

  /**
   * Check if watcher is running
   */
  isRunning(): boolean {
    return this.watcher !== undefined;
  }

  /**
   * Get analyzer instance
   */
  getAnalyzer(): TreeSitterLanguageAnalyzer {
    return this.analyzer;
  }

  /**
   * Manually trigger analysis for a file
   */
  async analyzeFileManually(filePath: string): Promise<CodeStructure | null> {
    return await this.analyzer.analyzeFile(filePath);
  }
}
