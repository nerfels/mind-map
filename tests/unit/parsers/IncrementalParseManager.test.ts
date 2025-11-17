/**
 * Tests for IncrementalParseManager
 *
 * Demonstrates incremental parsing performance improvements
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  IncrementalParseManager,
  getIncrementalParseManager,
  resetIncrementalParseManager
} from '../../../src/core/parsers/IncrementalParseManager.js';
import { SupportedLanguage } from '../../../src/core/parsers/TreeSitterParser.js';

describe('IncrementalParseManager', () => {
  let manager: IncrementalParseManager;

  beforeEach(() => {
    resetIncrementalParseManager();
    manager = new IncrementalParseManager(50);
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await manager.initialize();
      expect(manager.getCacheSize()).toBe(0);
      expect(manager.getMaxCacheSize()).toBe(50);
    });

    it('should use singleton instance', () => {
      const instance1 = getIncrementalParseManager();
      const instance2 = getIncrementalParseManager();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Full Parsing', () => {
    it('should perform full parse on first call', async () => {
      const code = `
        function greet(name: string): string {
          return \`Hello, \${name}!\`;
        }
      `;

      const result = await manager.parse('test.ts', code, SupportedLanguage.TYPESCRIPT);

      expect(result.hasErrors).toBe(false);
      expect(result.parseTime).toBeGreaterThan(0);
      expect(manager.getCacheSize()).toBe(1);
      expect(manager.isCached('test.ts')).toBe(true);

      const stats = manager.getStats();
      expect(stats.totalParses).toBe(1);
      expect(stats.fullParses).toBe(1);
      expect(stats.incrementalParses).toBe(0);
    });

    it('should cache parse tree', async () => {
      const code = `function test() { return 42; }`;

      await manager.parse('test.ts', code, SupportedLanguage.TYPESCRIPT);

      const cached = manager.getCached('test.ts');
      expect(cached).toBeDefined();
      expect(cached?.content).toBe(code);
      expect(cached?.language).toBe(SupportedLanguage.TYPESCRIPT);
    });
  });

  describe('Incremental Parsing', () => {
    it('should perform incremental parse on subsequent calls', async () => {
      const originalCode = `
        function greet(name: string): string {
          return \`Hello, \${name}!\`;
        }
      `;

      const modifiedCode = `
        function greet(name: string): string {
          return \`Hello, \${name}! Welcome!\`;
        }
      `;

      // First parse (full)
      await manager.parse('test.ts', originalCode, SupportedLanguage.TYPESCRIPT);

      // Second parse (incremental)
      const result = await manager.parse('test.ts', modifiedCode, SupportedLanguage.TYPESCRIPT);

      expect(result.hasErrors).toBe(false);

      const stats = manager.getStats();
      expect(stats.totalParses).toBe(2);
      expect(stats.fullParses).toBe(1);
      expect(stats.incrementalParses).toBe(1);
    });

    it('should be faster than full parse', async () => {
      const originalCode = `
        function add(a: number, b: number): number {
          return a + b;
        }

        function subtract(a: number, b: number): number {
          return a - b;
        }

        function multiply(a: number, b: number): number {
          return a * b;
        }
      `;

      const modifiedCode = originalCode.replace('return a + b', 'return a + b + 1');

      // First parse (full)
      await manager.parse('math.ts', originalCode, SupportedLanguage.TYPESCRIPT);

      // Second parse (incremental)
      await manager.parse('math.ts', modifiedCode, SupportedLanguage.TYPESCRIPT);

      const stats = manager.getStats();
      expect(stats.averageIncrementalTime).toBeLessThan(stats.averageFullTime);
    });

    it('should handle multiple small edits efficiently', async () => {
      let code = `function test() { return 1; }`;

      // First parse
      await manager.parse('test.ts', code, SupportedLanguage.TYPESCRIPT);

      // Multiple incremental updates
      for (let i = 2; i <= 10; i++) {
        code = `function test() { return ${i}; }`;
        await manager.parse('test.ts', code, SupportedLanguage.TYPESCRIPT);
      }

      const stats = manager.getStats();
      expect(stats.totalParses).toBe(10);
      expect(stats.fullParses).toBe(1);
      expect(stats.incrementalParses).toBe(9);
      expect(stats.cacheHitRate).toBeCloseTo(0.9, 1);
    });

    it('should handle line insertions', async () => {
      const originalCode = `
function first() {
  return 1;
}

function second() {
  return 2;
}
      `.trim();

      const modifiedCode = `
function first() {
  return 1;
}

function middle() {
  return 1.5;
}

function second() {
  return 2;
}
      `.trim();

      await manager.parse('test.ts', originalCode, SupportedLanguage.TYPESCRIPT);
      const result = await manager.parse('test.ts', modifiedCode, SupportedLanguage.TYPESCRIPT);

      expect(result.hasErrors).toBe(false);

      const stats = manager.getStats();
      expect(stats.incrementalParses).toBe(1);
    });

    it('should handle line deletions', async () => {
      const originalCode = `
function first() {
  return 1;
}

function middle() {
  return 1.5;
}

function second() {
  return 2;
}
      `.trim();

      const modifiedCode = `
function first() {
  return 1;
}

function second() {
  return 2;
}
      `.trim();

      await manager.parse('test.ts', originalCode, SupportedLanguage.TYPESCRIPT);
      const result = await manager.parse('test.ts', modifiedCode, SupportedLanguage.TYPESCRIPT);

      expect(result.hasErrors).toBe(false);

      const stats = manager.getStats();
      expect(stats.incrementalParses).toBe(1);
    });
  });

  describe('Cache Management', () => {
    it('should respect cache size limit', async () => {
      const smallManager = new IncrementalParseManager(3);

      // Add 5 files
      for (let i = 1; i <= 5; i++) {
        await smallManager.parse(
          `file${i}.ts`,
          `function test${i}() { return ${i}; }`,
          SupportedLanguage.TYPESCRIPT
        );
      }

      // Cache should contain only 3 entries
      expect(smallManager.getCacheSize()).toBe(3);
    });

    it('should evict least recently used entries', async () => {
      const smallManager = new IncrementalParseManager(2);

      // Add file1
      await smallManager.parse(
        'file1.ts',
        'function test1() { return 1; }',
        SupportedLanguage.TYPESCRIPT
      );

      // Add file2
      await smallManager.parse(
        'file2.ts',
        'function test2() { return 2; }',
        SupportedLanguage.TYPESCRIPT
      );

      // Access file1 (makes it more recently used)
      await smallManager.parse(
        'file1.ts',
        'function test1() { return 1; }',
        SupportedLanguage.TYPESCRIPT
      );

      // Add file3 (should evict file2, not file1)
      await smallManager.parse(
        'file3.ts',
        'function test3() { return 3; }',
        SupportedLanguage.TYPESCRIPT
      );

      expect(smallManager.isCached('file1.ts')).toBe(true);
      expect(smallManager.isCached('file2.ts')).toBe(false);
      expect(smallManager.isCached('file3.ts')).toBe(true);
    });

    it('should clear cache for specific file', async () => {
      await manager.parse(
        'test.ts',
        'function test() { return 1; }',
        SupportedLanguage.TYPESCRIPT
      );

      expect(manager.isCached('test.ts')).toBe(true);

      manager.clearCache('test.ts');

      expect(manager.isCached('test.ts')).toBe(false);
    });

    it('should clear all cache', async () => {
      await manager.parse(
        'file1.ts',
        'function test1() { return 1; }',
        SupportedLanguage.TYPESCRIPT
      );
      await manager.parse(
        'file2.ts',
        'function test2() { return 2; }',
        SupportedLanguage.TYPESCRIPT
      );

      expect(manager.getCacheSize()).toBe(2);

      manager.clearAllCache();

      expect(manager.getCacheSize()).toBe(0);
    });

    it('should update cache size dynamically', async () => {
      manager.setMaxCacheSize(2);

      await manager.parse('file1.ts', 'code1', SupportedLanguage.TYPESCRIPT);
      await manager.parse('file2.ts', 'code2', SupportedLanguage.TYPESCRIPT);
      await manager.parse('file3.ts', 'code3', SupportedLanguage.TYPESCRIPT);

      expect(manager.getCacheSize()).toBe(2);
      expect(manager.getMaxCacheSize()).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should track parsing statistics', async () => {
      const code1 = 'function test1() { return 1; }';
      const code2 = 'function test2() { return 2; }';

      // First parse
      await manager.parse('test.ts', code1, SupportedLanguage.TYPESCRIPT);

      // Incremental parse
      await manager.parse('test.ts', code2, SupportedLanguage.TYPESCRIPT);

      const stats = manager.getStats();

      expect(stats.totalParses).toBe(2);
      expect(stats.fullParses).toBe(1);
      expect(stats.incrementalParses).toBe(1);
      expect(stats.averageFullTime).toBeGreaterThan(0);
      expect(stats.averageIncrementalTime).toBeGreaterThan(0);
      expect(stats.cacheHitRate).toBe(0.5);
      expect(stats.cacheSize).toBe(1);
    });

    it('should reset statistics', async () => {
      await manager.parse(
        'test.ts',
        'function test() { return 1; }',
        SupportedLanguage.TYPESCRIPT
      );

      manager.resetStats();

      const stats = manager.getStats();
      expect(stats.totalParses).toBe(0);
      expect(stats.fullParses).toBe(0);
      expect(stats.incrementalParses).toBe(0);
    });

    it('should calculate cache hit rate correctly', async () => {
      const code = 'function test() { return 1; }';

      // 1 full parse
      await manager.parse('test.ts', code, SupportedLanguage.TYPESCRIPT);

      // 9 incremental parses
      for (let i = 2; i <= 10; i++) {
        await manager.parse(
          'test.ts',
          `function test() { return ${i}; }`,
          SupportedLanguage.TYPESCRIPT
        );
      }

      const stats = manager.getStats();
      expect(stats.cacheHitRate).toBeCloseTo(0.9, 2);
    });
  });

  describe('Multi-Language Support', () => {
    it('should handle different languages', async () => {
      await manager.parse(
        'test.ts',
        'function test() {}',
        SupportedLanguage.TYPESCRIPT
      );
      await manager.parse(
        'test.py',
        'def test():\n    pass',
        SupportedLanguage.PYTHON
      );
      await manager.parse(
        'test.go',
        'func test() {}',
        SupportedLanguage.GO
      );

      expect(manager.getCacheSize()).toBe(3);
      expect(manager.isCached('test.ts')).toBe(true);
      expect(manager.isCached('test.py')).toBe(true);
      expect(manager.isCached('test.go')).toBe(true);
    });

    it('should perform incremental parse for Python', async () => {
      const original = 'def greet(name):\n    return "Hello"';
      const modified = 'def greet(name):\n    return "Hello, " + name';

      await manager.parse('test.py', original, SupportedLanguage.PYTHON);
      await manager.parse('test.py', modified, SupportedLanguage.PYTHON);

      const stats = manager.getStats();
      expect(stats.incrementalParses).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle syntax errors in incremental parse', async () => {
      const valid = 'function test() { return 1; }';
      const invalid = 'function test( { return 1; }';

      await manager.parse('test.ts', valid, SupportedLanguage.TYPESCRIPT);
      const result = await manager.parse('test.ts', invalid, SupportedLanguage.TYPESCRIPT);

      expect(result.hasErrors).toBe(true);
    });

    it('should throw error for unsupported file type', async () => {
      await expect(
        manager.parse('test.unknown', 'some code', undefined)
      ).rejects.toThrow('Cannot detect language');
    });
  });

  describe('Performance Comparison', () => {
    it('should demonstrate incremental parsing speed advantage', async () => {
      // Large file
      const functions = Array.from({ length: 50 }, (_, i) => `
        function func${i}(param: number): number {
          return param * ${i};
        }
      `).join('\n');

      // Full parse
      const fullStart = Date.now();
      await manager.parse('large.ts', functions, SupportedLanguage.TYPESCRIPT);
      const fullTime = Date.now() - fullStart;

      // Small edit
      const modified = functions.replace('param * 0', 'param * 100');

      // Incremental parse
      const incStart = Date.now();
      await manager.parse('large.ts', modified, SupportedLanguage.TYPESCRIPT);
      const incTime = Date.now() - incStart;

      // Incremental should be significantly faster
      expect(incTime).toBeLessThan(fullTime);

      const stats = manager.getStats();
      console.log('Performance comparison:');
      console.log(`  Full parse: ${stats.averageFullTime.toFixed(2)}ms`);
      console.log(`  Incremental parse: ${stats.averageIncrementalTime.toFixed(2)}ms`);
      console.log(
        `  Speedup: ${(stats.averageFullTime / stats.averageIncrementalTime).toFixed(1)}x`
      );
    });
  });
});
