export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  operationCount: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  recentMetrics: PerformanceMetric[];
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private maxMetricsPerOperation = 100; // Keep last 100 metrics per operation

  startTimer(operation: string, metadata?: Record<string, any>): () => PerformanceMetric {
    const startTime = performance.now();
    const timestamp = new Date();
    
    return () => {
      const duration = performance.now() - startTime;
      const metric: PerformanceMetric = {
        operation,
        duration,
        timestamp,
        metadata
      };
      
      this.recordMetric(metric);
      return metric;
    };
  }

  recordMetric(metric: PerformanceMetric): void {
    if (!this.metrics.has(metric.operation)) {
      this.metrics.set(metric.operation, []);
    }
    
    const operationMetrics = this.metrics.get(metric.operation)!;
    operationMetrics.push(metric);
    
    // Keep only recent metrics to prevent memory leak
    if (operationMetrics.length > this.maxMetricsPerOperation) {
      operationMetrics.shift();
    }
  }

  getStats(operation?: string): Map<string, PerformanceStats> | PerformanceStats {
    if (operation) {
      const metrics = this.metrics.get(operation) || [];
      return this.calculateStats(operation, metrics);
    }
    
    const allStats = new Map<string, PerformanceStats>();
    for (const [op, metrics] of this.metrics) {
      allStats.set(op, this.calculateStats(op, metrics));
    }
    return allStats;
  }

  private calculateStats(operation: string, metrics: PerformanceMetric[]): PerformanceStats {
    if (metrics.length === 0) {
      return {
        operationCount: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        recentMetrics: []
      };
    }

    const durations = metrics.map(m => m.duration);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    return {
      operationCount: metrics.length,
      totalDuration,
      averageDuration: totalDuration / metrics.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      recentMetrics: metrics.slice(-10) // Last 10 metrics
    };
  }

  getSlowOperations(thresholdMs: number = 100): { operation: string, stats: PerformanceStats }[] {
    const slowOps: { operation: string, stats: PerformanceStats }[] = [];
    
    for (const [operation, metrics] of this.metrics) {
      const stats = this.calculateStats(operation, metrics);
      if (stats.averageDuration > thresholdMs || stats.maxDuration > thresholdMs * 2) {
        slowOps.push({ operation, stats });
      }
    }
    
    return slowOps.sort((a, b) => b.stats.averageDuration - a.stats.averageDuration);
  }

  getRecentMetrics(limit: number = 50): PerformanceMetric[] {
    const allMetrics: PerformanceMetric[] = [];
    
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    
    return allMetrics
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  clear(): void {
    this.metrics.clear();
  }

  // Helper method to time async operations
  async timeAsync<T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const endTimer = this.startTimer(operation, metadata);
    try {
      const result = await fn();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      throw error;
    }
  }

  // Helper method to time sync operations
  timeSync<T>(operation: string, fn: () => T, metadata?: Record<string, any>): T {
    const endTimer = this.startTimer(operation, metadata);
    try {
      const result = fn();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      throw error;
    }
  }
}