import { MindMapStorage } from '../MindMapStorage.js';
import { InhibitoryLearningSystem } from '../InhibitoryLearningSystem.js';
import { HebbianLearningSystem } from '../HebbianLearningSystem.js';
import { HierarchicalContextSystem, ContextLevel, ContextQuery } from '../HierarchicalContextSystem.js';
import { AttentionSystem, AttentionType, AttentionContext, AttentionAllocation } from '../AttentionSystem.js';
import { BiTemporalKnowledgeModel, BiTemporalEdge, BiTemporalNode, ContextWindow, TemporalQuery, BiTemporalStats } from '../BiTemporalKnowledgeModel.js';
import { PatternPredictionEngine, PatternPrediction, EmergingPattern, PredictionEngine } from '../PatternPredictionEngine.js';
import { EpisodicMemory, Episode, EpisodeContext, EpisodeAction, SimilarityMatch, EpisodeStats } from '../EpisodicMemory.js';
import { InhibitionResult } from '../../types/index.js';

export interface LearningStats {
  inhibitoryPatterns: number;
  hebbianConnections: number;
  contextItems: Record<string, number>;
  attentionTargets: number;
  temporalRelationships: number;
  predictedPatterns: number;
  episodes: number;
}

export class LearningService {
  constructor(
    private storage: MindMapStorage,
    private inhibitoryLearning: InhibitoryLearningSystem,
    private hebbianLearning: HebbianLearningSystem,
    private hierarchicalContext: HierarchicalContextSystem,
    private attentionSystem: AttentionSystem,
    private biTemporalModel: BiTemporalKnowledgeModel,
    private patternPrediction: PatternPredictionEngine,
    private episodicMemory: EpisodicMemory
  ) {}

  // Inhibitory Learning Methods
  async applyInhibition(
    results: any[],
    query: string,
    context: string = ''
  ): Promise<InhibitionResult> {
    return await this.inhibitoryLearning.applyInhibition(results, query, context);
  }

  async learnFromFailure(
    taskDescription: string,
    errorDetails: any,
    involvedFiles: string[],
    context: string = ''
  ): Promise<any> {
    return await this.inhibitoryLearning.learnFromFailure(taskDescription, errorDetails, involvedFiles, context);
  }

  getInhibitoryStats() {
    return this.inhibitoryLearning.getStats();
  }

  // Hebbian Learning Methods
  async recordCoActivation(
    primaryNodeId: string,
    coActivatedNodeIds: string[],
    context: string = '',
    activationStrength: number = 1.0
  ): Promise<void> {
    await this.hebbianLearning.recordCoActivation(primaryNodeId, coActivatedNodeIds, context, activationStrength);
  }

  getHebbianStats() {
    return this.hebbianLearning.getStats();
  }

  getHebbianConnections(nodeId?: string) {
    return this.hebbianLearning.getConnections(nodeId);
  }

  getHebbianStatistics() {
    return this.hebbianLearning.getStatistics();
  }

  // Hierarchical Context Methods
  addContext(item: any, propagateUp: boolean = true, propagateDown: boolean = false): void {
    this.hierarchicalContext.addContext(item, propagateUp, propagateDown);
  }

  getContextScores(nodes: any[], query: ContextQuery): any[] {
    return this.hierarchicalContext.getContextScores(nodes, query);
  }

  updateContextFromActivity(activity: any): void {
    this.hierarchicalContext.updateFromActivity(activity);
  }

  getContextSummary(): any {
    return this.hierarchicalContext.getContextSummary();
  }

  getContextStatistics(): any {
    return this.hierarchicalContext.getContextStatistics();
  }

  clearContext(level?: ContextLevel): void {
    this.hierarchicalContext.clearContext(level);
  }

  // Attention System Methods
  allocateAttention(nodes: any[], context: AttentionContext, type: AttentionType = AttentionType.SELECTIVE): AttentionAllocation {
    return this.attentionSystem.allocateAttention(nodes, context, type);
  }

  updateAttentionFromActivity(activity: any): void {
    this.attentionSystem.updateAttentionFromActivity(activity);
  }

  getAttentionStats() {
    return this.attentionSystem.getAttentionStats();
  }

  applyAttentionToResults(results: any, context: AttentionContext): any {
    return this.attentionSystem.applyAttentionToResults(results, context);
  }

  // Bi-Temporal Knowledge Methods
  createContextWindow(
    name: string,
    validTimeStart: Date,
    validTimeEnd?: Date | null,
    description: string = '',
    frameworkVersions: Record<string, string> = {}
  ): ContextWindow {
    return this.biTemporalModel.createContextWindow(name, validTimeStart, validTimeEnd, description, frameworkVersions);
  }

  queryBiTemporal(query: TemporalQuery): { edges: BiTemporalEdge[]; nodes: BiTemporalNode[]; contextWindows: ContextWindow[]; } {
    return this.biTemporalModel.queryBiTemporal(query);
  }

  createTemporalSnapshot(name?: string): { timestamp: Date; activeEdges: number; totalEdges: number; contextWindows: string[]; stats: BiTemporalStats; } {
    return this.biTemporalModel.createTemporalSnapshot(name);
  }

  async invalidateRelationship(
    edgeId: string,
    invalidationDate: Date = new Date(),
    reason: string = 'manual',
    evidence: string[] = []
  ): Promise<void> {
    await this.biTemporalModel.invalidateRelationship(edgeId, invalidationDate, reason, evidence);
  }

  getBiTemporalStats(): BiTemporalStats {
    return this.biTemporalModel.getBiTemporalStats();
  }

  setCurrentContextWindow(contextId: string): void {
    this.biTemporalModel.setCurrentContextWindow(contextId);
  }

  // Pattern Prediction Methods
  async analyzeAndPredict(): Promise<void> {
    await this.patternPrediction.analyzeAndPredict();
  }

  getPatternPredictions(patternType?: string): PatternPrediction[] {
    return this.patternPrediction.getPatternPredictions(patternType);
  }

  getEmergingPatterns(emergenceStage?: 'nascent' | 'developing' | 'emerging' | 'established'): EmergingPattern[] {
    return this.patternPrediction.getEmergingPatterns(emergenceStage);
  }

  async predictPatternEmergence(patternType: string): Promise<any> {
    return await this.patternPrediction.predictPatternEmergence(patternType);
  }

  getPredictionEngineStats() {
    return this.patternPrediction.getPredictionEngineStats();
  }

  // Episodic Memory Methods
  async storeEpisode(
    taskDescription: string,
    context: Partial<EpisodeContext>,
    actions: EpisodeAction[],
    outcome: 'success' | 'failure' | 'partial'
  ): Promise<string> {
    return await this.episodicMemory.storeEpisode(taskDescription, context, actions, outcome);
  }

  async findSimilarEpisodes(
    context: Partial<EpisodeContext>,
    limit: number = 5,
    minSimilarity: number = 0.7
  ): Promise<SimilarityMatch[]> {
    return await this.episodicMemory.findSimilarEpisodes(context, limit, minSimilarity);
  }

  async getEpisodeBasedSuggestions(currentContext: Partial<EpisodeContext>): Promise<any> {
    return await this.episodicMemory.getEpisodeBasedSuggestions(currentContext);
  }

  getEpisodicStats(): EpisodeStats {
    return this.episodicMemory.getStats();
  }

  // Combined Learning Operations
  async processLearningFromQuery(
    query: string,
    results: any[],
    userInteraction?: {
      selectedResults?: string[];
      feedback?: { helpful: boolean; reason?: string };
      timeSpent?: number;
    }
  ): Promise<void> {
    // Update attention based on query
    this.updateAttentionFromActivity({
      actionType: 'query',
      queryText: query,
      timestamp: new Date()
    });

    // Process Hebbian learning for co-activated nodes
    if (results.length > 1) {
      const nodeIds = results.map(r => r.id).filter(Boolean);
      const primaryNodeId = nodeIds[0];
      const coActivatedIds = nodeIds.slice(1);
      if (primaryNodeId) {
        await this.recordCoActivation(primaryNodeId, coActivatedIds, query, 1.0);
      }
    }

    // Record episodic memory
    const context: Partial<EpisodeContext> = {
      taskDescription: query,
      projectType: 'unknown',
      languages: [],
      frameworks: [],
      fileTypes: [],
      userGoals: [query],
      sessionDuration: 0,
      activeFiles: []
    };

    const action: EpisodeAction = {
      type: 'query',
      target: query,
      parameters: { resultCount: results.length },
      timestamp: new Date(),
      success: results.length > 0,
      duration: userInteraction?.timeSpent || 0
    };

    const outcome: 'success' | 'failure' | 'partial' =
      results.length > 0 ?
        (userInteraction?.feedback?.helpful !== false ? 'success' : 'partial') :
        'failure';

    await this.storeEpisode(query, context, [action], outcome);

    // Apply inhibitory learning if negative feedback provided
    if (userInteraction?.feedback && !userInteraction.feedback.helpful) {
      await this.applyInhibition(results, query, 'user_feedback_negative');
    }
  }

  // Get comprehensive learning statistics
  getComprehensiveStats(): LearningStats {
    const inhibitoryStats = this.getInhibitoryStats();
    const hebbianStats = this.getHebbianStats();
    const contextStats = this.getContextStatistics();
    const attentionStats = this.getAttentionStats();
    const biTemporalStats = this.getBiTemporalStats();
    const predictionStats = this.getPredictionEngineStats();
    const episodicStats = this.getEpisodicStats();

    return {
      inhibitoryPatterns: inhibitoryStats.totalPatterns,
      hebbianConnections: hebbianStats.totalConnections,
      contextItems: {
        immediate: contextStats.contextCounts?.immediate || 0,
        session: contextStats.contextCounts?.session || 0,
        project: contextStats.contextCounts?.project || 0,
        domain: contextStats.contextCounts?.domain || 0
      },
      attentionTargets: attentionStats.totalTargets || 0,
      temporalRelationships: biTemporalStats.historicalRelationships,
      predictedPatterns: predictionStats.activePredictions || 0,
      episodes: episodicStats.totalEpisodes
    };
  }

  // Cleanup and maintenance
  async performMaintenance(): Promise<void> {
    console.log('🧹 Performing learning system maintenance...');

    // Save connections and perform cleanup where available
    try {
      await this.hebbianLearning.saveConnections();
    } catch (error) {
      console.warn('Hebbian learning maintenance failed:', error);
    }

    try {
      this.inhibitoryLearning.cleanup();
    } catch (error) {
      console.warn('Inhibitory learning cleanup failed:', error);
    }

    console.log('✅ Learning system maintenance completed');
  }
}