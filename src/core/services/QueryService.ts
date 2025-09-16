import { MindMapStorage } from '../MindMapStorage.js';
import { AdvancedQueryEngine } from '../AdvancedQueryEngine.js';
import { TemporalQueryEngine } from '../TemporalQueryEngine.js';
import { AggregateQueryEngine } from '../AggregateQueryEngine.js';
import { ActivationNetwork, QueryContext } from '../ActivationNetwork.js';
import { QueryCache } from '../QueryCache.js';
import { MultiModalConfidenceFusion, ConfidenceEvidence } from '../MultiModalConfidenceFusion.js';
import { InhibitoryLearningSystem } from '../InhibitoryLearningSystem.js';
import { HebbianLearningSystem } from '../HebbianLearningSystem.js';
import { HierarchicalContextSystem, ContextLevel, ContextQuery } from '../HierarchicalContextSystem.js';
import { AttentionSystem, AttentionType, AttentionContext, AttentionAllocation } from '../AttentionSystem.js';
import { BiTemporalKnowledgeModel } from '../BiTemporalKnowledgeModel.js';
import { QueryOptions, QueryResult, CacheStats, MindMapNode, MindMapEdge } from '../../types/index.js';
import { join } from 'path';

export class QueryService {
  constructor(
    private storage: MindMapStorage,
    private advancedQueryEngine: AdvancedQueryEngine,
    private temporalQueryEngine: TemporalQueryEngine,
    private aggregateQueryEngine: AggregateQueryEngine,
    private activationNetwork: ActivationNetwork,
    private queryCache: QueryCache,
    private multiModalFusion: MultiModalConfidenceFusion,
    private inhibitoryLearning: InhibitoryLearningSystem,
    private hebbianLearning: HebbianLearningSystem,
    private hierarchicalContext: HierarchicalContextSystem,
    private attentionSystem: AttentionSystem,
    private biTemporalModel: BiTemporalKnowledgeModel
  ) {}

  async query(query: string, options: QueryOptions = {}): Promise<QueryResult> {
    const startTime = Date.now();
    const queryLower = query.toLowerCase();
    const limit = options.limit || 10;

    // Special handling for file path queries - return contents of the file
    if (this.isFilePathQuery(query)) {
      return await this.queryFileContents(query, options, limit, startTime);
    }

    // Smart query routing - automatically route to optimal engine
    const queryRoute = this.determineQueryRoute(query, options);

    // Route to specialized engines for optimal results
    if (queryRoute.engine === 'advanced') {
      const result = await this.advancedQueryEngine.executeQuery(queryRoute.optimizedQuery || query, queryRoute.parameters || {});
      return { ...result, isAdvancedQuery: true };
    } else if (queryRoute.engine === 'temporal') {
      const timeRange = queryRoute.timeRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      };
      const temporalResult = await this.temporalQueryEngine.executeTemporalQuery({
        timeRange: {
          start: typeof timeRange.start === 'string' ? new Date(timeRange.start) : timeRange.start,
          end: typeof timeRange.end === 'string' ? new Date(timeRange.end) : timeRange.end,
          granularity: 'day'
        },
        evolution: {
          entity: queryRoute.entity || '*',
          trackChanges: true,
          includeRelationships: true
        },
        aggregation: {
          metric: 'confidence_avg',
          groupBy: 'time'
        }
      });

      // Convert temporal result to QueryResult format
      const nodes: any[] = temporalResult.timeline.flatMap(snapshot => snapshot.nodes);
      return {
        nodes: nodes.slice(0, limit),
        edges: [],
        totalMatches: nodes.length,
        queryTime: Date.now() - startTime,
        usedActivation: false,
        temporalData: temporalResult,
        isTemporalQuery: true,
        timeRange,
        entity: queryRoute.entity || '*'
      } as any;
    } else if (queryRoute.engine === 'aggregate') {
      const aggregateResult = await this.aggregateQueryEngine.executeAggregate({
        aggregation: queryRoute.aggregation || { function: 'count', field: 'name' },
        groupBy: queryRoute.groupBy,
        filter: queryRoute.filter,
        orderBy: [{ field: 'aggregation_result', direction: 'DESC' }],
        limit: limit
      });

      // Convert aggregate result to QueryResult format
      return {
        nodes: [],
        edges: [],
        totalMatches: aggregateResult.groups.length,
        queryTime: Date.now() - startTime,
        usedActivation: false,
        aggregateData: aggregateResult
      } as any;
    }

    // Create context for caching
    const context = this.createQueryContext(options);

    // Try cache first (unless explicitly bypassed)
    if (!options.bypassCache) {
      const cachedResult = await this.queryCache.get(query, context);
      if (cachedResult) {
        console.log(`[CACHE_HIT] Query "${query}" served from cache with ${cachedResult.nodes.length} nodes`);
        return {
          ...cachedResult,
          cached: true,
          queryTime: Date.now() - startTime // Update with current lookup time
        };
      } else {
        console.log(`[CACHE_MISS] Query "${query}" not found in cache, executing fresh query`);
      }
    }

    // Enable activation spreading by default for better results
    const useActivation = options.useActivation !== false;
    const activationLevels = options.activationLevels || 3;

    let result: QueryResult;
    if (useActivation) {
      result = await this.queryWithActivation(query, queryLower, options, limit, startTime);
    } else {
      result = await this.queryLinear(query, queryLower, options, limit, startTime);
    }

    // Deep debug logging for exact match issue
    const isDebugQuery = true; // Debug ALL queries temporarily

    console.log(`[DEBUG_TEST] Query received in QueryService: "${query}"`);

    if (isDebugQuery) {
      const debugMsg = `\n[DEEP_DEBUG] === Query: "${query}" ===\n` +
                      `[DEEP_DEBUG] After initial query: nodes=${result.nodes.length}, total=${result.totalMatches}\n` +
                      `[DEEP_DEBUG] Query route: ${queryRoute?.engine || 'unknown'}\n` +
                      `[DEEP_DEBUG] Options: ${JSON.stringify({
                        useActivation: options.useActivation,
                        bypassInhibition: options.bypassInhibition,
                        bypassHebbianLearning: options.bypassHebbianLearning,
                        bypassAttention: options.bypassAttention,
                        bypassMultiModalFusion: options.bypassMultiModalFusion
                      })}\n` +
                      (result.nodes.length > 0 ?
                        `[DEEP_DEBUG] First node: ${JSON.stringify({
                          id: result.nodes[0].id,
                          name: result.nodes[0].name,
                          confidence: result.nodes[0].confidence
                        })}\n` : '');

      console.log(debugMsg);

      // Also write to debug file
      try {
        require('fs').appendFileSync('/data/data/com.termux/files/home/projects/mind-map/debug-query.log',
          `${new Date().toISOString()} ${debugMsg}\n`);
      } catch (e) { /* ignore */ }
    }

    // Apply inhibitory learning (unless explicitly bypassed)
    if (!options.bypassInhibition) {
      const inhibitionResult = await this.inhibitoryLearning.applyInhibition(
        result.nodes,
        query,
        context
      );

      // Update result with inhibited nodes
      result.nodes = inhibitionResult.inhibitedResults;
      result.inhibitionApplied = inhibitionResult.appliedPatterns.length > 0;
      result.inhibitionScore = inhibitionResult.inhibitionScore;
      result.originalResultCount = inhibitionResult.originalResults.length;

      // Debug inhibitory learning
      if (isDebugQuery) {
        const inhibMsg = `[DEEP_DEBUG] After inhibition: nodes=${result.nodes.length}, inhibitionApplied=${result.inhibitionApplied}`;
        console.log(inhibMsg);
        try {
          require('fs').appendFileSync('/data/data/com.termux/files/home/projects/mind-map/debug-query.log',
            `${new Date().toISOString()} ${inhibMsg}\n`);
        } catch (e) { /* ignore */ }
      }
    }

    // Apply hierarchical context weighting for enhanced relevance
    if (options.contextLevel || options.includeParentContext || options.includeChildContext) {
      const contextQuery: ContextQuery = {
        text: query,
        level: (options.contextLevel as ContextLevel) || ContextLevel.IMMEDIATE,
        includeParents: options.includeParentContext !== false, // Default true
        includeChildren: options.includeChildContext || false,   // Default false
        maxItems: limit * 2, // Get more candidates for context filtering
        minRelevance: 0.1
      };

      // Get context-enhanced scores
      const contextScores = this.hierarchicalContext.getContextScores(result.nodes, contextQuery);

      // Re-sort nodes based on context-enhanced scores
      const contextMap = new Map(contextScores.map(score => [score.nodeId, score]));
      result.nodes = result.nodes
        .map(node => {
          const contextScore = contextMap.get(node.id);
          return {
            ...node,
            confidence: contextScore ?
              Math.min(1.0, node.confidence + (contextScore.contextBoost * 0.3)) :
              node.confidence,
            contextScore: contextScore?.finalScore || node.confidence
          };
        })
        .sort((a, b) => (b as any).contextScore - (a as any).contextScore)
        .slice(0, limit);
    }

    // Update hierarchical context with query activity
    this.hierarchicalContext.updateFromActivity({
      type: 'query',
      data: { query, results: result.nodes },
      files: result.nodes.filter(n => n.type === 'file').map(n => n.path || n.name),
      functions: result.nodes.filter(n => n.type === 'function').map(n => n.name),
      timestamp: new Date()
    });

    // Apply attention mechanisms for dynamic result focusing (unless bypassed)
    if (result.nodes.length > 0 && !options.bypassAttention) {
      const attentionContext: AttentionContext = {
        currentTask: context,
        activeFiles: options.activeFiles || [],
        recentQueries: [query],
        userGoals: options.sessionGoals || [],
        frameworkContext: options.frameworkContext || [],
        timeContext: {
          sessionStart: new Date(Date.now() - 300000), // Assume 5 min session
          lastActivity: new Date(),
          taskDuration: Date.now() - startTime
        }
      };

      // Apply attention-based result focusing
      result = this.attentionSystem.applyAttentionToResults(result, attentionContext);

      // Allocate attention to top results for future queries
      const attentionType = this.inferAttentionType(options, result);
      this.attentionSystem.allocateAttention(result.nodes.slice(0, 3), attentionContext, attentionType);

      // Update attention from query activity
      this.attentionSystem.updateAttentionFromActivity({
        nodeIds: result.nodes.slice(0, 3).map(n => n.id),
        queryText: query,
        actionType: 'query',
        timestamp: new Date(),
        context: attentionContext
      });
    }

    // Apply bi-temporal knowledge enhancement for temporal reasoning (unless bypassed)
    if (result.nodes.length > 0 && !options.bypassBiTemporal) {
      const queryTime = options.validAt || new Date();
      result.nodes = this.biTemporalModel.enhanceQueryWithBiTemporal(
        result.nodes,
        queryTime,
        options.includeHistory || false
      );

      // Create bi-temporal edges for newly discovered relationships
      if (result.nodes.length > 1) {
        for (let i = 0; i < result.nodes.length - 1; i++) {
          for (let j = i + 1; j < Math.min(result.nodes.length, i + 3); j++) {
            const sourceNode = result.nodes[i];
            const targetNode = result.nodes[j];

            // Only create if confidence is high enough and no existing relationship
            if (sourceNode.confidence > 0.7 && targetNode.confidence > 0.7) {
              try {
                await this.biTemporalModel.createBiTemporalEdge(
                  sourceNode.id,
                  targetNode.id,
                  'relates_to',
                  queryTime,
                  [`Co-appeared in query: "${query}"`],
                  'query_co_occurrence'
                );
              } catch (error) {
                // Edge might already exist, ignore duplicate creation errors
              }
            }
          }
        }
      }
    }

    // Apply Hebbian learning - record co-activation of returned nodes
    if (result.nodes.length > 1 && !options.bypassHebbianLearning) {
      const nodeIds = result.nodes.map(node => node.id);
      const primaryNode = nodeIds[0]; // Most relevant result as primary
      const coActivatedNodes = nodeIds.slice(1); // Rest as co-activated

      // Record co-activation for Hebbian strengthening
      await this.hebbianLearning.recordCoActivation(
        primaryNode,
        coActivatedNodes,
        `query:${query}`, // Context includes the query
        1.0 / result.nodes.length // Strength inversely proportional to result set size
      );
    }

    // Record Hebbian co-activation for top results (brain-inspired learning)
    if (result.nodes.length > 1 && !options.bypassHebbianLearning) {
      const topNodes = result.nodes.slice(0, Math.min(5, result.nodes.length));

      // Record co-activation for each primary node with others
      for (let i = 0; i < topNodes.length; i++) {
        const primaryNode = topNodes[i];
        const coActivatedNodes = topNodes.filter((_, idx) => idx !== i).map(n => n.id);

        if (coActivatedNodes.length > 0) {
          // Calculate activation strength based on result position and confidence
          const positionWeight = 1.0 - (i * 0.15); // Decay by position
          const activationStrength = Math.min(1.0, primaryNode.confidence * positionWeight);

          await this.hebbianLearning.recordCoActivation(
            primaryNode.id,
            coActivatedNodes,
            context || query, // Use context or query as learning context
            activationStrength
          );
        }
      }
    }

    // Apply Multi-Modal Confidence Fusion (unless bypassed)
    if (result.nodes.length > 0 && !options.bypassMultiModalFusion) {
      const fusionContext = {
        currentTask: context,
        activeFiles: options.activeFiles || [],
        query: query,
        sessionGoals: options.sessionGoals || []
      };

      result.nodes = await this.applyMultiModalConfidenceFusion(result.nodes, fusionContext);

      // Re-sort by fused confidence
      result.nodes.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    }

    // Cache the result (only if not bypassed and result is meaningful)
    if (!options.bypassCache && result.nodes.length > 0) {
      await this.queryCache.set(query, context, result);
      console.log(`[CACHE_SET] Cached query "${query}" with ${result.nodes.length} nodes`);
    }

    // Final debug logging
    if (isDebugQuery) {
      const finalMsg = `[DEEP_DEBUG] Final result: nodes=${result.nodes.length}, total=${result.totalMatches}\n` +
                      (result.totalMatches > 0 && result.nodes.length === 0 ?
                        `[DEEP_DEBUG] ⚠️  FILTERING BUG: Found ${result.totalMatches} matches but returned 0 nodes!\n` : '') +
                      `[DEEP_DEBUG] === End Query: "${query}" ===\n`;

      console.log(finalMsg);
      try {
        require('fs').appendFileSync('/data/data/com.termux/files/home/projects/mind-map/debug-query.log',
          `${new Date().toISOString()} ${finalMsg}\n`);
      } catch (e) { /* ignore */ }
    }

    return result;
  }

  // Helper methods (copied from MindMapEngine)
  private isFilePathQuery(query: string): boolean {
    // Check if it looks like a file path with directory separators
    const hasPathSeparator = query.includes('/') || query.includes('\\');

    // Check for file extensions
    const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(query);

    // Common path patterns
    const pathPattern = /^[a-zA-Z]?[\/\\]?([a-zA-Z0-9_\-\.\/\\]+[\/\\][a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)$/;
    const unixPathPattern = /^\.?\/([a-zA-Z0-9_\-\.\/])+\.[a-zA-Z0-9]+$/;
    const windowsPathPattern = /^[a-zA-Z]:[\/\\]([a-zA-Z0-9_\-\.\/\\])+\.[a-zA-Z0-9]+$/;
    const relativePathPattern = /^(src|dist|tests|test|lib|bin|docs?)[\/\\]/;

    return (hasPathSeparator && hasFileExtension) ||
           pathPattern.test(query) ||
           unixPathPattern.test(query) ||
           windowsPathPattern.test(query) ||
           relativePathPattern.test(query);
  }

  private async queryFileContents(query: string, options: QueryOptions, limit: number, startTime: number): Promise<any> {
    // Find the file node and its contents (functions, classes)
    const graph = this.storage.getGraph();
    const results: MindMapNode[] = [];

    // Normalize the query path
    const normalizedQuery = query.replace(/\\/g, '/').toLowerCase();

    for (const [nodeId, node] of graph.nodes) {
      const nodePath = node.path?.replace(/\\/g, '/').toLowerCase() || '';

      // Check for exact path match or ending with the query
      if (nodePath === normalizedQuery ||
          nodePath.endsWith('/' + normalizedQuery) ||
          nodePath.endsWith(normalizedQuery)) {

        // Add the file node itself with highest confidence
        results.push({
          ...node,
          confidence: 1.4
        });

        // If it's a file, also find its contents (functions, classes)
        if (node.type === 'file') {
          // Find all functions and classes that belong to this file
          for (const [childId, childNode] of graph.nodes) {
            if ((childNode.type === 'function' || childNode.type === 'class') &&
                childNode.path?.replace(/\\/g, '/').toLowerCase() === nodePath) {
              results.push({
                ...childNode,
                confidence: 1.2
              });
            }
          }
        }
      }
    }

    // Sort by confidence
    results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

    return {
      nodes: results.slice(0, limit),
      edges: [],
      totalMatches: results.length,
      queryTime: Date.now() - startTime,
      cached: false,
      isFileQuery: true
    };
  }

  private determineQueryRoute(query: string, options: QueryOptions): any {
    const queryLower = query.toLowerCase();

    // Check for Cypher-like advanced query patterns
    const advancedPatterns = [
      /match\s*\(/i,
      /where\s+\w+\./i,
      /return\s+\w+\./i,
      /\bwhere\b.*\bequals?\b/i,
      /\bmatch\b.*\bnodes?\b/i,
      /find.*relationships?.*between/i
    ];

    if (advancedPatterns.some(pattern => pattern.test(query))) {
      return {
        engine: 'advanced',
        optimizedQuery: query,
        parameters: {}
      };
    }

    // Check for temporal/time-based query patterns
    const temporalPatterns = [
      /\b(over\s+time|evolution|changes?\s+over|history|timeline|temporal)\b/i,
      /\b(when|since|until|before|after|during)\b/i,
      /\b(trend|growth|decline|progression)\b/i
    ];

    if (temporalPatterns.some(pattern => pattern.test(query))) {
      return {
        engine: 'temporal',
        entity: this.extractEntity(query),
        timeRange: this.extractTimeRange(query)
      };
    }

    // Check for aggregate/statistics query patterns
    const aggregatePatterns = [
      /\b(count|sum|average|avg|total|statistics|stats)\b/i,
      /\b(group\s+by|grouped?\s+by|by\s+type)\b/i,
      /\bhow\s+many\b/i,
      /\b(distribution|breakdown)\b/i,
      /\b(files?\s+by\s+type|classes?\s+by|functions?\s+by)\b/i
    ];

    if (aggregatePatterns.some(pattern => pattern.test(query))) {
      return {
        engine: 'aggregate',
        aggregation: this.determineAggregation(query),
        groupBy: this.determineGrouping(query),
        filter: this.extractFilter(query)
      };
    }

    // Default to linear search for simple queries
    return { engine: 'linear' };
  }

  private extractEntity(query: string): string {
    // Extract entity from temporal queries
    const entityMatches = query.match(/\b(file|function|class|node|component)s?\b/i);
    return entityMatches ? entityMatches[1].toLowerCase() : '*';
  }

  private extractTimeRange(query: string): any {
    // For now, return default time range - could be enhanced to parse specific dates
    return {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date()
    };
  }

  private determineAggregation(query: string): any {
    if (/\bcount\b/i.test(query)) {
      return { function: 'count', field: 'id' };
    }
    if (/\b(sum|total)\b/i.test(query)) {
      return { function: 'sum', field: 'confidence' };
    }
    if (/\b(average|avg)\b/i.test(query)) {
      return { function: 'avg', field: 'confidence' };
    }
    return { function: 'count', field: 'id' }; // default
  }

  private determineGrouping(query: string): any[] {
    if (/\b(by\s+type|files?\s+by\s+type|group.*type)\b/i.test(query)) {
      return [{ field: 'type' }];
    }
    if (/\b(by\s+name|group.*name)\b/i.test(query)) {
      return [{ field: 'name' }];
    }
    return [{ field: 'type' }]; // default grouping
  }

  private extractFilter(query: string): any {
    // Extract basic filters from query
    const typeMatch = query.match(/\b(file|function|class|directory)s?\b/i);
    if (typeMatch) {
      return {
        conditions: [{ field: 'type', operator: 'eq', value: typeMatch[1].toLowerCase() }],
        operator: 'AND'
      };
    }
    return undefined;
  }

  private createQueryContext(options: QueryOptions): string {
    // Create deterministic cache key from options
    const cacheKey = {
      type: options.type || 'default',
      limit: options.limit || 10,
      useActivation: options.useActivation !== false,
      activationLevels: options.activationLevels || 3,
      includeMetadata: options.includeMetadata || false,
      bypassCache: false, // Don't include this in cache key
      // Include context-affecting options only
      contextLevel: options.contextLevel,
      includeParentContext: options.includeParentContext,
      includeChildContext: options.includeChildContext,
      activeFiles: options.activeFiles?.sort() || [], // Sort for consistency
      sessionGoals: options.sessionGoals?.sort() || [], // Sort for consistency
      frameworkContext: options.frameworkContext?.sort() || [] // Sort for consistency
    };

    // Create stable JSON string (sorted keys)
    return JSON.stringify(cacheKey, Object.keys(cacheKey).sort());
  }

  private async queryWithActivation(query: string, queryLower: string, options: QueryOptions, limit: number, startTime: number): Promise<QueryResult> {
    // Implementation would need to be copied from MindMapEngine
    return this.queryLinear(query, queryLower, options, limit, startTime);
  }

  private async queryLinear(query: string, queryLower: string, options: QueryOptions, limit: number, startTime: number): Promise<QueryResult> {
    // Enhanced linear search with multi-word and semantic support
    const graph = this.storage.getGraph();
    const results: MindMapNode[] = [];

    // Handle multi-word queries by splitting and searching for all terms
    const queryTerms = queryLower.split(/[\s\-_]+/).filter(term => term.length > 0);
    const isMultiWord = queryTerms.length > 1;

    // Create semantic mappings for common language terms
    const semanticMappings: Record<string, string[]> = {
      'typescript': ['.ts', 'typescript', 'ts'],
      'javascript': ['.js', 'javascript', 'js'],
      'python': ['.py', 'python', 'py'],
      'java': ['java', '.java'],
      'mindmap': ['mind', 'map', 'mindmap'],
      'mind': ['mind', 'mindmap'],
      'map': ['map', 'mindmap']
    };

    // Expand query terms with semantic equivalents
    const expandedTerms = new Set<string>();
    queryTerms.forEach(term => {
      expandedTerms.add(term);
      if (semanticMappings[term]) {
        semanticMappings[term].forEach(equiv => expandedTerms.add(equiv));
      }
    });

    for (const [nodeId, node] of graph.nodes) {
      let relevanceScore = 0;
      let matchedTerms = 0;

      const nodeName = node.name.toLowerCase();
      const nodePath = node.path?.toLowerCase() || '';

      // Check for exact match first (highest priority)
      if (nodeName === queryLower || nodePath === queryLower) {
        relevanceScore = 1.4;
      }
      // Check for exact path match (normalize slashes)
      else if (nodePath && (nodePath.endsWith('/' + query) || nodePath === query.replace(/\\/g, '/'))) {
        relevanceScore = 1.3;
      }
      // Multi-word query: check if all terms match
      else if (isMultiWord) {
        for (const term of expandedTerms) {
          if (nodeName.includes(term) || nodePath.includes(term)) {
            matchedTerms++;
            relevanceScore += 0.5;
          }
        }
        // Boost score if all original terms matched
        if (matchedTerms >= queryTerms.length) {
          relevanceScore *= 1.5;
        }
        // Penalize if not all terms matched
        else if (matchedTerms < queryTerms.length) {
          relevanceScore *= (matchedTerms / queryTerms.length);
        }
      }
      // Single term query: standard includes check
      else {
        // Check all expanded terms for single-word queries too
        for (const term of expandedTerms) {
          if (nodeName.includes(term)) {
            relevanceScore = Math.max(relevanceScore, 0.8);
          }
          if (nodePath.includes(term)) {
            relevanceScore = Math.max(relevanceScore, 0.6);
          }
        }
      }

      // Check metadata for additional matching (functions, classes, etc.)
      if (node.metadata) {
        const metadataStr = JSON.stringify(node.metadata).toLowerCase();
        for (const term of expandedTerms) {
          if (metadataStr.includes(term)) {
            relevanceScore += 0.3;
          }
        }
      }

      if (relevanceScore > 0) {
        results.push({
          ...node,
          confidence: relevanceScore
        });
      }
    }

    results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

    return {
      nodes: results.slice(0, limit),
      edges: [],
      totalMatches: results.length,
      queryTime: Date.now() - startTime,
      cached: false
    };
  }

  private inferAttentionType(options: QueryOptions, result: QueryResult): AttentionType {
    return AttentionType.SELECTIVE;
  }

  private async applyMultiModalConfidenceFusion(nodes: any[], context: any): Promise<any[]> {
    return nodes.map((node) => {
      const evidence: ConfidenceEvidence[] = [{
        source: 'semantic' as const,
        value: node.confidence || 0.5,
        weight: 1.0,
        uncertainty: 0.1,
        metadata: { queryTime: Date.now() }
      }];

      const confidence = this.multiModalFusion.fuseConfidence(evidence);

      return {
        ...node,
        confidence: confidence.finalConfidence,
        confidenceBreakdown: confidence
      };
    });
  }

  getCacheStats(): CacheStats {
    return this.queryCache.getStats();
  }

  async clearCache(): Promise<void> {
    await this.queryCache.invalidate();
  }
}