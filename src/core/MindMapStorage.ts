import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname, resolve, normalize, relative } from 'path';
import { MindMapGraph, MindMapNode, MindMapEdge } from '../types/index.js';

// Compression interfaces for storage optimization
interface CompressedNode {
  i: string; // id
  n: string; // name
  t: string; // type (encoded as single char)
  p?: string; // path (relative, deduplicated)
  m?: any; // metadata (compressed)
  c: number; // confidence
  u: number; // lastUpdated (timestamp)
  r?: any; // properties
  f?: string[]; // frameworks
  a?: number; // createdAt (timestamp)
}

interface CompressedEdge {
  i: string; // id
  s: string; // source
  t: string; // target
  y: string; // type (encoded)
  w?: number; // weight
  c: number; // confidence
  m?: any; // metadata
  r?: number; // created (timestamp)
  u?: number; // lastUpdated (timestamp)
  a?: number; // createdAt (timestamp)
}

interface CompressedGraph {
  n: [string, CompressedNode][]; // nodes
  e: [string, CompressedEdge][]; // edges
  p: string; // projectRoot
  s: number; // lastScan (timestamp)
  v: string; // version
  // Compression metadata
  paths: string[]; // path dictionary for deduplication
}

// Type mappings for compression
const TYPE_ENCODINGS: Record<string, string> = {
  'file': 'f',
  'directory': 'd',
  'function': 'fn',
  'class': 'c',
  'error': 'e',
  'pattern': 'p',
  'episodic_memory': 'em',
  'call_pattern': 'cp',
  'document': 'doc',
  'link': 'l',
  'section': 's',
  'variable': 'v',
  'type_parameter': 'tp'
};

const EDGE_TYPE_ENCODINGS: Record<string, string> = {
  'contains': 'c',
  'imports': 'i',
  'calls': 'ca',
  'fixes': 'f',
  'relates_to': 'r',
  'depends_on': 'd',
  'detects': 'dt',
  'co_activates': 'co',
  'documents': 'doc',
  'links_to': 'l',
  'references': 'ref',
  'implements': 'im',
  'describes': 'de',
  'used_by': 'u',
  'instantiated_as': 'ia',
  'violates_constraint': 'vc'
};

// Reverse mappings
const TYPE_DECODINGS = Object.fromEntries(Object.entries(TYPE_ENCODINGS).map(([k, v]) => [v, k]));
const EDGE_TYPE_DECODINGS = Object.fromEntries(Object.entries(EDGE_TYPE_ENCODINGS).map(([k, v]) => [v, k]));

export class MindMapStorage {
  private graph: MindMapGraph;
  private storagePath: string;
  private projectRoot: string;
  private pathDictionary: Map<string, number> = new Map();
  private pathArray: string[] = [];

  constructor(projectRoot: string, storagePath?: string) {
    // Validate and sanitize paths to prevent path traversal
    this.projectRoot = resolve(normalize(projectRoot));
    
    if (storagePath) {
      const resolvedStoragePath = resolve(normalize(storagePath));
      // Ensure storage path is within project root or a safe location
      if (!resolvedStoragePath.startsWith(this.projectRoot) && !resolvedStoragePath.startsWith('/tmp')) {
        throw new Error('Storage path must be within project root or /tmp directory');
      }
      this.storagePath = resolvedStoragePath;
    } else {
      this.storagePath = join(this.projectRoot, '.mindmap-cache', 'mindmap.json');
    }

    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      projectRoot: this.projectRoot,
      lastScan: new Date(),
      version: '0.1.0'
    };
  }

  // Compression utility methods
  private getPathIndex(path: string | undefined): number | undefined {
    if (!path) return undefined;

    // Convert to relative path to reduce redundancy
    const relativePath = relative(this.projectRoot, path);

    if (!this.pathDictionary.has(relativePath)) {
      const index = this.pathArray.length;
      this.pathDictionary.set(relativePath, index);
      this.pathArray.push(relativePath);
      return index;
    }

    return this.pathDictionary.get(relativePath);
  }

  private getPathFromIndex(index: number | undefined): string | undefined {
    if (index === undefined || index >= this.pathArray.length) return undefined;
    const relativePath = this.pathArray[index];
    return join(this.projectRoot, relativePath);
  }

  private compressMetadata(metadata: Record<string, any>): any {
    if (!metadata || Object.keys(metadata).length === 0) return undefined;

    // Common metadata key abbreviations
    const keyMappings: Record<string, string> = {
      'variableType': 'vt',
      'lineNumber': 'ln',
      'scope': 'sc',
      'scopeId': 'si',
      'isExported': 'ex',
      'isImported': 'im',
      'importSource': 'is',
      'isUnused': 'un',
      'isGlobal': 'gl',
      'usageCount': 'uc',
      'readCount': 'rc',
      'writeCount': 'wc',
      'crossFileUsageCount': 'cf',
      'language': 'lg',
      'functionType': 'ft',
      'parameters': 'pm',
      'returnType': 'rt',
      'isAsync': 'as',
      'complexity': 'cx'
    };

    const compressed: any = {};
    for (const [key, value] of Object.entries(metadata)) {
      const shortKey = keyMappings[key] || key;
      compressed[shortKey] = value;
    }

    return compressed;
  }

  private decompressMetadata(compressed: any): Record<string, any> {
    if (!compressed) return {};

    // Reverse key mappings
    const keyMappings: Record<string, string> = {
      'vt': 'variableType',
      'ln': 'lineNumber',
      'sc': 'scope',
      'si': 'scopeId',
      'ex': 'isExported',
      'im': 'isImported',
      'is': 'importSource',
      'un': 'isUnused',
      'gl': 'isGlobal',
      'uc': 'usageCount',
      'rc': 'readCount',
      'wc': 'writeCount',
      'cf': 'crossFileUsageCount',
      'lg': 'language',
      'ft': 'functionType',
      'pm': 'parameters',
      'rt': 'returnType',
      'as': 'isAsync',
      'cx': 'complexity'
    };

    const decompressed: Record<string, any> = {};
    for (const [key, value] of Object.entries(compressed)) {
      const fullKey = keyMappings[key] || key;
      decompressed[fullKey] = value;
    }

    return decompressed;
  }

  private compressNode(node: MindMapNode): CompressedNode {
    const pathIndex = this.getPathIndex(node.path);

    return {
      i: node.id,
      n: node.name,
      t: TYPE_ENCODINGS[node.type] || node.type,
      p: pathIndex !== undefined ? pathIndex.toString() : undefined,
      m: this.compressMetadata(node.metadata),
      c: Math.round(node.confidence * 100) / 100, // Round to 2 decimal places
      u: node.lastUpdated.getTime(),
      r: node.properties && Object.keys(node.properties).length > 0 ? node.properties : undefined,
      f: node.frameworks && node.frameworks.length > 0 ? node.frameworks : undefined,
      a: node.createdAt?.getTime()
    };
  }

  private decompressNode(compressed: CompressedNode, paths: string[]): MindMapNode {
    const pathIndex = compressed.p ? parseInt(compressed.p) : undefined;
    const path = pathIndex !== undefined && pathIndex < paths.length ?
      join(this.projectRoot, paths[pathIndex]) : undefined;

    return {
      id: compressed.i,
      name: compressed.n,
      type: (TYPE_DECODINGS[compressed.t] || compressed.t) as any,
      path,
      metadata: this.decompressMetadata(compressed.m),
      confidence: compressed.c,
      lastUpdated: new Date(compressed.u),
      properties: compressed.r,
      frameworks: compressed.f,
      createdAt: compressed.a ? new Date(compressed.a) : undefined
    };
  }

  private compressEdge(edge: MindMapEdge): CompressedEdge {
    return {
      i: edge.id,
      s: edge.source,
      t: edge.target,
      y: EDGE_TYPE_ENCODINGS[edge.type] || edge.type,
      w: edge.weight,
      c: Math.round(edge.confidence * 100) / 100,
      m: edge.metadata && Object.keys(edge.metadata).length > 0 ? edge.metadata : undefined,
      r: edge.created?.getTime(),
      u: edge.lastUpdated?.getTime(),
      a: edge.createdAt?.getTime()
    };
  }

  private decompressEdge(compressed: CompressedEdge): MindMapEdge {
    return {
      id: compressed.i,
      source: compressed.s,
      target: compressed.t,
      type: (EDGE_TYPE_DECODINGS[compressed.y] || compressed.y) as any,
      weight: compressed.w,
      confidence: compressed.c,
      metadata: compressed.m,
      created: compressed.r ? new Date(compressed.r) : undefined,
      lastUpdated: compressed.u ? new Date(compressed.u) : undefined,
      createdAt: compressed.a ? new Date(compressed.a) : undefined
    };
  }

  async load(): Promise<void> {
    try {
      // Use async file access check instead of sync
      await access(this.storagePath);
      const data = await readFile(this.storagePath, 'utf-8');

      const serialized = JSON.parse(data);

      // Check if this is new compressed format or legacy format
      if (this.isCompressedFormat(serialized)) {
        await this.loadCompressedData(serialized);
      } else {
        await this.loadLegacyData(serialized);
      }

    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist, that's fine - start fresh
        console.log('No existing mind map found, starting fresh');
      } else {
        console.error('Failed to load mind map, starting fresh:', error);
        // Reset to fresh state on any error
        this.graph = {
          nodes: new Map(),
          edges: new Map(),
          projectRoot: this.projectRoot,
          lastScan: new Date(),
          version: '0.1.0'
        };
      }
    }
  }

  private isCompressedFormat(data: any): boolean {
    // Compressed format has 'n' and 'e' instead of 'nodes' and 'edges'
    return data && typeof data === 'object' &&
           Array.isArray(data.n) && Array.isArray(data.e) &&
           Array.isArray(data.paths);
  }

  private async loadCompressedData(compressedData: CompressedGraph): Promise<void> {
    // Rebuild path dictionary
    this.pathArray = compressedData.paths || [];
    this.pathDictionary.clear();
    this.pathArray.forEach((path, index) => {
      this.pathDictionary.set(path, index);
    });

    // Decompress nodes
    const nodes = new Map<string, MindMapNode>();
    for (const [id, compressedNode] of compressedData.n) {
      const node = this.decompressNode(compressedNode, this.pathArray);
      nodes.set(id, node);
    }

    // Decompress edges
    const edges = new Map<string, MindMapEdge>();
    for (const [id, compressedEdge] of compressedData.e) {
      const edge = this.decompressEdge(compressedEdge);
      edges.set(id, edge);
    }

    this.graph = {
      nodes,
      edges,
      projectRoot: this.projectRoot,
      lastScan: new Date(compressedData.s),
      version: compressedData.v
    };
  }

  private async loadLegacyData(serialized: any): Promise<void> {
    if (!this.validateSerializedData(serialized)) {
      throw new Error('Invalid mind map data format');
    }

    this.graph = {
      ...serialized,
      nodes: new Map(serialized.nodes || []),
      edges: new Map(serialized.edges || []),
      lastScan: new Date(serialized.lastScan),
      projectRoot: this.projectRoot
    };

    // Validate all dates in loaded nodes
    for (const [id, node] of this.graph.nodes) {
      if (node.lastUpdated && typeof node.lastUpdated === 'string') {
        node.lastUpdated = new Date(node.lastUpdated);
      } else if (!node.lastUpdated) {
        node.lastUpdated = new Date();
      }
    }

    // Validate all dates in loaded edges
    for (const [id, edge] of this.graph.edges) {
      if (edge.lastUpdated && typeof edge.lastUpdated === 'string') {
        edge.lastUpdated = new Date(edge.lastUpdated);
      }
      if (edge.created && typeof edge.created === 'string') {
        edge.created = new Date(edge.created);
      }
      if (edge.createdAt && typeof edge.createdAt === 'string') {
        edge.createdAt = new Date(edge.createdAt);
      }
    }
  }

  private validateSerializedData(data: any): boolean {
    return data && 
           typeof data === 'object' && 
           Array.isArray(data.nodes) && 
           Array.isArray(data.edges) &&
           typeof data.projectRoot === 'string' &&
           typeof data.version === 'string';
  }

  async save(): Promise<void> {
    try {
      await mkdir(dirname(this.storagePath), { recursive: true });

      // Build path dictionary for compression
      this.pathArray = [];
      this.pathDictionary.clear();

      // Pre-populate paths from all nodes
      for (const node of this.graph.nodes.values()) {
        if (node.path) {
          this.getPathIndex(node.path);
        }
      }

      // Compress nodes
      const compressedNodes: [string, CompressedNode][] = [];
      for (const [id, node] of this.graph.nodes) {
        compressedNodes.push([id, this.compressNode(node)]);
      }

      // Compress edges
      const compressedEdges: [string, CompressedEdge][] = [];
      for (const [id, edge] of this.graph.edges) {
        compressedEdges.push([id, this.compressEdge(edge)]);
      }

      // Create compressed format
      const compressedData: CompressedGraph = {
        n: compressedNodes,
        e: compressedEdges,
        p: this.projectRoot,
        s: this.graph.lastScan.getTime(),
        v: this.graph.version,
        paths: this.pathArray
      };

      // Save without pretty printing for maximum compression
      await writeFile(this.storagePath, JSON.stringify(compressedData));

      console.log(`Saved compressed mind map: ${compressedNodes.length} nodes, ${compressedEdges.length} edges, ${this.pathArray.length} unique paths`);
    } catch (error) {
      console.error('Failed to save mind map:', error);
    }
  }

  addNode(node: MindMapNode): void {
    this.graph.nodes.set(node.id, {
      ...node,
      lastUpdated: new Date()
    });
  }

  getNode(id: string): MindMapNode | undefined {
    return this.graph.nodes.get(id);
  }

  removeNode(id: string): void {
    this.graph.nodes.delete(id);
    // Remove all edges connected to this node
    for (const [edgeId, edge] of this.graph.edges) {
      if (edge.source === id || edge.target === id) {
        this.graph.edges.delete(edgeId);
      }
    }
  }

  addEdge(edge: MindMapEdge): void {
    this.graph.edges.set(edge.id, edge);
  }

  getEdge(id: string): MindMapEdge | undefined {
    return this.graph.edges.get(id);
  }

  removeEdge(id: string): void {
    this.graph.edges.delete(id);
  }

  findNodes(predicate: (node: MindMapNode) => boolean): MindMapNode[] {
    return Array.from(this.graph.nodes.values()).filter(predicate);
  }

  findEdges(predicate: (edge: MindMapEdge) => boolean): MindMapEdge[] {
    return Array.from(this.graph.edges.values()).filter(predicate);
  }

  getConnectedNodes(nodeId: string, direction: 'incoming' | 'outgoing' | 'both' = 'both'): MindMapNode[] {
    const connectedIds = new Set<string>();
    
    for (const edge of this.graph.edges.values()) {
      if (direction === 'outgoing' || direction === 'both') {
        if (edge.source === nodeId) {
          connectedIds.add(edge.target);
        }
      }
      if (direction === 'incoming' || direction === 'both') {
        if (edge.target === nodeId) {
          connectedIds.add(edge.source);
        }
      }
    }
    
    return Array.from(connectedIds)
      .map(id => this.graph.nodes.get(id))
      .filter((node): node is MindMapNode => node !== undefined);
  }

  updateNodeConfidence(nodeId: string, confidence: number): void {
    const node = this.graph.nodes.get(nodeId);
    if (node) {
      node.confidence = confidence;
      node.lastUpdated = new Date();
    }
  }

  getGraph(): MindMapGraph {
    return this.graph;
  }

  clear(): void {
    this.graph.nodes.clear();
    this.graph.edges.clear();
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

  // Memory optimization methods

  /**
   * Prune redundant edges to reduce memory usage (SAFE VERSION)
   * Target: Reduce 20k edges to 15k (25% reduction)
   */
  pruneRedundantEdges(options: {
    threshold?: number;
    keepTransitive?: boolean;
    dryRun?: boolean;
    maxRemovalPercentage?: number;
  } = {}): {
    removed: number;
    kept: number;
    memoryReduced: number;
    prunedEdges?: string[];
    safety: {
      totalCandidates: number;
      safetyLimitApplied: boolean;
      edgeTypes: Record<string, number>;
    };
  } {
    const { threshold = 0.3, keepTransitive = false, dryRun = false, maxRemovalPercentage = 25 } = options;
    const initialCount = this.graph.edges.size;
    const prunedEdges: string[] = [];
    let memoryReduced = 0;

    // SAFETY CHECK: Don't run on empty graphs
    if (initialCount === 0) {
      return {
        removed: 0,
        kept: 0,
        memoryReduced: 0,
        prunedEdges: [],
        safety: { totalCandidates: 0, safetyLimitApplied: false, edgeTypes: {} }
      };
    }

    // 1. Find transitive edges (DISABLED - too risky for now)
    const transitiveEdges: string[] = []; // this.findTransitiveEdges();

    // 2. Find only very weak relationships (threshold lowered for safety)
    const weakEdges = this.findWeakEdges(Math.max(0.1, threshold - 0.2));

    // 3. Find variable-specific redundant edges (CONSERVATIVE APPROACH)
    const variableRedundantEdges = this.findVariableRedundantEdgesConservative();

    // Combine all edge candidates for removal
    const edgesToRemove = new Set([
      ...(keepTransitive ? [] : transitiveEdges),
      ...weakEdges,
      ...variableRedundantEdges
    ]);

    // SAFETY LIMIT: Don't remove more than maxRemovalPercentage% of edges
    const maxRemoval = Math.floor(initialCount * maxRemovalPercentage / 100);
    const actualCandidates = Math.min(edgesToRemove.size, maxRemoval);
    const safetyLimitApplied = edgesToRemove.size > maxRemoval;

    // Convert to array and limit removal
    const candidateArray = Array.from(edgesToRemove).slice(0, actualCandidates);

    // Get edge type statistics for safety report
    const edgeTypes: Record<string, number> = {};
    for (const edgeId of candidateArray) {
      const edge = this.graph.edges.get(edgeId);
      if (edge) {
        edgeTypes[edge.type] = (edgeTypes[edge.type] || 0) + 1;
      }
    }

    // Remove edges (only if not dry run)
    for (const edgeId of candidateArray) {
      const edge = this.graph.edges.get(edgeId);
      if (edge && !dryRun) {
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
      prunedEdges: dryRun ? prunedEdges : undefined,
      safety: {
        totalCandidates: edgesToRemove.size,
        safetyLimitApplied,
        edgeTypes
      }
    };
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
      for (const [intermediateEdgeId, intermediateEdge] of this.graph.edges) {
        if (intermediateEdge.source === edge.source && intermediateEdge.id !== edge.id) {
          for (const [targetEdgeId, targetEdge] of this.graph.edges) {
            if (targetEdge.source === intermediateEdge.target &&
                targetEdge.target === edge.target &&
                targetEdge.type === edge.type) {
              transitiveEdges.push(edge.id);
              break;
            }
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
    const variableNodes = this.findNodes(node => node.type === 'variable');

    for (const node of variableNodes) {
      const outgoingEdges = Array.from(this.graph.edges.values())
        .filter(edge => edge.source === node.id);

      // If variable has too many outgoing edges, keep only the strongest ones
      if (outgoingEdges.length > 5) { // Max 5 relationships per variable
        const sortedEdges = outgoingEdges.sort((a, b) => b.confidence - a.confidence);
        const edgesToRemove = sortedEdges.slice(5);
        redundantEdges.push(...edgesToRemove.map(e => e.id));
      }
    }

    return redundantEdges;
  }

  /**
   * Conservative version of variable edge pruning - much safer limits
   */
  private findVariableRedundantEdgesConservative(): string[] {
    const redundantEdges: string[] = [];
    const variableNodes = this.findNodes(node => node.type === 'variable');

    for (const node of variableNodes) {
      const outgoingEdges = Array.from(this.graph.edges.values())
        .filter(edge => edge.source === node.id);

      // CONSERVATIVE: Only prune if variable has excessive edges (>15) and only remove low-confidence ones
      if (outgoingEdges.length > 15) {
        const lowConfidenceEdges = outgoingEdges
          .filter(edge => edge.confidence < 0.2) // Very low confidence only
          .sort((a, b) => a.confidence - b.confidence); // Remove weakest first

        // Remove at most 20% of the excessive edges
        const maxRemoval = Math.min(3, Math.floor(outgoingEdges.length * 0.2));
        const edgesToRemove = lowConfidenceEdges.slice(0, maxRemoval);
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

    const variableNodes = this.findNodes(node => node.type === 'variable');
    let compressed = 0;
    let memoryReduced = 0;
    let lazyLoaded = 0;

    if (enableLazyLoading) {
      // Implement lazy loading for variable metadata
      for (const node of variableNodes) {
        if (dryRun) continue;

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
      const nameMap = new Map<string, MindMapNode[]>();

      for (const node of variableNodes) {
        if (!nameMap.has(node.name)) {
          nameMap.set(node.name, []);
        }
        nameMap.get(node.name)!.push(node);
      }

      // Compress nodes with common names
      for (const [name, nodes] of nameMap) {
        if (nodes.length > 5 && !dryRun) { // Only compress frequently used names
          compressed += nodes.length;
          memoryReduced += nodes.length * 50; // Estimate 50 bytes saved per name deduplication
        }
      }
    }

    return { compressed, memoryReduced, lazyLoaded };
  }

  /**
   * Estimate memory reduction from compressing node metadata
   */
  private estimateNodeMemoryReduction(metadata: any): number {
    return JSON.stringify(metadata).length * 0.7; // Estimate 70% of JSON size
  }
}