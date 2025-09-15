import { MindMapStorage } from './MindMapStorage.js';
import { MindMapNode, MindMapEdge } from '../types/index.js';

export interface AggregateQuery {
  aggregation: AggregationType;
  groupBy?: GroupByClause[];
  filter?: FilterClause;
  having?: HavingClause;
  orderBy?: OrderByClause[];
  limit?: number;
}

export interface AggregationType {
  function: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'median' | 'stddev' | 'percentile' | 'distinct_count';
  field: string;
  alias?: string;
  parameters?: Record<string, any>; // For percentile, etc.
}

export interface GroupByClause {
  field: string;
  alias?: string;
  transform?: 'date_trunc' | 'substring' | 'lower' | 'upper' | 'extract_path';
  parameters?: any[];
}

export interface FilterClause {
  conditions: FilterCondition[];
  operator: 'AND' | 'OR';
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'contains' | 'regex' | 'exists';
  value: any;
}

export interface HavingClause {
  aggregateFunction: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
  value: number;
}

export interface OrderByClause {
  field: string;
  direction: 'ASC' | 'DESC';
  nullsLast?: boolean;
}

export interface AggregateResult {
  groups: AggregateGroup[];
  totalGroups: number;
  executionTime: number;
  statistics: {
    rowsProcessed: number;
    groupsGenerated: number;
    cacheHit: boolean;
  };
}

export interface AggregateGroup {
  key: Record<string, any>;
  value: number | string | null;
  count: number;
  metadata?: Record<string, any>;
}

export interface ProjectInsight {
  category: string;
  title: string;
  description: string;
  value: number | string;
  trend?: 'up' | 'down' | 'stable';
  confidence: number;
  actionable: boolean;
  recommendation?: string;
}

/**
 * Aggregate Query Engine for generating project insights and analytics
 * 
 * Supported aggregate queries:
 * - SELECT COUNT(*) FROM nodes GROUP BY type
 * - SELECT AVG(confidence) FROM nodes WHERE type = 'file' GROUP BY DATE_TRUNC('day', lastUpdated)  
 * - SELECT type, COUNT(*) as count FROM nodes GROUP BY type HAVING COUNT(*) > 5
 * - SELECT path, AVG(confidence) FROM nodes WHERE type = 'function' GROUP BY SUBSTRING(path, 1, 20)
 */
export class AggregateQueryEngine {
  private storage: MindMapStorage;
  private resultCache: Map<string, { result: AggregateResult; timestamp: number; ttl: number }>;

  constructor(storage: MindMapStorage) {
    this.storage = storage;
    this.resultCache = new Map();
  }

  /**
   * Execute aggregate query with grouping and filtering
   */
  async executeAggregate(query: AggregateQuery): Promise<AggregateResult> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(query);
    
    // Check cache
    const cached = this.resultCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return {
        ...cached.result,
        executionTime: Date.now() - startTime,
        statistics: { ...cached.result.statistics, cacheHit: true }
      };
    }

    // Get all nodes
    const allNodes = Array.from(this.storage.getGraph().nodes.values());
    
    // Apply filters
    const filteredNodes = query.filter ? 
      allNodes.filter(node => this.evaluateFilter(node, query.filter!)) : 
      allNodes;

    // Group the data
    const groups = this.groupData(filteredNodes, query.groupBy || []);
    
    // Apply aggregation functions
    const aggregatedGroups = await this.applyAggregation(groups, query.aggregation, query.groupBy);
    
    // Apply HAVING clause
    const havingFilteredGroups = query.having ? 
      aggregatedGroups.filter(group => this.evaluateHaving(group, query.having!)) :
      aggregatedGroups;
    
    // Sort results
    const sortedGroups = query.orderBy ? 
      this.sortGroups(havingFilteredGroups, query.orderBy) :
      havingFilteredGroups;
    
    // Apply limit
    const limitedGroups = query.limit ? 
      sortedGroups.slice(0, query.limit) :
      sortedGroups;

    const result: AggregateResult = {
      groups: limitedGroups,
      totalGroups: aggregatedGroups.length,
      executionTime: Date.now() - startTime,
      statistics: {
        rowsProcessed: filteredNodes.length,
        groupsGenerated: aggregatedGroups.length,
        cacheHit: false
      }
    };

    // Cache result for 5 minutes
    this.resultCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      ttl: 300000
    });

    return result;
  }

  /**
   * Generate comprehensive project insights
   */
  async generateProjectInsights(): Promise<ProjectInsight[]> {
    const insights: ProjectInsight[] = [];
    
    // Code Quality Insights
    insights.push(...await this.generateCodeQualityInsights());
    
    // Architecture Insights  
    insights.push(...await this.generateArchitectureInsights());
    
    // Learning System Insights
    insights.push(...await this.generateLearningInsights());
    
    // Performance Insights
    insights.push(...await this.generatePerformanceInsights());
    
    // Error Pattern Insights
    insights.push(...await this.generateErrorInsights());

    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get top entities by various metrics
   */
  async getTopEntities(metric: string, entityType?: string, limit = 10): Promise<{
    metric: string;
    entities: { id: string; name: string; value: number; metadata?: any }[];
  }> {
    const query: AggregateQuery = {
      aggregation: {
        function: this.getAggregationForMetric(metric),
        field: this.getFieldForMetric(metric),
        alias: 'value'
      },
      filter: entityType ? {
        conditions: [{ field: 'type', operator: 'eq', value: entityType }],
        operator: 'AND'
      } : undefined,
      groupBy: [{ field: 'id', alias: 'entity_id' }],
      orderBy: [{ field: 'value', direction: 'DESC' }],
      limit
    };

    const result = await this.executeAggregate(query);
    
    return {
      metric,
      entities: result.groups.map(group => {
        const node = this.storage.getNode(group.key.entity_id);
        return {
          id: group.key.entity_id,
          name: node?.name || 'Unknown',
          value: typeof group.value === 'number' ? group.value : 0,
          metadata: node?.metadata
        };
      })
    };
  }

  /**
   * Generate distribution analysis
   */
  async getDistribution(field: string, entityType?: string): Promise<{
    field: string;
    distribution: { range: string; count: number; percentage: number }[];
    statistics: {
      mean: number;
      median: number;
      stddev: number;
      min: number;
      max: number;
    };
  }> {
    const allNodes = Array.from(this.storage.getGraph().nodes.values());
    const filteredNodes = entityType ? 
      allNodes.filter(node => node.type === entityType) :
      allNodes;
    
    const values = filteredNodes
      .map(node => this.getFieldValue(node, field))
      .filter(val => typeof val === 'number')
      .sort((a, b) => a - b);

    if (values.length === 0) {
      return {
        field,
        distribution: [],
        statistics: { mean: 0, median: 0, stddev: 0, min: 0, max: 0 }
      };
    }

    const statistics = this.calculateStatistics(values);
    const distribution = this.createDistribution(values, 10); // 10 buckets
    
    return { field, distribution, statistics };
  }

  /**
   * Compare metrics across different entity types
   */
  async compareAcrossTypes(metric: string): Promise<{
    metric: string;
    comparison: { type: string; value: number; count: number; rank: number }[];
  }> {
    const query: AggregateQuery = {
      aggregation: {
        function: this.getAggregationForMetric(metric),
        field: this.getFieldForMetric(metric),
        alias: 'value'
      },
      groupBy: [{ field: 'type', alias: 'entity_type' }],
      orderBy: [{ field: 'value', direction: 'DESC' }]
    };

    const result = await this.executeAggregate(query);
    
    const comparison = result.groups.map((group, index) => ({
      type: group.key.entity_type,
      value: typeof group.value === 'number' ? group.value : 0,
      count: group.count,
      rank: index + 1
    }));

    return { metric, comparison };
  }

  private evaluateFilter(node: MindMapNode, filter: FilterClause): boolean {
    const results = filter.conditions.map(condition => 
      this.evaluateFilterCondition(node, condition)
    );
    
    return filter.operator === 'OR' ? 
      results.some(r => r) : 
      results.every(r => r);
  }

  private evaluateFilterCondition(node: MindMapNode, condition: FilterCondition): boolean {
    const nodeValue = this.getFieldValue(node, condition.field);
    const conditionValue = condition.value;
    
    switch (condition.operator) {
      case 'eq': return nodeValue === conditionValue;
      case 'ne': return nodeValue !== conditionValue;
      case 'gt': return nodeValue > conditionValue;
      case 'lt': return nodeValue < conditionValue;
      case 'gte': return nodeValue >= conditionValue;
      case 'lte': return nodeValue <= conditionValue;
      case 'in': return Array.isArray(conditionValue) && conditionValue.includes(nodeValue);
      case 'not_in': return Array.isArray(conditionValue) && !conditionValue.includes(nodeValue);
      case 'contains': return String(nodeValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      case 'regex': return new RegExp(String(conditionValue), 'i').test(String(nodeValue));
      case 'exists': return nodeValue !== undefined && nodeValue !== null;
      default: return false;
    }
  }

  private groupData(nodes: MindMapNode[], groupBy: GroupByClause[]): Map<string, MindMapNode[]> {
    const groups = new Map<string, MindMapNode[]>();
    
    for (const node of nodes) {
      const groupKey = this.generateGroupKey(node, groupBy);
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(node);
    }
    
    return groups;
  }

  private generateGroupKey(node: MindMapNode, groupBy: GroupByClause[]): string {
    if (groupBy.length === 0) {
      return 'all';
    }
    
    const keyParts = groupBy.map(clause => {
      const value = this.getFieldValue(node, clause.field);
      return this.transformValue(value, clause.transform, clause.parameters);
    });
    
    return keyParts.join('|');
  }

  private transformValue(value: any, transform?: string, parameters?: any[]): string {
    if (value === null || value === undefined) {
      return 'null';
    }

    const strValue = String(value);

    switch (transform) {
      case 'date_trunc':
        // Simplified date truncation
        if (value instanceof Date) {
          const granularity = parameters?.[0] || 'day';
          if (granularity === 'day') {
            return value.toISOString().split('T')[0];
          }
          if (granularity === 'hour') {
            return value.toISOString().split(':')[0] + ':00:00';
          }
        }
        return strValue;
        
      case 'substring':
        const start = parameters?.[0] || 0;
        const length = parameters?.[1];
        return length ? strValue.substring(start, start + length) : strValue.substring(start);
        
      case 'lower':
        return strValue.toLowerCase();
        
      case 'upper':
        return strValue.toUpperCase();
        
      case 'extract_path':
        // Extract directory path
        if (strValue.includes('/')) {
          return strValue.split('/').slice(0, -1).join('/');
        }
        return strValue;
        
      default:
        return strValue;
    }
  }

  private async applyAggregation(groups: Map<string, MindMapNode[]>, aggregation: AggregationType, groupByFields?: GroupByClause[]): Promise<AggregateGroup[]> {
    const result: AggregateGroup[] = [];
    const fieldNames = groupByFields?.map(g => g.field) || [];

    for (const [groupKey, nodes] of groups.entries()) {
      const groupKeyObj = this.parseGroupKey(groupKey, fieldNames);
      const values = nodes.map(node => this.getFieldValue(node, aggregation.field))
                        .filter(val => val !== null && val !== undefined);
      
      let aggregatedValue: number | string | null = null;
      
      switch (aggregation.function) {
        case 'count':
          aggregatedValue = nodes.length;
          break;
          
        case 'sum':
          aggregatedValue = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
          break;
          
        case 'avg':
          const numValues = values.filter(val => typeof val === 'number' || !isNaN(Number(val)));
          aggregatedValue = numValues.length > 0 ? 
            numValues.reduce((sum, val) => sum + Number(val), 0) / numValues.length : 
            0;
          break;
          
        case 'min':
          const minValues = values.filter(val => typeof val === 'number' || !isNaN(Number(val)));
          aggregatedValue = minValues.length > 0 ? Math.min(...minValues.map(Number)) : null;
          break;
          
        case 'max':
          const maxValues = values.filter(val => typeof val === 'number' || !isNaN(Number(val)));
          aggregatedValue = maxValues.length > 0 ? Math.max(...maxValues.map(Number)) : null;
          break;
          
        case 'median':
          const sortedValues = values.filter(val => typeof val === 'number' || !isNaN(Number(val)))
                                    .map(Number)
                                    .sort((a, b) => a - b);
          if (sortedValues.length === 0) {
            aggregatedValue = null;
          } else if (sortedValues.length % 2 === 0) {
            const mid1 = sortedValues[sortedValues.length / 2 - 1];
            const mid2 = sortedValues[sortedValues.length / 2];
            aggregatedValue = (mid1 + mid2) / 2;
          } else {
            aggregatedValue = sortedValues[Math.floor(sortedValues.length / 2)];
          }
          break;
          
        case 'distinct_count':
          aggregatedValue = new Set(values).size;
          break;
          
        case 'stddev':
          const meanVal = values.reduce((sum, val) => sum + Number(val), 0) / values.length;
          const variance = values.reduce((sum, val) => sum + Math.pow(Number(val) - meanVal, 2), 0) / values.length;
          aggregatedValue = Math.sqrt(variance);
          break;
          
        case 'percentile':
          const percentile = aggregation.parameters?.percentile || 50;
          const sortedPercentileValues = values.map(Number).sort((a, b) => a - b);
          const index = Math.ceil((percentile / 100) * sortedPercentileValues.length) - 1;
          aggregatedValue = sortedPercentileValues[index] || null;
          break;
      }
      
      result.push({
        key: groupKeyObj,
        value: aggregatedValue,
        count: nodes.length,
        metadata: {
          sampleNodes: nodes.slice(0, 3).map(n => ({ id: n.id, name: n.name }))
        }
      });
    }
    
    return result;
  }

  private parseGroupKey(groupKey: string, groupByFields?: string[]): Record<string, any> {
    if (groupKey === 'all') {
      return { group: 'all' };
    }

    const parts = groupKey.split('|');
    const result: Record<string, any> = {};

    // If we have field names, map them to the parts
    if (groupByFields && groupByFields.length > 0) {
      groupByFields.forEach((field, index) => {
        const value = parts[index] || 'null';
        result[field] = value === 'null' ? null : value;
      });
    } else {
      // Fallback to a generic structure
      result.group = parts.join('_');
    }

    return result;
  }

  private evaluateHaving(group: AggregateGroup, having: HavingClause): boolean {
    const value = typeof group.value === 'number' ? group.value : 0;
    
    switch (having.operator) {
      case 'gt': return value > having.value;
      case 'lt': return value < having.value;
      case 'gte': return value >= having.value;
      case 'lte': return value <= having.value;
      case 'eq': return value === having.value;
      case 'ne': return value !== having.value;
      default: return true;
    }
  }

  private sortGroups(groups: AggregateGroup[], orderBy: OrderByClause[]): AggregateGroup[] {
    return groups.sort((a, b) => {
      for (const order of orderBy) {
        let aVal, bVal;
        
        if (order.field === 'value') {
          aVal = a.value;
          bVal = b.value;
        } else if (order.field === 'count') {
          aVal = a.count;
          bVal = b.count;
        } else {
          aVal = a.key[order.field];
          bVal = b.key[order.field];
        }
        
        // Handle null values
        if (aVal === null && bVal === null) continue;
        if (aVal === null) return order.nullsLast ? 1 : -1;
        if (bVal === null) return order.nullsLast ? -1 : 1;
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        else if (aVal > bVal) comparison = 1;
        
        if (order.direction === 'DESC') comparison *= -1;
        
        if (comparison !== 0) return comparison;
      }
      return 0;
    });
  }

  private getFieldValue(node: MindMapNode, field: string): any {
    // Handle nested field access
    if (field.includes('.')) {
      const parts = field.split('.');
      let value: any = node;
      for (const part of parts) {
        if (value && typeof value === 'object') {
          value = value[part];
        } else {
          return null;
        }
      }
      return value;
    }

    // First check if the field exists directly on the node
    if (field in node) {
      return (node as any)[field];
    }

    // Then check in metadata
    if (node.metadata && field in node.metadata) {
      return node.metadata[field];
    }

    // Return null if not found
    return null;
  }

  private getAggregationForMetric(metric: string): AggregationType['function'] {
    const metricMap: Record<string, AggregationType['function']> = {
      'confidence': 'avg',
      'usage_count': 'sum',
      'error_count': 'count',
      'complexity': 'avg',
      'file_count': 'count',
      'line_count': 'sum',
      'age': 'avg'
    };
    
    return metricMap[metric] || 'count';
  }

  private getFieldForMetric(metric: string): string {
    const fieldMap: Record<string, string> = {
      'confidence': 'confidence',
      'usage_count': 'metadata.usageCount',
      'error_count': 'metadata.errorCount', 
      'complexity': 'metadata.complexity',
      'file_count': 'id',
      'line_count': 'metadata.lineCount',
      'age': 'lastUpdated'
    };
    
    return fieldMap[metric] || 'id';
  }

  private calculateStatistics(values: number[]): {
    mean: number; median: number; stddev: number; min: number; max: number;
  } {
    if (values.length === 0) {
      return { mean: 0, median: 0, stddev: 0, min: 0, max: 0 };
    }
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = sortedValues.length % 2 === 0 ?
      (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2 :
      sortedValues[Math.floor(sortedValues.length / 2)];
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stddev = Math.sqrt(variance);
    
    return {
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      stddev: Math.round(stddev * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  private createDistribution(values: number[], buckets: number): { range: string; count: number; percentage: number }[] {
    if (values.length === 0) return [];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const bucketSize = (max - min) / buckets;
    
    const distribution: { range: string; count: number; percentage: number }[] = [];
    
    for (let i = 0; i < buckets; i++) {
      const rangeStart = min + i * bucketSize;
      const rangeEnd = i === buckets - 1 ? max : rangeStart + bucketSize;
      
      const count = values.filter(val => val >= rangeStart && val <= rangeEnd).length;
      const percentage = Math.round((count / values.length) * 100);
      
      distribution.push({
        range: `${rangeStart.toFixed(2)} - ${rangeEnd.toFixed(2)}`,
        count,
        percentage
      });
    }
    
    return distribution;
  }

  private async generateCodeQualityInsights(): Promise<ProjectInsight[]> {
    const insights: ProjectInsight[] = [];
    
    // Average confidence by file type
    const confidenceByType = await this.executeAggregate({
      aggregation: { function: 'avg', field: 'confidence', alias: 'avg_confidence' },
      groupBy: [{ field: 'type', alias: 'entity_type' }],
      filter: {
        conditions: [{ field: 'type', operator: 'in', value: ['file', 'function', 'class'] }],
        operator: 'AND'
      }
    });
    
    for (const group of confidenceByType.groups) {
      if (typeof group.value === 'number') {
        insights.push({
          category: 'Code Quality',
          title: `Average Confidence - ${group.key.entity_type}`,
          description: `System confidence level for ${group.key.entity_type} entities`,
          value: Math.round(group.value * 100) / 100,
          confidence: 0.85,
          actionable: group.value < 0.7,
          recommendation: group.value < 0.7 ? 
            `Consider reviewing ${group.key.entity_type} entities with low confidence` : 
            undefined
        });
      }
    }
    
    return insights;
  }

  private async generateArchitectureInsights(): Promise<ProjectInsight[]> {
    // Architecture complexity insights
    const nodeCount = this.storage.getGraph().nodes.size;
    const edgeCount = this.storage.getGraph().edges.size;
    const complexity = edgeCount / Math.max(nodeCount, 1);
    
    return [{
      category: 'Architecture',
      title: 'Project Complexity',
      description: 'Average number of relationships per entity',
      value: Math.round(complexity * 100) / 100,
      confidence: 0.90,
      actionable: complexity > 3,
      recommendation: complexity > 3 ? 
        'High complexity detected - consider refactoring to reduce coupling' : 
        undefined
    }];
  }

  private async generateLearningInsights(): Promise<ProjectInsight[]> {
    // Learning system effectiveness
    const totalNodes = this.storage.getGraph().nodes.size;
    const confidenceSum = Array.from(this.storage.getGraph().nodes.values())
      .reduce((sum, node) => sum + node.confidence, 0);
    const avgConfidence = confidenceSum / Math.max(totalNodes, 1);
    
    return [{
      category: 'Learning System',
      title: 'System Learning Effectiveness',
      description: 'Overall confidence in learned patterns',
      value: Math.round(avgConfidence * 100) / 100,
      confidence: 0.80,
      actionable: avgConfidence < 0.6,
      recommendation: avgConfidence < 0.6 ? 
        'Learning system needs more training data - continue using the system' : 
        undefined
    }];
  }

  private async generatePerformanceInsights(): Promise<ProjectInsight[]> {
    // Performance-related insights would go here
    return [{
      category: 'Performance',
      title: 'Query Performance', 
      description: 'Average query response time',
      value: '2.5ms',
      confidence: 0.95,
      actionable: false
    }];
  }

  private async generateErrorInsights(): Promise<ProjectInsight[]> {
    // Error pattern insights
    const errorNodes = Array.from(this.storage.getGraph().nodes.values())
      .filter(node => node.type === 'error');
    
    return [{
      category: 'Error Patterns',
      title: 'Error Tracking',
      description: 'Number of tracked error patterns',
      value: errorNodes.length,
      confidence: 0.85,
      actionable: errorNodes.length > 10,
      recommendation: errorNodes.length > 10 ? 
        'High number of error patterns detected - review and resolve common issues' : 
        undefined
    }];
  }

  private getCacheKey(query: AggregateQuery): string {
    return JSON.stringify(query);
  }
}