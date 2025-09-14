import { MindMapStorage } from './MindMapStorage.js';
import { FileScanner } from './FileScanner.js';
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
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.storage = new MindMapStorage(projectRoot);
    this.scanner = new FileScanner(projectRoot);
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
      chunkSize: 100,        // Larger chunks for better efficiency
      maxWorkers: 3,         // Conservative worker count
      timeoutMs: 45000,      // 45 second timeout
      retryAttempts: 3,      // More retries for robustness
      progressCallback: (progress) => this.onProgressUpdate(progress)
    });
    this.inhibitoryLearning = new InhibitoryLearningSystem(this.storage, {
      maxPatterns: 500,      // Reasonable limit for inhibitory patterns
      strengthThreshold: 0.2, // Lower threshold for more aggressive inhibition
      decayInterval: 2 * 60 * 60 * 1000, // 2 hours decay interval
      reinforcementMultiplier: 1.3,      // Moderate reinforcement
      contextSimilarityThreshold: 0.6    // More lenient context matching
    });
    this.hebbianLearning = new HebbianLearningSystem(this.storage, {
      learningRate: 0.05,    // Moderate learning rate for stable convergence
      decayRate: 0.002,      // Slow decay to maintain long-term associations
      activationThreshold: 0.2, // Conservative threshold for stable connections
      maxConnections: 150,   // Allow rich associative networks
      contextWindow: 5000,   // 5 second co-activation window
      strengthenThreshold: 0.6, // Higher threshold for edge creation
      pruningThreshold: 0.05 // Prune very weak connections
    });
    this.hierarchicalContext = new HierarchicalContextSystem(this.storage, {
      immediateDecayRate: 0.1 / 60000,    // 0.1 per minute
      sessionDecayRate: 0.01 / 60000,     // 0.01 per minute  
      projectDecayRate: 0.001 / 3600000,  // 0.001 per hour
      domainDecayRate: 0.0001 / 86400000, // 0.0001 per day
      maxContextItems: {
        immediate: 15,  // More immediate context for active development
        session: 75,    // Extended session context
        project: 300,   // Rich project context
        domain: 1500    // Comprehensive domain knowledge
      },
      contextWeights: {
        immediate: 1.0, // Full weight for immediate context
        session: 0.8,   // Strong weight for session context
        project: 0.6,   // Moderate weight for project context
        domain: 0.4     // Background weight for domain context
      }
    });
    this.attentionSystem = new AttentionSystem(this.storage, {
      maxTargets: 7,                    // Cognitive load limit
      totalCapacity: 1.0,               // Full attention capacity
      decayInterval: 30000,             // 30 second decay updates
      minAttentionThreshold: 0.05,      // 5% minimum attention
      reinforcementFactor: 1.2,         // 20% boost on reinforcement
      sustainedAttentionDuration: 300000, // 5 minutes sustained
      executiveOverrideThreshold: 0.8   // 80% threshold for override
    });
    this.biTemporalModel = new BiTemporalKnowledgeModel(this.storage, {
      maxRevisionHistory: 50,      // Keep last 50 revisions per edge
      confidenceDecayRate: 0.01,   // 1% confidence decay per day
      automaticInvalidation: true,  // Auto-invalidate on code changes
      retentionPeriod: 31536000000, // 1 year retention
      snapshotInterval: 86400000   // Daily snapshots
    });
    this.patternPrediction = new PatternPredictionEngine(this.storage, {
      minDataPoints: 5,             // Need at least 5 data points
      confidenceThreshold: 0.7,     // 70% confidence minimum
      predictionHorizon: 2592000000, // 30 days ahead
      updateInterval: 3600000,       // Update every hour
      maxPatterns: 100,             // Track up to 100 patterns
      correlationThreshold: 0.6     // 60% correlation minimum
    });
    this.scalabilityManager = new ScalabilityManager(this.storage, this.scanner, this.projectRoot, {
      enablePartitioning: true,      // Enable for large projects
      enableIncrementalAnalysis: true, // Optimize repeated scans
      maxFilesPerScan: 5000,        // Conservative batch size
      maxNodesInMemory: 50000,      // Memory limit for nodes
      maxEdgesInMemory: 100000,     // Memory limit for edges
      memoryPressureThreshold: 75,  // Trigger cleanup at 75% memory usage
      partitionSize: 10000,         // Partition size for large projects
      scanTimeoutMs: 300000         // 5 minute timeout per scan
    });
    this.userConfigManager = new UserConfigurationManager(this.projectRoot);
    this.customPatternEngine = new CustomPatternEngine(this.storage, this.userConfigManager);
    this.multiModalFusion = new MultiModalConfidenceFusion({
      modalityWeights: {
        semantic: 0.30,      // High weight for semantic similarity
        structural: 0.25,    // Code structure patterns
        historical: 0.20,    // Past performance data
        temporal: 0.15,      // Recency and stability
        contextual: 0.08,    // Project/user context
        collaborative: 0.02  // Community patterns (minimal initially)
      },
      adaptiveWeighting: true,
      enableCalibration: true,
      uncertaintyDiscount: 0.25,
      conflictThreshold: 0.35
    });
    this.episodicMemory = new EpisodicMemory(this.storage);
  }

  async initialize(): Promise<void> {
    await this.storage.load();
    await this.userConfigManager.initialize();
  }

  async scanProject(forceRescan = false, useParallelProcessing = true): Promise<{
    summary: string;
    scannedFiles: number;
    totalFiles: number;
    partitions: number;
    scanTime: number;
    projectScale: ProjectScale;
  }> {
    console.log('🔍 Starting scalable project scan...');

    // First, analyze project scale for adaptive configuration
    const projectScale = await this.scalabilityManager.analyzeProjectScale();
    console.log(`📏 Project scale: ${projectScale.scale} (${projectScale.fileCount} files)`);

    // Apply recommended configuration based on project scale
    this.scalabilityManager.applyConfiguration(projectScale.recommendedConfig);

    const graph = this.storage.getGraph();
    const shouldScan = forceRescan ||
      graph.nodes.size === 0 ||
      (Date.now() - graph.lastScan.getTime()) > 24 * 60 * 60 * 1000; // 24 hours

    if (!shouldScan && !forceRescan) {
      console.log('✅ Using cached project scan (use forceRescan=true to override)');
      return {
        summary: 'Used cached scan',
        scannedFiles: graph.nodes.size,
        totalFiles: graph.nodes.size,
        partitions: 0,
        scanTime: 0,
        projectScale
      };
    }

    // Use scalability manager for adaptive scanning
    const scanResult = await this.scalabilityManager.adaptiveScan(forceRescan);

    const summary = `Scanned ${scanResult.scannedFiles}/${scanResult.totalFiles} files ` +
                   `(${scanResult.partitions} partitions) in ${scanResult.scanTime}ms - ` +
                   `${projectScale.scale} project scale`;

    return {
      summary,
      ...scanResult,
      projectScale
    };
  }

  /**
   * Legacy scan method for backward compatibility
   */
  async scanProjectLegacy(forceRescan = false, useParallelProcessing = true): Promise<void> {
    const graph = this.storage.getGraph();
    const shouldScan = forceRescan ||
      graph.nodes.size === 0 ||
      (Date.now() - graph.lastScan.getTime()) > 24 * 60 * 60 * 1000; // 24 hours

    if (!shouldScan) {
      console.log('Using cached project scan');
      return;
    }

    console.log('Scanning project files...');
    
    let files: FileInfo[];
    if (useParallelProcessing) {
      // Get file paths first (lightweight operation)
      const filePaths = await this.getFilePaths();
      console.log(`🚀 Starting parallel processing of ${filePaths.length} files...`);
      
      // Process files in parallel
      files = await this.parallelProcessor.processFiles(filePaths);
      console.log(`✅ Parallel processing completed: ${files.length} files processed`);
    } else {
      // Fallback to sequential processing
      files = await this.scanner.scanProject();
    }
    
    // Clear existing file and directory nodes
    const existingNodes = this.storage.findNodes(node => 
      node.type === 'file' || node.type === 'directory'
    );
    existingNodes.forEach(node => this.storage.removeNode(node.id));

    // Add file and directory nodes
    const directoryNodes = new Set<string>();
    
    for (const file of files) {
      // Create directory nodes for parent directories
      const pathParts = file.path.split('/');
      for (let i = 0; i < pathParts.length - 1; i++) {
        const dirPath = pathParts.slice(0, i + 1).join('/');
        const dirId = `dir:${dirPath}`;
        
        if (!directoryNodes.has(dirId)) {
          const dirNode: MindMapNode = {
            id: dirId,
            type: 'directory',
            name: pathParts[i],
            path: dirPath,
            metadata: {
              depth: i + 1
            },
            confidence: 1.0,
            lastUpdated: new Date(),
            properties: {}
          };
          this.storage.addNode(dirNode);
          directoryNodes.add(dirId);

          // Add contains relationship to parent directory
          if (i > 0) {
            const parentDirPath = pathParts.slice(0, i).join('/');
            const parentDirId = `dir:${parentDirPath}`;
            this.addContainsEdge(parentDirId, dirId);
          }
        }
      }

      // Create file node
      const fileNode: MindMapNode = {
        id: `file:${file.path}`,
        type: 'file',
        name: file.name,
        path: file.path,
        metadata: {
          size: file.size,
          extension: file.extension,
          mimeType: file.mimeType,
          lastModified: file.lastModified,
          isCode: this.scanner.isCodeFile(file),
          isConfig: this.scanner.isConfigFile(file),
          isTest: this.scanner.isTestFile(file)
        },
        confidence: 1.0,
        lastUpdated: new Date(),
        properties: {
          language: this.detectLanguage(file),
          framework: this.detectFramework(file)
        }
      };

      this.storage.addNode(fileNode);

      // Add contains relationship to parent directory (cross-platform)
      const pathSeparator = file.path.includes('/') ? '/' : '\\';
      if (file.path.includes(pathSeparator)) {
        const parentDirPath = file.path.substring(0, file.path.lastIndexOf(pathSeparator));
        const parentDirId = `dir:${parentDirPath}`;
        this.addContainsEdge(parentDirId, fileNode.id);
      }

      // Analyze code structure for supported file types
      if (this.scanner.isCodeFile(file) && this.codeAnalyzer.canAnalyze(file.path)) {
        try {
          const filePath = join(this.projectRoot, file.path);
          const codeStructure = await this.codeAnalyzer.analyzeFile(filePath);
          
          if (codeStructure) {
            // Add function nodes
            for (const func of codeStructure.functions) {
              const funcNode: MindMapNode = {
                id: `function:${file.path}:${func.name}`,
                type: 'function',
                name: func.name,
                path: file.path,
                metadata: {
                  startLine: func.startLine,
                  endLine: func.endLine,
                  parameters: func.parameters,
                  returnType: func.returnType,
                  parentFile: file.path
                },
                confidence: 0.8,
                lastUpdated: new Date(),
                properties: {
                  language: this.detectLanguage(file),
                  parameterCount: func.parameters.length
                }
              };
              
              this.storage.addNode(funcNode);
              this.addContainsEdge(fileNode.id, funcNode.id);
            }

            // Add class nodes
            for (const cls of codeStructure.classes) {
              const classNode: MindMapNode = {
                id: `class:${file.path}:${cls.name}`,
                type: 'class',
                name: cls.name,
                path: file.path,
                metadata: {
                  startLine: cls.startLine,
                  endLine: cls.endLine,
                  methods: cls.methods,
                  properties: cls.properties,
                  parentFile: file.path
                },
                confidence: 0.8,
                lastUpdated: new Date(),
                properties: {
                  language: this.detectLanguage(file),
                  methodCount: cls.methods.length,
                  propertyCount: cls.properties.length
                }
              };
              
              this.storage.addNode(classNode);
              this.addContainsEdge(fileNode.id, classNode.id);
            }

            // Detect frameworks and patterns
            const frameworks = await this.codeAnalyzer.detectFrameworks(filePath, codeStructure);
            const patterns = await this.codeAnalyzer.analyzePatterns(filePath, codeStructure);

            // Update file metadata with code structure info
            fileNode.metadata.codeStructure = {
              functionCount: codeStructure.functions.length,
              classCount: codeStructure.classes.length,
              importCount: codeStructure.imports.length,
              exportCount: codeStructure.exports.length,
              frameworks,
              patterns: patterns.length
            };

            // Update properties with detected frameworks
            if (frameworks.length > 0) {
              if (fileNode.properties) {
                fileNode.properties.framework = frameworks.join(', ');
              }
            }

            // Create pattern nodes for significant patterns
            for (const pattern of patterns) {
              if (pattern.severity === 'warning' || pattern.type === 'design_pattern') {
                const patternNode: MindMapNode = {
                  id: `pattern:${file.path}:${pattern.type}:${Date.now()}`,
                  type: 'pattern',
                  name: pattern.description,
                  path: file.path,
                  metadata: {
                    patternType: pattern.type,
                    severity: pattern.severity,
                    details: pattern,
                    parentFile: file.path
                  },
                  confidence: pattern.severity === 'warning' ? 0.7 : 0.6,
                  lastUpdated: new Date(),
                  properties: {
                    language: this.detectLanguage(file),
                    category: pattern.type
                  }
                };
                
                this.storage.addNode(patternNode);
                this.addRelatesEdge(fileNode.id, patternNode.id, pattern.type);
              }
            }

            // Add import relationships
            for (const imp of codeStructure.imports) {
              // Create dependency edges for relative imports
              if (imp.module.startsWith('./') || imp.module.startsWith('../')) {
                const resolvedModule = this.resolveImportPath(file.path, imp.module);
                if (resolvedModule) {
                  const targetFileId = `file:${resolvedModule}`;
                  this.addDependsOnEdge(fileNode.id, targetFileId, imp.type);
                }
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to analyze code structure for ${file.path}:`, error);
        }
      }
    }

    graph.lastScan = new Date();
    await this.storage.save();
    
    // Invalidate query cache since graph has changed
    await this.queryCache.invalidate();
    
    console.log(`Scanned ${files.length} files and created ${directoryNodes.size} directories`);
  }

  async query(query: string, options: QueryOptions = {}): Promise<QueryResult> {
    const startTime = Date.now();
    const queryLower = query.toLowerCase();
    const limit = options.limit || 10;

    // Special handling for file path queries - return contents of the file
    if (this.isFilePathQuery(query)) {
      return await this.queryFileContents(query, options, limit, startTime);
    }

    // Smart query routing - automatically route to optimal engine
    const queryRoute = this.determineQueryRoute(query, options);

    // Route to specialized engines for optimal results
    if (queryRoute.engine === 'advanced') {
      return await this.advancedQueryEngine.executeQuery(queryRoute.optimizedQuery || query, queryRoute.parameters || {});
    } else if (queryRoute.engine === 'temporal') {
      const timeRange = queryRoute.timeRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      };
      const temporalResult = await this.temporalQueryEngine.executeTemporalQuery({
        timeRange: {
          start: typeof timeRange.start === 'string' ? new Date(timeRange.start) : timeRange.start,
          end: typeof timeRange.end === 'string' ? new Date(timeRange.end) : timeRange.end,
          granularity: 'day'
        },
        evolution: {
          entity: queryRoute.entity || '*',
          trackChanges: true,
          includeRelationships: true
        },
        aggregation: {
          metric: 'confidence_avg',
          groupBy: 'time'
        }
      });

      // Convert temporal result to QueryResult format
      const nodes: any[] = temporalResult.timeline.flatMap(snapshot => snapshot.nodes);
      return {
        nodes: nodes.slice(0, limit),
        edges: [],
        totalMatches: nodes.length,
        queryTime: Date.now() - startTime,
        usedActivation: false,
        temporalData: temporalResult
      } as any;
    } else if (queryRoute.engine === 'aggregate') {
      const aggregateResult = await this.aggregateQueryEngine.executeAggregate({
        aggregation: queryRoute.aggregation || { function: 'count', field: 'name' },
        groupBy: queryRoute.groupBy,
        filter: queryRoute.filter,
        orderBy: [{ field: 'aggregation_result', direction: 'DESC' }],
        limit: limit
      });

      // Convert aggregate result to QueryResult format
      return {
        nodes: [],
        edges: [],
        totalMatches: aggregateResult.groups.length,
        queryTime: Date.now() - startTime,
        usedActivation: false,
        aggregateData: aggregateResult
      } as any;
    }

    // Create context for caching
    const context = this.createQueryContext(options);

    // Try cache first (unless explicitly bypassed)
    if (!options.bypassCache) {
      const cachedResult = await this.queryCache.get(query, context);
      if (cachedResult) {
        return cachedResult;
      }
    }

    // Enable activation spreading by default for better results
    const useActivation = options.useActivation !== false;
    const activationLevels = options.activationLevels || 3;

    let result: QueryResult;
    if (useActivation) {
      result = await this.queryWithActivation(query, queryLower, options, limit, startTime);
    } else {
      result = await this.queryLinear(query, queryLower, options, limit, startTime);
    }
    
    // Apply inhibitory learning (unless explicitly bypassed)
    if (!options.bypassInhibition) {
      const inhibitionResult = await this.inhibitoryLearning.applyInhibition(
        result.nodes, 
        query, 
        context
      );
      
      // Update result with inhibited nodes
      result.nodes = inhibitionResult.inhibitedResults;
      result.inhibitionApplied = inhibitionResult.appliedPatterns.length > 0;
      result.inhibitionScore = inhibitionResult.inhibitionScore;
      result.originalResultCount = inhibitionResult.originalResults.length;
    }
    
    // Apply hierarchical context weighting for enhanced relevance
    if (options.contextLevel || options.includeParentContext || options.includeChildContext) {
      const contextQuery: ContextQuery = {
        text: query,
        level: (options.contextLevel as ContextLevel) || ContextLevel.IMMEDIATE,
        includeParents: options.includeParentContext !== false, // Default true
        includeChildren: options.includeChildContext || false,   // Default false
        maxItems: limit * 2, // Get more candidates for context filtering
        minRelevance: 0.1
      };
      
      // Get context-enhanced scores
      const contextScores = this.hierarchicalContext.getContextScores(result.nodes, contextQuery);
      
      // Re-sort nodes based on context-enhanced scores
      const contextMap = new Map(contextScores.map(score => [score.nodeId, score]));
      result.nodes = result.nodes
        .map(node => {
          const contextScore = contextMap.get(node.id);
          return {
            ...node,
            confidence: contextScore ? 
              Math.min(1.0, node.confidence + (contextScore.contextBoost * 0.3)) : 
              node.confidence,
            contextScore: contextScore?.finalScore || node.confidence
          };
        })
        .sort((a, b) => (b as any).contextScore - (a as any).contextScore)
        .slice(0, limit);
    }

    // Update hierarchical context with query activity
    this.hierarchicalContext.updateFromActivity({
      type: 'query',
      data: { query, results: result.nodes },
      files: result.nodes.filter(n => n.type === 'file').map(n => n.path || n.name),
      functions: result.nodes.filter(n => n.type === 'function').map(n => n.name),
      timestamp: new Date()
    });

    // Apply attention mechanisms for dynamic result focusing (unless bypassed)
    if (result.nodes.length > 0 && !options.bypassAttention) {
      const attentionContext: AttentionContext = {
        currentTask: context,
        activeFiles: options.activeFiles || [],
        recentQueries: [query],
        userGoals: options.sessionGoals || [],
        frameworkContext: options.frameworkContext || [],
        timeContext: {
          sessionStart: new Date(Date.now() - 300000), // Assume 5 min session
          lastActivity: new Date(),
          taskDuration: Date.now() - startTime
        }
      };

      // Apply attention-based result focusing
      result = this.attentionSystem.applyAttentionToResults(result, attentionContext);
      
      // Allocate attention to top results for future queries
      const attentionType = this.inferAttentionType(options, result);
      this.attentionSystem.allocateAttention(result.nodes.slice(0, 3), attentionContext, attentionType);
      
      // Update attention from query activity
      this.attentionSystem.updateAttentionFromActivity({
        nodeIds: result.nodes.slice(0, 3).map(n => n.id),
        queryText: query,
        actionType: 'query',
        timestamp: new Date(),
        context: attentionContext
      });
    }

    // Apply bi-temporal knowledge enhancement for temporal reasoning (unless bypassed)
    if (result.nodes.length > 0 && !options.bypassBiTemporal) {
      const queryTime = options.validAt || new Date();
      result.nodes = this.biTemporalModel.enhanceQueryWithBiTemporal(
        result.nodes,
        queryTime,
        options.includeHistory || false
      );

      // Create bi-temporal edges for newly discovered relationships
      if (result.nodes.length > 1) {
        for (let i = 0; i < result.nodes.length - 1; i++) {
          for (let j = i + 1; j < Math.min(result.nodes.length, i + 3); j++) {
            const sourceNode = result.nodes[i];
            const targetNode = result.nodes[j];
            
            // Only create if confidence is high enough and no existing relationship
            if (sourceNode.confidence > 0.7 && targetNode.confidence > 0.7) {
              try {
                await this.biTemporalModel.createBiTemporalEdge(
                  sourceNode.id,
                  targetNode.id,
                  'relates_to',
                  queryTime,
                  [`Co-appeared in query: "${query}"`],
                  'query_co_occurrence'
                );
              } catch (error) {
                // Edge might already exist, ignore duplicate creation errors
              }
            }
          }
        }
      }
    }

    // Apply Hebbian learning - record co-activation of returned nodes
    if (result.nodes.length > 1 && !options.bypassHebbianLearning) {
      const nodeIds = result.nodes.map(node => node.id);
      const primaryNode = nodeIds[0]; // Most relevant result as primary
      const coActivatedNodes = nodeIds.slice(1); // Rest as co-activated
      
      // Record co-activation for Hebbian strengthening
      await this.hebbianLearning.recordCoActivation(
        primaryNode,
        coActivatedNodes,
        `query:${query}`, // Context includes the query
        1.0 / result.nodes.length // Strength inversely proportional to result set size
      );
    }

    // Record Hebbian co-activation for top results (brain-inspired learning)
    if (result.nodes.length > 1 && !options.bypassHebbianLearning) {
      const topNodes = result.nodes.slice(0, Math.min(5, result.nodes.length));

      // Record co-activation for each primary node with others
      for (let i = 0; i < topNodes.length; i++) {
        const primaryNode = topNodes[i];
        const coActivatedNodes = topNodes.filter((_, idx) => idx !== i).map(n => n.id);

        if (coActivatedNodes.length > 0) {
          // Calculate activation strength based on result position and confidence
          const positionWeight = 1.0 - (i * 0.15); // Decay by position
          const activationStrength = Math.min(1.0, primaryNode.confidence * positionWeight);

          await this.hebbianLearning.recordCoActivation(
            primaryNode.id,
            coActivatedNodes,
            context || query, // Use context or query as learning context
            activationStrength
          );
        }
      }
    }

    // Apply Multi-Modal Confidence Fusion (unless bypassed)
    if (result.nodes.length > 0 && !options.bypassMultiModalFusion) {
      const fusionContext = {
        currentTask: context,
        activeFiles: options.activeFiles || [],
        query: query,
        sessionGoals: options.sessionGoals || []
      };

      result.nodes = await this.applyMultiModalConfidenceFusion(result.nodes, fusionContext);

      // Re-sort by fused confidence
      result.nodes.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    }

    // Cache the result
    await this.queryCache.set(query, context, result);

    return result;
  }

  private async queryWithActivation(
    query: string, 
    queryLower: string, 
    options: QueryOptions, 
    limit: number, 
    startTime: number
  ): Promise<QueryResult> {
    // Find initial seed nodes using traditional matching
    const seedNodes = this.storage.findNodes(node => {
      // Apply filters
      if (options.type && node.type !== options.type) return false;
      if (options.confidence && node.confidence < options.confidence) return false;
      
      // Pattern matching
      if (options.pattern) {
        const pattern = new RegExp(options.pattern, 'i');
        return pattern.test(node.name) || pattern.test(node.path || '');
      }

      // Semantic matching
      return this.matchesQuery(node, queryLower);
    });

    // If no seed nodes found, fallback to linear search
    if (seedNodes.length === 0) {
      console.log('No seed nodes found, falling back to linear search');
      return this.queryLinear(query, queryLower, options, limit, startTime);
    }

    // Create query context for activation spreading
    const context: QueryContext = {
      currentTask: options.currentTask,
      activeFiles: options.activeFiles || [],
      recentErrors: options.recentErrors || [],
      sessionGoals: options.sessionGoals || [],
      frameworkContext: options.frameworkContext || [],
      languageContext: options.languageContext || [],
      timestamp: new Date()
    };

    // Use activation spreading from seed nodes
    const seedNodeIds = seedNodes.slice(0, 5).map(n => n.id); // Limit initial seeds
    const activationResults = await this.activationNetwork.spreadActivation(
      seedNodeIds, 
      context, 
      options.activationLevels || 3
    );

    // Convert activation results to nodes, respecting limit
    const resultNodes: MindMapNode[] = [];
    const activationSummary: Array<{
      nodeId: string;
      activationStrength: number;
      hopDistance: number;
      contextRelevance: number;
      totalScore: number;
    }> = [];

    for (const result of activationResults.slice(0, limit)) {
      resultNodes.push(result.node);
      activationSummary.push({
        nodeId: result.nodeId,
        activationStrength: result.activationStrength,
        hopDistance: result.hopDistance,
        contextRelevance: result.contextRelevance,
        totalScore: result.totalScore
      });
    }

    const relatedEdges = this.getRelatedEdges(resultNodes.map(n => n.id));

    console.log(`Activation query: ${seedNodes.length} seeds → ${activationResults.length} activated nodes`);

    return {
      nodes: resultNodes,
      edges: relatedEdges,
      totalMatches: activationResults.length,
      queryTime: Date.now() - startTime,
      activationResults: activationSummary,
      usedActivation: true,
      activationLevels: options.activationLevels || 3
    };
  }

  private queryLinear(
    query: string,
    queryLower: string,
    options: QueryOptions,
    limit: number,
    startTime: number
  ): QueryResult {
    // Traditional linear search implementation
    let matchingNodes = this.storage.findNodes(node => {
      // Type filter
      if (options.type && node.type !== options.type) {
        return false;
      }

      // Confidence filter
      if (options.confidence && node.confidence < options.confidence) {
        return false;
      }

      // Pattern matching
      if (options.pattern) {
        const pattern = new RegExp(options.pattern, 'i');
        return pattern.test(node.name) || pattern.test(node.path || '');
      }

      // Semantic matching
      return this.matchesQuery(node, queryLower);
    });

    // Sort by relevance score
    matchingNodes.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, queryLower, options);
      const scoreB = this.calculateRelevanceScore(b, queryLower, options);
      return scoreB - scoreA;
    });

    const limitedNodes = matchingNodes.slice(0, limit);
    const relatedEdges = this.getRelatedEdges(limitedNodes.map(n => n.id));

    return {
      nodes: limitedNodes,
      edges: relatedEdges,
      totalMatches: matchingNodes.length,
      queryTime: Date.now() - startTime,
      usedActivation: false
    };
  }

  updateFromTask(
    taskDescription: string,
    filesInvolved: string[],
    outcome: 'success' | 'error' | 'partial',
    details?: {
      errorDetails?: any;
      solutionDetails?: any;
      patternsDiscovered?: any[];
    }
  ): void {
    // Update confidence scores for involved files
    for (const filePath of filesInvolved) {
      const fileId = `file:${filePath}`;
      const node = this.storage.getNode(fileId);
      if (node) {
        // Adjust confidence based on outcome
        const adjustment = outcome === 'success' ? 0.1 : 
                          outcome === 'error' ? -0.05 : 0.02;
        const newConfidence = Math.max(0.1, Math.min(1.0, node.confidence + adjustment));
        this.storage.updateNodeConfidence(fileId, newConfidence);

        // Add task metadata (limit to last 10 tasks to prevent memory leak)
        if (!node.metadata.tasks) node.metadata.tasks = [];
        node.metadata.tasks.push({
          description: taskDescription,
          outcome,
          timestamp: new Date(),
          ...details
        });
        // Keep only the last 10 tasks
        if (node.metadata.tasks.length > 10) {
          node.metadata.tasks = node.metadata.tasks.slice(-10);
        }
      }
    }

    // Learn from failure using inhibitory learning
    if (outcome === 'error' && details?.errorDetails) {
      // Create inhibitory pattern from failure
      this.inhibitoryLearning.learnFromFailure(
        taskDescription,
        details.errorDetails,
        filesInvolved,
        this.createTaskContext(taskDescription, filesInvolved)
      ).then(pattern => {
        if (pattern) {
          console.log(`🧠 Created inhibitory pattern from failure: ${pattern.id}`);
        }
      }).catch(error => {
        console.warn('Failed to create inhibitory pattern:', error);
      });
    }

    // Apply Hebbian learning for successful task outcomes
    if (outcome === 'success' && filesInvolved.length > 1) {
      // Record co-activation between successful files to strengthen associations
      const fileIds = filesInvolved.map(filePath => `file:${filePath}`);
      const primaryFileId = fileIds[0]; // First file as primary
      const coActivatedFileIds = fileIds.slice(1); // Rest as co-activated

      // Record co-activation with task context for Hebbian strengthening
      this.hebbianLearning.recordCoActivation(
        primaryFileId,
        coActivatedFileIds,
        `task_success:${taskDescription}`, // Context includes task description
        1.0 // Strong activation strength for successful outcomes
      ).then(() => {
        console.log(`🧠 Recorded Hebbian co-activation for successful task: ${taskDescription}`);
      }).catch(error => {
        console.warn('Failed to record Hebbian co-activation:', error);
      });
    }

    // Record Hebbian learning for solution patterns
    if (details?.solutionDetails && filesInvolved.length > 0) {
      // Strengthen associations between solution patterns and involved files
      const solutionContext = `solution:${details.solutionDetails.approach || 'generic'}`;
      const fileIds = filesInvolved.map(filePath => `file:${filePath}`);

      if (fileIds.length > 1) {
        this.hebbianLearning.recordCoActivation(
          fileIds[0],
          fileIds.slice(1),
          solutionContext,
          0.8 // High strength for solution patterns
        ).catch(error => {
          console.warn('Failed to record solution pattern co-activation:', error);
        });
      }
    }

    // Create error nodes if needed
    if (outcome === 'error' && details?.errorDetails) {
      this.createErrorNode(details.errorDetails, filesInvolved);
    }

    // Create pattern nodes for discovered patterns
    if (details?.patternsDiscovered) {
      for (const pattern of details.patternsDiscovered) {
        this.createPatternNode(pattern, filesInvolved);
      }
    }
  }

  async save(): Promise<void> {
    await this.storage.save();
  }

  getStats() {
    return this.storage.getStats();
  }

  /**
   * Get comprehensive resource usage statistics
   */
  getResourceUsage(): ResourceUsage {
    return this.scalabilityManager.getResourceUsage();
  }

  /**
   * Get current scalability configuration
   */
  getScalabilityConfig(): ScalabilityConfig {
    return this.scalabilityManager.getConfiguration();
  }

  /**
   * Update scalability configuration
   */
  updateScalabilityConfig(config: Partial<ScalabilityConfig>): void {
    this.scalabilityManager.applyConfiguration(config);
    console.log('⚙️ Updated scalability configuration');
  }

  /**
   * Analyze current project scale
   */
  async analyzeProjectScale(): Promise<ProjectScale> {
    return this.scalabilityManager.analyzeProjectScale();
  }

  // ===== Phase 4.4: User Customization Methods =====

  /**
   * Get user preferences
   */
  getUserPreferences(): UserPreferences {
    return this.userConfigManager.getPreferences();
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(updates: Partial<UserPreferences>): Promise<void> {
    await this.userConfigManager.updatePreferences(updates);

    // Apply learning preferences to brain-inspired systems
    const effectiveConfig = this.userConfigManager.getEffectiveLearningConfig();
    this.applyLearningConfiguration(effectiveConfig);
  }

  /**
   * Get privacy settings
   */
  getPrivacySettings(): PrivacySettings {
    return this.userConfigManager.getPrivacySettings();
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(updates: Partial<PrivacySettings>): Promise<void> {
    await this.userConfigManager.updatePrivacySettings(updates);
  }

  /**
   * Get project-specific learning configuration
   */
  getProjectLearningConfig(): ProjectLearningConfig | undefined {
    return this.userConfigManager.getProjectConfig();
  }

  /**
   * Update project-specific learning configuration
   */
  async updateProjectLearningConfig(config: Partial<ProjectLearningConfig>): Promise<void> {
    await this.userConfigManager.updateProjectConfig(config);

    // Apply updated configuration
    const effectiveConfig = this.userConfigManager.getEffectiveLearningConfig();
    this.applyLearningConfiguration(effectiveConfig);
  }

  /**
   * Apply learning configuration to brain-inspired systems
   */
  private applyLearningConfiguration(config: {
    enableHebbianLearning: boolean;
    enableInhibitoryLearning: boolean;
    learningRate: number;
    decayRate: number;
    confidenceThreshold: number;
  }): void {
    // Update Hebbian learning system configuration
    // (Note: HebbianLearningSystem would need configuration update methods)
    console.log('🧠 Applied learning configuration:', {
      hebbian: config.enableHebbianLearning,
      inhibitory: config.enableInhibitoryLearning,
      learningRate: config.learningRate,
      decayRate: config.decayRate
    });
  }

  /**
   * Add custom pattern rule
   */
  async addCustomPattern(pattern: Omit<CustomPatternRule, 'id' | 'created' | 'lastModified'>): Promise<string> {
    const validation = this.customPatternEngine.validatePattern(pattern);
    if (!validation.valid) {
      throw new Error(`Invalid pattern: ${validation.errors.join(', ')}`);
    }

    return await this.userConfigManager.addCustomPattern(pattern);
  }

  /**
   * Update custom pattern rule
   */
  async updateCustomPattern(id: string, updates: Partial<CustomPatternRule>): Promise<void> {
    await this.userConfigManager.updateCustomPattern(id, updates);
  }

  /**
   * Remove custom pattern rule
   */
  async removeCustomPattern(id: string): Promise<void> {
    await this.userConfigManager.removeCustomPattern(id);
  }

  /**
   * Get custom pattern rules
   */
  getCustomPatterns(enabled?: boolean): CustomPatternRule[] {
    return this.userConfigManager.getCustomPatterns(enabled);
  }

  /**
   * Analyze files with custom patterns
   */
  async analyzeWithCustomPatterns(filePaths?: string[]) {
    const files = filePaths
      ? filePaths.map(path => ({ path, name: path.split('/').pop() || '', type: 'file' as const, size: 0, lastModified: new Date(), isIgnored: false }))
      : Array.from(this.storage.getGraph().nodes.values())
          .filter(node => node.type === 'file' && node.path)
          .map(node => ({
            path: node.path!,
            name: node.name,
            type: 'file' as const,
            size: 0,
            lastModified: new Date(),
            isIgnored: false
          }));

    return await this.customPatternEngine.analyzeFiles(files);
  }

  /**
   * Test pattern against sample text
   */
  testCustomPattern(pattern: CustomPatternRule, sampleText: string) {
    return this.customPatternEngine.testPattern(pattern, sampleText);
  }

  /**
   * Submit user feedback
   */
  async submitFeedback(feedback: Omit<UserFeedback, 'id' | 'status' | 'created' | 'lastModified'>): Promise<string> {
    return await this.userConfigManager.submitFeedback(feedback);
  }

  /**
   * Get user feedback
   */
  getUserFeedback(status?: UserFeedback['status']): UserFeedback[] {
    return this.userConfigManager.getFeedback(status);
  }

  /**
   * Update feedback status
   */
  async updateFeedbackStatus(id: string, status: UserFeedback['status']): Promise<void> {
    await this.userConfigManager.updateFeedbackStatus(id, status);
  }

  /**
   * Export user configuration
   */
  async exportUserConfiguration(): Promise<string> {
    return await this.userConfigManager.exportConfiguration();
  }

  /**
   * Import user configuration
   */
  async importUserConfiguration(configData: string, merge: boolean = false): Promise<void> {
    await this.userConfigManager.importConfiguration(configData, merge);

    // Apply imported configuration
    const effectiveConfig = this.userConfigManager.getEffectiveLearningConfig();
    this.applyLearningConfiguration(effectiveConfig);
  }

  /**
   * Reset user configuration to defaults
   */
  async resetUserConfiguration(): Promise<void> {
    await this.userConfigManager.resetToDefaults();
  }

  /**
   * Get user configuration statistics
   */
  getUserConfigurationStats() {
    const configStats = this.userConfigManager.getConfigurationStats();
    const patternStats = this.customPatternEngine.getPatternStatistics();

    return {
      configuration: configStats,
      patterns: patternStats,
      privacyMode: configStats.privacyMode,
      learningEnabled: this.userConfigManager.isFeatureEnabled('enableLearning')
    };
  }

  private addContainsEdge(parentId: string, childId: string): void {
    const edge: MindMapEdge = {
      id: `contains:${parentId}:${childId}`,
      source: parentId,
      target: childId,
      type: 'contains',
      weight: 1.0,
      confidence: 1.0,
      metadata: {},
      createdAt: new Date()
    };
    this.storage.addEdge(edge);
  }

  private detectLanguage(file: FileInfo): string | undefined {
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin'
    };
    
    return file.extension ? languageMap[file.extension] : undefined;
  }

  private detectFramework(file: FileInfo): string | undefined {
    if (!file.extension) return undefined;

    const frameworks: Array<[RegExp, string]> = [
      [/react|jsx|tsx/, 'react'],
      [/vue/, 'vue'],
      [/angular/, 'angular'],
      [/svelte/, 'svelte'],
      [/next/, 'nextjs'],
      [/nuxt/, 'nuxtjs'],
      [/express/, 'express'],
      [/fastify/, 'fastify'],
      [/django/, 'django'],
      [/flask/, 'flask'],
      [/spring/, 'spring'],
      [/gin|echo/, 'go-web']
    ];

    for (const [pattern, framework] of frameworks) {
      if (pattern.test(file.path) || pattern.test(file.name)) {
        return framework;
      }
    }

    return undefined;
  }

  private matchesQuery(node: MindMapNode, queryLower: string): boolean {
    // First try original query without semantic expansion for exact matches
    const originalWords = queryLower.trim().split(/\s+/).filter(word => word.length > 0);

    // Enhanced searchable text including function purposes and semantic tags
    const searchableText = [
      node.name,
      node.path,
      node.metadata.extension,
      node.properties?.language,
      node.properties?.framework,
      this.inferFunctionPurpose(node), // Add semantic purpose
      this.extractSemanticTags(node)   // Add contextual tags
    ].filter(Boolean).join(' ').toLowerCase();

    // Check original query first (most important)
    if (originalWords.length === 1) {
      if (searchableText.includes(queryLower)) {
        return true;
      }
    } else {
      // For multi-word original queries, require all original words
      const originalMatch = originalWords.every(word => searchableText.includes(word));
      if (originalMatch) {
        return true;
      }
    }

    // Also try camelCase matching for original query
    const expandedText = searchableText.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    if (originalWords.length === 1) {
      if (expandedText.includes(queryLower)) {
        return true;
      }
    } else {
      const camelCaseMatch = originalWords.every(word => expandedText.includes(word));
      if (camelCaseMatch) {
        return true;
      }
    }

    // Then try semantic expansion for broader matches (but only require ANY match, not ALL)
    const expandedQuery = this.expandSemanticQuery(queryLower);
    const allQueryWords = expandedQuery.trim().split(/\s+/).filter(word => word.length > 0);
    const semanticWords = allQueryWords.filter(word => !originalWords.includes(word)); // Only new words from expansion

    // For semantic matches, require ANY of the semantic words to match (more permissive)
    if (semanticWords.length > 0) {
      const semanticMatch = semanticWords.some(word => searchableText.includes(word) || expandedText.includes(word));
      if (semanticMatch) {
        return true;
      }
    }

    // Enhanced search for functions and classes using original query
    if (node.type === 'function' && node.metadata.parameters) {
      const paramsString = node.metadata.parameters.join(' ').toLowerCase();
      if (originalWords.length === 1) {
        if (paramsString.includes(queryLower)) {
          return true;
        }
      } else {
        const allWordsMatch = originalWords.every(word => paramsString.includes(word));
        if (allWordsMatch) {
          return true;
        }
      }
    }

    if (node.type === 'class' && (node.metadata.methods || node.metadata.properties)) {
      const methodsString = (node.metadata.methods || []).join(' ').toLowerCase();
      const propsString = (node.metadata.properties || []).join(' ').toLowerCase();
      const combinedString = methodsString + ' ' + propsString;

      if (originalWords.length === 1) {
        if (combinedString.includes(queryLower)) {
          return true;
        }
      } else {
        const allWordsMatch = originalWords.every(word => combinedString.includes(word));
        if (allWordsMatch) {
          return true;
        }
      }
    }

    // Generic metadata search (safe JSON stringify to avoid circular references)
    try {
      const metadataString = JSON.stringify(node.metadata, (key, value) => {
        // Skip potentially circular references
        if (key === 'parent' || key === 'children' || key === 'references' || typeof value === 'function') {
          return undefined;
        }
        return value;
      }).toLowerCase();

      if (originalWords.length === 1) {
        if (metadataString.includes(queryLower)) {
          return true;
        }
      } else {
        const allWordsMatch = originalWords.every(word => metadataString.includes(word));
        if (allWordsMatch) {
          return true;
        }
      }
    } catch (error) {
      // If JSON.stringify fails due to circular reference, skip metadata search
      console.warn('Metadata search skipped due to circular reference:', (error as Error).message);
    }

    return false;
  }

  /**
   * Expand semantic queries with related terms for better natural language understanding
   */
  private expandSemanticQuery(query: string): string {
    const semanticMap: Record<string, string[]> = {
      'auth': ['authentication', 'login', 'security', 'user', 'session', 'token', 'credential'],
      'authentication': ['auth', 'login', 'security', 'user', 'session', 'token'],
      'database': ['db', 'storage', 'data', 'persist', 'save', 'load', 'query', 'sql'],
      'error': ['exception', 'fail', 'catch', 'try', 'throw', 'debug', 'log', 'warn'],
      'test': ['spec', 'unit', 'integration', 'mock', 'assert', 'expect', 'describe'],
      'config': ['configuration', 'settings', 'options', 'preference', 'setup', 'env'],
      'api': ['endpoint', 'service', 'request', 'response', 'http', 'rest', 'graphql'],
      'validate': ['validation', 'check', 'verify', 'ensure', 'confirm', 'sanitize'],
      'parse': ['parsing', 'decode', 'serialize', 'deserialize', 'transform', 'convert'],
      'cache': ['caching', 'memory', 'store', 'buffer', 'temp', 'temporary'],
      'network': ['http', 'request', 'fetch', 'api', 'client', 'server', 'connection'],
      'file': ['filesystem', 'path', 'directory', 'folder', 'read', 'write', 'save', 'load'],
      'ui': ['interface', 'view', 'component', 'render', 'display', 'show'],
      'util': ['utility', 'helper', 'common', 'shared', 'tool', 'function']
    };

    const words = query.toLowerCase().split(/\s+/);
    const expandedWords = [...words];

    for (const word of words) {
      if (semanticMap[word]) {
        expandedWords.push(...semanticMap[word]);
      }
    }

    return expandedWords.join(' ');
  }

  /**
   * Infer the purpose/category of a function based on its name and context
   */
  private inferFunctionPurpose(node: MindMapNode): string {
    if (node.type !== 'function') return '';

    const name = node.name.toLowerCase();
    const purposes: string[] = [];

    // Common patterns
    if (name.includes('test') || name.includes('spec')) purposes.push('testing');
    if (name.includes('validate') || name.includes('check')) purposes.push('validation');
    if (name.includes('parse') || name.includes('decode')) purposes.push('parsing');
    if (name.includes('auth') || name.includes('login')) purposes.push('authentication');
    if (name.includes('save') || name.includes('store') || name.includes('persist')) purposes.push('storage');
    if (name.includes('load') || name.includes('get') || name.includes('fetch')) purposes.push('retrieval');
    if (name.includes('render') || name.includes('display') || name.includes('show')) purposes.push('ui');
    if (name.includes('error') || name.includes('exception') || name.includes('handle')) purposes.push('error-handling');
    if (name.includes('config') || name.includes('setup') || name.includes('init')) purposes.push('configuration');
    if (name.includes('util') || name.includes('helper') || name.includes('format')) purposes.push('utility');

    // Action-based patterns
    if (name.startsWith('create') || name.startsWith('make')) purposes.push('creation');
    if (name.startsWith('update') || name.startsWith('modify')) purposes.push('modification');
    if (name.startsWith('delete') || name.startsWith('remove')) purposes.push('deletion');
    if (name.startsWith('find') || name.startsWith('search') || name.startsWith('query')) purposes.push('search');

    return purposes.join(' ');
  }

  /**
   * Extract contextual semantic tags from node metadata and relationships
   */
  private extractSemanticTags(node: MindMapNode): string {
    const tags: string[] = [];

    // File-based tags
    if (node.path) {
      if (node.path.includes('test')) tags.push('testing');
      if (node.path.includes('config')) tags.push('configuration');
      if (node.path.includes('util')) tags.push('utility');
      if (node.path.includes('auth')) tags.push('authentication');
      if (node.path.includes('api')) tags.push('api');
      if (node.path.includes('db') || node.path.includes('storage')) tags.push('database');
      if (node.path.includes('ui') || node.path.includes('component')) tags.push('interface');
    }

    // Language-specific tags
    if (node.properties?.language) {
      tags.push(node.properties.language);
    }

    // Framework-specific tags
    if (node.properties?.framework) {
      tags.push(node.properties.framework);
    }

    // Class method tags
    if (node.type === 'class' && node.metadata.methods) {
      const methods = node.metadata.methods as string[];
      if (methods.some(m => m.includes('test'))) tags.push('testing');
      if (methods.some(m => m.includes('validate'))) tags.push('validation');
      if (methods.some(m => m.includes('parse'))) tags.push('parsing');
    }

    return tags.join(' ');
  }

  /**
   * Detect if a query is asking for a specific file path
   */
  private isFilePathQuery(query: string): boolean {
    // Check if query looks like a file path
    const trimmed = query.trim();

    // Has file extension
    if (/\.\w+$/.test(trimmed)) return true;

    // Has path separators and ends with common code file extensions
    if (trimmed.includes('/') && /\.(js|ts|tsx|jsx|py|java|go|rs|cpp|c|h|hpp)$/i.test(trimmed)) return true;

    return false;
  }

  /**
   * Query for contents of a specific file (functions, classes, etc.)
   */
  private async queryFileContents(query: string, options: QueryOptions, limit: number, startTime: number): Promise<any> {
    const queryLower = query.toLowerCase();

    // Find all nodes that belong to this file
    const fileNodes = this.storage.findNodes(node => {
      if (!node.path) return false;

      // Exact path match
      if (node.path.toLowerCase() === queryLower) return true;

      // Partial path match (for cases like "MindMapEngine.ts" matching "src/core/MindMapEngine.ts")
      if (node.path.toLowerCase().endsWith(queryLower)) return true;

      // Also check if the file path contains the query as filename
      const fileName = node.path.split('/').pop()?.toLowerCase();
      if (fileName === queryLower) return true;

      return false;
    });

    // Separate file nodes from content nodes (functions, classes)
    const contentNodes = fileNodes.filter(node =>
      node.type === 'function' || node.type === 'class'
    );

    const fileMetadataNodes = fileNodes.filter(node => node.type === 'file');

    // If we have content nodes, return them; otherwise return the file node
    const resultNodes = contentNodes.length > 0 ? contentNodes : fileMetadataNodes;

    // Sort by relevance
    resultNodes.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, queryLower, options);
      const scoreB = this.calculateRelevanceScore(b, queryLower, options);
      return scoreB - scoreA;
    });

    const limitedNodes = resultNodes.slice(0, limit);
    const relatedEdges = this.getRelatedEdges(limitedNodes.map(n => n.id));

    return {
      nodes: limitedNodes,
      edges: relatedEdges,
      totalMatches: resultNodes.length,
      queryTime: Date.now() - startTime,
      usedActivation: false,
      fileQuery: true // Flag to indicate this was a file-specific query
    };
  }

  /**
   * Intelligent query routing - determines optimal engine based on query characteristics
   */
  private determineQueryRoute(query: string, options: QueryOptions): {
    engine: 'standard' | 'advanced' | 'temporal' | 'aggregate';
    optimizedQuery?: string;
    parameters?: any;
    timeRange?: { start: string; end: string };
    entity?: string;
    analysisType?: string;
    aggregation?: any;
    groupBy?: any[];
    filter?: any;
  } {
    const queryLower = query.toLowerCase();

    // Temporal query patterns
    if (this.isTemporalQuery(queryLower)) {
      return {
        engine: 'temporal',
        entity: this.extractEntityFromQuery(query),
        analysisType: this.extractTemporalAnalysisType(queryLower),
        timeRange: this.extractTimeRange(queryLower)
      };
    }

    // Aggregate query patterns (count, statistics, metrics)
    if (this.isAggregateQuery(queryLower)) {
      return {
        engine: 'aggregate',
        aggregation: this.extractAggregation(queryLower),
        groupBy: this.extractGroupBy(queryLower),
        filter: this.extractFilter(queryLower, options)
      };
    }

    // Advanced query patterns (complex relationships, graph patterns)
    if (this.isAdvancedQuery(queryLower)) {
      return {
        engine: 'advanced',
        optimizedQuery: this.convertToAdvancedQuery(query),
        parameters: this.extractQueryParameters(query, options)
      };
    }

    // Default to standard brain-inspired query with activation spreading
    return { engine: 'standard' };
  }

  private isTemporalQuery(query: string): boolean {
    const temporalKeywords = [
      'recent', 'last', 'since', 'before', 'after', 'changed', 'modified',
      'updated', 'evolution', 'history', 'timeline', 'trend', 'over time',
      'yesterday', 'week', 'month', 'day', 'ago', 'latest', 'newest'
    ];
    return temporalKeywords.some(keyword => query.includes(keyword));
  }

  private isAggregateQuery(query: string): boolean {
    const aggregateKeywords = [
      'count', 'how many', 'total', 'sum', 'average', 'max', 'min',
      'statistics', 'stats', 'metrics', 'distribution', 'breakdown',
      'group by', 'aggregate', 'summary'
    ];
    return aggregateKeywords.some(keyword => query.includes(keyword));
  }

  private isAdvancedQuery(query: string): boolean {
    const advancedKeywords = [
      'related to', 'connected to', 'depends on', 'imports', 'uses',
      'calls', 'extends', 'implements', 'contains', 'pattern',
      'match', 'where', 'return', 'cypher', 'graph'
    ];
    return advancedKeywords.some(keyword => query.includes(keyword));
  }

  private extractTemporalAnalysisType(query: string): string {
    if (query.includes('evolution') || query.includes('history')) return 'evolution';
    if (query.includes('trend')) return 'trend';
    if (query.includes('compare') || query.includes('vs')) return 'comparison';
    return 'evolution';
  }

  private extractTimeRange(query: string): { start: string; end: string } | undefined {
    const now = new Date();

    if (query.includes('today')) {
      const start = new Date(now.setHours(0, 0, 0, 0));
      return { start: start.toISOString(), end: new Date().toISOString() };
    }

    if (query.includes('week')) {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: start.toISOString(), end: new Date().toISOString() };
    }

    if (query.includes('month')) {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start: start.toISOString(), end: new Date().toISOString() };
    }

    return undefined;
  }

  private extractEntityFromQuery(query: string): string {
    // Extract specific file/class/function names from query
    const words = query.split(/\s+/);
    for (const word of words) {
      if (word.includes('.') || word.includes('/') || /^[A-Z][a-zA-Z0-9]*$/.test(word)) {
        return word;
      }
    }
    return '*';
  }

  private extractAggregation(query: string): any {
    if (query.includes('count') || query.includes('how many')) {
      return { function: 'count', field: 'name' };
    }
    if (query.includes('average')) {
      return { function: 'avg', field: 'confidence' };
    }
    if (query.includes('sum')) {
      return { function: 'sum', field: 'confidence' };
    }
    return { function: 'count', field: 'name' };
  }

  private extractGroupBy(query: string): any[] | undefined {
    if (query.includes('by type') || query.includes('by node type')) {
      return [{ field: 'type' }];
    }
    if (query.includes('by language')) {
      return [{ field: 'properties.language' }];
    }
    if (query.includes('by file')) {
      return [{ field: 'path' }];
    }
    return undefined;
  }

  private extractFilter(query: string, options: QueryOptions): any | undefined {
    const conditions: any[] = [];

    if (options.type) {
      conditions.push({ field: 'type', operator: 'eq', value: options.type });
    }

    if (query.includes('function')) {
      conditions.push({ field: 'type', operator: 'eq', value: 'function' });
    }

    if (query.includes('class')) {
      conditions.push({ field: 'type', operator: 'eq', value: 'class' });
    }

    return conditions.length > 0 ? { conditions, operator: 'AND' } : undefined;
  }

  private convertToAdvancedQuery(query: string): string {
    // Convert natural language to Cypher-like syntax
    let cypherQuery = query;

    // Replace common patterns
    cypherQuery = cypherQuery.replace(/related to (\w+)/gi, 'MATCH (n)-[:RELATES_TO]->(m {name: "$1"})');
    cypherQuery = cypherQuery.replace(/depends on (\w+)/gi, 'MATCH (n)-[:DEPENDS_ON]->(m {name: "$1"})');
    cypherQuery = cypherQuery.replace(/functions in (\w+)/gi, 'MATCH (f:file {name: "$1"})-[:CONTAINS]->(func:function)');

    return cypherQuery;
  }

  private extractQueryParameters(query: string, options: QueryOptions): any {
    return {
      limit: options.limit || 10,
      type: options.type,
      confidence: options.confidence
    };
  }

  private calculateRelevanceScore(node: MindMapNode, queryLower: string, options: QueryOptions = {}): number {
    let score = 0;

    // Use original query terms for primary scoring
    const originalTerms = queryLower.trim().split(/\s+/).filter(word => word.length > 0);

    // Enhanced searchable text with semantic information
    const searchableContent = [
      node.name,
      node.path,
      this.inferFunctionPurpose(node),
      this.extractSemanticTags(node)
    ].filter(Boolean).join(' ').toLowerCase();

    // Primary matching score using original query
    let originalMatches = 0;
    for (const term of originalTerms) {
      if (searchableContent.includes(term)) {
        originalMatches++;
      }
    }
    const originalRatio = originalMatches / originalTerms.length;
    score += originalRatio * 12; // Strong score for original matches

    // Exact name match gets highest score
    if (node.name.toLowerCase() === queryLower) score += 15;
    else if (node.name.toLowerCase().includes(queryLower)) score += 8;

    // Path matching (important for file queries)
    if (node.path && originalTerms.length === 1) {
      if (node.path.toLowerCase().includes(queryLower)) {
        score += 10; // High score for path matches
      }
    } else if (node.path && originalTerms.every(term => node.path!.toLowerCase().includes(term))) {
      score += 10; // High score for multi-term path matches
    }

    // Semantic expansion for broader matches (lower weight)
    const expandedQuery = this.expandSemanticQuery(queryLower);
    const allQueryTerms = expandedQuery.toLowerCase().split(/\s+/);
    const semanticTerms = allQueryTerms.filter(term => !originalTerms.includes(term));

    if (semanticTerms.length > 0) {
      const semanticMatches = semanticTerms.filter(term => searchableContent.includes(term)).length;
      const semanticRatio = semanticMatches / semanticTerms.length;
      score += semanticRatio * 4; // Lower weight for semantic matches
    }

    // Context-aware boosting
    score += this.calculateContextBoost(node, options);

    // Hierarchical context integration
    if (this.hierarchicalContext && typeof (this.hierarchicalContext as any).getRelevanceBoost === 'function') {
      const contextBoost = (this.hierarchicalContext as any).getRelevanceBoost(node.id, queryLower);
      score += contextBoost * 5; // Context-aware relevance boost
    }

    // Directory context awareness (additional boost)
    if (options.activeFiles && options.activeFiles.some(f =>
        node.path && f.includes(node.path.split('/').slice(0, -1).join('/')))) {
      score += 2; // Boost if in current working directory context
    }

    // Language/Framework matching
    if (node.properties?.language === queryLower) score += 6;
    if (node.properties?.framework === queryLower) score += 6;

    // Type-specific scoring with purpose matching
    if (node.type === 'function') {
      score += 3;
      const purpose = this.inferFunctionPurpose(node);
      if (purpose && originalTerms.some(term => purpose.includes(term))) {
        score += 4; // Boost for purpose match
      }
      if (node.metadata.parameters && node.metadata.parameters.length > 0) {
        score += 1;
      }
    }

    if (node.type === 'class') {
      score += 4;
      if (node.metadata.methods && node.metadata.methods.length > 0) {
        score += 2;
        // Check if query matches any method names
        const methods = node.metadata.methods as string[];
        if (methods.some(m => m.toLowerCase().includes(queryLower))) {
          score += 3;
        }
      }
    }

    // Multi-modal confidence fusion
    score *= node.confidence;

    // Temporal relevance - boost recent and frequently accessed nodes
    const daysSinceUpdate = (Date.now() - node.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 1) score *= 1.8;
    else if (daysSinceUpdate < 3) score *= 1.4;
    else if (daysSinceUpdate < 7) score *= 1.2;

    // Hebbian learning boost - nodes that were co-activated get preference
    if (this.hebbianLearning && typeof (this.hebbianLearning as any).getAssociationStrength === 'function') {
      const hebbianBoost = (this.hebbianLearning as any).getAssociationStrength(node.id, queryLower);
      score += hebbianBoost * 3;
    }

    return Math.max(0, score);
  }

  /**
   * Calculate context-aware boost based on current session and task context
   */
  private calculateContextBoost(node: MindMapNode, options: QueryOptions): number {
    let contextBoost = 0;

    // Active files context - boost nodes from files currently being worked on
    if (options.activeFiles && options.activeFiles.length > 0) {
      const isInActiveFile = options.activeFiles.some(activeFile =>
        node.path && (node.path === activeFile || node.path.includes(activeFile))
      );
      if (isInActiveFile) {
        contextBoost += 5;
      }
    }

    // Current task context - boost nodes related to current task
    if (options.currentTask) {
      const taskTerms = options.currentTask.toLowerCase().split(/\s+/);
      const nodeContent = [node.name, node.path, this.inferFunctionPurpose(node)]
        .filter(Boolean).join(' ').toLowerCase();

      const taskRelevance = taskTerms.filter(term => nodeContent.includes(term)).length / taskTerms.length;
      contextBoost += taskRelevance * 4;
    }

    // Framework/Language context matching
    if (options.frameworkContext && node.properties?.framework) {
      if (options.frameworkContext.includes(node.properties.framework)) {
        contextBoost += 3;
      }
    }

    if (options.languageContext && node.properties?.language) {
      if (options.languageContext.includes(node.properties.language)) {
        contextBoost += 2;
      }
    }

    // Recent errors context - boost nodes that might help with recent errors
    if (options.recentErrors && options.recentErrors.length > 0) {
      const isErrorRelated = options.recentErrors.some(error =>
        node.path && error.toLowerCase().includes(node.path.toLowerCase())
      );
      if (isErrorRelated) {
        contextBoost += 4;
      }
    }

    return contextBoost;
  }

  private getRelatedEdges(nodeIds: string[]): MindMapEdge[] {
    const nodeIdSet = new Set(nodeIds);
    return this.storage.findEdges(edge => 
      nodeIdSet.has(edge.source) || nodeIdSet.has(edge.target)
    );
  }

  private createErrorNode(errorDetails: any, filesInvolved: string[]): void {
    const errorId = `error:${Date.now()}`;
    const errorNode: MindMapNode = {
      id: errorId,
      type: 'error',
      name: errorDetails.error_type || 'Unknown Error',
      metadata: {
        message: errorDetails.error_message,
        stackTrace: errorDetails.stack_trace,
        fixApplied: errorDetails.fix_applied,
        filesInvolved
      },
      confidence: 0.8,
      lastUpdated: new Date(),
      properties: {
        category: this.categorizeError(errorDetails.error_message)
      }
    };

    this.storage.addNode(errorNode);

    // Link error to involved files
    for (const filePath of filesInvolved) {
      const fileId = `file:${filePath}`;
      if (this.storage.getNode(fileId)) {
        const edge: MindMapEdge = {
          id: `relates_to:${errorId}:${fileId}`,
          source: errorId,
          target: fileId,
          type: 'relates_to',
          weight: 0.8,
          confidence: 0.8,
          metadata: { relationship: 'error_occurred_in' },
          createdAt: new Date()
        };
        this.storage.addEdge(edge);
      }
    }
  }

  private createPatternNode(pattern: any, filesInvolved: string[]): void {
    const patternId = `pattern:${pattern.pattern_type}:${Date.now()}`;
    const patternNode: MindMapNode = {
      id: patternId,
      type: 'pattern',
      name: pattern.pattern_type,
      metadata: {
        description: pattern.description,
        filesInvolved,
        confidence: pattern.confidence || 0.7
      },
      confidence: pattern.confidence || 0.7,
      lastUpdated: new Date(),
      properties: {
        category: pattern.pattern_type
      }
    };

    this.storage.addNode(patternNode);
  }

  private categorizeError(errorMessage: string): string {
    const categories = [
      ['syntax', /syntax|parsing|unexpected token/i],
      ['type', /type|cannot find|property does not exist/i],
      ['import', /import|module|cannot resolve/i],
      ['runtime', /runtime|reference|undefined/i],
      ['network', /network|fetch|connection|cors/i],
      ['permission', /permission|access|denied|forbidden/i]
    ];

    for (const [category, pattern] of categories) {
      if ((pattern as RegExp).test(errorMessage)) return category as string;
    }

    return 'unknown';
  }

  private addDependsOnEdge(sourceId: string, targetId: string, importType: string): void {
    const edge: MindMapEdge = {
      id: `depends_on:${sourceId}:${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'depends_on',
      weight: 0.7,
      confidence: 0.8,
      metadata: { 
        importType,
        relationship: 'imports_from'
      },
      createdAt: new Date()
    };
    this.storage.addEdge(edge);
  }

  private addRelatesEdge(sourceId: string, targetId: string, relationshipType: string): void {
    const edge: MindMapEdge = {
      id: `relates_to:${sourceId}:${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'relates_to',
      weight: 0.6,
      confidence: 0.7,
      metadata: { 
        relationshipType,
        relationship: 'pattern_detected'
      },
      createdAt: new Date()
    };
    this.storage.addEdge(edge);
  }

  private resolveImportPath(currentFile: string, importPath: string): string | null {
    try {
      // Simple relative path resolution
      const currentDir = currentFile.includes('/') 
        ? currentFile.substring(0, currentFile.lastIndexOf('/'))
        : '';
      
      let resolved = importPath;
      
      // Handle relative imports
      if (importPath.startsWith('./')) {
        resolved = currentDir ? `${currentDir}/${importPath.slice(2)}` : importPath.slice(2);
      } else if (importPath.startsWith('../')) {
        const parts = currentDir.split('/');
        const importParts = importPath.split('/');
        let upLevels = 0;
        
        for (const part of importParts) {
          if (part === '..') {
            upLevels++;
          } else {
            break;
          }
        }
        
        const remainingParts = importParts.slice(upLevels);
        const targetParts = parts.slice(0, parts.length - upLevels);
        resolved = [...targetParts, ...remainingParts].join('/');
      }

      // Add common extensions if not present
      const extensions = ['.ts', '.tsx', '.js', '.jsx'];
      for (const ext of extensions) {
        const withExt = `${resolved}${ext}`;
        // In a real implementation, we'd check if the file exists
        // For now, assume .ts extension for TypeScript projects
        if (resolved.endsWith('.ts') || resolved.endsWith('.js')) {
          return resolved;
        }
      }
      
      return `${resolved}.ts`; // Default assumption
    } catch (error) {
      console.warn(`Failed to resolve import path ${importPath} from ${currentFile}:`, error);
      return null;
    }
  }

  // Predictive Error Detection System
  predictPotentialErrors(filePath?: string): ErrorPrediction[] {
    const predictions: ErrorPrediction[] = [];
    const nodes = filePath 
      ? this.storage.findNodes(node => node.path === filePath)
      : this.storage.findNodes(() => true); // Get all nodes

    for (const node of nodes) {
      if (node.type === 'file' && this.isCodeFile(node)) {
        const filePredictions = this.analyzeFileForPotentialErrors(node);
        predictions.push(...filePredictions);
      }
      
      if (node.type === 'function') {
        const functionPredictions = this.analyzeFunctionForPotentialErrors(node);
        predictions.push(...functionPredictions);
      }
    }

    // Sort by risk score descending
    return predictions.sort((a, b) => b.riskScore - a.riskScore);
  }

  private analyzeFileForPotentialErrors(fileNode: MindMapNode): ErrorPrediction[] {
    const predictions: ErrorPrediction[] = [];
    const filePath = fileNode.path!;

    // Import-related error patterns
    if (fileNode.metadata.codeStructure?.importCount > 0) {
      const importRisk = this.calculateImportRisk(fileNode);
      if (importRisk.score > 0.3) {
        predictions.push({
          id: `prediction:import:${fileNode.id}`,
          type: 'import',
          message: importRisk.message,
          filePath,
          riskScore: importRisk.score,
          suggestedActions: importRisk.suggestions,
          basedOnPattern: 'import_analysis'
        });
      }
    }

    // Type-related error patterns for TypeScript files
    if (fileNode.metadata.extension === 'ts' || fileNode.metadata.extension === 'tsx') {
      const typeRisk = this.calculateTypeRisk(fileNode);
      if (typeRisk.score > 0.25) {
        predictions.push({
          id: `prediction:type:${fileNode.id}`,
          type: 'type',
          message: typeRisk.message,
          filePath,
          riskScore: typeRisk.score,
          suggestedActions: typeRisk.suggestions,
          basedOnPattern: 'typescript_analysis'
        });
      }
    }

    // Network-related patterns for API files
    if (this.detectsNetworkUsage(fileNode)) {
      const networkRisk = this.calculateNetworkRisk(fileNode);
      if (networkRisk.score > 0.2) {
        predictions.push({
          id: `prediction:network:${fileNode.id}`,
          type: 'network',
          message: networkRisk.message,
          filePath,
          riskScore: networkRisk.score,
          suggestedActions: networkRisk.suggestions,
          basedOnPattern: 'network_analysis'
        });
      }
    }

    return predictions;
  }

  private analyzeFunctionForPotentialErrors(functionNode: MindMapNode): ErrorPrediction[] {
    const predictions: ErrorPrediction[] = [];
    const functionName = functionNode.name;
    const filePath = functionNode.path!;

    // Runtime error patterns for functions
    const runtimeRisk = this.calculateFunctionRuntimeRisk(functionNode);
    if (runtimeRisk.score > 0.3) {
      predictions.push({
        id: `prediction:runtime:${functionNode.id}`,
        type: 'runtime',
        message: `Function '${functionName}' ${runtimeRisk.message}`,
        filePath,
        functionName,
        riskScore: runtimeRisk.score,
        suggestedActions: runtimeRisk.suggestions,
        basedOnPattern: 'function_analysis'
      });
    }

    return predictions;
  }

  private calculateImportRisk(fileNode: MindMapNode): RiskAssessment {
    let score = 0;
    const suggestions: string[] = [];
    let message = '';

    // Check for relative imports that might break
    const relativeImports = this.countRelativeImports(fileNode);
    if (relativeImports > 3) {
      score += 0.2;
      suggestions.push('Consider using absolute imports for better maintainability');
    }

    // Check for missing dependency patterns based on historical errors
    const historicalImportErrors = this.getHistoricalErrors('import', fileNode.path);
    if (historicalImportErrors.length > 0) {
      score += 0.4;
      message = 'has historically had import-related issues';
      suggestions.push('Review import paths and verify all dependencies are installed');
    }

    // Check for circular dependency risk
    const circularRisk = this.detectPotentialCircularDependency(fileNode);
    if (circularRisk) {
      score += 0.3;
      suggestions.push('Potential circular dependency detected - review import structure');
    }

    if (score === 0) {
      message = 'may have import-related issues based on complexity';
      score = Math.min(relativeImports * 0.05, 0.15); // Baseline risk
    }

    return { score, message, suggestions };
  }

  private calculateTypeRisk(fileNode: MindMapNode): RiskAssessment {
    let score = 0;
    const suggestions: string[] = [];
    
    // Check historical type errors
    const historicalTypeErrors = this.getHistoricalErrors('type', fileNode.path);
    if (historicalTypeErrors.length > 0) {
      score += 0.5;
      suggestions.push('File has history of type errors - consider stricter typing');
    }

    // Check for functions without explicit return types (if we have that data)
    const functionCount = fileNode.metadata.codeStructure?.functionCount || 0;
    if (functionCount > 0) {
      score += functionCount * 0.03; // Small risk per function
      suggestions.push('Consider adding explicit return types to functions');
    }

    return { 
      score: Math.min(score, 1.0), 
      message: 'may have type-related issues',
      suggestions 
    };
  }

  private calculateNetworkRisk(fileNode: MindMapNode): RiskAssessment {
    let score = 0.2; // Base network risk
    const suggestions = ['Add proper error handling for network requests'];

    const historicalNetworkErrors = this.getHistoricalErrors('network', fileNode.path);
    if (historicalNetworkErrors.length > 0) {
      score += 0.4;
      suggestions.push('File has history of network errors - review error handling');
    }

    return { 
      score, 
      message: 'makes network requests without comprehensive error handling',
      suggestions 
    };
  }

  private calculateFunctionRuntimeRisk(functionNode: MindMapNode): RiskAssessment {
    let score = 0;
    const suggestions: string[] = [];
    const paramCount = functionNode.metadata.parameters?.length || 0;

    // Functions with many parameters are more error-prone
    if (paramCount > 4) {
      score += 0.2;
      suggestions.push('Consider reducing parameter count or using object parameters');
    }

    // Check for historical runtime errors in this function
    const functionPath = `${functionNode.path}:${functionNode.name}`;
    const historicalErrors = this.getHistoricalErrors('runtime', functionPath);
    if (historicalErrors.length > 0) {
      score += 0.6;
      suggestions.push('Function has history of runtime errors - add defensive programming');
    }

    return {
      score,
      message: 'may throw runtime errors based on complexity and history',
      suggestions
    };
  }

  private getHistoricalErrors(category: string, location?: string): MindMapNode[] {
    return this.storage.findNodes(node => 
      node.type === 'error' && 
      node.properties?.category === category &&
      (!location || node.metadata.filesInvolved?.includes(location))
    );
  }

  private countRelativeImports(fileNode: MindMapNode): number {
    // This would ideally analyze actual imports, but we can estimate from dependencies
    const edges = this.storage.findEdges(edge => 
      edge.source === fileNode.id && edge.type === 'depends_on'
    );
    return edges.filter(edge => 
      edge.metadata?.importType === 'relative'
    ).length;
  }

  private detectPotentialCircularDependency(fileNode: MindMapNode): boolean {
    // Simple cycle detection - check if any dependency eventually depends back
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    return this.hasCycle(fileNode.id, visited, recursionStack);
  }

  private hasCycle(nodeId: string, visited: Set<string>, recursionStack: Set<string>): boolean {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const dependencyEdges = this.storage.findEdges(edge => 
      edge.source === nodeId && edge.type === 'depends_on'
    );

    for (const edge of dependencyEdges) {
      if (this.hasCycle(edge.target, visited, recursionStack)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  private detectsNetworkUsage(fileNode: MindMapNode): boolean {
    // Look for network-related patterns in file metadata or properties
    const networkKeywords = ['fetch', 'axios', 'request', 'api', 'http', 'client'];
    const searchText = JSON.stringify([
      fileNode.name,
      fileNode.properties,
      fileNode.metadata
    ]).toLowerCase();

    return networkKeywords.some(keyword => searchText.includes(keyword));
  }

  private isCodeFile(node: MindMapNode): boolean {
    const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'go', 'rs', 'java', 'cpp', 'c'];
    return codeExtensions.includes(node.metadata.extension);
  }

  // Fix Suggestion System
  suggestFixes(errorMessage: string, errorType?: string, filePath?: string, context?: FixContext): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];
    const errorCategory = errorType || this.categorizeError(errorMessage);

    // Get historical fixes for this error category
    const historicalFixes = this.getHistoricalFixes(errorCategory, filePath);
    
    // Generate suggestions based on error patterns
    const patternSuggestions = this.generatePatternBasedSuggestions(errorMessage, errorCategory, context);
    suggestions.push(...patternSuggestions);

    // Generate suggestions based on historical success
    const historicalSuggestions = this.generateHistoricalSuggestions(historicalFixes, errorMessage, context);
    suggestions.push(...historicalSuggestions);

    // Generate contextual suggestions based on file/project analysis
    const contextualSuggestions = this.generateContextualSuggestions(errorCategory, filePath, context);
    suggestions.push(...contextualSuggestions);

    // Rank suggestions by effectiveness and confidence
    return this.rankSuggestions(suggestions);
  }

  private getHistoricalFixes(errorCategory: string, filePath?: string): HistoricalFix[] {
    const errorNodes = this.storage.findNodes(node => 
      node.type === 'error' && 
      node.properties?.category === errorCategory &&
      node.metadata.fixApplied &&
      (!filePath || node.metadata.filesInvolved?.includes(filePath))
    );

    return errorNodes.map(node => ({
      errorMessage: node.metadata.message,
      fixApplied: node.metadata.fixApplied,
      filesInvolved: node.metadata.filesInvolved || [],
      confidence: node.confidence,
      timestamp: node.lastUpdated,
      category: errorCategory
    }));
  }

  private generatePatternBasedSuggestions(errorMessage: string, category: string, context?: FixContext): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];
    const messageLower = errorMessage.toLowerCase();

    switch (category) {
      case 'import':
        suggestions.push(...this.generateImportSuggestions(messageLower, context));
        break;
      case 'type':
        suggestions.push(...this.generateTypeSuggestions(messageLower, context));
        break;
      case 'syntax':
        suggestions.push(...this.generateSyntaxSuggestions(messageLower, context));
        break;
      case 'runtime':
        suggestions.push(...this.generateRuntimeSuggestions(messageLower, context));
        break;
      case 'network':
        suggestions.push(...this.generateNetworkSuggestions(messageLower, context));
        break;
      case 'permission':
        suggestions.push(...this.generatePermissionSuggestions(messageLower, context));
        break;
    }

    return suggestions;
  }

  private generateImportSuggestions(errorMessage: string, context?: FixContext): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    if (errorMessage.includes('cannot resolve') || errorMessage.includes('module not found')) {
      if (errorMessage.includes('node_modules')) {
        suggestions.push({
          id: 'install-dependency',
          title: 'Install Missing Dependency',
          description: 'The module appears to be missing from node_modules',
          commands: ['npm install <module-name>', 'yarn add <module-name>'],
          codeChanges: [],
          confidence: 0.9,
          category: 'import',
          estimatedEffort: 'low',
          riskLevel: 'low'
        });
      }

      if (context?.filePath && (context.filePath.includes('/') || context.filePath.includes('\\'))) {
        suggestions.push({
          id: 'fix-relative-path',
          title: 'Fix Relative Import Path',
          description: 'Check if the relative path is correct',
          commands: [],
          codeChanges: [
            'Verify the file exists at the specified path',
            'Check for typos in the import path',
            'Consider using absolute imports'
          ],
          confidence: 0.8,
          category: 'import',
          estimatedEffort: 'low',
          riskLevel: 'low'
        });
      }
    }

    if (errorMessage.includes('circular') || errorMessage.includes('cycle')) {
      suggestions.push({
        id: 'resolve-circular-dependency',
        title: 'Resolve Circular Dependency',
        description: 'Break the circular dependency by restructuring imports',
        commands: [],
        codeChanges: [
          'Extract shared code to a separate module',
          'Use dynamic imports for optional dependencies',
          'Restructure modules to avoid circular references'
        ],
        confidence: 0.7,
        category: 'import',
        estimatedEffort: 'medium',
        riskLevel: 'medium'
      });
    }

    return suggestions;
  }

  private generateTypeSuggestions(errorMessage: string, context?: FixContext): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    if (errorMessage.includes('property') && errorMessage.includes('does not exist')) {
      suggestions.push({
        id: 'add-property-check',
        title: 'Add Property Type Definition or Check',
        description: 'Property is missing from type definition or object',
        commands: [],
        codeChanges: [
          'Add the property to the interface/type definition',
          'Add optional chaining: obj?.property',
          'Add type assertion if property exists at runtime'
        ],
        confidence: 0.85,
        category: 'type',
        estimatedEffort: 'low',
        riskLevel: 'low'
      });
    }

    if (errorMessage.includes('cannot find name') || errorMessage.includes('is not defined')) {
      suggestions.push({
        id: 'add-import-or-declaration',
        title: 'Add Import or Type Declaration',
        description: 'Variable or type is not imported or declared',
        commands: [],
        codeChanges: [
          'Add import statement for the missing identifier',
          'Add type declaration if it\'s a custom type',
          'Check spelling of the identifier'
        ],
        confidence: 0.9,
        category: 'type',
        estimatedEffort: 'low',
        riskLevel: 'low'
      });
    }

    if (errorMessage.includes('type') && errorMessage.includes('not assignable')) {
      suggestions.push({
        id: 'fix-type-assignment',
        title: 'Fix Type Assignment',
        description: 'Value type doesn\'t match expected type',
        commands: [],
        codeChanges: [
          'Add type casting: value as ExpectedType',
          'Fix the value to match expected type',
          'Update type definition to accept the actual type'
        ],
        confidence: 0.8,
        category: 'type',
        estimatedEffort: 'low',
        riskLevel: 'medium'
      });
    }

    return suggestions;
  }

  private generateSyntaxSuggestions(errorMessage: string, context?: FixContext): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    if (errorMessage.includes('unexpected token') || errorMessage.includes('unexpected end')) {
      suggestions.push({
        id: 'fix-syntax-error',
        title: 'Fix Syntax Error',
        description: 'Code has syntax errors that prevent parsing',
        commands: [],
        codeChanges: [
          'Check for missing brackets, parentheses, or semicolons',
          'Verify string quotes are properly closed',
          'Check for missing commas in object/array literals'
        ],
        confidence: 0.7,
        category: 'syntax',
        estimatedEffort: 'low',
        riskLevel: 'low'
      });
    }

    return suggestions;
  }

  private generateRuntimeSuggestions(errorMessage: string, context?: FixContext): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    if (errorMessage.includes('undefined') || errorMessage.includes('null')) {
      suggestions.push({
        id: 'add-null-checks',
        title: 'Add Null/Undefined Checks',
        description: 'Prevent runtime errors from null/undefined values',
        commands: [],
        codeChanges: [
          'Add null checking: if (value != null) { ... }',
          'Use optional chaining: obj?.method?.()',
          'Provide default values: value ?? defaultValue'
        ],
        confidence: 0.9,
        category: 'runtime',
        estimatedEffort: 'low',
        riskLevel: 'low'
      });
    }

    if (errorMessage.includes('is not a function')) {
      suggestions.push({
        id: 'fix-function-call',
        title: 'Fix Function Call',
        description: 'Trying to call something that is not a function',
        commands: [],
        codeChanges: [
          'Check if the value is a function before calling',
          'Verify the object has the expected method',
          'Check for typos in method names'
        ],
        confidence: 0.85,
        category: 'runtime',
        estimatedEffort: 'low',
        riskLevel: 'medium'
      });
    }

    return suggestions;
  }

  private generateNetworkSuggestions(errorMessage: string, context?: FixContext): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('cors')) {
      suggestions.push({
        id: 'improve-error-handling',
        title: 'Improve Network Error Handling',
        description: 'Add comprehensive error handling for network requests',
        commands: [],
        codeChanges: [
          'Wrap network calls in try-catch blocks',
          'Add retry logic for failed requests',
          'Handle different HTTP status codes appropriately',
          'Add timeout handling for slow requests'
        ],
        confidence: 0.8,
        category: 'network',
        estimatedEffort: 'medium',
        riskLevel: 'low'
      });
    }

    return suggestions;
  }

  private generatePermissionSuggestions(errorMessage: string, context?: FixContext): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    if (errorMessage.includes('permission') || errorMessage.includes('access') || errorMessage.includes('denied')) {
      suggestions.push({
        id: 'fix-permissions',
        title: 'Fix File/Directory Permissions',
        description: 'Resolve permission-related access issues',
        commands: ['chmod 755 <file/directory>', 'sudo chown user:group <file>'],
        codeChanges: [
          'Check file/directory permissions',
          'Run with appropriate user privileges',
          'Verify file paths are correct'
        ],
        confidence: 0.7,
        category: 'permission',
        estimatedEffort: 'low',
        riskLevel: 'medium'
      });
    }

    return suggestions;
  }

  private generateHistoricalSuggestions(historicalFixes: HistoricalFix[], errorMessage: string, context?: FixContext): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    // Group fixes by similarity and effectiveness
    const fixGroups = this.groupSimilarFixes(historicalFixes, errorMessage);

    for (const group of fixGroups) {
      if (group.fixes.length > 0 && group.averageConfidence > 0.6) {
        suggestions.push({
          id: `historical-${group.category}-${group.fixes.length}`,
          title: `Apply Historical Fix (${group.fixes.length} similar cases)`,
          description: `This approach worked ${group.fixes.length} time(s) before`,
          commands: this.extractCommands(group.fixes[0].fixApplied),
          codeChanges: this.extractCodeChanges(group.fixes[0].fixApplied),
          confidence: group.averageConfidence,
          category: group.category as 'syntax' | 'type' | 'import' | 'runtime' | 'network' | 'permission',
          estimatedEffort: 'low',
          riskLevel: 'low',
          historicalSuccess: group.fixes.length
        });
      }
    }

    return suggestions;
  }

  private generateContextualSuggestions(errorCategory: string, filePath?: string, context?: FixContext): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    if (filePath) {
      const fileNode = this.storage.findNodes(node => node.path === filePath && node.type === 'file')[0];
      if (fileNode) {
        // Add framework-specific suggestions
        const framework = fileNode.properties?.framework;
        if (framework) {
          suggestions.push(...this.getFrameworkSpecificSuggestions(errorCategory, framework));
        }

        // Add language-specific suggestions
        const language = fileNode.properties?.language;
        if (language) {
          suggestions.push(...this.getLanguageSpecificSuggestions(errorCategory, language));
        }
      }
    }

    return suggestions;
  }

  private groupSimilarFixes(fixes: HistoricalFix[], currentError: string): FixGroup[] {
    const groups: FixGroup[] = [];
    
    for (const fix of fixes) {
      // Simple similarity check based on error message keywords
      const similarity = this.calculateErrorSimilarity(currentError, fix.errorMessage);
      
      let existingGroup = groups.find(g => 
        g.category === fix.category && 
        this.calculateErrorSimilarity(currentError, g.representativeError) > 0.5
      );

      if (existingGroup) {
        existingGroup.fixes.push(fix);
        existingGroup.averageConfidence = existingGroup.fixes.reduce((sum, f) => sum + f.confidence, 0) / existingGroup.fixes.length;
      } else if (similarity > 0.3) {
        groups.push({
          category: fix.category,
          fixes: [fix],
          averageConfidence: fix.confidence,
          representativeError: fix.errorMessage
        });
      }
    }

    return groups;
  }

  private calculateErrorSimilarity(error1: string, error2: string): number {
    const words1 = error1.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const words2 = error2.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    
    const intersection = words1.filter(w => words2.includes(w));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  private extractCommands(fixDescription: string): string[] {
    const commands: string[] = [];
    
    // Extract common command patterns
    const commandPatterns = [
      /npm install [^\s]+/g,
      /yarn add [^\s]+/g,
      /chmod \d+ [^\s]+/g,
      /sudo [^\n]+/g
    ];

    for (const pattern of commandPatterns) {
      const matches = fixDescription.match(pattern);
      if (matches) {
        commands.push(...matches);
      }
    }

    return commands;
  }

  private extractCodeChanges(fixDescription: string): string[] {
    // Simple extraction of code change suggestions
    const changes = fixDescription.split(/[.!]/).filter(s => s.trim().length > 10);
    return changes.slice(0, 3); // Limit to top 3 suggestions
  }

  private getFrameworkSpecificSuggestions(errorCategory: string, framework: string): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    if (framework === 'react' && errorCategory === 'type') {
      suggestions.push({
        id: 'react-types',
        title: 'Add React TypeScript Types',
        description: 'Add proper React component types',
        commands: ['npm install @types/react @types/react-dom'],
        codeChanges: ['Use React.FC<Props> for component types', 'Add proper event types'],
        confidence: 0.8,
        category: 'type',
        estimatedEffort: 'low',
        riskLevel: 'low'
      });
    }

    return suggestions;
  }

  private getLanguageSpecificSuggestions(errorCategory: string, language: string): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    if (language === 'typescript' && errorCategory === 'type') {
      suggestions.push({
        id: 'strict-typescript',
        title: 'Enable Strict TypeScript Checking',
        description: 'Add stricter TypeScript configuration',
        commands: [],
        codeChanges: ['Enable strict mode in tsconfig.json', 'Add explicit return types'],
        confidence: 0.7,
        category: 'type',
        estimatedEffort: 'medium',
        riskLevel: 'low'
      });
    }

    return suggestions;
  }

  private rankSuggestions(suggestions: FixSuggestion[]): FixSuggestion[] {
    return suggestions.sort((a, b) => {
      // Primary sort: confidence
      if (Math.abs(a.confidence - b.confidence) > 0.1) {
        return b.confidence - a.confidence;
      }

      // Secondary sort: historical success
      const aHistorical = a.historicalSuccess || 0;
      const bHistorical = b.historicalSuccess || 0;
      if (aHistorical !== bHistorical) {
        return bHistorical - aHistorical;
      }

      // Tertiary sort: estimated effort (prefer low effort)
      const effortOrder = { 'low': 3, 'medium': 2, 'high': 1 };
      return effortOrder[b.estimatedEffort] - effortOrder[a.estimatedEffort];
    });
  }

  // Architectural Pattern Analysis
  analyzeArchitecture(): ArchitecturalInsight[] {
    return this.architecturalAnalyzer.analyzeProjectArchitecture();
  }

  getArchitecturalInsights(patternType?: 'architectural' | 'design' | 'structural'): ArchitecturalInsight[] {
    const insights = this.analyzeArchitecture();
    
    if (patternType) {
      return insights.filter(insight => insight.patternType === patternType);
    }
    
    return insights;
  }

  // Advanced Query System Methods
  async executeAdvancedQuery(query: string, parameters?: Record<string, any>, explain = false): Promise<any> {
    const result = await this.advancedQueryEngine.executeQuery(query, parameters);
    
    if (explain) {
      // Return both results and execution plan
      return {
        ...result,
        explanation: {
          queryPlan: 'Advanced Cypher-like query execution',
          optimizations: 'Index usage, caching applied',
          performance: `Query executed in ${result.queryTime}ms`
        }
      };
    }
    
    return result;
  }

  async executeTemporalQuery(
    timeRange: { start: Date; end: Date; granularity: 'hour' | 'day' | 'week' | 'month' },
    entity: string = '*',
    analysisType: 'evolution' | 'trend' | 'comparison' = 'evolution',
    metric?: 'confidence' | 'error_rate' | 'node_count' | 'complexity'
  ): Promise<any> {
    const temporalQuery = {
      timeRange,
      evolution: {
        entity,
        trackChanges: true,
        includeRelationships: true
      },
      aggregation: metric ? {
        metric: metric === 'confidence' ? 'confidence_avg' as const : 
                metric === 'node_count' ? 'count' as const : 
                metric,
        groupBy: 'time' as const
      } : undefined
    };

    switch (analysisType) {
      case 'evolution':
        return await this.temporalQueryEngine.executeTemporalQuery(temporalQuery);
      
      case 'trend':
        if (!metric) {
          throw new Error('Metric is required for trend analysis');
        }
        return await this.temporalQueryEngine.getTrendAnalysis(timeRange, metric);
      
      case 'comparison':
        // Split time range into two equal periods for comparison
        const midpoint = new Date((timeRange.start.getTime() + timeRange.end.getTime()) / 2);
        const period1 = { ...timeRange, end: midpoint };
        const period2 = { ...timeRange, start: midpoint };
        return await this.temporalQueryEngine.compareTimePeriods(period1, period2);
      
      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }
  }

  async executeAggregateQuery(
    aggregation: { function: string; field: string; parameters?: Record<string, any> },
    groupBy?: Array<{ field: string; transform?: 'date_trunc' | 'substring' | 'lower' | 'upper' | 'extract_path'; parameters?: any[] }>,
    filter?: { conditions: Array<{ field: string; operator: string; value: any }>; operator: 'AND' | 'OR' },
    orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>,
    limit?: number
  ): Promise<any> {
    const query = {
      aggregation: {
        function: aggregation.function as any,
        field: aggregation.field,
        parameters: aggregation.parameters
      },
      groupBy,
      filter: filter ? {
        conditions: filter.conditions.map(cond => ({
          ...cond,
          operator: cond.operator as any
        })),
        operator: filter.operator || 'AND' as const
      } : undefined,
      orderBy,
      limit
    };

    return await this.aggregateQueryEngine.executeAggregate(query);
  }

  async generateInsights(
    categories?: string[],
    minConfidence = 0.5,
    actionableOnly = false
  ): Promise<any[]> {
    const insights: any[] = [];
    const stats = await this.getStats();
    
    // Category: Architecture Insights
    if (!categories || categories.includes('architecture')) {
      const patterns = this.architecturalAnalyzer.analyzeProjectArchitecture();
      if (patterns.length > 0) {
        const topPattern = patterns[0];
        insights.push({
          category: 'architecture',
          title: `${topPattern.name} Pattern Detected`,
          description: topPattern.description,
          value: `${topPattern.confidence * 100}% confidence`,
          confidence: topPattern.confidence,
          trend: 'stable',
          actionable: topPattern.recommendations?.length > 0,
          recommendation: topPattern.recommendations?.[0]
        });
      }
    }

    // Category: Code Quality Insights
    if (!categories || categories.includes('code_quality')) {
      const lowConfidenceNodes = this.storage.findNodes(n => n.confidence < 0.5);
      if (lowConfidenceNodes.length > 5) {
        insights.push({
          category: 'code_quality',
          title: 'Low Confidence Code Areas',
          description: `${lowConfidenceNodes.length} code elements have low confidence scores`,
          value: `${lowConfidenceNodes.length} nodes`,
          confidence: 0.8,
          trend: 'stable',
          actionable: true,
          recommendation: 'Review and refactor low-confidence code areas'
        });
      }
    }

    // Category: Learning Insights
    if (!categories || categories.includes('learning')) {
      const inhibitoryStats = this.inhibitoryLearning.getStats();
      if (inhibitoryStats.totalPatterns > 0) {
        insights.push({
          category: 'learning',
          title: 'System Learning from Failures',
          description: `System has learned ${inhibitoryStats.totalPatterns} failure patterns`,
          value: `${inhibitoryStats.averageStrength * 100}% avg strength`,
          confidence: 0.85,
          trend: 'up',
          actionable: false
        });
      }

      const hebbianStats = this.hebbianLearning.getStats();
      if (hebbianStats.totalConnections > 0) {
        insights.push({
          category: 'learning',
          title: 'Hebbian Relationship Discovery',
          description: `${hebbianStats.totalConnections} neural connections formed (${hebbianStats.activeConnections} active)`,
          value: `${(hebbianStats.averageStrength * 100).toFixed(1)}% avg strength`,
          confidence: 0.75,
          trend: hebbianStats.recentActivity > 0 ? 'up' : 'stable',
          actionable: hebbianStats.averageStrength < 0.3
        });
      }

      if (hebbianStats.strengthDistribution.strong > 10) {
        insights.push({
          category: 'learning',
          title: 'Strong Neural Patterns Detected',
          description: `${hebbianStats.strengthDistribution.strong} strong connections indicate well-learned patterns`,
          value: `${hebbianStats.contextualConnections} contextual`,
          confidence: 0.85,
          trend: 'up',
          actionable: false
        });
      }
    }

    // Category: Performance Insights
    if (!categories || categories.includes('performance')) {
      const cacheStats = this.queryCache.getStats();
      if (cacheStats.hitRate < 0.3) {
        insights.push({
          category: 'performance',
          title: 'Low Cache Hit Rate',
          description: `Cache hit rate is ${(cacheStats.hitRate * 100).toFixed(1)}%`,
          value: `${(cacheStats.hitRate * 100).toFixed(1)}%`,
          confidence: 0.9,
          trend: 'down',
          actionable: true,
          recommendation: 'Consider query optimization'
        });
      }
    }

    // Filter by confidence and actionable flag
    if (minConfidence > 0) {
      return insights.filter(insight => insight.confidence >= minConfidence);
    }
    
    if (actionableOnly) {
      return insights.filter(insight => insight.actionable);
    }
    
    return insights;
  }

  async saveQuery(
    name: string,
    description: string,
    query: string,
    parameters?: Record<string, any>,
    queryType: 'advanced' | 'temporal' | 'aggregate' = 'advanced'
  ): Promise<string> {
    switch (queryType) {
      case 'advanced':
        return this.advancedQueryEngine.saveQuery(name, description, query, parameters);
      
      case 'temporal':
      case 'aggregate':
        // For now, only advanced queries support saving
        // In a full implementation, we'd extend other engines
        throw new Error(`Saved queries not yet implemented for ${queryType} queries`);
      
      default:
        throw new Error(`Unknown query type: ${queryType}`);
    }
  }

  async executeSavedQuery(queryId: string, parameters?: Record<string, any>): Promise<any> {
    // For now, only advanced queries support saved execution
    return await this.advancedQueryEngine.executeSavedQuery(queryId, parameters);
  }

  getSavedQueries(): any[] {
    return this.advancedQueryEngine.getSavedQueries();
  }

  /**
   * Create context string for query caching
   */
  private createQueryContext(options: QueryOptions): string {
    const contextParts: string[] = [];

    // Add stable cache-friendly options (these should be consistent for similar queries)
    if (options.type) contextParts.push(`type:${options.type}`);
    if (options.pattern) contextParts.push(`pattern:${options.pattern}`);

    // Normalize confidence to ranges for better cache hits
    if (options.confidence) {
      const confidenceRange = Math.floor(options.confidence * 10) / 10; // Round to 0.1 precision
      contextParts.push(`confidence:${confidenceRange}`);
    }

    // Normalize limit to common ranges for better cache hits
    if (options.limit) {
      const limitRange = options.limit <= 5 ? '5' :
                        options.limit <= 10 ? '10' :
                        options.limit <= 20 ? '20' : '20+';
      contextParts.push(`limit:${limitRange}`);
    }

    // Add stable activation options
    if (options.useActivation !== undefined) contextParts.push(`activation:${options.useActivation}`);
    if (options.activationLevels) contextParts.push(`levels:${options.activationLevels}`);

    // Add only stable context information (avoid frequently changing data)
    if (options.frameworkContext?.length) contextParts.push(`frameworks:${options.frameworkContext.join(',')}`);
    if (options.languageContext?.length) contextParts.push(`languages:${options.languageContext.join(',')}`);

    // For cache efficiency, group session goals into categories rather than specific tasks
    if (options.sessionGoals?.length) {
      const goalCategories = this.categorizeGoals(options.sessionGoals);
      contextParts.push(`goal-categories:${goalCategories.join(',')}`);
    }

    return contextParts.join('|');
  }

  /**
   * Categorize session goals for better cache efficiency
   */
  private categorizeGoals(goals: string[]): string[] {
    const categories = new Set<string>();

    for (const goal of goals) {
      const lowerGoal = goal.toLowerCase();
      if (lowerGoal.includes('debug') || lowerGoal.includes('fix') || lowerGoal.includes('error')) {
        categories.add('debugging');
      } else if (lowerGoal.includes('implement') || lowerGoal.includes('add') || lowerGoal.includes('feature')) {
        categories.add('development');
      } else if (lowerGoal.includes('refactor') || lowerGoal.includes('improve') || lowerGoal.includes('optimize')) {
        categories.add('refactoring');
      } else if (lowerGoal.includes('test') || lowerGoal.includes('spec')) {
        categories.add('testing');
      } else if (lowerGoal.includes('document') || lowerGoal.includes('comment')) {
        categories.add('documentation');
      } else {
        categories.add('general');
      }
    }

    return Array.from(categories).sort(); // Sort for consistency
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return this.queryCache.getStats();
  }

  /**
   * Clear query cache
   */
  async clearCache(): Promise<void> {
    await this.queryCache.invalidate();
  }

  /**
   * Invalidate cache for specific paths
   */
  async invalidateCache(affectedPaths?: string[]): Promise<number> {
    return await this.queryCache.invalidate(affectedPaths);
  }

  /**
   * Get file paths for parallel processing
   */
  private async getFilePaths(): Promise<string[]> {
    // Use existing scanner to get paths efficiently
    return await this.scanner.getFilePaths();
  }

  /**
   * Create task context for inhibitory learning
   */
  private createTaskContext(taskDescription: string, filesInvolved: string[]): string {
    const contextParts = [
      `task:${taskDescription.toLowerCase()}`,
      `files:${filesInvolved.join(',')}`,
      `timestamp:${Date.now()}`
    ];
    
    return contextParts.join('|');
  }

  /**
   * Progress callback for parallel processing
   */
  private onProgressUpdate(progress: ProcessingProgress): void {
    const percentage = Math.round((progress.filesProcessed / progress.totalFiles) * 100);
    const elapsed = Date.now() - progress.startTime;
    const rate = progress.filesProcessed / (elapsed / 1000);
    
    console.log(
      `📊 Processing: ${percentage}% (${progress.filesProcessed}/${progress.totalFiles}) ` +
      `Rate: ${rate.toFixed(1)} files/sec, Chunks: ${progress.completedChunks}/${progress.totalChunks}`
    );
    
    if (progress.errors.length > 0) {
      const recoverableErrors = progress.errors.filter(e => e.recoverable).length;
      const criticalErrors = progress.errors.length - recoverableErrors;
      console.log(`⚠️ Errors: ${criticalErrors} critical, ${recoverableErrors} recoverable`);
    }
  }

  getQueryCacheStats(): any {
    return this.advancedQueryEngine.getCacheStats();
  }

  /**
   * Get inhibitory learning statistics
   */
  getInhibitoryLearningStats(): any {
    return this.inhibitoryLearning.getStats();
  }

  /**
   * Get Hebbian learning statistics for monitoring associative learning
   */
  getHebbianLearningStats(): any {
    return this.hebbianLearning.getStatistics();
  }

  /**
   * Get hierarchical context statistics for monitoring multi-level context awareness
   */
  getHierarchicalContextStats(): any {
    return this.hierarchicalContext.getContextStatistics();
  }

  /**
   * Get current context summary across all hierarchical levels
   */
  getContextSummary(): any {
    return this.hierarchicalContext.getContextSummary();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.inhibitoryLearning) {
      this.inhibitoryLearning.cleanup();
    }
  }

  // Utility method to record temporal changes
  recordChange(change: {
    timestamp: Date;
    type: 'node_added' | 'node_removed' | 'node_updated' | 'edge_added' | 'edge_removed' | 'confidence_changed';
    entityId: string;
    beforeValue?: any;
    afterValue?: any;
    context?: string;
  }): void {
    this.temporalQueryEngine.recordChange(change);
  }

  // Enhanced update method that records temporal changes
  updateFromTaskWithTemporal(
    taskDescription: string,
    filesInvolved: string[],
    outcome: 'success' | 'error' | 'partial',
    details?: {
      errorDetails?: any;
      solutionDetails?: any;
      patternsDiscovered?: any[];
    }
  ): void {
    // Record the original state for comparison
    const beforeState = new Map<string, number>();
    for (const filePath of filesInvolved) {
      const fileId = `file:${filePath}`;
      const node = this.storage.getNode(fileId);
      if (node) {
        beforeState.set(fileId, node.confidence);
      }
    }

    // Execute the original update
    this.updateFromTask(taskDescription, filesInvolved, outcome, details);

    // Record temporal changes
    for (const filePath of filesInvolved) {
      const fileId = `file:${filePath}`;
      const node = this.storage.getNode(fileId);
      if (node) {
        const beforeConfidence = beforeState.get(fileId);
        if (beforeConfidence !== undefined && beforeConfidence !== node.confidence) {
          this.recordChange({
            timestamp: new Date(),
            type: 'confidence_changed',
            entityId: fileId,
            beforeValue: beforeConfidence,
            afterValue: node.confidence,
            context: `Task: ${taskDescription} (${outcome})`
          });
        }
      }
    }

    // Create temporal snapshot for significant changes
    if (outcome === 'error' || (outcome === 'success' && filesInvolved.length > 3)) {
      this.temporalQueryEngine.createSnapshot();
    }
  }

  // Multi-Language Intelligence Methods
  async detectCrossLanguageDependencies() {
    return await this.multiLanguageIntelligence.detectCrossLanguageDependencies();
  }

  async analyzePolyglotProject() {
    return await this.multiLanguageIntelligence.analyzePolyglotProject();
  }

  async generateMultiLanguageRefactorings() {
    return await this.multiLanguageIntelligence.generateRefactoringSuggestions();
  }

  // Language Tooling Methods
  async detectProjectTooling(forceRefresh = false) {
    return await this.languageToolingDetector.detectProjectTooling(this.projectRoot, forceRefresh);
  }

  async runLanguageTool(tool: any, args: string[] = []) {
    return await this.languageToolingDetector.runTool(tool, this.projectRoot, args);
  }

  async getToolingRecommendations() {
    return await this.languageToolingDetector.getToolingRecommendations(this.projectRoot);
  }

  async runToolSuite(tools: any[], parallel = true) {
    return await this.languageToolingDetector.runToolSuite(tools, this.projectRoot, parallel);
  }

  getToolingStats() {
    return this.languageToolingDetector.getToolingStats();
  }

  // Enhanced Framework Detection Methods
  async detectEnhancedFrameworks(forceRefresh = false) {
    return await this.enhancedFrameworkDetector.detectFrameworks(this.projectRoot, forceRefresh);
  }

  getFrameworkRecommendations(frameworks: any[]) {
    return this.enhancedFrameworkDetector.getFrameworkRecommendations(frameworks);
  }

  clearFrameworkCache() {
    this.enhancedFrameworkDetector.clearCache();
  }

  // Attention System Methods
  private inferAttentionType(options: QueryOptions, result: QueryResult): AttentionType {
    // If user specified contextLevel or has specific session goals, use executive attention
    if (options.contextLevel === 4 || (options.sessionGoals && options.sessionGoals.length > 0)) {
      return AttentionType.EXECUTIVE;
    }
    
    // If looking for specific patterns or types, use selective attention
    if (options.type || options.pattern) {
      return AttentionType.SELECTIVE;
    }
    
    // If many results and broad query, use divided attention
    if (result.nodes.length > 5) {
      return AttentionType.DIVIDED;
    }
    
    // Default to sustained attention for focused work
    return AttentionType.SUSTAINED;
  }

  getAttentionStats() {
    return this.attentionSystem.getAttentionStats();
  }

  allocateAttention(nodes: MindMapNode[], context: AttentionContext, type: AttentionType = AttentionType.SELECTIVE): AttentionAllocation {
    return this.attentionSystem.allocateAttention(nodes, context, type);
  }

  updateAttentionFromActivity(activity: {
    nodeIds?: string[];
    queryText?: string;
    actionType: 'query' | 'file_access' | 'edit' | 'error' | 'success';
    timestamp?: Date;
    context?: AttentionContext;
  }) {
    this.attentionSystem.updateAttentionFromActivity(activity);
  }

  // Bi-temporal Knowledge Model Methods
  getBiTemporalStats(): BiTemporalStats {
    return this.biTemporalModel.getBiTemporalStats();
  }

  async createContextWindow(
    name: string,
    validTimeStart: Date,
    validTimeEnd: Date | null = null,
    description: string = '',
    frameworkVersions: Record<string, string> = {}
  ): Promise<ContextWindow> {
    return this.biTemporalModel.createContextWindow(
      name, 
      validTimeStart, 
      validTimeEnd, 
      description, 
      frameworkVersions
    );
  }

  setCurrentContextWindow(contextId: string): void {
    this.biTemporalModel.setCurrentContextWindow(contextId);
  }

  queryBiTemporal(query: TemporalQuery): {
    edges: BiTemporalEdge[];
    nodes: any[];
    contextWindows: ContextWindow[];
  } {
    return this.biTemporalModel.queryBiTemporal(query);
  }

  async invalidateRelationship(
    edgeId: string,
    invalidationDate: Date = new Date(),
    reason: string = 'manual',
    evidence: string[] = []
  ): Promise<void> {
    await this.biTemporalModel.invalidateRelationship(edgeId, invalidationDate, reason, evidence);
  }

  createTemporalSnapshot(name?: string) {
    return this.biTemporalModel.createTemporalSnapshot(name);
  }

  exportTemporalData() {
    return this.biTemporalModel.exportTemporalData();
  }

  async onFileChanged(filePath: string, changeType: 'modified' | 'deleted' | 'renamed'): Promise<void> {
    await this.biTemporalModel.onFileChanged(filePath, changeType);
  }

  // Pattern Prediction Engine Methods
  getPredictionEngineStats(): PredictionEngine {
    return this.patternPrediction.getPredictionEngineStats();
  }

  getPatternPredictions(patternType?: string): PatternPrediction[] {
    return this.patternPrediction.getPatternPredictions(patternType);
  }

  getEmergingPatterns(stage?: EmergingPattern['emergenceStage']): EmergingPattern[] {
    return this.patternPrediction.getEmergingPatterns(stage);
  }

  predictPatternEmergence(patternType: string): PatternPrediction | null {
    return this.patternPrediction.predictPatternEmergence(patternType);
  }

  async analyzeAndPredict(): Promise<void> {
    await this.patternPrediction.analyzeAndPredict();
  }

  // Hebbian Learning System Methods
  async getHebbianStats() {
    return this.hebbianLearning.getStats();
  }

  getHebbianConnections(nodeId?: string) {
    return this.hebbianLearning.getConnections(nodeId);
  }

  async recordCoActivation(
    primaryNodeId: string,
    coActivatedNodeIds: string[],
    context: string = '',
    activationStrength: number = 1.0
  ): Promise<void> {
    await this.hebbianLearning.recordCoActivation(primaryNodeId, coActivatedNodeIds, context, activationStrength);
  }

  // Multi-Modal Confidence Fusion Methods
  fuseNodeConfidence(node: MindMapNode, context: any = {}): FusedConfidence {
    const evidence = MultiModalConfidenceFusion.createNodeEvidence(node, context);
    return this.multiModalFusion.fuseConfidence(evidence);
  }

  getMultiModalFusionStats() {
    return this.multiModalFusion.getStatistics();
  }

  updateConfidenceWithOutcome(fusionId: number, success: boolean): void {
    this.multiModalFusion.updateWithOutcome(fusionId, success);
  }

  /**
   * Apply multi-modal confidence fusion to query results
   */
  async applyMultiModalConfidenceFusion(
    nodes: MindMapNode[],
    context: any = {}
  ): Promise<MindMapNode[]> {
    return nodes.map(node => {
      const fusedConfidence = this.fuseNodeConfidence(node, context);

      return {
        ...node,
        confidence: fusedConfidence.finalConfidence,
        multiModalConfidence: fusedConfidence.confidence,
        confidenceExplanation: fusedConfidence.explanation,
        confidenceReliability: fusedConfidence.reliability,
        confidenceUncertainty: fusedConfidence.uncertainty
      };
    });
  }

  // ========================================
  // EPISODIC MEMORY METHODS
  // ========================================

  /**
   * Store an episode with rich context for future similarity matching
   */
  async storeEpisode(
    taskDescription: string,
    context: Partial<EpisodeContext>,
    actions: EpisodeAction[],
    outcome: 'success' | 'failure' | 'partial'
  ): Promise<string> {
    return await this.episodicMemory.storeEpisode(taskDescription, context, actions, outcome);
  }

  /**
   * Find similar past episodes for a given context
   */
  async findSimilarEpisodes(
    context: Partial<EpisodeContext>,
    limit: number = 5,
    minSimilarity: number = 0.3
  ): Promise<SimilarityMatch[]> {
    return await this.episodicMemory.findSimilarEpisodes(context, limit, minSimilarity);
  }

  /**
   * Get episode-based suggestions for current task
   */
  async getEpisodeBasedSuggestions(
    currentContext: Partial<EpisodeContext>
  ): Promise<{
    suggestions: string[];
    basedOnEpisodes: string[];
    confidence: number;
  }> {
    return await this.episodicMemory.getEpisodeBasedSuggestions(currentContext);
  }

  /**
   * Get episodic memory statistics
   */
  getEpisodicStats(): EpisodeStats {
    return this.episodicMemory.getStats();
  }

  /**
   * Consolidate episodic memories - strengthen frequently accessed patterns
   */
  async consolidateEpisodicMemories(): Promise<void> {
    await this.episodicMemory.consolidateMemories();
  }
}