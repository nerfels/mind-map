import { MindMapStorage } from './MindMapStorage.js';
import { InhibitoryPattern, FailureSignature, InhibitionResult, InhibitoryLearningConfig, TaskOutcome, MindMapNode } from '../types/index.js';
import * as crypto from 'crypto';

/**
 * Inhibitory Learning System - Brain-inspired negative learning
 * Prevents suggesting solutions that have historically failed
 * Based on research: "Human brain creates inhibitory connections to avoid failed patterns"
 */
export class InhibitoryLearningSystem {
  private storage: MindMapStorage;
  private patterns = new Map<string, InhibitoryPattern>();
  private config: InhibitoryLearningConfig;
  private decayTimer?: NodeJS.Timeout;

  constructor(storage: MindMapStorage, config?: Partial<InhibitoryLearningConfig>) {
    this.storage = storage;
    this.config = {
      maxPatterns: 1000,
      strengthThreshold: 0.1,
      decayInterval: 60 * 60 * 1000, // 1 hour
      reinforcementMultiplier: 1.5,
      contextSimilarityThreshold: 0.7,
      ...config
    };

    // Start periodic decay process
    this.startDecayProcess();
  }

  /**
   * Learn from task failure - create inhibitory patterns
   */
  async learnFromFailure(
    taskDescription: string,
    errorDetails: any,
    involvedFiles: string[],
    context: string = ''
  ): Promise<InhibitoryPattern | null> {
    try {
      // Extract failure signature
      const signature = this.extractFailureSignature(taskDescription, errorDetails, involvedFiles, context);
      
      // Check for existing similar patterns
      const existingPattern = await this.findSimilarPattern(signature);
      
      if (existingPattern) {
        // Reinforce existing pattern
        return this.reinforcePattern(existingPattern.id);
      } else {
        // Create new inhibitory pattern
        return this.createInhibitoryPattern(signature, taskDescription);
      }
    } catch (error) {
      console.error('Failed to learn from failure:', error);
      return null;
    }
  }

  /**
   * Apply inhibitory patterns to query results
   */
  async applyInhibition(
    results: MindMapNode[],
    query: string,
    context: string = ''
  ): Promise<InhibitionResult> {
    const originalResults = [...results];
    let inhibitedResults = [...results];
    const appliedPatterns: InhibitoryPattern[] = [];
    let totalInhibition = 0;

    // Find applicable patterns
    const applicablePatterns = await this.findApplicablePatterns(query, context);
    
    for (const pattern of applicablePatterns) {
      if (pattern.strength >= this.config.strengthThreshold) {
        // Apply inhibition
        const beforeLength = inhibitedResults.length;
        inhibitedResults = this.inhibitNodes(inhibitedResults, pattern);
        
        if (inhibitedResults.length < beforeLength) {
          appliedPatterns.push(pattern);
          totalInhibition += pattern.strength;
        }
      }
    }

    const inhibitionScore = Math.min(1, totalInhibition / applicablePatterns.length);

    console.log(
      `🧠 Inhibitory learning applied: ${appliedPatterns.length} patterns, ` +
      `${originalResults.length - inhibitedResults.length} results inhibited (${Math.round(inhibitionScore * 100)}%)`
    );

    return {
      originalResults,
      inhibitedResults,
      appliedPatterns,
      inhibitionScore
    };
  }

  /**
   * Extract failure signature from error details
   */
  private extractFailureSignature(
    taskDescription: string,
    errorDetails: any,
    involvedFiles: string[],
    context: string
  ): FailureSignature {
    const errorMessage = errorDetails?.error_message || errorDetails?.message || String(errorDetails);
    const errorType = errorDetails?.error_type || this.classifyErrorType(errorMessage);
    
    // Extract key failure conditions
    const failureConditions = this.extractFailureConditions(taskDescription, errorMessage);
    
    // Extract keywords from error and context
    const extractedKeywords = this.extractKeywords(taskDescription, errorMessage, context);
    
    // Create context hash
    const contextHash = crypto.createHash('md5')
      .update(`${taskDescription}:${errorType}:${context}`)
      .digest('hex')
      .substring(0, 16);

    return {
      errorType,
      errorMessage,
      contextHash,
      involvedFiles,
      failureConditions,
      extractedKeywords
    };
  }

  /**
   * Classify error type from error message
   */
  private classifyErrorType(errorMessage: string): string {
    const msg = errorMessage.toLowerCase();
    
    if (msg.includes('type') && (msg.includes('property') || msg.includes('does not exist'))) {
      return 'type_error';
    }
    if (msg.includes('cannot resolve') || msg.includes('module') || msg.includes('import')) {
      return 'import_error';
    }
    if (msg.includes('syntax') || msg.includes('unexpected')) {
      return 'syntax_error';
    }
    if (msg.includes('permission') || msg.includes('access')) {
      return 'permission_error';
    }
    if (msg.includes('timeout') || msg.includes('network')) {
      return 'network_error';
    }
    if (msg.includes('build') || msg.includes('compile')) {
      return 'build_error';
    }
    
    return 'unknown_error';
  }

  /**
   * Extract failure conditions from task and error
   */
  private extractFailureConditions(taskDescription: string, errorMessage: string): string[] {
    const conditions: string[] = [];
    
    // Common failure patterns
    const patterns = [
      /Property '(\w+)' does not exist/g,
      /Cannot resolve module '([^']+)'/g,
      /Module '([^']+)' not found/g,
      /Unexpected token (\w+)/g,
      /(\w+) is not defined/g,
      /Failed to (\w+)/g
    ];

    for (const pattern of patterns) {
      const matches = errorMessage.matchAll(pattern);
      for (const match of matches) {
        conditions.push(match[1] || match[0]);
      }
    }

    // Add task-based conditions
    if (taskDescription.includes('implement')) conditions.push('implementation_task');
    if (taskDescription.includes('fix')) conditions.push('fix_task');
    if (taskDescription.includes('refactor')) conditions.push('refactor_task');
    if (taskDescription.includes('test')) conditions.push('test_task');

    return [...new Set(conditions)];
  }

  /**
   * Extract keywords for pattern matching
   */
  private extractKeywords(taskDescription: string, errorMessage: string, context: string): string[] {
    const text = `${taskDescription} ${errorMessage} ${context}`.toLowerCase();
    
    // Extract meaningful words (excluding common stopwords)
    const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const words = text.match(/\b\w{3,}\b/g) || [];
    
    return [...new Set(words.filter(word => !stopwords.has(word)))];
  }

  /**
   * Find similar existing pattern
   */
  private async findSimilarPattern(signature: FailureSignature): Promise<InhibitoryPattern | null> {
    for (const pattern of this.patterns.values()) {
      // Check context similarity
      if (this.calculateSimilarity(pattern.context, signature.contextHash) >= this.config.contextSimilarityThreshold) {
        return pattern;
      }
      
      // Check trigger conditions overlap
      const overlap = pattern.triggerConditions.filter(condition => 
        signature.failureConditions.includes(condition)
      ).length;
      
      if (overlap > 0 && overlap / Math.max(pattern.triggerConditions.length, signature.failureConditions.length) >= 0.5) {
        return pattern;
      }
    }
    
    return null;
  }

  /**
   * Calculate similarity between contexts
   */
  private calculateSimilarity(context1: string, context2: string): number {
    if (context1 === context2) return 1.0;
    
    // Simple Jaccard similarity for contexts
    const set1 = new Set(context1.split(''));
    const set2 = new Set(context2.split(''));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Create new inhibitory pattern
   */
  private async createInhibitoryPattern(
    signature: FailureSignature,
    taskDescription: string
  ): Promise<InhibitoryPattern> {
    // Generate pattern ID
    const patternId = crypto.createHash('md5')
      .update(`${Date.now()}-${signature.contextHash}-${Math.random()}`)
      .digest('hex')
      .substring(0, 12);

    // Find nodes that should be inhibited based on the failure
    const inhibitedNodes = await this.identifyNodesToInhibit(signature);
    
    const pattern: InhibitoryPattern = {
      id: patternId,
      triggerConditions: signature.failureConditions,
      inhibitedNodes,
      strength: 0.8, // Start with strong inhibition
      basedOnFailures: [], // Will be populated when used with actual TaskOutcome
      created: new Date(),
      lastReinforced: new Date(),
      reinforcementCount: 1,
      decayRate: 0.05, // 5% decay per interval
      context: signature.contextHash
    };

    // Store pattern
    this.patterns.set(patternId, pattern);
    
    // Cleanup old patterns if we have too many
    await this.cleanupOldPatterns();
    
    console.log(`🧠 Created inhibitory pattern: ${patternId} (${pattern.triggerConditions.length} conditions, ${pattern.inhibitedNodes.length} inhibited nodes)`);
    
    return pattern;
  }

  /**
   * Identify nodes that should be inhibited
   */
  private async identifyNodesToInhibit(signature: FailureSignature): Promise<string[]> {
    const inhibitedNodes: string[] = [];
    
    // Get nodes related to the failed files
    for (const filePath of signature.involvedFiles) {
      const nodes = this.storage.findNodes(node => 
        node.path === filePath || 
        node.path?.includes(filePath) ||
        node.name?.includes(filePath)
      );
      
      for (const node of nodes) {
        inhibitedNodes.push(node.id);
      }
    }
    
    // Add nodes matching failure conditions
    for (const condition of signature.failureConditions) {
      const nodes = this.storage.findNodes(node => 
        node.name?.toLowerCase().includes(condition.toLowerCase()) ||
        (node.metadata && typeof node.metadata === 'object' && 
         Object.values(node.metadata).some(value => 
           String(value).toLowerCase().includes(condition.toLowerCase())
         ))
      );
      
      for (const node of nodes.slice(0, 3)) { // Limit to avoid over-inhibition
        inhibitedNodes.push(node.id);
      }
    }
    
    return [...new Set(inhibitedNodes)];
  }

  /**
   * Reinforce existing pattern
   */
  private reinforcePattern(patternId: string): InhibitoryPattern {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      throw new Error(`Pattern ${patternId} not found`);
    }

    pattern.strength = Math.min(1.0, pattern.strength * this.config.reinforcementMultiplier);
    pattern.lastReinforced = new Date();
    pattern.reinforcementCount++;

    console.log(`🧠 Reinforced inhibitory pattern: ${patternId} (strength: ${pattern.strength.toFixed(2)})`);

    return pattern;
  }

  /**
   * Find patterns applicable to current query and context
   */
  private async findApplicablePatterns(query: string, context: string): Promise<InhibitoryPattern[]> {
    const applicable: InhibitoryPattern[] = [];
    const queryLower = query.toLowerCase();
    
    for (const pattern of this.patterns.values()) {
      // Check if any trigger conditions match the query
      const hasMatchingCondition = pattern.triggerConditions.some(condition =>
        queryLower.includes(condition.toLowerCase()) ||
        condition.toLowerCase().includes(queryLower)
      );
      
      if (hasMatchingCondition) {
        applicable.push(pattern);
      }
    }
    
    return applicable.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Inhibit nodes based on pattern
   */
  private inhibitNodes(results: MindMapNode[], pattern: InhibitoryPattern): MindMapNode[] {
    return results.filter(node => {
      const shouldInhibit = pattern.inhibitedNodes.includes(node.id);
      return !shouldInhibit;
    });
  }

  /**
   * Start decay process for patterns
   */
  private startDecayProcess(): void {
    this.decayTimer = setInterval(() => {
      this.applyDecay();
    }, this.config.decayInterval);
  }

  /**
   * Apply time-based decay to all patterns
   */
  private applyDecay(): void {
    let decayedCount = 0;
    
    for (const [patternId, pattern] of this.patterns.entries()) {
      const newStrength = Math.max(0, pattern.strength - pattern.decayRate);
      
      if (newStrength !== pattern.strength) {
        pattern.strength = newStrength;
        decayedCount++;
      }
      
      // Remove patterns that have decayed to near zero
      if (pattern.strength < 0.01) {
        this.patterns.delete(patternId);
      }
    }
    
    if (decayedCount > 0) {
      console.log(`🧠 Applied decay to ${decayedCount} inhibitory patterns`);
    }
  }

  /**
   * Cleanup old patterns to stay within limits
   */
  private async cleanupOldPatterns(): Promise<void> {
    if (this.patterns.size <= this.config.maxPatterns) return;
    
    // Sort by strength and recency, keep the strongest and most recent
    const sortedPatterns = Array.from(this.patterns.entries())
      .sort((a, b) => {
        const scoreA = a[1].strength + (Date.now() - a[1].lastReinforced.getTime()) / (1000 * 60 * 60 * 24); // Days since reinforced
        const scoreB = b[1].strength + (Date.now() - b[1].lastReinforced.getTime()) / (1000 * 60 * 60 * 24);
        return scoreB - scoreA;
      });
    
    // Remove oldest/weakest patterns
    const toRemove = sortedPatterns.slice(this.config.maxPatterns);
    for (const [patternId] of toRemove) {
      this.patterns.delete(patternId);
    }
    
    if (toRemove.length > 0) {
      console.log(`🧠 Cleaned up ${toRemove.length} old inhibitory patterns`);
    }
  }

  /**
   * Get statistics about inhibitory patterns
   */
  getStats(): {
    totalPatterns: number;
    averageStrength: number;
    strongPatterns: number;
    weakPatterns: number;
    recentlyReinforced: number;
  } {
    const patterns = Array.from(this.patterns.values());
    const totalPatterns = patterns.length;
    
    if (totalPatterns === 0) {
      return {
        totalPatterns: 0,
        averageStrength: 0,
        strongPatterns: 0,
        weakPatterns: 0,
        recentlyReinforced: 0
      };
    }
    
    const averageStrength = patterns.reduce((sum, p) => sum + p.strength, 0) / totalPatterns;
    const strongPatterns = patterns.filter(p => p.strength > 0.7).length;
    const weakPatterns = patterns.filter(p => p.strength < 0.3).length;
    
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentlyReinforced = patterns.filter(p => p.lastReinforced.getTime() > dayAgo).length;
    
    return {
      totalPatterns,
      averageStrength,
      strongPatterns,
      weakPatterns,
      recentlyReinforced
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.decayTimer) {
      clearInterval(this.decayTimer);
      this.decayTimer = undefined;
    }
  }
}