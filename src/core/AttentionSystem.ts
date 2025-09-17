/**
 * Attention System - Brain-Inspired Dynamic Attention Mechanisms
 * Implements selective attention, focus allocation, and multi-modal attention fusion
 * Based on cognitive neuroscience attention models and computational attention mechanisms
 */

import { MindMapNode, MindMapEdge, QueryOptions, QueryResult } from '../types/index.js';
import { MindMapStorage } from './MindMapStorage.js';

// Attention Types and Interfaces
export enum AttentionType {
  SELECTIVE = 'selective',    // Focused attention on specific targets
  DIVIDED = 'divided',        // Split attention across multiple targets  
  SUSTAINED = 'sustained',    // Maintained attention over time
  EXECUTIVE = 'executive'     // Top-down goal-directed attention
}

export enum AttentionModality {
  SEMANTIC = 'semantic',      // Text/code semantic content
  STRUCTURAL = 'structural',  // Code structure and patterns
  TEMPORAL = 'temporal',      // Time-based relevance
  CONTEXTUAL = 'contextual',  // Current context relevance
  RELATIONAL = 'relational'   // Relationship-based attention
}

export interface AttentionTarget {
  nodeId: string;
  modality: AttentionModality;
  strength: number;           // 0-1, strength of attention focus
  persistence: number;        // How long attention should be maintained (ms)
  priority: number;          // Priority level (higher = more important)
  timestamp: Date;
  decayRate: number;         // How fast attention decays over time
  reinforcement: number;     // How much to strengthen on repeated access
}

export interface AttentionContext {
  currentTask?: string;
  activeFiles?: string[];
  recentQueries?: string[];
  userGoals?: string[];
  frameworkContext?: string[];
  timeContext?: {
    sessionStart: Date;
    lastActivity: Date;
    taskDuration: number;
  };
}

export interface AttentionWeights {
  semantic: number;
  structural: number;
  temporal: number;
  contextual: number;
  relational: number;
}

export interface AttentionScore {
  nodeId: string;
  totalScore: number;
  modalityScores: Record<AttentionModality, number>;
  attentionTargets: AttentionTarget[];
  focusStrength: number;     // 0-1, how much this node captures attention
  explanation: string;       // Why this node received attention
}

export interface AttentionAllocation {
  totalCapacity: number;     // Total attention capacity (0-1)
  allocated: number;         // Currently allocated attention
  available: number;         // Available attention capacity
  targets: AttentionTarget[];
  efficiency: number;        // How efficiently attention is being used
}

export interface AttentionConfiguration {
  maxTargets: number;              // Maximum attention targets
  totalCapacity: number;           // Total attention capacity (0-1)
  decayInterval: number;           // How often to apply attention decay (ms)
  minAttentionThreshold: number;   // Minimum attention to maintain target
  reinforcementFactor: number;     // Attention reinforcement multiplier
  modalityWeights: AttentionWeights; // Default modality weights
  sustainedAttentionDuration: number; // How long to maintain sustained attention (ms)
  executiveOverrideThreshold: number; // Threshold for executive attention override
}

/**
 * AttentionSystem - Implements brain-inspired attention mechanisms for code intelligence
 * 
 * Core Principles:
 * 1. Limited Attention Capacity - Based on cognitive load theory
 * 2. Selective Attention - Focus on most relevant information
 * 3. Multi-modal Fusion - Combine different types of attention
 * 4. Dynamic Allocation - Adjust attention based on context and goals
 * 5. Temporal Persistence - Maintain attention over time with decay
 */
export class AttentionSystem {
  private storage: MindMapStorage;
  private targets: Map<string, AttentionTarget>;
  private config: AttentionConfiguration;
  private lastDecayUpdate: Date;
  private attentionHistory: Array<{ timestamp: Date; allocation: AttentionAllocation }>;

  constructor(storage: MindMapStorage, config?: Partial<AttentionConfiguration>) {
    this.storage = storage;
    this.targets = new Map();
    this.lastDecayUpdate = new Date();
    this.attentionHistory = [];

    // Default configuration based on cognitive science research
    this.config = {
      maxTargets: 7,                    // Miller's magic number ±2
      totalCapacity: 1.0,               // Full attention capacity
      decayInterval: 30000,             // 30 second decay updates
      minAttentionThreshold: 0.05,      // 5% minimum attention to maintain
      reinforcementFactor: 1.2,         // 20% boost on reinforcement
      sustainedAttentionDuration: 300000, // 5 minutes sustained attention
      executiveOverrideThreshold: 0.8,   // 80% threshold for executive override
      modalityWeights: {
        semantic: 0.3,
        structural: 0.2,
        temporal: 0.15,
        contextual: 0.25,
        relational: 0.1
      },
      ...config
    };
  }

  /**
   * Allocate attention to specific targets based on context and relevance
   */
  allocateAttention(nodes: MindMapNode[], context: AttentionContext, type: AttentionType = AttentionType.SELECTIVE): AttentionAllocation {
    this.applyAttentionDecay();

    const currentAllocation = this.getCurrentAllocation();
    const availableCapacity = this.config.totalCapacity - currentAllocation.allocated;

    // Calculate attention scores for candidate nodes
    const attentionScores = this.calculateAttentionScores(nodes, context);
    
    // Sort by attention score (highest first)
    attentionScores.sort((a, b) => b.totalScore - a.totalScore);

    // Allocate attention based on type
    let newTargets: AttentionTarget[] = [];
    let capacityUsed = 0;

    switch (type) {
      case AttentionType.SELECTIVE:
        newTargets = this.allocateSelectiveAttention(attentionScores, availableCapacity, context);
        break;
      case AttentionType.DIVIDED:
        newTargets = this.allocateDividedAttention(attentionScores, availableCapacity, context);
        break;
      case AttentionType.SUSTAINED:
        newTargets = this.allocateSustainedAttention(attentionScores, availableCapacity, context);
        break;
      case AttentionType.EXECUTIVE:
        newTargets = this.allocateExecutiveAttention(attentionScores, availableCapacity, context);
        break;
    }

    // Add new targets to attention map
    for (const target of newTargets) {
      this.targets.set(target.nodeId, target);
      capacityUsed += target.strength;
    }

    // Calculate final allocation
    const finalAllocation: AttentionAllocation = {
      totalCapacity: this.config.totalCapacity,
      allocated: currentAllocation.allocated + capacityUsed,
      available: this.config.totalCapacity - (currentAllocation.allocated + capacityUsed),
      targets: Array.from(this.targets.values()),
      efficiency: this.calculateAttentionEfficiency()
    };

    // Store allocation history
    this.attentionHistory.push({
      timestamp: new Date(),
      allocation: finalAllocation
    });

    // Keep only last 100 allocations for memory management
    if (this.attentionHistory.length > 100) {
      this.attentionHistory = this.attentionHistory.slice(-100);
    }

    return finalAllocation;
  }

  /**
   * Apply attention weights to query results for relevance-based focusing
   */
  applyAttentionToResults(results: QueryResult, context: AttentionContext): QueryResult {
    if (!results.nodes || results.nodes.length === 0) {
      return results;
    }

    // Calculate attention scores for result nodes
    const attentionScores = this.calculateAttentionScores(results.nodes, context);
    const scoreMap = new Map(attentionScores.map(score => [score.nodeId, score]));

    // Apply attention weighting to node scores
    const enhancedNodes = results.nodes.map(node => {
      const attentionScore = scoreMap.get(node.id);
      if (attentionScore) {
        // Boost confidence based on attention score
        const attentionBoost = attentionScore.focusStrength * 0.3; // Max 30% boost
        const enhancedConfidence = Math.min(1.0, node.confidence + attentionBoost);
        
        return {
          ...node,
          confidence: enhancedConfidence,
          metadata: {
            ...node.metadata,
            attentionScore: attentionScore.totalScore,
            attentionExplanation: attentionScore.explanation,
            focusStrength: attentionScore.focusStrength
          }
        };
      }
      return node;
    });

    // Re-sort by enhanced confidence (attention-weighted)
    enhancedNodes.sort((a, b) => b.confidence - a.confidence);

    return {
      ...results,
      nodes: enhancedNodes,
      totalMatches: enhancedNodes.length,
      queryTime: results.queryTime
    };
  }

  /**
   * Update attention based on user activity and feedback
   */
  updateAttentionFromActivity(activity: {
    nodeIds?: string[];
    queryText?: string;
    actionType: 'query' | 'file_access' | 'edit' | 'error' | 'success';
    timestamp?: Date;
    context?: AttentionContext;
  }): void {
    const timestamp = activity.timestamp || new Date();
    
    // Reinforce attention for accessed nodes
    if (activity.nodeIds) {
      for (const nodeId of activity.nodeIds) {
        const target = this.targets.get(nodeId);
        if (target) {
          // Reinforce existing attention
          target.strength = Math.min(1.0, target.strength * this.config.reinforcementFactor);
          target.timestamp = timestamp;
          target.reinforcement += 1;
        } else {
          // Create new attention target for accessed node
          const node = this.storage.getNode(nodeId);
          if (node) {
            const newTarget: AttentionTarget = {
              nodeId,
              modality: this.inferAttentionModality(activity.actionType, activity.queryText),
              strength: 0.6, // Medium initial attention
              persistence: this.config.sustainedAttentionDuration,
              priority: activity.actionType === 'error' ? 0.9 : 0.5,
              timestamp,
              decayRate: 0.1 / 60000, // 0.1 per minute
              reinforcement: 1
            };
            
            this.targets.set(nodeId, newTarget);
          }
        }
      }
    }

    // Adjust attention based on activity outcome
    if (activity.actionType === 'success') {
      // Boost attention for recently accessed nodes (success reinforcement)
      this.boostRecentAttention(0.1, timestamp);
    } else if (activity.actionType === 'error') {
      // Reduce attention for recently accessed nodes (failure punishment)
      this.reduceRecentAttention(0.05, timestamp);
    }
  }

  // Private Helper Methods

  private calculateAttentionScores(nodes: MindMapNode[], context: AttentionContext): AttentionScore[] {
    return nodes.map(node => {
      const modalityScores: Record<AttentionModality, number> = {
        [AttentionModality.SEMANTIC]: this.calculateSemanticAttention(node, context),
        [AttentionModality.STRUCTURAL]: this.calculateStructuralAttention(node, context),
        [AttentionModality.TEMPORAL]: this.calculateTemporalAttention(node, context),
        [AttentionModality.CONTEXTUAL]: this.calculateContextualAttention(node, context),
        [AttentionModality.RELATIONAL]: this.calculateRelationalAttention(node, context)
      };

      // Weighted sum of modality scores
      const totalScore = Object.entries(modalityScores).reduce((sum, [modality, score]) => {
        const weight = this.config.modalityWeights[modality as AttentionModality];
        return sum + (score * weight);
      }, 0);

      const focusStrength = Math.min(1.0, totalScore);
      
      // Generate explanation
      const dominantModality = Object.entries(modalityScores)
        .reduce((a, b) => modalityScores[a[0] as AttentionModality] > modalityScores[b[0] as AttentionModality] ? a : b)[0];

      const explanation = `Strong ${dominantModality} attention (${(modalityScores[dominantModality as AttentionModality] * 100).toFixed(1)}%)`;

      return {
        nodeId: node.id,
        totalScore,
        modalityScores,
        attentionTargets: [this.targets.get(node.id)].filter(Boolean) as AttentionTarget[],
        focusStrength,
        explanation
      };
    });
  }

  private calculateSemanticAttention(node: MindMapNode, context: AttentionContext): number {
    let score = 0;

    // Boost for current task relevance
    if (context.currentTask && (
      node.name.toLowerCase().includes(context.currentTask.toLowerCase()) ||
      JSON.stringify(node.metadata).toLowerCase().includes(context.currentTask.toLowerCase())
    )) {
      score += 0.4;
    }

    // Boost for recent query relevance
    if (context.recentQueries) {
      for (const query of context.recentQueries) {
        if (node.name.toLowerCase().includes(query.toLowerCase())) {
          score += 0.3;
          break;
        }
      }
    }

    // Base semantic relevance from confidence
    score += node.confidence * 0.3;

    return Math.min(1.0, score);
  }

  private calculateStructuralAttention(node: MindMapNode, context: AttentionContext): number {
    let score = 0;

    // Boost for active file relevance
    if (context.activeFiles && node.path) {
      const isActiveFile = context.activeFiles.some(file => 
        node.path?.includes(file) || file.includes(node.path || '')
      );
      if (isActiveFile) score += 0.5;
    }

    // Boost for structural importance (functions, classes)
    if (node.type === 'function' || node.type === 'class') {
      score += 0.3;
    }

    // Framework context boost
    if (context.frameworkContext && node.frameworks) {
      const hasFrameworkMatch = node.frameworks.some(fw => 
        context.frameworkContext?.includes(fw)
      );
      if (hasFrameworkMatch) score += 0.2;
    }

    return Math.min(1.0, score);
  }

  private calculateTemporalAttention(node: MindMapNode, context: AttentionContext): number {
    const now = new Date();
    const nodeAge = now.getTime() - node.lastUpdated.getTime();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    // Recency boost (stronger for recent updates)
    const recencyScore = Math.max(0, 1 - (nodeAge / (7 * dayInMs))); // Decay over 1 week

    // Session context boost
    let sessionScore = 0;
    if (context.timeContext) {
      const sessionAge = now.getTime() - context.timeContext.sessionStart.getTime();
      const lastActivity = now.getTime() - context.timeContext.lastActivity.getTime();
      
      if (lastActivity < 300000) { // Within 5 minutes
        sessionScore += 0.3;
      }
    }

    return Math.min(1.0, recencyScore * 0.7 + sessionScore);
  }

  private calculateContextualAttention(node: MindMapNode, context: AttentionContext): number {
    let score = 0;

    // Existing attention target boost
    const existingTarget = this.targets.get(node.id);
    if (existingTarget) {
      score += existingTarget.strength * 0.4;
    }

    // User goals alignment
    if (context.userGoals) {
      for (const goal of context.userGoals) {
        if (node.name.toLowerCase().includes(goal.toLowerCase()) ||
            JSON.stringify(node.metadata).toLowerCase().includes(goal.toLowerCase())) {
          score += 0.3;
          break;
        }
      }
    }

    return Math.min(1.0, score);
  }

  private calculateRelationalAttention(node: MindMapNode, context: AttentionContext): number {
    const edges = this.storage.findEdges(edge => edge.source === node.id || edge.target === node.id);
    let score = 0;

    // Boost based on connection strength
    const connectionScore = Math.min(0.5, edges.length * 0.05); // Max 0.5 for highly connected nodes
    score += connectionScore;

    // Boost for connections to high-attention nodes
    let highAttentionConnections = 0;
    for (const edge of edges) {
      const targetId = edge.source === node.id ? edge.target : edge.source;
      const targetAttention = this.targets.get(targetId);
      if (targetAttention && targetAttention.strength > 0.5) {
        highAttentionConnections++;
      }
    }
    score += Math.min(0.3, highAttentionConnections * 0.1);

    return Math.min(1.0, score);
  }

  private allocateSelectiveAttention(scores: AttentionScore[], availableCapacity: number, context: AttentionContext): AttentionTarget[] {
    const targets: AttentionTarget[] = [];
    let capacityUsed = 0;

    // Focus on top scoring nodes up to capacity limit
    for (const score of scores) {
      if (capacityUsed >= availableCapacity || targets.length >= 3) break; // Max 3 for selective

      const strength = Math.min(availableCapacity - capacityUsed, score.focusStrength);
      if (strength >= this.config.minAttentionThreshold) {
        targets.push({
          nodeId: score.nodeId,
          modality: this.getDominantModality(score.modalityScores),
          strength,
          persistence: this.config.sustainedAttentionDuration,
          priority: score.totalScore,
          timestamp: new Date(),
          decayRate: 0.05 / 60000, // Slow decay for selective attention
          reinforcement: 0
        });
        capacityUsed += strength;
      }
    }

    return targets;
  }

  private allocateDividedAttention(scores: AttentionScore[], availableCapacity: number, context: AttentionContext): AttentionTarget[] {
    const targets: AttentionTarget[] = [];
    const targetCount = Math.min(scores.length, this.config.maxTargets);
    const strengthPerTarget = availableCapacity / targetCount;

    // Distribute attention evenly across top nodes
    for (let i = 0; i < targetCount && i < scores.length; i++) {
      const score = scores[i];
      const strength = Math.min(strengthPerTarget, score.focusStrength);
      
      if (strength >= this.config.minAttentionThreshold) {
        targets.push({
          nodeId: score.nodeId,
          modality: this.getDominantModality(score.modalityScores),
          strength,
          persistence: this.config.sustainedAttentionDuration / 2, // Shorter persistence for divided
          priority: score.totalScore,
          timestamp: new Date(),
          decayRate: 0.1 / 60000, // Faster decay for divided attention
          reinforcement: 0
        });
      }
    }

    return targets;
  }

  private allocateSustainedAttention(scores: AttentionScore[], availableCapacity: number, context: AttentionContext): AttentionTarget[] {
    const targets: AttentionTarget[] = [];
    
    // Focus on single highest-scoring node with full available capacity
    if (scores.length > 0) {
      const topScore = scores[0];
      targets.push({
        nodeId: topScore.nodeId,
        modality: this.getDominantModality(topScore.modalityScores),
        strength: Math.min(availableCapacity, 0.8), // Use most of available capacity
        persistence: this.config.sustainedAttentionDuration * 2, // Extended persistence
        priority: 1.0, // Highest priority
        timestamp: new Date(),
        decayRate: 0.01 / 60000, // Very slow decay for sustained attention
        reinforcement: 0
      });
    }

    return targets;
  }

  private allocateExecutiveAttention(scores: AttentionScore[], availableCapacity: number, context: AttentionContext): AttentionTarget[] {
    // Override existing attention if executive threshold is met
    if (scores.length > 0 && scores[0].totalScore > this.config.executiveOverrideThreshold) {
      // Clear existing low-priority targets
      for (const [nodeId, target] of this.targets.entries()) {
        if (target.priority < 0.7) {
          this.targets.delete(nodeId);
        }
      }
    }

    // Allocate like selective but with higher priority
    return this.allocateSelectiveAttention(scores, availableCapacity, context).map(target => ({
      ...target,
      priority: 1.0,
      persistence: this.config.sustainedAttentionDuration * 1.5
    }));
  }

  private applyAttentionDecay(): void {
    const now = new Date();
    const timeDelta = now.getTime() - this.lastDecayUpdate.getTime();

    if (timeDelta < this.config.decayInterval) return; // Not time for decay yet

    // Apply decay to all targets
    for (const [nodeId, target] of this.targets.entries()) {
      const ageMs = now.getTime() - target.timestamp.getTime();
      const decayAmount = target.decayRate * ageMs;
      target.strength = Math.max(0, target.strength - decayAmount);

      // Remove targets below threshold
      if (target.strength < this.config.minAttentionThreshold) {
        this.targets.delete(nodeId);
      }
    }

    this.lastDecayUpdate = now;
  }

  private getCurrentAllocation(): AttentionAllocation {
    let allocated = 0;
    const targets = Array.from(this.targets.values());

    for (const target of targets) {
      allocated += target.strength;
    }

    return {
      totalCapacity: this.config.totalCapacity,
      allocated,
      available: this.config.totalCapacity - allocated,
      targets,
      efficiency: this.calculateAttentionEfficiency()
    };
  }

  private calculateAttentionEfficiency(): number {
    if (this.targets.size === 0) return 0;

    // Calculate allocation directly to avoid circular dependency
    let allocated = 0;
    const targets = Array.from(this.targets.values());
    for (const target of targets) {
      allocated += target.strength;
    }

    const utilizationRate = allocated / this.config.totalCapacity;
    const distributionScore = this.calculateDistributionScore();

    // Efficiency = weighted average of utilization and distribution
    return (utilizationRate * 0.6) + (distributionScore * 0.4);
  }

  private calculateDistributionScore(): number {
    if (this.targets.size === 0) return 0;

    const strengths = Array.from(this.targets.values()).map(t => t.strength);
    const mean = strengths.reduce((sum, s) => sum + s, 0) / strengths.length;
    const variance = strengths.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / strengths.length;
    
    // Lower variance = better distribution (higher score)
    return Math.max(0, 1 - variance);
  }

  private calculateModalityDistribution(): Record<AttentionModality, number> {
    const distribution: Record<AttentionModality, number> = {
      [AttentionModality.SEMANTIC]: 0,
      [AttentionModality.STRUCTURAL]: 0,
      [AttentionModality.TEMPORAL]: 0,
      [AttentionModality.CONTEXTUAL]: 0,
      [AttentionModality.RELATIONAL]: 0
    };

    for (const target of this.targets.values()) {
      distribution[target.modality] += target.strength;
    }

    return distribution;
  }

  private getDominantModality(modalityScores: Record<AttentionModality, number>): AttentionModality {
    return Object.entries(modalityScores).reduce((a, b) => 
      modalityScores[a[0] as AttentionModality] > modalityScores[b[0] as AttentionModality] ? a : b
    )[0] as AttentionModality;
  }

  private inferAttentionModality(actionType: string, queryText?: string): AttentionModality {
    if (actionType === 'query' && queryText) {
      return AttentionModality.SEMANTIC;
    } else if (actionType === 'file_access' || actionType === 'edit') {
      return AttentionModality.STRUCTURAL;
    } else if (actionType === 'error') {
      return AttentionModality.CONTEXTUAL;
    }
    return AttentionModality.SEMANTIC;
  }

  private boostRecentAttention(amount: number, timestamp: Date): void {
    const recentThreshold = 60000; // 1 minute
    
    for (const target of this.targets.values()) {
      const age = timestamp.getTime() - target.timestamp.getTime();
      if (age < recentThreshold) {
        target.strength = Math.min(1.0, target.strength + amount);
      }
    }
  }

  private reduceRecentAttention(amount: number, timestamp: Date): void {
    const recentThreshold = 60000; // 1 minute

    for (const target of this.targets.values()) {
      const age = timestamp.getTime() - target.timestamp.getTime();
      if (age < recentThreshold) {
        target.strength = Math.max(0, target.strength - amount);
      }
    }
  }

  /**
   * Get comprehensive attention system statistics
   */
  getAttentionStats(): {
    totalTargets: number;
    totalCapacity: number;
    allocatedCapacity: number;
    availableCapacity: number;
    efficiency: number;
    modalityDistribution: Record<AttentionModality, number>;
    dominantModality: AttentionModality | null;
    averageStrength: number;
    targetsByType: Record<AttentionType, number>;
    recentActivity: number;
    configurationSummary: AttentionConfiguration;
  } {
    const allocation = this.getCurrentAllocation();
    const modalityDistribution = this.calculateModalityDistribution();
    const dominantModality = this.targets.size > 0 ? this.getDominantModality(modalityDistribution) : null;

    // Calculate average strength
    const totalStrength = Array.from(this.targets.values()).reduce((sum, target) => sum + target.strength, 0);
    const averageStrength = this.targets.size > 0 ? totalStrength / this.targets.size : 0;

    // Count targets by type (approximated based on strength patterns)
    const targetsByType: Record<AttentionType, number> = {
      [AttentionType.SELECTIVE]: 0,
      [AttentionType.DIVIDED]: 0,
      [AttentionType.SUSTAINED]: 0,
      [AttentionType.EXECUTIVE]: 0
    };

    for (const target of this.targets.values()) {
      if (target.strength > 0.7) {
        targetsByType[AttentionType.SELECTIVE]++;
      } else if (target.strength > 0.4) {
        targetsByType[AttentionType.SUSTAINED]++;
      } else if (target.strength > 0.2) {
        targetsByType[AttentionType.DIVIDED]++;
      } else {
        targetsByType[AttentionType.EXECUTIVE]++;
      }
    }

    // Calculate recent activity (targets updated in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentActivity = Array.from(this.targets.values()).filter(
      target => target.timestamp > fiveMinutesAgo
    ).length;

    return {
      totalTargets: this.targets.size,
      totalCapacity: this.config.totalCapacity,
      allocatedCapacity: allocation.allocated,
      availableCapacity: allocation.available,
      efficiency: allocation.efficiency,
      modalityDistribution,
      dominantModality,
      averageStrength,
      targetsByType,
      recentActivity,
      configurationSummary: this.config
    };
  }
}