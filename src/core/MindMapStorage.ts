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
}