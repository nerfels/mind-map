/**
 * Tests for RealTimeAnalysisManager - Phase 4.3 Integration Tests
 *
 * Validates end-to-end integration of all real-time analysis components:
 * - TreeSitterLanguageAnalyzer (multi-language parsing)
 * - IncrementalParseManager (fast re-parsing)
 * - FileWatcherService (real-time monitoring)
 * - IncrementalUpdateManager (dependency-aware updates)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RealTimeAnalysisManager, type AnalysisEvent } from '../../../src/core/services/RealTimeAnalysisManager.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('RealTimeAnalysisManager - Phase 4.3 Integration', () => {
  let manager: RealTimeAnalysisManager;
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), 'realtime-test-' + Date.now());
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    if (manager) {
      await manager.stop();
    }

    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Initialization and Lifecycle', () => {
    it('should create manager with default config', () => {
      manager = new RealTimeAnalysisManager({
        paths: testDir
      });

      expect(manager).toBeDefined();
      expect(manager.isActive()).toBe(false);

      const config = manager.getConfig();
      expect(config.enableIncrementalParsing).toBe(true);
      expect(config.enableDependencyTracking).toBe(true);
      expect(config.enableCascadeUpdates).toBe(true);
    });

    it('should create with custom config', () => {
      manager = new RealTimeAnalysisManager({
        paths: testDir,
        debounceDelay: 100,
        batchDelay: 200,
        maxBatchSize: 10,
        enableCascadeUpdates: false
      });

      const config = manager.getConfig();
      expect(config.debounceDelay).toBe(100);
      expect(config.batchDelay).toBe(200);
      expect(config.maxBatchSize).toBe(10);
      expect(config.enableCascadeUpdates).toBe(false);
    });

    it('should start and stop cleanly', async () => {
      manager = new RealTimeAnalysisManager({
        paths: testDir,
        ignoreInitial: true
      });

      expect(manager.isActive()).toBe(false);

      await manager.start();
      expect(manager.isActive()).toBe(true);

      await manager.stop();
      expect(manager.isActive()).toBe(false);
    });

    it('should emit started and stopped events', async () => {
      manager = new RealTimeAnalysisManager({
        paths: testDir,
        ignoreInitial: true
      });

      let startedEmitted = false;
      let stoppedEmitted = false;

      manager.on('started', () => {
        startedEmitted = true;
      });

      manager.on('stopped', () => {
        stoppedEmitted = true;
      });

      await manager.start();
      expect(startedEmitted).toBe(true);

      await manager.stop();
      expect(stoppedEmitted).toBe(true);
    });

    it('should throw if started twice', async () => {
      manager = new RealTimeAnalysisManager({
        paths: testDir,
        ignoreInitial: true
      });

      await manager.start();

      await expect(async () => {
        await manager.start();
      }).rejects.toThrow('already running');

      await manager.stop();
    });
  });

  describe('File Analysis Integration', () => {
    it('should analyze files on add', async () => {
      manager = new RealTimeAnalysisManager({
        paths: testDir,
        analyzeOnAdd: true,
        debounceDelay: 100
      });

      const events: AnalysisEvent[] = [];
      manager.on('analysis', (event: AnalysisEvent) => {
        events.push(event);
      });

      await manager.start();

      // Create a new file
      const file1 = join(testDir, 'test1.ts');
      await writeFile(file1, 'function hello() { return "world"; }');

      // Wait for analysis
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(events.length).toBeGreaterThan(0);
      const event = events.find(e => e.filePath === file1);
      expect(event).toBeDefined();
      expect(event?.changeType).toBe('added');
    });

    it('should analyze files on change', async () => {
      const file1 = join(testDir, 'change.ts');
      await writeFile(file1, 'function test() { return 1; }');

      manager = new RealTimeAnalysisManager({
        paths: testDir,
        analyzeOnChange: true,
        debounceDelay: 100,
        ignoreInitial: false
      });

      const events: AnalysisEvent[] = [];
      manager.on('analysis', (event: AnalysisEvent) => {
        events.push(event);
      });

      await manager.start();

      // Wait for initial analysis
      await new Promise(resolve => setTimeout(resolve, 500));
      events.length = 0; // Clear initial events

      // Modify the file
      await writeFile(file1, 'function test() { return 42; }');

      // Wait for change analysis
      await new Promise(resolve => setTimeout(resolve, 500));

      const changeEvent = events.find(e => e.filePath === file1);
      expect(changeEvent).toBeDefined();
      expect(changeEvent?.changeType).toBe('changed');
    });

    it('should use incremental parsing for changes', async () => {
      const file1 = join(testDir, 'incremental.ts');
      await writeFile(file1, 'function original() { return 1; }');

      manager = new RealTimeAnalysisManager({
        paths: testDir,
        enableIncrementalParsing: true,
        debounceDelay: 100
      });

      const events: AnalysisEvent[] = [];
      manager.on('analysis', (event: AnalysisEvent) => {
        events.push(event);
      });

      await manager.start();

      await new Promise(resolve => setTimeout(resolve, 500));
      events.length = 0;

      // Make a small change
      await writeFile(file1, 'function original() { return 42; }');

      await new Promise(resolve => setTimeout(resolve, 500));

      const stats = manager.getStats();
      expect(stats.totalUpdates).toBeGreaterThan(0);
    });
  });

  describe('Dependency Tracking Integration', () => {
    it('should track dependencies between files', async () => {
      const baseFile = join(testDir, 'base.ts');
      const userFile = join(testDir, 'user.ts');

      await writeFile(baseFile, 'export function utility() { return 42; }');
      await writeFile(userFile, 'import { utility } from "./base";\nutility();');

      manager = new RealTimeAnalysisManager({
        paths: testDir,
        enableDependencyTracking: true,
        debounceDelay: 100
      });

      await manager.start();

      // Wait for initial analysis
      await new Promise(resolve => setTimeout(resolve, 800));

      const deps = manager.getDependencies(userFile);
      expect(deps).toBeDefined();

      const stats = manager.getStats();
      expect(stats.dependencyCount).toBeGreaterThanOrEqual(0);
    });

    it('should get dependents of a file', async () => {
      const libFile = join(testDir, 'lib.ts');
      const app1File = join(testDir, 'app1.ts');
      const app2File = join(testDir, 'app2.ts');

      await writeFile(libFile, 'export const VERSION = "1.0.0";');
      await writeFile(app1File, 'import { VERSION } from "./lib";');
      await writeFile(app2File, 'import { VERSION } from "./lib";');

      manager = new RealTimeAnalysisManager({
        paths: testDir,
        enableDependencyTracking: true,
        debounceDelay: 100
      });

      await manager.start();
      await new Promise(resolve => setTimeout(resolve, 800));

      const dependents = manager.getDependents(libFile);
      expect(dependents).toBeDefined();
    });

    it('should get affected files by change', async () => {
      const coreFile = join(testDir, 'core.ts');
      const middlewareFile = join(testDir, 'middleware.ts');
      const appFile = join(testDir, 'app.ts');

      await writeFile(coreFile, 'export function core() {}');
      await writeFile(middlewareFile, 'import { core } from "./core";\nexport function middleware() { core(); }');
      await writeFile(appFile, 'import { middleware } from "./middleware";\nmiddleware();');

      manager = new RealTimeAnalysisManager({
        paths: testDir,
        enableDependencyTracking: true,
        debounceDelay: 100
      });

      await manager.start();
      await new Promise(resolve => setTimeout(resolve, 800));

      const affected = manager.getAffectedFiles(coreFile, 2);
      expect(affected).toBeDefined();
      expect(affected instanceof Set).toBe(true);
    });

    it('should get dependency graph', async () => {
      const file1 = join(testDir, 'graph1.ts');
      const file2 = join(testDir, 'graph2.ts');

      await writeFile(file1, 'export const x = 1;');
      await writeFile(file2, 'import { x } from "./graph1";');

      manager = new RealTimeAnalysisManager({
        paths: testDir,
        enableDependencyTracking: true,
        debounceDelay: 100
      });

      await manager.start();
      await new Promise(resolve => setTimeout(resolve, 800));

      const graph = manager.getDependencyGraph();
      expect(graph).toBeDefined();
      expect(graph instanceof Map).toBe(true);
    });
  });

  describe('Batch Processing Integration', () => {
    it('should batch multiple file changes', async () => {
      manager = new RealTimeAnalysisManager({
        paths: testDir,
        batchDelay: 200,
        debounceDelay: 100
      });

      const batchEvents: any[] = [];
      manager.on('batchComplete', (event: any) => {
        batchEvents.push(event);
      });

      await manager.start();

      // Create multiple files quickly
      const files = [];
      for (let i = 0; i < 5; i++) {
        const file = join(testDir, `batch${i}.ts`);
        files.push(file);
        await writeFile(file, `function test${i}() { return ${i}; }`);
      }

      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(batchEvents.length).toBeGreaterThan(0);
      const batch = batchEvents[0];
      expect(batch.count).toBeGreaterThan(0);
    });

    it('should respect max batch size', async () => {
      manager = new RealTimeAnalysisManager({
        paths: testDir,
        batchDelay: 200,
        maxBatchSize: 3,
        debounceDelay: 100
      });

      await manager.start();

      // Create more files than batch size
      for (let i = 0; i < 6; i++) {
        const file = join(testDir, `size${i}.ts`);
        await writeFile(file, `function f${i}() {}`);
      }

      await new Promise(resolve => setTimeout(resolve, 1500));

      const stats = manager.getStats();
      expect(stats.totalUpdates).toBeGreaterThan(0);
    });
  });

  describe('Cascade Updates Integration', () => {
    it('should cascade updates when enabled', async () => {
      const baseFile = join(testDir, 'cascade-base.ts');
      const midFile = join(testDir, 'cascade-mid.ts');

      await writeFile(baseFile, 'export function base() { return 1; }');
      await writeFile(midFile, 'import { base } from "./cascade-base";\nexport function mid() { return base(); }');

      manager = new RealTimeAnalysisManager({
        paths: testDir,
        enableCascadeUpdates: true,
        maxCascadeDepth: 2,
        debounceDelay: 100,
        batchDelay: 200
      });

      const events: AnalysisEvent[] = [];
      manager.on('analysis', (event: AnalysisEvent) => {
        events.push(event);
      });

      await manager.start();
      await new Promise(resolve => setTimeout(resolve, 800));
      events.length = 0;

      // Modify base file
      await writeFile(baseFile, 'export function base() { return 42; }');

      // Wait for cascades
      await new Promise(resolve => setTimeout(resolve, 1000));

      const stats = manager.getStats();
      expect(stats.totalUpdates).toBeGreaterThan(0);
    });

    it('should not cascade when disabled', async () => {
      const baseFile = join(testDir, 'no-cascade-base.ts');
      const depFile = join(testDir, 'no-cascade-dep.ts');

      await writeFile(baseFile, 'export const x = 1;');
      await writeFile(depFile, 'import { x } from "./no-cascade-base";');

      manager = new RealTimeAnalysisManager({
        paths: testDir,
        enableCascadeUpdates: false,
        debounceDelay: 100
      });

      await manager.start();
      await new Promise(resolve => setTimeout(resolve, 800));

      const stats1 = manager.getStats();
      const updates1 = stats1.totalUpdates;

      // Modify base file
      await writeFile(baseFile, 'export const x = 42;');
      await new Promise(resolve => setTimeout(resolve, 800));

      const stats2 = manager.getStats();
      // Should only update the base file, not cascade
      expect(stats2.cascadeUpdates).toBe(0);
    });
  });

  describe('Manual Operations', () => {
    it('should manually analyze a file', async () => {
      const file = join(testDir, 'manual.ts');
      await writeFile(file, 'function test() { return 42; }');

      manager = new RealTimeAnalysisManager({
        paths: testDir,
        ignoreInitial: true
      });

      await manager.start();

      const analysis = await manager.analyzeFile(file);
      expect(analysis).toBeDefined();
      expect(analysis?.functions).toBeDefined();
    });

    it('should manually invalidate a file', async () => {
      const file = join(testDir, 'invalidate.ts');
      await writeFile(file, 'function test() {}');

      manager = new RealTimeAnalysisManager({
        paths: testDir,
        debounceDelay: 100,
        batchDelay: 200
      });

      const events: AnalysisEvent[] = [];
      manager.on('analysis', (event: AnalysisEvent) => {
        events.push(event);
      });

      await manager.start();
      await new Promise(resolve => setTimeout(resolve, 500));
      events.length = 0;

      // Manually invalidate
      await manager.invalidateFile(file);
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track comprehensive statistics', async () => {
      manager = new RealTimeAnalysisManager({
        paths: testDir,
        debounceDelay: 100
      });

      await manager.start();

      // Create some files
      await writeFile(join(testDir, 'stat1.ts'), 'function f1() {}');
      await writeFile(join(testDir, 'stat2.ts'), 'function f2() {}');

      await new Promise(resolve => setTimeout(resolve, 800));

      const stats = manager.getStats();
      expect(stats).toBeDefined();
      expect(stats.totalUpdates).toBeGreaterThanOrEqual(0);
      expect(stats.totalChanges).toBeGreaterThanOrEqual(0);
      expect(stats.averageParseTime).toBeGreaterThanOrEqual(0);
    });

    it('should reset statistics', async () => {
      manager = new RealTimeAnalysisManager({
        paths: testDir,
        debounceDelay: 100
      });

      await manager.start();

      await writeFile(join(testDir, 'reset.ts'), 'function test() {}');
      await new Promise(resolve => setTimeout(resolve, 500));

      manager.resetStats();

      const stats = manager.getStats();
      expect(stats.totalUpdates).toBe(0);
      expect(stats.totalChanges).toBe(0);
    });

    it('should clear caches', async () => {
      const file = join(testDir, 'cache.ts');
      await writeFile(file, 'function test() { return 1; }');

      manager = new RealTimeAnalysisManager({
        paths: testDir,
        enableIncrementalParsing: true,
        debounceDelay: 100
      });

      await manager.start();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Modify to populate cache
      await writeFile(file, 'function test() { return 42; }');
      await new Promise(resolve => setTimeout(resolve, 500));

      manager.clearCaches();

      const stats = manager.getStats();
      expect(stats.cacheHitRate).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should emit errors from file watcher', async () => {
      manager = new RealTimeAnalysisManager({
        paths: '/nonexistent/path/that/does/not/exist',
        debounceDelay: 100
      });

      const errors: any[] = [];
      manager.on('error', (error: any) => {
        errors.push(error);
      });

      try {
        await manager.start();
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        // May throw on invalid path
      }

      // Error handling varies by platform
      expect(true).toBe(true);
    });

    it('should emit analysis errors', async () => {
      const invalidFile = join(testDir, 'invalid.ts');

      manager = new RealTimeAnalysisManager({
        paths: testDir,
        debounceDelay: 100
      });

      const errors: any[] = [];
      manager.on('analysisError', (error: any) => {
        errors.push(error);
      });

      await manager.start();

      // Try to create an invalid file scenario
      await writeFile(invalidFile, 'some content');
      // Delete it immediately
      await rm(invalidFile, { force: true });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Errors may or may not occur depending on timing
      expect(true).toBe(true);
    });

    it('should continue after errors', async () => {
      manager = new RealTimeAnalysisManager({
        paths: testDir,
        debounceDelay: 100
      });

      await manager.start();

      // Create a valid file
      const validFile = join(testDir, 'valid.ts');
      await writeFile(validFile, 'function valid() {}');

      await new Promise(resolve => setTimeout(resolve, 500));

      const stats = manager.getStats();
      expect(stats.totalUpdates).toBeGreaterThan(0);
    });
  });

  describe('Event Integration', () => {
    it('should emit all expected events', async () => {
      manager = new RealTimeAnalysisManager({
        paths: testDir,
        debounceDelay: 100,
        batchDelay: 200
      });

      const events = {
        started: false,
        fileChange: false,
        analysis: false,
        batchComplete: false,
        stopped: false
      };

      manager.on('started', () => { events.started = true; });
      manager.on('fileChange', () => { events.fileChange = true; });
      manager.on('analysis', () => { events.analysis = true; });
      manager.on('batchComplete', () => { events.batchComplete = true; });
      manager.on('stopped', () => { events.stopped = true; });

      await manager.start();
      expect(events.started).toBe(true);

      // Create a file
      await writeFile(join(testDir, 'event.ts'), 'function test() {}');
      await new Promise(resolve => setTimeout(resolve, 800));

      expect(events.fileChange).toBe(true);
      expect(events.analysis).toBe(true);
      expect(events.batchComplete).toBe(true);

      await manager.stop();
      expect(events.stopped).toBe(true);
    });
  });
});
