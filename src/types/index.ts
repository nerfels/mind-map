export interface MindMapNode {
  id: string;
  type: 'file' | 'directory' | 'function' | 'class' | 'error' | 'pattern' | 'episodic_memory' | 'call_pattern';
  name: string;
  path?: string;
  metadata: Record<string, any>;
  confidence: number;
  lastUpdated: Date;
  properties?: Record<string, any>;
  frameworks?: string[];
  createdAt?: Date;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  type: 'contains' | 'imports' | 'calls' | 'fixes' | 'relates_to' | 'depends_on' | 'detects' | 'co_activates';
  weight?: number;
  confidence: number;
  metadata?: Record<string, any>;
  created?: Date;
  lastUpdated?: Date;
  createdAt?: Date;
  // Compatibility properties for Hebbian system
  sourceId?: string;
  targetId?: string;
}

export interface MindMapGraph {
  nodes: Map<string, MindMapNode>;
  edges: Map<string, MindMapEdge>;
  projectRoot: string;
  lastScan: Date;
  version: string;
}

export interface ScalabilityConfig {
  // Project size thresholds
  smallProjectThreshold: number;    // < 1000 files
  mediumProjectThreshold: number;   // < 10000 files
  largeProjectThreshold: number;    // < 100000 files

  // Scanning limits
  maxFilesPerScan: number;          // Maximum files to scan at once
  maxDepth: number;                 // Maximum directory depth
  maxFileSize: number;              // Maximum file size to analyze (bytes)

  // Memory limits
  maxNodesInMemory: number;         // Maximum nodes to keep in memory
  maxEdgesInMemory: number;         // Maximum edges to keep in memory
  maxCacheSize: number;             // Maximum cache size (bytes)

  // Performance thresholds
  scanTimeoutMs: number;            // Timeout for individual scans
  queryTimeoutMs: number;           // Timeout for individual queries
  memoryPressureThreshold: number;  // Memory usage percentage to trigger cleanup

  // Partitioning strategy
  enablePartitioning: boolean;      // Enable graph partitioning
  partitionSize: number;            // Target nodes per partition
  partitionOverlap: number;         // Overlap percentage between partitions

  // Incremental analysis
  enableIncrementalAnalysis: boolean; // Enable incremental updates
  changeThreshold: number;          // Percentage of changes to trigger full rescan
  watchModeEnabled: boolean;        // Enable file system watching
}

export interface ProjectScale {
  scale: 'small' | 'medium' | 'large' | 'enterprise';
  fileCount: number;
  directoryCount: number;
  totalSize: number;
  estimatedMemoryUsage: number;
  recommendedConfig: Partial<ScalabilityConfig>;
}

export interface ResourceUsage {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  nodeCount: number;
  edgeCount: number;
  cacheUsage: {
    size: number;
    hitRate: number;
    evictions: number;
  };
  performanceMetrics: {
    avgScanTime: number;
    avgQueryTime: number;
    slowOperations: number;
  };
}

// Phase 4.4: User Customization Types
export interface UserPreferences {
  // General preferences
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;

  // Analysis preferences
  enableIntelligentSuggestions: boolean;
  confidenceThreshold: number;
  maxResults: number;
  autoScanOnChange: boolean;

  // Learning preferences
  enableLearning: boolean;
  learningRate: number;
  rememberFailures: boolean;
  adaptToWorkflow: boolean;

  // Privacy preferences
  collectTelemetry: boolean;
  shareUsageData: boolean;
  localStorageOnly: boolean;

  // Performance preferences
  maxMemoryUsage: number;
  enableCaching: boolean;
  parallelProcessing: boolean;
  backgroundScanning: boolean;
}

export interface CustomPatternRule {
  id: string;
  name: string;
  description: string;
  pattern: string | RegExp;
  category: 'architectural' | 'design' | 'code_quality' | 'security' | 'performance';
  severity: 'info' | 'warning' | 'error';
  confidence: number;
  enabled: boolean;
  fileTypes: string[];
  languages: string[];
  frameworks: string[];
  metadata: Record<string, any>;
  created: Date;
  lastModified: Date;
}

export interface ProjectLearningConfig {
  projectId: string;
  projectName: string;

  // Learning behavior
  enableHebbianLearning: boolean;
  enableInhibitoryLearning: boolean;
  enablePatternLearning: boolean;

  // Learning parameters
  learningRate: number;
  decayRate: number;
  confidenceThreshold: number;

  // Pattern recognition
  customPatterns: CustomPatternRule[];
  disabledPatterns: string[];

  // File and directory preferences
  ignorePatterns: string[];
  priorityDirectories: string[];
  excludeDirectories: string[];

  // Framework-specific settings
  frameworkOverrides: Record<string, any>;

  // Feedback and ratings
  enableFeedbackCollection: boolean;
  autoRating: boolean;
}

export interface PrivacySettings {
  // Data collection
  collectUsageStatistics: boolean;
  collectErrorReports: boolean;
  collectPerformanceMetrics: boolean;

  // Data storage
  encryptLocalData: boolean;
  localOnlyMode: boolean;
  dataRetentionDays: number;

  // Data sharing
  shareAnonymizedData: boolean;
  shareWithTeam: boolean;
  exportDataEnabled: boolean;

  // Security
  requireAuthentication: boolean;
  sessionTimeout: number;
  auditLogging: boolean;
}

export interface UserFeedback {
  id: string;
  type: 'suggestion_rating' | 'feature_request' | 'bug_report' | 'general';
  rating: number; // 1-5 scale
  comment: string;
  context: {
    feature: string;
    query?: string;
    suggestions?: any[];
    timestamp: Date;
    sessionId: string;
  };
  metadata: {
    version: string;
    projectScale: string;
    userExperience: 'beginner' | 'intermediate' | 'expert';
  };
  status: 'new' | 'reviewed' | 'addressed' | 'dismissed';
  created: Date;
  lastModified: Date;
}

export interface UserConfiguration {
  version: string;
  userId: string;
  preferences: UserPreferences;
  projectConfigs: Map<string, ProjectLearningConfig>;
  customPatterns: CustomPatternRule[];
  privacySettings: PrivacySettings;
  feedback: UserFeedback[];
  created: Date;
  lastModified: Date;
}

export interface FileInfo {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size: number;
  extension?: string;
  mimeType?: string;
  lastModified: Date;
  isIgnored: boolean;
}

export interface CodeStructure {
  functions: Array<{
    name: string;
    startLine: number;
    endLine: number;
    parameters: string[];
    returnType?: string;
  }>;
  classes: Array<{
    name: string;
    startLine: number;
    endLine: number;
    methods: string[];
    properties: string[];
  }>;
  imports: Array<{
    module: string;
    path?: string;
    type: 'default' | 'named' | 'namespace';
  }>;
  exports: Array<{
    name: string;
    type: 'default' | 'named';
  }>;
}

export interface QueryOptions {
  type?: MindMapNode['type'];
  pattern?: string;
  confidence?: number;
  limit?: number;
  includeMetadata?: boolean;
  // Associative query options
  useActivation?: boolean; // Enable activation spreading (default: true for better results)
  activationLevels?: number; // Number of activation levels to spread (default: 3)
  contextBoost?: boolean; // Enable context-aware relevance boosting (default: true)
  // Caching options
  bypassCache?: boolean; // Skip cache lookup (default: false)
  // Inhibitory learning options
  bypassInhibition?: boolean; // Skip inhibitory learning application (default: false)
  // Hebbian learning options
  bypassHebbianLearning?: boolean; // Skip Hebbian co-activation recording (default: false)
  // Attention system options
  bypassAttention?: boolean; // Skip attention system application (default: false)
  // Bi-temporal system options
  bypassBiTemporal?: boolean; // Skip bi-temporal processing (default: false)
  // Multi-modal confidence fusion options
  bypassMultiModalFusion?: boolean; // Skip multi-modal confidence fusion (default: false)
  // Hierarchical context options
  contextLevel?: 1 | 2 | 3 | 4; // 1=immediate, 2=session, 3=project, 4=domain
  includeParentContext?: boolean; // Include higher-level context (default: true)
  includeChildContext?: boolean; // Include lower-level context (default: false)
  // Context for activation spreading
  currentTask?: string;
  activeFiles?: string[];
  recentErrors?: string[];
  sessionGoals?: string[];
  frameworkContext?: string[];
  languageContext?: string[];
  // Bi-temporal query options
  validAt?: Date; // Query relationships valid at this point in time
  includeHistory?: boolean; // Include revision history in results
}

export interface QueryResult {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  totalMatches: number;
  queryTime: number;
  cached?: boolean;
  // Inhibitory learning results
  inhibitionApplied?: boolean;
  inhibitionScore?: number; // 0-1, how much was inhibited
  originalResultCount?: number; // Count before inhibition
  // Activation-specific results
  activationResults?: Array<{
    nodeId: string;
    activationStrength: number;
    hopDistance: number;
    contextRelevance: number;
    totalScore: number;
  }>;
  usedActivation?: boolean;
  activationLevels?: number;
}

// Predictive Error Detection Interfaces
export interface ErrorPrediction {
  id: string;
  type: 'syntax' | 'type' | 'import' | 'runtime' | 'network' | 'permission';
  message: string;
  filePath: string;
  functionName?: string;
  riskScore: number; // 0.0 to 1.0, higher = more likely to cause errors
  suggestedActions: string[];
  basedOnPattern: string; // What analysis pattern this prediction is based on
}

export interface RiskAssessment {
  score: number;
  message: string;
  suggestions: string[];
}

// Fix Suggestion System Interfaces
export interface FixSuggestion {
  id: string;
  title: string;
  description: string;
  commands: string[]; // Shell commands to run
  codeChanges: string[]; // Code modifications to make
  confidence: number; // 0.0 to 1.0, higher = more likely to work
  category: 'syntax' | 'type' | 'import' | 'runtime' | 'network' | 'permission';
  estimatedEffort: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high'; // Risk of applying this fix
  historicalSuccess?: number; // Number of times this fix worked before
}

export interface FixContext {
  filePath?: string;
  functionName?: string;
  lineNumber?: number;
  framework?: string;
  language?: string;
  additionalContext?: Record<string, any>;
}

export interface HistoricalFix {
  errorMessage: string;
  fixApplied: string;
  filesInvolved: string[];
  confidence: number;
  timestamp: Date;
  category: string;
}

export interface FixGroup {
  category: string;
  fixes: HistoricalFix[];
  averageConfidence: number;
  representativeError: string;
}

// Architectural Pattern Detection Interfaces
export interface ArchitecturalPattern {
  id: string;
  name: string;
  description: string;
  category: 'architectural' | 'design' | 'structural';
}

export interface ArchitecturalInsight {
  id: string;
  patternType: 'architectural' | 'design' | 'structural';
  name: string;
  description: string;
  confidence: number; // 0.0 to 1.0
  evidence: string[]; // What led to this detection
  affectedFiles: string[]; // Files that demonstrate this pattern
  recommendations: string[]; // Suggestions for improving the pattern
}

// Parallel Processing Interfaces (Phase 6.1.3)
export interface ProcessingChunk {
  id: string;
  files: string[];
  startIndex: number;
  endIndex: number;
}

export interface ChunkResult {
  chunkId: string;
  processedFiles: FileInfo[];
  errors: ChunkError[];
  processingTime: number;
}

export interface ChunkError {
  filePath: string;
  error: string;
  recoverable: boolean;
}

export interface ProcessingProgress {
  totalChunks: number;
  completedChunks: number;
  currentChunk?: string;
  filesProcessed: number;
  totalFiles: number;
  errors: ChunkError[];
  startTime: number;
  estimatedCompletion?: number;
}

export interface ParallelProcessingConfig {
  chunkSize: number;
  maxWorkers: number;
  timeoutMs: number;
  retryAttempts: number;
  progressCallback?: (progress: ProcessingProgress) => void;
}

// Inhibitory Learning Interfaces (Phase 6.2.1)
export interface TaskOutcome {
  taskDescription: string;
  outcome: 'success' | 'error' | 'partial';
  timestamp: Date;
  errorDetails?: any;
  involvedFiles: string[];
  context: string;
}

export interface InhibitoryPattern {
  id: string;
  triggerConditions: string[];
  inhibitedNodes: string[];
  strength: number; // 0-1, strength of inhibition
  basedOnFailures: TaskOutcome[];
  created: Date;
  lastReinforced: Date;
  reinforcementCount: number;
  decayRate: number; // How fast the pattern weakens over time
  context: string; // Context in which this pattern applies
}

export interface FailureSignature {
  errorType: string;
  errorMessage: string;
  contextHash: string;
  involvedFiles: string[];
  failureConditions: string[];
  extractedKeywords: string[];
}

export interface InhibitionResult {
  originalResults: MindMapNode[];
  inhibitedResults: MindMapNode[];
  appliedPatterns: InhibitoryPattern[];
  inhibitionScore: number; // How much was inhibited (0-1)
}

export interface InhibitoryLearningConfig {
  maxPatterns: number;
  strengthThreshold: number; // Minimum strength to apply inhibition
  decayInterval: number; // How often to apply decay (milliseconds)
  reinforcementMultiplier: number; // How much to strengthen on repeated failures
  contextSimilarityThreshold: number; // For matching similar contexts
}

// Query Caching Interfaces (Phase 6.1.2)
export interface CacheEntry {
  query: string;
  context: string;
  results: QueryResult;
  timestamp: Date;
  hitCount: number;
  lastAccessed: Date;
  contextHash: string; // For fast context similarity matching
  resultSize: number; // For memory management
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  memoryUsage: number; // bytes
  maxMemoryUsage: number; // bytes
  evictionCount: number;
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface CacheConfig {
  maxEntries: number;
  maxMemoryMB: number;
  contextSimilarityThreshold: number; // 0-1, for considering entries similar
  ttlMinutes: number; // Time-to-live for cache entries
}

// Performance Monitoring Interfaces
export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  operationCount: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  recentMetrics: PerformanceMetric[];
}

// Call Pattern Analysis Interfaces
export interface CallPattern {
  callerId: string;
  callerName: string;
  callerType: 'function' | 'method' | 'constructor';
  calleeId: string;
  calleeName: string;
  calleeType: 'function' | 'method' | 'constructor' | 'external';
  callType: 'direct_call' | 'method_call' | 'constructor_call' | 'callback' | 'async_call';
  sourceFile: string;
  targetFile?: string;
  lineNumber: number;
  confidence: number;
  context: {
    isConditional?: boolean;
    isLoop?: boolean;
    isAsyncContext?: boolean;
    isTryCatch?: boolean;
    parameterCount: number;
    hasReturnValue: boolean;
  };
}

export interface FunctionCallGraph {
  nodes: Map<string, CallGraphNode>;
  edges: CallPattern[];
  entryPoints: string[];
  cycles: string[][];
  depth: number;
}

export interface CallGraphNode {
  id: string;
  name: string;
  type: 'function' | 'method' | 'constructor';
  filePath: string;
  lineNumber: number;
  incomingCalls: number;
  outgoingCalls: number;
  complexity: number;
  isRecursive: boolean;
}

export interface CallPatternAnalysis {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  callPatterns: CallPattern[];
  callGraph: FunctionCallGraph;
  statistics: {
    totalCallPatterns: number;
    directCalls: number;
    methodCalls: number;
    constructorCalls: number;
    asyncCalls: number;
    recursiveFunctions: number;
    averageComplexity: number;
    maxCallDepth: number;
  };
}