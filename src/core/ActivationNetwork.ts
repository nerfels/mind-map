import { MindMapNode, MindMapEdge, QueryOptions } from '../types/index.js';
import { MindMapStorage } from './MindMapStorage.js';

/**
 * Activation spreading result for a single node
 */
export interface ActivationResult {
  nodeId: string;
  node: MindMapNode;
  activationStrength: number; // 0.0 to 1.0, strength of activation
  activationPath: string[]; // Path from initial nodes to this node
  hopDistance: number; // Number of hops from initial activation
  contextRelevance: number; // Context-aware relevance boost
  totalScore: number; // Final combined score
}

/**
 * Context information for activation spreading
 */
export interface QueryContext {
  currentTask?: string;
  activeFiles?: string[];
  recentErrors?: string[];
  sessionGoals?: string[];
  frameworkContext?: string[];
  languageContext?: string[];
  timestamp: Date;
}

/**
 * Brain-inspired activation network implementing spreading activation
 * Based on neuroscience research: related concepts activate simultaneously
 * rather than searching sequentially through nodes.
 * 
 * Research Foundation:
 * - Human brain activates related concepts simultaneously vs. sequential search
 * - Activation spreads through neural networks with decay over distance
 * - Context modulates activation strength based on current goals
 * - Attention mechanisms focus on most relevant activated patterns
 */
export class ActivationNetwork {
  private storage: MindMapStorage;
  private activationDecay: number = 0.7; // Decay per hop (0.7 recommended by research)
  private activationThreshold: number = 0.1; // Stop spreading below this threshold
  private maxHops: number = 4; // Maximum hops to prevent infinite expansion
  private cycleDetection: Set<string> = new Set(); // Prevent cycles
  
  constructor(storage: MindMapStorage) {
    this.storage = storage;
  }

  /**
   * Spread activation from initial nodes through the network
   * @param initialNodes Starting node IDs for activation
   * @param context Query context for relevance weighting
   * @param levels Maximum levels to spread (default: 3)
   * @returns Array of activated nodes with strength scores
   */
  async spreadActivation(
    initialNodes: string[], 
    context: QueryContext, 
    levels: number = 3
  ): Promise<ActivationResult[]> {
    const startTime = performance.now();
    
    // Initialize activation map
    const activationMap = new Map<string, {
      strength: number;
      path: string[];
      hopDistance: number;
      contextRelevance: number;
    }>();
    
    // Clear cycle detection for new spreading session
    this.cycleDetection.clear();
    
    // Set initial activation strength
    for (const nodeId of initialNodes) {
      const node = this.storage.getNode(nodeId);
      if (node) {
        const contextRelevance = this.calculateContextRelevance(node, context);
        activationMap.set(nodeId, {
          strength: 1.0,
          path: [nodeId],
          hopDistance: 0,
          contextRelevance
        });
      }
    }

    // Spread activation through network levels
    let currentLevel = initialNodes;
    
    for (let level = 1; level <= Math.min(levels, this.maxHops); level++) {
      const nextLevel: string[] = [];
      const currentDecay = Math.pow(this.activationDecay, level);
      
      // If decay drops below threshold, stop spreading
      if (currentDecay < this.activationThreshold) {
        break;
      }
      
      for (const sourceNodeId of currentLevel) {
        const sourceActivation = activationMap.get(sourceNodeId);
        if (!sourceActivation || sourceActivation.strength < this.activationThreshold) {
          continue;
        }
        
        // Find all connected nodes
        const connectedNodes = this.findConnectedNodes(sourceNodeId);
        
        for (const { targetNodeId, edge } of connectedNodes) {
          // Prevent cycles
          if (this.cycleDetection.has(`${sourceNodeId}->${targetNodeId}`)) {
            continue;
          }
          this.cycleDetection.add(`${sourceNodeId}->${targetNodeId}`);
          
          // Calculate activation strength for target node
          const targetNode = this.storage.getNode(targetNodeId);
          if (!targetNode) continue;
          
          const edgeWeight = edge.weight || 1.0;
          const edgeConfidence = edge.confidence;
          const contextRelevance = this.calculateContextRelevance(targetNode, context);
          
          // Calculate new activation strength
          const propagatedStrength = sourceActivation.strength * currentDecay * edgeWeight * edgeConfidence;
          const boostedStrength = propagatedStrength * (1 + contextRelevance);
          
          // Update or add activation if stronger than existing
          const existingActivation = activationMap.get(targetNodeId);
          if (!existingActivation || boostedStrength > existingActivation.strength) {
            activationMap.set(targetNodeId, {
              strength: boostedStrength,
              path: [...sourceActivation.path, targetNodeId],
              hopDistance: level,
              contextRelevance
            });
            
            // Add to next level if above threshold
            if (boostedStrength >= this.activationThreshold) {
              nextLevel.push(targetNodeId);
            }
          }
        }
      }
      
      currentLevel = nextLevel;
      
      // Stop if no more nodes to process
      if (currentLevel.length === 0) {
        break;
      }
    }

    // Convert to results and rank by activation strength
    const results = this.rankByActivationStrength(activationMap);
    
    // Log performance metrics
    const endTime = performance.now();
    console.log(`Activation spreading completed in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`Activated ${results.length} nodes across ${levels} levels`);
    
    return results;
  }

  /**
   * Calculate context-aware relevance boost for a node
   * @param node The node to evaluate
   * @param context Query context
   * @returns Relevance multiplier (0.0 to 1.0)
   */
  private calculateContextRelevance(node: MindMapNode, context: QueryContext): number {
    let relevance = 0.0;
    
    // Task-based relevance
    if (context.currentTask && node.metadata.tasks) {
      const taskMatches = node.metadata.tasks.filter((task: any) => 
        task.description?.toLowerCase().includes(context.currentTask?.toLowerCase() || '')
      ).length;
      relevance += taskMatches * 0.3;
    }
    
    // Active files context
    if (context.activeFiles && node.path) {
      const isActiveFile = context.activeFiles.some(file => 
        node.path?.includes(file) || file.includes(node.path || '')
      );
      if (isActiveFile) relevance += 0.4;
    }
    
    // Error context relevance
    if (context.recentErrors && node.type === 'error') {
      const errorMatches = context.recentErrors.filter(error => 
        node.metadata.message?.includes(error)
      ).length;
      relevance += errorMatches * 0.25;
    }
    
    // Framework context
    if (context.frameworkContext && node.frameworks) {
      const frameworkMatches = node.frameworks.filter(fw => 
        context.frameworkContext?.includes(fw)
      ).length;
      relevance += frameworkMatches * 0.2;
    }
    
    // Language context
    if (context.languageContext && node.metadata.language) {
      if (context.languageContext.includes(node.metadata.language)) {
        relevance += 0.15;
      }
    }
    
    // Recency boost - more recent updates are more relevant
    if (node.lastUpdated) {
      const hoursSinceUpdate = (context.timestamp.getTime() - node.lastUpdated.getTime()) / (1000 * 60 * 60);
      const recencyBoost = Math.max(0, 0.1 * Math.exp(-hoursSinceUpdate / 24)); // Exponential decay over 24 hours
      relevance += recencyBoost;
    }
    
    // Confidence boost - higher confidence nodes are more relevant
    relevance += node.confidence * 0.1;
    
    return Math.min(1.0, relevance); // Cap at 1.0
  }

  /**
   * Find all nodes connected to a source node
   * @param sourceNodeId Source node ID
   * @returns Array of connected nodes with their edges
   */
  private findConnectedNodes(sourceNodeId: string): Array<{ targetNodeId: string; edge: MindMapEdge }> {
    const connected: Array<{ targetNodeId: string; edge: MindMapEdge }> = [];
    const edges = this.storage.getGraph().edges;
    
    for (const edge of edges.values()) {
      if (edge.source === sourceNodeId) {
        connected.push({ targetNodeId: edge.target, edge });
      } else if (edge.target === sourceNodeId) {
        // Bidirectional traversal for better activation spreading
        connected.push({ targetNodeId: edge.source, edge });
      }
    }
    
    return connected;
  }

  /**
   * Rank activation results by strength and convert to ActivationResult format
   * @param activationMap Map of node activations
   * @returns Sorted array of activation results
   */
  private rankByActivationStrength(
    activationMap: Map<string, {
      strength: number;
      path: string[];
      hopDistance: number;
      contextRelevance: number;
    }>
  ): ActivationResult[] {
    const results: ActivationResult[] = [];
    
    for (const [nodeId, activation] of activationMap.entries()) {
      const node = this.storage.getNode(nodeId);
      if (!node) continue;
      
      // Calculate total score combining activation strength and context relevance
      const totalScore = activation.strength * (1 + activation.contextRelevance);
      
      results.push({
        nodeId,
        node,
        activationStrength: activation.strength,
        activationPath: activation.path,
        hopDistance: activation.hopDistance,
        contextRelevance: activation.contextRelevance,
        totalScore
      });
    }
    
    // Sort by total score (descending)
    return results.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Get configuration for fine-tuning activation parameters
   */
  getConfiguration() {
    return {
      activationDecay: this.activationDecay,
      activationThreshold: this.activationThreshold,
      maxHops: this.maxHops
    };
  }

  /**
   * Update configuration parameters for experimentation
   */
  updateConfiguration(config: {
    activationDecay?: number;
    activationThreshold?: number;
    maxHops?: number;
  }) {
    if (config.activationDecay !== undefined) {
      this.activationDecay = Math.max(0.1, Math.min(1.0, config.activationDecay));
    }
    if (config.activationThreshold !== undefined) {
      this.activationThreshold = Math.max(0.01, Math.min(0.5, config.activationThreshold));
    }
    if (config.maxHops !== undefined) {
      this.maxHops = Math.max(1, Math.min(10, config.maxHops));
    }
  }
}