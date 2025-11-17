/**
 * Incremental Update Manager - Phase 4.2
 *
 * Provides intelligent dependency-aware updates and batch processing:
 * - Tracks dependencies between files (imports, references)
 * - Batches related file updates
 * - Smart invalidation strategies (cascade updates)
 * - Dependency-aware re-analysis
 * - Multi-file refactoring support
 *
 * Works on top of:
 * - IncrementalParseManager (Phase 3.4) - for fast re-parsing
 * - FileWatcherService (Phase 4.1) - for real-time monitoring
 */

import { EventEmitter } from 'events';
import { TreeSitterLanguageAnalyzer } from '../parsers/TreeSitterLanguageAnalyzer.js';
import { CodeStructure } from '../base/BaseLanguageAnalyzer.js';
import { FileWatcherService } from './FileWatcherService.js';
import { readFile } from 'fs/promises';
import { dirname, relative, resolve, join } from 'path';

/**
 * Dependency type
 */
export enum DependencyType {
  IMPORT = 'import',           // Direct import/require
  REFERENCE = 'reference',     // Function/class reference
  INHERITANCE = 'inheritance', // Extends/implements
  TYPE = 'type'                // Type dependency (TypeScript)
}

/**
 * Dependency relationship between files
 */
export interface FileDependency {
  source: string;      // File that depends on target
  target: string;      // File being depended upon
  type: DependencyType;
  symbol?: string;     // Specific symbol being used
  location?: {         // Location in source file
    line: number;
    column: number;
  };
}

/**
 * Batch update configuration
 */
export interface BatchUpdateConfig {
  batchDelay?: number;           // Delay before processing batch (ms)
  maxBatchSize?: number;         // Max files in one batch
  enableDependencyTracking?: boolean;
  enableCascadeUpdates?: boolean; // Update dependent files
  maxCascadeDepth?: number;      // Max depth for cascade updates
}

/**
 * Update event
 */
export interface UpdateEvent {
  filePath: string;
  analysis?: CodeStructure;
  dependencies: string[];  // Files that were also updated
  cascadeDepth: number;    // Depth in dependency chain
  parseTime: number;
  wasIncremental: boolean;
}

/**
 * Update statistics
 */
export interface UpdateStats {
  totalUpdates: number;
  batchedUpdates: number;
  cascadeUpdates: number;
  averageBatchSize: number;
  averageParseTime: number;
  dependencyCount: number;
  averageDependenciesPerFile: number;
}

/**
 * Incremental Update Manager
 *
 * Manages intelligent file updates with dependency tracking:
 * - Batch related updates together
 * - Cascade updates to dependent files
 * - Track import/reference dependencies
 * - Optimize re-analysis with dependency awareness
 */
export class IncrementalUpdateManager extends EventEmitter {
  private analyzer: TreeSitterLanguageAnalyzer;
  private fileWatcher?: FileWatcherService;
  private config: Required<BatchUpdateConfig>;

  // Dependency tracking
  private dependencies: Map<string, Set<FileDependency>> = new Map();
  private reverseDependencies: Map<string, Set<string>> = new Map();

  // Batch processing
  private pendingUpdates: Set<string> = new Set();
  private batchTimer?: NodeJS.Timeout;
  private processingBatch = false;

  // Statistics
  private stats = {
    totalUpdates: 0,
    batchedUpdates: 0,
    cascadeUpdates: 0,
    totalBatchSize: 0,
    totalParseTime: 0,
    batchCount: 0
  };

  constructor(config: BatchUpdateConfig = {}) {
    super();

    this.config = {
      batchDelay: config.batchDelay ?? 500,
      maxBatchSize: config.maxBatchSize ?? 50,
      enableDependencyTracking: config.enableDependencyTracking ?? true,
      enableCascadeUpdates: config.enableCascadeUpdates ?? true,
      maxCascadeDepth: config.maxCascadeDepth ?? 3
    };

    // Create universal analyzer with incremental parsing
    this.analyzer = new TreeSitterLanguageAnalyzer(undefined, {
      enableIncrementalParsing: true,
      maxCacheSize: 200
    });
  }

  /**
   * Integrate with file watcher
   */
  attachFileWatcher(watcher: FileWatcherService): void {
    this.fileWatcher = watcher;

    // Listen for file changes
    this.fileWatcher.on('fileChange', async (event) => {
      if (event.type === 'deleted') {
        this.removeFile(event.filePath);
      } else if (event.analysis) {
        // Update dependencies from analysis
        await this.updateDependencies(event.filePath, event.analysis);

        // Queue cascade updates if needed
        if (this.config.enableCascadeUpdates) {
          this.queueCascadeUpdates(event.filePath);
        }
      }
    });
  }

  /**
   * Queue file for update
   */
  queueUpdate(filePath: string): void {
    this.pendingUpdates.add(filePath);

    // Clear existing timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Set new timer
    this.batchTimer = setTimeout(async () => {
      await this.processBatch();
    }, this.config.batchDelay);
  }

  /**
   * Process batch of pending updates
   */
  private async processBatch(): Promise<void> {
    if (this.processingBatch || this.pendingUpdates.size === 0) {
      return;
    }

    this.processingBatch = true;
    const updates = Array.from(this.pendingUpdates);
    this.pendingUpdates.clear();

    try {
      // Limit batch size
      const batch = updates.slice(0, this.config.maxBatchSize);

      // Process each file
      const results = await Promise.all(
        batch.map(filePath => this.updateFile(filePath, 0))
      );

      // Update statistics
      this.stats.batchCount++;
      this.stats.batchedUpdates += batch.length;
      this.stats.totalBatchSize += batch.length;

      // Emit batch complete event
      this.emit('batchComplete', {
        files: batch,
        results: results.filter(r => r !== null)
      });

      // Queue remaining updates if batch was limited
      if (updates.length > this.config.maxBatchSize) {
        updates.slice(this.config.maxBatchSize).forEach(file => {
          this.queueUpdate(file);
        });
      }
    } finally {
      this.processingBatch = false;
    }
  }

  /**
   * Update a single file and track dependencies
   */
  private async updateFile(
    filePath: string,
    cascadeDepth: number
  ): Promise<UpdateEvent | null> {
    try {
      const startTime = Date.now();

      // Analyze file
      const analysis = await this.analyzer.analyzeFile(filePath);
      const parseTime = Date.now() - startTime;

      if (!analysis) {
        return null;
      }

      // Update dependencies
      await this.updateDependencies(filePath, analysis);

      // Get affected dependencies
      const dependencies = this.getReverseDependencies(filePath);

      // Update statistics
      this.stats.totalUpdates++;
      this.stats.totalParseTime += parseTime;

      if (cascadeDepth > 0) {
        this.stats.cascadeUpdates++;
      }

      const event: UpdateEvent = {
        filePath,
        analysis,
        dependencies: Array.from(dependencies),
        cascadeDepth,
        parseTime,
        wasIncremental: true // Assuming incremental parsing is enabled
      };

      this.emit('fileUpdate', event);
      return event;
    } catch (error) {
      this.emit('updateError', { filePath, error, cascadeDepth });
      return null;
    }
  }

  /**
   * Queue cascade updates for dependent files
   */
  private queueCascadeUpdates(filePath: string, depth: number = 0): void {
    if (depth >= this.config.maxCascadeDepth) {
      return;
    }

    const dependents = this.reverseDependencies.get(filePath);
    if (!dependents || dependents.size === 0) {
      return;
    }

    // Queue each dependent for update
    for (const dependent of dependents) {
      this.queueUpdate(dependent);

      // Recursively queue dependencies of dependents
      this.queueCascadeUpdates(dependent, depth + 1);
    }
  }

  /**
   * Update dependencies from analysis
   */
  private async updateDependencies(
    filePath: string,
    analysis: CodeStructure
  ): Promise<void> {
    if (!this.config.enableDependencyTracking) {
      return;
    }

    // Clear existing dependencies for this file
    const oldDeps = this.dependencies.get(filePath);
    if (oldDeps) {
      for (const dep of oldDeps) {
        const reverseSet = this.reverseDependencies.get(dep.target);
        reverseSet?.delete(filePath);
      }
    }

    // Extract new dependencies
    const newDeps = new Set<FileDependency>();

    // Extract import dependencies
    if (analysis.imports) {
      for (const imp of analysis.imports) {
        const targetPath = this.resolveImportPath(filePath, imp.module);
        if (targetPath) {
          newDeps.add({
            source: filePath,
            target: targetPath,
            type: DependencyType.IMPORT,
            symbol: imp.module
          });
        }
      }
    }

    // Extract class inheritance dependencies
    if (analysis.classes) {
      for (const cls of analysis.classes) {
        // Superclass dependency
        if (cls.superClass) {
          const targetPath = await this.resolveTypeReference(filePath, cls.superClass);
          if (targetPath) {
            newDeps.add({
              source: filePath,
              target: targetPath,
              type: DependencyType.INHERITANCE,
              symbol: cls.superClass
            });
          }
        }

        // Interface implementation dependencies
        if (cls.implements) {
          for (const impl of cls.implements) {
            const targetPath = await this.resolveTypeReference(filePath, impl);
            if (targetPath) {
              newDeps.add({
                source: filePath,
                target: targetPath,
                type: DependencyType.TYPE,
                symbol: impl
              });
            }
          }
        }
      }
    }

    // Update dependency maps
    this.dependencies.set(filePath, newDeps);

    for (const dep of newDeps) {
      let reverseSet = this.reverseDependencies.get(dep.target);
      if (!reverseSet) {
        reverseSet = new Set();
        this.reverseDependencies.set(dep.target, reverseSet);
      }
      reverseSet.add(filePath);
    }
  }

  /**
   * Resolve import path to absolute file path
   */
  private resolveImportPath(sourceFile: string, importPath: string): string | null {
    try {
      // Handle relative imports
      if (importPath.startsWith('.')) {
        const sourceDir = dirname(sourceFile);
        const resolved = resolve(sourceDir, importPath);

        // Try common extensions
        const extensions = ['.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs'];
        for (const ext of extensions) {
          const withExt = resolved.endsWith(ext) ? resolved : resolved + ext;
          // Return the path (actual file existence check would be done elsewhere)
          return withExt;
        }

        return resolved;
      }

      // Handle absolute imports (node_modules, etc.)
      // For now, we skip external dependencies
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Resolve type reference to file path
   */
  private async resolveTypeReference(
    sourceFile: string,
    typeName: string
  ): Promise<string | null> {
    // This is a simplified implementation
    // A full implementation would need to:
    // 1. Check imports for type
    // 2. Search project for type definition
    // 3. Handle module resolution

    // For now, return null (type resolution is complex)
    return null;
  }

  /**
   * Get files that depend on the given file
   */
  getReverseDependencies(filePath: string): Set<string> {
    return this.reverseDependencies.get(filePath) || new Set();
  }

  /**
   * Get files that this file depends on
   */
  getDependencies(filePath: string): Set<FileDependency> {
    return this.dependencies.get(filePath) || new Set();
  }

  /**
   * Get all files affected by a change to the given file
   */
  getAffectedFiles(filePath: string, maxDepth: number = 3): Set<string> {
    const affected = new Set<string>();
    const visited = new Set<string>();

    const traverse = (file: string, depth: number) => {
      if (depth > maxDepth || visited.has(file)) {
        return;
      }

      visited.add(file);
      affected.add(file);

      const dependents = this.reverseDependencies.get(file);
      if (dependents) {
        for (const dependent of dependents) {
          traverse(dependent, depth + 1);
        }
      }
    };

    traverse(filePath, 0);
    affected.delete(filePath); // Don't include the file itself

    return affected;
  }

  /**
   * Remove file from dependency tracking
   */
  removeFile(filePath: string): void {
    // Remove from dependencies
    const deps = this.dependencies.get(filePath);
    if (deps) {
      for (const dep of deps) {
        const reverseSet = this.reverseDependencies.get(dep.target);
        reverseSet?.delete(filePath);
      }
      this.dependencies.delete(filePath);
    }

    // Remove from reverse dependencies
    this.reverseDependencies.delete(filePath);

    // Remove from pending updates
    this.pendingUpdates.delete(filePath);

    // Clear from analyzer cache
    this.analyzer.clearCache(filePath);
  }

  /**
   * Invalidate file and all dependent files
   */
  async invalidate(filePath: string): Promise<void> {
    // Get affected files
    const affected = this.getAffectedFiles(filePath);

    // Queue update for the file and all affected files
    this.queueUpdate(filePath);
    for (const file of affected) {
      this.queueUpdate(file);
    }
  }

  /**
   * Get dependency graph as adjacency list
   */
  getDependencyGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const [source, deps] of this.dependencies) {
      const targets = Array.from(deps).map(d => d.target);
      graph.set(source, targets);
    }

    return graph;
  }

  /**
   * Get statistics
   */
  getStats(): UpdateStats {
    const dependencyCount = Array.from(this.dependencies.values())
      .reduce((sum, deps) => sum + deps.size, 0);

    const fileCount = this.dependencies.size || 1;

    return {
      totalUpdates: this.stats.totalUpdates,
      batchedUpdates: this.stats.batchedUpdates,
      cascadeUpdates: this.stats.cascadeUpdates,
      averageBatchSize: this.stats.batchCount > 0
        ? this.stats.totalBatchSize / this.stats.batchCount
        : 0,
      averageParseTime: this.stats.totalUpdates > 0
        ? this.stats.totalParseTime / this.stats.totalUpdates
        : 0,
      dependencyCount,
      averageDependenciesPerFile: dependencyCount / fileCount
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalUpdates: 0,
      batchedUpdates: 0,
      cascadeUpdates: 0,
      totalBatchSize: 0,
      totalParseTime: 0,
      batchCount: 0
    };
  }

  /**
   * Clear all dependency tracking
   */
  clearDependencies(): void {
    this.dependencies.clear();
    this.reverseDependencies.clear();
    this.pendingUpdates.clear();

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
  }

  /**
   * Stop the update manager
   */
  async stop(): Promise<void> {
    // Process any pending updates
    if (this.pendingUpdates.size > 0) {
      await this.processBatch();
    }

    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    // Remove all listeners
    this.removeAllListeners();
  }
}
