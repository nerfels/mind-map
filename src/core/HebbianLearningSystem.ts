/**
 * Hebbian Learning System - "Neurons that fire together, wire together"
 * 
 * Implements brain-inspired associative learning based on Donald Hebb's principles:
 * - Co-activation detection and strengthening
 * - Automatic relationship discovery  
 * - Dynamic confidence adjustments
 * - Synaptic plasticity simulation
 * 
 * Research Foundation:
 * - Hebbian Learning (1949): Synaptic strengthening through co-activation
 * - Long-term Potentiation (LTP): Biological basis for memory formation
 * - Spike-timing Dependent Plasticity (STDP): Timing-dependent learning rules
 * - Neural network associative memory principles
 */

import { MindMapStorage } from './MindMapStorage.js';
import { MindMapNode, MindMapEdge } from '../types/index.js';

interface CoActivationEvent {
  timestamp: Date;
  primaryNode: string;
  coActivatedNodes: string[];
  context: string;
  activationStrength: number;
}

interface HebbianConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  connectionType: 'co_activation' | 'temporal_sequence' | 'context_association';
  strength: number; // 0.0 to 1.0
  activationCount: number;
  lastActivation: Date;
  decayRate: number;
  learningRate: number;
  contextual: boolean;
  metadata: {
    averageTimeDelta: number;
    co_activation_contexts: string[];
    confidence_boost: number;
  };
}

interface LearningConfiguration {
  learningRate: number; // How fast connections strengthen (0.01-0.1)
  decayRate: number; // How fast unused connections weaken (0.001-0.01)
  activationThreshold: number; // Minimum strength for connection activation (0.1-0.3)
  maxConnections: number; // Maximum connections per node (50-200)
  contextWindow: number; // Time window for co-activation detection (ms)
  strengthenThreshold: number; // Threshold for relationship strengthening (0.5)
  pruningThreshold: number; // Threshold below which connections are removed (0.05)
}

export class HebbianLearningSystem {
  private storage: MindMapStorage;
  private connections: Map<string, HebbianConnection> = new Map();
  private recentActivations: CoActivationEvent[] = [];
  private config: LearningConfiguration;
  
  constructor(storage: MindMapStorage, config?: Partial<LearningConfiguration>) {
    this.storage = storage;
    this.config = {
      learningRate: 0.05,
      decayRate: 0.002,
      activationThreshold: 0.2,
      maxConnections: 100,
      contextWindow: 5000, // 5 seconds
      strengthenThreshold: 0.6,
      pruningThreshold: 0.05,
      ...config
    };
    
    this.loadConnections();
    this.startDecayProcess();
  }

  /**
   * Record co-activation of nodes (Hebbian learning trigger)
   */
  async recordCoActivation(
    primaryNodeId: string,
    coActivatedNodeIds: string[],
    context: string = '',
    activationStrength: number = 1.0
  ): Promise<void> {
    const event: CoActivationEvent = {
      timestamp: new Date(),
      primaryNode: primaryNodeId,
      coActivatedNodes: coActivatedNodeIds.filter(id => id !== primaryNodeId),
      context,
      activationStrength
    };

    this.recentActivations.push(event);
    
    // Keep only recent activations within context window
    const cutoffTime = new Date(Date.now() - this.config.contextWindow);
    this.recentActivations = this.recentActivations.filter(
      activation => activation.timestamp > cutoffTime
    );

    // Apply Hebbian learning rule for each co-activated pair
    for (const coActivatedId of event.coActivatedNodes) {
      await this.strengthenConnection(primaryNodeId, coActivatedId, context, activationStrength);
    }

    // Discover new relationships based on co-activation patterns
    await this.discoverNewRelationships(event);
    
    // Apply dynamic confidence adjustments
    await this.adjustNodeConfidences(primaryNodeId, event.coActivatedNodes);
  }

  /**
   * Strengthen connection between two nodes (Hebbian strengthening)
   */
  private async strengthenConnection(
    sourceId: string,
    targetId: string,
    context: string,
    strength: number
  ): Promise<void> {
    const connectionId = this.generateConnectionId(sourceId, targetId);
    let connection = this.connections.get(connectionId);

    if (!connection) {
      // Create new Hebbian connection
      connection = {
        id: connectionId,
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        connectionType: 'co_activation',
        strength: 0.1, // Initial weak connection
        activationCount: 0,
        lastActivation: new Date(),
        decayRate: this.config.decayRate,
        learningRate: this.config.learningRate,
        contextual: context.length > 0,
        metadata: {
          averageTimeDelta: 0,
          co_activation_contexts: [],
          confidence_boost: 0.0
        }
      };
    }

    // Apply Hebbian learning rule: Δw = η × x × y
    // Where η = learning rate, x = source activation, y = target activation
    const deltaStrength = this.config.learningRate * strength * strength;
    connection.strength = Math.min(1.0, connection.strength + deltaStrength);
    connection.activationCount++;
    connection.lastActivation = new Date();
    
    // Update context information
    if (context && !connection.metadata.co_activation_contexts.includes(context)) {
      connection.metadata.co_activation_contexts.push(context);
    }

    // Calculate confidence boost based on connection strength
    connection.metadata.confidence_boost = Math.max(0, (connection.strength - 0.5) * 0.2);

    this.connections.set(connectionId, connection);

    // If connection is strong enough, create/strengthen edge in mind map
    if (connection.strength >= this.config.strengthenThreshold) {
      await this.createOrStrengthenEdge(sourceId, targetId, connection);
    }
  }

  /**
   * Discover new relationships based on co-activation patterns
   */
  private async discoverNewRelationships(event: CoActivationEvent): Promise<void> {
    // Look for transitive relationships: if A co-activates with B, and B with C,
    // then A might relate to C (triangle formation in neural networks)
    
    const relatedActivations = this.recentActivations.filter(
      activation => activation.timestamp > new Date(Date.now() - this.config.contextWindow * 2)
    );

    for (const coActivatedId of event.coActivatedNodes) {
      // Find other nodes that frequently co-activate with this node
      const transitiveNodes = new Set<string>();
      
      for (const pastActivation of relatedActivations) {
        if (pastActivation.coActivatedNodes.includes(coActivatedId)) {
          pastActivation.coActivatedNodes.forEach(nodeId => {
            if (nodeId !== coActivatedId && nodeId !== event.primaryNode) {
              transitiveNodes.add(nodeId);
            }
          });
        }
      }

      // Create weak connections to discovered transitive relationships
      for (const transitiveId of transitiveNodes) {
        const existingConnection = this.connections.get(
          this.generateConnectionId(event.primaryNode, transitiveId)
        );
        
        if (!existingConnection || existingConnection.strength < 0.3) {
          await this.strengthenConnection(
            event.primaryNode, 
            transitiveId, 
            `transitive_via_${coActivatedId}`, 
            0.3 // Weaker strength for discovered relationships
          );
        }
      }
    }
  }

  /**
   * Adjust node confidences based on co-activation patterns
   */
  private async adjustNodeConfidences(primaryNodeId: string, coActivatedIds: string[]): Promise<void> {
    const graph = this.storage.getGraph();
    
    // Boost confidence of frequently co-activated nodes
    for (const nodeId of [primaryNodeId, ...coActivatedIds]) {
      const node = graph.nodes.get(nodeId);
      if (node) {
        // Calculate confidence boost based on recent co-activation frequency
        const recentCoActivations = this.recentActivations.filter(
          activation => 
            activation.primaryNode === nodeId || 
            activation.coActivatedNodes.includes(nodeId)
        ).length;
        
        const confidenceBoost = Math.min(0.1, recentCoActivations * 0.01);
        const newConfidence = Math.min(1.0, node.confidence + confidenceBoost);
        
        if (newConfidence !== node.confidence) {
          this.storage.updateNodeConfidence(nodeId, newConfidence);
        }
      }
    }
  }

  /**
   * Create or strengthen edge in the mind map based on Hebbian connection
   */
  private async createOrStrengthenEdge(
    sourceId: string, 
    targetId: string, 
    connection: HebbianConnection
  ): Promise<void> {
    const graph = this.storage.getGraph();
    const existingEdge = Array.from(graph.edges.values()).find(
      edge => 
        (edge.source === sourceId && edge.target === targetId) ||
        (edge.source === targetId && edge.target === sourceId)
    );

    if (existingEdge) {
      // Strengthen existing edge
      const newConfidence = Math.min(1.0, existingEdge.confidence + connection.metadata.confidence_boost);
      // Update existing edge properties directly
      existingEdge.confidence = newConfidence;
      existingEdge.metadata = {
        ...existingEdge.metadata,
        hebbian_strength: connection.strength,
        activation_count: connection.activationCount,
        last_strengthened: connection.lastActivation.toISOString()
      };
      existingEdge.lastUpdated = new Date();
    } else {
      // Create new edge based on Hebbian learning
      const newEdge: MindMapEdge = {
        id: `hebbian_${connection.id}`,
        source: sourceId,
        target: targetId,
        type: 'co_activates',
        confidence: connection.strength,
        metadata: {
          created_by: 'hebbian_learning',
          connection_type: connection.connectionType,
          activation_count: connection.activationCount,
          contexts: connection.metadata.co_activation_contexts,
          hebbian_strength: connection.strength
        },
        created: new Date(),
        lastUpdated: new Date()
      };

      await this.storage.addEdge(newEdge);
    }
  }

  /**
   * Apply decay to unused connections (synaptic pruning)
   */
  private applyDecay(): void {
    const now = new Date();
    const connectionsToRemove: string[] = [];

    for (const [connectionId, connection] of this.connections) {
      const timeSinceLastActivation = now.getTime() - connection.lastActivation.getTime();
      const decayAmount = (timeSinceLastActivation / 1000) * connection.decayRate;
      
      connection.strength = Math.max(0, connection.strength - decayAmount);
      
      // Prune very weak connections (synaptic pruning)
      if (connection.strength < this.config.pruningThreshold) {
        connectionsToRemove.push(connectionId);
      }
    }

    // Remove pruned connections
    connectionsToRemove.forEach(id => this.connections.delete(id));
  }

  /**
   * Get connections for analysis and debugging
   */
  getConnections(nodeId?: string): HebbianConnection[] {
    const connections = Array.from(this.connections.values());
    
    if (nodeId) {
      return connections.filter(
        conn => conn.sourceNodeId === nodeId || conn.targetNodeId === nodeId
      );
    }
    
    return connections;
  }

  /**
   * Get Hebbian learning statistics
   */
  getStatistics(): {
    totalConnections: number;
    strongConnections: number;
    averageStrength: number;
    recentActivations: number;
    connectionsCreatedToday: number;
    topConnections: Array<{ source: string; target: string; strength: number }>;
    learningRate: number;
    decayRate: number;
  } {
    const connections = Array.from(this.connections.values());
    const strongConnections = connections.filter(c => c.strength >= this.config.strengthenThreshold);
    const averageStrength = connections.length > 0 ? 
      connections.reduce((sum, c) => sum + c.strength, 0) / connections.length : 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const connectionsCreatedToday = connections.filter(c => c.lastActivation >= today).length;
    
    const topConnections = connections
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 10)
      .map(c => ({
        source: c.sourceNodeId,
        target: c.targetNodeId,
        strength: Math.round(c.strength * 100) / 100
      }));

    return {
      totalConnections: connections.length,
      strongConnections: strongConnections.length,
      averageStrength: Math.round(averageStrength * 1000) / 1000,
      recentActivations: this.recentActivations.length,
      connectionsCreatedToday,
      topConnections,
      learningRate: this.config.learningRate,
      decayRate: this.config.decayRate
    };
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(sourceId: string, targetId: string): string {
    // Ensure consistent ordering for bidirectional connections
    const [id1, id2] = [sourceId, targetId].sort();
    return `${id1}→${id2}`;
  }

  /**
   * Load connections from persistent storage
   */
  private loadConnections(): void {
    // Implementation would load from persistent storage
    // For now, start with empty connections
  }

  /**
   * Start background decay process
   */
  private startDecayProcess(): void {
    // Apply decay every 30 seconds
    setInterval(() => {
      this.applyDecay();
    }, 30000);
  }

  /**
   * Get comprehensive statistics about Hebbian learning system
   */
  getStats() {
    const connections = Array.from(this.connections.values());
    const totalConnections = connections.length;
    const activeConnections = connections.filter(c => c.strength >= this.config.activationThreshold);
    
    const strengthDistribution = {
      weak: connections.filter(c => c.strength < 0.3).length,
      medium: connections.filter(c => c.strength >= 0.3 && c.strength < 0.7).length,
      strong: connections.filter(c => c.strength >= 0.7).length
    };

    const averageStrength = totalConnections > 0 
      ? connections.reduce((sum, c) => sum + c.strength, 0) / totalConnections 
      : 0;
    
    const totalActivations = connections.reduce((sum, c) => sum + c.activationCount, 0);
    const averageActivationsPerConnection = totalConnections > 0 
      ? totalActivations / totalConnections 
      : 0;

    const connectionTypes = {
      co_activation: connections.filter(c => c.connectionType === 'co_activation').length,
      temporal_sequence: connections.filter(c => c.connectionType === 'temporal_sequence').length,
      context_association: connections.filter(c => c.connectionType === 'context_association').length
    };

    const contextualConnections = connections.filter(c => c.contextual).length;
    const recentActivity = this.recentActivations.length;

    return {
      totalConnections,
      activeConnections: activeConnections.length,
      averageStrength,
      strengthDistribution,
      connectionTypes,
      contextualConnections,
      recentActivity,
      totalActivations,
      averageActivationsPerConnection,
      learningRate: this.config.learningRate,
      decayRate: this.config.decayRate,
      activationThreshold: this.config.activationThreshold,
      maxConnections: this.config.maxConnections
    };
  }

  /**
   * Save connections to persistent storage
   */
  async saveConnections(): Promise<void> {
    // Implementation would save connections to persistent storage
    // This could be integrated with MindMapStorage's save mechanism
  }
}