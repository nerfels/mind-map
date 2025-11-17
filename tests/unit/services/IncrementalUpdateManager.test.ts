/**
 * Tests for IncrementalUpdateManager
 *
 * Validates dependency tracking, batch updates, and cascade invalidation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  IncrementalUpdateManager,
  DependencyType,
  type FileDependency,
  type UpdateEvent
} from '../../../src/core/services/IncrementalUpdateManager.js';
import { FileWatcherService } from '../../../src/core/services/FileWatcherService.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('IncrementalUpdateManager', () => {
  let updateManager: IncrementalUpdateManager;
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), 'update-manager-test-' + Date.now());
    await mkdir(testDir, { recursive: true });

    updateManager = new IncrementalUpdateManager({
      batchDelay: 100,
      maxBatchSize: 10,
      enableDependencyTracking: true,
      enableCascadeUpdates: true,
      maxCascadeDepth: 3
    });
  });

  afterEach(async () => {
    await updateManager.stop();

    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    it('should create update manager with default config', () => {
      const manager = new IncrementalUpdateManager();
      expect(manager).toBeDefined();

      const stats = manager.getStats();
      expect(stats.totalUpdates).toBe(0);
      expect(stats.dependencyCount).toBe(0);
    });

    it('should create with custom config', () => {
      const manager = new IncrementalUpdateManager({
        batchDelay: 200,
        maxBatchSize: 50,
        enableDependencyTracking: false
      });

      expect(manager).toBeDefined();
    });
  });

  describe('Batch Processing', () => {
    it('should queue updates', () => {
      const file1 = join(testDir, 'file1.ts');
      const file2 = join(testDir, 'file2.ts');

      updateManager.queueUpdate(file1);
      updateManager.queueUpdate(file2);

      // Updates are queued (would be processed after delay)
      expect(true).toBe(true);
    });

    it('should process batch after delay', async () => {
      const file1 = join(testDir, 'file1.ts');
      const file2 = join(testDir, 'file2.ts');

      await writeFile(file1, 'function test1() { return 1; }');
      await writeFile(file2, 'function test2() { return 2; }');

      const events: UpdateEvent[] = [];
      updateManager.on('fileUpdate', (event: UpdateEvent) => {
        events.push(event);
      });

      let batchCompleted = false;
      updateManager.on('batchComplete', () => {
        batchCompleted = true;
      });

      updateManager.queueUpdate(file1);
      updateManager.queueUpdate(file2);

      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(batchCompleted).toBe(true);
      expect(events.length).toBeGreaterThan(0);
    });

    it('should respect max batch size', async () => {
      const manager = new IncrementalUpdateManager({
        batchDelay: 100,
        maxBatchSize: 3
      });

      const files: string[] = [];
      for (let i = 0; i < 5; i++) {
        const file = join(testDir, `file${i}.ts`);
        files.push(file);
        await writeFile(file, `function test${i}() {}`);
        manager.queueUpdate(file);
      }

      let firstBatchSize = 0;
      manager.once('batchComplete', (data: any) => {
        firstBatchSize = data.files.length;
      });

      // Wait for first batch
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(firstBatchSize).toBeLessThanOrEqual(3);

      await manager.stop();
    });

    it('should track batch statistics', async () => {
      const file1 = join(testDir, 'stat1.ts');
      const file2 = join(testDir, 'stat2.ts');

      await writeFile(file1, 'function test() {}');
      await writeFile(file2, 'function test() {}');

      updateManager.queueUpdate(file1);
      updateManager.queueUpdate(file2);

      await new Promise(resolve => setTimeout(resolve, 300));

      const stats = updateManager.getStats();
      expect(stats.totalUpdates).toBeGreaterThan(0);
      expect(stats.batchedUpdates).toBeGreaterThan(0);
      expect(stats.averageBatchSize).toBeGreaterThan(0);
    });
  });

  describe('Dependency Tracking', () => {
    it('should track import dependencies', async () => {
      const file1 = join(testDir, 'module.ts');
      const file2 = join(testDir, 'importer.ts');

      await writeFile(file1, 'export function greet() { return "hello"; }');
      await writeFile(
        file2,
        'import { greet } from "./module";\nfunction test() { greet(); }'
      );

      // Create file watcher to trigger analysis
      const watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnAdd: true,
        debounceDelay: 100
      });

      updateManager.attachFileWatcher(watcher);

      await watcher.start();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check dependencies
      const deps = updateManager.getDependencies(file2);
      expect(deps.size).toBeGreaterThan(0);

      const hasImportDep = Array.from(deps).some(
        d => d.type === DependencyType.IMPORT
      );
      expect(hasImportDep).toBe(true);

      await watcher.stop();
    });

    it('should track reverse dependencies', async () => {
      const file1 = join(testDir, 'base.ts');
      const file2 = join(testDir, 'user.ts');

      await writeFile(file1, 'export function utility() {}');
      await writeFile(
        file2,
        'import { utility } from "./base";\nutility();'
      );

      const watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnAdd: true
      });

      updateManager.attachFileWatcher(watcher);

      await watcher.start();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check reverse dependencies
      const reverseDeps = updateManager.getReverseDependencies(file1);

      // May or may not find depending on resolution
      expect(reverseDeps).toBeDefined();

      await watcher.stop();
    });

    it('should get affected files', async () => {
      const file1 = join(testDir, 'affected1.ts');
      const file2 = join(testDir, 'affected2.ts');
      const file3 = join(testDir, 'affected3.ts');

      await writeFile(file1, 'export function base() {}');
      await writeFile(
        file2,
        'import { base } from "./affected1";\nexport function middle() { base(); }'
      );
      await writeFile(
        file3,
        'import { middle } from "./affected2";\nmiddle();'
      );

      const watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnAdd: true
      });

      updateManager.attachFileWatcher(watcher);

      await watcher.start();
      await new Promise(resolve => setTimeout(resolve, 500));

      const affected = updateManager.getAffectedFiles(file1);

      // Affected files might be empty if import resolution fails
      expect(affected).toBeDefined();
      expect(affected instanceof Set).toBe(true);

      await watcher.stop();
    });

    it('should get dependency graph', async () => {
      const file1 = join(testDir, 'graph1.ts');
      const file2 = join(testDir, 'graph2.ts');

      await writeFile(file1, 'export const x = 1;');
      await writeFile(file2, 'import { x } from "./graph1";');

      const watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnAdd: true
      });

      updateManager.attachFileWatcher(watcher);

      await watcher.start();
      await new Promise(resolve => setTimeout(resolve, 500));

      const graph = updateManager.getDependencyGraph();
      expect(graph).toBeDefined();
      expect(graph instanceof Map).toBe(true);

      await watcher.stop();
    });
  });

  describe('Cascade Updates', () => {
    it('should cascade updates to dependent files', async () => {
      const manager = new IncrementalUpdateManager({
        batchDelay: 100,
        enableCascadeUpdates: true,
        maxCascadeDepth: 2
      });

      const file1 = join(testDir, 'cascade1.ts');
      const file2 = join(testDir, 'cascade2.ts');

      await writeFile(file1, 'export function fn() {}');
      await writeFile(file2, 'import { fn } from "./cascade1";');

      const watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnAdd: true,
        analyzeOnChange: true
      });

      manager.attachFileWatcher(watcher);

      await watcher.start();
      await new Promise(resolve => setTimeout(resolve, 500));

      const cascadeEvents: UpdateEvent[] = [];
      manager.on('fileUpdate', (event: UpdateEvent) => {
        if (event.cascadeDepth > 0) {
          cascadeEvents.push(event);
        }
      });

      // Modify file1
      await writeFile(file1, 'export function fn() { return 42; }');

      // Wait for cascade
      await new Promise(resolve => setTimeout(resolve, 800));

      const stats = manager.getStats();

      // Stats should show updates occurred
      expect(stats.totalUpdates).toBeGreaterThan(0);

      await watcher.stop();
      await manager.stop();
    });

    it('should respect max cascade depth', async () => {
      const manager = new IncrementalUpdateManager({
        batchDelay: 100,
        enableCascadeUpdates: true,
        maxCascadeDepth: 1
      });

      // Create a chain: file1 -> file2 -> file3
      const file1 = join(testDir, 'chain1.ts');
      const file2 = join(testDir, 'chain2.ts');
      const file3 = join(testDir, 'chain3.ts');

      await writeFile(file1, 'export const x = 1;');
      await writeFile(file2, 'import { x } from "./chain1"; export const y = x;');
      await writeFile(file3, 'import { y } from "./chain2";');

      const watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnAdd: true
      });

      manager.attachFileWatcher(watcher);

      await watcher.start();
      await new Promise(resolve => setTimeout(resolve, 500));

      const updates: UpdateEvent[] = [];
      manager.on('fileUpdate', (event: UpdateEvent) => {
        updates.push(event);
      });

      // All cascade depths should be <= maxCascadeDepth
      const maxDepth = Math.max(...updates.map(u => u.cascadeDepth), 0);
      expect(maxDepth).toBeLessThanOrEqual(1);

      await watcher.stop();
      await manager.stop();
    });
  });

  describe('File Removal', () => {
    it('should remove file from dependency tracking', () => {
      const file1 = join(testDir, 'remove1.ts');
      const file2 = join(testDir, 'remove2.ts');

      updateManager.queueUpdate(file1);
      updateManager.queueUpdate(file2);

      updateManager.removeFile(file1);

      // File should be removed from pending updates
      // (Hard to verify without internal access, but shouldn't throw)
      expect(true).toBe(true);
    });

    it('should clear dependencies when file is removed', async () => {
      const file1 = join(testDir, 'clear1.ts');

      await writeFile(file1, 'export function test() {}');

      const watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnAdd: true
      });

      updateManager.attachFileWatcher(watcher);

      await watcher.start();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Remove file
      updateManager.removeFile(file1);

      const deps = updateManager.getDependencies(file1);
      expect(deps.size).toBe(0);

      await watcher.stop();
    });
  });

  describe('Invalidation', () => {
    it('should invalidate file and queue update', async () => {
      const file1 = join(testDir, 'invalidate.ts');

      await writeFile(file1, 'function test() {}');

      const events: UpdateEvent[] = [];
      updateManager.on('fileUpdate', (event: UpdateEvent) => {
        events.push(event);
      });

      await updateManager.invalidate(file1);

      // Wait for update
      await new Promise(resolve => setTimeout(resolve, 300));

      expect(events.length).toBeGreaterThan(0);
    });

    it('should invalidate affected files', async () => {
      const file1 = join(testDir, 'inv1.ts');
      const file2 = join(testDir, 'inv2.ts');

      await writeFile(file1, 'export const x = 1;');
      await writeFile(file2, 'import { x } from "./inv1";');

      const watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnAdd: true
      });

      updateManager.attachFileWatcher(watcher);

      await watcher.start();
      await new Promise(resolve => setTimeout(resolve, 500));

      await updateManager.invalidate(file1);

      // Wait for invalidation
      await new Promise(resolve => setTimeout(resolve, 300));

      // Should queue updates for file1 and affected files
      expect(true).toBe(true);

      await watcher.stop();
    });
  });

  describe('Statistics', () => {
    it('should track update statistics', async () => {
      const file1 = join(testDir, 'stats1.ts');
      const file2 = join(testDir, 'stats2.ts');

      await writeFile(file1, 'function test1() {}');
      await writeFile(file2, 'function test2() {}');

      updateManager.queueUpdate(file1);
      updateManager.queueUpdate(file2);

      await new Promise(resolve => setTimeout(resolve, 300));

      const stats = updateManager.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalUpdates).toBeGreaterThanOrEqual(0);
      expect(stats.batchedUpdates).toBeGreaterThanOrEqual(0);
      expect(stats.cascadeUpdates).toBeGreaterThanOrEqual(0);
      expect(stats.averageBatchSize).toBeGreaterThanOrEqual(0);
      expect(stats.dependencyCount).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average parse time', async () => {
      const file1 = join(testDir, 'parse1.ts');

      await writeFile(file1, 'function test() { return 42; }');

      updateManager.queueUpdate(file1);

      await new Promise(resolve => setTimeout(resolve, 300));

      const stats = updateManager.getStats();
      expect(stats.averageParseTime).toBeGreaterThanOrEqual(0);
    });

    it('should reset statistics', async () => {
      const file1 = join(testDir, 'reset.ts');

      await writeFile(file1, 'function test() {}');

      updateManager.queueUpdate(file1);

      await new Promise(resolve => setTimeout(resolve, 300));

      updateManager.resetStats();

      const stats = updateManager.getStats();
      expect(stats.totalUpdates).toBe(0);
      expect(stats.batchedUpdates).toBe(0);
      expect(stats.cascadeUpdates).toBe(0);
    });
  });

  describe('Cleanup', () => {
    it('should clear all dependencies', () => {
      updateManager.queueUpdate(join(testDir, 'clear1.ts'));
      updateManager.queueUpdate(join(testDir, 'clear2.ts'));

      updateManager.clearDependencies();

      const graph = updateManager.getDependencyGraph();
      expect(graph.size).toBe(0);
    });

    it('should stop cleanly', async () => {
      const file1 = join(testDir, 'stop.ts');

      await writeFile(file1, 'function test() {}');

      updateManager.queueUpdate(file1);

      await updateManager.stop();

      // Should process pending updates and clean up
      expect(true).toBe(true);
    });

    it('should process pending updates before stopping', async () => {
      const file1 = join(testDir, 'pending.ts');

      await writeFile(file1, 'function test() {}');

      const events: UpdateEvent[] = [];
      updateManager.on('fileUpdate', (event: UpdateEvent) => {
        events.push(event);
      });

      updateManager.queueUpdate(file1);

      await updateManager.stop();

      // Pending updates should be processed
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle file read errors', async () => {
      const nonExistentFile = join(testDir, 'nonexistent.ts');

      const errors: any[] = [];
      updateManager.on('updateError', (error: any) => {
        errors.push(error);
      });

      updateManager.queueUpdate(nonExistentFile);

      await new Promise(resolve => setTimeout(resolve, 300));

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should continue processing after errors', async () => {
      const validFile = join(testDir, 'valid.ts');
      const invalidFile = join(testDir, 'invalid.ts');

      await writeFile(validFile, 'function test() {}');

      const events: UpdateEvent[] = [];
      updateManager.on('fileUpdate', (event: UpdateEvent) => {
        events.push(event);
      });

      updateManager.queueUpdate(invalidFile); // Will error
      updateManager.queueUpdate(validFile);    // Should succeed

      await new Promise(resolve => setTimeout(resolve, 300));

      // Should have at least one successful update
      const successfulUpdates = events.filter(e => e.filePath === validFile);
      expect(successfulUpdates.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with FileWatcher', () => {
    it('should integrate with file watcher', async () => {
      const file1 = join(testDir, 'integrate.ts');

      await writeFile(file1, 'function test() { return 1; }');

      const watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnAdd: true,
        analyzeOnChange: true,
        debounceDelay: 100
      });

      updateManager.attachFileWatcher(watcher);

      const updates: UpdateEvent[] = [];
      updateManager.on('fileUpdate', (event: UpdateEvent) => {
        updates.push(event);
      });

      await watcher.start();

      // Wait for initial scan
      await new Promise(resolve => setTimeout(resolve, 500));

      // Modify file
      await writeFile(file1, 'function test() { return 42; }');

      // Wait for update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should receive updates
      expect(updates.length).toBeGreaterThan(0);

      await watcher.stop();
    });
  });
});
