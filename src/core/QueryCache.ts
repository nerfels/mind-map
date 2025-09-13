import { CacheEntry, CacheStats, CacheConfig, QueryResult } from '../types/index.js';
import * as crypto from 'crypto';

/**
 * Context-aware query cache with LRU eviction and similarity matching
 * Based on neuromorphic systems research for 300ms P95 latency
 */
export class QueryCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = []; // For LRU tracking
  private config: CacheConfig;
  private stats: CacheStats;
  
  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxEntries: 1000,
      maxMemoryMB: 100,
      contextSimilarityThreshold: 0.8,
      ttlMinutes: 60,
      ...config
    };
    
    this.stats = {
      totalEntries: 0,
      hitRate: 0,
      memoryUsage: 0,
      maxMemoryUsage: this.config.maxMemoryMB * 1024 * 1024,
      evictionCount: 0,
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Get cached query result with context similarity matching
   */
  async get(query: string, context: string): Promise<QueryResult | null> {
    this.stats.totalQueries++;
    
    const contextHash = this.hashContext(context);
    const exactKey = this.createKey(query, contextHash);
    
    // Try exact match first
    let entry = this.cache.get(exactKey);
    
    if (!entry) {
      // Try similarity matching
      entry = this.findSimilarEntry(query, context, contextHash) || undefined;
    }
    
    if (entry && this.isEntryValid(entry)) {
      // Update access tracking
      this.updateAccess(exactKey, entry);
      this.stats.cacheHits++;
      this.stats.hitRate = this.stats.cacheHits / this.stats.totalQueries;

      return entry.results;
    }

    this.stats.cacheMisses++;
    this.stats.hitRate = this.stats.cacheHits / this.stats.totalQueries;

    return null;
  }

  /**
   * Cache query result with context
   */
  async set(query: string, context: string, results: QueryResult): Promise<void> {
    const contextHash = this.hashContext(context);
    const key = this.createKey(query, contextHash);
    const resultSize = this.estimateSize(results);
    
    const entry: CacheEntry = {
      query,
      context,
      results,
      timestamp: new Date(),
      hitCount: 0,
      lastAccessed: new Date(),
      contextHash,
      resultSize
    };
    
    // Check memory limits before adding
    if (this.stats.memoryUsage + resultSize > this.stats.maxMemoryUsage) {
      await this.evictToFit(resultSize);
    }
    
    // Check entry limits
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLRU();
    }
    
    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.stats.memoryUsage += resultSize;
    this.stats.totalEntries = this.cache.size;

  }

  /**
   * Invalidate cache entries based on graph updates
   */
  async invalidate(affectedPaths?: string[]): Promise<number> {
    let invalidatedCount = 0;
    
    if (!affectedPaths || affectedPaths.length === 0) {
      // Clear all cache
      invalidatedCount = this.cache.size;
      this.cache.clear();
      this.accessOrder = [];
      this.stats.memoryUsage = 0;
      this.stats.totalEntries = 0;
    } else {
      // Selective invalidation based on affected paths
      for (const [key, entry] of this.cache.entries()) {
        if (this.isEntryAffected(entry, affectedPaths)) {
          this.cache.delete(key);
          this.removeFromAccessOrder(key);
          this.stats.memoryUsage -= entry.resultSize;
          invalidatedCount++;
        }
      }
      this.stats.totalEntries = this.cache.size;
    }
    
    return invalidatedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clear expired entries
   */
  async cleanup(): Promise<number> {
    let cleanedCount = 0;
    const now = new Date();
    const ttlMs = this.config.ttlMinutes * 60 * 1000;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now.getTime() - entry.timestamp.getTime() > ttlMs) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        this.stats.memoryUsage -= entry.resultSize;
        cleanedCount++;
      }
    }
    
    this.stats.totalEntries = this.cache.size;
    return cleanedCount;
  }

  /**
   * Create cache key from query and context hash
   */
  private createKey(query: string, contextHash: string): string {
    return `${query.toLowerCase().trim()}:${contextHash}`;
  }

  /**
   * Hash context for fast comparison
   */
  private hashContext(context: string): string {
    return crypto.createHash('md5').update(context).digest('hex').substring(0, 16);
  }

  /**
   * Find similar cache entry based on context similarity
   */
  private findSimilarEntry(query: string, context: string, contextHash: string): CacheEntry | null {
    const queryLower = query.toLowerCase().trim();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.query.toLowerCase().trim() === queryLower) {
        const similarity = this.calculateContextSimilarity(context, entry.context);
        if (similarity >= this.config.contextSimilarityThreshold) {
          return entry;
        }
      }
    }
    
    return null;
  }

  /**
   * Calculate context similarity (simplified - could use more advanced NLP)
   */
  private calculateContextSimilarity(context1: string, context2: string): number {
    if (context1 === context2) return 1.0;
    
    const words1 = new Set(context1.toLowerCase().split(/\s+/));
    const words2 = new Set(context2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Check if cache entry is valid (not expired)
   */
  private isEntryValid(entry: CacheEntry): boolean {
    const now = new Date();
    const ttlMs = this.config.ttlMinutes * 60 * 1000;
    return (now.getTime() - entry.timestamp.getTime()) <= ttlMs;
  }

  /**
   * Update access tracking for LRU
   */
  private updateAccess(key: string, entry: CacheEntry): void {
    entry.hitCount++;
    entry.lastAccessed = new Date();
    
    // Move to end of access order
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict LRU entries to fit new entry
   */
  private async evictToFit(requiredSize: number): Promise<void> {
    while (this.stats.memoryUsage + requiredSize > this.stats.maxMemoryUsage && this.cache.size > 0) {
      this.evictLRU();
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;
    
    const lruKey = this.accessOrder.shift()!;
    const entry = this.cache.get(lruKey);
    
    if (entry) {
      this.cache.delete(lruKey);
      this.stats.memoryUsage -= entry.resultSize;
      this.stats.evictionCount++;
    }
    
    this.stats.totalEntries = this.cache.size;
  }

  /**
   * Remove key from access order tracking
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Check if entry is affected by path changes
   */
  private isEntryAffected(entry: CacheEntry, affectedPaths: string[]): boolean {
    // Check if any of the query results reference affected paths
    for (const node of entry.results.nodes) {
      if (node.path && affectedPaths.some(path => node.path?.includes(path) || path.includes(node.path!))) {
        return true;
      }
    }
    
    // Check context for path references
    return affectedPaths.some(path => entry.context.includes(path));
  }

  /**
   * Estimate memory size of query results
   */
  private estimateSize(results: QueryResult): number {
    const json = JSON.stringify(results);
    return Buffer.byteLength(json, 'utf8');
  }
}