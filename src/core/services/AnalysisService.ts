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

export interface AnalysisResult {
  architectural: ArchitecturalInsight[];
  callPatterns: CallPatternAnalysis;
  frameworks: any[];
  tooling: any[];
  errorPredictions: ErrorPrediction[];
  riskAssessment: RiskAssessment;
  recommendations: string[];
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
    // For now, return placeholder recommendations since the method doesn't exist in the detector
    // This should be implemented in the EnhancedFrameworkDetector class
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
        recommendations.push({
          framework: name,
          type: recommendationType,
          suggestions: [`Follow ${name} best practices`, `Keep ${name} dependencies up to date`]
        });
      });
    }

    return recommendations;
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
      riskAssessment
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
      })
    ]) as [any, any, any, any, any, any];

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
}