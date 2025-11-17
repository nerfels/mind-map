/**
 * Tests for FileWatcherService
 *
 * Demonstrates real-time file watching with incremental analysis
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileWatcherService, FileChangeType } from '../../../src/core/services/FileWatcherService.js';
import { writeFile, unlink, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('FileWatcherService', () => {
  let testDir: string;
  let watcher: FileWatcherService;

  beforeEach(async () => {
    testDir = join(tmpdir(), 'file-watcher-test-' + Date.now());
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    if (watcher && watcher.isRunning()) {
      await watcher.stop();
    }
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    it('should create watcher with default config', () => {
      watcher = new FileWatcherService({
        paths: testDir
      });

      expect(watcher).toBeDefined();
      expect(watcher.isRunning()).toBe(false);
    });

    it('should start and stop watcher', async () => {
      watcher = new FileWatcherService({
        paths: testDir
      });

      await watcher.start();
      expect(watcher.isRunning()).toBe(true);

      await watcher.stop();
      expect(watcher.isRunning()).toBe(false);
    });

    it('should throw error if already running', async () => {
      watcher = new FileWatcherService({
        paths: testDir
      });

      await watcher.start();

      await expect(watcher.start()).rejects.toThrow('already running');
    });
  });

  describe('File Events', () => {
    it('should detect file added', async () => {
      watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnAdd: false  // Disable analysis for this test
      });

      const events: any[] = [];
      watcher.on('fileChange', (event) => events.push(event));

      await watcher.start();

      // Create a file
      const filePath = join(testDir, 'test.ts');
      await writeFile(filePath, 'function test() { return 42; }');

      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(events.length).toBeGreaterThan(0);
      const addEvent = events.find(e => e.type === FileChangeType.ADDED);
      expect(addEvent).toBeDefined();
      expect(addEvent.filePath).toBe(filePath);
    });

    it('should detect file changed', async () => {
      const filePath = join(testDir, 'test.ts');
      await writeFile(filePath, 'function test() { return 1; }');

      watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnChange: false  // Disable analysis for this test
      });

      const events: any[] = [];
      watcher.on('fileChange', (event) => events.push(event));

      await watcher.start();

      // Modify the file
      await new Promise(resolve => setTimeout(resolve, 200));
      await writeFile(filePath, 'function test() { return 42; }');

      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 500));

      const changeEvent = events.find(e => e.type === FileChangeType.CHANGED);
      expect(changeEvent).toBeDefined();
      expect(changeEvent.filePath).toBe(filePath);
    });

    it('should detect file deleted', async () => {
      const filePath = join(testDir, 'test.ts');
      await writeFile(filePath, 'function test() { return 42; }');

      watcher = new FileWatcherService({
        paths: testDir
      });

      const events: any[] = [];
      watcher.on('fileChange', (event) => events.push(event));

      await watcher.start();

      // Delete the file
      await new Promise(resolve => setTimeout(resolve, 200));
      await unlink(filePath);

      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 500));

      const deleteEvent = events.find(e => e.type === FileChangeType.DELETED);
      expect(deleteEvent).toBeDefined();
      expect(deleteEvent.filePath).toBe(filePath);
    });
  });

  describe('File Analysis', () => {
    it('should analyze files on add', async () => {
      watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnAdd: true
      });

      const events: any[] = [];
      watcher.on('fileChange', (event) => events.push(event));

      await watcher.start();

      // Create a TypeScript file
      const filePath = join(testDir, 'example.ts');
      await writeFile(
        filePath,
        `
          function greet(name: string): string {
            return \`Hello, \${name}!\`;
          }
        `
      );

      // Wait for analysis
      await new Promise(resolve => setTimeout(resolve, 1000));

      const addEvent = events.find(e => e.type === FileChangeType.ADDED && e.filePath === filePath);
      expect(addEvent).toBeDefined();
      expect(addEvent.analysis).toBeDefined();
      expect(addEvent.analysis.functions.length).toBeGreaterThan(0);
      expect(addEvent.parseTime).toBeGreaterThan(0);
    });

    it('should use incremental parsing on change', async () => {
      const filePath = join(testDir, 'incremental.ts');
      await writeFile(
        filePath,
        `
          function test() {
            return 1;
          }
        `
      );

      watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnAdd: true,
        analyzeOnChange: true,
        enableIncrementalParsing: true,
        debounceDelay: 100
      });

      const events: any[] = [];
      watcher.on('fileChange', (event) => events.push(event));

      await watcher.start();

      // Wait for initial add event
      await new Promise(resolve => setTimeout(resolve, 500));

      // Modify the file
      await writeFile(
        filePath,
        `
          function test() {
            return 42;
          }
        `
      );

      // Wait for change event
      await new Promise(resolve => setTimeout(resolve, 500));

      const changeEvent = events.find(
        e => e.type === FileChangeType.CHANGED && e.filePath === filePath
      );

      expect(changeEvent).toBeDefined();
      expect(changeEvent.wasIncremental).toBe(true);
      expect(changeEvent.parseTime).toBeLessThan(50);  // Should be fast
    });

    it('should skip analysis for non-code files', async () => {
      watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnAdd: true
      });

      const events: any[] = [];
      watcher.on('fileChange', (event) => events.push(event));

      await watcher.start();

      // Create a text file (not analyzable)
      const filePath = join(testDir, 'readme.txt');
      await writeFile(filePath, 'This is a text file');

      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 500));

      const addEvent = events.find(e => e.filePath === filePath);
      expect(addEvent).toBeDefined();
      expect(addEvent.analysis).toBeUndefined();  // No analysis for .txt files
    });
  });

  describe('Debouncing', () => {
    it('should debounce rapid file changes', async () => {
      const filePath = join(testDir, 'debounce.ts');
      await writeFile(filePath, 'function test() { return 1; }');

      watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnChange: true,
        debounceDelay: 200
      });

      const events: any[] = [];
      watcher.on('fileChange', (event) => {
        if (event.type === FileChangeType.CHANGED) {
          events.push(event);
        }
      });

      await watcher.start();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Make multiple rapid changes
      await writeFile(filePath, 'function test() { return 2; }');
      await new Promise(resolve => setTimeout(resolve, 50));
      await writeFile(filePath, 'function test() { return 3; }');
      await new Promise(resolve => setTimeout(resolve, 50));
      await writeFile(filePath, 'function test() { return 4; }');

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should only analyze once (debounced)
      expect(events.length).toBe(1);
    });
  });

  describe('Ignore Patterns', () => {
    it('should respect default ignore patterns', async () => {
      watcher = new FileWatcherService({
        paths: testDir
      });

      const events: any[] = [];
      watcher.on('fileChange', (event) => events.push(event));

      await watcher.start();

      // Create file in node_modules (should be ignored)
      const nodeModulesDir = join(testDir, 'node_modules');
      await mkdir(nodeModulesDir, { recursive: true });
      const ignoredFile = join(nodeModulesDir, 'test.ts');
      await writeFile(ignoredFile, 'function test() {}');

      // Wait
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should not see event for ignored file
      const ignoredEvent = events.find(e => e.filePath === ignoredFile);
      expect(ignoredEvent).toBeUndefined();
    });

    it('should respect custom ignore patterns', async () => {
      watcher = new FileWatcherService({
        paths: testDir,
        ignored: ['**/*.test.ts']
      });

      const events: any[] = [];
      watcher.on('fileChange', (event) => events.push(event));

      await watcher.start();

      // Create test file (should be ignored)
      const testFile = join(testDir, 'example.test.ts');
      await writeFile(testFile, 'function test() {}');

      // Create regular file (should not be ignored)
      const regularFile = join(testDir, 'example.ts');
      await writeFile(regularFile, 'function example() {}');

      // Wait
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should see regular file but not test file
      const testEvent = events.find(e => e.filePath === testFile);
      const regularEvent = events.find(e => e.filePath === regularFile);

      expect(testEvent).toBeUndefined();
      expect(regularEvent).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should track watcher statistics', async () => {
      const filePath = join(testDir, 'stats.ts');

      watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnAdd: true,
        analyzeOnChange: true
      });

      await watcher.start();

      // Add file
      await writeFile(filePath, 'function test() { return 1; }');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Change file
      await writeFile(filePath, 'function test() { return 42; }');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Delete file
      await unlink(filePath);
      await new Promise(resolve => setTimeout(resolve, 500));

      const stats = watcher.getStats();

      expect(stats.filesWatched).toBeGreaterThanOrEqual(0);
      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.addedEvents).toBeGreaterThan(0);
      expect(stats.changedEvents).toBeGreaterThan(0);
      expect(stats.deletedEvents).toBeGreaterThan(0);
      expect(stats.totalAnalyses).toBeGreaterThan(0);
      expect(stats.averageAnalysisTime).toBeGreaterThan(0);
      expect(stats.uptime).toBeGreaterThan(0);
    });

    it('should track incremental vs full analyses', async () => {
      const filePath = join(testDir, 'analysis.ts');

      watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnAdd: true,
        analyzeOnChange: true,
        enableIncrementalParsing: true
      });

      await watcher.start();

      // Initial add (full parse)
      await writeFile(filePath, 'function test() { return 1; }');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Change (incremental parse)
      await writeFile(filePath, 'function test() { return 42; }');
      await new Promise(resolve => setTimeout(resolve, 500));

      const stats = watcher.getStats();

      expect(stats.fullAnalyses).toBeGreaterThan(0);
      expect(stats.incrementalAnalyses).toBeGreaterThan(0);
    });
  });

  describe('Event Emitters', () => {
    it('should emit ready event', async () => {
      watcher = new FileWatcherService({
        paths: testDir
      });

      let readyEmitted = false;
      watcher.on('ready', () => {
        readyEmitted = true;
      });

      await watcher.start();

      expect(readyEmitted).toBe(true);
    });

    it('should emit specific event types', async () => {
      watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnAdd: false
      });

      let addedEmitted = false;
      watcher.on('added', (event) => {
        addedEmitted = true;
      });

      await watcher.start();

      const filePath = join(testDir, 'specific.ts');
      await writeFile(filePath, 'function test() {}');

      await new Promise(resolve => setTimeout(resolve, 500));

      expect(addedEmitted).toBe(true);
    });
  });

  describe('Manual Analysis', () => {
    it('should support manual file analysis', async () => {
      const filePath = join(testDir, 'manual.ts');
      await writeFile(
        filePath,
        `
          function greet(name: string) {
            return \`Hello, \${name}!\`;
          }
        `
      );

      watcher = new FileWatcherService({
        paths: testDir,
        analyzeOnAdd: false
      });

      await watcher.start();

      const analysis = await watcher.analyzeFileManually(filePath);

      expect(analysis).toBeDefined();
      expect(analysis?.functions.length).toBeGreaterThan(0);
    });
  });

  describe('Watched Files', () => {
    it('should track watched files', async () => {
      const file1 = join(testDir, 'file1.ts');
      const file2 = join(testDir, 'file2.ts');

      await writeFile(file1, 'function test1() {}');
      await writeFile(file2, 'function test2() {}');

      watcher = new FileWatcherService({
        paths: testDir
      });

      await watcher.start();
      await new Promise(resolve => setTimeout(resolve, 500));

      const watchedFiles = watcher.getWatchedFiles();

      expect(watchedFiles).toContain(file1);
      expect(watchedFiles).toContain(file2);
    });

    it('should remove deleted files from watch list', async () => {
      const filePath = join(testDir, 'remove.ts');
      await writeFile(filePath, 'function test() {}');

      watcher = new FileWatcherService({
        paths: testDir
      });

      await watcher.start();
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(watcher.getWatchedFiles()).toContain(filePath);

      await unlink(filePath);
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(watcher.getWatchedFiles()).not.toContain(filePath);
    });
  });
});
