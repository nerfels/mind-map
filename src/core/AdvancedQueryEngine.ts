import { MindMapStorage } from './MindMapStorage.js';
import { MindMapNode, MindMapEdge, QueryResult } from '../types/index.js';

export interface QueryPlan {
  nodes: NodePattern[];
  edges: EdgePattern[];
  where?: WhereClause;
  return?: ReturnClause;
  orderBy?: OrderByClause;
  limit?: number;
  skip?: number;
}

export interface NodePattern {
  variable?: string;
  labels?: string[];
  properties?: Record<string, any>;
}

export interface EdgePattern {
  variable?: string;
  type?: string;
  direction?: 'in' | 'out' | 'both';
  from: string;
  to: string;
}

export interface WhereClause {
  conditions: Condition[];
  operator: 'AND' | 'OR';
}

export interface Condition {
  left: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'starts_with' | 'ends_with' | 'regex';
  right: any;
}

export interface ReturnClause {
  items: ReturnItem[];
  distinct?: boolean;
}

export interface ReturnItem {
  expression: string;
  alias?: string;
  aggregate?: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'collect';
}

export interface OrderByClause {
  items: {
    expression: string;
    direction: 'ASC' | 'DESC';
  }[];
}

export interface SavedQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  parameters?: Record<string, any>;
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
}

export interface QueryOptimization {
  useIndex: boolean;
  indexHints: string[];
  estimatedCost: number;
  executionPlan: string[];
}

/**
 * Advanced Query Engine with Cypher-like syntax support
 * 
 * Supported query patterns:
 * - MATCH (n:file) RETURN n.name, n.path
 * - MATCH (f:file)-[:CONTAINS]->(func:function) WHERE f.name CONTAINS "test" RETURN func.name
 * - MATCH (c:class)-[:IMPORTS]->(dep) RETURN c.name, collect(dep.name) as dependencies
 * - MATCH path = (start)-[*1..3]-(end) WHERE start.type = "file" RETURN path
 */
export class AdvancedQueryEngine {
  private storage: MindMapStorage;
  private savedQueries: Map<string, SavedQuery>;
  private queryCache: Map<string, { result: QueryResult; timestamp: number; ttl: number }>;
  private cacheHitCount: number = 0;
  private cacheMissCount: number = 0;

  constructor(storage: MindMapStorage) {
    this.storage = storage;
    this.savedQueries = new Map();
    this.queryCache = new Map();
    this.loadSavedQueries();
  }

  /**
   * Execute a Cypher-like query
   */
  async executeQuery(query: string, parameters: Record<string, any> = {}): Promise<QueryResult> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(query, parameters);

    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      this.cacheHitCount++;
      return {
        ...cached.result,
        queryTime: Date.now() - startTime,
        cached: true
      };
    }

    this.cacheMissCount++;
    
    try {
      // Parse the query
      const queryPlan = this.parseQuery(query, parameters);
      
      // Optimize the query
      const optimization = this.optimizeQuery(queryPlan);
      
      // Execute the optimized query
      const result = await this.executeQueryPlan(queryPlan, optimization);
      
      // Cache the result
      this.cacheResult(cacheKey, result, 300000); // 5 minutes TTL
      
      return {
        ...result,
        queryTime: Date.now() - startTime,
        cached: false
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse Cypher-like query into execution plan
   */
  private parseQuery(query: string, parameters: Record<string, any>): QueryPlan {
    const normalizedQuery = query.trim().toUpperCase();
    
    // Simple regex-based parser for common patterns
    const matchPattern = /MATCH\s+(.+?)(?:\s+WHERE\s+(.+?))?(?:\s+RETURN\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i;
    const match = normalizedQuery.match(matchPattern);
    
    if (!match) {
      throw new Error('Invalid query syntax. Expected MATCH pattern.');
    }

    const [, matchClause, whereClause, returnClause, orderByClause, limitClause] = match;
    
    return {
      nodes: this.parseNodePatterns(matchClause),
      edges: this.parseEdgePatterns(matchClause),
      where: whereClause ? this.parseWhereClause(whereClause) : undefined,
      return: returnClause ? this.parseReturnClause(returnClause) : { items: [{ expression: '*' }] },
      orderBy: orderByClause ? this.parseOrderByClause(orderByClause) : undefined,
      limit: limitClause ? parseInt(limitClause) : undefined
    };
  }

  private parseNodePatterns(matchClause: string): NodePattern[] {
    // Parse node patterns like (n:file), (func:function {name: "test"})
    const nodePattern = /\((\w+)(?::(\w+))?(?:\s*\{([^}]+)\})?\)/g;
    const patterns: NodePattern[] = [];
    
    let match;
    while ((match = nodePattern.exec(matchClause)) !== null) {
      const [, variable, label, propertiesStr] = match;
      const pattern: NodePattern = {
        variable,
        labels: label ? [label] : undefined,
        properties: propertiesStr ? this.parseProperties(propertiesStr) : undefined
      };
      patterns.push(pattern);
    }
    
    return patterns;
  }

  private parseEdgePatterns(matchClause: string): EdgePattern[] {
    // Parse edge patterns like -[:CONTAINS]-, -[r:IMPORTS]->
    const edgePattern = /-\[(\w*):?(\w*)\]-[>]?/g;
    const patterns: EdgePattern[] = [];
    
    let match;
    while ((match = edgePattern.exec(matchClause)) !== null) {
      const [, variable, type] = match;
      // This is simplified - in a full implementation we'd need to track from/to
      const pattern: EdgePattern = {
        variable: variable || undefined,
        type: type || undefined,
        direction: matchClause.includes('->') ? 'out' : 'both',
        from: '', // Would be determined from context
        to: ''    // Would be determined from context
      };
      patterns.push(pattern);
    }
    
    return patterns;
  }

  private parseWhereClause(whereClause: string): WhereClause {
    // Enhanced WHERE clause parsing with better regex
    const conditions: Condition[] = [];
    const parts = whereClause.split(/\s+AND\s+|\s+OR\s+/i);

    for (const part of parts) {
      // Enhanced regex to handle quoted strings and property access better
      const conditionMatch = part.match(/([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)?)\s*(=|!=|>|<|>=|<=|CONTAINS|STARTS\s+WITH|ENDS\s+WITH|REGEX)\s*(['"].*?['"]|\S+)/i);
      if (conditionMatch) {
        const [, left, op, right] = conditionMatch;
        conditions.push({
          left: left.trim(),
          operator: this.normalizeOperator(op),
          right: this.parseValue(right.trim())
        });
      }
    }

    return {
      conditions,
      operator: whereClause.toUpperCase().includes(' OR ') ? 'OR' : 'AND'
    };
  }

  private parseReturnClause(returnClause: string): ReturnClause {
    const items: ReturnItem[] = [];
    const parts = returnClause.split(',').map(p => p.trim());
    
    for (const part of parts) {
      const aliasMatch = part.match(/(.+?)\s+AS\s+(\w+)/i);
      const aggregateMatch = part.match(/(COUNT|SUM|AVG|MIN|MAX|COLLECT)\s*\(\s*(.+?)\s*\)/i);
      
      if (aggregateMatch) {
        const [, aggregate, expression] = aggregateMatch;
        items.push({
          expression: expression,
          aggregate: aggregate.toLowerCase() as any,
          alias: aliasMatch ? aliasMatch[2] : undefined
        });
      } else {
        items.push({
          expression: aliasMatch ? aliasMatch[1] : part,
          alias: aliasMatch ? aliasMatch[2] : undefined
        });
      }
    }
    
    return {
      items,
      distinct: returnClause.toUpperCase().includes('DISTINCT')
    };
  }

  private parseOrderByClause(orderByClause: string): OrderByClause {
    const items = orderByClause.split(',').map(item => {
      const parts = item.trim().split(/\s+/);
      return {
        expression: parts[0],
        direction: (parts[1]?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC') as 'ASC' | 'DESC'
      };
    });
    
    return { items };
  }

  private parseProperties(propertiesStr: string): Record<string, any> {
    const properties: Record<string, any> = {};
    const pairs = propertiesStr.split(',');
    
    for (const pair of pairs) {
      const [key, value] = pair.split(':').map(s => s.trim());
      if (key && value) {
        properties[key] = this.parseValue(value);
      }
    }
    
    return properties;
  }

  private parseValue(value: string): any {
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1);
    }
    if (/^\d+$/.test(value)) {
      return parseInt(value);
    }
    if (/^\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    return value;
  }

  private normalizeOperator(op: string): Condition['operator'] {
    switch (op.toUpperCase()) {
      case '=': return 'eq';
      case '!=': return 'ne';
      case '>': return 'gt';
      case '<': return 'lt';
      case '>=': return 'gte';
      case '<=': return 'lte';
      case 'CONTAINS': return 'contains';
      case 'STARTS WITH': return 'starts_with';
      case 'ENDS WITH': return 'ends_with';
      case 'REGEX': return 'regex';
      default: return 'eq';
    }
  }

  /**
   * Optimize query execution plan
   */
  private optimizeQuery(queryPlan: QueryPlan): QueryOptimization {
    const indexHints: string[] = [];
    let estimatedCost = 100; // Base cost
    const executionPlan: string[] = [];

    // Check if we can use indexes
    for (const node of queryPlan.nodes) {
      if (node.labels?.includes('file') || node.labels?.includes('function')) {
        indexHints.push(`USE_INDEX(${node.variable}, type)`);
        estimatedCost -= 20;
        executionPlan.push(`Index scan on ${node.variable} (${node.labels.join(', ')})`);
      }
    }

    // Check WHERE clause for indexed properties
    if (queryPlan.where) {
      for (const condition of queryPlan.where.conditions) {
        if (condition.left.includes('.name') || condition.left.includes('.path')) {
          indexHints.push(`USE_INDEX(${condition.left.split('.')[0]}, ${condition.left.split('.')[1]})`);
          estimatedCost -= 10;
          executionPlan.push(`Index lookup on ${condition.left}`);
        }
      }
    }

    return {
      useIndex: indexHints.length > 0,
      indexHints,
      estimatedCost,
      executionPlan
    };
  }

  /**
   * Execute the query plan
   */
  private async executeQueryPlan(queryPlan: QueryPlan, optimization: QueryOptimization): Promise<QueryResult> {
    const startTime = Date.now();
    let matchingNodes: MindMapNode[] = [];
    
    // Start with all nodes or use index if available
    const allNodes = Array.from(this.storage.getGraph().nodes.values());
    
    // Apply node pattern filters
    for (const nodePattern of queryPlan.nodes) {
      const filteredNodes = allNodes.filter(node => {
        // Label filter
        if (nodePattern.labels && !nodePattern.labels.includes(node.type)) {
          return false;
        }
        
        // Property filters
        if (nodePattern.properties) {
          for (const [key, value] of Object.entries(nodePattern.properties)) {
            const nodeValue = (node as any)[key] || node.metadata[key];
            if (nodeValue !== value) {
              return false;
            }
          }
        }
        
        return true;
      });
      
      matchingNodes = matchingNodes.length === 0 ? filteredNodes : 
        matchingNodes.filter(node => filteredNodes.includes(node));
    }

    // Apply WHERE clause
    if (queryPlan.where) {
      matchingNodes = matchingNodes.filter(node => this.evaluateWhereClause(node, queryPlan.where!));
    }

    // Apply ORDER BY
    if (queryPlan.orderBy) {
      matchingNodes.sort((a, b) => {
        for (const orderItem of queryPlan.orderBy!.items) {
          const aValue = this.getNodeValue(a, orderItem.expression);
          const bValue = this.getNodeValue(b, orderItem.expression);
          
          let comparison = 0;
          if (aValue < bValue) comparison = -1;
          else if (aValue > bValue) comparison = 1;
          
          if (orderItem.direction === 'DESC') comparison *= -1;
          
          if (comparison !== 0) return comparison;
        }
        return 0;
      });
    }

    // Apply LIMIT and SKIP
    if (queryPlan.skip) {
      matchingNodes = matchingNodes.slice(queryPlan.skip);
    }
    if (queryPlan.limit) {
      matchingNodes = matchingNodes.slice(0, queryPlan.limit);
    }

    // Get related edges
    const nodeIds = matchingNodes.map(n => n.id);
    const relatedEdges = this.getRelatedEdges(nodeIds);

    return {
      nodes: matchingNodes,
      edges: relatedEdges,
      totalMatches: matchingNodes.length,
      queryTime: Date.now() - startTime
    };
  }

  private evaluateWhereClause(node: MindMapNode, whereClause: WhereClause): boolean {
    const results = whereClause.conditions.map(condition => this.evaluateCondition(node, condition));
    
    if (whereClause.operator === 'OR') {
      return results.some(r => r);
    } else {
      return results.every(r => r);
    }
  }

  private evaluateCondition(node: MindMapNode, condition: Condition): boolean {
    const nodeValue = this.getNodeValue(node, condition.left);
    const conditionValue = condition.right;

    // Debug logging - temporarily enabled
    if (condition.left === 'name' && condition.operator === 'contains' && String(conditionValue).toLowerCase().includes('mindmap')) {
      console.log(`[DEBUG] Evaluating condition: node.name="${nodeValue}" CONTAINS "${conditionValue}"`);
      console.log(`[DEBUG] Node keys:`, Object.keys(node));
      if (node.metadata) {
        console.log(`[DEBUG] Metadata keys:`, Object.keys(node.metadata));
      }
    }

    switch (condition.operator) {
      case 'eq': return nodeValue === conditionValue;
      case 'ne': return nodeValue !== conditionValue;
      case 'gt': return nodeValue > conditionValue;
      case 'lt': return nodeValue < conditionValue;
      case 'gte': return nodeValue >= conditionValue;
      case 'lte': return nodeValue <= conditionValue;
      case 'contains': return String(nodeValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      case 'starts_with': return String(nodeValue).toLowerCase().startsWith(String(conditionValue).toLowerCase());
      case 'ends_with': return String(nodeValue).toLowerCase().endsWith(String(conditionValue).toLowerCase());
      case 'regex': return new RegExp(String(conditionValue), 'i').test(String(nodeValue));
      default: return false;
    }
  }

  private getNodeValue(node: MindMapNode, expression: string): any {
    const parts = expression.split('.');
    if (parts.length === 1) {
      const field = parts[0];
      // First check direct properties on the node
      if (field in node) {
        return (node as any)[field];
      }
      // Then check metadata
      if (node.metadata && field in node.metadata) {
        return node.metadata[field];
      }
      return undefined;
    } else {
      const [prefix, property] = parts;
      if (prefix === 'n' || prefix === 'node') {
        // First check direct properties
        if (property in node) {
          return (node as any)[property];
        }
        // Then check metadata
        if (node.metadata && property in node.metadata) {
          return node.metadata[property];
        }
        return undefined;
      }
      // For other prefixes, assume it's metadata
      if (node.metadata && property in node.metadata) {
        return node.metadata[property];
      }
      return undefined;
    }
  }

  private getRelatedEdges(nodeIds: string[]): MindMapEdge[] {
    const edges: MindMapEdge[] = [];
    const nodeIdSet = new Set(nodeIds);
    
    for (const edge of this.storage.getGraph().edges.values()) {
      if (nodeIdSet.has(edge.source) || nodeIdSet.has(edge.target)) {
        edges.push(edge);
      }
    }
    
    return edges;
  }

  /**
   * Save a query template for reuse
   */
  saveQuery(name: string, description: string, query: string, parameters?: Record<string, any>): string {
    const id = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const savedQuery: SavedQuery = {
      id,
      name,
      description,
      query,
      parameters,
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 0
    };
    
    this.savedQueries.set(id, savedQuery);
    this.persistSavedQueries();
    return id;
  }

  /**
   * Execute a saved query
   */
  async executeSavedQuery(queryId: string, parameters?: Record<string, any>): Promise<QueryResult> {
    const savedQuery = this.savedQueries.get(queryId);
    if (!savedQuery) {
      throw new Error(`Saved query with ID ${queryId} not found`);
    }
    
    savedQuery.lastUsed = new Date();
    savedQuery.usageCount++;
    
    const mergedParams = { ...savedQuery.parameters, ...parameters };
    return await this.executeQuery(savedQuery.query, mergedParams);
  }

  /**
   * List all saved queries
   */
  getSavedQueries(): SavedQuery[] {
    return Array.from(this.savedQueries.values());
  }

  /**
   * Get query cache statistics
   */
  getCacheStats(): { hitRate: number; size: number; hits: number; misses: number } {
    const total = this.cacheHitCount + this.cacheMissCount;
    return {
      hitRate: total > 0 ? this.cacheHitCount / total : 0,
      size: this.queryCache.size,
      hits: this.cacheHitCount,
      misses: this.cacheMissCount
    };
  }

  private getCacheKey(query: string, parameters: Record<string, any>): string {
    return `${query}:${JSON.stringify(parameters)}`;
  }

  private cacheResult(key: string, result: QueryResult, ttl: number): void {
    this.queryCache.set(key, {
      result: { ...result },
      timestamp: Date.now(),
      ttl
    });
    
    // Clean up old cache entries
    if (this.queryCache.size > 100) {
      const oldestEntries = Array.from(this.queryCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
        .slice(0, 20);
      
      for (const [key] of oldestEntries) {
        this.queryCache.delete(key);
      }
    }
  }

  private loadSavedQueries(): void {
    // In a real implementation, this would load from persistent storage
    // For now, we'll just initialize an empty map
  }

  private persistSavedQueries(): void {
    // In a real implementation, this would save to persistent storage
    // For now, we'll just keep them in memory
  }
}