import { MindMapStorage } from '../../MindMapStorage.js';
import { ArchitecturalAnalyzer } from '../../ArchitecturalAnalyzer.js';
import { CallPatternAnalyzer } from '../../CallPatternAnalyzer.js';
import { ArchitecturalInsight, CallPatternAnalysis } from '../../../types/index.js';

/**
 * ASTAnalysisService
 *
 * Responsible for: Code structure and AST-level analysis
 * - Architectural analysis and design pattern detection
 * - Call pattern analysis and metrics
 * - Code complexity and structure insights
 *
 * Extracted from AnalysisService.ts (Phase 1.2 Refactoring)
 * Original responsibility: ~800 lines of 2991-line God Object
 */
export class ASTAnalysisService {
  constructor(
    private storage: MindMapStorage,
    private architecturalAnalyzer: ArchitecturalAnalyzer,
    private callPatternAnalyzer: CallPatternAnalyzer
  ) {}

  /**
   * Analyze project architecture and return insights
   */
  async analyzeArchitecture(
    limit: number = 10,
    minConfidence: number = 0.3
  ): Promise<ArchitecturalInsight[]> {
    const insights = this.architecturalAnalyzer.analyzeProjectArchitecture();
    return insights
      .filter(insight => insight.confidence >= minConfidence)
      .slice(0, limit);
  }

  /**
   * Get all architectural insights without filtering
   */
  async getArchitecturalInsights(): Promise<ArchitecturalInsight[]> {
    return this.architecturalAnalyzer.analyzeProjectArchitecture();
  }

  /**
   * Analyze call patterns across files
   */
  async analyzeCallPatterns(
    filePaths?: string[],
    includeMetrics: boolean = true
  ): Promise<CallPatternAnalysis> {
    // Get file paths from storage if not provided
    if (!filePaths || filePaths.length === 0) {
      const fileNodes = this.storage.findNodes(node =>
        node.type === 'file' &&
        !!node.path &&
        (node.path.endsWith('.ts') ||
         node.path.endsWith('.js') ||
         node.path.endsWith('.tsx') ||
         node.path.endsWith('.jsx'))
      );
      filePaths = fileNodes.map(node => node.path!).filter(path => !!path);
    }

    const allNodes: any[] = [];
    const allEdges: any[] = [];
    const allCallPatterns: any[] = [];
    let globalCallGraph: any = {
      nodes: new Map(),
      edges: [],
      entryPoints: [],
      cycles: [],
      depth: 0
    };

    // Analyze each file
    console.log(`DEBUG: analyzeCallPatterns processing ${filePaths.length} files`);
    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      try {
        console.log(`DEBUG: Processing file ${i + 1}/${filePaths.length}: ${filePath}`);
        const result = await this.callPatternAnalyzer.analyzeFile(filePath);
        console.log(`DEBUG: Completed file ${i + 1}/${filePaths.length}: ${filePath}`);

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
    const statistics = includeMetrics
      ? this.callPatternAnalyzer.getCallPatternStatistics()
      : {
          totalCallPatterns: allCallPatterns.length,
          directCalls: 0,
          methodCalls: 0,
          constructorCalls: 0,
          asyncCalls: 0,
          recursiveFunctions: 0,
          averageComplexity: 0,
          maxComplexity: 0,
          minComplexity: 0,
          totalFunctions: 0
        };

    return {
      nodes: allNodes,
      edges: allEdges,
      callPatterns: allCallPatterns,
      callGraph: globalCallGraph,
      statistics
    };
  }

  /**
   * Get call pattern statistics
   */
  getCallPatternStatistics(): any {
    return this.callPatternAnalyzer.getCallPatternStatistics();
  }

  /**
   * Detect design patterns in the codebase
   * (Future enhancement placeholder)
   */
  async detectDesignPatterns(): Promise<{
    singleton: string[];
    factory: string[];
    observer: string[];
    strategy: string[];
    decorator: string[];
  }> {
    // TODO: Implement design pattern detection
    // This would analyze the AST to find common design patterns
    return {
      singleton: [],
      factory: [],
      observer: [],
      strategy: [],
      decorator: []
    };
  }

  /**
   * Analyze code complexity metrics
   * (Future enhancement placeholder)
   */
  async analyzeComplexity(filePath: string): Promise<{
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    linesOfCode: number;
    maintainabilityIndex: number;
  }> {
    // TODO: Implement complexity analysis
    // This would calculate various complexity metrics
    return {
      cyclomaticComplexity: 0,
      cognitiveComplexity: 0,
      linesOfCode: 0,
      maintainabilityIndex: 100
    };
  }
}
