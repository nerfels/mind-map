import { resolve, normalize, dirname } from 'path';
import { promises as fs } from 'fs';
import { MindMapNode, MindMapEdge, MindMapGraph } from '../types/index.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';

export interface NodeIndex {
  byType: Map<string, Set<string>>;
  byPath: Map<string, string>;
  byName: Map<string, Set<string>>;
  byConfidence: Map<number, Set<string>>; // Confidence ranges: 0.0-0.2, 0.2-0.4, etc.
  byFramework: Map<string, Set<string>>;
  byLanguage: Map<string, Set<string>>;
}

export interface EdgeIndex {
  bySource: Map<string, Set<string>>;
  byTarget: Map<string, Set<string>>;
  byType: Map<string, Set<string>>;
}

export class OptimizedMindMapStorage {
  private graph: MindMapGraph;
  private nodeIndex: NodeIndex;
  private edgeIndex: EdgeIndex;
  private performanceMonitor: PerformanceMonitor;
  private projectRoot: string;
  private storagePath: string;
  private cacheInvalidTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(projectRoot: string, storagePath?: string) {
    // Validate and sanitize paths to prevent path traversal
    this.projectRoot = resolve(normalize(projectRoot));
    
    if (storagePath) {
      const resolvedStoragePath = resolve(normalize(storagePath));
      if (!resolvedStoragePath.startsWith(this.projectRoot) && !resolvedStoragePath.startsWith('/tmp')) {
        throw new Error('Storage path must be within project root or /tmp directory');
      }
      this.storagePath = resolvedStoragePath;
    } else {
      this.storagePath = resolve(this.projectRoot, '.mindmap-cache', 'mindmap.json');
    }

    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      projectRoot: this.projectRoot,
      lastScan: new Date(),
      version: '1.0.0'
    };

    this.nodeIndex = {
      byType: new Map(),
      byPath: new Map(),
      byName: new Map(),
      byConfidence: new Map(),
      byFramework: new Map(),
      byLanguage: new Map()
    };

    this.edgeIndex = {
      bySource: new Map(),
      byTarget: new Map(),
      byType: new Map()
    };

    this.performanceMonitor = new PerformanceMonitor();
  }

  // Optimized node operations with indexing
  addNode(node: MindMapNode): void {
    this.performanceMonitor.timeSync('addNode', () => {
      // Validate node data to prevent injection
      this.validateNodeData(node);
      
      // Remove from existing indexes if updating
      if (this.graph.nodes.has(node.id)) {
        this.removeFromNodeIndexes(node.id);
      }
      
      this.graph.nodes.set(node.id, node);
      this.addToNodeIndexes(node);
    }, { nodeType: node.type, nodeId: node.id });
  }

  getNode(id: string): MindMapNode | undefined {
    return this.performanceMonitor.timeSync('getNode', () => {
      return this.graph.nodes.get(id);
    }, { nodeId: id });
  }

  // Highly optimized search using indexes
  findNodes(predicate?: (node: MindMapNode) => boolean): MindMapNode[] {
    return this.performanceMonitor.timeSync('findNodes', () => {
      if (!predicate) {
        return Array.from(this.graph.nodes.values());
      }
      
      // Try to optimize common query patterns using indexes
      return this.optimizedNodeSearch(predicate);
    });
  }

  // Optimized search methods using indexes
  findNodesByType(type: string): MindMapNode[] {
    return this.performanceMonitor.timeSync('findNodesByType', () => {
      const nodeIds = this.nodeIndex.byType.get(type);
      if (!nodeIds) return [];
      
      return Array.from(nodeIds)
        .map(id => this.graph.nodes.get(id))
        .filter((node): node is MindMapNode => node !== undefined);
    }, { type });
  }

  findNodesByPath(path: string): MindMapNode | undefined {
    return this.performanceMonitor.timeSync('findNodesByPath', () => {
      const nodeId = this.nodeIndex.byPath.get(path);
      return nodeId ? this.graph.nodes.get(nodeId) : undefined;
    }, { path });
  }

  findNodesByName(name: string): MindMapNode[] {
    return this.performanceMonitor.timeSync('findNodesByName', () => {
      const nodeIds = this.nodeIndex.byName.get(name.toLowerCase());
      if (!nodeIds) return [];
      
      return Array.from(nodeIds)
        .map(id => this.graph.nodes.get(id))
        .filter((node): node is MindMapNode => node !== undefined);
    }, { name });
  }

  findNodesByConfidenceRange(minConfidence: number, maxConfidence: number = 1.0): MindMapNode[] {
    return this.performanceMonitor.timeSync('findNodesByConfidenceRange', () => {
      const nodes: MindMapNode[] = [];
      const minBucket = Math.floor(minConfidence * 5); // 0-4 buckets for 0.0-1.0 range
      const maxBucket = Math.floor(maxConfidence * 5);
      
      for (let bucket = minBucket; bucket <= maxBucket; bucket++) {
        const nodeIds = this.nodeIndex.byConfidence.get(bucket);
        if (nodeIds) {
          for (const id of nodeIds) {
            const node = this.graph.nodes.get(id);
            if (node && node.confidence >= minConfidence && node.confidence <= maxConfidence) {
              nodes.push(node);
            }
          }
        }
      }
      
      return nodes;
    }, { minConfidence, maxConfidence });
  }

  // Optimized edge operations
  addEdge(edge: MindMapEdge): void {
    this.performanceMonitor.timeSync('addEdge', () => {
      // Remove from existing indexes if updating
      if (this.graph.edges.has(edge.id)) {
        this.removeFromEdgeIndexes(edge.id);
      }
      
      this.graph.edges.set(edge.id, edge);
      this.addToEdgeIndexes(edge);
    }, { edgeType: edge.type, edgeId: edge.id });
  }

  findEdges(predicate?: (edge: MindMapEdge) => boolean): MindMapEdge[] {
    return this.performanceMonitor.timeSync('findEdges', () => {
      if (!predicate) {
        return Array.from(this.graph.edges.values());
      }
      
      return Array.from(this.graph.edges.values()).filter(predicate);
    });
  }

  getConnectedNodes(nodeId: string, direction: 'incoming' | 'outgoing' | 'both' = 'both'): MindMapNode[] {
    return this.performanceMonitor.timeSync('getConnectedNodes', () => {
      const connectedIds = new Set<string>();
      
      if (direction === 'outgoing' || direction === 'both') {
        const outgoingEdges = this.edgeIndex.bySource.get(nodeId);
        if (outgoingEdges) {
          for (const edgeId of outgoingEdges) {
            const edge = this.graph.edges.get(edgeId);
            if (edge) {
              connectedIds.add(edge.target);
            }
          }
        }
      }
      
      if (direction === 'incoming' || direction === 'both') {
        const incomingEdges = this.edgeIndex.byTarget.get(nodeId);
        if (incomingEdges) {
          for (const edgeId of incomingEdges) {
            const edge = this.graph.edges.get(edgeId);
            if (edge) {
              connectedIds.add(edge.source);
            }
          }
        }
      }
      
      return Array.from(connectedIds)
        .map(id => this.graph.nodes.get(id))
        .filter((node): node is MindMapNode => node !== undefined);
    }, { nodeId, direction });
  }

  // Index management
  private addToNodeIndexes(node: MindMapNode): void {
    // Type index
    if (!this.nodeIndex.byType.has(node.type)) {
      this.nodeIndex.byType.set(node.type, new Set());
    }
    this.nodeIndex.byType.get(node.type)!.add(node.id);
    
    // Path index
    if (node.path) {
      this.nodeIndex.byPath.set(node.path, node.id);
    }
    
    // Name index (case-insensitive)
    const nameKey = node.name.toLowerCase();
    if (!this.nodeIndex.byName.has(nameKey)) {
      this.nodeIndex.byName.set(nameKey, new Set());
    }
    this.nodeIndex.byName.get(nameKey)!.add(node.id);
    
    // Confidence index (bucket by 0.2 ranges)
    const confidenceBucket = Math.floor(node.confidence * 5);
    if (!this.nodeIndex.byConfidence.has(confidenceBucket)) {
      this.nodeIndex.byConfidence.set(confidenceBucket, new Set());
    }
    this.nodeIndex.byConfidence.get(confidenceBucket)!.add(node.id);
    
    // Framework index
    if (node.properties.framework) {
      if (!this.nodeIndex.byFramework.has(node.properties.framework)) {
        this.nodeIndex.byFramework.set(node.properties.framework, new Set());
      }
      this.nodeIndex.byFramework.get(node.properties.framework)!.add(node.id);
    }
    
    // Language index
    if (node.properties.language) {
      if (!this.nodeIndex.byLanguage.has(node.properties.language)) {
        this.nodeIndex.byLanguage.set(node.properties.language, new Set());
      }
      this.nodeIndex.byLanguage.get(node.properties.language)!.add(node.id);
    }
  }

  private removeFromNodeIndexes(nodeId: string): void {
    const node = this.graph.nodes.get(nodeId);
    if (!node) return;
    
    // Remove from all indexes
    this.nodeIndex.byType.get(node.type)?.delete(nodeId);
    if (node.path) {
      this.nodeIndex.byPath.delete(node.path);
    }
    this.nodeIndex.byName.get(node.name.toLowerCase())?.delete(nodeId);
    
    const confidenceBucket = Math.floor(node.confidence * 5);
    this.nodeIndex.byConfidence.get(confidenceBucket)?.delete(nodeId);
    
    if (node.properties.framework) {
      this.nodeIndex.byFramework.get(node.properties.framework)?.delete(nodeId);
    }
    if (node.properties.language) {
      this.nodeIndex.byLanguage.get(node.properties.language)?.delete(nodeId);
    }
  }

  private addToEdgeIndexes(edge: MindMapEdge): void {
    // Source index
    if (!this.edgeIndex.bySource.has(edge.source)) {
      this.edgeIndex.bySource.set(edge.source, new Set());
    }
    this.edgeIndex.bySource.get(edge.source)!.add(edge.id);
    
    // Target index
    if (!this.edgeIndex.byTarget.has(edge.target)) {
      this.edgeIndex.byTarget.set(edge.target, new Set());
    }
    this.edgeIndex.byTarget.get(edge.target)!.add(edge.id);
    
    // Type index
    if (!this.edgeIndex.byType.has(edge.type)) {
      this.edgeIndex.byType.set(edge.type, new Set());
    }
    this.edgeIndex.byType.get(edge.type)!.add(edge.id);
  }

  private removeFromEdgeIndexes(edgeId: string): void {
    const edge = this.graph.edges.get(edgeId);
    if (!edge) return;
    
    this.edgeIndex.bySource.get(edge.source)?.delete(edgeId);
    this.edgeIndex.byTarget.get(edge.target)?.delete(edgeId);
    this.edgeIndex.byType.get(edge.type)?.delete(edgeId);
  }

  private optimizedNodeSearch(predicate: (node: MindMapNode) => boolean): MindMapNode[] {
    // For now, fall back to linear search
    // In the future, we could analyze the predicate function to use appropriate indexes
    return Array.from(this.graph.nodes.values()).filter(predicate);
  }

  private validateNodeData(node: MindMapNode): void {
    if (!node.id || typeof node.id !== 'string') {
      throw new Error('Node ID must be a non-empty string');
    }
    
    if (node.id.length > 500) {
      throw new Error('Node ID too long (max 500 characters)');
    }
    
    if (!node.name || typeof node.name !== 'string') {
      throw new Error('Node name must be a non-empty string');
    }
    
    if (node.name.length > 1000) {
      throw new Error('Node name too long (max 1000 characters)');
    }
    
    if (typeof node.confidence !== 'number' || node.confidence < 0 || node.confidence > 1) {
      throw new Error('Node confidence must be a number between 0 and 1');
    }
  }

  // Performance monitoring
  getPerformanceStats() {
    return this.performanceMonitor.getStats();
  }

  getSlowOperations(thresholdMs: number = 10): { operation: string, stats: any }[] {
    return this.performanceMonitor.getSlowOperations(thresholdMs);
  }

  clearPerformanceData(): void {
    this.performanceMonitor.clear();
  }

  // Persistence (simplified for now - same as original)
  async save(): Promise<void> {
    return this.performanceMonitor.timeAsync('save', async () => {
      await fs.mkdir(dirname(this.storagePath), { recursive: true });
      
      const serializedGraph = {
        nodes: Array.from(this.graph.nodes.entries()),
        edges: Array.from(this.graph.edges.entries()),
        metadata: {
          projectRoot: this.graph.projectRoot,
          lastScan: this.graph.lastScan,
          version: this.graph.version,
          lastSaved: new Date()
        }
      };
      
      await fs.writeFile(this.storagePath, JSON.stringify(serializedGraph, null, 2));
    });
  }

  async load(): Promise<void> {
    return this.performanceMonitor.timeAsync('load', async () => {
      try {
        const data = await fs.readFile(this.storagePath, 'utf-8');
        const parsed = JSON.parse(data);
        
        if (!this.validateSerializedData(parsed)) {
          throw new Error('Invalid serialized data format');
        }
        
        // Clear existing data and rebuild indexes
        this.graph.nodes.clear();
        this.graph.edges.clear();
        this.clearIndexes();
        
        // Load nodes and rebuild indexes
        for (const [id, nodeData] of parsed.nodes) {
          const node = this.deserializeNode(nodeData);
          this.graph.nodes.set(id, node);
          this.addToNodeIndexes(node);
        }
        
        // Load edges and rebuild indexes
        for (const [id, edgeData] of parsed.edges) {
          const edge = this.deserializeEdge(edgeData);
          this.graph.edges.set(id, edge);
          this.addToEdgeIndexes(edge);
        }
        
        this.graph.projectRoot = parsed.metadata.projectRoot || this.projectRoot;
        this.graph.lastScan = parsed.metadata.lastScan ? new Date(parsed.metadata.lastScan) : new Date();
        this.graph.version = parsed.metadata.version || '1.0.0';
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          console.warn('Failed to load mind map data:', error.message);
        }
      }
    });
  }

  private clearIndexes(): void {
    this.nodeIndex.byType.clear();
    this.nodeIndex.byPath.clear();
    this.nodeIndex.byName.clear();
    this.nodeIndex.byConfidence.clear();
    this.nodeIndex.byFramework.clear();
    this.nodeIndex.byLanguage.clear();
    
    this.edgeIndex.bySource.clear();
    this.edgeIndex.byTarget.clear();
    this.edgeIndex.byType.clear();
  }

  private validateSerializedData(data: any): boolean {
    return (
      data &&
      Array.isArray(data.nodes) &&
      Array.isArray(data.edges) &&
      typeof data.metadata === 'object'
    );
  }

  private deserializeNode(nodeData: any): MindMapNode {
    return {
      ...nodeData,
      lastUpdated: new Date(nodeData.lastUpdated)
    };
  }

  private deserializeEdge(edgeData: any): MindMapEdge {
    return {
      ...edgeData
    };
  }

  // Statistics
  getStats() {
    return {
      nodeCount: this.graph.nodes.size,
      edgeCount: this.graph.edges.size,
      nodesByType: this.getNodeCountsByType(),
      averageConfidence: this.calculateAverageConfidence(),
      indexStats: this.getIndexStats()
    };
  }

  private getNodeCountsByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const [type, nodeIds] of this.nodeIndex.byType) {
      counts[type] = nodeIds.size;
    }
    return counts;
  }

  private calculateAverageConfidence(): number {
    if (this.graph.nodes.size === 0) return 0;
    
    let sum = 0;
    for (const node of this.graph.nodes.values()) {
      sum += node.confidence;
    }
    return sum / this.graph.nodes.size;
  }

  private getIndexStats() {
    return {
      typeIndexSize: this.nodeIndex.byType.size,
      pathIndexSize: this.nodeIndex.byPath.size,
      nameIndexSize: this.nodeIndex.byName.size,
      confidenceIndexSize: this.nodeIndex.byConfidence.size,
      frameworkIndexSize: this.nodeIndex.byFramework.size,
      languageIndexSize: this.nodeIndex.byLanguage.size,
      edgeSourceIndexSize: this.edgeIndex.bySource.size,
      edgeTargetIndexSize: this.edgeIndex.byTarget.size,
      edgeTypeIndexSize: this.edgeIndex.byType.size
    };
  }
}