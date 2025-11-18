# Real-Time Analysis Integration - Phase 4.3

## Overview

The **RealTimeAnalysisManager** provides a unified, high-level API for real-time code intelligence by integrating all real-time analysis components:

- **TreeSitterLanguageAnalyzer** (Phase 3.3) - Multi-language AST parsing
- **IncrementalParseManager** (Phase 3.4) - Fast re-parsing with LRU caching
- **FileWatcherService** (Phase 4.1) - Real-time file monitoring with debouncing
- **IncrementalUpdateManager** (Phase 4.2) - Dependency-aware batch updates

### What Phase 4.3 Delivers

✅ **Unified API**: Single entry point for all real-time analysis features
✅ **Complete Integration**: All components work together seamlessly
✅ **Production Ready**: Error handling, statistics, lifecycle management
✅ **Event-Driven**: Easy integration with IDEs, build tools, servers
✅ **Zero Configuration**: Sensible defaults for immediate use

## Quick Start

### Basic Usage

```typescript
import { RealTimeAnalysisManager } from './services/RealTimeAnalysisManager';

// Create manager
const manager = new RealTimeAnalysisManager({
  paths: 'src',  // Watch the src directory
  enableIncrementalParsing: true,
  enableDependencyTracking: true,
  enableCascadeUpdates: true
});

// Listen for file changes
manager.on('analysis', (event) => {
  console.log(`Analyzed ${event.filePath} in ${event.parseTime}ms`);

  if (event.analysis) {
    console.log(`  Functions: ${event.analysis.functions.length}`);
    console.log(`  Classes: ${event.analysis.classes.length}`);
  }

  if (event.dependencies.length > 0) {
    console.log(`  Affected ${event.dependencies.length} dependent files`);
  }
});

// Start watching
await manager.start();

// Later: stop watching
await manager.stop();
```

### With All Features

```typescript
const manager = new RealTimeAnalysisManager({
  // Watch configuration
  paths: ['src', 'lib'],
  ignored: ['**/*.test.ts', '**/node_modules/**'],
  ignoreInitial: false,  // Analyze existing files on start

  // Performance tuning
  debounceDelay: 300,    // Wait 300ms after file change
  batchDelay: 500,       // Batch updates every 500ms
  maxBatchSize: 50,      // Max 50 files per batch

  // Features
  enableIncrementalParsing: true,
  enableDependencyTracking: true,
  enableCascadeUpdates: true,
  maxCascadeDepth: 3,    // Update dependents up to 3 levels deep

  // Analysis options
  analyzeOnAdd: true,
  analyzeOnChange: true,
  analyzeOnDelete: false
});

// Comprehensive event handling
manager.on('started', () => {
  console.log('Real-time analysis started');
});

manager.on('fileChange', (event) => {
  console.log(`File ${event.type}: ${event.filePath}`);
});

manager.on('analysis', (event) => {
  console.log(`Analysis complete: ${event.filePath}`);
  console.log(`  Type: ${event.changeType}`);
  console.log(`  Parse time: ${event.parseTime}ms`);
  console.log(`  Incremental: ${event.wasIncremental}`);
  console.log(`  Cascade depth: ${event.cascadeDepth}`);
  console.log(`  Affected files: ${event.dependencies.length}`);
});

manager.on('batchComplete', (batch) => {
  console.log(`Batch complete: ${batch.count} files processed`);
});

manager.on('error', (error) => {
  console.error('Watcher error:', error);
});

manager.on('analysisError', (error) => {
  console.error('Analysis error:', error.filePath, error.error);
});

manager.on('stopped', () => {
  console.log('Real-time analysis stopped');
});

await manager.start();
```

## Real-World Use Cases

### 1. IDE Integration - Live Code Intelligence

```typescript
class IDECodeIntelligence {
  private manager: RealTimeAnalysisManager;
  private codeIndex: Map<string, CodeStructure> = new Map();

  async initialize(workspaceRoot: string) {
    this.manager = new RealTimeAnalysisManager({
      paths: workspaceRoot,
      enableIncrementalParsing: true,
      enableDependencyTracking: true,
      debounceDelay: 200  // Fast feedback for IDE
    });

    // Update code index on analysis
    this.manager.on('analysis', (event) => {
      if (event.analysis) {
        this.codeIndex.set(event.filePath, event.analysis);
        this.updateEditor(event.filePath, event.analysis);
      }
    });

    // Show affected files in UI
    this.manager.on('analysis', (event) => {
      if (event.dependencies.length > 0) {
        this.showAffectedFiles(event.filePath, event.dependencies);
      }
    });

    await this.manager.start();
  }

  private updateEditor(filePath: string, analysis: CodeStructure) {
    // Update autocomplete
    this.updateAutoComplete(filePath, analysis);

    // Update outline view
    this.updateOutlineView(filePath, analysis);

    // Update symbol search
    this.updateSymbolIndex(filePath, analysis);
  }

  private showAffectedFiles(changedFile: string, affected: string[]) {
    // Show notification in IDE
    const message = `${changedFile} affects ${affected.length} other files`;
    this.showNotification(message, affected);
  }

  // Get all references to a symbol
  findReferences(filePath: string, symbol: string): string[] {
    const dependents = this.manager.getDependents(filePath);
    const references: string[] = [];

    for (const file of dependents) {
      const analysis = this.codeIndex.get(file);
      if (analysis && this.usesSymbol(analysis, symbol)) {
        references.push(file);
      }
    }

    return references;
  }

  // Validate refactoring impact
  validateRefactoring(filePath: string): {
    safe: boolean;
    affectedFiles: string[];
    warnings: string[];
  } {
    const affected = this.manager.getAffectedFiles(filePath);
    const warnings: string[] = [];

    if (affected.size > 10) {
      warnings.push(`This change will affect ${affected.size} files`);
    }

    return {
      safe: affected.size < 50,
      affectedFiles: Array.from(affected),
      warnings
    };
  }

  async shutdown() {
    await this.manager.stop();
  }
}

// Usage
const ide = new IDECodeIntelligence();
await ide.initialize('/path/to/project');
```

### 2. Build System Integration

```typescript
class IncrementalBuildSystem {
  private manager: RealTimeAnalysisManager;
  private changedFiles = new Set<string>();
  private buildTimer?: NodeJS.Timeout;

  async start(projectRoot: string) {
    this.manager = new RealTimeAnalysisManager({
      paths: [projectRoot + '/src'],
      ignored: ['**/*.test.ts', '**/dist/**'],
      batchDelay: 1000,  // Wait 1s for more changes
      enableCascadeUpdates: true
    });

    // Track original changes (not cascades)
    this.manager.on('analysis', (event) => {
      if (event.cascadeDepth === 0) {
        this.changedFiles.add(event.filePath);
      }
    });

    // Trigger build after batch
    this.manager.on('batchComplete', async () => {
      if (this.changedFiles.size > 0) {
        await this.runIncrementalBuild();
      }
    });

    await this.manager.start();
  }

  private async runIncrementalBuild() {
    const files = Array.from(this.changedFiles);
    console.log(`Building ${files.length} changed files...`);

    // Get all affected files for proper build order
    const allAffected = new Set<string>();
    for (const file of files) {
      const affected = this.manager.getAffectedFiles(file);
      affected.forEach(f => allAffected.add(f));
    }

    console.log(`Total files to rebuild: ${allAffected.size}`);

    // Run build
    try {
      await this.build(files, Array.from(allAffected));
      console.log('Build successful');

      // Clear changed files
      this.changedFiles.clear();
    } catch (error) {
      console.error('Build failed:', error);
    }
  }

  private async build(
    changedFiles: string[],
    affectedFiles: string[]
  ): Promise<void> {
    // 1. Compile changed files
    await this.compile(changedFiles);

    // 2. Re-analyze dependencies
    await this.analyzeDependencies(affectedFiles);

    // 3. Run tests for affected files
    await this.runTestsFor(affectedFiles);

    // 4. Bundle if needed
    if (affectedFiles.some(f => f.includes('entry'))) {
      await this.bundle();
    }
  }
}

// Usage
const buildSystem = new IncrementalBuildSystem();
await buildSystem.start('/path/to/project');
```

### 3. Test Runner Integration

```typescript
class IntelligentTestRunner {
  private manager: RealTimeAnalysisManager;

  async start(projectRoot: string) {
    this.manager = new RealTimeAnalysisManager({
      paths: projectRoot + '/src',
      enableDependencyTracking: true,
      enableCascadeUpdates: true,
      debounceDelay: 500
    });

    // Run tests when files change
    this.manager.on('analysis', async (event) => {
      if (event.filePath.includes('.test.')) {
        return; // Skip test files themselves
      }

      // Find test file
      const testFile = this.findTestFile(event.filePath);

      // Find tests for dependent files
      const dependents = this.manager.getDependents(event.filePath);
      const testFiles = [testFile];

      for (const dep of dependents) {
        const depTest = this.findTestFile(dep);
        if (depTest) {
          testFiles.push(depTest);
        }
      }

      // Run tests
      console.log(`Running ${testFiles.length} test files...`);
      await this.runTests(testFiles.filter(Boolean));
    });

    await this.manager.start();
  }

  private findTestFile(filePath: string): string | null {
    // Convert src/foo/bar.ts -> src/foo/bar.test.ts
    const testFile = filePath.replace(/\.(ts|js)$/, '.test.$1');
    return testFile;
  }

  private async runTests(testFiles: string[]): Promise<void> {
    // Run Vitest on specific files
    const { spawn } = require('child_process');

    return new Promise((resolve, reject) => {
      const vitest = spawn('npx', ['vitest', 'run', ...testFiles]);

      vitest.stdout.on('data', (data: Buffer) => {
        console.log(data.toString());
      });

      vitest.on('close', (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Tests failed with code ${code}`));
        }
      });
    });
  }
}

// Usage
const testRunner = new IntelligentTestRunner();
await testRunner.start('/path/to/project');
```

### 4. LSP Server Integration

```typescript
class CodeIntelligenceLSP {
  private manager: RealTimeAnalysisManager;
  private diagnostics: Map<string, Diagnostic[]> = new Map();

  async initialize(workspaceRoot: string) {
    this.manager = new RealTimeAnalysisManager({
      paths: workspaceRoot,
      enableIncrementalParsing: true,
      enableDependencyTracking: true,
      debounceDelay: 200
    });

    // Update diagnostics on analysis
    this.manager.on('analysis', (event) => {
      if (event.analysis) {
        const diags = this.analyzeDiagnostics(event.filePath, event.analysis);
        this.diagnostics.set(event.filePath, diags);
        this.publishDiagnostics(event.filePath, diags);
      }
    });

    // Clear diagnostics on delete
    this.manager.on('fileChange', (event) => {
      if (event.type === 'deleted') {
        this.diagnostics.delete(event.filePath);
        this.publishDiagnostics(event.filePath, []);
      }
    });

    await this.manager.start();
  }

  // LSP: textDocument/definition
  async provideDefinition(
    filePath: string,
    symbol: string
  ): Promise<Location | null> {
    const deps = this.manager.getDependencies(filePath);

    for (const dep of deps) {
      if (dep.symbol === symbol) {
        return this.createLocation(dep.target, 0, 0);
      }
    }

    return null;
  }

  // LSP: textDocument/references
  async provideReferences(
    filePath: string,
    symbol: string
  ): Promise<Location[]> {
    const dependents = this.manager.getDependents(filePath);
    const references: Location[] = [];

    for (const file of dependents) {
      const analysis = await this.manager.analyzeFile(file);
      if (analysis && this.usesSymbol(analysis, symbol)) {
        references.push(this.createLocation(file, 0, 0));
      }
    }

    return references;
  }

  // LSP: textDocument/hover
  async provideHover(
    filePath: string,
    position: Position
  ): Promise<Hover | null> {
    const analysis = await this.manager.analyzeFile(filePath);
    if (!analysis) return null;

    // Find symbol at position
    const symbol = this.getSymbolAtPosition(analysis, position);
    if (!symbol) return null;

    // Get dependency info
    const deps = this.manager.getDependencies(filePath);
    const depInfo = Array.from(deps).find(d => d.symbol === symbol);

    if (depInfo) {
      return {
        contents: `Imported from ${depInfo.target}`,
        range: this.getSymbolRange(symbol)
      };
    }

    return null;
  }

  private analyzeDiagnostics(
    filePath: string,
    analysis: CodeStructure
  ): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Check for unused imports
    const deps = this.manager.getDependencies(filePath);
    // ... analyze and create diagnostics

    return diagnostics;
  }
}

// Usage
const lsp = new CodeIntelligenceLSP();
await lsp.initialize('/path/to/workspace');
```

### 5. Code Quality Monitor

```typescript
class CodeQualityMonitor {
  private manager: RealTimeAnalysisManager;
  private qualityMetrics: Map<string, QualityMetrics> = new Map();

  async start(projectRoot: string) {
    this.manager = new RealTimeAnalysisManager({
      paths: projectRoot + '/src',
      enableIncrementalParsing: true,
      debounceDelay: 500
    });

    // Analyze quality on changes
    this.manager.on('analysis', (event) => {
      if (event.analysis) {
        const metrics = this.calculateMetrics(event.analysis);
        this.qualityMetrics.set(event.filePath, metrics);

        // Alert on quality issues
        if (metrics.score < 60) {
          this.alertLowQuality(event.filePath, metrics);
        }
      }
    });

    // Generate daily reports
    setInterval(() => {
      this.generateQualityReport();
    }, 24 * 60 * 60 * 1000);

    await this.manager.start();
  }

  private calculateMetrics(analysis: CodeStructure): QualityMetrics {
    return {
      functionCount: analysis.functions.length,
      classCount: analysis.classes.length,
      avgFunctionSize: this.calculateAvgFunctionSize(analysis),
      complexity: this.calculateComplexity(analysis),
      score: this.calculateQualityScore(analysis)
    };
  }

  private calculateComplexity(analysis: CodeStructure): number {
    // Calculate cyclomatic complexity
    let totalComplexity = 0;

    for (const func of analysis.functions) {
      // Simplified complexity calculation
      totalComplexity += this.estimateComplexity(func);
    }

    return analysis.functions.length > 0
      ? totalComplexity / analysis.functions.length
      : 0;
  }

  private alertLowQuality(filePath: string, metrics: QualityMetrics) {
    console.warn(`⚠️  Low quality detected in ${filePath}`);
    console.warn(`   Score: ${metrics.score}/100`);
    console.warn(`   Complexity: ${metrics.complexity}`);
    console.warn(`   Avg function size: ${metrics.avgFunctionSize} lines`);
  }

  private generateQualityReport() {
    console.log('\n📊 Daily Quality Report\n');

    let totalScore = 0;
    let fileCount = 0;
    const lowQualityFiles: string[] = [];

    for (const [file, metrics] of this.qualityMetrics) {
      totalScore += metrics.score;
      fileCount++;

      if (metrics.score < 60) {
        lowQualityFiles.push(file);
      }
    }

    const avgScore = fileCount > 0 ? totalScore / fileCount : 0;

    console.log(`Average Quality Score: ${avgScore.toFixed(1)}/100`);
    console.log(`Files Analyzed: ${fileCount}`);
    console.log(`Low Quality Files: ${lowQualityFiles.length}`);

    if (lowQualityFiles.length > 0) {
      console.log('\n⚠️  Files needing attention:');
      lowQualityFiles.forEach(f => console.log(`   - ${f}`));
    }
  }
}

// Usage
const monitor = new CodeQualityMonitor();
await monitor.start('/path/to/project');
```

## API Reference

### RealTimeAnalysisManager

#### Constructor

```typescript
new RealTimeAnalysisManager(config: RealTimeAnalysisConfig)
```

**Configuration Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `paths` | `string \| string[]` | **required** | Directories to watch |
| `ignored` | `string \| string[]` | `['**/node_modules/**', ...]` | Patterns to ignore |
| `ignoreInitial` | `boolean` | `false` | Skip analyzing existing files |
| `debounceDelay` | `number` | `300` | Delay after file change (ms) |
| `batchDelay` | `number` | `500` | Batch processing delay (ms) |
| `maxBatchSize` | `number` | `50` | Max files per batch |
| `enableIncrementalParsing` | `boolean` | `true` | Use incremental parsing |
| `enableDependencyTracking` | `boolean` | `true` | Track file dependencies |
| `enableCascadeUpdates` | `boolean` | `true` | Update dependent files |
| `maxCascadeDepth` | `number` | `3` | Max cascade depth |
| `maxCacheSize` | `number` | `200` | Parse tree cache size |
| `analyzeOnAdd` | `boolean` | `true` | Analyze new files |
| `analyzeOnChange` | `boolean` | `true` | Analyze changed files |
| `analyzeOnDelete` | `boolean` | `false` | Analyze on delete |

#### Methods

```typescript
// Lifecycle
async start(): Promise<void>
async stop(): Promise<void>
isActive(): boolean

// Analysis
async analyzeFile(filePath: string): Promise<CodeStructure | null>
async invalidateFile(filePath: string): Promise<void>

// Dependencies
getDependents(filePath: string): Set<string>
getDependencies(filePath: string): DependencyInfo[]
getAffectedFiles(filePath: string, maxDepth?: number): Set<string>
getDependencyGraph(): Map<string, string[]>

// Statistics
getStats(): RealTimeStats
resetStats(): void
clearCaches(): void
getConfig(): Readonly<Required<RealTimeAnalysisConfig>>
```

#### Events

```typescript
manager.on('started', () => void)
manager.on('stopped', () => void)
manager.on('fileChange', (event: FileChangeEvent) => void)
manager.on('analysis', (event: AnalysisEvent) => void)
manager.on('batchComplete', (batch: BatchEvent) => void)
manager.on('error', (error: Error) => void)
manager.on('analysisError', (error: AnalysisError) => void)
```

**Event Types:**

```typescript
interface AnalysisEvent {
  filePath: string;
  changeType: 'added' | 'changed' | 'deleted';
  analysis?: CodeStructure;
  dependencies: string[];      // Affected files
  cascadeDepth: number;        // 0 = original change
  parseTime: number;           // Parse duration (ms)
  wasIncremental: boolean;     // Used incremental parsing?
  timestamp: Date;
}

interface RealTimeStats {
  filesWatched: number;
  totalChanges: number;
  totalUpdates: number;
  batchedUpdates: number;
  cascadeUpdates: number;
  averageBatchSize: number;
  averageParseTime: number;
  averageUpdateTime: number;
  cacheHitRate: number;
  dependencyCount: number;
  averageDependenciesPerFile: number;
}
```

## Performance Characteristics

### Typical Performance

```
Single file change:
  Detection: ~50ms (file watcher)
  Debounce: 300ms (configurable)
  Parse: 2-10ms (incremental)
  Dependency update: 2ms
  Cascade check: 1ms
  Total: ~355-365ms

Multi-file refactoring (10 files):
  Detection: ~50ms
  Batch delay: 500ms
  Parse (parallel): 20-100ms
  Dependencies: 10ms
  Cascades (5 files): 10-50ms
  Total: ~590-710ms for 15 files
```

### Memory Usage

```
Small project (< 100 files):
  - Parse tree cache: ~5MB
  - Dependency graph: ~100KB
  - Total: ~5-10MB

Medium project (< 1000 files):
  - Parse tree cache: ~20MB (200 files × 100KB)
  - Dependency graph: ~1MB
  - Total: ~20-30MB

Large project (< 10000 files):
  - Parse tree cache: ~20MB (limited by maxCacheSize)
  - Dependency graph: ~10MB
  - Total: ~30-50MB
```

## Best Practices

### 1. Configure for Your Use Case

```typescript
// Development (fast feedback)
const devManager = new RealTimeAnalysisManager({
  paths: 'src',
  debounceDelay: 200,
  batchDelay: 300,
  enableCascadeUpdates: true
});

// Build pipeline (stability over speed)
const buildManager = new RealTimeAnalysisManager({
  paths: 'src',
  debounceDelay: 500,
  batchDelay: 1000,
  maxBatchSize: 100,
  enableCascadeUpdates: true
});

// CI/CD (one-shot analysis)
const ciManager = new RealTimeAnalysisManager({
  paths: 'src',
  ignoreInitial: false,
  debounceDelay: 0,
  batchDelay: 0
});
```

### 2. Monitor Performance

```typescript
setInterval(() => {
  const stats = manager.getStats();

  console.log('Performance Metrics:');
  console.log(`  Avg parse time: ${stats.averageParseTime.toFixed(2)}ms`);
  console.log(`  Avg batch size: ${stats.averageBatchSize.toFixed(1)}`);
  console.log(`  Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);

  // Alerts
  if (stats.averageParseTime > 100) {
    console.warn('⚠️  Slow parsing detected');
  }

  if (stats.averageBatchSize > 20) {
    console.warn('⚠️  Large batches - consider increasing delay');
  }

  if (stats.cacheHitRate < 0.5) {
    console.warn('⚠️  Low cache hit rate - increase maxCacheSize?');
  }
}, 60000);
```

### 3. Handle Errors Gracefully

```typescript
manager.on('error', (error) => {
  console.error('File watcher error:', error);
  // Log to error tracking service
  errorTracker.report(error);
});

manager.on('analysisError', (error) => {
  console.error(`Analysis failed for ${error.filePath}:`, error.error);
  // Continue processing other files
  // Optionally retry
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await manager.stop();
  process.exit(0);
});
```

### 4. Optimize for Large Projects

```typescript
const manager = new RealTimeAnalysisManager({
  paths: 'src',

  // Limit what gets watched
  ignored: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.ts',        // Skip tests if not needed
    '**/*.spec.ts',
    '**/*.d.ts'            // Skip type definitions
  ],

  // Optimize performance
  maxCacheSize: 500,       // Increase cache for large projects
  maxBatchSize: 100,       // Larger batches
  batchDelay: 1000,        // Wait longer for more batching

  // Limit cascades
  maxCascadeDepth: 2       // Prevent excessive cascading
});
```

### 5. Testing Integration

```typescript
import { describe, it, beforeEach, afterEach } from 'vitest';

describe('My Application', () => {
  let manager: RealTimeAnalysisManager;

  beforeEach(async () => {
    manager = new RealTimeAnalysisManager({
      paths: './test-fixtures',
      ignoreInitial: true,
      debounceDelay: 100
    });

    await manager.start();
  });

  afterEach(async () => {
    await manager.stop();
  });

  it('should detect code changes', async () => {
    const events: AnalysisEvent[] = [];

    manager.on('analysis', (event) => {
      events.push(event);
    });

    // Make a change
    await fs.writeFile('./test-fixtures/test.ts', 'function test() {}');

    // Wait for analysis
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(events.length).toBeGreaterThan(0);
  });
});
```

## Troubleshooting

### Issue: High Memory Usage

**Symptoms:** Memory usage grows over time

**Solutions:**
1. Reduce `maxCacheSize`: `maxCacheSize: 100`
2. Periodically clear caches: `manager.clearCaches()`
3. Ignore more files: Add to `ignored` patterns
4. Disable unnecessary features: `enableCascadeUpdates: false`

### Issue: Slow Analysis

**Symptoms:** High `averageParseTime` in stats

**Solutions:**
1. Check if incremental parsing is enabled: `enableIncrementalParsing: true`
2. Increase cache size: `maxCacheSize: 300`
3. Profile slow files: Monitor `parseTime` in events
4. Exclude large files: Add to `ignored`

### Issue: Excessive Batching

**Symptoms:** `averageBatchSize` very large

**Solutions:**
1. Reduce `batchDelay`: `batchDelay: 300`
2. Reduce `maxBatchSize`: `maxBatchSize: 20`
3. Check for mass file changes (prettier, etc.)

### Issue: Missing Dependencies

**Symptoms:** Dependent files not updating

**Checks:**
1. Verify `enableDependencyTracking: true`
2. Verify `enableCascadeUpdates: true`
3. Check `maxCascadeDepth` is sufficient
4. Review dependency graph: `manager.getDependencyGraph()`

### Issue: Events Not Firing

**Symptoms:** No `analysis` events

**Checks:**
1. Verify manager is started: `manager.isActive()`
2. Check file patterns match: Review `ignored` patterns
3. Verify files are actually changing
4. Check for errors: Listen to `error` and `analysisError` events

## Complete Example: Production Application

```typescript
import { RealTimeAnalysisManager } from './services/RealTimeAnalysisManager';

class ProductionCodeIntelligence {
  private manager: RealTimeAnalysisManager;
  private isShuttingDown = false;

  async start(config: {
    projectRoot: string;
    port: number;
  }) {
    // Create manager with production config
    this.manager = new RealTimeAnalysisManager({
      paths: [config.projectRoot + '/src'],
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.spec.ts'
      ],
      debounceDelay: 300,
      batchDelay: 500,
      maxBatchSize: 50,
      enableIncrementalParsing: true,
      enableDependencyTracking: true,
      enableCascadeUpdates: true,
      maxCascadeDepth: 3
    });

    // Set up comprehensive event handling
    this.setupEventHandlers();

    // Set up health monitoring
    this.setupHealthMonitoring();

    // Set up graceful shutdown
    this.setupGracefulShutdown();

    // Start the manager
    await this.manager.start();

    console.log(`🚀 Code intelligence started on port ${config.port}`);
  }

  private setupEventHandlers() {
    this.manager.on('analysis', (event) => {
      // Log to analytics
      this.trackAnalysis(event);

      // Update in-memory index
      this.updateIndex(event);

      // Notify connected clients (WebSocket, etc.)
      this.notifyClients(event);
    });

    this.manager.on('error', (error) => {
      console.error('Critical error:', error);
      // Send to error tracking
      this.reportError(error);
    });

    this.manager.on('analysisError', (error) => {
      console.warn('Analysis error:', error.filePath, error.error);
      // Non-critical, just log
    });

    this.manager.on('batchComplete', (batch) => {
      console.log(`Processed batch: ${batch.count} files`);
    });
  }

  private setupHealthMonitoring() {
    // Monitor every minute
    setInterval(() => {
      if (this.isShuttingDown) return;

      const stats = this.manager.getStats();

      // Log metrics
      console.log('Health Check:', {
        filesWatched: stats.filesWatched,
        avgParseTime: stats.averageParseTime.toFixed(2) + 'ms',
        cacheHitRate: (stats.cacheHitRate * 100).toFixed(1) + '%',
        dependencies: stats.dependencyCount
      });

      // Alert on issues
      if (stats.averageParseTime > 100) {
        console.warn('⚠️  Performance degradation detected');
      }

      // Periodic cache cleanup
      if (stats.cacheHitRate < 0.3) {
        this.manager.clearCaches();
        console.log('🧹 Cleared caches due to low hit rate');
      }
    }, 60000);
  }

  private setupGracefulShutdown() {
    const shutdown = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      console.log('\n🛑 Shutting down gracefully...');

      try {
        await this.manager.stop();
        console.log('✅ Shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('❌ Shutdown error:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  private trackAnalysis(event: AnalysisEvent) {
    // Send to analytics/monitoring
  }

  private updateIndex(event: AnalysisEvent) {
    // Update in-memory code index
  }

  private notifyClients(event: AnalysisEvent) {
    // Notify via WebSocket, etc.
  }

  private reportError(error: Error) {
    // Send to Sentry, etc.
  }
}

// Start the application
const app = new ProductionCodeIntelligence();
await app.start({
  projectRoot: process.env.PROJECT_ROOT || process.cwd(),
  port: parseInt(process.env.PORT || '3000')
});
```

## Conclusion

Phase 4.3 completes the real-time analysis infrastructure by providing a unified, production-ready API that integrates:

- ✅ **TreeSitterLanguageAnalyzer** - Multi-language parsing
- ✅ **IncrementalParseManager** - Fast re-parsing (10-100x speedup)
- ✅ **FileWatcherService** - Real-time monitoring
- ✅ **IncrementalUpdateManager** - Dependency-aware updates
- ✅ **RealTimeAnalysisManager** - Unified high-level API

**Result:** Production-ready real-time code intelligence with sub-second response times, intelligent dependency tracking, and comprehensive event-driven architecture suitable for IDEs, LSP servers, build systems, and continuous analysis tools.
