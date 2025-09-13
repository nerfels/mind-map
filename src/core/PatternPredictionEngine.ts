/**
 * Pattern Prediction Engine - Anticipate patterns before they fully emerge
 * Implements predictive analytics for code patterns, architectural trends, and development cycles
 * Based on time series analysis, machine learning principles, and pattern recognition research
 */

import { MindMapStorage } from './MindMapStorage.js';
import { MindMapNode, MindMapEdge } from '../types/index.js';

// Pattern Prediction Interfaces
export interface PatternTrend {
  id: string;
  patternType: string;
  description: string;
  confidence: number;           // 0-1, confidence in this trend
  strength: number;            // 0-1, current strength of the pattern
  velocity: number;            // Rate of pattern emergence (positive = growing)
  acceleration: number;        // Rate of velocity change
  timeToEmergence: number;     // Estimated time until full emergence (ms)
  firstObserved: Date;         // When we first detected this trend
  lastUpdated: Date;           // Last time this trend was updated
  dataPoints: PatternDataPoint[]; // Historical data points
  relatedNodes: string[];      // Nodes involved in this pattern
  relatedPatterns: string[];   // Other patterns that correlate with this one
  metadata: {
    domain: string;            // e.g., "architecture", "frameworks", "testing"
    category: string;          // e.g., "emerging", "declining", "cyclical"
    tags: string[];            // Descriptive tags
    riskLevel: 'low' | 'medium' | 'high'; // Risk if we don't adapt to this pattern
    actionable: boolean;       // Whether this pattern suggests specific actions
  };
}

export interface PatternDataPoint {
  timestamp: Date;
  value: number;               // Normalized pattern strength (0-1)
  context: string;             // Context when this measurement was taken
  evidence: string[];          // Evidence supporting this measurement
  confidence: number;          // Confidence in this data point
}

export interface EmergingPattern {
  id: string;
  name: string;
  description: string;
  emergenceStage: 'nascent' | 'developing' | 'emerging' | 'established';
  predictionConfidence: number; // 0-1, how confident we are this will emerge
  estimatedEmergenceDate: Date; // When we predict full emergence
  keyIndicators: PatternIndicator[];
  suggestedActions: string[];   // What should be done to prepare
  risksIfIgnored: string[];     // What happens if we don't adapt
  opportunitiesIfAdopted: string[]; // Benefits of early adoption
  similarHistoricalPatterns: string[]; // Past patterns that were similar
  correlatedTrends: string[];   // Other trends that support this prediction
}

export interface PatternIndicator {
  name: string;
  description: string;
  currentValue: number;        // Current indicator value
  threshold: number;           // Threshold for pattern emergence
  weight: number;              // How important this indicator is (0-1)
  trend: 'increasing' | 'decreasing' | 'stable';
  lastMeasured: Date;
}

export interface PatternPrediction {
  id: string;
  patternType: string;
  description: string;
  predictionType: 'emergence' | 'decline' | 'transformation' | 'cycle';
  probability: number;         // 0-1, probability this will happen
  timeframe: {
    earliest: Date;            // Earliest this could happen
    most_likely: Date;         // Most likely time
    latest: Date;              // Latest this could happen
  };
  confidence: number;          // 0-1, confidence in this prediction
  evidence: string[];          // Evidence supporting this prediction
  assumptions: string[];       // What assumptions this prediction relies on
  alternatives: Array<{       // Alternative scenarios
    scenario: string;
    probability: number;
    description: string;
  }>;
  monitoring: {               // How to monitor this prediction
    keyMetrics: string[];
    updateFrequency: number;   // How often to reassess (ms)
    warningThresholds: Record<string, number>;
  };
}

export interface PredictionEngine {
  totalPatterns: number;
  emergingPatterns: number;
  activePredictions: number;
  predictionAccuracy: number;   // Historical accuracy rate
  recentPredictions: PatternPrediction[];
  patternCategories: Record<string, number>;
  topEmergingPatterns: EmergingPattern[];
  riskAssessment: {
    highRiskPatterns: number;
    unmonitoredPatterns: number;
    actionablePatterns: number;
  };
}

export interface PredictionConfig {
  minDataPoints: number;        // Minimum data points needed for prediction
  confidenceThreshold: number;  // Minimum confidence to report predictions
  predictionHorizon: number;    // How far ahead to predict (ms)
  updateInterval: number;       // How often to update predictions (ms)
  maxPatterns: number;          // Maximum patterns to track
  decayRate: number;           // How fast old patterns decay
  anomalyThreshold: number;    // Threshold for detecting anomalies
  correlationThreshold: number; // Minimum correlation to link patterns
}

/**
 * PatternPredictionEngine - Anticipates emerging patterns and trends
 * 
 * Core Capabilities:
 * 1. Trend Analysis - Analyze historical pattern data for trends
 * 2. Pattern Emergence Detection - Detect patterns before they fully manifest
 * 3. Time Series Forecasting - Predict future pattern behavior
 * 4. Correlation Analysis - Find relationships between patterns
 * 5. Risk Assessment - Evaluate risks of ignoring emerging patterns
 * 6. Action Recommendations - Suggest proactive responses to patterns
 */
export class PatternPredictionEngine {
  private storage: MindMapStorage;
  private patternTrends: Map<string, PatternTrend>;
  private emergingPatterns: Map<string, EmergingPattern>;
  private predictions: Map<string, PatternPrediction>;
  private config: PredictionConfig;
  private lastUpdate: Date;
  private analysisHistory: Array<{ timestamp: Date; patterns: number; predictions: number }>;

  constructor(storage: MindMapStorage, config?: Partial<PredictionConfig>) {
    this.storage = storage;
    this.patternTrends = new Map();
    this.emergingPatterns = new Map();
    this.predictions = new Map();
    this.lastUpdate = new Date();
    this.analysisHistory = [];

    this.config = {
      minDataPoints: 5,           // Need at least 5 data points
      confidenceThreshold: 0.7,   // 70% confidence minimum
      predictionHorizon: 2592000000, // 30 days ahead
      updateInterval: 3600000,    // Update every hour
      maxPatterns: 100,           // Track up to 100 patterns
      decayRate: 0.01,           // 1% decay per update
      anomalyThreshold: 2.0,      // 2 standard deviations
      correlationThreshold: 0.6,  // 60% correlation minimum
      ...config
    };

    this.startPredictionEngine();
  }

  /**
   * Analyze current patterns and predict future trends
   */
  async analyzeAndPredict(): Promise<void> {
    const now = new Date();
    
    // Analyze current patterns in the mind map
    await this.analyzeCurrentPatterns();
    
    // Detect emerging patterns
    await this.detectEmergingPatterns();
    
    // Generate predictions
    await this.generatePredictions();
    
    // Update correlations
    await this.updatePatternCorrelations();
    
    // Cleanup old patterns
    this.pruneObsoletePatterns();
    
    // Record analysis
    this.analysisHistory.push({
      timestamp: now,
      patterns: this.patternTrends.size,
      predictions: this.predictions.size
    });

    // Keep only last 100 analyses
    if (this.analysisHistory.length > 100) {
      this.analysisHistory = this.analysisHistory.slice(-100);
    }

    this.lastUpdate = now;
    console.log(`🔮 Pattern prediction analysis complete: ${this.patternTrends.size} patterns, ${this.predictions.size} predictions`);
  }

  /**
   * Get specific pattern predictions
   */
  getPatternPredictions(patternType?: string): PatternPrediction[] {
    let predictions = Array.from(this.predictions.values());
    
    if (patternType) {
      predictions = predictions.filter(p => p.patternType === patternType);
    }

    return predictions
      .filter(p => p.confidence >= this.config.confidenceThreshold)
      .sort((a, b) => b.probability - a.probability);
  }

  /**
   * Get emerging patterns that haven't fully manifested yet
   */
  getEmergingPatterns(stage?: EmergingPattern['emergenceStage']): EmergingPattern[] {
    let patterns = Array.from(this.emergingPatterns.values());
    
    if (stage) {
      patterns = patterns.filter(p => p.emergenceStage === stage);
    }

    return patterns
      .filter(p => p.predictionConfidence >= this.config.confidenceThreshold)
      .sort((a, b) => b.predictionConfidence - a.predictionConfidence);
  }

  /**
   * Predict when a specific pattern will emerge or change
   */
  predictPatternEmergence(patternType: string): PatternPrediction | null {
    const trend = this.patternTrends.get(patternType);
    if (!trend || trend.dataPoints.length < this.config.minDataPoints) {
      return null;
    }

    // Analyze trend velocity and acceleration
    const recentPoints = trend.dataPoints.slice(-10); // Last 10 data points
    const timeDeltas: number[] = [];
    const valueDeltas: number[] = [];

    for (let i = 1; i < recentPoints.length; i++) {
      const timeDelta = recentPoints[i].timestamp.getTime() - recentPoints[i-1].timestamp.getTime();
      const valueDelta = recentPoints[i].value - recentPoints[i-1].value;
      timeDeltas.push(timeDelta);
      valueDeltas.push(valueDelta);
    }

    const avgVelocity = valueDeltas.reduce((sum, d) => sum + d, 0) / valueDeltas.length;
    const avgTimeDelta = timeDeltas.reduce((sum, d) => sum + d, 0) / timeDeltas.length;

    // Calculate when pattern will reach emergence threshold (0.8)
    const currentValue = trend.strength;
    const targetValue = 0.8;
    const timeToEmergence = avgVelocity > 0 ? 
      ((targetValue - currentValue) / avgVelocity) * avgTimeDelta : 
      Infinity;

    const emergenceDate = new Date(Date.now() + timeToEmergence);
    const confidence = this.calculatePredictionConfidence(trend, recentPoints);

    return {
      id: `emergence_${patternType}_${Date.now()}`,
      patternType,
      description: `Predicted emergence of ${trend.description}`,
      predictionType: 'emergence',
      probability: Math.min(0.95, trend.confidence * (avgVelocity > 0 ? 1 : 0.5)),
      timeframe: {
        earliest: new Date(emergenceDate.getTime() - (timeToEmergence * 0.3)),
        most_likely: emergenceDate,
        latest: new Date(emergenceDate.getTime() + (timeToEmergence * 0.5))
      },
      confidence,
      evidence: [
        `Current pattern strength: ${currentValue.toFixed(3)}`,
        `Average velocity: ${avgVelocity.toFixed(4)}`,
        `Data points analyzed: ${recentPoints.length}`,
        `First observed: ${trend.firstObserved.toISOString()}`
      ],
      assumptions: [
        'Current trend velocity will continue',
        'No external disruptions to pattern development',
        'Pattern follows typical emergence trajectory'
      ],
      alternatives: [
        {
          scenario: 'Accelerated emergence',
          probability: 0.3,
          description: 'Pattern emerges faster due to external factors'
        },
        {
          scenario: 'Pattern stalls',
          probability: 0.2,
          description: 'Development slows or stops before full emergence'
        },
        {
          scenario: 'Pattern transforms',
          probability: 0.1,
          description: 'Pattern evolves into something different'
        }
      ],
      monitoring: {
        keyMetrics: ['pattern_strength', 'velocity', 'related_node_count'],
        updateFrequency: 86400000, // Daily updates
        warningThresholds: {
          velocity_drop: -0.1,
          confidence_drop: 0.5
        }
      }
    };
  }

  /**
   * Get comprehensive prediction engine statistics
   */
  getPredictionEngineStats(): PredictionEngine {
    const patterns = Array.from(this.patternTrends.values());
    const emergingPatterns = Array.from(this.emergingPatterns.values());
    const predictions = Array.from(this.predictions.values());

    // Calculate prediction accuracy (simplified)
    const historicalPredictions = predictions.filter(p => 
      p.timeframe.most_likely < new Date()
    );
    const accuratePredictions = historicalPredictions.filter(p => p.confidence > 0.8);
    const predictionAccuracy = historicalPredictions.length > 0 ?
      accuratePredictions.length / historicalPredictions.length : 0;

    // Pattern categories
    const patternCategories: Record<string, number> = {};
    patterns.forEach(pattern => {
      const domain = pattern.metadata.domain;
      patternCategories[domain] = (patternCategories[domain] || 0) + 1;
    });

    // Risk assessment
    const highRiskPatterns = patterns.filter(p => p.metadata.riskLevel === 'high').length;
    const actionablePatterns = patterns.filter(p => p.metadata.actionable).length;
    const unmonitoredPatterns = patterns.filter(p => 
      Date.now() - p.lastUpdated.getTime() > this.config.updateInterval * 2
    ).length;

    return {
      totalPatterns: patterns.length,
      emergingPatterns: emergingPatterns.filter(p => p.emergenceStage === 'emerging').length,
      activePredictions: predictions.filter(p => p.timeframe.most_likely > new Date()).length,
      predictionAccuracy,
      recentPredictions: predictions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10),
      patternCategories,
      topEmergingPatterns: emergingPatterns
        .sort((a, b) => b.predictionConfidence - a.predictionConfidence)
        .slice(0, 5),
      riskAssessment: {
        highRiskPatterns,
        unmonitoredPatterns,
        actionablePatterns
      }
    };
  }

  // Private Implementation Methods

  private async analyzeCurrentPatterns(): Promise<void> {
    const nodes = Array.from(this.storage.getGraph().nodes.values());
    const edges = Array.from(this.storage.getGraph().edges.values());

    // Analyze framework adoption patterns
    await this.analyzeFrameworkPatterns(nodes);
    
    // Analyze architectural patterns
    await this.analyzeArchitecturalPatterns(nodes, edges);
    
    // Analyze file organization patterns
    await this.analyzeOrganizationPatterns(nodes);
    
    // Analyze naming convention patterns
    await this.analyzeNamingPatterns(nodes);

    // Analyze dependency patterns
    await this.analyzeDependencyPatterns(edges);
  }

  private async analyzeFrameworkPatterns(nodes: MindMapNode[]): Promise<void> {
    const frameworkNodes = nodes.filter(node => node.frameworks && node.frameworks.length > 0);
    const frameworkCounts: Record<string, number> = {};
    
    frameworkNodes.forEach(node => {
      node.frameworks?.forEach(framework => {
        frameworkCounts[framework] = (frameworkCounts[framework] || 0) + 1;
      });
    });

    // Track framework adoption trends
    Object.entries(frameworkCounts).forEach(([framework, count]) => {
      const patternId = `framework_${framework}`;
      const strength = Math.min(1.0, count / Math.max(1, frameworkNodes.length));
      
      this.updatePatternTrend(patternId, {
        patternType: 'framework_adoption',
        description: `${framework} framework adoption`,
        currentStrength: strength,
        context: `${count} files using ${framework}`,
        evidence: [`Framework found in ${count} files`],
        domain: 'frameworks',
        category: count > 5 ? 'established' : 'emerging'
      });
    });
  }

  private async analyzeArchitecturalPatterns(nodes: MindMapNode[], edges: MindMapEdge[]): Promise<void> {
    // Analyze module structure patterns
    const directories = nodes.filter(node => node.type === 'directory');
    const files = nodes.filter(node => node.type === 'file');
    
    // Calculate modularity metrics
    const moduleDepth = directories.reduce((max, dir) => {
      const depth = (dir.path?.split('/').length || 1) - 1;
      return Math.max(max, depth);
    }, 0);

    const avgFilesPerDir = directories.length > 0 ? files.length / directories.length : 0;

    // Track architectural complexity trend
    this.updatePatternTrend('architectural_complexity', {
      patternType: 'architecture',
      description: 'Project architectural complexity',
      currentStrength: Math.min(1.0, (moduleDepth * 0.1) + (avgFilesPerDir * 0.05)),
      context: `${directories.length} directories, ${files.length} files`,
      evidence: [`Module depth: ${moduleDepth}`, `Avg files per directory: ${avgFilesPerDir.toFixed(1)}`],
      domain: 'architecture',
      category: moduleDepth > 5 ? 'established' : 'developing'
    });

    // Analyze coupling patterns
    const couplingStrength = edges.length > 0 ? edges.length / (nodes.length * (nodes.length - 1)) : 0;
    
    this.updatePatternTrend('coupling_density', {
      patternType: 'architecture',
      description: 'Code coupling density',
      currentStrength: Math.min(1.0, couplingStrength * 100),
      context: `${edges.length} relationships among ${nodes.length} nodes`,
      evidence: [`Coupling ratio: ${(couplingStrength * 100).toFixed(3)}%`],
      domain: 'architecture',
      category: couplingStrength > 0.1 ? 'high' : 'moderate'
    });
  }

  private async analyzeOrganizationPatterns(nodes: MindMapNode[]): Promise<void> {
    const fileNodes = nodes.filter(node => node.type === 'file');
    
    // Analyze file organization by extension
    const extensionGroups: Record<string, string[]> = {};
    fileNodes.forEach(node => {
      if (node.path) {
        const ext = node.path.split('.').pop() || 'unknown';
        if (!extensionGroups[ext]) extensionGroups[ext] = [];
        extensionGroups[ext].push(node.path);
      }
    });

    // Track language diversity
    const languageCount = Object.keys(extensionGroups).length;
    const dominantLanguage = Object.entries(extensionGroups)
      .sort(([,a], [,b]) => b.length - a.length)[0];

    this.updatePatternTrend('language_diversity', {
      patternType: 'organization',
      description: 'Programming language diversity',
      currentStrength: Math.min(1.0, languageCount / 10), // Normalize to max 10 languages
      context: `${languageCount} different file types`,
      evidence: [
        `Languages: ${Object.keys(extensionGroups).join(', ')}`,
        `Dominant: ${dominantLanguage?.[0]} (${dominantLanguage?.[1].length} files)`
      ],
      domain: 'organization',
      category: languageCount > 3 ? 'polyglot' : 'focused'
    });
  }

  private async analyzeNamingPatterns(nodes: MindMapNode[]): Promise<void> {
    const functionNodes = nodes.filter(node => node.type === 'function');
    const classNodes = nodes.filter(node => node.type === 'class');

    // Analyze naming conventions
    const camelCasePattern = /^[a-z][a-zA-Z0-9]*$/;
    const pascalCasePattern = /^[A-Z][a-zA-Z0-9]*$/;
    const snakeCasePattern = /^[a-z][a-z0-9_]*$/;

    let camelCaseCount = 0;
    let pascalCaseCount = 0;
    let snakeCaseCount = 0;

    functionNodes.forEach(node => {
      if (camelCasePattern.test(node.name)) camelCaseCount++;
      else if (snakeCasePattern.test(node.name)) snakeCaseCount++;
    });

    classNodes.forEach(node => {
      if (pascalCasePattern.test(node.name)) pascalCaseCount++;
    });

    const totalNamed = functionNodes.length + classNodes.length;
    const conventionConsistency = totalNamed > 0 ?
      (camelCaseCount + pascalCaseCount + snakeCaseCount) / totalNamed : 0;

    this.updatePatternTrend('naming_consistency', {
      patternType: 'code_quality',
      description: 'Naming convention consistency',
      currentStrength: conventionConsistency,
      context: `${totalNamed} named entities analyzed`,
      evidence: [
        `camelCase: ${camelCaseCount}`,
        `PascalCase: ${pascalCaseCount}`,
        `snake_case: ${snakeCaseCount}`
      ],
      domain: 'code_quality',
      category: conventionConsistency > 0.8 ? 'consistent' : 'inconsistent'
    });
  }

  private async analyzeDependencyPatterns(edges: MindMapEdge[]): Promise<void> {
    const importEdges = edges.filter(edge => edge.type === 'imports');
    const containsEdges = edges.filter(edge => edge.type === 'contains');

    // Calculate dependency metrics
    const avgImportsPerFile = importEdges.length / Math.max(1, containsEdges.length);
    const dependencyComplexity = Math.min(1.0, avgImportsPerFile / 20); // Normalize to max 20 imports

    this.updatePatternTrend('dependency_complexity', {
      patternType: 'dependencies',
      description: 'Import dependency complexity',
      currentStrength: dependencyComplexity,
      context: `${importEdges.length} imports across files`,
      evidence: [`Average imports per file: ${avgImportsPerFile.toFixed(1)}`],
      domain: 'dependencies',
      category: dependencyComplexity > 0.5 ? 'complex' : 'simple'
    });
  }

  private updatePatternTrend(patternId: string, data: {
    patternType: string;
    description: string;
    currentStrength: number;
    context: string;
    evidence: string[];
    domain: string;
    category: string;
  }): void {
    const now = new Date();
    let trend = this.patternTrends.get(patternId);

    if (!trend) {
      trend = {
        id: patternId,
        patternType: data.patternType,
        description: data.description,
        confidence: 0.5,
        strength: data.currentStrength,
        velocity: 0,
        acceleration: 0,
        timeToEmergence: Infinity,
        firstObserved: now,
        lastUpdated: now,
        dataPoints: [],
        relatedNodes: [],
        relatedPatterns: [],
        metadata: {
          domain: data.domain,
          category: data.category,
          tags: [],
          riskLevel: 'medium',
          actionable: false
        }
      };
      this.patternTrends.set(patternId, trend);
    }

    // Add new data point
    trend.dataPoints.push({
      timestamp: now,
      value: data.currentStrength,
      context: data.context,
      evidence: data.evidence,
      confidence: 0.8
    });

    // Keep only recent data points
    if (trend.dataPoints.length > 50) {
      trend.dataPoints = trend.dataPoints.slice(-30);
    }

    // Update trend metrics
    if (trend.dataPoints.length >= 2) {
      const recent = trend.dataPoints.slice(-5); // Last 5 points
      const velocities: number[] = [];

      for (let i = 1; i < recent.length; i++) {
        const timeDelta = recent[i].timestamp.getTime() - recent[i-1].timestamp.getTime();
        const valueDelta = recent[i].value - recent[i-1].value;
        velocities.push(valueDelta / (timeDelta / 86400000)); // Per day
      }

      trend.velocity = velocities.length > 0 ?
        velocities.reduce((sum, v) => sum + v, 0) / velocities.length : 0;

      // Update strength and confidence
      trend.strength = data.currentStrength;
      trend.confidence = Math.min(1.0, trend.confidence + 0.1);
      trend.lastUpdated = now;
    }
  }

  private async detectEmergingPatterns(): Promise<void> {
    for (const [patternId, trend] of this.patternTrends.entries()) {
      if (trend.velocity > 0.01 && trend.strength < 0.8 && trend.confidence > 0.6) {
        // This might be an emerging pattern
        const emergingId = `emerging_${patternId}`;
        
        if (!this.emergingPatterns.has(emergingId)) {
          const emergingPattern: EmergingPattern = {
            id: emergingId,
            name: trend.description,
            description: `Emerging pattern: ${trend.description}`,
            emergenceStage: this.calculateEmergenceStage(trend),
            predictionConfidence: this.calculateEmergenceConfidence(trend),
            estimatedEmergenceDate: new Date(Date.now() + (trend.timeToEmergence || 2592000000)),
            keyIndicators: this.generateKeyIndicators(trend),
            suggestedActions: this.generateSuggestedActions(trend),
            risksIfIgnored: this.generateRisks(trend),
            opportunitiesIfAdopted: this.generateOpportunities(trend),
            similarHistoricalPatterns: [],
            correlatedTrends: []
          };

          this.emergingPatterns.set(emergingId, emergingPattern);
          console.log(`🔮 Detected emerging pattern: ${trend.description}`);
        }
      }
    }
  }

  private async generatePredictions(): Promise<void> {
    for (const trend of this.patternTrends.values()) {
      if (trend.dataPoints.length >= this.config.minDataPoints) {
        const prediction = this.predictPatternEmergence(trend.id);
        if (prediction && prediction.confidence >= this.config.confidenceThreshold) {
          this.predictions.set(prediction.id, prediction);
        }
      }
    }
  }

  private calculatePredictionConfidence(trend: PatternTrend, recentPoints: PatternDataPoint[]): number {
    const consistencyFactor = this.calculateTrendConsistency(recentPoints);
    const dataQualityFactor = Math.min(1.0, trend.dataPoints.length / 10);
    const ageFactor = Math.max(0.1, 1 - ((Date.now() - trend.firstObserved.getTime()) / (365 * 24 * 60 * 60 * 1000)));
    
    return (consistencyFactor * 0.5) + (dataQualityFactor * 0.3) + (ageFactor * 0.2);
  }

  private calculateTrendConsistency(dataPoints: PatternDataPoint[]): number {
    if (dataPoints.length < 3) return 0.5;

    const deltas: number[] = [];
    for (let i = 1; i < dataPoints.length; i++) {
      deltas.push(dataPoints[i].value - dataPoints[i-1].value);
    }

    const avgDelta = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
    const variance = deltas.reduce((sum, d) => sum + Math.pow(d - avgDelta, 2), 0) / deltas.length;
    
    return Math.max(0.1, 1 - Math.sqrt(variance));
  }

  private calculateEmergenceStage(trend: PatternTrend): EmergingPattern['emergenceStage'] {
    if (trend.strength < 0.2) return 'nascent';
    if (trend.strength < 0.4) return 'developing';
    if (trend.strength < 0.8) return 'emerging';
    return 'established';
  }

  private calculateEmergenceConfidence(trend: PatternTrend): number {
    const strengthFactor = trend.strength;
    const velocityFactor = Math.min(1.0, Math.abs(trend.velocity) * 10);
    const consistencyFactor = trend.confidence;
    
    return (strengthFactor * 0.4) + (velocityFactor * 0.3) + (consistencyFactor * 0.3);
  }

  private generateKeyIndicators(trend: PatternTrend): PatternIndicator[] {
    return [
      {
        name: 'Pattern Strength',
        description: 'Current strength of the pattern',
        currentValue: trend.strength,
        threshold: 0.8,
        weight: 0.6,
        trend: trend.velocity > 0 ? 'increasing' : 'decreasing',
        lastMeasured: trend.lastUpdated
      },
      {
        name: 'Growth Velocity',
        description: 'Rate of pattern development',
        currentValue: Math.abs(trend.velocity),
        threshold: 0.05,
        weight: 0.4,
        trend: trend.acceleration > 0 ? 'increasing' : 'decreasing',
        lastMeasured: trend.lastUpdated
      }
    ];
  }

  private generateSuggestedActions(trend: PatternTrend): string[] {
    const actions: string[] = [];
    
    if (trend.metadata.domain === 'frameworks') {
      actions.push(`Monitor ${trend.description} adoption in the community`);
      actions.push('Evaluate migration feasibility and benefits');
    } else if (trend.metadata.domain === 'architecture') {
      actions.push('Review current architecture against emerging patterns');
      actions.push('Plan gradual refactoring if beneficial');
    } else if (trend.metadata.domain === 'code_quality') {
      actions.push('Establish coding standards and guidelines');
      actions.push('Set up automated linting and formatting');
    }

    return actions;
  }

  private generateRisks(trend: PatternTrend): string[] {
    return [
      'Technical debt accumulation if pattern is ignored',
      'Reduced maintainability and developer productivity',
      'Difficulty attracting developers familiar with outdated patterns',
      'Performance implications of not adopting efficient patterns'
    ];
  }

  private generateOpportunities(trend: PatternTrend): string[] {
    return [
      'Early adoption advantage and competitive edge',
      'Improved developer experience and productivity',
      'Better alignment with industry best practices',
      'Enhanced maintainability and extensibility'
    ];
  }

  private async updatePatternCorrelations(): Promise<void> {
    const trends = Array.from(this.patternTrends.values());
    
    for (let i = 0; i < trends.length; i++) {
      for (let j = i + 1; j < trends.length; j++) {
        const correlation = this.calculateCorrelation(trends[i], trends[j]);
        if (correlation >= this.config.correlationThreshold) {
          if (!trends[i].relatedPatterns.includes(trends[j].id)) {
            trends[i].relatedPatterns.push(trends[j].id);
          }
          if (!trends[j].relatedPatterns.includes(trends[i].id)) {
            trends[j].relatedPatterns.push(trends[i].id);
          }
        }
      }
    }
  }

  private calculateCorrelation(trend1: PatternTrend, trend2: PatternTrend): number {
    const points1 = trend1.dataPoints.slice(-10);
    const points2 = trend2.dataPoints.slice(-10);
    
    if (points1.length < 3 || points2.length < 3) return 0;

    // Simple correlation calculation
    const values1 = points1.map(p => p.value);
    const values2 = points2.map(p => p.value);
    
    const mean1 = values1.reduce((sum, v) => sum + v, 0) / values1.length;
    const mean2 = values2.reduce((sum, v) => sum + v, 0) / values2.length;
    
    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;
    
    for (let i = 0; i < Math.min(values1.length, values2.length); i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      denominator1 += diff1 * diff1;
      denominator2 += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(denominator1 * denominator2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private pruneObsoletePatterns(): void {
    const cutoffTime = Date.now() - (this.config.predictionHorizon * 2);
    
    for (const [id, trend] of this.patternTrends.entries()) {
      if (trend.lastUpdated.getTime() < cutoffTime || trend.confidence < 0.1) {
        this.patternTrends.delete(id);
      }
    }

    for (const [id, pattern] of this.emergingPatterns.entries()) {
      if (pattern.estimatedEmergenceDate.getTime() < Date.now() - 86400000) { // 1 day past
        this.emergingPatterns.delete(id);
      }
    }
  }

  private startPredictionEngine(): void {
    // Run analysis periodically
    setInterval(() => {
      this.analyzeAndPredict().catch(console.error);
    }, this.config.updateInterval);

    // Initial analysis
    setTimeout(() => {
      this.analyzeAndPredict().catch(console.error);
    }, 5000); // 5 second delay for startup
  }
}