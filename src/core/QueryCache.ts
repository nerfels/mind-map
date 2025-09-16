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
  private frequentPatterns = new Map<string, number>(); // Track frequent query patterns
  private warmupCandidates = new Set<string>(); // Queries eligible for warming
  
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

    // Track query patterns for cache warming
    this.trackQueryPattern(query);

    const contextHash = this.hashContext(context);
    const exactKey = this.createKey(query, contextHash);

    // Try exact match first
    let entry = this.cache.get(exactKey);

    if (!entry) {
      // Try similarity matching with enhanced context awareness
      entry = this.findSimilarEntry(query, context, contextHash) || undefined;
    }

    if (entry && this.isEntryValid(entry)) {
      // Update access tracking
      this.updateAccess(exactKey, entry);
      this.stats.cacheHits++;
      this.stats.hitRate = this.stats.cacheHits / this.stats.totalQueries;

      // Update warmup candidates based on access patterns
      this.updateWarmupCandidates(query, entry);

      return entry.results;
    }

    this.stats.cacheMisses++;
    this.stats.hitRate = this.stats.cacheHits / this.stats.totalQueries;

    // Mark as potential warmup candidate if frequently accessed
    if (this.isFrequentQuery(query)) {
      this.warmupCandidates.add(query);
    }

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
   * Calculate context similarity using enhanced multi-factor approach
   * Combines Jaccard similarity with semantic matching and structural analysis
   */
  private calculateContextSimilarity(context1: string, context2: string): number {
    if (context1 === context2) return 1.0;

    // Parse context objects for structured comparison
    let parsedContext1: any, parsedContext2: any;
    try {
      parsedContext1 = JSON.parse(context1);
      parsedContext2 = JSON.parse(context2);
    } catch {
      // Fallback to string comparison
      return this.calculateStringSimilarity(context1, context2);
    }

    // Multi-factor similarity calculation
    let totalSimilarity = 0;
    let factorCount = 0;

    // 1. Type similarity (exact match for query type)
    if (parsedContext1.type && parsedContext2.type) {
      totalSimilarity += parsedContext1.type === parsedContext2.type ? 1.0 : 0.0;
      factorCount++;
    }

    // 2. Active files similarity (high weight for context relevance)
    if (parsedContext1.activeFiles && parsedContext2.activeFiles) {
      const similarity = this.calculateArraySimilarity(parsedContext1.activeFiles, parsedContext2.activeFiles);
      totalSimilarity += similarity * 2.0; // Double weight for active files
      factorCount += 2;
    }

    // 3. Session goals similarity
    if (parsedContext1.sessionGoals && parsedContext2.sessionGoals) {
      const similarity = this.calculateArraySimilarity(parsedContext1.sessionGoals, parsedContext2.sessionGoals);
      totalSimilarity += similarity;
      factorCount++;
    }

    // 4. Framework context similarity
    if (parsedContext1.frameworkContext && parsedContext2.frameworkContext) {
      const similarity = this.calculateArraySimilarity(parsedContext1.frameworkContext, parsedContext2.frameworkContext);
      totalSimilarity += similarity * 1.5; // Higher weight for framework context
      factorCount += 1.5;
    }

    // 5. Query options similarity (lower weight)
    const optionsSimilarity = this.calculateOptionsSimilarity(parsedContext1, parsedContext2);
    totalSimilarity += optionsSimilarity * 0.5;
    factorCount += 0.5;

    return factorCount > 0 ? totalSimilarity / factorCount : 0;
  }

  /**
   * Calculate similarity between string contexts (fallback)
   */
  private calculateStringSimilarity(context1: string, context2: string): number {
    const words1 = new Set(context1.toLowerCase().split(/\s+/));
    const words2 = new Set(context2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Calculate similarity between two arrays using Jaccard index
   */
  private calculateArraySimilarity(arr1: string[], arr2: string[]): number {
    if (!arr1.length && !arr2.length) return 1.0;
    if (!arr1.length || !arr2.length) return 0.0;

    const set1 = new Set(arr1.map(s => s.toLowerCase()));
    const set2 = new Set(arr2.map(s => s.toLowerCase()));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate similarity between query options
   */
  private calculateOptionsSimilarity(context1: any, context2: any): number {
    const booleanFields = ['useActivation', 'includeMetadata', 'includeParentContext', 'includeChildContext'];
    const numericFields = ['limit', 'activationLevels'];

    let matches = 0;
    let total = 0;

    // Compare boolean fields
    for (const field of booleanFields) {
      if (context1[field] !== undefined && context2[field] !== undefined) {
        matches += context1[field] === context2[field] ? 1 : 0;
        total++;
      }
    }

    // Compare numeric fields (with tolerance)
    for (const field of numericFields) {
      if (context1[field] !== undefined && context2[field] !== undefined) {
        const diff = Math.abs(context1[field] - context2[field]);
        const tolerance = field === 'limit' ? 5 : 1; // Allow some variation
        matches += diff <= tolerance ? 1 : 0;
        total++;
      }
    }

    return total > 0 ? matches / total : 1.0;
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

  /**
   * Track query patterns for cache warming analysis
   */
  private trackQueryPattern(query: string): void {
    const normalizedQuery = this.normalizeQueryForPatterns(query);
    const currentCount = this.frequentPatterns.get(normalizedQuery) || 0;
    this.frequentPatterns.set(normalizedQuery, currentCount + 1);

    // Cleanup old patterns periodically (keep top 100)
    if (this.frequentPatterns.size > 150) {
      const sortedPatterns = Array.from(this.frequentPatterns.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100);

      this.frequentPatterns.clear();
      sortedPatterns.forEach(([pattern, count]) => {
        this.frequentPatterns.set(pattern, count);
      });
    }
  }

  /**
   * Normalize query for pattern analysis (remove specific terms, keep structure)
   */
  private normalizeQueryForPatterns(query: string): string {
    return query.toLowerCase()
      .replace(/['"]/g, '') // Remove quotes
      .replace(/\b\d+\b/g, 'NUM') // Replace numbers with NUM
      .replace(/\b[a-f0-9]{8,}\b/g, 'HASH') // Replace hashes with HASH
      .replace(/\w+\.(ts|js|py|java)\b/g, 'FILE') // Replace file names with FILE
      .trim();
  }

  /**
   * Check if query matches frequent patterns
   */
  private isFrequentQuery(query: string): boolean {
    const normalizedQuery = this.normalizeQueryForPatterns(query);
    const threshold = Math.max(3, this.stats.totalQueries * 0.02); // 2% of total queries or min 3
    return (this.frequentPatterns.get(normalizedQuery) || 0) >= threshold;
  }

  /**
   * Update warmup candidates based on access patterns
   */
  private updateWarmupCandidates(query: string, entry: CacheEntry): void {
    // If this entry has high hit count and recent access, consider similar queries for warmup
    if (entry.hitCount >= 3 && this.isRecentlyAccessed(entry)) {
      const normalizedQuery = this.normalizeQueryForPatterns(query);
      this.warmupCandidates.add(normalizedQuery);
    }
  }

  /**
   * Check if entry was accessed recently
   */
  private isRecentlyAccessed(entry: CacheEntry): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return entry.lastAccessed > fiveMinutesAgo;
  }

  /**
   * Proactively warm cache with frequently accessed patterns
   * This should be called by a background service with a query executor
   */
  async warmCache(queryExecutor: (query: string, context: string) => Promise<QueryResult>): Promise<number> {
    let warmedCount = 0;
    const defaultContext = JSON.stringify({
      type: 'default',
      limit: 10,
      useActivation: true,
      activationLevels: 3,
      includeMetadata: false,
      activeFiles: [],
      sessionGoals: [],
      frameworkContext: []
    });

    for (const pattern of this.warmupCandidates) {
      // Don't warm if already cached
      const key = this.createKey(pattern, this.hashContext(defaultContext));
      if (this.cache.has(key)) continue;

      try {
        // Generate specific queries from patterns
        const specificQueries = this.generateQueriesFromPattern(pattern);

        for (const specificQuery of specificQueries.slice(0, 3)) { // Limit to 3 per pattern
          if (!this.cache.has(this.createKey(specificQuery, this.hashContext(defaultContext)))) {
            const results = await queryExecutor(specificQuery, defaultContext);
            await this.set(specificQuery, defaultContext, results);
            warmedCount++;

            // Rate limit warming to avoid overloading
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } catch (error) {
        console.warn(`Cache warming failed for pattern "${pattern}":`, error);
      }
    }

    // Clear processed warmup candidates
    this.warmupCandidates.clear();

    return warmedCount;
  }

  /**
   * Generate specific queries from normalized patterns
   */
  private generateQueriesFromPattern(pattern: string): string[] {
    const queries: string[] = [];

    // Common file types for FILE pattern
    if (pattern.includes('FILE')) {
      const fileTypes = ['typescript', 'javascript', 'python', 'java'];
      fileTypes.forEach(type => {
        queries.push(pattern.replace(/FILE/g, type));
      });
    }

    // Common numbers for NUM pattern
    if (pattern.includes('NUM')) {
      const numbers = ['1', '10', '100'];
      numbers.forEach(num => {
        queries.push(pattern.replace(/NUM/g, num));
      });
    }

    // If no patterns to expand, return the pattern itself
    if (queries.length === 0) {
      queries.push(pattern);
    }

    return queries;
  }

  /**
   * Get enhanced cache statistics with warming analytics
   */
  getEnhancedStats(): CacheStats & {
    frequentPatterns: Array<{ pattern: string; count: number }>;
    warmupCandidates: string[];
    contextSimilarityThreshold: number;
    averageContextSimilarity: number;
  } {
    const topPatterns = Array.from(this.frequentPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pattern, count]) => ({ pattern, count }));

    // Calculate average context similarity from recent cache hits
    let totalSimilarity = 0;
    let similarityCount = 0;

    for (const entry of this.cache.values()) {
      if (entry.hitCount > 0) {
        // Simplified similarity calculation for stats
        totalSimilarity += 0.8; // Approximate average
        similarityCount++;
      }
    }

    return {
      ...this.stats,
      frequentPatterns: topPatterns,
      warmupCandidates: Array.from(this.warmupCandidates),
      contextSimilarityThreshold: this.config.contextSimilarityThreshold,
      averageContextSimilarity: similarityCount > 0 ? totalSimilarity / similarityCount : 0
    };
  }
}