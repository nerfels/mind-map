export interface MindMapNode {
  id: string;
  type: 'file' | 'directory' | 'function' | 'class' | 'error' | 'pattern';
  name: string;
  path?: string;
  metadata: Record<string, any>;
  confidence: number;
  lastUpdated: Date;
  properties: Record<string, any>;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  type: 'contains' | 'imports' | 'calls' | 'fixes' | 'relates_to' | 'depends_on';
  weight: number;
  confidence: number;
  metadata: Record<string, any>;
}

export interface MindMapGraph {
  nodes: Map<string, MindMapNode>;
  edges: Map<string, MindMapEdge>;
  projectRoot: string;
  lastScan: Date;
  version: string;
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
}

export interface QueryResult {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  totalMatches: number;
  queryTime: number;
  cached?: boolean;
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