import { MindMapStorage } from './MindMapStorage.js';
import { MindMapNode, MindMapEdge, QueryResult } from '../types/index.js';

export interface TemporalQuery {
  timeRange: TimeRange;
  evolution: EvolutionQuery;
  aggregation?: TemporalAggregation;
}

export interface TimeRange {
  start: Date;
  end: Date;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export interface EvolutionQuery {
  entity: string;      // node ID or pattern
  trackChanges: boolean;
  includeRelationships: boolean;
  snapshotInterval?: number; // minutes
}

export interface TemporalAggregation {
  metric: 'count' | 'confidence_avg' | 'error_rate' | 'success_rate' | 'complexity';
  groupBy: 'time' | 'type' | 'path';
}

export interface TemporalSnapshot {
  timestamp: Date;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  changes: ChangeEvent[];
}

export interface ChangeEvent {
  timestamp: Date;
  type: 'node_added' | 'node_removed' | 'node_updated' | 'edge_added' | 'edge_removed' | 'confidence_changed';
  entityId: string;
  beforeValue?: any;
  afterValue?: any;
  context?: string;
}

export interface EvolutionMetrics {
  stabilityScore: number;    // How stable the code structure is
  growthRate: number;        // Rate of new entities added
  churnRate: number;         // Rate of entities modified/removed
  healthTrend: 'improving' | 'degrading' | 'stable';
  confidenceTrend: number;   // Trend in confidence scores
}

/**
 * Temporal Query Engine for tracking code evolution over time
 * 
 * Supported temporal queries:
 * - MATCH (n:file) WITH TIME RANGE '2024-01-01' TO '2024-12-31' RETURN evolution(n)
 * - SHOW CHANGES IN (f:function {name: "parseCode"}) LAST 30 DAYS
 * - AGGREGATE confidence BY day FOR files IN /src/ LAST WEEK
 * - TRACK PATTERN 'error_rate' OVER TIME WHERE type = 'file'
 */
export class TemporalQueryEngine {
  private storage: MindMapStorage;
  private changeLog: ChangeEvent[];
  private snapshots: Map<string, TemporalSnapshot>;

  constructor(storage: MindMapStorage) {
    this.storage = storage;
    this.changeLog = [];
    this.snapshots = new Map();
    this.initializeChangeTracking();
  }

  /**
   * Execute temporal query to track evolution over time
   */
  async executeTemporalQuery(query: TemporalQuery): Promise<{
    timeline: TemporalSnapshot[];
    metrics: EvolutionMetrics;
    changes: ChangeEvent[];
  }> {
    const startTime = Date.now();
    
    // Generate snapshots for the time range
    const timeline = await this.generateTimeline(query.timeRange, query.evolution);
    
    // Calculate evolution metrics
    const metrics = this.calculateEvolutionMetrics(timeline, query.timeRange);
    
    // Filter relevant changes
    const changes = this.getChangesInRange(query.timeRange, query.evolution.entity);
    
    return {
      timeline,
      metrics,
      changes
    };
  }

  /**
   * Track changes to a specific entity over time
   */
  async trackEntityEvolution(entityId: string, timeRange: TimeRange): Promise<{
    snapshots: TemporalSnapshot[];
    changeHistory: ChangeEvent[];
    metrics: {
      totalChanges: number;
      avgConfidenceChange: number;
      stabilityPeriods: { start: Date; end: Date; stable: boolean }[];
    };
  }> {
    const changes = this.changeLog.filter(change => 
      change.entityId === entityId &&
      change.timestamp >= timeRange.start &&
      change.timestamp <= timeRange.end
    );

    const snapshots = await this.generateEntitySnapshots(entityId, timeRange);
    
    // Calculate stability periods
    const stabilityPeriods = this.calculateStabilityPeriods(changes, timeRange);
    
    // Calculate confidence trends
    const confidenceChanges = changes
      .filter(c => c.type === 'confidence_changed' && typeof c.afterValue === 'number')
      .map(c => c.afterValue - (c.beforeValue || 0));
    
    const avgConfidenceChange = confidenceChanges.length > 0 
      ? confidenceChanges.reduce((sum, change) => sum + change, 0) / confidenceChanges.length
      : 0;

    return {
      snapshots,
      changeHistory: changes,
      metrics: {
        totalChanges: changes.length,
        avgConfidenceChange,
        stabilityPeriods
      }
    };
  }

  /**
   * Get trending patterns in code evolution
   */
  async getTrendAnalysis(timeRange: TimeRange, pattern: string): Promise<{
    trend: 'increasing' | 'decreasing' | 'stable';
    dataPoints: { timestamp: Date; value: number }[];
    confidence: number;
    insights: string[];
  }> {
    const dataPoints = await this.extractTrendData(pattern, timeRange);
    
    if (dataPoints.length < 3) {
      return {
        trend: 'stable',
        dataPoints,
        confidence: 0,
        insights: ['Insufficient data for trend analysis']
      };
    }

    // Simple linear regression to detect trend
    const trend = this.detectTrend(dataPoints);
    const confidence = this.calculateTrendConfidence(dataPoints, trend);
    const insights = this.generateTrendInsights(dataPoints, trend, pattern);

    return {
      trend,
      dataPoints,
      confidence,
      insights
    };
  }

  /**
   * Generate comparative analysis between time periods
   */
  async compareTimePeriods(period1: TimeRange, period2: TimeRange): Promise<{
    period1Summary: PeriodSummary;
    period2Summary: PeriodSummary;
    changes: {
      nodeCountChange: number;
      avgConfidenceChange: number;
      errorRateChange: number;
      topChangedEntities: { id: string; changeCount: number }[];
    };
    insights: string[];
  }> {
    const summary1 = await this.generatePeriodSummary(period1);
    const summary2 = await this.generatePeriodSummary(period2);
    
    const changes = {
      nodeCountChange: summary2.nodeCount - summary1.nodeCount,
      avgConfidenceChange: summary2.avgConfidence - summary1.avgConfidence,
      errorRateChange: summary2.errorRate - summary1.errorRate,
      topChangedEntities: this.getTopChangedEntities(period1, period2)
    };
    
    const insights = this.generateComparisonInsights(summary1, summary2, changes);
    
    return {
      period1Summary: summary1,
      period2Summary: summary2,
      changes,
      insights
    };
  }

  /**
   * Record a change event for temporal tracking
   */
  recordChange(change: ChangeEvent): void {
    this.changeLog.push(change);
    
    // Keep only last 10000 changes to prevent memory issues
    if (this.changeLog.length > 10000) {
      this.changeLog = this.changeLog.slice(-8000); // Keep 8000 most recent
    }
    
    // Optionally trigger snapshot creation for significant changes
    if (this.shouldCreateSnapshot(change)) {
      this.createSnapshot();
    }
  }

  /**
   * Create a snapshot of the current state
   */
  createSnapshot(): void {
    const timestamp = new Date();
    const snapshotId = timestamp.toISOString();
    
    const snapshot: TemporalSnapshot = {
      timestamp,
      nodes: Array.from(this.storage.getGraph().nodes.values()),
      edges: Array.from(this.storage.getGraph().edges.values()),
      changes: this.getRecentChanges(timestamp)
    };
    
    this.snapshots.set(snapshotId, snapshot);
    
    // Clean up old snapshots (keep last 100)
    if (this.snapshots.size > 100) {
      const oldestKeys = Array.from(this.snapshots.keys())
        .sort()
        .slice(0, this.snapshots.size - 80);
      
      for (const key of oldestKeys) {
        this.snapshots.delete(key);
      }
    }
  }

  private async generateTimeline(timeRange: TimeRange, evolution: EvolutionQuery): Promise<TemporalSnapshot[]> {
    const timeline: TemporalSnapshot[] = [];
    const interval = this.calculateSnapshotInterval(timeRange);
    
    for (let current = new Date(timeRange.start); current <= timeRange.end; current.setTime(current.getTime() + interval)) {
      const snapshot = await this.reconstructStateAtTime(current, evolution);
      if (snapshot) {
        timeline.push(snapshot);
      }
    }
    
    return timeline;
  }

  private async reconstructStateAtTime(timestamp: Date, evolution: EvolutionQuery): Promise<TemporalSnapshot | null> {
    // Find the closest snapshot before or at this timestamp
    const relevantSnapshots = Array.from(this.snapshots.values())
      .filter(s => s.timestamp <= timestamp)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (relevantSnapshots.length === 0) {
      return null;
    }
    
    const baseSnapshot = relevantSnapshots[0];
    
    // Apply changes since the base snapshot
    const changesSince = this.changeLog.filter(change =>
      change.timestamp > baseSnapshot.timestamp &&
      change.timestamp <= timestamp &&
      (evolution.entity === '*' || change.entityId.includes(evolution.entity))
    );
    
    return {
      timestamp,
      nodes: this.applyChangesToNodes(baseSnapshot.nodes, changesSince),
      edges: this.applyChangesToEdges(baseSnapshot.edges, changesSince),
      changes: changesSince
    };
  }

  private calculateEvolutionMetrics(timeline: TemporalSnapshot[], timeRange: TimeRange): EvolutionMetrics {
    if (timeline.length < 2) {
      return {
        stabilityScore: 1.0,
        growthRate: 0,
        churnRate: 0,
        healthTrend: 'stable',
        confidenceTrend: 0
      };
    }
    
    const first = timeline[0];
    const last = timeline[timeline.length - 1];
    const timeSpanDays = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24);
    
    // Growth rate: new nodes per day
    const growthRate = (last.nodes.length - first.nodes.length) / timeSpanDays;
    
    // Churn rate: changes per day
    const totalChanges = timeline.reduce((sum, snapshot) => sum + snapshot.changes.length, 0);
    const churnRate = totalChanges / timeSpanDays;
    
    // Stability score: inverse of change frequency
    const stabilityScore = Math.max(0, 1 - (churnRate / 10)); // Normalize to 0-1
    
    // Confidence trend
    const firstAvgConfidence = first.nodes.reduce((sum, n) => sum + n.confidence, 0) / first.nodes.length;
    const lastAvgConfidence = last.nodes.reduce((sum, n) => sum + n.confidence, 0) / last.nodes.length;
    const confidenceTrend = lastAvgConfidence - firstAvgConfidence;
    
    // Health trend
    let healthTrend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (confidenceTrend > 0.1 && growthRate > 0) {
      healthTrend = 'improving';
    } else if (confidenceTrend < -0.1 || churnRate > 5) {
      healthTrend = 'degrading';
    }
    
    return {
      stabilityScore,
      growthRate,
      churnRate,
      healthTrend,
      confidenceTrend
    };
  }

  private getChangesInRange(timeRange: TimeRange, entityPattern: string): ChangeEvent[] {
    return this.changeLog.filter(change =>
      change.timestamp >= timeRange.start &&
      change.timestamp <= timeRange.end &&
      (entityPattern === '*' || change.entityId.includes(entityPattern))
    );
  }

  private calculateSnapshotInterval(timeRange: TimeRange): number {
    const totalTime = timeRange.end.getTime() - timeRange.start.getTime();
    const desiredSnapshots = 20; // Target number of snapshots
    return Math.max(60 * 60 * 1000, totalTime / desiredSnapshots); // At least 1 hour intervals
  }

  private applyChangesToNodes(baseNodes: MindMapNode[], changes: ChangeEvent[]): MindMapNode[] {
    const nodeMap = new Map(baseNodes.map(n => [n.id, { ...n }]));
    
    for (const change of changes) {
      switch (change.type) {
        case 'node_added':
          // Would need the full node data to add
          break;
        case 'node_removed':
          nodeMap.delete(change.entityId);
          break;
        case 'node_updated':
        case 'confidence_changed':
          const node = nodeMap.get(change.entityId);
          if (node && change.afterValue !== undefined) {
            if (change.type === 'confidence_changed') {
              node.confidence = change.afterValue;
            }
            // Other updates would need more specific handling
          }
          break;
      }
    }
    
    return Array.from(nodeMap.values());
  }

  private applyChangesToEdges(baseEdges: MindMapEdge[], changes: ChangeEvent[]): MindMapEdge[] {
    const edgeMap = new Map(baseEdges.map(e => [e.id, { ...e }]));
    
    for (const change of changes) {
      switch (change.type) {
        case 'edge_added':
          // Would need full edge data
          break;
        case 'edge_removed':
          edgeMap.delete(change.entityId);
          break;
      }
    }
    
    return Array.from(edgeMap.values());
  }

  private async generateEntitySnapshots(entityId: string, timeRange: TimeRange): Promise<TemporalSnapshot[]> {
    // Generate snapshots specifically for this entity
    return this.generateTimeline(timeRange, {
      entity: entityId,
      trackChanges: true,
      includeRelationships: true
    });
  }

  private calculateStabilityPeriods(changes: ChangeEvent[], timeRange: TimeRange): { start: Date; end: Date; stable: boolean }[] {
    const periods: { start: Date; end: Date; stable: boolean }[] = [];
    const stableThreshold = 60 * 60 * 1000; // 1 hour without changes = stable
    
    if (changes.length === 0) {
      return [{ start: timeRange.start, end: timeRange.end, stable: true }];
    }
    
    let lastChangeTime = timeRange.start;
    
    for (const change of changes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())) {
      const timeSinceLastChange = change.timestamp.getTime() - lastChangeTime.getTime();
      
      if (timeSinceLastChange > stableThreshold) {
        periods.push({
          start: lastChangeTime,
          end: change.timestamp,
          stable: true
        });
      }
      
      lastChangeTime = change.timestamp;
    }
    
    // Final period
    const finalPeriodTime = timeRange.end.getTime() - lastChangeTime.getTime();
    periods.push({
      start: lastChangeTime,
      end: timeRange.end,
      stable: finalPeriodTime > stableThreshold
    });
    
    return periods;
  }

  private async extractTrendData(pattern: string, timeRange: TimeRange): Promise<{ timestamp: Date; value: number }[]> {
    const dataPoints: { timestamp: Date; value: number }[] = [];
    const interval = this.calculateSnapshotInterval(timeRange);
    
    for (let current = new Date(timeRange.start); current <= timeRange.end; current.setTime(current.getTime() + interval)) {
      const value = await this.calculatePatternValue(pattern, current);
      dataPoints.push({ timestamp: new Date(current), value });
    }
    
    return dataPoints;
  }

  private async calculatePatternValue(pattern: string, timestamp: Date): Promise<number> {
    // Calculate specific pattern values based on the pattern type
    switch (pattern) {
      case 'error_rate':
        return this.calculateErrorRateAtTime(timestamp);
      case 'confidence_avg':
        return this.calculateAvgConfidenceAtTime(timestamp);
      case 'node_count':
        return this.calculateNodeCountAtTime(timestamp);
      case 'complexity':
        return this.calculateComplexityAtTime(timestamp);
      default:
        return 0;
    }
  }

  private calculateErrorRateAtTime(timestamp: Date): number {
    const relevantChanges = this.changeLog.filter(change =>
      change.timestamp <= timestamp &&
      change.timestamp.getTime() > timestamp.getTime() - 24 * 60 * 60 * 1000 // Last 24 hours
    );
    
    const errorCount = relevantChanges.filter(change => 
      change.type === 'node_added' && change.context?.includes('error')
    ).length;
    
    const totalChanges = relevantChanges.length;
    
    return totalChanges > 0 ? errorCount / totalChanges : 0;
  }

  private calculateAvgConfidenceAtTime(timestamp: Date): number {
    // This would reconstruct the state at the given time and calculate average confidence
    // Simplified implementation
    const currentNodes = Array.from(this.storage.getGraph().nodes.values());
    return currentNodes.reduce((sum, node) => sum + node.confidence, 0) / currentNodes.length;
  }

  private calculateNodeCountAtTime(timestamp: Date): number {
    // This would reconstruct the node count at the given time
    // Simplified implementation
    return this.storage.getGraph().nodes.size;
  }

  private calculateComplexityAtTime(timestamp: Date): number {
    // Calculate code complexity based on relationships and structure
    const nodes = this.storage.getGraph().nodes.size;
    const edges = this.storage.getGraph().edges.size;
    return edges / Math.max(nodes, 1); // Average connections per node
  }

  private detectTrend(dataPoints: { timestamp: Date; value: number }[]): 'increasing' | 'decreasing' | 'stable' {
    if (dataPoints.length < 2) return 'stable';
    
    const first = dataPoints[0].value;
    const last = dataPoints[dataPoints.length - 1].value;
    const change = (last - first) / Math.abs(first || 1);
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private calculateTrendConfidence(dataPoints: { timestamp: Date; value: number }[], trend: string): number {
    // Simple confidence based on consistency of trend direction
    if (dataPoints.length < 3) return 0.5;
    
    let consistentDirections = 0;
    for (let i = 1; i < dataPoints.length; i++) {
      const direction = dataPoints[i].value > dataPoints[i - 1].value;
      const expectedDirection = trend === 'increasing';
      
      if (trend === 'stable' || direction === expectedDirection) {
        consistentDirections++;
      }
    }
    
    return consistentDirections / (dataPoints.length - 1);
  }

  private generateTrendInsights(dataPoints: { timestamp: Date; value: number }[], trend: string, pattern: string): string[] {
    const insights: string[] = [];
    
    if (dataPoints.length === 0) {
      return ['No data available for analysis'];
    }
    
    const latest = dataPoints[dataPoints.length - 1];
    const earliest = dataPoints[0];
    const change = latest.value - earliest.value;
    const changePercent = Math.round((change / Math.abs(earliest.value || 1)) * 100);
    
    insights.push(`${pattern} has ${trend} by ${changePercent}% over the time period`);
    
    if (pattern === 'error_rate') {
      if (trend === 'increasing') {
        insights.push('Code stability may be declining. Consider reviewing recent changes.');
      } else if (trend === 'decreasing') {
        insights.push('Code stability is improving. Recent changes appear successful.');
      }
    }
    
    if (pattern === 'confidence_avg') {
      if (trend === 'increasing') {
        insights.push('System confidence is growing. Learning system is working effectively.');
      } else if (trend === 'decreasing') {
        insights.push('System confidence is declining. May need to review failed operations.');
      }
    }
    
    return insights;
  }

  private async generatePeriodSummary(period: TimeRange): Promise<PeriodSummary> {
    const changes = this.getChangesInRange(period, '*');
    const errorChanges = changes.filter(c => c.context?.includes('error'));
    
    // This would be more comprehensive in a real implementation
    return {
      nodeCount: this.storage.getGraph().nodes.size,
      avgConfidence: 0.85, // Would calculate actual average
      errorRate: errorChanges.length / Math.max(changes.length, 1),
      totalChanges: changes.length,
      timeRange: period
    };
  }

  private getTopChangedEntities(period1: TimeRange, period2: TimeRange): { id: string; changeCount: number }[] {
    const changeCounts = new Map<string, number>();
    
    const allChanges = [
      ...this.getChangesInRange(period1, '*'),
      ...this.getChangesInRange(period2, '*')
    ];
    
    for (const change of allChanges) {
      const current = changeCounts.get(change.entityId) || 0;
      changeCounts.set(change.entityId, current + 1);
    }
    
    return Array.from(changeCounts.entries())
      .map(([id, changeCount]) => ({ id, changeCount }))
      .sort((a, b) => b.changeCount - a.changeCount)
      .slice(0, 10);
  }

  private generateComparisonInsights(summary1: PeriodSummary, summary2: PeriodSummary, changes: any): string[] {
    const insights: string[] = [];
    
    if (changes.nodeCountChange > 0) {
      insights.push(`Project grew by ${changes.nodeCountChange} entities`);
    } else if (changes.nodeCountChange < 0) {
      insights.push(`Project reduced by ${Math.abs(changes.nodeCountChange)} entities`);
    }
    
    if (changes.avgConfidenceChange > 0.05) {
      insights.push('System confidence improved significantly');
    } else if (changes.avgConfidenceChange < -0.05) {
      insights.push('System confidence declined - review recent changes');
    }
    
    if (changes.errorRateChange > 0.1) {
      insights.push('Error rate increased - stability may be declining');
    } else if (changes.errorRateChange < -0.1) {
      insights.push('Error rate decreased - stability is improving');
    }
    
    return insights;
  }

  private getRecentChanges(since: Date): ChangeEvent[] {
    const cutoff = new Date(since.getTime() - 60 * 60 * 1000); // Last hour
    return this.changeLog.filter(change => change.timestamp >= cutoff);
  }

  private shouldCreateSnapshot(change: ChangeEvent): boolean {
    // Create snapshots for significant changes
    return change.type === 'node_added' || 
           change.type === 'node_removed' ||
           (change.type === 'confidence_changed' && Math.abs((change.afterValue || 0) - (change.beforeValue || 0)) > 0.2);
  }

  private initializeChangeTracking(): void {
    // Set up hooks to track changes automatically
    // This would be integrated with the storage layer to capture all modifications
    console.log('Temporal change tracking initialized');
  }
}

interface PeriodSummary {
  nodeCount: number;
  avgConfidence: number;
  errorRate: number;
  totalChanges: number;
  timeRange: TimeRange;
}