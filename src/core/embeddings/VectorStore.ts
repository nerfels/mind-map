/**
 * VectorStore - Phase 5.3
 *
 * Efficient storage and similarity search for code embeddings using HNSW algorithm.
 *
 * Features:
 * - Fast similarity search (approximate nearest neighbor)
 * - Persistent storage (save/load to disk)
 * - Metadata attachment to vectors
 * - Batch operations
 * - Statistics tracking
 * - Memory-efficient indexing
 *
 * Uses hnswlib-node for high-performance HNSW index:
 * - ~1-5ms search time for 10,000 vectors
 * - Memory-efficient sparse storage
 * - Disk persistence
 */

import { HierarchicalNSW } from 'hnswlib-node';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { existsSync } from 'fs';

/**
 * Vector metadata
 */
export interface VectorMetadata {
  id: string;
  filePath?: string;
  functionName?: string;
  className?: string;
  language?: string;
  type?: 'function' | 'class' | 'file' | 'snippet';
  content?: string;
  createdAt: Date;
  [key: string]: any;
}

/**
 * Search result
 */
export interface SearchResult {
  id: string;
  score: number;        // Similarity score (0-1, higher is better)
  distance: number;     // Distance in vector space (lower is better)
  metadata: VectorMetadata;
  embedding?: number[];
}

/**
 * Vector store configuration
 */
export interface VectorStoreConfig {
  dimension?: number;
  maxElements?: number;
  m?: number;            // HNSW parameter: number of connections
  efConstruction?: number; // HNSW parameter: construction time/accuracy tradeoff
  efSearch?: number;     // HNSW parameter: search time/accuracy tradeoff
  space?: 'cosine' | 'l2' | 'ip';
}

/**
 * Vector store statistics
 */
export interface VectorStoreStats {
  totalVectors: number;
  dimension: number;
  indexSize: number;
  searchCount: number;
  averageSearchTime: number;
  cacheHitRate: number;
  memoryUsage: number;
}

/**
 * VectorStore
 *
 * High-performance vector storage and similarity search using HNSW algorithm.
 *
 * Example usage:
 * ```typescript
 * const store = new VectorStore({ dimension: 768 });
 *
 * // Add vectors
 * await store.add('func1', embedding1, { filePath: 'utils.ts', functionName: 'sort' });
 * await store.add('func2', embedding2, { filePath: 'helpers.ts', functionName: 'filter' });
 *
 * // Search similar
 * const results = await store.search(queryEmbedding, 5);
 * console.log(results);
 * // [
 * //   { id: 'func1', score: 0.95, metadata: {...} },
 * //   { id: 'func2', score: 0.82, metadata: {...} },
 * //   ...
 * // ]
 *
 * // Persist
 * await store.save('.mindmap-cache/vectors');
 * await store.load('.mindmap-cache/vectors');
 * ```
 */
export class VectorStore {
  private config: Required<VectorStoreConfig>;
  private index?: HierarchicalNSW;
  private metadata: Map<string, VectorMetadata> = new Map();
  private idToLabel: Map<string, number> = new Map();
  private labelToId: Map<number, string> = new Map();
  private nextLabel = 0;
  private embeddings: Map<string, number[]> = new Map();

  private stats = {
    searchCount: 0,
    totalSearchTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  constructor(config: VectorStoreConfig = {}) {
    this.config = {
      dimension: config.dimension ?? 768,
      maxElements: config.maxElements ?? 100000,
      m: config.m ?? 16,
      efConstruction: config.efConstruction ?? 200,
      efSearch: config.efSearch ?? 50,
      space: config.space ?? 'cosine'
    };

    this.initializeIndex();
  }

  /**
   * Initialize HNSW index
   */
  private initializeIndex(): void {
    this.index = new HierarchicalNSW(this.config.space, this.config.dimension);
    this.index.initIndex(this.config.maxElements, this.config.m, this.config.efConstruction);
    this.index.setEf(this.config.efSearch);
  }

  /**
   * Add vector to store
   */
  async add(
    id: string,
    embedding: number[],
    metadata: Partial<VectorMetadata> = {}
  ): Promise<void> {
    if (embedding.length !== this.config.dimension) {
      throw new Error(
        `Embedding dimension ${embedding.length} does not match configured dimension ${this.config.dimension}`
      );
    }

    if (!this.index) {
      throw new Error('Index not initialized');
    }

    // Check if already exists
    if (this.idToLabel.has(id)) {
      // Update existing
      await this.remove(id);
    }

    // Assign label
    const label = this.nextLabel++;
    this.idToLabel.set(id, label);
    this.labelToId.set(label, id);

    // Store metadata
    const fullMetadata: VectorMetadata = {
      id,
      ...metadata,
      createdAt: metadata.createdAt ?? new Date()
    };
    this.metadata.set(id, fullMetadata);

    // Store embedding
    this.embeddings.set(id, embedding);

    // Add to index
    this.index.addPoint(embedding, label);
  }

  /**
   * Add multiple vectors in batch
   */
  async addBatch(
    items: Array<{
      id: string;
      embedding: number[];
      metadata?: Partial<VectorMetadata>;
    }>
  ): Promise<void> {
    for (const item of items) {
      await this.add(item.id, item.embedding, item.metadata);
    }
  }

  /**
   * Search for similar vectors
   */
  async search(
    queryEmbedding: number[],
    k: number = 10,
    filter?: (metadata: VectorMetadata) => boolean
  ): Promise<SearchResult[]> {
    if (!this.index) {
      throw new Error('Index not initialized');
    }

    if (queryEmbedding.length !== this.config.dimension) {
      throw new Error(
        `Query embedding dimension ${queryEmbedding.length} does not match configured dimension ${this.config.dimension}`
      );
    }

    const startTime = Date.now();

    // Search in index
    const result = this.index.searchKnn(queryEmbedding, Math.min(k * 2, this.size()));

    this.stats.searchCount++;
    this.stats.totalSearchTime += Date.now() - startTime;

    // Convert to search results
    const results: SearchResult[] = [];

    for (let i = 0; i < result.neighbors.length && results.length < k; i++) {
      const label = result.neighbors[i];
      const distance = result.distances[i];
      const id = this.labelToId.get(label);

      if (!id) continue;

      const metadata = this.metadata.get(id);
      if (!metadata) continue;

      // Apply filter if provided
      if (filter && !filter(metadata)) {
        continue;
      }

      // Convert distance to similarity score
      // For cosine: distance is 1 - similarity, so similarity = 1 - distance
      // For L2: we'll normalize differently
      const score = this.config.space === 'cosine'
        ? 1 - distance
        : 1 / (1 + distance);

      results.push({
        id,
        score,
        distance,
        metadata
      });
    }

    return results.slice(0, k);
  }

  /**
   * Get vector by ID
   */
  async get(id: string): Promise<{ embedding: number[]; metadata: VectorMetadata } | null> {
    const embedding = this.embeddings.get(id);
    const metadata = this.metadata.get(id);

    if (!embedding || !metadata) {
      return null;
    }

    return { embedding, metadata };
  }

  /**
   * Remove vector from store
   */
  async remove(id: string): Promise<boolean> {
    const label = this.idToLabel.get(id);
    if (label === undefined) {
      return false;
    }

    // Remove from maps
    this.idToLabel.delete(id);
    this.labelToId.delete(label);
    this.metadata.delete(id);
    this.embeddings.delete(id);

    // Note: hnswlib-node doesn't support deletion from index
    // We just remove from our maps, index keeps the point but we won't reference it

    return true;
  }

  /**
   * Clear all vectors
   */
  async clear(): Promise<void> {
    this.metadata.clear();
    this.idToLabel.clear();
    this.labelToId.clear();
    this.embeddings.clear();
    this.nextLabel = 0;
    this.initializeIndex();
  }

  /**
   * Get number of vectors in store
   */
  size(): number {
    return this.metadata.size;
  }

  /**
   * Check if vector exists
   */
  has(id: string): boolean {
    return this.metadata.has(id);
  }

  /**
   * Get all IDs
   */
  getAllIds(): string[] {
    return Array.from(this.metadata.keys());
  }

  /**
   * Get all metadata
   */
  getAllMetadata(): VectorMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Save to disk
   */
  async save(path: string): Promise<void> {
    if (!this.index) {
      throw new Error('Index not initialized');
    }

    // Ensure directory exists
    await mkdir(dirname(path), { recursive: true });

    // Save index
    const indexPath = `${path}.index`;
    this.index.writeIndex(indexPath);

    // Save metadata and mappings
    const data = {
      metadata: Array.from(this.metadata.entries()),
      idToLabel: Array.from(this.idToLabel.entries()),
      labelToId: Array.from(this.labelToId.entries()).map(([k, v]) => [k, v]),
      nextLabel: this.nextLabel,
      embeddings: Array.from(this.embeddings.entries()),
      config: this.config
    };

    const dataPath = `${path}.json`;
    await writeFile(dataPath, JSON.stringify(data, null, 2));
  }

  /**
   * Load from disk
   */
  async load(path: string): Promise<void> {
    const indexPath = `${path}.index`;
    const dataPath = `${path}.json`;

    if (!existsSync(indexPath) || !existsSync(dataPath)) {
      throw new Error(`Vector store files not found at ${path}`);
    }

    // Load metadata and mappings
    const data = JSON.parse(await readFile(dataPath, 'utf-8'));

    this.metadata = new Map(
      data.metadata.map(([k, v]: [string, any]) => [
        k,
        { ...v, createdAt: new Date(v.createdAt) }
      ])
    );
    this.idToLabel = new Map(data.idToLabel);
    this.labelToId = new Map(data.labelToId.map(([k, v]: [string, string]) => [Number(k), v]));
    this.nextLabel = data.nextLabel;
    this.embeddings = new Map(data.embeddings);

    // Update config if needed
    this.config = { ...this.config, ...data.config };

    // Load index
    this.index = new HierarchicalNSW(this.config.space, this.config.dimension);
    this.index.readIndex(indexPath, this.config.maxElements);
    this.index.setEf(this.config.efSearch);
  }

  /**
   * Get statistics
   */
  getStats(): VectorStoreStats {
    const totalQueries = this.stats.searchCount;
    const totalHits = this.stats.cacheHits + this.stats.cacheMisses;

    return {
      totalVectors: this.size(),
      dimension: this.config.dimension,
      indexSize: this.nextLabel,
      searchCount: this.stats.searchCount,
      averageSearchTime: totalQueries > 0
        ? this.stats.totalSearchTime / totalQueries
        : 0,
      cacheHitRate: totalHits > 0
        ? this.stats.cacheHits / totalHits
        : 0,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      searchCount: 0,
      totalSearchTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Estimate memory usage in bytes
   */
  private estimateMemoryUsage(): number {
    // Rough estimate:
    // - Each vector: dimension * 4 bytes (float32)
    // - Metadata: ~500 bytes per item (rough estimate)
    // - HNSW overhead: ~50 bytes per element
    const vectorSize = this.config.dimension * 4;
    const metadataSize = 500;
    const hnswOverhead = 50;

    return this.size() * (vectorSize + metadataSize + hnswOverhead);
  }

  /**
   * Optimize index (rebuild for better performance)
   */
  async optimize(): Promise<void> {
    // Not directly supported by hnswlib-node
    // Would require rebuilding the index
    // For now, this is a no-op but could be implemented if needed
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<Required<VectorStoreConfig>> {
    return { ...this.config };
  }

  /**
   * Find duplicates above similarity threshold
   */
  async findDuplicates(threshold: number = 0.95): Promise<Array<{
    id1: string;
    id2: string;
    similarity: number;
  }>> {
    const duplicates: Array<{
      id1: string;
      id2: string;
      similarity: number;
    }> = [];

    const ids = this.getAllIds();

    for (let i = 0; i < ids.length; i++) {
      const id1 = ids[i];
      const emb1 = this.embeddings.get(id1);
      if (!emb1) continue;

      // Search for similar vectors
      const similar = await this.search(emb1, 10);

      for (const result of similar) {
        if (result.id === id1) continue; // Skip self
        if (result.score < threshold) continue;

        // Only add once (avoid duplicates)
        const existing = duplicates.find(
          d => (d.id1 === id1 && d.id2 === result.id) ||
               (d.id1 === result.id && d.id2 === id1)
        );

        if (!existing) {
          duplicates.push({
            id1,
            id2: result.id,
            similarity: result.score
          });
        }
      }
    }

    return duplicates.sort((a, b) => b.similarity - a.similarity);
  }
}
