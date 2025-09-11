import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname, resolve, normalize, relative } from 'path';
import { MindMapGraph, MindMapNode, MindMapEdge } from '../types/index.js';

export class MindMapStorage {
  private graph: MindMapGraph;
  private storagePath: string;
  private projectRoot: string;

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

  async load(): Promise<void> {
    try {
      // Use async file access check instead of sync
      await access(this.storagePath);
      const data = await readFile(this.storagePath, 'utf-8');
      
      // Validate JSON structure
      const serialized = JSON.parse(data);
      if (!this.validateSerializedData(serialized)) {
        throw new Error('Invalid mind map data format');
      }
      
      this.graph = {
        ...serialized,
        nodes: new Map(serialized.nodes || []),
        edges: new Map(serialized.edges || []),
        lastScan: new Date(serialized.lastScan),
        projectRoot: this.projectRoot // Ensure project root matches current
      };
      
      // Validate all dates in loaded nodes
      for (const [id, node] of this.graph.nodes) {
        if (node.lastUpdated && typeof node.lastUpdated === 'string') {
          node.lastUpdated = new Date(node.lastUpdated);
        } else if (!node.lastUpdated) {
          node.lastUpdated = new Date();
        }
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
      
      const serialized = {
        ...this.graph,
        nodes: Array.from(this.graph.nodes.entries()),
        edges: Array.from(this.graph.edges.entries()),
      };
      
      await writeFile(this.storagePath, JSON.stringify(serialized, null, 2));
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