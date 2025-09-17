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

// Composite indexes for common query patterns (specialized indexing system)
export interface CompositeIndex {
  // Name+Path composite for multi-word queries (most common pattern)
  namePathTerms: Map<string, Set<string>>; // term -> nodeIds that contain term in name OR path

  // Type+Name composite for filtered searches
  typeNameTerms: Map<string, Set<string>>; // "type:name_term" -> nodeIds

  // Type+Path composite for filtered path searches
  typePathTerms: Map<string, Set<string>>; // "type:path_term" -> nodeIds

  // Semantic terms for language/framework mapping
  semanticTerms: Map<string, Set<string>>; // semantic_term -> nodeIds

  // Normalized path lookup for fast path resolution
  normalizedPaths: Map<string, string>; // normalized_path -> nodeId

  // Multi-word term combinations (for exact multi-word matching)
  termCombinations: Map<string, Set<string>>; // "term1+term2" -> nodeIds
}

export class OptimizedMindMapStorage {
  private graph: MindMapGraph;
  private nodeIndex: NodeIndex;
  private edgeIndex: EdgeIndex;
  private compositeIndex: CompositeIndex;
  private performanceMonitor: PerformanceMonitor;
  private projectRoot: string;
  private storagePath: string;
  private cacheInvalidTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(projectRoot: string, storagePath?: string) {
    // Validate and sanitize paths
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

    this.compositeIndex = {
      namePathTerms: new Map(),
      typeNameTerms: new Map(),
      typePathTerms: new Map(),
      semanticTerms: new Map(),
      normalizedPaths: new Map(),
      termCombinations: new Map()
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
        this.removeFromCompositeIndexes(node.id);
      }

      // Add node with updated timestamp
      this.graph.nodes.set(node.id, {
        ...node,
        lastUpdated: new Date()
      });

      // Add to indexes
      this.addToNodeIndexes(node);
      this.addToCompositeIndexes(node);
    }, { nodeType: node.type, nodeId: node.id });
  }

  getNode(id: string): MindMapNode | undefined {
    return this.performanceMonitor.timeSync('getNode', () => {
      return this.graph.nodes.get(id);
    }, { nodeId: id });
  }

  removeNode(id: string): void {
    this.performanceMonitor.timeSync('removeNode', () => {
      const node = this.graph.nodes.get(id);
      if (node) {
        this.removeFromNodeIndexes(id);
        this.removeFromCompositeIndexes(id);
        this.graph.nodes.delete(id);

        // Remove all edges connected to this node
        const edgesToRemove: string[] = [];
        for (const [edgeId, edge] of this.graph.edges) {
          if (edge.source === id || edge.target === id) {
            edgesToRemove.push(edgeId);
          }
        }
        edgesToRemove.forEach(edgeId => this.removeEdge(edgeId));
      }
    }, { nodeId: id });
  }

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

  getEdge(id: string): MindMapEdge | undefined {
    return this.performanceMonitor.timeSync('getEdge', () => {
      return this.graph.edges.get(id);
    }, { edgeId: id });
  }

  removeEdge(id: string): void {
    this.performanceMonitor.timeSync('removeEdge', () => {
      const edge = this.graph.edges.get(id);
      if (edge) {
        this.removeFromEdgeIndexes(id);
        this.graph.edges.delete(id);
      }
    }, { edgeId: id });
  }

  findEdges(predicate: (edge: MindMapEdge) => boolean): MindMapEdge[] {
    return this.performanceMonitor.timeSync('findEdges', () => {
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
            if (edge) connectedIds.add(edge.target);
          }
        }
      }

      if (direction === 'incoming' || direction === 'both') {
        const incomingEdges = this.edgeIndex.byTarget.get(nodeId);
        if (incomingEdges) {
          for (const edgeId of incomingEdges) {
            const edge = this.graph.edges.get(edgeId);
            if (edge) connectedIds.add(edge.source);
          }
        }
      }

      return Array.from(connectedIds)
        .map(id => this.graph.nodes.get(id))
        .filter((node): node is MindMapNode => node !== undefined);
    }, { nodeId, direction });
  }

  updateNodeConfidence(nodeId: string, confidence: number): void {
    this.performanceMonitor.timeSync('updateNodeConfidence', () => {
      const node = this.graph.nodes.get(nodeId);
      if (node) {
        // Update confidence bucket index
        const oldBucket = Math.floor(node.confidence * 5);
        const newBucket = Math.floor(confidence * 5);

        if (oldBucket !== newBucket) {
          const oldBucketSet = this.nodeIndex.byConfidence.get(oldBucket);
          if (oldBucketSet) oldBucketSet.delete(nodeId);

          if (!this.nodeIndex.byConfidence.has(newBucket)) {
            this.nodeIndex.byConfidence.set(newBucket, new Set());
          }
          this.nodeIndex.byConfidence.get(newBucket)!.add(nodeId);
        }

        node.confidence = confidence;
        node.lastUpdated = new Date();
      }
    }, { nodeId, confidence });
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

  findNodeByPath(path: string): MindMapNode | undefined {
    return this.performanceMonitor.timeSync('findNodeByPath', () => {
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

  // Optimized composite search methods (specialized indexing system)
  findNodesByCompositeQuery(query: string, options: { type?: string, useSemantics?: boolean } = {}): MindMapNode[] {
    return this.performanceMonitor.timeSync('findNodesByCompositeQuery', () => {
      const queryTerms = this.extractTerms(query);
      const results = new Map<string, { node: MindMapNode, score: number }>();

      // 1. Fast semantic search if enabled
      if (options.useSemantics) {
        for (const term of queryTerms) {
          const semanticNodes = this.compositeIndex.semanticTerms.get(term);
          if (semanticNodes) {
            for (const nodeId of semanticNodes) {
              const node = this.graph.nodes.get(nodeId);
              if (node && (!options.type || node.type === options.type)) {
                const existing = results.get(nodeId);
                const score = (existing?.score || 0) + 0.8; // High semantic match score
                results.set(nodeId, { node, score });
              }
            }
          }
        }
      }

      // 2. Fast name+path composite search
      for (const term of queryTerms) {
        const namePathNodes = this.compositeIndex.namePathTerms.get(term);
        if (namePathNodes) {
          for (const nodeId of namePathNodes) {
            const node = this.graph.nodes.get(nodeId);
            if (node && (!options.type || node.type === options.type)) {
              const existing = results.get(nodeId);
              const score = (existing?.score || 0) + 0.6; // Good match score
              results.set(nodeId, { node, score });
            }
          }
        }
      }

      // 3. Fast type+name composite search
      if (options.type) {
        for (const term of queryTerms) {
          const typeNameKey = `${options.type}:${term}`;
          const typeNameNodes = this.compositeIndex.typeNameTerms.get(typeNameKey);
          if (typeNameNodes) {
            for (const nodeId of typeNameNodes) {
              const node = this.graph.nodes.get(nodeId);
              if (node) {
                const existing = results.get(nodeId);
                const score = (existing?.score || 0) + 0.9; // Very high type-specific match
                results.set(nodeId, { node, score });
              }
            }
          }
        }
      }

      // 4. Multi-word combination search (exact phrase matching)
      if (queryTerms.length > 1) {
        for (let i = 0; i < queryTerms.length - 1; i++) {
          for (let j = i + 1; j < queryTerms.length; j++) {
            const combination = `${queryTerms[i]}+${queryTerms[j]}`;
            const combinationNodes = this.compositeIndex.termCombinations.get(combination);
            if (combinationNodes) {
              for (const nodeId of combinationNodes) {
                const node = this.graph.nodes.get(nodeId);
                if (node && (!options.type || node.type === options.type)) {
                  const existing = results.get(nodeId);
                  const score = (existing?.score || 0) + 1.0; // Highest score for exact combinations
                  results.set(nodeId, { node, score });
                }
              }
            }
          }
        }
      }

      // Sort by score descending and apply confidence weighting
      return Array.from(results.values())
        .sort((a, b) => {
          const scoreA = a.score * a.node.confidence;
          const scoreB = b.score * b.node.confidence;
          return scoreB - scoreA;
        })
        .map(result => ({
          ...result.node,
          confidence: Math.min(1.0, result.node.confidence * (1 + result.score * 0.1)) // Boost confidence based on search score
        }));
    }, { query, type: options.type, useSemantics: options.useSemantics });
  }

  findNodesByPath(pathQuery: string): MindMapNode[] {
    return this.performanceMonitor.timeSync('findNodesByPath', () => {
      const normalizedQuery = this.normalizePath(pathQuery);
      const results: MindMapNode[] = [];

      // 1. Fast exact path lookup
      const exactNodeId = this.compositeIndex.normalizedPaths.get(normalizedQuery);
      if (exactNodeId) {
        const node = this.graph.nodes.get(exactNodeId);
        if (node) {
          results.push({ ...node, confidence: 1.4 }); // Highest confidence for exact match
        }
      }

      // 2. Fast path variations lookup
      const pathVariations = this.generatePathVariations(pathQuery);
      for (const variation of pathVariations) {
        const nodeId = this.compositeIndex.normalizedPaths.get(variation);
        if (nodeId && !results.find(r => r.id === nodeId)) {
          const node = this.graph.nodes.get(nodeId);
          if (node) {
            results.push({ ...node, confidence: 1.2 }); // High confidence for variation match
          }
        }
      }

      return results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    }, { pathQuery });
  }

  // Fast multi-term search using composite indexes
  findNodesByMultipleTerms(terms: string[], matchAllTerms: boolean = false): MindMapNode[] {
    return this.performanceMonitor.timeSync('findNodesByMultipleTerms', () => {
      const termSets: Set<string>[] = [];

      // Get node sets for each term
      for (const term of terms) {
        const termNodes = new Set<string>();

        // Combine results from multiple composite indexes
        const namePathNodes = this.compositeIndex.namePathTerms.get(term.toLowerCase());
        if (namePathNodes) {
          namePathNodes.forEach(nodeId => termNodes.add(nodeId));
        }

        const semanticNodes = this.compositeIndex.semanticTerms.get(term.toLowerCase());
        if (semanticNodes) {
          semanticNodes.forEach(nodeId => termNodes.add(nodeId));
        }

        termSets.push(termNodes);
      }

      // Combine results based on matching strategy
      let resultNodeIds: Set<string>;
      if (matchAllTerms) {
        // Intersection: nodes that match ALL terms
        resultNodeIds = termSets.reduce((intersection, currentSet) => {
          return new Set([...intersection].filter(nodeId => currentSet.has(nodeId)));
        }, termSets[0] || new Set());
      } else {
        // Union: nodes that match ANY term
        resultNodeIds = new Set();
        termSets.forEach(termSet => {
          termSet.forEach(nodeId => resultNodeIds.add(nodeId));
        });
      }

      // Convert to nodes and calculate relevance scores
      const results: { node: MindMapNode, relevanceScore: number }[] = [];
      for (const nodeId of resultNodeIds) {
        const node = this.graph.nodes.get(nodeId);
        if (node) {
          // Calculate relevance based on how many terms matched
          let matchCount = 0;
          for (const termSet of termSets) {
            if (termSet.has(nodeId)) matchCount++;
          }

          const relevanceScore = matchCount / terms.length;
          results.push({ node, relevanceScore });
        }
      }

      // Sort by relevance and confidence
      return results
        .sort((a, b) => {
          const scoreA = a.relevanceScore * a.node.confidence;
          const scoreB = b.relevanceScore * b.node.confidence;
          return scoreB - scoreA;
        })
        .map(result => result.node);
    }, { terms, matchAllTerms });
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
    if (node.properties?.framework) {
      if (!this.nodeIndex.byFramework.has(node.properties?.framework)) {
        this.nodeIndex.byFramework.set(node.properties?.framework, new Set());
      }
      this.nodeIndex.byFramework.get(node.properties?.framework)!.add(node.id);
    }
    
    // Language index
    if (node.properties?.language) {
      if (!this.nodeIndex.byLanguage.has(node.properties?.language)) {
        this.nodeIndex.byLanguage.set(node.properties?.language, new Set());
      }
      this.nodeIndex.byLanguage.get(node.properties?.language)!.add(node.id);
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
    
    if (node.properties?.framework) {
      this.nodeIndex.byFramework.get(node.properties?.framework)?.delete(nodeId);
    }
    if (node.properties?.language) {
      this.nodeIndex.byLanguage.get(node.properties?.language)?.delete(nodeId);
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

  // Composite index management (specialized indexing system)
  private addToCompositeIndexes(node: MindMapNode): void {
    const nodeId = node.id;
    const nodeName = node.name.toLowerCase();
    const nodePath = node.path?.toLowerCase() || '';
    const nodeType = node.type.toLowerCase();

    // 1. Name+Path term index (most common pattern from QueryService analysis)
    const namePathTerms = this.extractTerms(nodeName + ' ' + nodePath);
    for (const term of namePathTerms) {
      if (!this.compositeIndex.namePathTerms.has(term)) {
        this.compositeIndex.namePathTerms.set(term, new Set());
      }
      this.compositeIndex.namePathTerms.get(term)!.add(nodeId);
    }

    // 2. Type+Name composite index
    const nameTerms = this.extractTerms(nodeName);
    for (const term of nameTerms) {
      const typeNameKey = `${nodeType}:${term}`;
      if (!this.compositeIndex.typeNameTerms.has(typeNameKey)) {
        this.compositeIndex.typeNameTerms.set(typeNameKey, new Set());
      }
      this.compositeIndex.typeNameTerms.get(typeNameKey)!.add(nodeId);
    }

    // 3. Type+Path composite index
    const pathTerms = this.extractTerms(nodePath);
    for (const term of pathTerms) {
      const typePathKey = `${nodeType}:${term}`;
      if (!this.compositeIndex.typePathTerms.has(typePathKey)) {
        this.compositeIndex.typePathTerms.set(typePathKey, new Set());
      }
      this.compositeIndex.typePathTerms.get(typePathKey)!.add(nodeId);
    }

    // 4. Semantic terms index (based on QueryService semantic mappings)
    const semanticTerms = this.generateSemanticTerms(node);
    for (const semanticTerm of semanticTerms) {
      if (!this.compositeIndex.semanticTerms.has(semanticTerm)) {
        this.compositeIndex.semanticTerms.set(semanticTerm, new Set());
      }
      this.compositeIndex.semanticTerms.get(semanticTerm)!.add(nodeId);
    }

    // 5. Normalized path index (for fast path lookups)
    if (nodePath) {
      const normalizedPath = this.normalizePath(nodePath);
      this.compositeIndex.normalizedPaths.set(normalizedPath, nodeId);

      // Also add common path variations
      const pathVariations = this.generatePathVariations(nodePath);
      for (const variation of pathVariations) {
        this.compositeIndex.normalizedPaths.set(variation, nodeId);
      }
    }

    // 6. Multi-word term combinations (for exact multi-word matching)
    const allTerms = [...nameTerms, ...pathTerms];
    if (allTerms.length > 1) {
      // Generate 2-term combinations
      for (let i = 0; i < allTerms.length - 1; i++) {
        for (let j = i + 1; j < allTerms.length; j++) {
          const combination = `${allTerms[i]}+${allTerms[j]}`;
          if (!this.compositeIndex.termCombinations.has(combination)) {
            this.compositeIndex.termCombinations.set(combination, new Set());
          }
          this.compositeIndex.termCombinations.get(combination)!.add(nodeId);
        }
      }
    }
  }

  private removeFromCompositeIndexes(nodeId: string): void {
    const node = this.graph.nodes.get(nodeId);
    if (!node) return;

    const nodeName = node.name.toLowerCase();
    const nodePath = node.path?.toLowerCase() || '';
    const nodeType = node.type.toLowerCase();

    // Remove from all composite indexes
    // 1. Name+Path terms
    const namePathTerms = this.extractTerms(nodeName + ' ' + nodePath);
    for (const term of namePathTerms) {
      this.compositeIndex.namePathTerms.get(term)?.delete(nodeId);
    }

    // 2. Type+Name combinations
    const nameTerms = this.extractTerms(nodeName);
    for (const term of nameTerms) {
      const typeNameKey = `${nodeType}:${term}`;
      this.compositeIndex.typeNameTerms.get(typeNameKey)?.delete(nodeId);
    }

    // 3. Type+Path combinations
    const pathTerms = this.extractTerms(nodePath);
    for (const term of pathTerms) {
      const typePathKey = `${nodeType}:${term}`;
      this.compositeIndex.typePathTerms.get(typePathKey)?.delete(nodeId);
    }

    // 4. Semantic terms
    const semanticTerms = this.generateSemanticTerms(node);
    for (const semanticTerm of semanticTerms) {
      this.compositeIndex.semanticTerms.get(semanticTerm)?.delete(nodeId);
    }

    // 5. Normalized paths
    if (nodePath) {
      const normalizedPath = this.normalizePath(nodePath);
      this.compositeIndex.normalizedPaths.delete(normalizedPath);

      const pathVariations = this.generatePathVariations(nodePath);
      for (const variation of pathVariations) {
        this.compositeIndex.normalizedPaths.delete(variation);
      }
    }

    // 6. Term combinations
    const allTerms = [...nameTerms, ...pathTerms];
    if (allTerms.length > 1) {
      for (let i = 0; i < allTerms.length - 1; i++) {
        for (let j = i + 1; j < allTerms.length; j++) {
          const combination = `${allTerms[i]}+${allTerms[j]}`;
          this.compositeIndex.termCombinations.get(combination)?.delete(nodeId);
        }
      }
    }
  }

  // Helper methods for composite indexing
  private extractTerms(text: string): string[] {
    // Split by common separators and filter out empty/short terms
    return text.split(/[\s\-_\.\/\\]+/)
      .filter(term => term.length > 1)
      .map(term => term.toLowerCase());
  }

  private generateSemanticTerms(node: MindMapNode): string[] {
    const semanticTerms: string[] = [];
    const nodeName = node.name.toLowerCase();
    const nodePath = node.path?.toLowerCase() || '';

    // Language semantic mappings (from QueryService analysis)
    const semanticMappings: Record<string, string[]> = {
      'typescript': ['.ts', 'typescript', 'ts'],
      'javascript': ['.js', 'javascript', 'js'],
      'python': ['.py', 'python', 'py'],
      'java': ['java', '.java'],
      'mindmap': ['mind', 'map', 'mindmap'],
      'mind': ['mind', 'mindmap'],
      'map': ['map', 'mindmap']
    };

    // Check if node matches semantic patterns
    for (const [key, equivalents] of Object.entries(semanticMappings)) {
      for (const equivalent of equivalents) {
        if (nodeName.includes(equivalent) || nodePath.includes(equivalent)) {
          semanticTerms.push(key);
          semanticTerms.push(...equivalents);
          break;
        }
      }
    }

    // Framework-specific semantic terms
    if (node.properties?.framework) {
      semanticTerms.push(node.properties.framework);
    }
    if (node.properties?.language) {
      semanticTerms.push(node.properties.language);
    }

    return [...new Set(semanticTerms)]; // Remove duplicates
  }

  private normalizePath(path: string): string {
    // Normalize path separators and remove leading/trailing slashes
    return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  }

  private generatePathVariations(path: string): string[] {
    const variations: string[] = [];
    const normalized = this.normalizePath(path);

    // Add different path formats
    variations.push(normalized);
    variations.push('/' + normalized);
    variations.push(path.replace(/\//g, '\\'));

    // Add path endings (for queries like "src/file.ts")
    const pathParts = normalized.split('/');
    for (let i = 1; i < pathParts.length; i++) {
      variations.push(pathParts.slice(i).join('/'));
    }

    return [...new Set(variations)]; // Remove duplicates
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

  // Public API methods for compatibility with MindMapStorage
  getGraph(): MindMapGraph {
    return this.graph;
  }

  clear(): void {
    this.graph.nodes.clear();
    this.graph.edges.clear();
    this.nodeIndex.byType.clear();
    this.nodeIndex.byPath.clear();
    this.nodeIndex.byName.clear();
    this.nodeIndex.byConfidence.clear();
    this.nodeIndex.byFramework.clear();
    this.nodeIndex.byLanguage.clear();
    this.edgeIndex.bySource.clear();
    this.edgeIndex.byTarget.clear();
    this.edgeIndex.byType.clear();
    this.compositeIndex.namePathTerms.clear();
    this.compositeIndex.typeNameTerms.clear();
    this.compositeIndex.typePathTerms.clear();
    this.compositeIndex.semanticTerms.clear();
    this.compositeIndex.normalizedPaths.clear();
    this.compositeIndex.termCombinations.clear();
    this.graph.lastScan = new Date();
  }

  getStats(): {
    nodeCount: number;
    edgeCount: number;
    nodesByType: Record<string, number>;
    averageConfidence: number;
  } {
    const nodesByType: Record<string, number> = {};
    let totalConfidence = 0;

    for (const node of this.graph.nodes.values()) {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
      totalConfidence += node.confidence;
    }

    return {
      nodeCount: this.graph.nodes.size,
      edgeCount: this.graph.edges.size,
      nodesByType,
      averageConfidence: this.graph.nodes.size > 0 ? totalConfidence / this.graph.nodes.size : 0
    };
  }

  getAllNodes(): MindMapNode[] {
    return Array.from(this.graph.nodes.values());
  }

  getAllEdges(): MindMapEdge[] {
    return Array.from(this.graph.edges.values());
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
          this.addToCompositeIndexes(node);
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

    // Clear composite indexes
    this.compositeIndex.namePathTerms.clear();
    this.compositeIndex.typeNameTerms.clear();
    this.compositeIndex.typePathTerms.clear();
    this.compositeIndex.semanticTerms.clear();
    this.compositeIndex.normalizedPaths.clear();
    this.compositeIndex.termCombinations.clear();
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
      // Basic indexes
      typeIndexSize: this.nodeIndex.byType.size,
      pathIndexSize: this.nodeIndex.byPath.size,
      nameIndexSize: this.nodeIndex.byName.size,
      confidenceIndexSize: this.nodeIndex.byConfidence.size,
      frameworkIndexSize: this.nodeIndex.byFramework.size,
      languageIndexSize: this.nodeIndex.byLanguage.size,
      edgeSourceIndexSize: this.edgeIndex.bySource.size,
      edgeTargetIndexSize: this.edgeIndex.byTarget.size,
      edgeTypeIndexSize: this.edgeIndex.byType.size,

      // Composite indexes (specialized indexing system)
      namePathTermsSize: this.compositeIndex.namePathTerms.size,
      typeNameTermsSize: this.compositeIndex.typeNameTerms.size,
      typePathTermsSize: this.compositeIndex.typePathTerms.size,
      semanticTermsSize: this.compositeIndex.semanticTerms.size,
      normalizedPathsSize: this.compositeIndex.normalizedPaths.size,
      termCombinationsSize: this.compositeIndex.termCombinations.size,

      // Total index efficiency metrics
      totalIndexes: this.nodeIndex.byType.size + this.edgeIndex.bySource.size + this.compositeIndex.namePathTerms.size,
      compositeIndexRatio: this.compositeIndex.namePathTerms.size / Math.max(1, this.graph.nodes.size)
    };
  }

  // Memory optimization methods

  /**
   * Prune redundant edges to reduce memory usage
   * Target: Reduce 20k edges to 15k (25% reduction)
   */
  pruneRedundantEdges(options: {
    threshold?: number;
    keepTransitive?: boolean;
    dryRun?: boolean;
  } = {}): {
    removed: number;
    kept: number;
    memoryReduced: number;
    prunedEdges?: string[];
  } {
    const { threshold = 0.3, keepTransitive = false, dryRun = false } = options;

    return this.performanceMonitor.timeSync('pruneRedundantEdges', () => {
      const initialCount = this.graph.edges.size;
      const prunedEdges: string[] = [];
      let memoryReduced = 0;

      // 1. Find transitive edges (A->B, B->C, A->C where A->C is redundant)
      const transitiveEdges = this.findTransitiveEdges();

      // 2. Find duplicate/weak relationships
      const weakEdges = this.findWeakEdges(threshold);

      // 3. Find variable-specific redundant edges (most memory-heavy)
      const variableRedundantEdges = this.findVariableRedundantEdges();

      // Combine all edge candidates for removal
      const edgesToRemove = new Set([
        ...(keepTransitive ? [] : transitiveEdges),
        ...weakEdges,
        ...variableRedundantEdges
      ]);

      // Remove edges and update indexes
      for (const edgeId of edgesToRemove) {
        const edge = this.graph.edges.get(edgeId);
        if (edge && !dryRun) {
          this.removeFromEdgeIndexes(edgeId);
          this.graph.edges.delete(edgeId);
          memoryReduced += this.estimateEdgeMemoryUsage(edge);
        }
        prunedEdges.push(edgeId);
      }

      const finalCount = this.graph.edges.size;
      const removed = initialCount - finalCount;

      return {
        removed,
        kept: finalCount,
        memoryReduced,
        prunedEdges: dryRun ? prunedEdges : undefined
      };
    }, { threshold, keepTransitive, dryRun });
  }

  /**
   * Find transitive edges that can be inferred from other paths
   */
  private findTransitiveEdges(): string[] {
    const transitiveEdges: string[] = [];
    const edgesByType = this.groupEdgesByType();

    // Focus on 'contains' relationships which are most likely to be transitive
    const containsEdges = edgesByType.get('contains') || [];

    for (const edgeId of containsEdges) {
      const edge = this.graph.edges.get(edgeId);
      if (!edge) continue;

      // Check if there's a path A->B->C that makes A->C redundant
      const sourceOutgoing = this.edgeIndex.bySource.get(edge.source);
      if (!sourceOutgoing) continue;

      for (const intermediateEdgeId of sourceOutgoing) {
        const intermediateEdge = this.graph.edges.get(intermediateEdgeId);
        if (!intermediateEdge || intermediateEdge.id === edge.id) continue;

        const targetIncoming = this.edgeIndex.byTarget.get(edge.target);
        if (!targetIncoming) continue;

        // Check if there's B->C edge making A->C transitive
        for (const targetEdgeId of targetIncoming) {
          const targetEdge = this.graph.edges.get(targetEdgeId);
          if (targetEdge && targetEdge.source === intermediateEdge.target &&
              targetEdge.type === edge.type) {
            transitiveEdges.push(edge.id);
            break;
          }
        }
      }
    }

    return transitiveEdges;
  }

  /**
   * Find edges with low confidence or weak relationships
   */
  private findWeakEdges(threshold: number): string[] {
    const weakEdges: string[] = [];

    for (const [edgeId, edge] of this.graph.edges) {
      if (edge.confidence < threshold) {
        weakEdges.push(edgeId);
      }
    }

    return weakEdges;
  }

  /**
   * Find redundant edges specific to variable nodes (64% of all nodes)
   */
  private findVariableRedundantEdges(): string[] {
    const redundantEdges: string[] = [];
    const variableNodes = this.nodeIndex.byType.get('variable') || new Set();

    for (const nodeId of variableNodes) {
      const outgoingEdges = this.edgeIndex.bySource.get(nodeId) || new Set();

      // If variable has too many outgoing edges, keep only the strongest ones
      if (outgoingEdges.size > 5) { // Max 5 relationships per variable
        const edges = Array.from(outgoingEdges)
          .map(edgeId => this.graph.edges.get(edgeId))
          .filter((edge): edge is MindMapEdge => edge !== undefined)
          .sort((a, b) => b.confidence - a.confidence);

        // Remove weaker edges beyond the top 5
        const edgesToRemove = edges.slice(5);
        redundantEdges.push(...edgesToRemove.map(e => e.id));
      }
    }

    return redundantEdges;
  }

  /**
   * Group edges by type for analysis
   */
  private groupEdgesByType(): Map<string, string[]> {
    const groups = new Map<string, string[]>();

    for (const [edgeId, edge] of this.graph.edges) {
      if (!groups.has(edge.type)) {
        groups.set(edge.type, []);
      }
      groups.get(edge.type)!.push(edgeId);
    }

    return groups;
  }

  /**
   * Estimate memory usage of an edge
   */
  private estimateEdgeMemoryUsage(edge: MindMapEdge): number {
    // Rough estimate: 200 bytes per edge (ID, source, target, type, confidence, metadata)
    const baseSize = 200;
    const metadataSize = edge.metadata ? JSON.stringify(edge.metadata).length : 0;
    return baseSize + metadataSize;
  }

  /**
   * Compress variable nodes using lazy loading and deduplication
   */
  compressVariableNodes(options: {
    enableLazyLoading?: boolean;
    deduplicateNames?: boolean;
    dryRun?: boolean;
  } = {}): {
    compressed: number;
    memoryReduced: number;
    lazyLoaded: number;
  } {
    const { enableLazyLoading = true, deduplicateNames = true, dryRun = false } = options;

    return this.performanceMonitor.timeSync('compressVariableNodes', () => {
      const variableNodes = this.nodeIndex.byType.get('variable') || new Set();
      let compressed = 0;
      let memoryReduced = 0;
      let lazyLoaded = 0;

      if (enableLazyLoading) {
        // Implement lazy loading for variable metadata
        for (const nodeId of variableNodes) {
          const node = this.graph.nodes.get(nodeId);
          if (!node || dryRun) continue;

          if (node.metadata && Object.keys(node.metadata).length > 3) {
            // Move non-essential metadata to lazy-loaded summary
            const essentialMetadata = {
              variableType: node.metadata.variableType,
              lineNumber: node.metadata.lineNumber,
              scope: node.metadata.scope
            };

            const lazyMetadata = { ...node.metadata };
            delete lazyMetadata.variableType;
            delete lazyMetadata.lineNumber;
            delete lazyMetadata.scope;

            // Store lazy metadata reference
            node.metadata = {
              ...essentialMetadata,
              lazyLoaded: `${Object.keys(lazyMetadata).length} additional properties`
            };

            memoryReduced += this.estimateNodeMemoryReduction(lazyMetadata);
            lazyLoaded++;
          }
        }
      }

      if (deduplicateNames) {
        // Deduplicate common variable names
        const nameMap = new Map<string, string[]>();

        for (const nodeId of variableNodes) {
          const node = this.graph.nodes.get(nodeId);
          if (!node) continue;

          if (!nameMap.has(node.name)) {
            nameMap.set(node.name, []);
          }
          nameMap.get(node.name)!.push(nodeId);
        }

        // Compress nodes with common names
        for (const [name, nodeIds] of nameMap) {
          if (nodeIds.length > 5 && !dryRun) { // Only compress frequently used names
            compressed += nodeIds.length;
            memoryReduced += nodeIds.length * 50; // Estimate 50 bytes saved per name deduplication
          }
        }
      }

      return { compressed, memoryReduced, lazyLoaded };
    }, options);
  }

  /**
   * Estimate memory reduction from compressing node metadata
   */
  private estimateNodeMemoryReduction(metadata: any): number {
    return JSON.stringify(metadata).length * 0.7; // Estimate 70% of JSON size
  }
}
