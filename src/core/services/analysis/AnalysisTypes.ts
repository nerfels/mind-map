/**
 * Shared types for Analysis Services
 * Extracted from AnalysisService.ts to eliminate duplication
 */

import {
  ArchitecturalInsight,
  ErrorPrediction,
  RiskAssessment,
  FixSuggestion,
  FixContext,
  HistoricalFix,
  CallPatternAnalysis
} from '../../../types/index.js';

// ============================================================================
// API Detection Types
// ============================================================================

export interface APIEndpoint {
  id: string;
  type: 'REST' | 'GraphQL' | 'gRPC' | 'WebSocket' | 'WebAssembly';
  method?: string; // GET, POST, PUT, DELETE for REST
  path: string;
  filePath: string;
  language: string;
  framework?: string;
  requestFormat?: string;
  responseFormat?: string;
  authentication?: string[];
  documentation?: string;
  confidence: number;
}

export interface APIDetectionResult {
  endpoints: APIEndpoint[];
  schemas: {
    openapi?: string[];
    graphql?: string[];
    grpc?: string[];
    wasm?: string[];
  };
  totalEndpoints: number;
  endpointsByLanguage: Map<string, number>;
  endpointsByType: Map<string, number>;
  apiCoverage: number; // percentage of files with API definitions
}

// ============================================================================
// Configuration Analysis Types
// ============================================================================

export interface ConfigurationFile {
  id: string;
  filePath: string;
  type: 'package' | 'build' | 'env' | 'editor' | 'lint' | 'test' | 'framework' | 'deployment' | 'other';
  language?: string;
  framework?: string;
  dependencies: string[];
  relatedFiles: string[];
  settings: Record<string, any>;
  confidence: number;
}

export interface ConfigurationRelationship {
  sourceFile: string;
  targetFile: string;
  relationship: 'depends_on' | 'configures' | 'extends' | 'overrides' | 'references';
  description: string;
  confidence: number;
}

export interface ConfigurationAnalysisResult {
  configurationFiles: ConfigurationFile[];
  relationships: ConfigurationRelationship[];
  dependencyTree: Map<string, string[]>;
  orphanedConfigs: string[];
  configCoverage: number; // percentage of project components with configuration
  recommendations: string[];
}

// ============================================================================
// Error Propagation Types
// ============================================================================

export interface ErrorNode {
  id: string;
  filePath: string;
  functionName?: string;
  lineNumber?: number;
  errorType: 'try_catch' | 'error_throw' | 'error_handler' | 'validation' | 'logging' | 'propagation';
  handlerType?: 'catch' | 'finally' | 'error_boundary' | 'middleware' | 'callback';
  errorMessage?: string;
  confidence: number;
}

export interface ErrorFlow {
  id: string;
  sourceNode: string;
  targetNode: string;
  flowType: 'throws' | 'handles' | 'propagates' | 'logs' | 'transforms' | 'suppresses';
  errorTypes: string[];
  confidence: number;
  callStack?: string[];
}

export interface UnhandledErrorPath {
  startPoint: string;
  endPoint: string;
  errorTypes: string[];
  path: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
}

export interface ErrorPropagationAnalysisResult {
  errorNodes: ErrorNode[];
  errorFlows: ErrorFlow[];
  unhandledPaths: UnhandledErrorPath[];
  errorCoverage: number; // percentage of functions with error handling
  errorHandlingPatterns: Map<string, number>;
  vulnerableAreas: string[];
  recommendations: string[];
}

// ============================================================================
// Test Coverage Types
// ============================================================================

export interface TestCoverageMapping {
  implementationFile: string;
  testFiles: string[];
  mappingType: 'exact_name_match' | 'test_contains_impl_name' | 'directory_similarity' | 'manual';
  confidence: number;
}

export interface TestCoverageAnalysisResult {
  mappings: TestCoverageMapping[];
  orphanImplementations: string[]; // Files without tests
  orphanTests: string[]; // Test files without clear implementation
  coveragePercentage: number;
  recommendations: string[];
}

// ============================================================================
// Aggregate Analysis Result
// ============================================================================

export interface AnalysisResult {
  architectural: ArchitecturalInsight[];
  callPatterns: CallPatternAnalysis;
  frameworks: any[];
  tooling: any[];
  errorPredictions: ErrorPrediction[];
  riskAssessment: RiskAssessment;
  recommendations: string[];
  apiDetection?: APIDetectionResult;
  configurationAnalysis?: ConfigurationAnalysisResult;
  errorPropagationAnalysis?: ErrorPropagationAnalysisResult;
  testCoverage?: TestCoverageAnalysisResult;
}
