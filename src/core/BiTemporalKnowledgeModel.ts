/**
 * Bi-temporal Knowledge Model - Advanced temporal reasoning for knowledge graphs
 * Implements dual-time tracking: Valid Time vs Transaction Time
 * Based on temporal database research and bi-temporal modeling principles
 */

import { MindMapStorage } from './MindMapStorage.js';
import { MindMapNode, MindMapEdge } from '../types/index.js';

// Bi-temporal Interfaces
export interface ValidTimeInterval {
  start: Date;                    // When the relationship started being true in reality
  end: Date | null;              // When it ended (null = ongoing)
  confidence: number;            // Confidence in this time interval (0-1)
  evidence: string[];            // Evidence supporting this timing
}

export interface TransactionTimeInterval {
  created: Date;                 // When we first learned about this relationship
  lastModified: Date;            // When we last updated our knowledge
  revisions: EdgeRevision[];     // History of all changes to our knowledge
  discoveredBy: string;          // How we discovered this (query, scan, user input)
}

export interface EdgeRevision {
  id: string;
  timestamp: Date;
  action: 'created' | 'updated' | 'invalidated' | 'restored';
  previousState?: any;           // Previous edge state
  newState: any;                 // New edge state
  reason: string;                // Why this change was made
  confidence: number;            // Confidence in this revision
  evidence: string[];            // Evidence for this change
}

export interface ContextWindow {
  id: string;
  name: string;                  // e.g., "React v16 era", "Python 3.8 migration"
  validTime: ValidTimeInterval;
  description: string;
  relatedNodes: string[];        // Nodes that were relevant in this context
  frameworkVersions?: Record<string, string>; // Framework versions during this period
  projectPhase?: string;         // Project phase (planning, development, maintenance)
}

export interface BiTemporalEdge extends MindMapEdge {
  validTime: ValidTimeInterval;
  transactionTime: TransactionTimeInterval;
  contextWindows: string[];      // IDs of context windows this edge is valid in
  temporalType: 'snapshot' | 'continuous' | 'periodic' | 'event-driven';
  causalRelationship?: {
    cause: string;               // What caused this relationship
    effect: string;              // What effect it had
    delay: number;               // Time delay between cause and effect (ms)
  };
}

export interface BiTemporalNode extends MindMapNode {
  validTime: ValidTimeInterval;
  transactionTime: TransactionTimeInterval;
  temporalProperties: {
    creationReason: string;      // Why this node was created
    lifecycleStage: 'planning' | 'development' | 'active' | 'deprecated' | 'removed';
    dependencies: Array<{
      nodeId: string;
      dependencyType: 'requires' | 'uses' | 'extends' | 'implements';
      validTime: ValidTimeInterval;
    }>;
    versionHistory: Array<{
      version: string;
      validTime: ValidTimeInterval;
      changes: string[];
    }>;
  };
}

export interface TemporalQuery {
  asOf?: Date;                   // Query state as of this transaction time
  validAt?: Date;                // Query relationships valid at this point in time
  validDuring?: ValidTimeInterval; // Query relationships valid during this interval
  contextWindow?: string;        // Query within specific context window
  includeHistory?: boolean;      // Include revision history in results
  temporalOperator?: 'overlaps' | 'contains' | 'contained_by' | 'meets' | 'precedes' | 'follows';
}

export interface BiTemporalStats {
  totalBiTemporalEdges: number;
  totalContextWindows: number;
  averageValidDuration: number;  // Average duration of valid relationships (ms)
  activeRelationships: number;   // Relationships currently valid
  historicalRelationships: number; // Relationships that ended
  revisionCount: number;         // Total number of revisions
  recentRevisions: EdgeRevision[];
  longestValidRelationship: {
    edgeId: string;
    duration: number;
    description: string;
  };
  mostRevisedEdge: {
    edgeId: string;
    revisionCount: number;
    description: string;
  };
}

export interface BiTemporalConfig {
  maxRevisionHistory: number;    // Maximum revisions to keep per edge
  confidenceDecayRate: number;   // How confidence decays over time
  contextWindowOverlap: number;  // Minimum overlap for context windows (ms)
  automaticInvalidation: boolean; // Auto-invalidate based on code changes
  retentionPeriod: number;       // How long to keep historical data (ms)
  snapshotInterval: number;      // How often to create temporal snapshots (ms)
}

/**
 * BiTemporalKnowledgeModel - Implements dual-time tracking for knowledge graphs
 * 
 * Core Principles:
 * 1. Valid Time - When facts were true in reality
 * 2. Transaction Time - When we learned about the facts
 * 3. Context Windows - Temporal contexts for grouping related changes
 * 4. Revision Tracking - Complete audit trail of knowledge changes
 * 5. Temporal Queries - Query knowledge at any point in time
 * 6. Causal Relationships - Track cause-effect relationships with timing
 */
export class BiTemporalKnowledgeModel {
  private storage: MindMapStorage;
  private biTemporalEdges: Map<string, BiTemporalEdge>;
  private biTemporalNodes: Map<string, BiTemporalNode>;
  private contextWindows: Map<string, ContextWindow>;
  private revisionHistory: Map<string, EdgeRevision[]>;
  private config: BiTemporalConfig;
  private currentContextWindow: string | null = null;

  constructor(storage: MindMapStorage, config?: Partial<BiTemporalConfig>) {
    this.storage = storage;
    this.biTemporalEdges = new Map();
    this.biTemporalNodes = new Map();
    this.contextWindows = new Map();
    this.revisionHistory = new Map();

    this.config = {
      maxRevisionHistory: 50,      // Keep last 50 revisions per edge
      confidenceDecayRate: 0.01,   // 1% confidence decay per day
      contextWindowOverlap: 300000, // 5 minutes minimum overlap
      automaticInvalidation: true,  // Auto-invalidate on code changes
      retentionPeriod: 31536000000, // 1 year retention
      snapshotInterval: 86400000,   // Daily snapshots
      ...config
    };

    this.initializeDefaultContextWindows();
    this.startPeriodicMaintenance();
  }

  /**
   * Create or update a bi-temporal edge with dual time tracking
   */
  async createBiTemporalEdge(
    source: string, 
    target: string, 
    edgeType: string,
    validTimeStart: Date,
    evidence: string[] = [],
    reason: string = 'system_discovery'
  ): Promise<BiTemporalEdge> {
    const now = new Date();
    const edgeId = `${source}_${target}_${edgeType}_${now.getTime()}`;

    const biTemporalEdge: BiTemporalEdge = {
      id: edgeId,
      source,
      target,
      type: edgeType as any,
      confidence: 0.8, // Default confidence
      validTime: {
        start: validTimeStart,
        end: null, // Ongoing by default
        confidence: 0.8,
        evidence
      },
      transactionTime: {
        created: now,
        lastModified: now,
        revisions: [],
        discoveredBy: reason
      },
      contextWindows: this.currentContextWindow ? [this.currentContextWindow] : [],
      temporalType: 'continuous',
      metadata: {
        biTemporal: true,
        validTimeStart: validTimeStart.toISOString(),
        transactionTimeStart: now.toISOString(),
        evidence
      },
      created: now,
      lastUpdated: now
    };

    // Create revision record
    const initialRevision: EdgeRevision = {
      id: `${edgeId}_rev_0`,
      timestamp: now,
      action: 'created',
      newState: biTemporalEdge,
      reason,
      confidence: 0.8,
      evidence
    };

    biTemporalEdge.transactionTime.revisions.push(initialRevision);
    this.biTemporalEdges.set(edgeId, biTemporalEdge);

    // Also create standard edge in storage for compatibility
    const standardEdge: MindMapEdge = {
      id: edgeId,
      source,
      target,
      type: edgeType as any,
      confidence: biTemporalEdge.confidence,
      metadata: biTemporalEdge.metadata,
      created: now,
      lastUpdated: now
    };

    this.storage.addEdge(standardEdge);

    console.log(`🕐 Created bi-temporal edge: ${source} → ${target} (${edgeType})`);
    return biTemporalEdge;
  }

  /**
   * Invalidate a relationship (set valid time end)
   */
  async invalidateRelationship(
    edgeId: string, 
    invalidationDate: Date = new Date(),
    reason: string = 'code_change',
    evidence: string[] = []
  ): Promise<void> {
    const edge = this.biTemporalEdges.get(edgeId);
    if (!edge) {
      throw new Error(`BiTemporal edge not found: ${edgeId}`);
    }

    const previousState = { ...edge };
    
    // Set valid time end
    edge.validTime.end = invalidationDate;
    edge.transactionTime.lastModified = new Date();

    // Create revision record
    const invalidationRevision: EdgeRevision = {
      id: `${edgeId}_rev_${edge.transactionTime.revisions.length}`,
      timestamp: new Date(),
      action: 'invalidated',
      previousState,
      newState: { ...edge },
      reason,
      confidence: 0.9,
      evidence
    };

    edge.transactionTime.revisions.push(invalidationRevision);

    // Update metadata
    edge.metadata = {
      ...edge.metadata,
      validTimeEnd: invalidationDate.toISOString(),
      invalidationReason: reason
    };

    console.log(`🕐 Invalidated bi-temporal edge: ${edgeId} at ${invalidationDate.toISOString()}`);
  }

  /**
   * Create a context window for grouping temporal changes
   */
  createContextWindow(
    name: string,
    validTimeStart: Date,
    validTimeEnd: Date | null = null,
    description: string = '',
    frameworkVersions: Record<string, string> = {}
  ): ContextWindow {
    const contextId = `context_${name.toLowerCase().replace(/\s+/g, '_')}_${validTimeStart.getTime()}`;
    
    const contextWindow: ContextWindow = {
      id: contextId,
      name,
      validTime: {
        start: validTimeStart,
        end: validTimeEnd,
        confidence: 0.9,
        evidence: [`Context window created: ${name}`]
      },
      description,
      relatedNodes: [],
      frameworkVersions,
      projectPhase: this.inferProjectPhase(name, description)
    };

    this.contextWindows.set(contextId, contextWindow);
    console.log(`🕐 Created context window: ${name} (${contextId})`);
    
    return contextWindow;
  }

  /**
   * Set current context window for new relationships
   */
  setCurrentContextWindow(contextId: string): void {
    if (this.contextWindows.has(contextId)) {
      this.currentContextWindow = contextId;
      console.log(`🕐 Set current context window: ${contextId}`);
    } else {
      throw new Error(`Context window not found: ${contextId}`);
    }
  }

  /**
   * Query relationships with temporal constraints
   */
  queryBiTemporal(query: TemporalQuery): {
    edges: BiTemporalEdge[];
    nodes: BiTemporalNode[];
    contextWindows: ContextWindow[];
  } {
    let filteredEdges = Array.from(this.biTemporalEdges.values());
    
    // Filter by valid time
    if (query.validAt) {
      filteredEdges = filteredEdges.filter(edge => {
        const validStart = edge.validTime.start.getTime();
        const validEnd = edge.validTime.end?.getTime() || Date.now();
        const queryTime = query.validAt!.getTime();
        return queryTime >= validStart && queryTime <= validEnd;
      });
    }

    // Filter by valid duration
    if (query.validDuring) {
      filteredEdges = filteredEdges.filter(edge => {
        return this.intervalsOverlap(edge.validTime, query.validDuring!);
      });
    }

    // Filter by transaction time (as of)
    if (query.asOf) {
      filteredEdges = filteredEdges.filter(edge => {
        return edge.transactionTime.created <= query.asOf!;
      });
      
      // Apply revisions up to the asOf date
      filteredEdges = filteredEdges.map(edge => {
        return this.getEdgeStateAsOf(edge, query.asOf!);
      });
    }

    // Filter by context window
    if (query.contextWindow) {
      filteredEdges = filteredEdges.filter(edge => {
        return edge.contextWindows.includes(query.contextWindow!);
      });
    }

    // Get related nodes and context windows
    const relatedNodeIds = new Set<string>();
    const relatedContextIds = new Set<string>();
    
    filteredEdges.forEach(edge => {
      relatedNodeIds.add(edge.source);
      relatedNodeIds.add(edge.target);
      edge.contextWindows.forEach(contextId => relatedContextIds.add(contextId));
    });

    const relatedNodes = Array.from(relatedNodeIds)
      .map(nodeId => this.biTemporalNodes.get(nodeId))
      .filter(Boolean) as BiTemporalNode[];

    const relatedContexts = Array.from(relatedContextIds)
      .map(contextId => this.contextWindows.get(contextId))
      .filter(Boolean) as ContextWindow[];

    return {
      edges: filteredEdges,
      nodes: relatedNodes,
      contextWindows: relatedContexts
    };
  }

  /**
   * Get historical state of an edge at a specific transaction time
   */
  private getEdgeStateAsOf(edge: BiTemporalEdge, asOfDate: Date): BiTemporalEdge {
    // Find the latest revision before or at the asOf date
    const validRevisions = edge.transactionTime.revisions
      .filter(rev => rev.timestamp <= asOfDate)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (validRevisions.length === 0) {
      // No revisions before this date, edge didn't exist
      return edge; // Return current state as fallback
    }

    const latestRevision = validRevisions[0];
    
    // Reconstruct edge state at that time
    if (latestRevision.newState) {
      return { ...latestRevision.newState };
    }

    return edge;
  }

  /**
   * Track when code files change to auto-invalidate relationships
   */
  async onFileChanged(filePath: string, changeType: 'modified' | 'deleted' | 'renamed'): Promise<void> {
    if (!this.config.automaticInvalidation) return;

    const now = new Date();
    const affectedEdges = this.findEdgesAffectedByFile(filePath);

    for (const edge of affectedEdges) {
      await this.invalidateRelationship(
        edge.id,
        now,
        `file_${changeType}`,
        [`File ${changeType}: ${filePath}`]
      );
    }

    console.log(`🕐 Auto-invalidated ${affectedEdges.length} edges due to file ${changeType}: ${filePath}`);
  }

  /**
   * Create temporal snapshot for analysis
   */
  createTemporalSnapshot(name: string = `snapshot_${Date.now()}`): {
    timestamp: Date;
    activeEdges: number;
    totalEdges: number;
    contextWindows: string[];
    stats: BiTemporalStats;
  } {
    const now = new Date();
    const activeEdges = Array.from(this.biTemporalEdges.values())
      .filter(edge => edge.validTime.end === null || edge.validTime.end > now);

    const snapshot = {
      timestamp: now,
      activeEdges: activeEdges.length,
      totalEdges: this.biTemporalEdges.size,
      contextWindows: Array.from(this.contextWindows.keys()),
      stats: this.getBiTemporalStats()
    };

    console.log(`🕐 Created temporal snapshot: ${name}`);
    return snapshot;
  }

  /**
   * Get comprehensive bi-temporal statistics
   */
  getBiTemporalStats(): BiTemporalStats {
    const edges = Array.from(this.biTemporalEdges.values());
    const now = new Date();
    
    const activeRelationships = edges.filter(
      edge => edge.validTime.end === null || edge.validTime.end > now
    );
    
    const historicalRelationships = edges.filter(
      edge => edge.validTime.end !== null && edge.validTime.end <= now
    );

    // Calculate average valid duration
    const completedEdges = edges.filter(edge => edge.validTime.end !== null);
    const averageValidDuration = completedEdges.length > 0
      ? completedEdges.reduce((sum, edge) => {
          const duration = edge.validTime.end!.getTime() - edge.validTime.start.getTime();
          return sum + duration;
        }, 0) / completedEdges.length
      : 0;

    // Find longest valid relationship
    const longestEdge = edges.reduce((longest, edge) => {
      const duration = (edge.validTime.end || now).getTime() - edge.validTime.start.getTime();
      const longestDuration = longest ? 
        (longest.validTime.end || now).getTime() - longest.validTime.start.getTime() : 0;
      return duration > longestDuration ? edge : longest;
    }, edges[0]);

    // Find most revised edge
    const mostRevised = edges.reduce((mostRevised, edge) => {
      const revisionCount = edge.transactionTime.revisions.length;
      const mostRevisedCount = mostRevised ? mostRevised.transactionTime.revisions.length : 0;
      return revisionCount > mostRevisedCount ? edge : mostRevised;
    }, edges[0]);

    // Get recent revisions (last 24 hours)
    const oneDayAgo = new Date(now.getTime() - 86400000);
    const recentRevisions: EdgeRevision[] = [];
    edges.forEach(edge => {
      const recentEdgeRevisions = edge.transactionTime.revisions
        .filter(rev => rev.timestamp > oneDayAgo);
      recentRevisions.push(...recentEdgeRevisions);
    });

    const totalRevisions = edges.reduce(
      (sum, edge) => sum + edge.transactionTime.revisions.length, 0
    );

    return {
      totalBiTemporalEdges: edges.length,
      totalContextWindows: this.contextWindows.size,
      averageValidDuration,
      activeRelationships: activeRelationships.length,
      historicalRelationships: historicalRelationships.length,
      revisionCount: totalRevisions,
      recentRevisions: recentRevisions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 20),
      longestValidRelationship: longestEdge ? {
        edgeId: longestEdge.id,
        duration: (longestEdge.validTime.end || now).getTime() - longestEdge.validTime.start.getTime(),
        description: `${longestEdge.source} → ${longestEdge.target} (${longestEdge.type})`
      } : { edgeId: '', duration: 0, description: 'None' },
      mostRevisedEdge: mostRevised ? {
        edgeId: mostRevised.id,
        revisionCount: mostRevised.transactionTime.revisions.length,
        description: `${mostRevised.source} → ${mostRevised.target} (${mostRevised.type})`
      } : { edgeId: '', revisionCount: 0, description: 'None' }
    };
  }

  /**
   * Enhanced query with bi-temporal awareness for MindMapEngine integration
   */
  enhanceQueryWithBiTemporal(
    nodes: MindMapNode[], 
    queryTime: Date = new Date(),
    includeHistorical: boolean = false
  ): MindMapNode[] {
    // Get bi-temporal context for query
    const temporalQuery: TemporalQuery = {
      validAt: queryTime,
      includeHistory: includeHistorical
    };

    const { edges } = this.queryBiTemporal(temporalQuery);
    
    // Boost nodes that have strong bi-temporal relationships
    const enhancedNodes = nodes.map(node => {
      let biTemporalBoost = 0;
      let temporalConnections = 0;
      
      // Count valid relationships at query time
      for (const edge of edges) {
        if (edge.source === node.id || edge.target === node.id) {
          temporalConnections++;
          biTemporalBoost += edge.confidence * 0.15; // Max 15% boost per relationship
        }
      }

      const boostedConfidence = Math.min(1.0, node.confidence + biTemporalBoost);
      
      return {
        ...node,
        confidence: boostedConfidence,
        metadata: {
          ...node.metadata,
          biTemporalBoost,
          temporalConnections,
          queryTime: queryTime.toISOString()
        }
      };
    });

    return enhancedNodes.sort((a, b) => b.confidence - a.confidence);
  }

  // Private Helper Methods

  private intervalsOverlap(interval1: ValidTimeInterval, interval2: ValidTimeInterval): boolean {
    const start1 = interval1.start.getTime();
    const end1 = interval1.end?.getTime() || Date.now();
    const start2 = interval2.start.getTime();
    const end2 = interval2.end?.getTime() || Date.now();

    return start1 <= end2 && start2 <= end1;
  }

  private findEdgesAffectedByFile(filePath: string): BiTemporalEdge[] {
    return Array.from(this.biTemporalEdges.values()).filter(edge => {
      // Check if edge involves nodes related to this file
      const sourceNode = this.storage.getNode(edge.source);
      const targetNode = this.storage.getNode(edge.target);
      
      return (sourceNode?.path === filePath) || (targetNode?.path === filePath);
    });
  }

  private inferProjectPhase(name: string, description: string): string {
    const combined = (name + ' ' + description).toLowerCase();
    
    if (combined.includes('setup') || combined.includes('init') || combined.includes('start')) {
      return 'planning';
    } else if (combined.includes('develop') || combined.includes('implement') || combined.includes('build')) {
      return 'development';
    } else if (combined.includes('maintain') || combined.includes('fix') || combined.includes('stable')) {
      return 'maintenance';
    } else if (combined.includes('deprecat') || combined.includes('remov') || combined.includes('end')) {
      return 'deprecated';
    }
    
    return 'active';
  }

  private initializeDefaultContextWindows(): void {
    const now = new Date();
    
    // Create initial project context window
    this.createContextWindow(
      'Project Initialization',
      new Date(now.getTime() - 86400000 * 30), // 30 days ago
      null,
      'Initial project setup and development phase',
      { 'nodejs': '18+', 'typescript': '5+' }
    );

    // Set as current context
    const contextIds = Array.from(this.contextWindows.keys());
    if (contextIds.length > 0) {
      this.currentContextWindow = contextIds[0];
    }
  }

  private startPeriodicMaintenance(): void {
    // Run maintenance every hour
    setInterval(() => {
      this.performMaintenance();
    }, 3600000); // 1 hour
  }

  private performMaintenance(): void {
    this.applyConfidenceDecay();
    this.cleanupOldRevisions();
    this.pruneExpiredData();
  }

  private applyConfidenceDecay(): void {
    const now = new Date();
    const dayInMs = 86400000;
    
    for (const edge of this.biTemporalEdges.values()) {
      const ageInDays = (now.getTime() - edge.transactionTime.created.getTime()) / dayInMs;
      const decayAmount = ageInDays * this.config.confidenceDecayRate;
      edge.validTime.confidence = Math.max(0.1, edge.validTime.confidence - decayAmount);
    }
  }

  private cleanupOldRevisions(): void {
    for (const edge of this.biTemporalEdges.values()) {
      if (edge.transactionTime.revisions.length > this.config.maxRevisionHistory) {
        edge.transactionTime.revisions = edge.transactionTime.revisions
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, this.config.maxRevisionHistory);
      }
    }
  }

  private pruneExpiredData(): void {
    const cutoff = new Date(Date.now() - this.config.retentionPeriod);
    
    // Remove edges that ended before the retention cutoff
    const edgesToRemove: string[] = [];
    
    for (const [id, edge] of this.biTemporalEdges.entries()) {
      if (edge.validTime.end && edge.validTime.end < cutoff) {
        edgesToRemove.push(id);
      }
    }

    for (const id of edgesToRemove) {
      this.biTemporalEdges.delete(id);
    }

    console.log(`🕐 Pruned ${edgesToRemove.length} expired bi-temporal edges`);
  }

  /**
   * Export temporal data for analysis
   */
  exportTemporalData(): {
    edges: BiTemporalEdge[];
    contextWindows: ContextWindow[];
    stats: BiTemporalStats;
  } {
    return {
      edges: Array.from(this.biTemporalEdges.values()),
      contextWindows: Array.from(this.contextWindows.values()),
      stats: this.getBiTemporalStats()
    };
  }
}