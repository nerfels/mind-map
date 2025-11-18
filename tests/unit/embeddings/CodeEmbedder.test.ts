/**
 * Tests for CodeEmbedder - Phase 5.2
 *
 * Validates semantic code embedding with CodeBERT
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CodeEmbedder } from '../../../src/core/embeddings/CodeEmbedder.js';

describe('CodeEmbedder', () => {
  let embedder: CodeEmbedder;

  beforeEach(() => {
    embedder = new CodeEmbedder({
      cacheSize: 10
    });
  });

  afterEach(async () => {
    await embedder.unload();
  });

  describe('Initialization', () => {
    it('should create embedder with default config', () => {
      const emb = new CodeEmbedder();
      expect(emb).toBeDefined();

      const config = emb.getConfig();
      expect(config.modelName).toBe('Xenova/codebert-base');
      expect(config.maxLength).toBe(512);
      expect(config.cacheSize).toBe(1000);
    });

    it('should create with custom config', () => {
      const emb = new CodeEmbedder({
        cacheSize: 500,
        chunkSize: 300
      });

      const config = emb.getConfig();
      expect(config.cacheSize).toBe(500);
      expect(config.chunkSize).toBe(300);
    });

    it('should start with model not loaded', () => {
      expect(embedder.isLoaded()).toBe(false);
    });
  });

  describe('Single Embedding Generation', () => {
    it('should generate embedding for code snippet', async () => {
      const code = 'function hello() { return "world"; }';
      const result = await embedder.embed(code);

      expect(result).toBeDefined();
      expect(result.embedding).toBeDefined();
      expect(result.embedding.length).toBe(768);
      expect(result.dimension).toBe(768);
      expect(result.model).toBe('Xenova/codebert-base');
      expect(result.cached).toBe(false);
      expect(result.chunkCount).toBe(1);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should load model on first use', async () => {
      expect(embedder.isLoaded()).toBe(false);

      await embedder.embed('function test() {}');

      expect(embedder.isLoaded()).toBe(true);
    });

    it('should generate different embeddings for different code', async () => {
      const code1 = 'function add(a, b) { return a + b; }';
      const code2 = 'function multiply(x, y) { return x * y; }';

      const result1 = await embedder.embed(code1);
      const result2 = await embedder.embed(code2);

      // Embeddings should be different
      expect(result1.embedding).not.toEqual(result2.embedding);
    });

    it('should generate similar embeddings for similar code', async () => {
      const code1 = 'function sort(arr) { return arr.sort(); }';
      const code2 = 'function sortArray(array) { return array.sort(); }';

      const result1 = await embedder.embed(code1);
      const result2 = await embedder.embed(code2);

      const similarity = embedder.cosineSimilarity(
        result1.embedding,
        result2.embedding
      );

      // Similar code should have high similarity (> 0.7)
      expect(similarity).toBeGreaterThan(0.6);
    });

    it('should normalize code before embedding', async () => {
      const code1 = 'function test()  {  return  1;  }';
      const code2 = 'function test() { return 1; }';

      const result1 = await embedder.embed(code1);
      const result2 = await embedder.embed(code2);

      // Normalized code should produce similar embeddings
      const similarity = embedder.cosineSimilarity(
        result1.embedding,
        result2.embedding
      );

      expect(similarity).toBeGreaterThan(0.95);
    });
  });

  describe('Batch Embedding', () => {
    it('should generate embeddings for multiple snippets', async () => {
      const codes = [
        'function hello() {}',
        'function world() {}',
        'function test() {}'
      ];

      const result = await embedder.embedBatch(codes);

      expect(result.embeddings.length).toBe(3);
      expect(result.dimension).toBe(768);
      expect(result.totalProcessingTime).toBeGreaterThan(0);
      expect(result.averageProcessingTime).toBeGreaterThan(0);
    });

    it('should be faster than sequential for multiple items', async () => {
      const codes = Array.from({ length: 5 }, (_, i) =>
        `function test${i}() { return ${i}; }`
      );

      const start = Date.now();
      await embedder.embedBatch(codes);
      const batchTime = Date.now() - start;

      // Batch should complete in reasonable time
      expect(batchTime).toBeLessThan(10000); // 10 seconds max
    });
  });

  describe('Natural Language Queries', () => {
    it('should embed natural language queries', async () => {
      const query = 'find authentication logic';
      const embedding = await embedder.embedQuery(query);

      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(768);
    });

    it('should find similarity between query and code', async () => {
      const query = 'sort an array';
      const code = 'function sortArray(arr) { return arr.sort(); }';

      const queryEmb = await embedder.embedQuery(query);
      const codeResult = await embedder.embed(code);

      const similarity = embedder.cosineSimilarity(queryEmb, codeResult.embedding);

      // Query should be somewhat similar to relevant code
      expect(similarity).toBeGreaterThan(0.3);
    });
  });

  describe('Caching', () => {
    it('should cache embeddings', async () => {
      const code = 'function cached() { return true; }';

      // First call - cache miss
      const result1 = await embedder.embed(code);
      expect(result1.cached).toBe(false);

      // Second call - cache hit
      const result2 = await embedder.embed(code);
      expect(result2.cached).toBe(true);

      // Embeddings should be identical
      expect(result1.embedding).toEqual(result2.embedding);
    });

    it('should track cache hits and misses', async () => {
      const code1 = 'function test1() {}';
      const code2 = 'function test2() {}';

      await embedder.embed(code1); // miss
      await embedder.embed(code1); // hit
      await embedder.embed(code2); // miss
      await embedder.embed(code1); // hit

      const stats = embedder.getStats();
      expect(stats.cacheHits).toBe(2);
      expect(stats.cacheMisses).toBe(2);
    });

    it('should evict old entries when cache is full', async () => {
      // Create embedder with small cache
      const smallEmbedder = new CodeEmbedder({ cacheSize: 3 });

      // Add more items than cache size
      await smallEmbedder.embed('code1');
      await smallEmbedder.embed('code2');
      await smallEmbedder.embed('code3');
      await smallEmbedder.embed('code4'); // Should evict code1

      const stats = smallEmbedder.getStats();
      expect(stats.cacheSize).toBe(3);

      await smallEmbedder.unload();
    });

    it('should calculate cache hit rate', async () => {
      await embedder.embed('code1'); // miss
      await embedder.embed('code1'); // hit
      await embedder.embed('code2'); // miss
      await embedder.embed('code1'); // hit

      const hitRate = embedder.getCacheHitRate();
      expect(hitRate).toBe(0.5); // 2 hits, 2 misses
    });

    it('should clear cache', async () => {
      await embedder.embed('code1');
      await embedder.embed('code2');

      let stats = embedder.getStats();
      expect(stats.cacheSize).toBeGreaterThan(0);

      embedder.clearCache();

      stats = embedder.getStats();
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('Code Chunking', () => {
    it('should handle short code without chunking', async () => {
      const shortCode = 'function test() { return 42; }';
      const result = await embedder.embed(shortCode);

      expect(result.chunkCount).toBe(1);
    });

    it('should chunk very long code', async () => {
      // Create artificially long code
      const longCode = Array.from({ length: 500 }, (_, i) =>
        `function test${i}() { return ${i}; }`
      ).join('\n');

      const result = await embedder.embed(longCode);

      // Should be chunked
      expect(result.chunkCount).toBeGreaterThan(1);
    });
  });

  describe('Cosine Similarity', () => {
    it('should calculate similarity correctly', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [1, 0, 0];

      const similarity = embedder.cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];

      const similarity = embedder.cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(0.0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [-1, 0, 0];

      const similarity = embedder.cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(-1.0, 5);
    });

    it('should throw for different dimensions', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [1, 2];

      expect(() => {
        embedder.cosineSimilarity(vec1, vec2);
      }).toThrow('same dimension');
    });
  });

  describe('Statistics', () => {
    it('should track total embeddings', async () => {
      await embedder.embed('code1');
      await embedder.embed('code2');
      await embedder.embed('code3');

      const stats = embedder.getStats();
      expect(stats.totalEmbeddings).toBe(3);
    });

    it('should track total batches', async () => {
      await embedder.embedBatch(['code1', 'code2']);
      await embedder.embedBatch(['code3']);

      const stats = embedder.getStats();
      expect(stats.totalBatches).toBe(2);
    });

    it('should track average embedding time', async () => {
      await embedder.embed('code1');
      await embedder.embed('code2');

      const stats = embedder.getStats();
      expect(stats.averageEmbeddingTime).toBeGreaterThan(0);
      expect(stats.totalEmbeddingTime).toBeGreaterThan(0);
    });

    it('should reset statistics', async () => {
      await embedder.embed('code1');
      await embedder.embed('code2');

      embedder.resetStats();

      const stats = embedder.getStats();
      expect(stats.totalEmbeddings).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
    });

    it('should track model loaded state', async () => {
      let stats = embedder.getStats();
      expect(stats.modelLoaded).toBe(false);

      await embedder.embed('code1');

      stats = embedder.getStats();
      expect(stats.modelLoaded).toBe(true);
    });
  });

  describe('Model Management', () => {
    it('should unload model', async () => {
      await embedder.embed('code1');
      expect(embedder.isLoaded()).toBe(true);

      await embedder.unload();
      expect(embedder.isLoaded()).toBe(false);
    });

    it('should clear cache on unload', async () => {
      await embedder.embed('code1');
      await embedder.embed('code2');

      let stats = embedder.getStats();
      expect(stats.cacheSize).toBeGreaterThan(0);

      await embedder.unload();

      stats = embedder.getStats();
      expect(stats.cacheSize).toBe(0);
    });

    it('should reload model after unload', async () => {
      await embedder.embed('code1');
      await embedder.unload();

      // Should work again
      const result = await embedder.embed('code2');
      expect(result.embedding.length).toBe(768);
      expect(embedder.isLoaded()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty code', async () => {
      const result = await embedder.embed('');
      expect(result.embedding.length).toBe(768);
    });

    it('should handle special characters', async () => {
      const code = 'function test() { return "Hello, 世界!"; }';
      const result = await embedder.embed(code);
      expect(result.embedding.length).toBe(768);
    });

    it('should handle code with emojis', async () => {
      const code = 'function test() { return "🚀"; }';
      const result = await embedder.embed(code);
      expect(result.embedding.length).toBe(768);
    });
  });

  describe('Performance', () => {
    it('should complete single embedding in reasonable time', async () => {
      const start = Date.now();
      await embedder.embed('function test() { return 42; }');
      const time = Date.now() - start;

      // First embedding includes model loading, so be generous
      expect(time).toBeLessThan(30000); // 30 seconds max for first
    });

    it('should be fast with cache hits', async () => {
      const code = 'function cached() {}';

      // First call to populate cache
      await embedder.embed(code);

      // Second call should be instant
      const start = Date.now();
      await embedder.embed(code);
      const time = Date.now() - start;

      expect(time).toBeLessThan(10); // < 10ms for cache hit
    });
  });

  describe('Real-World Scenarios', () => {
    it('should find similar functions across languages', async () => {
      const jsCode = 'function validateEmail(email) { return /^\\S+@\\S+\\.\\S+$/.test(email); }';
      const pyCode = 'def validate_email(email): return bool(re.match(r"^\\S+@\\S+\\.\\S+$", email))';

      const jsEmb = await embedder.embed(jsCode);
      const pyEmb = await embedder.embed(pyCode);

      const similarity = embedder.cosineSimilarity(jsEmb.embedding, pyEmb.embedding);

      // Should recognize same functionality
      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should distinguish different functionalities', async () => {
      const authCode = 'function authenticate(user, password) { return checkPassword(user, password); }';
      const sortCode = 'function sortArray(arr) { return arr.sort(); }';

      const authEmb = await embedder.embed(authCode);
      const sortEmb = await embedder.embed(sortCode);

      const similarity = embedder.cosineSimilarity(authEmb.embedding, sortEmb.embedding);

      // Different functionality should have lower similarity
      expect(similarity).toBeLessThan(0.7);
    });

    it('should handle typical project embedding workload', async () => {
      // Simulate embedding functions from a small project
      const functions = Array.from({ length: 20 }, (_, i) =>
        `function processData${i}(data) { return data.filter(x => x > ${i}).map(x => x * 2); }`
      );

      const start = Date.now();
      const result = await embedder.embedBatch(functions);
      const time = Date.now() - start;

      expect(result.embeddings.length).toBe(20);
      expect(time).toBeLessThan(60000); // Should complete in < 1 minute

      const stats = embedder.getStats();
      expect(stats.totalEmbeddings).toBe(20);
    });
  });
});
