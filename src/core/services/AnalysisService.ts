import { MindMapStorage } from '../MindMapStorage.js';
import { ArchitecturalAnalyzer } from '../ArchitecturalAnalyzer.js';
import { MultiLanguageIntelligence } from '../MultiLanguageIntelligence.js';
import { LanguageToolingDetector } from '../LanguageToolingDetector.js';
import { EnhancedFrameworkDetector } from '../EnhancedFrameworkDetector.js';
import { CallPatternAnalyzer } from '../CallPatternAnalyzer.js';
import {
  ArchitecturalInsight,
  ErrorPrediction,
  RiskAssessment,
  FixSuggestion,
  FixContext,
  HistoricalFix,
  CallPatternAnalysis,
  ProjectScale,
  MindMapNode
} from '../../types/index.js';

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
}

export class AnalysisService {
  constructor(
    private storage: MindMapStorage,
    private architecturalAnalyzer: ArchitecturalAnalyzer,
    private multiLanguageIntelligence: MultiLanguageIntelligence,
    private languageToolingDetector: LanguageToolingDetector,
    private enhancedFrameworkDetector: EnhancedFrameworkDetector,
    private callPatternAnalyzer: CallPatternAnalyzer
  ) {}

  // Architectural Analysis
  async analyzeArchitecture(limit: number = 10, minConfidence: number = 0.3): Promise<ArchitecturalInsight[]> {
    const insights = this.architecturalAnalyzer.analyzeProjectArchitecture();
    return insights.filter(insight => insight.confidence >= minConfidence).slice(0, limit);
  }

  async getArchitecturalInsights(): Promise<ArchitecturalInsight[]> {
    return this.architecturalAnalyzer.analyzeProjectArchitecture();
  }

  // Call Pattern Analysis
  async analyzeCallPatterns(filePaths?: string[], includeMetrics: boolean = true): Promise<CallPatternAnalysis> {
    if (!filePaths || filePaths.length === 0) {
      // Get all TypeScript/JavaScript files from storage if no paths provided
      const fileNodes = this.storage.findNodes(node =>
        node.type === 'file' &&
        !!node.path &&
        (node.path.endsWith('.ts') || node.path.endsWith('.js') || node.path.endsWith('.tsx') || node.path.endsWith('.jsx'))
      );
      filePaths = fileNodes.map(node => node.path!).filter(path => !!path);
    }

    const allNodes: any[] = [];
    const allEdges: any[] = [];
    const allCallPatterns: any[] = [];
    let globalCallGraph: any = { nodes: new Map(), edges: [], entryPoints: [], cycles: [], depth: 0 };

    // Analyze each file
    console.log(`DEBUG: analyzeCallPatterns processing ${filePaths.length} files`);
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      try {
        console.log(`DEBUG: Processing file ${i+1}/${filePaths.length}: ${filePath}`);
        const result = await this.callPatternAnalyzer.analyzeFile(filePath);
        console.log(`DEBUG: Completed file ${i+1}/${filePaths.length}: ${filePath}`);
        allNodes.push(...result.nodes);
        allEdges.push(...result.edges);
        allCallPatterns.push(...result.callPatterns);

        // Update global call graph
        for (const [nodeId, node] of Array.from(result.callGraph.nodes.entries())) {
          globalCallGraph.nodes.set(nodeId, node);
        }
        globalCallGraph.edges.push(...result.callGraph.edges);
        globalCallGraph.entryPoints.push(...result.callGraph.entryPoints);
        globalCallGraph.cycles.push(...result.callGraph.cycles);
        globalCallGraph.depth = Math.max(globalCallGraph.depth, result.callGraph.depth);
      } catch (error) {
        console.warn(`Failed to analyze call patterns in ${filePath}:`, error);
      }
    }

    // Get statistics if requested
    const statistics = includeMetrics ? this.callPatternAnalyzer.getCallPatternStatistics() : {
      totalCallPatterns: allCallPatterns.length,
      directCalls: 0,
      methodCalls: 0,
      constructorCalls: 0,
      asyncCalls: 0,
      recursiveFunctions: 0,
      averageComplexity: 0,
      maxCallDepth: globalCallGraph.depth
    };

    const analysisResult = {
      nodes: allNodes,
      edges: allEdges,
      callPatterns: allCallPatterns,
      callGraph: globalCallGraph,
      statistics
    };

    return analysisResult;
  }

  // Framework Detection
  async detectFrameworks(categories?: string[], forceRefresh: boolean = false, minConfidence: number = 0.3): Promise<any[]> {
    const projectRoot = this.storage.getGraph().projectRoot;
    const frameworkMap = await this.enhancedFrameworkDetector.detectFrameworks(projectRoot, forceRefresh);

    let allFrameworks: any[] = [];
    for (const [category, frameworks] of Array.from(frameworkMap.entries())) {
      if (!categories || categories.includes(category)) {
        allFrameworks.push(...frameworks.filter(fw => fw.confidence >= minConfidence));
      }
    }

    return allFrameworks;
  }

  async getFrameworkRecommendations(frameworkNames?: string[], recommendationType: string = 'all'): Promise<any[]> {
    const recommendations: any[] = [];

    if (!frameworkNames || frameworkNames.length === 0) {
      recommendations.push({
        framework: 'general',
        type: recommendationType,
        suggestions: [
          'Consider using a consistent framework across your project',
          'Implement proper testing frameworks',
          'Use code formatting and linting tools'
        ]
      });
    } else {
      frameworkNames.forEach(name => {
        const frameworkSuggestions = this.getFrameworkSpecificRecommendations(name, recommendationType);
        recommendations.push({
          framework: name,
          type: recommendationType,
          suggestions: frameworkSuggestions
        });
      });
    }

    return recommendations;
  }

  private getFrameworkSpecificRecommendations(frameworkName: string, type: string): string[] {
    const framework = frameworkName.toLowerCase();
    const suggestions: string[] = [];

    // Framework-specific recommendations
    switch (framework) {
      case 'react':
        suggestions.push(
          'Use React.StrictMode to catch potential problems',
          'Implement proper component lifecycle and hooks',
          'Use PropTypes or TypeScript for type checking',
          'Consider React Testing Library for component testing',
          'Use React DevTools for debugging'
        );
        break;

      case 'vue':
      case 'vue.js':
        suggestions.push(
          'Use Vue DevTools for debugging and performance monitoring',
          'Implement proper component composition with Vue 3 Composition API',
          'Use Pinia for state management instead of Vuex',
          'Follow Vue style guide for consistent code structure',
          'Consider Vue Test Utils for component testing'
        );
        break;

      case 'express':
      case 'express.js':
        suggestions.push(
          'Use helmet.js for security headers',
          'Implement proper error handling middleware',
          'Use express-rate-limit for API protection',
          'Implement request validation with joi or express-validator',
          'Use compression middleware for performance'
        );
        break;

      case 'django':
        suggestions.push(
          'Follow Django security best practices',
          'Use Django REST framework for APIs',
          'Implement proper database migrations',
          'Use Django debug toolbar for development',
          'Consider using Celery for background tasks'
        );
        break;

      case 'spring':
      case 'spring boot':
        suggestions.push(
          'Use Spring Security for authentication and authorization',
          'Implement proper exception handling with @ControllerAdvice',
          'Use Spring Boot Actuator for monitoring',
          'Follow Spring Boot best practices for configuration',
          'Consider Spring Boot Test for comprehensive testing'
        );
        break;

      case 'qt':
        suggestions.push(
          'Use Qt Creator IDE for development',
          'Follow Qt coding style and conventions',
          'Implement proper memory management with smart pointers',
          'Use Qt Test framework for unit testing',
          'Consider Qt Quick for modern UI development'
        );
        break;

      case 'docker':
        suggestions.push(
          'Use multi-stage builds to reduce image size',
          'Implement proper health checks in containers',
          'Use .dockerignore to exclude unnecessary files',
          'Run containers as non-root user for security',
          'Use specific version tags instead of latest'
        );
        break;

      case 'angular':
        suggestions.push(
          'Use Angular CLI for project scaffolding and building',
          'Implement proper component lifecycle hooks',
          'Use Angular services for data management',
          'Follow Angular style guide for consistent code',
          'Use Angular Testing utilities for comprehensive testing'
        );
        break;

      case 'flask':
        suggestions.push(
          'Use Flask-Security for authentication',
          'Implement proper error handling and logging',
          'Use Flask-Migrate for database migrations',
          'Consider using Flask-RESTful for API development',
          'Use pytest for testing Flask applications'
        );
        break;

      default:
        suggestions.push(
          `Follow ${frameworkName} official documentation and best practices`,
          `Keep ${frameworkName} dependencies up to date`,
          `Use ${frameworkName} recommended testing frameworks`,
          `Implement proper error handling and logging`,
          `Consider using ${frameworkName} official CLI tools`
        );
        break;
    }

    // Type-specific recommendations
    if (type === 'best_practices' || type === 'all') {
      suggestions.push(`Follow ${frameworkName} community standards and conventions`);
    }

    if (type === 'security' || type === 'all') {
      suggestions.push(`Regularly audit ${frameworkName} dependencies for security vulnerabilities`);
    }

    if (type === 'performance' || type === 'all') {
      suggestions.push(`Profile and optimize ${frameworkName} application performance`);
    }

    return suggestions.slice(0, 6); // Limit to 6 suggestions for readability
  }

  // Language Tooling Detection
  async detectProjectTooling(languageFilter?: string[], forceRefresh: boolean = false): Promise<any> {
    const projectRoot = this.storage.getGraph().projectRoot;
    return await this.languageToolingDetector.detectProjectTooling(projectRoot, forceRefresh);
  }

  async getToolingRecommendations(includeInstallCommands: boolean = true, priorityFilter: string = 'all'): Promise<any[]> {
    const projectRoot = this.storage.getGraph().projectRoot;
    const recommendationsMap = await this.languageToolingDetector.getToolingRecommendations(projectRoot);

    let allRecommendations: any[] = [];
    for (const [language, recommendations] of Array.from(recommendationsMap.entries())) {
      const filteredRecommendations = recommendations.filter(rec => {
        if (priorityFilter === 'all') return true;
        return rec.priority === priorityFilter;
      });
      allRecommendations.push(...filteredRecommendations);
    }

    return allRecommendations;
  }

  async runLanguageTool(toolName: string, language: string, args: string[] = [], timeout: number = 120000): Promise<any> {
    const projectRoot = this.storage.getGraph().projectRoot;

    // Create a ToolingInfo object for the requested tool
    const toolInfo = {
      name: toolName,
      type: 'test' as any, // Default type
      command: toolName,
      available: true,
      description: `Running ${toolName}`,
      language,
      priority: 1
    };

    return await this.languageToolingDetector.runTool(toolInfo, projectRoot, args);
  }

  async runToolSuite(options: {
    languages?: string[];
    toolTypes?: string[];
    parallel?: boolean;
    failFast?: boolean;
  } = {}): Promise<any> {
    const projectRoot = this.storage.getGraph().projectRoot;

    // Get all detected tooling first
    const toolingMap = await this.languageToolingDetector.detectProjectTooling(projectRoot);

    // Filter tools based on options
    const toolsToRun: any[] = [];
    for (const [language, tools] of Array.from(toolingMap.entries())) {
      if (options.languages && !options.languages.includes(language)) continue;

      const filteredTools = tools.filter(tool => {
        if (!tool.available) return false;
        if (options.toolTypes && !options.toolTypes.includes(tool.type)) return false;
        return true;
      });

      toolsToRun.push(...filteredTools);
    }

    return await this.languageToolingDetector.runToolSuite(toolsToRun, projectRoot, options.parallel !== false);
  }

  // Cross-Language API Detection
  async detectCrossLanguageAPIs(options: {
    apiTypes?: ('REST' | 'GraphQL' | 'gRPC' | 'WebSocket' | 'WebAssembly')[];
    minConfidence?: number;
    includeSchemas?: boolean;
  } = {}): Promise<APIDetectionResult> {
    const minConfidence = options.minConfidence || 0.3;
    const apiTypes = options.apiTypes || ['REST', 'GraphQL', 'gRPC', 'WebSocket', 'WebAssembly'];

    const endpoints: APIEndpoint[] = [];
    const schemas = {
      openapi: [] as string[],
      graphql: [] as string[],
      grpc: [] as string[],
      wasm: [] as string[]
    };

    // Get all file nodes for analysis
    const fileNodes = this.storage.findNodes(node => node.type === 'file' && !!node.path);
    const totalFiles = fileNodes.length;

    // Detect APIs in each supported language
    for (const fileNode of fileNodes) {
      if (!fileNode.path) continue;

      const language = fileNode.metadata?.language || this.detectLanguageFromExtension(fileNode.path);

      try {
        // Language-specific API detection
        const detectedEndpoints = await this.detectAPIsInFile(fileNode, language, apiTypes);
        endpoints.push(...detectedEndpoints.filter(ep => ep.confidence >= minConfidence));

        // Schema detection if enabled
        if (options.includeSchemas) {
          const fileSchemas = await this.detectSchemasInFile(fileNode, language);
          if (fileSchemas.openapi) schemas.openapi.push(...fileSchemas.openapi);
          if (fileSchemas.graphql) schemas.graphql.push(...fileSchemas.graphql);
          if (fileSchemas.grpc) schemas.grpc.push(...fileSchemas.grpc);
          if (fileSchemas.wasm) schemas.wasm.push(...fileSchemas.wasm);
        }
      } catch (error) {
        console.warn(`Failed to detect APIs in ${fileNode.path}:`, error);
      }
    }

    // Calculate statistics
    const endpointsByLanguage = new Map<string, number>();
    const endpointsByType = new Map<string, number>();
    const filesWithAPIs = new Set<string>();

    for (const endpoint of endpoints) {
      // Count by language
      const langCount = endpointsByLanguage.get(endpoint.language) || 0;
      endpointsByLanguage.set(endpoint.language, langCount + 1);

      // Count by type
      const typeCount = endpointsByType.get(endpoint.type) || 0;
      endpointsByType.set(endpoint.type, typeCount + 1);

      // Track files with APIs
      filesWithAPIs.add(endpoint.filePath);
    }

    const apiCoverage = totalFiles > 0 ? (filesWithAPIs.size / totalFiles) * 100 : 0;

    return {
      endpoints,
      schemas,
      totalEndpoints: endpoints.length,
      endpointsByLanguage,
      endpointsByType,
      apiCoverage
    };
  }

  private async detectAPIsInFile(fileNode: MindMapNode, language: string, apiTypes: string[]): Promise<APIEndpoint[]> {
    const endpoints: APIEndpoint[] = [];

    if (!fileNode.path) return endpoints;

    try {
      const content = await require('fs/promises').readFile(fileNode.path, 'utf-8');

      // Language-specific API detection
      switch (language) {
        case 'python':
          endpoints.push(...this.detectPythonAPIs(content, fileNode.path, apiTypes));
          break;
        case 'javascript':
        case 'typescript':
          endpoints.push(...this.detectJavaScriptAPIs(content, fileNode.path, apiTypes));
          break;
        case 'rust':
          endpoints.push(...this.detectRustAPIs(content, fileNode.path, apiTypes));
          break;
        case 'java':
          endpoints.push(...this.detectJavaAPIs(content, fileNode.path, apiTypes));
          break;
        case 'go':
          endpoints.push(...this.detectGoAPIs(content, fileNode.path, apiTypes));
          break;
        case 'cpp':
        case 'c':
          endpoints.push(...this.detectCppAPIs(content, fileNode.path, apiTypes));
          break;
        case 'csharp':
          endpoints.push(...this.detectCSharpAPIs(content, fileNode.path, apiTypes));
          break;
        case 'php':
          endpoints.push(...this.detectPHPAPIs(content, fileNode.path, apiTypes));
          break;
        case 'ruby':
          endpoints.push(...this.detectRubyAPIs(content, fileNode.path, apiTypes));
          break;
        case 'swift':
          endpoints.push(...this.detectSwiftAPIs(content, fileNode.path, apiTypes));
          break;
        case 'kotlin':
          endpoints.push(...this.detectKotlinAPIs(content, fileNode.path, apiTypes));
          break;
        case 'scala':
          endpoints.push(...this.detectScalaAPIs(content, fileNode.path, apiTypes));
          break;
      }
    } catch (error) {
      console.warn(`Failed to read file ${fileNode.path}:`, error);
    }

    return endpoints;
  }

  private detectLanguageFromExtension(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const extensionMap: Record<string, string> = {
      'py': 'python',
      'js': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'jsx': 'javascript',
      'rs': 'rust',
      'java': 'java',
      'go': 'go',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala'
    };
    return extensionMap[ext || ''] || 'unknown';
  }

  // Multi-Language Intelligence
  async detectCrossLanguageDependencies(options: {
    dependencyTypes?: string[];
    minConfidence?: number;
    includeConfidence?: boolean;
  } = {}): Promise<any[]> {
    const dependencies = await this.multiLanguageIntelligence.detectCrossLanguageDependencies();

    // Apply filters based on options
    let filteredDeps = dependencies;

    if (options.minConfidence !== undefined) {
      filteredDeps = filteredDeps.filter(dep => dep.confidence >= options.minConfidence!);
    }

    if (options.dependencyTypes && options.dependencyTypes.length > 0) {
      filteredDeps = filteredDeps.filter(dep => options.dependencyTypes!.includes(dep.dependencyType));
    }

    return filteredDeps;
  }

  async analyzePolyglotProject(options: {
    detailedFrameworks?: boolean;
    includeRecommendations?: boolean;
  } = {}): Promise<any> {
    return await this.multiLanguageIntelligence.analyzePolyglotProject();
  }

  async generateMultiLanguageRefactorings(options: {
    focusArea?: string;
    includeRisks?: boolean;
    maxEffort?: string;
  } = {}): Promise<any[]> {
    const refactorings = await this.multiLanguageIntelligence.generateRefactoringSuggestions();

    // Apply filters based on options
    let filteredRefactorings = refactorings;

    if (options.focusArea) {
      filteredRefactorings = filteredRefactorings.filter(ref =>
        ref.type === options.focusArea ||
        ref.description.toLowerCase().includes(options.focusArea!.toLowerCase())
      );
    }

    if (options.maxEffort) {
      const effortOrder = ['low', 'medium', 'high'];
      const maxEffortIndex = effortOrder.indexOf(options.maxEffort);
      if (maxEffortIndex !== -1) {
        filteredRefactorings = filteredRefactorings.filter(ref =>
          effortOrder.indexOf(ref.effort) <= maxEffortIndex
        );
      }
    }

    return filteredRefactorings;
  }

  // Error Prediction and Risk Assessment
  async predictErrors(filePath?: string, limit: number = 10, riskThreshold: number = 0.2): Promise<ErrorPrediction[]> {
    // Implementation for error prediction based on patterns and historical data
    const graph = this.storage.getGraph();
    const predictions: ErrorPrediction[] = [];

    // Analyze nodes for potential error patterns
    for (const [nodeId, node] of Array.from(graph.nodes.entries())) {
      if (filePath && node.path !== filePath) continue;

      let riskScore = 0;
      const riskFactors: string[] = [];

      // Check for complexity indicators
      if (node.metadata?.complexity && node.metadata.complexity > 10) {
        riskScore += 0.3;
        riskFactors.push('High complexity');
      }

      // Check for recent changes
      if (node.metadata?.lastModified) {
        const daysSinceModified = (Date.now() - new Date(node.metadata.lastModified).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceModified < 7) {
          riskScore += 0.2;
          riskFactors.push('Recently modified');
        }
      }

      // Check for dependency count
      const outgoingEdges = Array.from(graph.edges.values()).filter(edge => edge.source === nodeId);
      if (outgoingEdges.length > 15) {
        riskScore += 0.2;
        riskFactors.push('High dependency count');
      }

      if (riskScore >= riskThreshold) {
        predictions.push({
          id: `pred_${nodeId}`,
          type: 'runtime',
          message: `Potential issues in ${node.name}`,
          filePath: node.path || '',
          functionName: node.name,
          riskScore: riskScore,
          suggestedActions: [
            'Consider refactoring to reduce complexity',
            'Add comprehensive unit tests',
            'Review recent changes for potential bugs'
          ],
          basedOnPattern: 'complexity_analysis'
        });
      }
    }

    return predictions.slice(0, limit);
  }

  async assessProjectRisk(): Promise<RiskAssessment> {
    const graph = this.storage.getGraph();
    const totalNodes = graph.nodes.size;
    const totalEdges = graph.edges.size;

    let complexityScore = 0;
    let dependencyScore = 0;
    let maintenanceScore = 0;

    // Calculate complexity metrics
    for (const [_, node] of Array.from(graph.nodes.entries())) {
      if (node.metadata?.complexity) {
        complexityScore += node.metadata.complexity;
      }
    }

    // Calculate dependency metrics
    const avgDependencies = totalNodes > 0 ? totalEdges / totalNodes : 0;
    dependencyScore = Math.min(avgDependencies / 10, 1); // Normalize to 0-1

    // Calculate maintenance metrics (simplified)
    const recentlyModifiedNodes = Array.from(graph.nodes.values()).filter(node => {
      if (!node.metadata?.lastModified) return false;
      const daysSince = (Date.now() - new Date(node.metadata.lastModified).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 30;
    }).length;

    maintenanceScore = totalNodes > 0 ? recentlyModifiedNodes / totalNodes : 0;

    const overallRisk = (complexityScore + dependencyScore + (1 - maintenanceScore)) / 3;

    return {
      score: Math.min(overallRisk, 1),
      message: `Project risk assessment: ${overallRisk > 0.7 ? 'High risk' : overallRisk > 0.4 ? 'Medium risk' : 'Low risk'} - Complexity: ${complexityScore.toFixed(2)}, Dependencies: ${dependencyScore.toFixed(2)}, Maintenance: ${maintenanceScore.toFixed(2)}`,
      suggestions: this.generateRiskRecommendations(overallRisk, {
        complexity: complexityScore,
        dependencies: dependencyScore,
        maintenance: maintenanceScore
      })
    };
  }

  private generateRiskRecommendations(overallRisk: number, factors: any): string[] {
    const recommendations: string[] = [];

    if (factors.complexity > 0.6) {
      recommendations.push('Consider breaking down complex components');
      recommendations.push('Implement comprehensive testing for high-complexity areas');
    }

    if (factors.dependencies > 0.7) {
      recommendations.push('Review and reduce unnecessary dependencies');
      recommendations.push('Consider dependency injection to decouple components');
    }

    if (factors.maintenance < 0.3) {
      recommendations.push('Increase development activity or consider code retirement');
      recommendations.push('Update documentation and dependencies');
    }

    if (overallRisk > 0.7) {
      recommendations.push('Consider architectural refactoring');
      recommendations.push('Implement continuous monitoring and alerting');
    }

    return recommendations;
  }


  // Comprehensive Analysis
  async performComprehensiveAnalysis(): Promise<AnalysisResult> {
    console.log('🔍 Starting comprehensive project analysis...');
    console.log('DEBUG: performComprehensiveAnalysis called at', new Date().toISOString());

    try {
      console.log('DEBUG: Inside try block, about to setup timeout function');

    // Add individual timeouts to identify which method is hanging
    const timeout = (ms: number, name: string) => new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${name} timed out after ${ms}ms`)), ms)
    );

    console.log('DEBUG: Starting parallel analysis methods...');

    const [
      architectural,
      callPatterns,
      frameworks,
      tooling,
      errorPredictions,
      riskAssessment,
      apiDetection
    ] = await Promise.all([
      Promise.race([
        this.analyzeArchitecture().then(result => {
          console.log('DEBUG: analyzeArchitecture completed');
          return result;
        }),
        timeout(5000, 'analyzeArchitecture')
      ]).catch(err => {
        console.warn('analyzeArchitecture failed:', err.message);
        return [] as any[];
      }),
      Promise.race([
        this.analyzeCallPatterns().then(result => {
          console.log('DEBUG: analyzeCallPatterns completed');
          return result;
        }),
        timeout(5000, 'analyzeCallPatterns')
      ]).catch(err => {
        console.warn('analyzeCallPatterns failed:', err.message);
        return { patterns: [], metrics: {}, summary: { totalPatterns: 0, averageComplexity: 0, riskScore: 0 } } as any;
      }),
      Promise.resolve().then(() => {
        console.log('DEBUG: detectFrameworks SKIPPED');
        return [] as any[];
      }),
      Promise.race([
        this.detectProjectTooling().then(result => {
          console.log('DEBUG: detectProjectTooling completed');
          return result;
        }),
        timeout(5000, 'detectProjectTooling')
      ]).catch(err => {
        console.warn('detectProjectTooling failed:', err.message);
        return new Map() as any;
      }),
      Promise.race([
        this.predictErrors().then(result => {
          console.log('DEBUG: predictErrors completed');
          return result;
        }),
        timeout(5000, 'predictErrors')
      ]).catch(err => {
        console.warn('predictErrors failed:', err.message);
        return [] as any[];
      }),
      Promise.race([
        this.assessProjectRisk().then(result => {
          console.log('DEBUG: assessProjectRisk completed');
          return result;
        }),
        timeout(5000, 'assessProjectRisk')
      ]).catch(err => {
        console.warn('assessProjectRisk failed:', err.message);
        return {
          overallRisk: 'low' as const,
          riskScore: 0,
          factors: [],
          recommendations: [],
          confidence: 0
        } as any;
      }),
      Promise.race([
        this.detectCrossLanguageAPIs({ includeSchemas: true }).then(result => {
          console.log('DEBUG: detectCrossLanguageAPIs completed');
          return result;
        }),
        timeout(10000, 'detectCrossLanguageAPIs')
      ]).catch(err => {
        console.warn('detectCrossLanguageAPIs failed:', err.message);
        return {
          endpoints: [],
          schemas: {},
          totalEndpoints: 0,
          endpointsByLanguage: new Map(),
          endpointsByType: new Map(),
          apiCoverage: 0
        } as any;
      })
    ]) as [any, any, any, any, any, any, any];

    console.log('DEBUG: All analysis methods completed, generating recommendations...');

    const recommendations = this.generateComprehensiveRecommendations({
      architectural,
      frameworks,
      tooling,
      riskAssessment
    });

    console.log('DEBUG: Recommendations generated');
    console.log('✅ Comprehensive analysis completed');

    const result = {
      architectural,
      callPatterns,
      frameworks,
      tooling,
      errorPredictions,
      riskAssessment,
      apiDetection,
      recommendations
    };

    console.log('DEBUG: Returning result from performComprehensiveAnalysis');
    return result;

    } catch (error) {
      console.error('ERROR: performComprehensiveAnalysis failed:', error);
      // Return empty result if everything fails
      return {
        architectural: [],
        callPatterns: {} as any,
        frameworks: [],
        tooling: [],
        errorPredictions: [],
        riskAssessment: {} as any,
        apiDetection: {
          endpoints: [],
          schemas: {},
          totalEndpoints: 0,
          endpointsByLanguage: new Map(),
          endpointsByType: new Map(),
          apiCoverage: 0
        },
        recommendations: []
      };
    }
  }

  private generateComprehensiveRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];

    // Architectural recommendations
    if (analysis.architectural.length === 0) {
      recommendations.push('Consider implementing recognized architectural patterns');
    }

    // Framework recommendations
    const webFrameworks = analysis.frameworks.filter((f: any) => f.category === 'web');
    if (webFrameworks.length === 0) {
      recommendations.push('Consider adopting a modern web framework for better structure');
    }

    // Tooling recommendations
    if (!analysis.tooling.linting) {
      recommendations.push('Implement code linting for consistent code style');
    }

    if (!analysis.tooling.testing) {
      recommendations.push('Add automated testing framework');
    }

    // Risk-based recommendations
    if (analysis.riskAssessment.riskLevel === 'high') {
      recommendations.push('Priority: Address high-risk components immediately');
    }

    return recommendations;
  }

  // Predictive Error Detection System (copied from MindMapEngine)
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

  // Fix Suggestion System (copied from MindMapEngine)
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

  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    if (message.includes('import') || message.includes('module') || message.includes('cannot resolve')) {
      return 'import';
    }
    if (message.includes('type') || message.includes('property') || message.includes('does not exist')) {
      return 'type';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'network';
    }
    if (message.includes('permission') || message.includes('access') || message.includes('denied')) {
      return 'permission';
    }
    return 'runtime';
  }

  private getHistoricalFixes(category: string, filePath?: string): HistoricalFix[] {
    // Find nodes that represent successful fixes
    const fixNodes = this.storage.findNodes(node =>
      node.type === 'pattern' &&
      node.properties?.category === 'fix' &&
      node.properties?.errorCategory === category &&
      (!filePath || node.metadata.appliedFiles?.includes(filePath))
    );

    return fixNodes.map(node => ({
      errorMessage: node.properties?.errorPattern || '',
      fixApplied: node.properties?.solution || '',
      filesInvolved: node.metadata.appliedFiles || [],
      confidence: node.confidence || 0.5,
      timestamp: node.lastUpdated || new Date(),
      category: category
    }));
  }

  private generatePatternBasedSuggestions(errorMessage: string, category: string, context?: FixContext): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    if (category === 'import') {
      suggestions.push({
        id: `fix:import:${Date.now()}`,
        title: 'Fix Import Path',
        description: 'Review and correct the import path',
        commands: ['npm install missing-package'],
        codeChanges: ['// Check if the imported module path is correct'],
        confidence: 0.7,
        estimatedEffort: 'low',
        category: 'import',
        riskLevel: 'low'
      });
    }

    if (category === 'type') {
      suggestions.push({
        id: `fix:type:${Date.now()}`,
        title: 'Add Type Annotations',
        description: 'Add explicit type annotations to resolve type errors',
        commands: [],
        codeChanges: ['// Add proper TypeScript type annotations', '// Example: const value: string = ...'],
        confidence: 0.6,
        estimatedEffort: 'medium',
        category: 'type',
        riskLevel: 'low'
      });
    }

    return suggestions;
  }

  private generateHistoricalSuggestions(historicalFixes: HistoricalFix[], errorMessage: string, context?: FixContext): FixSuggestion[] {
    return historicalFixes.map(fix => ({
      id: `fix:historical:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
      title: 'Apply Historical Fix',
      description: fix.fixApplied,
      commands: [],
      codeChanges: [fix.fixApplied],
      confidence: fix.confidence,
      estimatedEffort: 'medium' as const,
      category: 'runtime' as const,
      riskLevel: 'medium' as const,
      historicalSuccess: 1
    }));
  }

  private generateContextualSuggestions(category: string, filePath?: string, context?: FixContext): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    // Analyze file context if available
    if (filePath) {
      const fileNode = this.storage.findNodes(node => node.path === filePath)[0];
      if (fileNode) {
        // Suggest based on file type and patterns
        if (fileNode.metadata.extension === 'ts' && category === 'type') {
          suggestions.push({
            id: `fix:contextual:typescript:${Date.now()}`,
            title: 'Enable Strict TypeScript',
            description: 'Enable strict mode in TypeScript configuration',
            commands: [],
            codeChanges: ['// tsconfig.json\n{\n  "compilerOptions": {\n    "strict": true\n  }\n}'],
            confidence: 0.5,
            estimatedEffort: 'low',
            category: 'type',
            riskLevel: 'low'
          });
        }
      }
    }

    return suggestions;
  }

  private rankSuggestions(suggestions: FixSuggestion[]): FixSuggestion[] {
    return suggestions.sort((a, b) => {
      // Primary sort by confidence
      const confidenceScore = (b.confidence || 0) - (a.confidence || 0);
      if (confidenceScore !== 0) return confidenceScore;

      // Secondary sort by historical success
      return (b.historicalSuccess || 0) - (a.historicalSuccess || 0);
    });
  }

  // Language-specific API Detection Methods
  private detectPythonAPIs(content: string, filePath: string, apiTypes: string[]): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    if (apiTypes.includes('REST')) {
      // Flask API detection
      const flaskRoutes = content.match(/@app\.route\s*\(\s*['"`]([^'"`]+)['"`](?:\s*,\s*methods\s*=\s*\[([^\]]+)\])?\s*\)/g);
      if (flaskRoutes) {
        flaskRoutes.forEach((match, index) => {
          const routeMatch = match.match(/@app\.route\s*\(\s*['"`]([^'"`]+)['"`](?:\s*,\s*methods\s*=\s*\[([^\]]+)\])?\s*\)/);
          if (routeMatch) {
            const path = routeMatch[1];
            const methods = routeMatch[2] ? routeMatch[2].split(',').map(m => m.trim().replace(/['"`]/g, '')) : ['GET'];

            methods.forEach(method => {
              endpoints.push({
                id: `python-flask-${filePath}-${index}`,
                type: 'REST',
                method: method.toUpperCase(),
                path,
                filePath,
                language: 'python',
                framework: 'Flask',
                requestFormat: 'json',
                responseFormat: 'json',
                confidence: 0.85
              });
            });
          }
        });
      }

      // Django API detection
      const djangoUrls = content.match(/path\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,\)]+)/g);
      if (djangoUrls) {
        djangoUrls.forEach((match, index) => {
          const urlMatch = match.match(/path\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,\)]+)/);
          if (urlMatch) {
            endpoints.push({
              id: `python-django-${filePath}-${index}`,
              type: 'REST',
              path: urlMatch[1],
              filePath,
              language: 'python',
              framework: 'Django',
              confidence: 0.8
            });
          }
        });
      }

      // FastAPI detection
      const fastApiRoutes = content.match(/@app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g);
      if (fastApiRoutes) {
        fastApiRoutes.forEach((match, index) => {
          const routeMatch = match.match(/@app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
          if (routeMatch) {
            endpoints.push({
              id: `python-fastapi-${filePath}-${index}`,
              type: 'REST',
              method: routeMatch[1].toUpperCase(),
              path: routeMatch[2],
              filePath,
              language: 'python',
              framework: 'FastAPI',
              requestFormat: 'json',
              responseFormat: 'json',
              confidence: 0.9
            });
          }
        });
      }
    }

    if (apiTypes.includes('GraphQL')) {
      // GraphQL schema detection
      if (content.includes('GraphQLSchema') || content.includes('graphene.Schema')) {
        endpoints.push({
          id: `python-graphql-${filePath}`,
          type: 'GraphQL',
          path: '/graphql',
          filePath,
          language: 'python',
          framework: 'GraphQL',
          confidence: 0.8
        });
      }
    }

    return endpoints;
  }

  private detectJavaScriptAPIs(content: string, filePath: string, apiTypes: string[]): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    if (apiTypes.includes('REST')) {
      // Express.js API detection
      const expressRoutes = content.match(/app\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]/g);
      if (expressRoutes) {
        expressRoutes.forEach((match, index) => {
          const routeMatch = match.match(/app\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]/);
          if (routeMatch) {
            endpoints.push({
              id: `js-express-${filePath}-${index}`,
              type: 'REST',
              method: routeMatch[1].toUpperCase(),
              path: routeMatch[2],
              filePath,
              language: 'javascript',
              framework: 'Express',
              requestFormat: 'json',
              responseFormat: 'json',
              confidence: 0.85
            });
          }
        });
      }

      // Next.js API routes
      if (filePath.includes('/api/') && (filePath.endsWith('.js') || filePath.endsWith('.ts'))) {
        const apiPath = filePath.substring(filePath.indexOf('/api/'));
        endpoints.push({
          id: `js-nextjs-${filePath}`,
          type: 'REST',
          path: apiPath.replace(/\.(js|ts)$/, ''),
          filePath,
          language: 'javascript',
          framework: 'Next.js',
          confidence: 0.9
        });
      }

      // Fastify detection
      const fastifyRoutes = content.match(/fastify\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g);
      if (fastifyRoutes) {
        fastifyRoutes.forEach((match, index) => {
          const routeMatch = match.match(/fastify\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
          if (routeMatch) {
            endpoints.push({
              id: `js-fastify-${filePath}-${index}`,
              type: 'REST',
              method: routeMatch[1].toUpperCase(),
              path: routeMatch[2],
              filePath,
              language: 'javascript',
              framework: 'Fastify',
              confidence: 0.8
            });
          }
        });
      }
    }

    if (apiTypes.includes('GraphQL')) {
      // GraphQL schema detection
      if (content.includes('GraphQLSchema') || content.includes('buildSchema') || content.includes('typeDefs')) {
        endpoints.push({
          id: `js-graphql-${filePath}`,
          type: 'GraphQL',
          path: '/graphql',
          filePath,
          language: 'javascript',
          framework: 'GraphQL',
          confidence: 0.85
        });
      }
    }

    if (apiTypes.includes('WebSocket')) {
      // WebSocket detection
      if (content.includes('WebSocket') || content.includes('socket.io')) {
        endpoints.push({
          id: `js-websocket-${filePath}`,
          type: 'WebSocket',
          path: '/socket',
          filePath,
          language: 'javascript',
          framework: 'WebSocket',
          confidence: 0.8
        });
      }
    }

    return endpoints;
  }

  private detectRustAPIs(content: string, filePath: string, apiTypes: string[]): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    if (apiTypes.includes('REST')) {
      // Actix-web detection
      const actixRoutes = content.match(/\.route\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*web::(get|post|put|delete|patch)\s*\(\s*\)/g);
      if (actixRoutes) {
        actixRoutes.forEach((match, index) => {
          const routeMatch = match.match(/\.route\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*web::(get|post|put|delete|patch)\s*\(\s*\)/);
          if (routeMatch) {
            endpoints.push({
              id: `rust-actix-${filePath}-${index}`,
              type: 'REST',
              method: routeMatch[2].toUpperCase(),
              path: routeMatch[1],
              filePath,
              language: 'rust',
              framework: 'Actix-web',
              requestFormat: 'json',
              responseFormat: 'json',
              confidence: 0.9
            });
          }
        });
      }

      // Warp detection
      const warpRoutes = content.match(/warp::path\s*!\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
      if (warpRoutes) {
        warpRoutes.forEach((match, index) => {
          const routeMatch = match.match(/warp::path\s*!\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
          if (routeMatch) {
            endpoints.push({
              id: `rust-warp-${filePath}-${index}`,
              type: 'REST',
              path: routeMatch[1],
              filePath,
              language: 'rust',
              framework: 'Warp',
              confidence: 0.85
            });
          }
        });
      }

      // Axum detection
      if (content.includes('axum::') && content.includes('Router')) {
        const axumRoutes = content.match(/\.route\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(get|post|put|delete|patch)\s*\(/g);
        if (axumRoutes) {
          axumRoutes.forEach((match, index) => {
            const routeMatch = match.match(/\.route\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(get|post|put|delete|patch)\s*\(/);
            if (routeMatch) {
              endpoints.push({
                id: `rust-axum-${filePath}-${index}`,
                type: 'REST',
                method: routeMatch[2].toUpperCase(),
                path: routeMatch[1],
                filePath,
                language: 'rust',
                framework: 'Axum',
                confidence: 0.85
              });
            }
          });
        }
      }
    }

    if (apiTypes.includes('gRPC')) {
      // gRPC service detection
      if (content.includes('tonic::') && content.includes('service')) {
        endpoints.push({
          id: `rust-grpc-${filePath}`,
          type: 'gRPC',
          path: '/grpc',
          filePath,
          language: 'rust',
          framework: 'Tonic',
          confidence: 0.8
        });
      }
    }

    return endpoints;
  }

  private detectCppAPIs(content: string, filePath: string, apiTypes: string[]): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    if (apiTypes.includes('REST')) {
      // Boost.Beast detection
      if (content.includes('boost::beast::http') || content.includes('beast::http')) {
        endpoints.push({
          id: `cpp-beast-${filePath}`,
          type: 'REST',
          path: '/api',
          filePath,
          language: 'cpp',
          framework: 'Boost.Beast',
          confidence: 0.7
        });
      }

      // Pistache detection
      if (content.includes('Pistache::') && content.includes('Http::')) {
        endpoints.push({
          id: `cpp-pistache-${filePath}`,
          type: 'REST',
          path: '/api',
          filePath,
          language: 'cpp',
          framework: 'Pistache',
          confidence: 0.8
        });
      }

      // Custom HTTP server detection (like in test file)
      if (content.includes('register_route') && content.includes('HttpServer')) {
        const routeRegistrations = content.match(/register_route\s*\(\s*['"`]([^'"`]+)['"`]/g);
        if (routeRegistrations) {
          routeRegistrations.forEach((match, index) => {
            const routeMatch = match.match(/register_route\s*\(\s*['"`]([^'"`]+)['"`]/);
            if (routeMatch) {
              endpoints.push({
                id: `cpp-custom-${filePath}-${index}`,
                type: 'REST',
                path: routeMatch[1],
                filePath,
                language: 'cpp',
                framework: 'Custom HTTP Server',
                confidence: 0.75
              });
            }
          });
        }
      }
    }

    if (apiTypes.includes('gRPC')) {
      // gRPC detection
      if (content.includes('grpc::') && content.includes('Service')) {
        endpoints.push({
          id: `cpp-grpc-${filePath}`,
          type: 'gRPC',
          path: '/grpc',
          filePath,
          language: 'cpp',
          framework: 'gRPC C++',
          confidence: 0.85
        });
      }
    }

    return endpoints;
  }

  // Placeholder implementations for other languages
  private detectJavaAPIs(content: string, filePath: string, apiTypes: string[]): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    if (apiTypes.includes('REST')) {
      // Spring Boot REST detection
      if (content.includes('@RestController') || content.includes('@RequestMapping')) {
        const mappings = content.match(/@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
        if (mappings) {
          mappings.forEach((match, index) => {
            const mappingMatch = match.match(/@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
            if (mappingMatch) {
              endpoints.push({
                id: `java-spring-${filePath}-${index}`,
                type: 'REST',
                method: mappingMatch[1].toUpperCase(),
                path: mappingMatch[2],
                filePath,
                language: 'java',
                framework: 'Spring Boot',
                confidence: 0.9
              });
            }
          });
        }
      }
    }

    return endpoints;
  }

  private detectGoAPIs(content: string, filePath: string, apiTypes: string[]): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    if (apiTypes.includes('REST')) {
      // Gin framework detection
      const ginRoutes = content.match(/r\.(GET|POST|PUT|DELETE|PATCH)\s*\(\s*['"`]([^'"`]+)['"`]/g);
      if (ginRoutes) {
        ginRoutes.forEach((match, index) => {
          const routeMatch = match.match(/r\.(GET|POST|PUT|DELETE|PATCH)\s*\(\s*['"`]([^'"`]+)['"`]/);
          if (routeMatch) {
            endpoints.push({
              id: `go-gin-${filePath}-${index}`,
              type: 'REST',
              method: routeMatch[1],
              path: routeMatch[2],
              filePath,
              language: 'go',
              framework: 'Gin',
              confidence: 0.85
            });
          }
        });
      }

      // Gorilla Mux detection
      if (content.includes('mux.NewRouter()')) {
        endpoints.push({
          id: `go-gorilla-${filePath}`,
          type: 'REST',
          path: '/api',
          filePath,
          language: 'go',
          framework: 'Gorilla Mux',
          confidence: 0.7
        });
      }
    }

    if (apiTypes.includes('gRPC')) {
      // gRPC service detection
      if (content.includes('grpc.NewServer()') || content.includes('pb.Register')) {
        endpoints.push({
          id: `go-grpc-${filePath}`,
          type: 'gRPC',
          path: '/grpc',
          filePath,
          language: 'go',
          framework: 'gRPC Go',
          confidence: 0.85
        });
      }
    }

    return endpoints;
  }

  // Simple implementations for remaining languages
  private detectCSharpAPIs(content: string, filePath: string, apiTypes: string[]): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    if (apiTypes.includes('REST') && content.includes('[ApiController]')) {
      endpoints.push({
        id: `csharp-webapi-${filePath}`,
        type: 'REST',
        path: '/api',
        filePath,
        language: 'csharp',
        framework: 'ASP.NET Core',
        confidence: 0.8
      });
    }

    return endpoints;
  }

  private detectPHPAPIs(content: string, filePath: string, apiTypes: string[]): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    if (apiTypes.includes('REST') && (content.includes('$app->') || content.includes('Route::'))) {
      endpoints.push({
        id: `php-api-${filePath}`,
        type: 'REST',
        path: '/api',
        filePath,
        language: 'php',
        framework: 'Laravel/Slim',
        confidence: 0.7
      });
    }

    return endpoints;
  }

  private detectRubyAPIs(content: string, filePath: string, apiTypes: string[]): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    if (apiTypes.includes('REST') && (content.includes('Rails.application.routes') || content.includes('get /'))) {
      endpoints.push({
        id: `ruby-rails-${filePath}`,
        type: 'REST',
        path: '/api',
        filePath,
        language: 'ruby',
        framework: 'Ruby on Rails',
        confidence: 0.8
      });
    }

    return endpoints;
  }

  private detectSwiftAPIs(content: string, filePath: string, apiTypes: string[]): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    if (apiTypes.includes('REST') && content.includes('Vapor')) {
      endpoints.push({
        id: `swift-vapor-${filePath}`,
        type: 'REST',
        path: '/api',
        filePath,
        language: 'swift',
        framework: 'Vapor',
        confidence: 0.8
      });
    }

    return endpoints;
  }

  private detectKotlinAPIs(content: string, filePath: string, apiTypes: string[]): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    if (apiTypes.includes('REST') && content.includes('@RestController')) {
      endpoints.push({
        id: `kotlin-spring-${filePath}`,
        type: 'REST',
        path: '/api',
        filePath,
        language: 'kotlin',
        framework: 'Spring Boot',
        confidence: 0.8
      });
    }

    return endpoints;
  }

  private detectScalaAPIs(content: string, filePath: string, apiTypes: string[]): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];

    if (apiTypes.includes('REST') && (content.includes('Akka HTTP') || content.includes('Play Framework'))) {
      endpoints.push({
        id: `scala-akka-${filePath}`,
        type: 'REST',
        path: '/api',
        filePath,
        language: 'scala',
        framework: 'Akka HTTP',
        confidence: 0.8
      });
    }

    return endpoints;
  }

  private async detectSchemasInFile(fileNode: MindMapNode, language: string): Promise<{
    openapi?: string[];
    graphql?: string[];
    grpc?: string[];
    wasm?: string[];
  }> {
    const schemas: any = {};

    if (!fileNode.path) return schemas;

    try {
      const content = await require('fs/promises').readFile(fileNode.path, 'utf-8');

      // OpenAPI/Swagger schema detection
      if (content.includes('swagger:') || content.includes('openapi:') || fileNode.path.includes('swagger') || fileNode.path.includes('openapi')) {
        schemas.openapi = [fileNode.path];
      }

      // GraphQL schema detection
      if (content.includes('type Query') || content.includes('type Mutation') || fileNode.path.endsWith('.graphql') || fileNode.path.endsWith('.gql')) {
        schemas.graphql = [fileNode.path];
      }

      // gRPC proto files
      if (fileNode.path.endsWith('.proto')) {
        schemas.grpc = [fileNode.path];
      }

      // WebAssembly modules
      if (fileNode.path.endsWith('.wasm') || fileNode.path.endsWith('.wat')) {
        schemas.wasm = [fileNode.path];
      }
    } catch (error) {
      console.warn(`Failed to detect schemas in ${fileNode.path}:`, error);
    }

    return schemas;
  }

  async analyzeTestCoverage(options: {
    includeOrphans?: boolean;
    includeUntested?: boolean;
    minConfidence?: number;
    groupBy?: 'file' | 'directory' | 'module';
  } = {}): Promise<TestCoverageResult> {
    const {
      includeOrphans = true,
      includeUntested = false,
      minConfidence = 0.5,
      groupBy = 'file'
    } = options;

    // Get all file nodes
    const allFiles = this.storage.findNodes(node => node.type === 'file' && !!node.path);

    // Separate test files from implementation files
    const testFiles: string[] = [];
    const implementationFiles: string[] = [];

    for (const fileNode of allFiles) {
      if (!fileNode.path) continue;

      const filePath = fileNode.path;
      const fileName = filePath.split('/').pop() || '';
      const isTestFile = this.isTestFile(fileName, filePath);

      if (isTestFile) {
        testFiles.push(filePath);
      } else if (this.isImplementationFile(fileName, filePath)) {
        implementationFiles.push(filePath);
      }
    }

    // Create test-to-implementation mappings
    const mappings: TestCoverageMapping[] = [];
    const mappedImplementationFiles = new Set<string>();
    const mappedTestFiles = new Set<string>();

    for (const testFile of testFiles) {
      const bestMatch = this.findBestImplementationMatch(testFile, implementationFiles);
      if (bestMatch && bestMatch.confidence >= minConfidence) {
        mappings.push({
          testFile,
          implementationFile: bestMatch.file,
          confidence: bestMatch.confidence,
          matchType: bestMatch.matchType
        });
        mappedImplementationFiles.add(bestMatch.file);
        mappedTestFiles.add(testFile);
      }
    }

    // Calculate statistics
    const totalImplementationFiles = implementationFiles.length;
    const totalTestFiles = testFiles.length;
    const filesWithTests = mappedImplementationFiles.size;
    const filesWithoutTests = totalImplementationFiles - filesWithTests;
    const coveragePercentage = totalImplementationFiles > 0 ? (filesWithTests / totalImplementationFiles) * 100 : 0;

    // Find orphan files (implementation files without tests)
    const orphanImplementationFiles = includeOrphans
      ? implementationFiles.filter(file => !mappedImplementationFiles.has(file))
      : [];

    // Find untested test files (test files without clear implementation targets)
    const untestedTestFiles = includeUntested
      ? testFiles.filter(file => !mappedTestFiles.has(file))
      : [];

    // Calculate mapping accuracy (how many mappings have high confidence)
    const highConfidenceMappings = mappings.filter(m => m.confidence >= 0.8).length;
    const mappingAccuracy = mappings.length > 0 ? (highConfidenceMappings / mappings.length) * 100 : 0;

    return {
      totalImplementationFiles,
      totalTestFiles,
      filesWithTests,
      filesWithoutTests,
      coveragePercentage,
      mappings,
      orphanImplementationFiles,
      untestedTestFiles,
      mappingAccuracy
    };
  }

  private isTestFile(fileName: string, filePath: string): boolean {
    // Check file name patterns
    const testPatterns = [
      /\.test\./,
      /\.spec\./,
      /test-.*\./,
      /_test\./,
      /tests?\./,
      /\.tests?\./
    ];

    if (testPatterns.some(pattern => pattern.test(fileName))) {
      return true;
    }

    // Check directory patterns
    const testDirectories = ['test/', 'tests/', '__tests__/', 'spec/', 'specs/'];
    return testDirectories.some(dir => filePath.includes(dir));
  }

  private isImplementationFile(fileName: string, filePath: string): boolean {
    // Exclude test files, config files, and build artifacts
    const excludePatterns = [
      /\.test\./,
      /\.spec\./,
      /test-/,
      /_test\./,
      /\.config\./,
      /\.conf\./,
      /package\.json/,
      /tsconfig\.json/,
      /\.md$/,
      /\.txt$/,
      /\.log$/,
      /node_modules/,
      /dist/,
      /build/,
      /\.git/
    ];

    if (excludePatterns.some(pattern => pattern.test(fileName) || pattern.test(filePath))) {
      return false;
    }

    // Include common source file extensions
    const sourceExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.cs', '.php', '.rb', '.swift', '.kt', '.scala'];
    return sourceExtensions.some(ext => fileName.endsWith(ext));
  }

  private findBestImplementationMatch(testFile: string, implementationFiles: string[]): {
    file: string;
    confidence: number;
    matchType: string;
  } | null {
    const testFileName = testFile.split('/').pop() || '';
    const testBaseName = this.extractBaseFileName(testFileName);

    let bestMatch: { file: string; confidence: number; matchType: string } | null = null;

    for (const implFile of implementationFiles) {
      const implFileName = implFile.split('/').pop() || '';
      const implBaseName = this.extractBaseFileName(implFileName);

      let confidence = 0;
      let matchType = 'unknown';

      // Direct name match (highest confidence)
      if (testBaseName === implBaseName) {
        confidence = 0.95;
        matchType = 'exact_name_match';
      }
      // Test file contains implementation name
      else if (testBaseName.includes(implBaseName) && implBaseName.length > 3) {
        confidence = 0.85;
        matchType = 'test_contains_impl_name';
      }
      // Implementation name contains test base
      else if (implBaseName.includes(testBaseName) && testBaseName.length > 3) {
        confidence = 0.75;
        matchType = 'impl_contains_test_name';
      }
      // Directory structure similarity
      else if (this.isSimilarDirectory(testFile, implFile)) {
        confidence = 0.6;
        matchType = 'directory_similarity';
      }
      // File extension similarity
      else if (this.isSimilarExtension(testFile, implFile)) {
        confidence = 0.4;
        matchType = 'extension_similarity';
      }

      if (confidence > (bestMatch?.confidence || 0)) {
        bestMatch = { file: implFile, confidence, matchType };
      }
    }

    return bestMatch;
  }

  private extractBaseFileName(fileName: string): string {
    // Remove common test patterns and extensions
    let baseName = fileName
      .replace(/\.test\./g, '.')
      .replace(/\.spec\./g, '.')
      .replace(/test-/g, '')
      .replace(/_test\./g, '.')
      .replace(/\.tests?\./g, '.');

    // Remove extension
    const lastDot = baseName.lastIndexOf('.');
    if (lastDot > 0) {
      baseName = baseName.substring(0, lastDot);
    }

    return baseName;
  }

  private isSimilarDirectory(file1: string, file2: string): boolean {
    const dir1 = file1.substring(0, file1.lastIndexOf('/'));
    const dir2 = file2.substring(0, file2.lastIndexOf('/'));

    // Remove test-specific directory parts
    const normalizedDir1 = dir1.replace(/\/tests?\/|\/test\/|\/spec\//g, '/').replace(/\/\//g, '/');
    const normalizedDir2 = dir2.replace(/\/tests?\/|\/test\/|\/spec\//g, '/').replace(/\/\//g, '/');

    return normalizedDir1 === normalizedDir2;
  }

  private isSimilarExtension(file1: string, file2: string): boolean {
    const ext1 = file1.substring(file1.lastIndexOf('.'));
    const ext2 = file2.substring(file2.lastIndexOf('.'));

    // Group similar extensions
    const jsGroup = ['.js', '.jsx', '.ts', '.tsx'];
    const pythonGroup = ['.py', '.pyx'];
    const javaGroup = ['.java', '.kt', '.scala'];

    if (jsGroup.includes(ext1) && jsGroup.includes(ext2)) return true;
    if (pythonGroup.includes(ext1) && pythonGroup.includes(ext2)) return true;
    if (javaGroup.includes(ext1) && javaGroup.includes(ext2)) return true;

    return ext1 === ext2;
  }

  // Configuration Relationship Tracking
  async analyzeConfigurationRelationships(): Promise<ConfigurationAnalysisResult> {
    const configurationFiles = await this.detectConfigurationFiles();
    const relationships = await this.analyzeConfigurationDependencies(configurationFiles);
    const dependencyTree = this.buildConfigurationDependencyTree(relationships);
    const orphanedConfigs = this.findOrphanedConfigurations(configurationFiles, relationships);
    const configCoverage = this.calculateConfigurationCoverage(configurationFiles);
    const recommendations = this.generateConfigurationRecommendations(configurationFiles, relationships);

    return {
      configurationFiles,
      relationships,
      dependencyTree,
      orphanedConfigs,
      configCoverage,
      recommendations
    };
  }

  private async detectConfigurationFiles(): Promise<ConfigurationFile[]> {
    const fileNodes = this.storage.findNodes(node => node.type === 'file' && !!node.path);
    const configFiles: ConfigurationFile[] = [];

    for (const fileNode of fileNodes) {
      const filePath = fileNode.path!;
      const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);

      // Configuration file patterns
      const configPatterns = [
        { pattern: /^package\.json$/, type: 'package' as const, language: 'javascript' },
        { pattern: /^tsconfig.*\.json$/, type: 'build' as const, language: 'typescript' },
        { pattern: /^\.env.*$/, type: 'env' as const },
        { pattern: /^\.gitignore$/, type: 'other' as const },
        { pattern: /^\.editorconfig$/, type: 'editor' as const },
        { pattern: /^\.eslintrc.*$/, type: 'lint' as const, language: 'javascript' },
        { pattern: /^jest\.config\.(js|ts|json)$/, type: 'test' as const, language: 'javascript' },
        { pattern: /^webpack\.config\.(js|ts)$/, type: 'build' as const, language: 'javascript' },
        { pattern: /^vite\.config\.(js|ts)$/, type: 'build' as const, language: 'javascript' },
        { pattern: /^rollup\.config\.(js|ts)$/, type: 'build' as const, language: 'javascript' },
        { pattern: /^babel\.config\.(js|json)$/, type: 'build' as const, language: 'javascript' },
        { pattern: /^\.prettierrc.*$/, type: 'lint' as const },
        { pattern: /^Dockerfile$/, type: 'deployment' as const },
        { pattern: /^docker-compose\.ya?ml$/, type: 'deployment' as const },
        { pattern: /^pom\.xml$/, type: 'build' as const, language: 'java' },
        { pattern: /^build\.gradle$/, type: 'build' as const, language: 'java' },
        { pattern: /^Cargo\.toml$/, type: 'build' as const, language: 'rust' },
        { pattern: /^go\.mod$/, type: 'build' as const, language: 'go' },
        { pattern: /^requirements\.txt$/, type: 'package' as const, language: 'python' },
        { pattern: /^pyproject\.toml$/, type: 'build' as const, language: 'python' },
        { pattern: /^setup\.py$/, type: 'build' as const, language: 'python' },
        { pattern: /^\.github\/workflows\/.*\.ya?ml$/, type: 'deployment' as const },
        { pattern: /^next\.config\.(js|ts)$/, type: 'framework' as const, language: 'javascript', framework: 'Next.js' },
        { pattern: /^nuxt\.config\.(js|ts)$/, type: 'framework' as const, language: 'javascript', framework: 'Nuxt.js' },
        { pattern: /^angular\.json$/, type: 'framework' as const, language: 'typescript', framework: 'Angular' },
        { pattern: /^vue\.config\.(js|ts)$/, type: 'framework' as const, language: 'javascript', framework: 'Vue.js' }
      ];

      for (const { pattern, type, language, framework } of configPatterns) {
        if (pattern.test(fileName)) {
          const dependencies = await this.extractConfigurationDependencies(filePath, type);
          const relatedFiles = await this.findRelatedFiles(filePath, type);
          const settings = await this.extractConfigurationSettings(filePath, type);

          configFiles.push({
            id: this.generateConfigId(filePath),
            filePath,
            type,
            language,
            framework,
            dependencies,
            relatedFiles,
            settings,
            confidence: this.calculateConfigConfidence(filePath, type)
          });
          break;
        }
      }
    }

    return configFiles;
  }

  private async extractConfigurationDependencies(filePath: string, type: ConfigurationFile['type']): Promise<string[]> {
    const dependencies: string[] = [];

    try {
      // Read file content to extract dependencies
      const content = await this.readFileContent(filePath);

      switch (type) {
        case 'package':
          if (filePath.endsWith('package.json')) {
            const packageJson = JSON.parse(content);
            if (packageJson.dependencies) {
              dependencies.push(...Object.keys(packageJson.dependencies));
            }
            if (packageJson.devDependencies) {
              dependencies.push(...Object.keys(packageJson.devDependencies));
            }
          }
          break;
        case 'build':
          if (filePath.includes('tsconfig')) {
            const tsconfig = JSON.parse(content);
            if (tsconfig.extends) {
              dependencies.push(tsconfig.extends);
            }
          }
          break;
        case 'env':
          // Extract referenced environment variables
          const envVarMatches = content.match(/\$\{?([A-Z_][A-Z0-9_]*)\}?/g);
          if (envVarMatches) {
            dependencies.push(...envVarMatches.map(match => match.replace(/\$\{?|\}?/g, '')));
          }
          break;
      }
    } catch (error) {
      // File might not be readable or parseable
    }

    return dependencies;
  }

  private async findRelatedFiles(filePath: string, type: ConfigurationFile['type']): Promise<string[]> {
    const relatedFiles: string[] = [];
    const fileNodes = this.storage.findNodes(node => node.type === 'file' && !!node.path);

    switch (type) {
      case 'package':
        // Find lock files, build configs, etc.
        relatedFiles.push(
          ...fileNodes
            .map(node => node.path!)
            .filter(path =>
              path.includes('package-lock.json') ||
              path.includes('yarn.lock') ||
              path.includes('pnpm-lock.yaml') ||
              path.includes('tsconfig.json') ||
              path.includes('webpack.config') ||
              path.includes('vite.config')
            )
        );
        break;
      case 'build':
        if (filePath.includes('tsconfig')) {
          relatedFiles.push(
            ...fileNodes
              .map(node => node.path!)
              .filter(path => path.endsWith('.ts') || path.endsWith('.tsx'))
              .slice(0, 10) // Limit to avoid too many files
          );
        }
        break;
      case 'test':
        relatedFiles.push(
          ...fileNodes
            .map(node => node.path!)
            .filter(path =>
              path.includes('/test/') ||
              path.includes('/tests/') ||
              path.includes('.test.') ||
              path.includes('.spec.')
            )
            .slice(0, 10)
        );
        break;
    }

    return relatedFiles;
  }

  private async extractConfigurationSettings(filePath: string, type: ConfigurationFile['type']): Promise<Record<string, any>> {
    const settings: Record<string, any> = {};

    try {
      const content = await this.readFileContent(filePath);

      if (filePath.endsWith('.json')) {
        const jsonContent = JSON.parse(content);
        // Extract key configuration settings
        if (type === 'package') {
          settings.main = jsonContent.main;
          settings.scripts = Object.keys(jsonContent.scripts || {});
          settings.engines = jsonContent.engines;
        } else if (type === 'build' && filePath.includes('tsconfig')) {
          settings.target = jsonContent.compilerOptions?.target;
          settings.module = jsonContent.compilerOptions?.module;
          settings.strict = jsonContent.compilerOptions?.strict;
        }
      }
    } catch (error) {
      // File might not be readable or parseable
    }

    return settings;
  }

  private async analyzeConfigurationDependencies(configFiles: ConfigurationFile[]): Promise<ConfigurationRelationship[]> {
    const relationships: ConfigurationRelationship[] = [];

    for (const config of configFiles) {
      // Analyze extends relationships
      if (config.settings.extends) {
        relationships.push({
          sourceFile: config.filePath,
          targetFile: config.settings.extends,
          relationship: 'extends',
          description: `${config.filePath} extends configuration from ${config.settings.extends}`,
          confidence: 0.9
        });
      }

      // Analyze dependency relationships
      for (const dep of config.dependencies) {
        const relatedConfig = configFiles.find(cf =>
          cf.filePath.includes(dep) ||
          cf.settings.main === dep ||
          cf.filePath.endsWith(`${dep}.json`)
        );

        if (relatedConfig) {
          relationships.push({
            sourceFile: config.filePath,
            targetFile: relatedConfig.filePath,
            relationship: 'depends_on',
            description: `${config.filePath} depends on configuration in ${relatedConfig.filePath}`,
            confidence: 0.7
          });
        }
      }

      // Analyze file proximity relationships
      for (const relatedFile of config.relatedFiles) {
        const relatedConfig = configFiles.find(cf => cf.filePath === relatedFile);
        if (relatedConfig && relatedConfig.filePath !== config.filePath) {
          relationships.push({
            sourceFile: config.filePath,
            targetFile: relatedConfig.filePath,
            relationship: 'configures',
            description: `${config.filePath} provides configuration for ${relatedConfig.filePath}`,
            confidence: 0.6
          });
        }
      }
    }

    return relationships;
  }

  private buildConfigurationDependencyTree(relationships: ConfigurationRelationship[]): Map<string, string[]> {
    const dependencyTree = new Map<string, string[]>();

    for (const rel of relationships) {
      if (!dependencyTree.has(rel.sourceFile)) {
        dependencyTree.set(rel.sourceFile, []);
      }
      dependencyTree.get(rel.sourceFile)!.push(rel.targetFile);
    }

    return dependencyTree;
  }

  private findOrphanedConfigurations(configFiles: ConfigurationFile[], relationships: ConfigurationRelationship[]): string[] {
    const connectedFiles = new Set<string>();

    for (const rel of relationships) {
      connectedFiles.add(rel.sourceFile);
      connectedFiles.add(rel.targetFile);
    }

    return configFiles
      .filter(config => !connectedFiles.has(config.filePath))
      .map(config => config.filePath);
  }

  private calculateConfigurationCoverage(configFiles: ConfigurationFile[]): number {
    const totalFiles = this.storage.findNodes(node => node.type === 'file').length;
    const configuredComponents = new Set<string>();

    for (const config of configFiles) {
      configuredComponents.add(config.filePath);
      config.relatedFiles.forEach(file => configuredComponents.add(file));
    }

    return totalFiles > 0 ? (configuredComponents.size / totalFiles) * 100 : 0;
  }

  private generateConfigurationRecommendations(configFiles: ConfigurationFile[], relationships: ConfigurationRelationship[]): string[] {
    const recommendations: string[] = [];

    // Check for missing essential configurations
    const hasPackageJson = configFiles.some(cf => cf.filePath.endsWith('package.json'));
    const hasTsConfig = configFiles.some(cf => cf.filePath.includes('tsconfig'));
    const hasTestConfig = configFiles.some(cf => cf.type === 'test');
    const hasLintConfig = configFiles.some(cf => cf.type === 'lint');

    if (!hasPackageJson && configFiles.some(cf => cf.language === 'javascript' || cf.language === 'typescript')) {
      recommendations.push('Consider adding package.json for Node.js dependency management');
    }

    if (!hasTsConfig && configFiles.some(cf => cf.language === 'typescript')) {
      recommendations.push('Consider adding tsconfig.json for TypeScript configuration');
    }

    if (!hasTestConfig) {
      recommendations.push('Consider adding test configuration (jest.config.js, etc.) for automated testing');
    }

    if (!hasLintConfig) {
      recommendations.push('Consider adding linting configuration (.eslintrc, .prettierrc) for code quality');
    }

    // Check for orphaned configurations
    const orphanedCount = this.findOrphanedConfigurations(configFiles, relationships).length;
    if (orphanedCount > 0) {
      recommendations.push(`${orphanedCount} configuration files appear to be orphaned - consider reviewing their necessity`);
    }

    // Check for overly complex configuration relationships
    const maxRelationships = Math.max(...Array.from(this.buildConfigurationDependencyTree(relationships).values()).map(deps => deps.length));
    if (maxRelationships > 5) {
      recommendations.push('Some configuration files have many dependencies - consider simplifying configuration structure');
    }

    return recommendations;
  }

  private async readFileContent(filePath: string): Promise<string> {
    try {
      const fs = await import('fs');
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      // File might not be readable or accessible
      return '';
    }
  }

  private generateConfigId(filePath: string): string {
    return `config_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
  }

  private calculateConfigConfidence(filePath: string, type: ConfigurationFile['type']): number {
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);

    // Well-known configuration files get higher confidence
    const wellKnownConfigs = [
      'package.json', 'tsconfig.json', '.gitignore', '.env',
      'webpack.config.js', 'jest.config.js', '.eslintrc.json'
    ];

    if (wellKnownConfigs.includes(fileName)) {
      return 0.95;
    }

    // Framework-specific configs get medium-high confidence
    if (type === 'framework') {
      return 0.85;
    }

    // Other recognized patterns get medium confidence
    if (fileName.startsWith('.') || fileName.includes('config')) {
      return 0.75;
    }

    return 0.6;
  }
}

export interface TestCoverageResult {
  totalImplementationFiles: number;
  totalTestFiles: number;
  filesWithTests: number;
  filesWithoutTests: number;
  coveragePercentage: number;
  mappings: TestCoverageMapping[];
  orphanImplementationFiles: string[];
  untestedTestFiles: string[];
  mappingAccuracy: number;
}

export interface TestCoverageMapping {
  testFile: string;
  implementationFile: string;
  confidence: number;
  matchType: string;
}