/**
 * Tests for VectorStore - Phase 5.3
 *
 * Validates vector storage and similarity search
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VectorStore } from '../../../src/core/embeddings/VectorStore.js';
import { rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('VectorStore', () => {
  let store: VectorStore;
  let testDir: string;

  beforeEach(() => {
    store = new VectorStore({ dimension: 768 });
    testDir = join(tmpdir(), 'vector-store-test-' + Date.now());
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    it('should create vector store with default config', () => {
      const vs = new VectorStore();
      expect(vs).toBeDefined();

      const config = vs.getConfig();
      expect(config.dimension).toBe(768);
      expect(config.maxElements).toBe(100000);
      expect(config.space).toBe('cosine');
    });

    it('should create with custom config', () => {
      const vs = new VectorStore({
        dimension: 384,
        maxElements: 1000,
        space: 'l2'
      });

      const config = vs.getConfig();
      expect(config.dimension).toBe(384);
      expect(config.maxElements).toBe(1000);
      expect(config.space).toBe('l2');
    });

    it('should start empty', () => {
      expect(store.size()).toBe(0);
      expect(store.getAllIds()).toEqual([]);
    });
  });

  describe('Adding Vectors', () => {
    it('should add a single vector', async () => {
      const embedding = new Array(768).fill(0).map(() => Math.random());
      const metadata = {
        filePath: 'test.ts',
        functionName: 'testFunc',
        language: 'typescript'
      };

      await store.add('test1', embedding, metadata);

      expect(store.size()).toBe(1);
      expect(store.has('test1')).toBe(true);
    });

    it('should retrieve added vector', async () => {
      const embedding = new Array(768).fill(0).map(() => Math.random());
      const metadata = {
        filePath: 'test.ts',
        functionName: 'testFunc'
      };

      await store.add('test1', embedding, metadata);

      const retrieved = await store.get('test1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.embedding).toEqual(embedding);
      expect(retrieved!.metadata.functionName).toBe('testFunc');
    });

    it('should add multiple vectors', async () => {
      for (let i = 0; i < 10; i++) {
        const embedding = new Array(768).fill(0).map(() => Math.random());
        await store.add(`vec${i}`, embedding, { index: i });
      }

      expect(store.size()).toBe(10);
      expect(store.getAllIds().length).toBe(10);
    });

    it('should add vectors in batch', async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: `batch${i}`,
        embedding: new Array(768).fill(0).map(() => Math.random()),
        metadata: { index: i }
      }));

      await store.addBatch(items);

      expect(store.size()).toBe(10);
    });

    it('should update existing vector', async () => {
      const emb1 = new Array(768).fill(0).map(() => Math.random());
      const emb2 = new Array(768).fill(0).map(() => Math.random());

      await store.add('test1', emb1, { version: 1 });
      await store.add('test1', emb2, { version: 2 });

      expect(store.size()).toBe(1);

      const retrieved = await store.get('test1');
      expect(retrieved!.embedding).toEqual(emb2);
      expect(retrieved!.metadata.version).toBe(2);
    });

    it('should reject wrong dimension', async () => {
      const wrongDim = new Array(384).fill(0).map(() => Math.random());

      await expect(async () => {
        await store.add('test1', wrongDim);
      }).rejects.toThrow('dimension');
    });

    it('should store metadata with timestamp', async () => {
      const embedding = new Array(768).fill(0).map(() => Math.random());

      await store.add('test1', embedding, { functionName: 'test' });

      const retrieved = await store.get('test1');
      expect(retrieved!.metadata.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Similarity Search', () => {
    beforeEach(async () => {
      // Add some test vectors
      // Create vectors that are similar to each other in groups
      for (let i = 0; i < 20; i++) {
        const base = i < 10 ? 0.5 : -0.5; // Two groups
        const embedding = new Array(768).fill(0).map(() =>
          base + Math.random() * 0.1
        );

        await store.add(`vec${i}`, embedding, {
          group: i < 10 ? 'A' : 'B',
          index: i
        });
      }
    });

    it('should find similar vectors', async () => {
      // Query with a vector similar to group A
      const queryEmb = new Array(768).fill(0).map(() => 0.5 + Math.random() * 0.1);

      const results = await store.search(queryEmb, 5);

      expect(results.length).toBe(5);
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].metadata).toBeDefined();

      // Most results should be from group A
      const groupA = results.filter(r => r.metadata.group === 'A').length;
      expect(groupA).toBeGreaterThan(2);
    });

    it('should return results sorted by similarity', async () => {
      const queryEmb = new Array(768).fill(0).map(() => 0.5 + Math.random() * 0.1);

      const results = await store.search(queryEmb, 10);

      // Scores should be in descending order
      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
      }
    });

    it('should respect k parameter', async () => {
      const queryEmb = new Array(768).fill(0).map(() => Math.random());

      const results3 = await store.search(queryEmb, 3);
      expect(results3.length).toBe(3);

      const results10 = await store.search(queryEmb, 10);
      expect(results10.length).toBe(10);
    });

    it('should filter results', async () => {
      const queryEmb = new Array(768).fill(0).map(() => 0.5 + Math.random() * 0.1);

      // Filter to only group B
      const results = await store.search(
        queryEmb,
        10,
        (meta) => meta.group === 'B'
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.metadata.group === 'B')).toBe(true);
    });

    it('should find exact match with high score', async () => {
      const embedding = new Array(768).fill(0).map(() => Math.random());

      await store.add('exact', embedding);

      const results = await store.search(embedding, 5);

      const exactMatch = results.find(r => r.id === 'exact');
      expect(exactMatch).toBeDefined();
      expect(exactMatch!.score).toBeGreaterThan(0.99);
    });

    it('should reject wrong query dimension', async () => {
      const wrongDim = new Array(384).fill(0).map(() => Math.random());

      await expect(async () => {
        await store.search(wrongDim, 5);
      }).rejects.toThrow('dimension');
    });
  });

  describe('Vector Removal', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        const embedding = new Array(768).fill(0).map(() => Math.random());
        await store.add(`vec${i}`, embedding);
      }
    });

    it('should remove a vector', async () => {
      expect(store.has('vec0')).toBe(true);

      const removed = await store.remove('vec0');

      expect(removed).toBe(true);
      expect(store.has('vec0')).toBe(false);
      expect(store.size()).toBe(4);
    });

    it('should return false for non-existent vector', async () => {
      const removed = await store.remove('nonexistent');
      expect(removed).toBe(false);
    });

    it('should not find removed vector', async () => {
      await store.remove('vec0');

      const retrieved = await store.get('vec0');
      expect(retrieved).toBeNull();
    });
  });

  describe('Clear and Reset', () => {
    beforeEach(async () => {
      for (let i = 0; i < 10; i++) {
        const embedding = new Array(768).fill(0).map(() => Math.random());
        await store.add(`vec${i}`, embedding);
      }
    });

    it('should clear all vectors', async () => {
      expect(store.size()).toBe(10);

      await store.clear();

      expect(store.size()).toBe(0);
      expect(store.getAllIds()).toEqual([]);
    });

    it('should work after clear', async () => {
      await store.clear();

      const embedding = new Array(768).fill(0).map(() => Math.random());
      await store.add('new', embedding);

      expect(store.size()).toBe(1);
      expect(store.has('new')).toBe(true);
    });
  });

  describe('Persistence', () => {
    it('should save and load', async () => {
      // Add some vectors
      for (let i = 0; i < 10; i++) {
        const embedding = new Array(768).fill(0).map(() => Math.random());
        await store.add(`vec${i}`, embedding, {
          index: i,
          name: `Vector ${i}`
        });
      }

      const sizeBefore = store.size();

      // Save
      const path = join(testDir, 'test-store');
      await store.save(path);

      // Create new store and load
      const newStore = new VectorStore({ dimension: 768 });
      await newStore.load(path);

      expect(newStore.size()).toBe(sizeBefore);
      expect(newStore.getAllIds().sort()).toEqual(store.getAllIds().sort());

      // Check metadata preserved
      const retrieved = await newStore.get('vec5');
      expect(retrieved).toBeDefined();
      expect(retrieved!.metadata.index).toBe(5);
      expect(retrieved!.metadata.name).toBe('Vector 5');
    });

    it('should preserve search capability after load', async () => {
      // Add vectors
      const testEmb = new Array(768).fill(0).map(() => 0.5 + Math.random() * 0.1);
      await store.add('test', testEmb);

      for (let i = 0; i < 10; i++) {
        const emb = new Array(768).fill(0).map(() => -0.5 + Math.random() * 0.1);
        await store.add(`other${i}`, emb);
      }

      // Save and reload
      const path = join(testDir, 'search-test');
      await store.save(path);

      const newStore = new VectorStore({ dimension: 768 });
      await newStore.load(path);

      // Search should work
      const results = await newStore.search(testEmb, 3);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('test'); // Should find the matching vector
    });

    it('should throw if files not found', async () => {
      const newStore = new VectorStore({ dimension: 768 });

      await expect(async () => {
        await newStore.load(join(testDir, 'nonexistent'));
      }).rejects.toThrow('not found');
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      for (let i = 0; i < 10; i++) {
        const embedding = new Array(768).fill(0).map(() => Math.random());
        await store.add(`vec${i}`, embedding);
      }
    });

    it('should track vector count', () => {
      const stats = store.getStats();
      expect(stats.totalVectors).toBe(10);
    });

    it('should track search count', async () => {
      const queryEmb = new Array(768).fill(0).map(() => Math.random());

      await store.search(queryEmb, 5);
      await store.search(queryEmb, 5);

      const stats = store.getStats();
      expect(stats.searchCount).toBe(2);
    });

    it('should track average search time', async () => {
      const queryEmb = new Array(768).fill(0).map(() => Math.random());

      await store.search(queryEmb, 5);
      await store.search(queryEmb, 5);
      await store.search(queryEmb, 5);

      const stats = store.getStats();
      expect(stats.averageSearchTime).toBeGreaterThan(0);
    });

    it('should estimate memory usage', () => {
      const stats = store.getStats();
      expect(stats.memoryUsage).toBeGreaterThan(0);

      // Should be roughly: 10 vectors * 768 dims * 4 bytes + overhead
      expect(stats.memoryUsage).toBeGreaterThan(10 * 768 * 4);
    });

    it('should reset statistics', async () => {
      const queryEmb = new Array(768).fill(0).map(() => Math.random());
      await store.search(queryEmb, 5);

      store.resetStats();

      const stats = store.getStats();
      expect(stats.searchCount).toBe(0);
      expect(stats.averageSearchTime).toBe(0);
    });
  });

  describe('Utility Functions', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        const embedding = new Array(768).fill(0).map(() => Math.random());
        await store.add(`vec${i}`, embedding, {
          index: i,
          group: i % 2 === 0 ? 'even' : 'odd'
        });
      }
    });

    it('should get all IDs', () => {
      const ids = store.getAllIds();
      expect(ids.length).toBe(5);
      expect(ids).toContain('vec0');
      expect(ids).toContain('vec4');
    });

    it('should get all metadata', () => {
      const allMeta = store.getAllMetadata();
      expect(allMeta.length).toBe(5);
      expect(allMeta.every(m => m.id)).toBe(true);
      expect(allMeta.every(m => m.createdAt)).toBe(true);
    });

    it('should check existence', () => {
      expect(store.has('vec0')).toBe(true);
      expect(store.has('vec99')).toBe(false);
    });
  });

  describe('Duplicate Detection', () => {
    it('should find duplicate vectors', async () => {
      // Add similar vectors
      const baseEmb = new Array(768).fill(0).map(() => Math.random());

      await store.add('original', baseEmb);

      // Add near-duplicate
      const nearDup = baseEmb.map(v => v + Math.random() * 0.01);
      await store.add('duplicate', nearDup);

      // Add different vector
      const different = new Array(768).fill(0).map(() => Math.random());
      await store.add('different', different);

      const duplicates = await store.findDuplicates(0.95);

      expect(duplicates.length).toBeGreaterThan(0);

      const found = duplicates.find(
        d => (d.id1 === 'original' && d.id2 === 'duplicate') ||
             (d.id1 === 'duplicate' && d.id2 === 'original')
      );

      expect(found).toBeDefined();
      expect(found!.similarity).toBeGreaterThan(0.95);
    });

    it('should sort duplicates by similarity', async () => {
      // Add vectors with varying similarity
      const base = new Array(768).fill(0).map(() => Math.random());

      await store.add('base', base);
      await store.add('very_similar', base.map(v => v + Math.random() * 0.001));
      await store.add('somewhat_similar', base.map(v => v + Math.random() * 0.01));

      const duplicates = await store.findDuplicates(0.90);

      // Should be sorted by similarity descending
      for (let i = 1; i < duplicates.length; i++) {
        expect(duplicates[i].similarity).toBeLessThanOrEqual(
          duplicates[i - 1].similarity
        );
      }
    });

    it('should respect threshold', async () => {
      const base = new Array(768).fill(0).map(() => Math.random());

      await store.add('base', base);
      await store.add('similar', base.map(v => v + Math.random() * 0.01));
      await store.add('different', new Array(768).fill(0).map(() => Math.random()));

      const strict = await store.findDuplicates(0.99);
      const loose = await store.findDuplicates(0.80);

      expect(loose.length).toBeGreaterThanOrEqual(strict.length);
    });
  });

  describe('Performance', () => {
    it('should handle 1000 vectors efficiently', async () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        const embedding = new Array(768).fill(0).map(() => Math.random());
        await store.add(`vec${i}`, embedding);
      }

      const addTime = Date.now() - start;

      expect(store.size()).toBe(1000);
      expect(addTime).toBeLessThan(10000); // Should add 1000 in < 10 seconds
    });

    it('should search 1000 vectors quickly', async () => {
      // Add 1000 vectors
      for (let i = 0; i < 1000; i++) {
        const embedding = new Array(768).fill(0).map(() => Math.random());
        await store.add(`vec${i}`, embedding);
      }

      // Search
      const queryEmb = new Array(768).fill(0).map(() => Math.random());
      const start = Date.now();

      await store.search(queryEmb, 10);

      const searchTime = Date.now() - start;

      expect(searchTime).toBeLessThan(100); // Should search in < 100ms
    });

    it('should have fast cache hits', async () => {
      const embedding = new Array(768).fill(0).map(() => Math.random());
      await store.add('cached', embedding);

      const retrieved1 = await store.get('cached');

      const start = Date.now();
      const retrieved2 = await store.get('cached');
      const getTime = Date.now() - start;

      expect(getTime).toBeLessThan(10); // Should be very fast
      expect(retrieved1!.embedding).toEqual(retrieved2!.embedding);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty store search', async () => {
      const queryEmb = new Array(768).fill(0).map(() => Math.random());
      const results = await store.search(queryEmb, 5);

      expect(results).toEqual([]);
    });

    it('should handle k larger than store size', async () => {
      const embedding = new Array(768).fill(0).map(() => Math.random());
      await store.add('only', embedding);

      const results = await store.search(embedding, 100);

      expect(results.length).toBe(1);
    });

    it('should handle zero vector', async () => {
      const zeroEmb = new Array(768).fill(0);
      await store.add('zero', zeroEmb);

      expect(store.has('zero')).toBe(true);

      const results = await store.search(zeroEmb, 1);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle identical vectors', async () => {
      const emb = new Array(768).fill(0).map(() => Math.random());

      await store.add('dup1', emb);
      await store.add('dup2', emb);
      await store.add('dup3', emb);

      const results = await store.search(emb, 3);

      expect(results.length).toBe(3);
      expect(results.every(r => r.score > 0.99)).toBe(true);
    });
  });
});
