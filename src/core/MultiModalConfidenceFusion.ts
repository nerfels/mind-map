/**
 * Multi-Modal Confidence Fusion System
 *
 * Combines multiple confidence signals for enhanced decision making:
 * - Semantic confidence (text similarity, relevance)
 * - Structural confidence (code structure, patterns)
 * - Historical confidence (past success rates)
 * - Temporal confidence (recency, stability)
 * - Contextual confidence (project context, user goals)
 * - Collaborative confidence (community patterns, best practices)
 *
 * Research Foundation:
 * - Multi-modal fusion in neural networks
 * - Uncertainty quantification in ML systems
 * - Confidence calibration and reliability
 * - Bayesian inference for combining evidence
 */

import { MindMapNode, MindMapEdge } from '../types/index.js';

export interface MultiModalConfidence {
  semantic: number;      // Text/semantic similarity confidence (0.0-1.0)
  structural: number;    // Code structure pattern confidence (0.0-1.0)
  historical: number;    // Historical success rate confidence (0.0-1.0)
  temporal: number;      // Time-based reliability confidence (0.0-1.0)
  contextual: number;    // Context relevance confidence (0.0-1.0)
  collaborative: number; // Community/collaborative confidence (0.0-1.0)
}

export interface ConfidenceEvidence {
  source: 'semantic' | 'structural' | 'historical' | 'temporal' | 'contextual' | 'collaborative';
  value: number;
  weight: number;
  uncertainty: number;   // Uncertainty in this evidence (0.0-1.0)
  metadata: Record<string, any>;
}

export interface FusedConfidence {
  finalConfidence: number;        // Combined confidence score (0.0-1.0)
  confidence: MultiModalConfidence; // Individual modal confidences
  uncertainty: number;            // Overall uncertainty (0.0-1.0)
  reliability: number;           // Reliability of fusion (0.0-1.0)
  conflictScore: number;         // Conflict between modalities (0.0-1.0)
  dominantModality: keyof MultiModalConfidence; // Which modality dominates
  explanation: string;           // Human-readable explanation
}

export interface ConfidenceCalibration {
  expectedAccuracy: number;      // Expected accuracy for this confidence level
  calibrationError: number;      // How well-calibrated the confidence is
  sampleSize: number;           // Number of samples for this calibration
  lastUpdated: Date;            // When calibration was last updated
}

export interface FusionConfiguration {
  // Base weights for each modality (sum should be ~1.0)
  modalityWeights: {
    semantic: number;
    structural: number;
    historical: number;
    temporal: number;
    contextual: number;
    collaborative: number;
  };

  // Uncertainty handling
  uncertaintyDiscount: number;    // How much to discount uncertain evidence (0.0-1.0)
  conflictThreshold: number;      // Threshold for detecting conflicts (0.0-1.0)
  minReliabilityThreshold: number; // Minimum reliability to trust fusion

  // Adaptive weighting
  adaptiveWeighting: boolean;     // Enable adaptive weight adjustment
  learningRate: number;          // How fast to adapt weights (0.0-1.0)

  // Calibration
  enableCalibration: boolean;     // Enable confidence calibration
  calibrationBuckets: number;     // Number of calibration buckets
  minSamplesForCalibration: number; // Minimum samples before calibrating
}

export class MultiModalConfidenceFusion {
  private config: FusionConfiguration;
  private calibrationData: Map<number, ConfidenceCalibration> = new Map();
  private modalityReliability: Map<string, number> = new Map();
  private fusionHistory: Array<{
    evidence: ConfidenceEvidence[];
    result: FusedConfidence;
    actualOutcome?: boolean;
    timestamp: Date;
  }> = [];

  constructor(config?: Partial<FusionConfiguration>) {
    this.config = {
      modalityWeights: {
        semantic: 0.25,      // Strong weight for semantic similarity
        structural: 0.20,    // Code structure patterns
        historical: 0.20,    // Past performance data
        temporal: 0.15,      // Recency and stability
        contextual: 0.15,    // Project/user context
        collaborative: 0.05  // Community patterns (lower weight initially)
      },
      uncertaintyDiscount: 0.3,         // 30% discount for uncertain evidence
      conflictThreshold: 0.4,           // Detect conflicts above 40% disagreement
      minReliabilityThreshold: 0.6,     // Need 60% reliability to trust
      adaptiveWeighting: true,          // Enable learning
      learningRate: 0.05,              // 5% learning rate
      enableCalibration: true,          // Enable calibration
      calibrationBuckets: 10,           // 10 confidence buckets
      minSamplesForCalibration: 20,     // Need 20 samples to calibrate
      ...config
    };

    this.initializeReliabilityMetrics();
  }

  /**
   * Fuse multiple confidence signals into a single confidence score
   */
  fuseConfidence(evidence: ConfidenceEvidence[]): FusedConfidence {
    // Extract modal confidences
    const modalConfidences = this.extractModalConfidences(evidence);

    // Detect conflicts between modalities
    const conflictScore = this.detectConflicts(evidence);

    // Calculate adaptive weights based on historical performance
    const adaptiveWeights = this.calculateAdaptiveWeights(evidence);

    // Apply uncertainty discounting
    const discountedEvidence = this.applyUncertaintyDiscounting(evidence);

    // Perform weighted fusion with conflict resolution
    const fusedScore = this.performWeightedFusion(discountedEvidence, adaptiveWeights);

    // Calculate overall uncertainty and reliability
    const uncertainty = this.calculateOverallUncertainty(evidence, conflictScore);
    const reliability = this.calculateReliability(evidence, conflictScore, uncertainty);

    // Determine dominant modality
    const dominantModality = this.findDominantModality(evidence, adaptiveWeights);

    // Apply confidence calibration if enabled
    const calibratedConfidence = this.applyCalibration(fusedScore);

    // Generate human-readable explanation
    const explanation = this.generateExplanation(
      modalConfidences,
      conflictScore,
      dominantModality,
      reliability
    );

    const result: FusedConfidence = {
      finalConfidence: calibratedConfidence,
      confidence: modalConfidences,
      uncertainty,
      reliability,
      conflictScore,
      dominantModality,
      explanation
    };

    // Store for learning and calibration
    this.fusionHistory.push({
      evidence,
      result,
      timestamp: new Date()
    });

    return result;
  }

  /**
   * Extract individual modal confidences from evidence
   */
  private extractModalConfidences(evidence: ConfidenceEvidence[]): MultiModalConfidence {
    const confidences: MultiModalConfidence = {
      semantic: 0,
      structural: 0,
      historical: 0,
      temporal: 0,
      contextual: 0,
      collaborative: 0
    };

    // Aggregate evidence by modality
    const modalityGroups = new Map<string, ConfidenceEvidence[]>();
    for (const e of evidence) {
      if (!modalityGroups.has(e.source)) {
        modalityGroups.set(e.source, []);
      }
      modalityGroups.get(e.source)!.push(e);
    }

    // Calculate weighted average for each modality
    for (const [modality, modalEvidence] of modalityGroups) {
      if (modality in confidences) {
        const totalWeight = modalEvidence.reduce((sum, e) => sum + e.weight, 0);
        const weightedSum = modalEvidence.reduce((sum, e) => sum + (e.value * e.weight), 0);
        confidences[modality as keyof MultiModalConfidence] =
          totalWeight > 0 ? weightedSum / totalWeight : 0;
      }
    }

    return confidences;
  }

  /**
   * Detect conflicts between different modalities
   */
  private detectConflicts(evidence: ConfidenceEvidence[]): number {
    if (evidence.length < 2) return 0;

    const values = evidence.map(e => e.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Normalize conflict score (0 = no conflict, 1 = maximum conflict)
    return Math.min(stdDev * 2, 1.0);
  }

  /**
   * Calculate adaptive weights based on historical performance
   */
  private calculateAdaptiveWeights(evidence: ConfidenceEvidence[]): Record<string, number> {
    if (!this.config.adaptiveWeighting) {
      return { ...this.config.modalityWeights } as Record<string, number>;
    }

    const weights: Record<string, number> = { ...this.config.modalityWeights } as Record<string, number>;

    // Adjust weights based on modality reliability
    for (const e of evidence) {
      const reliability = this.modalityReliability.get(e.source) || 0.5;
      const adjustment = (reliability - 0.5) * this.config.learningRate;
      weights[e.source] = Math.max(0.01, Math.min(0.8, weights[e.source] + adjustment));
    }

    // Normalize weights to sum to 1.0
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    for (const key in weights) {
      weights[key] /= totalWeight;
    }

    return weights;
  }

  /**
   * Apply uncertainty discounting to evidence
   */
  private applyUncertaintyDiscounting(evidence: ConfidenceEvidence[]): ConfidenceEvidence[] {
    return evidence.map(e => ({
      ...e,
      value: e.value * (1 - (e.uncertainty * this.config.uncertaintyDiscount))
    }));
  }

  /**
   * Perform weighted fusion of evidence
   */
  private performWeightedFusion(
    evidence: ConfidenceEvidence[],
    weights: Record<string, number>
  ): number {
    let totalWeightedValue = 0;
    let totalWeight = 0;

    for (const e of evidence) {
      const modalityWeight = weights[e.source] || 0;
      const effectiveWeight = e.weight * modalityWeight;
      totalWeightedValue += e.value * effectiveWeight;
      totalWeight += effectiveWeight;
    }

    return totalWeight > 0 ? totalWeightedValue / totalWeight : 0;
  }

  /**
   * Calculate overall uncertainty in the fusion
   */
  private calculateOverallUncertainty(
    evidence: ConfidenceEvidence[],
    conflictScore: number
  ): number {
    // Base uncertainty from individual evidence uncertainty
    const avgUncertainty = evidence.reduce((sum, e) => sum + e.uncertainty, 0) / evidence.length;

    // Additional uncertainty from conflicts
    const conflictUncertainty = conflictScore * 0.3;

    // Evidence quantity factor (more evidence = less uncertainty)
    const quantityFactor = Math.exp(-evidence.length / 5); // Decreases with more evidence

    return Math.min(avgUncertainty + conflictUncertainty + (quantityFactor * 0.2), 1.0);
  }

  /**
   * Calculate reliability of the fusion result
   */
  private calculateReliability(
    evidence: ConfidenceEvidence[],
    conflictScore: number,
    uncertainty: number
  ): number {
    // Base reliability from evidence quality
    const avgWeight = evidence.reduce((sum, e) => sum + e.weight, 0) / evidence.length;
    const baseReliability = avgWeight;

    // Penalties for conflicts and uncertainty
    const conflictPenalty = conflictScore * 0.4;
    const uncertaintyPenalty = uncertainty * 0.3;

    // Bonus for evidence quantity
    const quantityBonus = Math.min(evidence.length / 10, 0.2);

    return Math.max(0, Math.min(1.0,
      baseReliability - conflictPenalty - uncertaintyPenalty + quantityBonus
    ));
  }

  /**
   * Find the dominant modality (highest weighted contribution)
   */
  private findDominantModality(
    evidence: ConfidenceEvidence[],
    weights: Record<string, number>
  ): keyof MultiModalConfidence {
    const modalityContributions = new Map<string, number>();

    for (const e of evidence) {
      const contribution = e.value * e.weight * (weights[e.source] || 0);
      modalityContributions.set(e.source,
        (modalityContributions.get(e.source) || 0) + contribution);
    }

    let maxContribution = 0;
    let dominantModality = 'semantic';

    for (const [modality, contribution] of modalityContributions) {
      if (contribution > maxContribution) {
        maxContribution = contribution;
        dominantModality = modality;
      }
    }

    return dominantModality as keyof MultiModalConfidence;
  }

  /**
   * Apply confidence calibration to improve accuracy
   */
  private applyCalibration(confidence: number): number {
    if (!this.config.enableCalibration) {
      return confidence;
    }

    const bucket = Math.floor(confidence * this.config.calibrationBuckets);
    const calibration = this.calibrationData.get(bucket);

    if (calibration && calibration.sampleSize >= this.config.minSamplesForCalibration) {
      // Apply calibration adjustment
      return calibration.expectedAccuracy;
    }

    return confidence; // No calibration available
  }

  /**
   * Generate human-readable explanation of the fusion
   */
  private generateExplanation(
    confidences: MultiModalConfidence,
    conflictScore: number,
    dominantModality: keyof MultiModalConfidence,
    reliability: number
  ): string {
    const parts: string[] = [];

    // Dominant modality
    parts.push(`Primary evidence: ${dominantModality} (${(confidences[dominantModality] * 100).toFixed(1)}%)`);

    // Supporting modalities
    const supportingModalities = Object.entries(confidences)
      .filter(([key]) => key !== dominantModality)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2);

    if (supportingModalities.length > 0) {
      parts.push(`Supporting: ${supportingModalities.map(([key, value]) =>
        `${key} (${(value * 100).toFixed(1)}%)`).join(', ')}`);
    }

    // Conflict and reliability
    if (conflictScore > this.config.conflictThreshold) {
      parts.push(`⚠️ Conflicting evidence detected (${(conflictScore * 100).toFixed(1)}%)`);
    }

    if (reliability < this.config.minReliabilityThreshold) {
      parts.push(`⚠️ Low reliability (${(reliability * 100).toFixed(1)}%)`);
    }

    return parts.join('; ');
  }

  /**
   * Update fusion with actual outcome for learning
   */
  updateWithOutcome(fusionId: number, actualOutcome: boolean): void {
    if (fusionId < this.fusionHistory.length) {
      const fusion = this.fusionHistory[fusionId];
      fusion.actualOutcome = actualOutcome;

      // Update modality reliability
      this.updateModalityReliability(fusion.evidence, actualOutcome);

      // Update calibration data
      this.updateCalibration(fusion.result.finalConfidence, actualOutcome);
    }
  }

  /**
   * Update reliability metrics for each modality
   */
  private updateModalityReliability(evidence: ConfidenceEvidence[], success: boolean): void {
    for (const e of evidence) {
      const currentReliability = this.modalityReliability.get(e.source) || 0.5;
      const target = success ? 1.0 : 0.0;
      const newReliability = currentReliability + this.config.learningRate * (target - currentReliability);
      this.modalityReliability.set(e.source, newReliability);
    }
  }

  /**
   * Update calibration data with actual outcomes
   */
  private updateCalibration(confidence: number, actualOutcome: boolean): void {
    const bucket = Math.floor(confidence * this.config.calibrationBuckets);
    const existing = this.calibrationData.get(bucket) || {
      expectedAccuracy: confidence,
      calibrationError: 0,
      sampleSize: 0,
      lastUpdated: new Date()
    };

    const outcome = actualOutcome ? 1 : 0;
    const newSampleSize = existing.sampleSize + 1;
    const newAccuracy = ((existing.expectedAccuracy * existing.sampleSize) + outcome) / newSampleSize;
    const newError = Math.abs(newAccuracy - confidence);

    this.calibrationData.set(bucket, {
      expectedAccuracy: newAccuracy,
      calibrationError: newError,
      sampleSize: newSampleSize,
      lastUpdated: new Date()
    });
  }

  /**
   * Initialize reliability metrics for each modality
   */
  private initializeReliabilityMetrics(): void {
    const modalities = ['semantic', 'structural', 'historical', 'temporal', 'contextual', 'collaborative'];
    for (const modality of modalities) {
      this.modalityReliability.set(modality, 0.5); // Start with neutral reliability
    }
  }

  /**
   * Get current fusion statistics
   */
  getStatistics() {
    const totalFusions = this.fusionHistory.length;
    const fusionsWithOutcome = this.fusionHistory.filter(f => f.actualOutcome !== undefined);
    const successfulFusions = fusionsWithOutcome.filter(f => f.actualOutcome === true);

    const avgConfidence = totalFusions > 0
      ? this.fusionHistory.reduce((sum, f) => sum + f.result.finalConfidence, 0) / totalFusions
      : 0;

    const avgReliability = totalFusions > 0
      ? this.fusionHistory.reduce((sum, f) => sum + f.result.reliability, 0) / totalFusions
      : 0;

    const calibrationBuckets = Array.from(this.calibrationData.entries())
      .map(([bucket, cal]) => ({
        confidenceRange: `${bucket * 10}-${(bucket + 1) * 10}%`,
        expectedAccuracy: cal.expectedAccuracy,
        calibrationError: cal.calibrationError,
        sampleSize: cal.sampleSize
      }));

    return {
      totalFusions,
      fusionsWithOutcome: fusionsWithOutcome.length,
      successRate: fusionsWithOutcome.length > 0
        ? successfulFusions.length / fusionsWithOutcome.length
        : 0,
      avgConfidence,
      avgReliability,
      modalityReliability: Object.fromEntries(this.modalityReliability),
      calibrationBuckets,
      config: this.config
    };
  }

  /**
   * Create confidence evidence from node data
   */
  static createNodeEvidence(node: MindMapNode, context: any = {}): ConfidenceEvidence[] {
    const evidence: ConfidenceEvidence[] = [];

    // Semantic evidence from node confidence
    evidence.push({
      source: 'semantic',
      value: node.confidence,
      weight: 1.0,
      uncertainty: 0.1, // Low uncertainty for direct node confidence
      metadata: { nodeType: node.type, nodeName: node.name }
    });

    // Structural evidence from node type and metadata
    if (node.type === 'function' || node.type === 'class') {
      evidence.push({
        source: 'structural',
        value: Math.min(1.0, node.confidence + 0.1), // Slight boost for code structures
        weight: 0.8,
        uncertainty: 0.15,
        metadata: { codeStructure: node.type }
      });
    }

    // Temporal evidence from recency
    if (node.lastUpdated) {
      const ageInDays = (Date.now() - node.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.exp(-ageInDays / 30); // Decay over 30 days
      evidence.push({
        source: 'temporal',
        value: recencyScore,
        weight: 0.6,
        uncertainty: 0.2,
        metadata: { ageInDays }
      });
    }

    // Contextual evidence from project context
    if (context.currentTask || context.activeFiles) {
      const contextRelevance = node.path && context.activeFiles?.includes(node.path) ? 0.9 : 0.5;
      evidence.push({
        source: 'contextual',
        value: contextRelevance,
        weight: 0.7,
        uncertainty: 0.25,
        metadata: { contextMatch: context.currentTask }
      });
    }

    return evidence;
  }
}