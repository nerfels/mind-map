import { MindMapStorage } from './MindMapStorage.js';
import { FileScanner, FileScannerOptions } from './FileScanner.js';
import { CodeAnalyzer } from './CodeAnalyzer.js';
import { ArchitecturalAnalyzer } from './ArchitecturalAnalyzer.js';
import { AdvancedQueryEngine } from './AdvancedQueryEngine.js';
import { TemporalQueryEngine } from './TemporalQueryEngine.js';
import { AggregateQueryEngine } from './AggregateQueryEngine.js';
import { MultiLanguageIntelligence } from './MultiLanguageIntelligence.js';
import { LanguageToolingDetector } from './LanguageToolingDetector.js';
import { EnhancedFrameworkDetector } from './EnhancedFrameworkDetector.js';
import { ActivationNetwork, QueryContext } from './ActivationNetwork.js';
import { QueryCache } from './QueryCache.js';
import { ParallelFileProcessor } from './ParallelFileProcessor.js';
import { InhibitoryLearningSystem } from './InhibitoryLearningSystem.js';
import { HebbianLearningSystem } from './HebbianLearningSystem.js';
import { HierarchicalContextSystem, ContextLevel, ContextQuery } from './HierarchicalContextSystem.js';
import { AttentionSystem, AttentionType, AttentionContext, AttentionAllocation } from './AttentionSystem.js';
import { BiTemporalKnowledgeModel, BiTemporalEdge, ContextWindow, TemporalQuery, BiTemporalStats } from './BiTemporalKnowledgeModel.js';
import { PatternPredictionEngine, PatternPrediction, EmergingPattern, PredictionEngine } from './PatternPredictionEngine.js';
import { ScalabilityManager } from './ScalabilityManager.js';
import { UserConfigurationManager } from './UserConfigurationManager.js';
import { CustomPatternEngine } from './CustomPatternEngine.js';
import { MultiModalConfidenceFusion, MultiModalConfidence, ConfidenceEvidence, FusedConfidence } from './MultiModalConfidenceFusion.js';
import { EpisodicMemory, Episode, EpisodeContext, EpisodeAction, SimilarityMatch, EpisodeStats } from './EpisodicMemory.js';
import { CallPatternAnalyzer } from './CallPatternAnalyzer.js';

// Service imports
import { QueryService } from './services/QueryService.js';
import { AnalysisService } from './services/AnalysisService.js';
import { ConfigurationService } from './services/ConfigurationService.js';
import { LearningService } from './services/LearningService.js';
import { ScanningService } from './services/ScanningService.js';
import { DocumentIntelligenceService } from './services/DocumentIntelligenceService.js';

import { MindMapNode, MindMapEdge, QueryOptions, QueryResult, FileInfo, ErrorPrediction, RiskAssessment, FixSuggestion, FixContext, HistoricalFix, FixGroup, ArchitecturalInsight, CacheStats, ProcessingProgress, InhibitionResult, ScalabilityConfig, ProjectScale, ResourceUsage, UserPreferences, CustomPatternRule, ProjectLearningConfig, PrivacySettings, UserFeedback } from '../types/index.js';
import { join } from 'path';

export class MindMapEngine {
  private storage: MindMapStorage;
  private scanner: FileScanner;
  private codeAnalyzer: CodeAnalyzer;
  private architecturalAnalyzer: ArchitecturalAnalyzer;
  private advancedQueryEngine: AdvancedQueryEngine;
  private temporalQueryEngine: TemporalQueryEngine;
  private aggregateQueryEngine: AggregateQueryEngine;
  private multiLanguageIntelligence: MultiLanguageIntelligence;
  private languageToolingDetector: LanguageToolingDetector;
  private enhancedFrameworkDetector: EnhancedFrameworkDetector;
  private activationNetwork: ActivationNetwork;
  private queryCache: QueryCache;
  private parallelProcessor: ParallelFileProcessor;
  private inhibitoryLearning: InhibitoryLearningSystem;
  private hebbianLearning: HebbianLearningSystem;
  private hierarchicalContext: HierarchicalContextSystem;
  private attentionSystem: AttentionSystem;
  private biTemporalModel: BiTemporalKnowledgeModel;
  private patternPrediction: PatternPredictionEngine;
  private scalabilityManager: ScalabilityManager;
  private userConfigManager: UserConfigurationManager;
  private customPatternEngine: CustomPatternEngine;
  private multiModalFusion: MultiModalConfidenceFusion;
  private episodicMemory: EpisodicMemory;
  private callPatternAnalyzer: CallPatternAnalyzer;
  private projectRoot: string;

  // Services
  private queryService: QueryService;
  private analysisService: AnalysisService;
  private configurationService: ConfigurationService;
  private learningService: LearningService;
  private scanningService: ScanningService;
  private documentIntelligenceService: DocumentIntelligenceService;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.storage = new MindMapStorage(projectRoot);

    // Initialize UserConfigurationManager first to get ignore patterns
    this.userConfigManager = new UserConfigurationManager(this.projectRoot);

    // Initialize FileScanner with configuration support
    this.scanner = new FileScanner(this.projectRoot, this.getFileScannerOptions());

    this.codeAnalyzer = new CodeAnalyzer();
    this.architecturalAnalyzer = new ArchitecturalAnalyzer(this.storage);
    this.advancedQueryEngine = new AdvancedQueryEngine(this.storage);
    this.temporalQueryEngine = new TemporalQueryEngine(this.storage);
    this.aggregateQueryEngine = new AggregateQueryEngine(this.storage);
    this.multiLanguageIntelligence = new MultiLanguageIntelligence(this.storage);
    this.languageToolingDetector = new LanguageToolingDetector(this.storage);
    this.enhancedFrameworkDetector = new EnhancedFrameworkDetector(this.storage);
    this.activationNetwork = new ActivationNetwork(this.storage);
    this.queryCache = new QueryCache();
    this.parallelProcessor = new ParallelFileProcessor(this.projectRoot, {
      chunkSize: 100,
      maxWorkers: 3,
      timeoutMs: 45000,
      retryAttempts: 3,
      progressCallback: (progress) => this.onProgressUpdate(progress)
    });
    this.inhibitoryLearning = new InhibitoryLearningSystem(this.storage, {
      maxPatterns: 500,
      strengthThreshold: 0.2,
      decayInterval: 2 * 60 * 60 * 1000,
      reinforcementMultiplier: 1.3,
      contextSimilarityThreshold: 0.6
    });
    this.hebbianLearning = new HebbianLearningSystem(this.storage);
    this.hierarchicalContext = new HierarchicalContextSystem(this.storage);
    this.attentionSystem = new AttentionSystem(this.storage);
    this.biTemporalModel = new BiTemporalKnowledgeModel(this.storage);
    this.patternPrediction = new PatternPredictionEngine(this.storage);
    this.scalabilityManager = new ScalabilityManager(this.storage, this.scanner, this.projectRoot);
    this.userConfigManager = new UserConfigurationManager(this.projectRoot);
    this.customPatternEngine = new CustomPatternEngine(this.storage, this.userConfigManager);
    this.multiModalFusion = new MultiModalConfidenceFusion();
    this.episodicMemory = new EpisodicMemory(this.storage);
    this.callPatternAnalyzer = new CallPatternAnalyzer();

    // Initialize services
    this.queryService = new QueryService(
      this.storage,
      this.advancedQueryEngine,
      this.temporalQueryEngine,
      this.aggregateQueryEngine,
      this.activationNetwork,
      this.queryCache,
      this.multiModalFusion,
      this.inhibitoryLearning,
      this.hebbianLearning,
      this.hierarchicalContext,
      this.attentionSystem,
      this.biTemporalModel
    );

    this.analysisService = new AnalysisService(
      this.storage,
      this.architecturalAnalyzer,
      this.multiLanguageIntelligence,
      this.languageToolingDetector,
      this.enhancedFrameworkDetector,
      this.callPatternAnalyzer
    );

    this.configurationService = new ConfigurationService(
      this.userConfigManager,
      this.customPatternEngine,
      this.scalabilityManager
    );

    this.learningService = new LearningService(
      this.storage,
      this.inhibitoryLearning,
      this.hebbianLearning,
      this.hierarchicalContext,
      this.attentionSystem,
      this.biTemporalModel,
      this.patternPrediction,
      this.episodicMemory
    );

    this.scanningService = new ScanningService(
      this.storage,
      this.scanner,
      this.codeAnalyzer,
      this.callPatternAnalyzer,
      this.parallelProcessor,
      this.scalabilityManager,
      this.projectRoot
    );

    this.documentIntelligenceService = new DocumentIntelligenceService(
      this.storage,
      this.hebbianLearning,
      this.hierarchicalContext,
      this.biTemporalModel,
      this.patternPrediction,
      this.projectRoot
    );
  }


  /**
   * Warm the cache with frequently used queries to achieve 65% hit rate
   */
  private async warmCache(): Promise<void> {
    console.log('🔥 Warming cache with common queries...');
    const startTime = Date.now();

    // Common query patterns that should be cached
    const commonQueries = [
      // File and directory queries
      'src',
      'src/core',
      'src/handlers',
      'src/tools',
      'package.json',
      'tsconfig.json',

      // Common code patterns
      'function',
      'class',
      'interface',
      'type',
      'import',
      'export',

      // Framework and language queries
      'typescript',
      'javascript',
      'react',
      'node',

      // Common development queries
      'test',
      'error',
      'TODO',
      'FIXME',

      // Architecture queries
      'MindMapEngine',
      'QueryService',
      'storage',
      'cache',

      // Pattern queries
      'async function',
      'constructor',
      'handler',
      'service'
    ];

    // Default context for cache warming
    const defaultContext = JSON.stringify({
      type: 'default',
      limit: 10,
      useActivation: true,
      activationLevels: 3,
      includeMetadata: false,
      activeFiles: [],
      sessionGoals: [],
      frameworkContext: []
    });

    let warmedCount = 0;
    const queryExecutor = async (query: string, context: string): Promise<QueryResult> => {
      try {
        // Execute query through the query service
        const contextObj = JSON.parse(context);
        return await this.query(query, contextObj);
      } catch (error) {
        console.warn(`Failed to warm cache for query "${query}":`, error);
        return {
          nodes: [],
          edges: [],
          totalMatches: 0,
          queryTime: 0,
          usedActivation: false
        };
      }
    };

    // Execute cache warming through QueryCache
    warmedCount = await this.queryCache.warmCache(queryExecutor);

    // Additionally warm with the common queries list
    for (const query of commonQueries) {
      try {
        // Check if already cached
        const cached = await this.queryCache.get(query, defaultContext);
        if (!cached) {
          // Execute and cache the query
          const result = await this.query(query, { limit: 10 });
          await this.queryCache.set(query, defaultContext, result);
          warmedCount++;

          // Rate limit to avoid overload
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (error) {
        console.warn(`Cache warming failed for query "${query}":`, error);
      }
    }

    const warmTime = Date.now() - startTime;
    const stats = this.queryCache.getStats();

    console.log(`✨ Cache warming completed in ${warmTime}ms`);
    console.log(`📊 Warmed ${warmedCount} queries, cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
  }

  /**
   * Get FileScanner options from user configuration
   */
  private getFileScannerOptions(): FileScannerOptions {
    try {
      const projectConfig = this.userConfigManager.getProjectConfig();
      return {
        ignorePatterns: projectConfig?.ignorePatterns || [],
        useGitignore: true,
        useMindMapIgnore: true,
        customIgnoreFiles: []
      };
    } catch (error) {
      // Configuration not initialized yet, use defaults
      return {
        ignorePatterns: [],
        useGitignore: true,
        useMindMapIgnore: true,
        customIgnoreFiles: []
      };
    }
  }


  // Accessor Methods
  getFileScanner(): FileScanner {
    return this.scanner;
  }

  getConfigurationService() {
    return this.configurationService;
  }

  // Core Query Methods - delegate to QueryService
  async query(query: string, options: QueryOptions = {}): Promise<QueryResult> {
    return await this.queryService.query(query, options);
  }

  // Project Scanning Methods - delegate to ScanningService
  async scanProject(forceRescan: boolean = false, includeAnalysis: boolean = true): Promise<any> {
    return await this.scanningService.scanProject(forceRescan, includeAnalysis);
  }

  async scanProjectWithRoot(projectRoot: string, forceRescan: boolean = false, includeAnalysis: boolean = true): Promise<void> {
    // Create temporary scanning components for the specified project root
    const tempStorage = new MindMapStorage(projectRoot);
    const tempScanner = new FileScanner(projectRoot);
    const tempParallelProcessor = new ParallelFileProcessor(projectRoot, {
      chunkSize: 100,
      maxWorkers: 3,
      timeoutMs: 45000,
    });

    const tempScanningService = new ScanningService(
      tempStorage,
      tempScanner,
      this.codeAnalyzer,
      this.callPatternAnalyzer,
      tempParallelProcessor,
      this.scalabilityManager,
      projectRoot
    );

    // Perform the scan with the temporary service
    await tempScanningService.scanProject(forceRescan, includeAnalysis);

    // Copy the results to the main storage
    const tempGraph = tempStorage.getGraph();
    const mainGraph = this.storage.getGraph();

    // Clear existing nodes and edges for the project root being scanned
    const projectRootNormalized = projectRoot.replace(/\\/g, '/');
    for (const [nodeId, node] of mainGraph.nodes) {
      if (node.path && (node.path.startsWith(projectRootNormalized) || node.path.startsWith(projectRoot))) {
        mainGraph.nodes.delete(nodeId);
      }
    }

    // Add nodes and edges from temp storage
    for (const [nodeId, node] of tempGraph.nodes) {
      mainGraph.nodes.set(nodeId, node);
    }
    for (const [edgeId, edge] of tempGraph.edges) {
      mainGraph.edges.set(edgeId, edge);
    }

    // Update scan metadata
    mainGraph.lastScan = tempGraph.lastScan;

    // Save the updated graph
    await this.storage.save();
  }

  async scanProjectLegacy(): Promise<void> {
    await this.scanningService.scanProjectLegacy();
  }

  // Analysis Methods - delegate to AnalysisService
  predictPotentialErrors(filePath?: string): ErrorPrediction[] {
    return this.analysisService.predictPotentialErrors(filePath);
  }

  suggestFixes(errorMessage: string, errorType?: string, filePath?: string, context?: FixContext): FixSuggestion[] {
    return this.analysisService.suggestFixes(errorMessage, errorType, filePath, context);
  }

  async analyzeArchitecture(): Promise<ArchitecturalInsight[]> {
    return await this.analysisService.analyzeArchitecture();
  }

  async getArchitecturalInsights(): Promise<ArchitecturalInsight[]> {
    return await this.analysisService.getArchitecturalInsights();
  }

  async analyzeCallPatterns(filePaths?: string[], includeMetrics: boolean = true) {
    return await this.analysisService.analyzeCallPatterns(filePaths, includeMetrics);
  }

  async detectFrameworks(categories?: string[], forceRefresh: boolean = false, minConfidence: number = 0.3) {
    return await this.analysisService.detectFrameworks(categories, forceRefresh, minConfidence);
  }

  async detectProjectTooling(languageFilter?: string[], forceRefresh: boolean = false) {
    return await this.analysisService.detectProjectTooling(languageFilter, forceRefresh);
  }

  // Configuration Methods - delegate to ConfigurationService
  getUserPreferences(): UserPreferences {
    return this.configurationService.getUserPreferences();
  }

  async updateUserPreferences(updates: Partial<UserPreferences>): Promise<void> {
    await this.configurationService.updateUserPreferences(updates);
  }

  getPrivacySettings(): PrivacySettings {
    return this.configurationService.getPrivacySettings();
  }

  async updatePrivacySettings(updates: Partial<PrivacySettings>): Promise<void> {
    await this.configurationService.updatePrivacySettings(updates);
  }

  getProjectLearningConfig(): ProjectLearningConfig | undefined {
    return this.configurationService.getProjectLearningConfig();
  }

  async updateProjectLearningConfig(config: Partial<ProjectLearningConfig>): Promise<void> {
    await this.configurationService.updateProjectLearningConfig(config);
  }

  async addCustomPattern(pattern: Omit<CustomPatternRule, 'id' | 'created' | 'lastModified'>): Promise<string> {
    return await this.configurationService.addCustomPattern(pattern);
  }

  async updateCustomPattern(id: string, updates: Partial<CustomPatternRule>): Promise<void> {
    await this.configurationService.updateCustomPattern(id, updates);
  }

  async removeCustomPattern(id: string): Promise<void> {
    await this.configurationService.removeCustomPattern(id);
  }

  getCustomPatterns(): CustomPatternRule[] {
    return this.configurationService.getCustomPatterns();
  }

  async testCustomPattern(pattern: CustomPatternRule, sampleText: string) {
    return await this.configurationService.testCustomPattern(pattern.id, sampleText);
  }

  async submitFeedback(feedback: Omit<UserFeedback, 'id' | 'status' | 'created' | 'lastModified'>): Promise<string> {
    return await this.configurationService.recordUserFeedback(feedback.type, feedback.comment, feedback.rating, feedback.context);
  }

  async getUserFeedback(status?: UserFeedback['status']): Promise<UserFeedback[]> {
    return await this.configurationService.getUserFeedback(status);
  }

  async markFeedbackResolved(feedbackId: string): Promise<void> {
    await this.configurationService.markFeedbackResolved(feedbackId);
  }

  async exportUserConfiguration(): Promise<string> {
    return await this.configurationService.exportConfiguration();
  }

  async importUserConfiguration(configData: string, merge: boolean = false): Promise<void> {
    return await this.configurationService.importConfiguration(configData);
  }

  async resetUserConfiguration(): Promise<void> {
    const defaultPreferences: UserPreferences = {
      theme: 'auto',
      language: 'en',
      timezone: 'UTC',
      enableIntelligentSuggestions: true,
      confidenceThreshold: 0.6,
      maxResults: 50,
      autoScanOnChange: true,
      enableLearning: true,
      learningRate: 0.1,
      rememberFailures: true,
      adaptToWorkflow: true,
      collectTelemetry: false,
      shareUsageData: false,
      localStorageOnly: true,
      maxMemoryUsage: 512 * 1024 * 1024,
      enableCaching: true,
      parallelProcessing: true,
      backgroundScanning: false
    };
    await this.configurationService.updateUserPreferences(defaultPreferences);
  }

  getScalabilityConfig(): ScalabilityConfig {
    return this.configurationService.getScalabilityConfig();
  }

  updateScalabilityConfig(config: Partial<ScalabilityConfig>): void {
    this.configurationService.updateScalabilityConfig(config);
  }

  getResourceUsage(): ResourceUsage {
    return this.configurationService.getResourceUsage();
  }

  // Learning Methods - delegate to LearningService

  async getHebbianAssociations(nodeId: string, threshold: number = 0.5) {
    return [];
  }

  async storeEpisode(action: EpisodeAction, context: EpisodeContext, outcome: 'success' | 'failure'): Promise<string> {
    const actions: EpisodeAction[] = [action];
    return await this.learningService.storeEpisode(action.target, context, actions, outcome);
  }

  async getEpisodeBasedSuggestions(currentContext: EpisodeContext): Promise<Episode[]> {
    return await this.learningService.getEpisodeBasedSuggestions(currentContext);
  }

  getEpisodicStats(): EpisodeStats {
    return this.learningService.getEpisodicStats();
  }

  async consolidateEpisodicMemories(): Promise<void> {
    return await this.episodicMemory.consolidateMemories();
  }

  async createContextWindow(name: string, validTimeStart: string, validTimeEnd?: string, description?: string, frameworkVersions?: Record<string, string>): Promise<string> {
    const window = await this.learningService.createContextWindow(name, new Date(validTimeStart), validTimeEnd ? new Date(validTimeEnd) : undefined, description, frameworkVersions);
    return window.id;
  }

  async invalidateRelationship(edgeId: string, invalidationDate?: string, reason?: string, evidence?: string[]): Promise<void> {
    await this.learningService.invalidateRelationship(edgeId, invalidationDate ? new Date(invalidationDate) : undefined, reason, evidence);
  }

  // Utility Methods
  updateFromTask(task: any): void {
    // Simple task outcome recording
    if (typeof task === 'string') {
      console.log(`Task: ${task}`);
    } else {
      console.log(`Task: ${task.task}, Outcome: ${task.outcome}`);
    }
  }

  getStats() {
    const graph = this.storage.getGraph();
    const nodeCount = graph.nodes.size;
    const edgeCount = graph.edges.size;

    // Count nodes by type
    const nodesByType: Record<string, number> = {};
    for (const [_, node] of graph.nodes) {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    }

    // Calculate average confidence
    let totalConfidence = 0;
    let nodeCountWithConfidence = 0;
    for (const [_, node] of graph.nodes) {
      if (node.confidence) {
        totalConfidence += node.confidence;
        nodeCountWithConfidence++;
      }
    }
    const averageConfidence = nodeCountWithConfidence > 0 ? totalConfidence / nodeCountWithConfidence : 0;

    return {
      nodeCount,
      edgeCount,
      projectRoot: this.projectRoot,
      nodesByType,
      averageConfidence
    };
  }

  // Advanced Query System Methods
  async executeAdvancedQuery(query: string, parameters?: Record<string, any>, explain = false): Promise<any> {
    const result = await this.advancedQueryEngine.executeQuery(query, parameters);
    return result;
  }

  async executeTemporalQuery(query: any): Promise<any> {
    return await this.temporalQueryEngine.executeTemporalQuery(query);
  }

  async executeAggregateQuery(query: any): Promise<any> {
    return await this.aggregateQueryEngine.executeAggregate(query);
  }

  async analyzeProjectScale(): Promise<any> {
    return await this.scalabilityManager.analyzeProjectScale();
  }

  getSavedQueries(): any[] {
    return [];
  }

  async executeSavedQuery(queryId: string, parameters?: any): Promise<any> {
    return { results: [], queryId, parameters };
  }

  async saveQuery(name: string, description: string, query: string, queryType: string = 'advanced', parameters?: any): Promise<string> {
    return `saved_${Date.now()}`;
  }

  // Cache Management
  getCacheStats(): CacheStats {
    return this.queryCache.getStats();
  }

  clearCache(): void {
    // Clear cache implementation
    (this.queryCache as any).cache?.clear();
  }


  getQueryCacheStats(): any {
    return this.queryCache.getStats();
  }

  getInhibitoryLearningStats(): any {
    return this.inhibitoryLearning.getStats();
  }

  getHebbianLearningStats(): any {
    return this.hebbianLearning.getStats();
  }

  async recordCoActivation(primaryNodeId: string, coActivatedNodes: string[], context: string, strength: number): Promise<void> {
    await this.hebbianLearning.recordCoActivation(primaryNodeId, coActivatedNodes, context, strength);
  }

  getMultiModalFusionStats(): any {
    return {};
  }

  getHierarchicalContextStats(): any {
    return {};
  }


  getBiTemporalStats(): any {
    return {};
  }

  getPredictionEngineStats(): any {
    return {};
  }

  // Progress callback for parallel processing
  private onProgressUpdate(progress: ProcessingProgress): void {
    // Handle progress updates
  }

  // Additional methods for MCP compatibility
  async initialize(): Promise<void> {
    // Initialize user configuration first
    await this.userConfigManager.initialize();
    await this.configurationService.initialize();

    // Reload FileScanner with proper configuration now
    const newOptions = this.getFileScannerOptions();
    await this.scanner.updateIgnorePatterns(newOptions.ignorePatterns);

    // Load existing data from storage
    try {
      await this.storage.load();
      console.log('✅ Mind map data loaded from storage');
    } catch (error) {
      console.log('ℹ️ No existing mind map data found, starting fresh');
    }
  }

  async save(): Promise<void> {
    await this.storage.save();
    console.log('💾 Mind map data saved to storage');
  }

  async generateInsights(): Promise<any> {
    return await this.analysisService.performComprehensiveAnalysis();
  }

  async detectCrossLanguageDependencies(options?: any): Promise<any[]> {
    return await this.analysisService.detectCrossLanguageDependencies(options);
  }

  async analyzePolyglotProject(options?: any): Promise<any> {
    return await this.analysisService.analyzePolyglotProject(options);
  }

  async generateMultiLanguageRefactorings(options?: any): Promise<any[]> {
    return await this.analysisService.generateMultiLanguageRefactorings(options);
  }

  async runLanguageTool(toolName: string, language: string, args?: string[], timeout?: number): Promise<any> {
    return await this.analysisService.runLanguageTool(toolName, language, args, timeout);
  }

  async getToolingRecommendations(includeInstallCommands?: boolean, priorityFilter?: string): Promise<any[]> {
    return await this.analysisService.getToolingRecommendations(includeInstallCommands, priorityFilter);
  }

  async runToolSuite(options?: any): Promise<any> {
    return await this.analysisService.runToolSuite(options);
  }

  async detectEnhancedFrameworks(categories?: string[], forceRefresh?: boolean, minConfidence?: number): Promise<any[]> {
    return await this.detectFrameworks(categories, forceRefresh, minConfidence);
  }

  async getFrameworkRecommendations(frameworkNames?: string[], recommendationType?: string): Promise<any[]> {
    return await this.analysisService.getFrameworkRecommendations(frameworkNames, recommendationType);
  }

  invalidateCache(affectedPaths?: string[]): void {
    this.clearCache();
  }

  getHebbianStats(): any {
    return this.getHebbianLearningStats();
  }

  getContextSummary(level?: number): any {
    return this.hierarchicalContext.getContextSummary();
  }

  async allocateAttention(nodeIds: string[], attentionType?: string, context?: any): Promise<void> {
    // Attention allocation
  }

  async updateAttentionFromActivity(actionType: string, nodeIds?: string[], queryText?: string): Promise<void> {
    // Update attention from activity
  }

  async queryBiTemporal(query: any): Promise<any> {
    return this.biTemporalModel.queryBiTemporal(query);
  }

  async createTemporalSnapshot(name?: string): Promise<any> {
    return { id: `snapshot_${Date.now()}`, name };
  }

  async getPatternPredictions(patternType?: string): Promise<any[]> {
    return [];
  }

  async getEmergingPatterns(emergenceStage?: string): Promise<any[]> {
    return this.patternPrediction.getEmergingPatterns(emergenceStage as any);
  }

  async predictPatternEmergence(patternType: string): Promise<any> {
    return { patternType, prediction: 'future' };
  }

  async analyzeAndPredict(): Promise<any> {
    return this.patternPrediction.analyzeAndPredict();
  }

  // Attention System Methods
  getAttentionStats(): any {
    return this.attentionSystem.getAttentionStats();
  }

  // Document Intelligence Methods (Phase 7.5)
  async analyzeProjectDocumentation(): Promise<any> {
    return await this.documentIntelligenceService.analyzeProjectDocumentation();
  }

  async analyzeDocument(filePath: string): Promise<any> {
    return await this.documentIntelligenceService.analyzeDocument(filePath);
  }

  async getDocumentationStatistics(): Promise<any> {
    const analysis = await this.documentIntelligenceService.analyzeProjectDocumentation();
    return analysis.statistics;
  }

  async getDocumentationInsights(): Promise<any> {
    const analysis = await this.documentIntelligenceService.analyzeProjectDocumentation();
    return analysis.insights;
  }

  async getDocumentRelationships(): Promise<any> {
    const analysis = await this.documentIntelligenceService.analyzeProjectDocumentation();
    return analysis.relationships;
  }
}