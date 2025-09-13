/**
 * Hierarchical Context System - Multi-level context awareness for brain-inspired intelligence
 * 
 * Implements hierarchical context understanding based on cognitive science principles:
 * - Immediate context (current task, active files)
 * - Session context (recent activities, workflow patterns)
 * - Project context (architecture, frameworks, conventions)
 * - Domain context (programming paradigms, industry patterns)
 * 
 * Research Foundation:
 * - Hierarchical Temporal Memory (HTM): Multi-level pattern recognition
 * - Contextual Attention Networks: Context-dependent information processing
 * - Cognitive Load Theory: Managing information at different abstraction levels
 * - Working Memory Models: Short-term vs. long-term context management
 */

import { MindMapStorage } from './MindMapStorage.js';
import { MindMapNode } from '../types/index.js';

export enum ContextLevel {
  IMMEDIATE = 1,    // Current task, active files (0-5 minutes)
  SESSION = 2,      // Recent workflow, current session (5-60 minutes)  
  PROJECT = 3,      // Project structure, conventions (hours-days)
  DOMAIN = 4        // Programming paradigms, industry patterns (persistent)
}

export interface ContextItem {
  id: string;
  type: 'file' | 'function' | 'class' | 'task' | 'pattern' | 'framework' | 'paradigm';
  name: string;
  level: ContextLevel;
  relevance: number; // 0.0 to 1.0
  timestamp: Date;
  duration?: number; // How long this context item should remain active (ms)
  metadata: {
    source: string; // Where this context came from
    confidence: number;
    associations: string[]; // Related context items
    weight: number; // Importance weight at this level
    decay_rate: number; // How quickly relevance decreases
  };
}

export interface ContextHierarchy {
  immediate: Map<string, ContextItem>;
  session: Map<string, ContextItem>;
  project: Map<string, ContextItem>;
  domain: Map<string, ContextItem>;
}

export interface ContextQuery {
  text: string;
  level?: ContextLevel;
  includeParents?: boolean; // Include higher-level context
  includeChildren?: boolean; // Include lower-level context
  maxItems?: number;
  minRelevance?: number;
}

export interface ContextScore {
  nodeId: string;
  baseRelevance: number;
  contextBoost: number;
  finalScore: number;
  appliedContexts: Array<{
    level: ContextLevel;
    item: ContextItem;
    boost: number;
  }>;
}

export interface ContextConfiguration {
  immediateDecayRate: number; // How quickly immediate context decays (default: 0.1/min)
  sessionDecayRate: number;   // Session context decay rate (default: 0.01/min)
  projectDecayRate: number;   // Project context decay rate (default: 0.001/hour)
  domainDecayRate: number;    // Domain context decay rate (default: 0.0001/day)
  maxContextItems: {          // Maximum items per level
    immediate: number;
    session: number;
    project: number;
    domain: number;
  };
  relevanceThresholds: {      // Minimum relevance to maintain context
    immediate: number;
    session: number;
    project: number;
    domain: number;
  };
  contextWeights: {           // Relative importance of each level
    immediate: number;
    session: number;
    project: number;
    domain: number;
  };
}

export class HierarchicalContextSystem {
  private storage: MindMapStorage;
  private contexts: ContextHierarchy;
  private config: ContextConfiguration;
  private lastDecayTime: Date;
  private contextHistory: ContextItem[] = [];

  constructor(storage: MindMapStorage, config?: Partial<ContextConfiguration>) {
    this.storage = storage;
    this.config = {
      immediateDecayRate: 0.1 / 60000,    // 0.1 per minute -> per ms
      sessionDecayRate: 0.01 / 60000,     // 0.01 per minute -> per ms
      projectDecayRate: 0.001 / 3600000,  // 0.001 per hour -> per ms
      domainDecayRate: 0.0001 / 86400000, // 0.0001 per day -> per ms
      maxContextItems: {
        immediate: 10,
        session: 50,
        project: 200,
        domain: 1000
      },
      relevanceThresholds: {
        immediate: 0.1,
        session: 0.05,
        project: 0.02,
        domain: 0.01
      },
      contextWeights: {
        immediate: 1.0,
        session: 0.7,
        project: 0.5,
        domain: 0.3
      },
      ...config
    };

    this.contexts = {
      immediate: new Map(),
      session: new Map(),
      project: new Map(),
      domain: new Map()
    };

    this.lastDecayTime = new Date();
    this.startDecayProcess();
    this.initializeDomainContext();
  }

  /**
   * Add context at a specific level
   */
  addContext(
    item: Omit<ContextItem, 'id' | 'timestamp'>,
    propagateUp: boolean = true,
    propagateDown: boolean = false
  ): void {
    const contextItem: ContextItem = {
      ...item,
      id: this.generateContextId(item.type, item.name, item.level),
      timestamp: new Date()
    };

    // Add to appropriate level
    this.addToLevel(contextItem);

    // Store in history for analysis
    this.contextHistory.push(contextItem);
    if (this.contextHistory.length > 1000) {
      this.contextHistory = this.contextHistory.slice(-500); // Keep last 500 items
    }

    // Propagate context up the hierarchy (with reduced relevance)
    if (propagateUp && item.level < ContextLevel.DOMAIN) {
      const parentLevel = (item.level + 1) as ContextLevel;
      const reducedRelevance = item.relevance * 0.7; // Reduce relevance when propagating up
      
      if (reducedRelevance > this.config.relevanceThresholds[this.getLevelName(parentLevel)]) {
        const parentItem: Omit<ContextItem, 'id' | 'timestamp'> = {
          ...item,
          level: parentLevel,
          relevance: reducedRelevance,
          metadata: {
            ...item.metadata,
            source: `propagated_from_${this.getLevelName(item.level)}`,
            weight: item.metadata.weight * 0.8
          }
        };
        this.addContext(parentItem, true, false); // Continue propagating up
      }
    }

    // Propagate context down the hierarchy (with increased specificity)
    if (propagateDown && item.level > ContextLevel.IMMEDIATE) {
      const childLevel = (item.level - 1) as ContextLevel;
      const childItem: Omit<ContextItem, 'id' | 'timestamp'> = {
        ...item,
        level: childLevel,
        relevance: item.relevance * 0.9, // Maintain most relevance when propagating down
        metadata: {
          ...item.metadata,
          source: `propagated_from_${this.getLevelName(item.level)}`,
          weight: item.metadata.weight * 1.1 // Increase weight for more specific context
        }
      };
      this.addToLevel(childItem as ContextItem);
    }
  }

  /**
   * Get context-aware query scores for nodes
   */
  getContextScores(
    nodes: MindMapNode[],
    query: ContextQuery
  ): ContextScore[] {
    const scores: ContextScore[] = [];

    for (const node of nodes) {
      const baseRelevance = this.calculateBaseRelevance(node, query.text);
      let contextBoost = 0;
      const appliedContexts: ContextScore['appliedContexts'] = [];

      // Apply context from requested level
      const targetLevel = query.level || ContextLevel.IMMEDIATE;
      contextBoost += this.calculateContextBoost(node, targetLevel, appliedContexts);

      // Include parent levels if requested
      if (query.includeParents && targetLevel < ContextLevel.DOMAIN) {
        for (let level = targetLevel + 1; level <= ContextLevel.DOMAIN; level++) {
          contextBoost += this.calculateContextBoost(node, level as ContextLevel, appliedContexts) * 0.7;
        }
      }

      // Include child levels if requested
      if (query.includeChildren && targetLevel > ContextLevel.IMMEDIATE) {
        for (let level = ContextLevel.IMMEDIATE; level < targetLevel; level++) {
          contextBoost += this.calculateContextBoost(node, level as ContextLevel, appliedContexts) * 1.2;
        }
      }

      const finalScore = Math.min(1.0, baseRelevance + (contextBoost * this.config.contextWeights[this.getLevelName(targetLevel)]));

      if (finalScore >= (query.minRelevance || 0)) {
        scores.push({
          nodeId: node.id,
          baseRelevance,
          contextBoost,
          finalScore,
          appliedContexts
        });
      }
    }

    // Sort by final score and limit results
    return scores
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, query.maxItems || 50);
  }

  /**
   * Update context based on current activity
   */
  updateFromActivity(activity: {
    type: 'query' | 'file_access' | 'error' | 'success' | 'pattern_recognition';
    data: any;
    files?: string[];
    functions?: string[];
    timestamp?: Date;
  }): void {
    const timestamp = activity.timestamp || new Date();

    // Add immediate context based on activity
    switch (activity.type) {
      case 'query':
        this.addContext({
          type: 'task',
          name: `query_${activity.data.query}`,
          level: ContextLevel.IMMEDIATE,
          relevance: 0.8,
          metadata: {
            source: 'query_activity',
            confidence: 0.9,
            associations: activity.data.results?.map((r: any) => r.id) || [],
            weight: 1.0,
            decay_rate: this.config.immediateDecayRate
          }
        });
        break;

      case 'file_access':
        if (activity.files) {
          activity.files.forEach(filePath => {
            this.addContext({
              type: 'file',
              name: filePath,
              level: ContextLevel.IMMEDIATE,
              relevance: 0.9,
              duration: 300000, // 5 minutes
              metadata: {
                source: 'file_access',
                confidence: 0.95,
                associations: activity.functions || [],
                weight: 1.2,
                decay_rate: this.config.immediateDecayRate
              }
            });
          });
        }
        break;

      case 'error':
        this.addContext({
          type: 'pattern',
          name: `error_${activity.data.type}`,
          level: ContextLevel.SESSION,
          relevance: 0.7,
          duration: 1800000, // 30 minutes
          metadata: {
            source: 'error_handling',
            confidence: 0.8,
            associations: activity.files || [],
            weight: 0.9,
            decay_rate: this.config.sessionDecayRate
          }
        });
        break;

      case 'success':
        this.addContext({
          type: 'pattern',
          name: `success_${activity.data.approach}`,
          level: ContextLevel.PROJECT,
          relevance: 0.6,
          duration: 3600000, // 1 hour
          metadata: {
            source: 'successful_completion',
            confidence: 0.85,
            associations: activity.files || [],
            weight: 1.1,
            decay_rate: this.config.projectDecayRate
          }
        });
        break;

      case 'pattern_recognition':
        this.addContext({
          type: 'framework',
          name: activity.data.pattern_name,
          level: ContextLevel.PROJECT,
          relevance: 0.5,
          metadata: {
            source: 'pattern_detection',
            confidence: activity.data.confidence || 0.7,
            associations: activity.data.related_files || [],
            weight: 0.8,
            decay_rate: this.config.projectDecayRate
          }
        });
        break;
    }
  }

  /**
   * Get current context summary
   */
  getContextSummary(): {
    immediate: ContextItem[];
    session: ContextItem[];
    project: ContextItem[];
    domain: ContextItem[];
    totalItems: number;
    mostRelevant: ContextItem[];
  } {
    const immediate = Array.from(this.contexts.immediate.values())
      .sort((a, b) => b.relevance - a.relevance);
    const session = Array.from(this.contexts.session.values())
      .sort((a, b) => b.relevance - a.relevance);
    const project = Array.from(this.contexts.project.values())
      .sort((a, b) => b.relevance - a.relevance);
    const domain = Array.from(this.contexts.domain.values())
      .sort((a, b) => b.relevance - a.relevance);

    const allItems = [...immediate, ...session, ...project, ...domain];
    const mostRelevant = allItems
      .sort((a, b) => b.relevance * this.config.contextWeights[this.getLevelName(a.level)] - 
                     a.relevance * this.config.contextWeights[this.getLevelName(b.level)])
      .slice(0, 10);

    return {
      immediate,
      session,
      project,
      domain,
      totalItems: allItems.length,
      mostRelevant
    };
  }

  /**
   * Get context statistics for monitoring
   */
  getContextStatistics(): {
    levelCounts: Record<string, number>;
    averageRelevance: Record<string, number>;
    totalDecayEvents: number;
    contextTurnover: number; // How quickly context changes
    hierarchicalBalance: number; // How well balanced the hierarchy is
    recentActivityRate: number; // Context additions per minute
    topContexts: Array<{ name: string; level: string; relevance: number }>;
  } {
    const levels = ['immediate', 'session', 'project', 'domain'] as const;
    const levelCounts: Record<string, number> = {};
    const averageRelevance: Record<string, number> = {};

    levels.forEach(level => {
      const items = Array.from(this.contexts[level].values());
      levelCounts[level] = items.length;
      averageRelevance[level] = items.length > 0 ? 
        items.reduce((sum, item) => sum + item.relevance, 0) / items.length : 0;
    });

    // Calculate context turnover (changes in last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 600000);
    const recentItems = this.contextHistory.filter(item => item.timestamp > tenMinutesAgo);
    const contextTurnover = recentItems.length / 10; // per minute

    // Calculate hierarchical balance (how evenly distributed across levels)
    const totalItems = Object.values(levelCounts).reduce((sum, count) => sum + count, 0);
    const expectedPerLevel = totalItems / 4;
    const balance = totalItems > 0 ? 1 - (Object.values(levelCounts)
      .reduce((sum, count) => sum + Math.abs(count - expectedPerLevel), 0) / (totalItems * 2)) : 1;

    // Get top contexts across all levels
    const allItems = levels.flatMap(level => Array.from(this.contexts[level].values()));
    const topContexts = allItems
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5)
      .map(item => ({
        name: item.name,
        level: this.getLevelName(item.level),
        relevance: Math.round(item.relevance * 1000) / 1000
      }));

    return {
      levelCounts,
      averageRelevance,
      totalDecayEvents: 0, // Would track this in a real implementation
      contextTurnover: Math.round(contextTurnover * 100) / 100,
      hierarchicalBalance: Math.round(balance * 100) / 100,
      recentActivityRate: contextTurnover,
      topContexts
    };
  }

  /**
   * Clear context at a specific level or all levels
   */
  clearContext(level?: ContextLevel): void {
    if (level) {
      const levelName = this.getLevelName(level);
      this.contexts[levelName].clear();
    } else {
      Object.values(this.contexts).forEach(contextMap => contextMap.clear());
      this.contextHistory = [];
    }
  }

  // Private helper methods

  private addToLevel(item: ContextItem): void {
    const levelName = this.getLevelName(item.level);
    const contextMap = this.contexts[levelName];
    
    // Add the item
    contextMap.set(item.id, item);

    // Enforce maximum items per level
    const maxItems = this.config.maxContextItems[levelName];
    if (contextMap.size > maxItems) {
      // Remove least relevant items
      const items = Array.from(contextMap.values())
        .sort((a, b) => a.relevance - b.relevance);
      
      const itemsToRemove = items.slice(0, contextMap.size - maxItems);
      itemsToRemove.forEach(itemToRemove => {
        contextMap.delete(itemToRemove.id);
      });
    }
  }

  private calculateBaseRelevance(node: MindMapNode, query: string): number {
    // Simple text matching for base relevance
    const queryLower = query.toLowerCase();
    const nodeName = node.name.toLowerCase();
    const nodePath = (node.path || '').toLowerCase();
    
    let relevance = 0;
    
    // Exact name match
    if (nodeName === queryLower) relevance += 0.9;
    else if (nodeName.includes(queryLower)) relevance += 0.7;
    else if (queryLower.includes(nodeName)) relevance += 0.6;
    
    // Path matching
    if (nodePath.includes(queryLower)) relevance += 0.3;
    
    // Confidence boost
    relevance += node.confidence * 0.1;
    
    return Math.min(1.0, relevance);
  }

  private calculateContextBoost(
    node: MindMapNode, 
    level: ContextLevel, 
    appliedContexts: ContextScore['appliedContexts']
  ): number {
    const levelName = this.getLevelName(level);
    const contextItems = Array.from(this.contexts[levelName].values());
    let boost = 0;

    for (const contextItem of contextItems) {
      let itemBoost = 0;

      // Check if node matches context item
      if (contextItem.type === 'file' && (node.path === contextItem.name || node.path?.includes(contextItem.name))) {
        itemBoost = contextItem.relevance * 0.8;
      } else if (contextItem.type === node.type && node.name === contextItem.name) {
        itemBoost = contextItem.relevance * 0.9;
      } else if (contextItem.metadata.associations.includes(node.id)) {
        itemBoost = contextItem.relevance * 0.6;
      } else if (node.name.toLowerCase().includes(contextItem.name.toLowerCase())) {
        itemBoost = contextItem.relevance * 0.4;
      }

      if (itemBoost > 0) {
        boost += itemBoost * contextItem.metadata.weight;
        appliedContexts.push({
          level,
          item: contextItem,
          boost: itemBoost
        });
      }
    }

    return Math.min(1.0, boost);
  }

  private getLevelName(level: ContextLevel): keyof ContextHierarchy {
    switch (level) {
      case ContextLevel.IMMEDIATE: return 'immediate';
      case ContextLevel.SESSION: return 'session';
      case ContextLevel.PROJECT: return 'project';
      case ContextLevel.DOMAIN: return 'domain';
    }
  }

  private generateContextId(type: string, name: string, level: ContextLevel): string {
    return `${type}_${level}_${name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
  }

  private initializeDomainContext(): void {
    // Initialize with common programming domain knowledge
    const domainContexts = [
      { type: 'paradigm', name: 'object_oriented_programming', relevance: 0.6 },
      { type: 'paradigm', name: 'functional_programming', relevance: 0.5 },
      { type: 'paradigm', name: 'async_programming', relevance: 0.7 },
      { type: 'pattern', name: 'mvc_architecture', relevance: 0.4 },
      { type: 'pattern', name: 'dependency_injection', relevance: 0.5 },
      { type: 'framework', name: 'typescript_ecosystem', relevance: 0.8 },
      { type: 'framework', name: 'node_js_runtime', relevance: 0.7 }
    ];

    domainContexts.forEach(ctx => {
      this.addContext({
        type: ctx.type as ContextItem['type'],
        name: ctx.name,
        level: ContextLevel.DOMAIN,
        relevance: ctx.relevance,
        metadata: {
          source: 'domain_initialization',
          confidence: 0.8,
          associations: [],
          weight: 0.5,
          decay_rate: this.config.domainDecayRate
        }
      }, false, false);
    });
  }

  private applyDecay(): void {
    const now = new Date();
    const timeSinceLastDecay = now.getTime() - this.lastDecayTime.getTime();
    
    // Apply decay to all context levels
    (['immediate', 'session', 'project', 'domain'] as const).forEach(levelName => {
      const contextMap = this.contexts[levelName];
      const itemsToRemove: string[] = [];

      for (const [id, item] of contextMap) {
        // Calculate time-based decay
        const timeSinceCreation = now.getTime() - item.timestamp.getTime();
        const decayAmount = item.metadata.decay_rate * timeSinceCreation;
        
        // Apply duration-based expiry
        let expired = false;
        if (item.duration && timeSinceCreation > item.duration) {
          expired = true;
        }

        // Update relevance
        item.relevance = Math.max(0, item.relevance - decayAmount);

        // Remove if below threshold or expired
        if (item.relevance < this.config.relevanceThresholds[levelName] || expired) {
          itemsToRemove.push(id);
        }
      }

      // Remove expired items
      itemsToRemove.forEach(id => contextMap.delete(id));
    });

    this.lastDecayTime = now;
  }

  private startDecayProcess(): void {
    // Apply decay every 30 seconds
    setInterval(() => {
      this.applyDecay();
    }, 30000);
  }
}