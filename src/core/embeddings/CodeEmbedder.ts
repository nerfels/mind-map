/**
 * CodeEmbedder - Phase 5.2
 *
 * Generates vector embeddings for code using microsoft/codebert-base model.
 *
 * Features:
 * - Lazy model loading (load on first use)
 * - Single and batch embedding generation
 * - LRU cache to avoid re-embedding
 * - Automatic chunking for long code
 * - Statistics tracking
 * - Supports code and natural language queries
 *
 * Based on research from Phase 5.1:
 * - Model: microsoft/codebert-base
 * - Embedding dimension: 768
 * - Context window: 512 tokens
 * - Performance: ~50ms per embedding, ~22ms with batching
 */

import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';

/**
 * Embedding result
 */
export interface EmbeddingResult {
  embedding: number[];
  dimension: number;
  model: string;
  cached: boolean;
  chunkCount: number;
  processingTime: number;
}

/**
 * Batch embedding result
 */
export interface BatchEmbeddingResult {
  embeddings: number[][];
  dimension: number;
  model: string;
  totalProcessingTime: number;
  averageProcessingTime: number;
  cacheHits: number;
  cacheMisses: number;
}

/**
 * CodeEmbedder configuration
 */
export interface CodeEmbedderConfig {
  modelName?: string;
  maxLength?: number;
  cacheSize?: number;
  chunkSize?: number;
  chunkOverlap?: number;
  device?: 'cpu' | 'gpu';
}

/**
 * Cache entry
 */
interface CacheEntry {
  embedding: number[];
  timestamp: number;
  accessCount: number;
}

/**
 * Statistics
 */
export interface EmbedderStats {
  totalEmbeddings: number;
  totalBatches: number;
  cacheHits: number;
  cacheMisses: number;
  averageEmbeddingTime: number;
  totalEmbeddingTime: number;
  modelLoaded: boolean;
  cacheSize: number;
  maxCacheSize: number;
}

/**
 * CodeEmbedder
 *
 * Generates semantic vector embeddings for code using CodeBERT.
 *
 * Example usage:
 * ```typescript
 * const embedder = new CodeEmbedder();
 *
 * // Embed a code snippet
 * const result = await embedder.embed('function hello() { return "world"; }');
 * console.log(result.embedding); // [0.23, -0.45, 0.67, ..., 0.12] (768 dims)
 *
 * // Embed multiple snippets efficiently
 * const batch = await embedder.embedBatch([code1, code2, code3]);
 * console.log(batch.embeddings.length); // 3
 *
 * // Natural language query
 * const query = await embedder.embedQuery('find authentication logic');
 * ```
 */
export class CodeEmbedder {
  private config: Required<CodeEmbedderConfig>;
  private pipeline?: FeatureExtractionPipeline;
  private cache: Map<string, CacheEntry> = new Map();
  private stats = {
    totalEmbeddings: 0,
    totalBatches: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalEmbeddingTime: 0
  };

  constructor(config: CodeEmbedderConfig = {}) {
    this.config = {
      modelName: config.modelName ?? 'Xenova/codebert-base',
      maxLength: config.maxLength ?? 512,
      cacheSize: config.cacheSize ?? 1000,
      chunkSize: config.chunkSize ?? 400,
      chunkOverlap: config.chunkOverlap ?? 50,
      device: config.device ?? 'cpu'
    };
  }

  /**
   * Initialize the model (lazy loading)
   */
  private async ensureModel(): Promise<void> {
    if (this.pipeline) {
      return;
    }

    try {
      this.pipeline = await pipeline(
        'feature-extraction',
        this.config.modelName
      );
    } catch (error) {
      throw new Error(`Failed to load CodeBERT model: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate embedding for a code snippet
   */
  async embed(code: string): Promise<EmbeddingResult> {
    const startTime = Date.now();

    // Normalize code
    const normalized = this.normalizeCode(code);

    // Check cache
    const cached = this.getFromCache(normalized);
    if (cached) {
      this.stats.cacheHits++;
      return {
        embedding: cached,
        dimension: 768,
        model: this.config.modelName,
        cached: true,
        chunkCount: 1,
        processingTime: Date.now() - startTime
      };
    }

    this.stats.cacheMisses++;

    // Ensure model is loaded
    await this.ensureModel();

    // Check if chunking needed
    const chunks = this.chunkCode(normalized);
    let embedding: number[];

    if (chunks.length === 1) {
      // Single chunk - direct embedding
      embedding = await this.generateEmbedding(chunks[0]);
    } else {
      // Multiple chunks - average embeddings
      const chunkEmbeddings = await Promise.all(
        chunks.map(chunk => this.generateEmbedding(chunk))
      );
      embedding = this.averageEmbeddings(chunkEmbeddings);
    }

    // Cache result
    this.addToCache(normalized, embedding);

    // Update stats
    this.stats.totalEmbeddings++;
    const processingTime = Date.now() - startTime;
    this.stats.totalEmbeddingTime += processingTime;

    return {
      embedding,
      dimension: 768,
      model: this.config.modelName,
      cached: false,
      chunkCount: chunks.length,
      processingTime
    };
  }

  /**
   * Generate embeddings for multiple code snippets (batch processing)
   */
  async embedBatch(codes: string[]): Promise<BatchEmbeddingResult> {
    const startTime = Date.now();

    const results = await Promise.all(
      codes.map(code => this.embed(code))
    );

    const totalTime = Date.now() - startTime;
    const cacheHits = results.filter(r => r.cached).length;
    const cacheMisses = results.filter(r => !r.cached).length;

    this.stats.totalBatches++;

    return {
      embeddings: results.map(r => r.embedding),
      dimension: 768,
      model: this.config.modelName,
      totalProcessingTime: totalTime,
      averageProcessingTime: totalTime / codes.length,
      cacheHits,
      cacheMisses
    };
  }

  /**
   * Generate embedding for a natural language query
   */
  async embedQuery(query: string): Promise<number[]> {
    const result = await this.embed(query);
    return result.embedding;
  }

  /**
   * Generate raw embedding using the model
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.pipeline) {
      throw new Error('Model not initialized');
    }

    try {
      // Generate embedding
      const output = await this.pipeline(text, {
        pooling: 'mean',
        normalize: true
      });

      // Extract embedding array
      // The output is a Tensor, we need to convert to regular array
      const embedding = Array.from(output.data as Float32Array);

      return embedding;
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Normalize code for consistent embedding
   */
  private normalizeCode(code: string): string {
    return code
      .trim()
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove comments (simple approach)
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();
  }

  /**
   * Chunk code that exceeds max length
   */
  private chunkCode(code: string): string[] {
    // Simple word-based chunking
    const words = code.split(/\s+/);

    if (words.length <= this.config.chunkSize) {
      return [code];
    }

    const chunks: string[] = [];
    let i = 0;

    while (i < words.length) {
      const chunkWords = words.slice(
        i,
        Math.min(i + this.config.chunkSize, words.length)
      );
      chunks.push(chunkWords.join(' '));

      // Move forward with overlap
      i += this.config.chunkSize - this.config.chunkOverlap;
    }

    return chunks;
  }

  /**
   * Average multiple embeddings
   */
  private averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) {
      throw new Error('Cannot average empty embeddings array');
    }

    if (embeddings.length === 1) {
      return embeddings[0];
    }

    const dimension = embeddings[0].length;
    const averaged = new Array(dimension).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < dimension; i++) {
        averaged[i] += embedding[i];
      }
    }

    for (let i = 0; i < dimension; i++) {
      averaged[i] /= embeddings.length;
    }

    // Normalize
    return this.normalizeVector(averaged);
  }

  /**
   * Normalize vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );

    if (magnitude === 0) {
      return vector;
    }

    return vector.map(val => val / magnitude);
  }

  /**
   * Get embedding from cache
   */
  private getFromCache(code: string): number[] | null {
    const entry = this.cache.get(code);
    if (entry) {
      entry.accessCount++;
      entry.timestamp = Date.now();
      return entry.embedding;
    }
    return null;
  }

  /**
   * Add embedding to cache with LRU eviction
   */
  private addToCache(code: string, embedding: number[]): void {
    // If cache is full, evict least recently used
    if (this.cache.size >= this.config.cacheSize) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [key, entry] of this.cache) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(code, {
      embedding,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have same dimension');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Get statistics
   */
  getStats(): EmbedderStats {
    return {
      totalEmbeddings: this.stats.totalEmbeddings,
      totalBatches: this.stats.totalBatches,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      averageEmbeddingTime: this.stats.totalEmbeddings > 0
        ? this.stats.totalEmbeddingTime / this.stats.totalEmbeddings
        : 0,
      totalEmbeddingTime: this.stats.totalEmbeddingTime,
      modelLoaded: this.pipeline !== undefined,
      cacheSize: this.cache.size,
      maxCacheSize: this.config.cacheSize
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalEmbeddings: 0,
      totalBatches: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalEmbeddingTime: 0
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    const total = this.stats.cacheHits + this.stats.cacheMisses;
    return total > 0 ? this.stats.cacheHits / total : 0;
  }

  /**
   * Unload model to free memory
   */
  async unload(): Promise<void> {
    this.pipeline = undefined;
    this.clearCache();
  }

  /**
   * Check if model is loaded
   */
  isLoaded(): boolean {
    return this.pipeline !== undefined;
  }

  /**
   * Get model configuration
   */
  getConfig(): Readonly<Required<CodeEmbedderConfig>> {
    return { ...this.config };
  }
}
