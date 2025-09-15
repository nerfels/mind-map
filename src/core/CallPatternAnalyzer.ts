import * as ts from 'typescript';
import { MindMapNode, MindMapEdge } from '../types/index.js';
import { readFile } from 'fs/promises';

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

export interface CallChain {
  id: string;
  sequence: string[]; // Function IDs in call order
  depth: number;
  performance: {
    estimatedLatency: number; // ms
    complexityScore: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  crossFileCount: number;
  hasAsyncCalls: boolean;
  hasConditionalCalls: boolean;
}

export interface FunctionCallGraph {
  nodes: Map<string, CallGraphNode>;
  edges: CallPattern[];
  entryPoints: string[];
  cycles: string[][];
  depth: number;
  callChains: CallChain[];
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
  codeStyle?: CodeStyleMetrics;
}

export interface CodeStyleMetrics {
  namingConvention: 'camelCase' | 'PascalCase' | 'snake_case' | 'kebab-case' | 'UPPER_CASE' | 'mixed';
  parameterCount: number;
  hasTypeAnnotations: boolean;
  hasDefaultParameters: boolean;
  usesArrowFunction: boolean;
  hasJSDoc: boolean;
  functionLength: number; // lines of code
  indentationStyle: 'spaces' | 'tabs' | 'mixed';
  braceStyle: '1TBS' | 'Allman' | 'GNU' | 'mixed';
}

export interface VariableDeclaration {
  id: string;
  name: string;
  type: 'var' | 'let' | 'const' | 'parameter' | 'property' | 'import';
  dataType?: string; // inferred or annotated type
  filePath: string;
  lineNumber: number;
  scope: 'global' | 'function' | 'block' | 'class' | 'module';
  scopeId: string; // ID of the containing scope
  isExported: boolean;
  isImported: boolean;
  importSource?: string; // for imported variables
  initialValue?: string; // literal initial value if simple
  confidence: number;
}

export interface VariableUsage {
  id: string;
  variableId: string;
  variableName: string;
  usageType: 'read' | 'write' | 'call' | 'property_access' | 'assignment' | 'parameter_passing';
  filePath: string;
  lineNumber: number;
  functionContext?: string; // ID of containing function
  confidence: number;
  context: {
    isConditional?: boolean;
    isLoop?: boolean;
    isAsyncContext?: boolean;
    isTryCatch?: boolean;
    accessPattern?: string; // e.g., "obj.prop", "arr[0]"
  };
}

export interface VariableLifecycle {
  variableId: string;
  variableName: string;
  declaration: VariableDeclaration;
  usages: VariableUsage[];
  isUnused: boolean;
  firstUsage?: VariableUsage;
  lastUsage?: VariableUsage;
  readCount: number;
  writeCount: number;
  crossFileUsageCount: number;
  lifespan: {
    declarationLine: number;
    firstUsageLine?: number;
    lastUsageLine?: number;
    scopeEnd?: number;
  };
}

export interface CrossModuleVariableDependency {
  id: string;
  sourceVariable: VariableDeclaration;
  targetVariable: VariableDeclaration;
  dependencyType: 'import' | 'export' | 'reference' | 'assignment';
  sourceFile: string;
  targetFile: string;
  confidence: number;
  usagePattern: string;
}

export interface VariableAnalysisResult {
  declarations: VariableDeclaration[];
  usages: VariableUsage[];
  lifecycles: VariableLifecycle[];
  crossModuleDependencies: CrossModuleVariableDependency[];
  unusedVariables: VariableDeclaration[];
  globalVariables: VariableDeclaration[];
  importExportMapping: Map<string, string[]>; // file -> imported/exported variables
}

/**
 * Advanced Call Pattern Analyzer for tracking function calls, method invocations,
 * variable usage patterns, and code relationships within and across files
 */
export class CallPatternAnalyzer {
  private callPatterns: Map<string, CallPattern[]> = new Map();
  private functionRegistry: Map<string, CallGraphNode> = new Map();
  private crossFileReferences: Map<string, string[]> = new Map();

  // Variable tracking storage
  private variableDeclarations: Map<string, VariableDeclaration[]> = new Map();
  private variableUsages: Map<string, VariableUsage[]> = new Map();
  private variableLifecycles: Map<string, VariableLifecycle[]> = new Map();
  private crossModuleDependencies: Map<string, CrossModuleVariableDependency[]> = new Map();
  private scopeRegistry: Map<string, string> = new Map(); // scopeId -> filePath

  constructor() {}

  async analyzeFile(filePath: string, content?: string): Promise<{
    nodes: MindMapNode[];
    edges: MindMapEdge[];
    callPatterns: CallPattern[];
    callGraph: FunctionCallGraph;
    variableAnalysis: VariableAnalysisResult;
  }> {
    console.log(`[CallPatternAnalyzer] Starting analysis of: ${filePath}`);

    // Add timeout to prevent hanging on large files
    const ANALYSIS_TIMEOUT = 30000; // 30 seconds

    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.warn(`Analysis timeout for ${filePath} after ${ANALYSIS_TIMEOUT}ms`);
        resolve({
          nodes: [],
          edges: [],
          callPatterns: [],
          callGraph: this.createEmptyCallGraph(),
          variableAnalysis: this.createEmptyVariableAnalysis()
        });
      }, ANALYSIS_TIMEOUT);

      try {
        console.log(`[CallPatternAnalyzer] Reading file content: ${filePath}`);
        const fileContent = content || await readFile(filePath, 'utf-8');
        const fileName = filePath.split('/').pop() || filePath;

      console.log(`[CallPatternAnalyzer] Creating TypeScript AST for: ${fileName}`);
      // Create TypeScript AST
      const sourceFile = ts.createSourceFile(
        filePath,
        fileContent,
        ts.ScriptTarget.ES2022,
        true,
        this.getScriptKind(fileName)
      );

      console.log(`[CallPatternAnalyzer] Extracting declarations from: ${fileName}`);
      // Extract function/method declarations first
      const declarations = this.extractDeclarations(sourceFile, filePath);
      console.log(`[CallPatternAnalyzer] Found ${declarations.length} declarations in: ${fileName}`);

      console.log(`[CallPatternAnalyzer] Extracting call patterns from: ${fileName}`);
      // Extract call patterns
      const callPatterns = this.extractCallPatterns(sourceFile, filePath, declarations);
      console.log(`[CallPatternAnalyzer] Found ${callPatterns.length} call patterns in: ${fileName}`);

      console.log(`[CallPatternAnalyzer] Building call graph for: ${fileName}`);
      // Build call graph
      const callGraph = this.buildCallGraph(declarations, callPatterns);
      console.log(`[CallPatternAnalyzer] Built call graph with ${callGraph.nodes.size} nodes for: ${fileName}`);

      console.log(`[CallPatternAnalyzer] Starting variable analysis for: ${fileName}`);
      // Extract variable analysis
      const variableAnalysis = this.analyzeVariables(sourceFile, filePath, declarations);
      console.log(`[CallPatternAnalyzer] Found ${variableAnalysis.declarations.length} variables in: ${fileName}`);

      // Create mind map nodes and edges (now includes variable nodes)
      const { nodes, edges } = this.createMindMapElements(filePath, declarations, callPatterns, callGraph, variableAnalysis);

      // Store patterns for cross-file analysis
      this.callPatterns.set(filePath, callPatterns);
      declarations.forEach(decl => this.functionRegistry.set(decl.id, decl));

      // Store variable analysis results
      this.variableDeclarations.set(filePath, variableAnalysis.declarations);
      this.variableUsages.set(filePath, variableAnalysis.usages);
      this.variableLifecycles.set(filePath, variableAnalysis.lifecycles);
      if (variableAnalysis.crossModuleDependencies.length > 0) {
        this.crossModuleDependencies.set(filePath, variableAnalysis.crossModuleDependencies);
      }

        clearTimeout(timeoutId);
        resolve({ nodes, edges, callPatterns, callGraph, variableAnalysis });

      } catch (error) {
        clearTimeout(timeoutId);
        console.warn(`Failed to analyze call patterns in ${filePath}:`, error);
        resolve({
          nodes: [],
          edges: [],
          callPatterns: [],
          callGraph: this.createEmptyCallGraph(),
          variableAnalysis: this.createEmptyVariableAnalysis()
        });
      }
    });
  }

  private extractDeclarations(sourceFile: ts.SourceFile, filePath: string): CallGraphNode[] {
    const declarations: CallGraphNode[] = [];
    let depth = 0;
    const MAX_DEPTH = 50; // Prevent infinite recursion

    const visit = (node: ts.Node): void => {
      depth++;
      if (depth > MAX_DEPTH) {
        console.warn(`Max recursion depth reached in ${filePath}, stopping analysis`);
        return;
      }
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)) {
        const declaration = this.processDeclaration(node, filePath);
        if (declaration) {
          declarations.push(declaration);
        }
      }

      // Handle class declarations as constructor targets
      if (ts.isClassDeclaration(node)) {
        const className = node.name?.text || 'anonymous_class';
        const lineNumber = this.getLineNumber(node, sourceFile);
        const complexity = this.calculateComplexity(node);
        const codeStyle = this.analyzeCodeStyle(node, sourceFile, className);

        const classDeclaration: CallGraphNode = {
          id: `${filePath}:${className}:${lineNumber}`,
          name: className,
          type: 'constructor',
          filePath,
          lineNumber,
          incomingCalls: 0,
          outgoingCalls: 0,
          complexity,
          isRecursive: false,
          codeStyle
        };

        declarations.push(classDeclaration);
      }

      // Handle arrow functions and function expressions
      if (ts.isVariableDeclaration(node) && node.initializer) {
        if (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) {
          const declaration = this.processVariableFunction(node, filePath);
          if (declaration) {
            declarations.push(declaration);
          }
        }
      }

      ts.forEachChild(node, visit);
      depth--;
    };

    visit(sourceFile);
    return declarations;
  }

  private processDeclaration(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ConstructorDeclaration,
    filePath: string
  ): CallGraphNode | null {
    let name: string;
    let type: 'function' | 'method' | 'constructor';

    if (ts.isFunctionDeclaration(node)) {
      name = node.name?.text || 'anonymous';
      type = 'function';
    } else if (ts.isMethodDeclaration(node)) {
      name = ts.isIdentifier(node.name) ? node.name.text : 'method';
      type = 'method';
    } else {
      name = 'constructor';
      type = 'constructor';
    }

    const sourceFile = node.getSourceFile();
    const lineNumber = this.getLineNumber(node, sourceFile);
    const complexity = this.calculateComplexity(node);
    const isRecursive = this.checkRecursion(node, name);
    const codeStyle = this.analyzeCodeStyle(node, sourceFile, name);

    return {
      id: `${filePath}:${name}:${lineNumber}`,
      name,
      type,
      filePath,
      lineNumber,
      incomingCalls: 0,
      outgoingCalls: 0,
      complexity,
      isRecursive,
      codeStyle
    };
  }

  private processVariableFunction(node: ts.VariableDeclaration, filePath: string): CallGraphNode | null {
    if (!node.initializer || !ts.isIdentifier(node.name)) {
      return null;
    }

    const name = node.name.text;
    const sourceFile = node.getSourceFile();
    const lineNumber = this.getLineNumber(node, sourceFile);
    const complexity = this.calculateComplexity(node.initializer);
    const isRecursive = this.checkRecursion(node.initializer, name);
    const codeStyle = this.analyzeCodeStyle(node.initializer, sourceFile, name);

    return {
      id: `${filePath}:${name}:${lineNumber}`,
      name,
      type: 'function',
      filePath,
      lineNumber,
      incomingCalls: 0,
      outgoingCalls: 0,
      complexity,
      isRecursive,
      codeStyle
    };
  }

  private extractCallPatterns(
    sourceFile: ts.SourceFile,
    filePath: string,
    declarations: CallGraphNode[]
  ): CallPattern[] {
    const patterns: CallPattern[] = [];
    const declMap = new Map(declarations.map(d => [d.name, d]));
    let depth = 0;
    const MAX_DEPTH = 50; // Prevent infinite recursion

    const visit = (node: ts.Node, currentFunction?: CallGraphNode): void => {
      depth++;
      if (depth > MAX_DEPTH) {
        console.warn(`Max recursion depth reached in extractCallPatterns for ${filePath}, stopping analysis`);
        return;
      }
      // Track current function context
      let currentFunc = currentFunction;
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)) {
        const name = this.getFunctionName(node);
        currentFunc = declMap.get(name) || currentFunction;
      } else if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        // For arrow functions and function expressions, try to find by parent variable declaration
        if (node.parent && ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
          const name = node.parent.name.text;
          currentFunc = declMap.get(name) || currentFunction;
        }
      }

      // If we don't have a current function, create a virtual top-level context
      if (!currentFunc) {
        currentFunc = {
          id: `${filePath}:__top_level__:0`,
          name: '__top_level__',
          type: 'function',
          filePath,
          lineNumber: 0,
          incomingCalls: 0,
          outgoingCalls: 0,
          complexity: 1,
          isRecursive: false
        };
      }

      // Process different types of calls
      if (ts.isCallExpression(node) && currentFunc) {
        const pattern = this.processCallExpression(node, sourceFile, filePath, currentFunc, declarations);
        if (pattern) patterns.push(pattern);
      } else if (ts.isNewExpression(node) && currentFunc) {
        const pattern = this.processNewExpression(node, sourceFile, filePath, currentFunc, declarations);
        if (pattern) patterns.push(pattern);
      } else if (ts.isPropertyAccessExpression(node) && node.parent && ts.isCallExpression(node.parent)) {
        // Method calls are handled in processCallExpression
      }

      ts.forEachChild(node, (child) => visit(child, currentFunc));
      depth--;
    };

    visit(sourceFile);
    return patterns;
  }

  private processCallExpression(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
    filePath: string,
    currentFunction: CallGraphNode,
    declarations: CallGraphNode[]
  ): CallPattern | null {
    if (!currentFunction) return null;

    const lineNumber = this.getLineNumber(node, sourceFile);
    let calleeName: string;
    let callType: CallPattern['callType'] = 'direct_call';

    // Determine the callee name and call type
    if (ts.isIdentifier(node.expression)) {
      calleeName = node.expression.text;
    } else if (ts.isPropertyAccessExpression(node.expression)) {
      calleeName = node.expression.name.text;
      callType = 'method_call';
    } else if (ts.isElementAccessExpression(node.expression)) {
      calleeName = 'dynamic_call';
      callType = 'method_call';
    } else {
      calleeName = 'anonymous_call';
    }

    // Check for async calls
    const isAsyncCall = this.isInAsyncContext(node);
    if (isAsyncCall) {
      callType = 'async_call';
    }

    // Analyze call context
    const context = this.analyzeCallContext(node);

    // Try to resolve the callee ID to a known function
    let calleeId = `${filePath}:${calleeName}:unknown`;
    const declMap = new Map(declarations.map(d => [d.name, d]));
    const calleeDecl = declMap.get(calleeName);
    if (calleeDecl) {
      calleeId = calleeDecl.id;
    }

    return {
      callerId: currentFunction.id,
      callerName: currentFunction.name,
      callerType: currentFunction.type,
      calleeId,
      calleeName,
      calleeType: this.inferCalleeType(node),
      callType,
      sourceFile: filePath,
      lineNumber,
      confidence: this.calculateCallConfidence(node, calleeName),
      context
    };
  }

  private processNewExpression(
    node: ts.NewExpression,
    sourceFile: ts.SourceFile,
    filePath: string,
    currentFunction: CallGraphNode,
    declarations: CallGraphNode[]
  ): CallPattern | null {
    if (!currentFunction) return null;

    const lineNumber = this.getLineNumber(node, sourceFile);
    let constructorName: string;

    if (ts.isIdentifier(node.expression)) {
      constructorName = node.expression.text;
    } else if (ts.isPropertyAccessExpression(node.expression)) {
      constructorName = node.expression.name.text;
    } else {
      constructorName = 'anonymous_constructor';
    }

    const context = this.analyzeCallContext(node);

    // Try to resolve the constructor ID to a known class
    let calleeId = `${filePath}:${constructorName}:constructor`;
    const declMap = new Map(declarations.map(d => [d.name, d]));
    const constructorDecl = declMap.get(constructorName);
    if (constructorDecl) {
      calleeId = constructorDecl.id;
    }

    return {
      callerId: currentFunction.id,
      callerName: currentFunction.name,
      callerType: currentFunction.type,
      calleeId,
      calleeName: constructorName,
      calleeType: 'constructor',
      callType: 'constructor_call',
      sourceFile: filePath,
      lineNumber,
      confidence: this.calculateCallConfidence(node, constructorName),
      context
    };
  }

  private buildCallGraph(declarations: CallGraphNode[], patterns: CallPattern[]): FunctionCallGraph {
    const nodes = new Map(declarations.map(d => [d.id, { ...d }]));
    const edges = [...patterns];

    // Update call counts
    patterns.forEach(pattern => {
      const caller = nodes.get(pattern.callerId);
      if (caller) {
        caller.outgoingCalls++;
      }

      const callee = nodes.get(pattern.calleeId);
      if (callee) {
        callee.incomingCalls++;
      }
    });

    // Find entry points (functions with no incoming calls)
    const entryPoints = Array.from(nodes.values())
      .filter(node => node.incomingCalls === 0)
      .map(node => node.id);

    // Detect cycles (simplified cycle detection)
    const cycles = this.detectCycles(nodes, edges);

    // Calculate maximum call depth
    const depth = this.calculateCallDepth(nodes, edges);

    // Analyze call chains
    const callChains = this.analyzeCallChains(nodes, edges, entryPoints);

    return { nodes, edges, entryPoints, cycles, depth, callChains };
  }

  private createMindMapElements(
    filePath: string,
    declarations: CallGraphNode[],
    patterns: CallPattern[],
    callGraph: FunctionCallGraph,
    variableAnalysis?: VariableAnalysisResult
  ): { nodes: MindMapNode[]; edges: MindMapEdge[] } {
    const nodes: MindMapNode[] = [];
    const edges: MindMapEdge[] = [];

    // Create nodes for functions
    declarations.forEach(decl => {
      const node: MindMapNode = {
        id: `call_pattern_${decl.id.replace(/[^\w]/g, '_')}`,
        type: 'function',
        name: decl.name,
        path: filePath,
        metadata: {
          functionType: decl.type,
          lineNumber: decl.lineNumber,
          complexity: decl.complexity,
          incomingCalls: decl.incomingCalls,
          outgoingCalls: decl.outgoingCalls,
          isRecursive: decl.isRecursive,
          isEntryPoint: callGraph.entryPoints.includes(decl.id),
          language: 'typescript',
          callChains: this.getCallChainsForFunction(decl.id, callGraph.callChains),
          maxChainDepth: this.getMaxChainDepth(decl.id, callGraph.callChains),
          chainPerformanceRisk: this.getChainPerformanceRisk(decl.id, callGraph.callChains)
        },
        confidence: 0.9,
        lastUpdated: new Date()
      };
      nodes.push(node);
    });

    // Create edges for call patterns
    patterns.forEach((pattern, index) => {
      const edge: MindMapEdge = {
        id: `call_edge_${index}_${filePath.replace(/[^\w]/g, '_')}`,
        source: `call_pattern_${pattern.callerId.replace(/[^\w]/g, '_')}`,
        target: `call_pattern_${pattern.calleeId.replace(/[^\w]/g, '_')}`,
        type: 'calls',
        metadata: {
          callType: pattern.callType,
          lineNumber: pattern.lineNumber,
          confidence: pattern.confidence,
          context: pattern.context,
          isAsync: pattern.callType === 'async_call',
          isConditional: pattern.context.isConditional
        },
        confidence: pattern.confidence
      };
      edges.push(edge);
    });

    // Create nodes and edges for variables if analysis is available
    if (variableAnalysis) {
      // Create nodes for variable declarations
      variableAnalysis.declarations.forEach((declaration, index) => {
        const node: MindMapNode = {
          id: `variable_${declaration.id.replace(/[^\w]/g, '_')}`,
          type: 'variable',
          name: declaration.name,
          path: filePath,
          metadata: {
            variableType: declaration.type,
            dataType: declaration.dataType,
            lineNumber: declaration.lineNumber,
            scope: declaration.scope,
            scopeId: declaration.scopeId,
            isExported: declaration.isExported,
            isImported: declaration.isImported,
            importSource: declaration.importSource,
            initialValue: declaration.initialValue,
            isUnused: variableAnalysis.unusedVariables.some(v => v.id === declaration.id),
            isGlobal: declaration.scope === 'global' || declaration.scope === 'module',
            usageCount: variableAnalysis.usages.filter(u => u.variableId === declaration.id).length,
            readCount: variableAnalysis.lifecycles.find(l => l.variableId === declaration.id)?.readCount || 0,
            writeCount: variableAnalysis.lifecycles.find(l => l.variableId === declaration.id)?.writeCount || 0,
            crossFileUsageCount: variableAnalysis.lifecycles.find(l => l.variableId === declaration.id)?.crossFileUsageCount || 0,
            language: 'typescript'
          },
          confidence: declaration.confidence,
          lastUpdated: new Date()
        };
        nodes.push(node);
      });

      // Create edges for variable usages
      variableAnalysis.usages.forEach((usage, index) => {
        const edge: MindMapEdge = {
          id: `variable_usage_edge_${index}_${filePath.replace(/[^\w]/g, '_')}`,
          source: `variable_${usage.variableId.replace(/[^\w]/g, '_')}`,
          target: usage.functionContext ? `call_pattern_${usage.functionContext.replace(/[^\w]/g, '_')}` : `file_${filePath.replace(/[^\w]/g, '_')}`,
          type: 'used_by',
          metadata: {
            usageType: usage.usageType,
            lineNumber: usage.lineNumber,
            confidence: usage.confidence,
            context: usage.context,
            isConditional: usage.context.isConditional,
            isLoop: usage.context.isLoop,
            isAsync: usage.context.isAsyncContext,
            accessPattern: usage.context.accessPattern
          },
          confidence: usage.confidence
        };
        edges.push(edge);
      });

      // Create edges for cross-module dependencies
      variableAnalysis.crossModuleDependencies.forEach((dependency, index) => {
        const edge: MindMapEdge = {
          id: `cross_module_dep_${index}_${filePath.replace(/[^\w]/g, '_')}`,
          source: `variable_${dependency.sourceVariable.id.replace(/[^\w]/g, '_')}`,
          target: `external_${dependency.targetFile.replace(/[^\w]/g, '_')}`,
          type: 'depends_on',
          metadata: {
            dependencyType: dependency.dependencyType,
            sourceFile: dependency.sourceFile,
            targetFile: dependency.targetFile,
            usagePattern: dependency.usagePattern,
            confidence: dependency.confidence
          },
          confidence: dependency.confidence
        };
        edges.push(edge);
      });
    }

    return { nodes, edges };
  }

  // Utility methods
  private getScriptKind(fileName: string): ts.ScriptKind {
    if (fileName.endsWith('.tsx')) return ts.ScriptKind.TSX;
    if (fileName.endsWith('.ts')) return ts.ScriptKind.TS;
    if (fileName.endsWith('.jsx')) return ts.ScriptKind.JSX;
    return ts.ScriptKind.JS;
  }

  private getLineNumber(node: ts.Node, sourceFile: ts.SourceFile): number {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return position.line + 1;
  }

  private getFunctionName(node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ConstructorDeclaration): string {
    if (ts.isFunctionDeclaration(node)) {
      return node.name?.text || 'anonymous';
    } else if (ts.isMethodDeclaration(node)) {
      return ts.isIdentifier(node.name) ? node.name.text : 'method';
    } else {
      return 'constructor';
    }
  }

  private calculateComplexity(node: ts.Node): number {
    let complexity = 1;

    const visit = (n: ts.Node): void => {
      // Add complexity for control flow statements
      if (ts.isIfStatement(n) || ts.isWhileStatement(n) || ts.isForStatement(n) ||
          ts.isForInStatement(n) || ts.isForOfStatement(n) || ts.isSwitchStatement(n) ||
          ts.isTryStatement(n) || ts.isConditionalExpression(n)) {
        complexity++;
      }

      // Add complexity for catch clauses
      if (ts.isCatchClause(n)) {
        complexity++;
      }

      // Add complexity for logical operators (&& and ||)
      if (ts.isBinaryExpression(n) &&
          (n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
           n.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
        complexity++;
      }

      // Add complexity for case clauses in switch statements
      if (ts.isCaseClause(n) || ts.isDefaultClause(n)) {
        complexity++;
      }

      // Add complexity for callback functions and higher-order function patterns
      if (ts.isCallExpression(n)) {
        // Check if this call expression has function/arrow function arguments (callbacks)
        if (n.arguments.some(arg => ts.isArrowFunction(arg) || ts.isFunctionExpression(arg))) {
          complexity++;
        }

        // Add complexity for chained method calls (fluent interfaces)
        if (ts.isPropertyAccessExpression(n.expression)) {
          const propAccess = n.expression;
          if (ts.isCallExpression(propAccess.expression)) {
            complexity++; // Method chaining adds complexity
          }
        }
      }

      // Add complexity for arrow functions and function expressions (nested functions)
      if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
        complexity++;
      }

      // Add complexity for do-while loops
      if (ts.isDoStatement(n)) {
        complexity++;
      }

      // Add complexity for labeled statements and break/continue to labels
      if (ts.isLabeledStatement(n) || ts.isBreakStatement(n) && n.label || ts.isContinueStatement(n) && n.label) {
        complexity++;
      }

      // Add complexity for with statements (deprecated but still adds complexity)
      if (ts.isWithStatement(n)) {
        complexity++;
      }

      ts.forEachChild(n, visit);
    };

    visit(node);
    return complexity;
  }

  private analyzeCodeStyle(node: ts.Node, sourceFile: ts.SourceFile, name: string): CodeStyleMetrics {
    const namingConvention = this.detectNamingConvention(name);
    const parameterCount = this.getParameterCount(node);
    const hasTypeAnnotations = this.hasTypeAnnotations(node);
    const hasDefaultParameters = this.hasDefaultParameters(node);
    const usesArrowFunction = ts.isArrowFunction(node) || ts.isFunctionExpression(node);
    const hasJSDoc = this.hasJSDocComment(node, sourceFile);
    const functionLength = this.getFunctionLength(node, sourceFile);
    const indentationStyle = this.detectIndentationStyle(node, sourceFile);
    const braceStyle = this.detectBraceStyle(node, sourceFile);

    return {
      namingConvention,
      parameterCount,
      hasTypeAnnotations,
      hasDefaultParameters,
      usesArrowFunction,
      hasJSDoc,
      functionLength,
      indentationStyle,
      braceStyle
    };
  }

  private detectNamingConvention(name: string): CodeStyleMetrics['namingConvention'] {
    if (name === name.toUpperCase() && name.includes('_')) {
      return 'UPPER_CASE';
    }
    if (name.includes('-')) {
      return 'kebab-case';
    }
    if (name.includes('_')) {
      return 'snake_case';
    }
    if (name[0] === name[0].toUpperCase()) {
      return 'PascalCase';
    }
    if (name[0] === name[0].toLowerCase() && /[A-Z]/.test(name)) {
      return 'camelCase';
    }
    return 'mixed';
  }

  private getParameterCount(node: ts.Node): number {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) ||
        ts.isArrowFunction(node) || ts.isFunctionExpression(node) ||
        ts.isConstructorDeclaration(node)) {
      return node.parameters?.length || 0;
    }
    return 0;
  }

  private hasTypeAnnotations(node: ts.Node): boolean {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) ||
        ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      // Check return type annotation
      if (node.type) return true;

      // Check parameter type annotations
      if (node.parameters) {
        return node.parameters.some(param => param.type !== undefined);
      }
    }
    return false;
  }

  private hasDefaultParameters(node: ts.Node): boolean {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) ||
        ts.isArrowFunction(node) || ts.isFunctionExpression(node) ||
        ts.isConstructorDeclaration(node)) {
      return node.parameters?.some(param => param.initializer !== undefined) || false;
    }
    return false;
  }

  private hasJSDocComment(node: ts.Node, sourceFile: ts.SourceFile): boolean {
    const jsDocComments = ts.getJSDocCommentsAndTags(node);
    return jsDocComments.length > 0;
  }

  private getFunctionLength(node: ts.Node, sourceFile: ts.SourceFile): number {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    return end.line - start.line + 1;
  }

  private detectIndentationStyle(node: ts.Node, sourceFile: ts.SourceFile): CodeStyleMetrics['indentationStyle'] {
    const text = sourceFile.getFullText();
    const nodeStart = node.getStart();
    const lineStart = sourceFile.getLineAndCharacterOfPosition(nodeStart).line;

    // Get the line text to analyze indentation
    const lines = text.split('\n');
    if (lineStart < lines.length) {
      const line = lines[lineStart];
      const leadingWhitespace = line.match(/^[\s]*/)?.[0] || '';

      const hasSpaces = leadingWhitespace.includes(' ');
      const hasTabs = leadingWhitespace.includes('\t');

      if (hasSpaces && hasTabs) return 'mixed';
      if (hasTabs) return 'tabs';
      if (hasSpaces) return 'spaces';
    }

    return 'spaces'; // default
  }

  private detectBraceStyle(node: ts.Node, sourceFile: ts.SourceFile): CodeStyleMetrics['braceStyle'] {
    // For function declarations, check if opening brace is on same line or next line
    if (ts.isFunctionDeclaration(node) && node.body) {
      const functionStart = node.getStart();
      const bodyStart = node.body.getStart();

      const functionLine = sourceFile.getLineAndCharacterOfPosition(functionStart).line;
      const bodyLine = sourceFile.getLineAndCharacterOfPosition(bodyStart).line;

      if (bodyLine === functionLine) {
        return '1TBS'; // Same line (1 True Brace Style)
      } else {
        return 'Allman'; // Next line (Allman style)
      }
    }

    return '1TBS'; // default
  }

  private checkRecursion(node: ts.Node, functionName: string): boolean {
    let hasRecursion = false;

    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        if (n.expression.text === functionName) {
          hasRecursion = true;
        }
      }
      ts.forEachChild(n, visit);
    };

    visit(node);
    return hasRecursion;
  }

  private isInAsyncContext(node: ts.Node): boolean {
    let current: ts.Node | undefined = node.parent;
    while (current) {
      if (ts.isFunctionDeclaration(current) || ts.isMethodDeclaration(current) ||
          ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
        return !!(current.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword));
      }
      current = current.parent;
    }
    return false;
  }

  private analyzeCallContext(node: ts.Node): CallPattern['context'] {
    let isConditional = false;
    let isLoop = false;
    let isTryCatch = false;

    let current: ts.Node | undefined = node.parent;
    while (current) {
      if (ts.isIfStatement(current) || ts.isConditionalExpression(current)) {
        isConditional = true;
      }
      if (ts.isWhileStatement(current) || ts.isForStatement(current) ||
          ts.isForInStatement(current) || ts.isForOfStatement(current)) {
        isLoop = true;
      }
      if (ts.isTryStatement(current)) {
        isTryCatch = true;
      }
      current = current.parent;
    }

    const parameterCount = ts.isCallExpression(node) ? node.arguments.length : 0;
    const hasReturnValue = node.parent ? !ts.isExpressionStatement(node.parent) : true;
    const isAsyncContext = this.isInAsyncContext(node);

    return {
      isConditional,
      isLoop,
      isAsyncContext,
      isTryCatch,
      parameterCount,
      hasReturnValue
    };
  }

  private inferCalleeType(node: ts.CallExpression): CallPattern['calleeType'] {
    if (ts.isPropertyAccessExpression(node.expression)) {
      return 'method';
    }
    if (ts.isNewExpression(node)) {
      return 'constructor';
    }
    // Could be enhanced to detect external vs internal functions
    return 'function';
  }

  private calculateCallConfidence(node: ts.Node, calleeName: string): number {
    let confidence = 0.8;

    // Higher confidence for direct identifier calls
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      confidence += 0.1;
    }

    // Lower confidence for dynamic calls
    if (calleeName.includes('dynamic') || calleeName.includes('anonymous')) {
      confidence -= 0.3;
    }

    return Math.max(0.3, Math.min(1.0, confidence));
  }

  private detectCycles(nodes: Map<string, CallGraphNode>, edges: CallPattern[]): string[][] {
    // Optimized cycle detection with depth limits to prevent hanging
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const MAX_DEPTH = 50; // Prevent infinite recursion
    const MAX_CYCLES = 10; // Limit number of cycles to detect

    const dfs = (nodeId: string, path: string[], depth: number): void => {
      // Prevent infinite recursion and excessive memory usage
      if (depth > MAX_DEPTH || cycles.length >= MAX_CYCLES) {
        return;
      }

      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart !== -1 && cycles.length < MAX_CYCLES) {
          cycles.push(path.slice(cycleStart));
        }
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      // Find outgoing edges (limit to prevent exponential blowup)
      const outgoingEdges = edges.filter(e => e.callerId === nodeId).slice(0, 20);
      for (const edge of outgoingEdges) {
        // Reuse path array instead of creating copies to reduce memory usage
        dfs(edge.calleeId, path, depth + 1);
      }

      // Clean up
      path.pop();
      recursionStack.delete(nodeId);
    };

    for (const nodeId of nodes.keys()) {
      if (!visited.has(nodeId) && cycles.length < MAX_CYCLES) {
        dfs(nodeId, [], 0);
      }
    }

    console.log(`[CallPatternAnalyzer] Detected ${cycles.length} cycles in call graph`);
    return cycles;
  }

  private calculateCallDepth(nodes: Map<string, CallGraphNode>, edges: CallPattern[]): number {
    const depths = new Map<string, number>();
    const MAX_DEPTH = 100; // Prevent infinite analysis
    let iterations = 0;
    const MAX_ITERATIONS = 10000; // Prevent infinite loops

    // Initialize entry points with depth 0
    for (const node of nodes.values()) {
      if (node.incomingCalls === 0) {
        depths.set(node.id, 0);
      }
    }

    // BFS to calculate depths with safety limits
    const queue = Array.from(depths.keys());
    let maxDepth = 0;

    while (queue.length > 0 && iterations < MAX_ITERATIONS) {
      iterations++;
      const nodeId = queue.shift()!;
      const currentDepth = depths.get(nodeId) || 0;

      // Skip if depth is already too deep
      if (currentDepth >= MAX_DEPTH) continue;

      const outgoingEdges = edges.filter(e => e.callerId === nodeId);
      for (const edge of outgoingEdges) {
        const targetDepth = currentDepth + 1;
        const existingDepth = depths.get(edge.calleeId);

        if (targetDepth <= MAX_DEPTH && (!existingDepth || targetDepth > existingDepth)) {
          depths.set(edge.calleeId, targetDepth);
          queue.push(edge.calleeId);
          maxDepth = Math.max(maxDepth, targetDepth);
        }
      }
    }

    console.log(`[CallPatternAnalyzer] Calculated call depth: ${maxDepth} (${iterations} iterations)`);
    return Math.min(maxDepth, MAX_DEPTH);
  }

  private analyzeCallChains(
    nodes: Map<string, CallGraphNode>,
    edges: CallPattern[],
    entryPoints: string[]
  ): CallChain[] {
    const chains: CallChain[] = [];
    const MAX_CHAINS = 50; // Limit number of chains to prevent hanging
    let chainId = 0;

    console.log(`[CallPatternAnalyzer] Analyzing call chains from ${entryPoints.length} entry points`);

    // Analyze chains starting from each entry point (limit to prevent hanging)
    for (const entryPoint of entryPoints.slice(0, 10)) {
      if (chains.length >= MAX_CHAINS) break;

      this.findCallChainsFromNode(
        entryPoint,
        nodes,
        edges,
        [],
        new Set<string>(),
        chains,
        chainId,
        5 // Reduced max depth for performance
      );
    }

    console.log(`[CallPatternAnalyzer] Generated ${chains.length} call chains`);
    return chains;
  }

  private findCallChainsFromNode(
    nodeId: string,
    nodes: Map<string, CallGraphNode>,
    edges: CallPattern[],
    currentChain: string[],
    visited: Set<string>,
    chains: CallChain[],
    chainId: number,
    maxDepth: number = 5
  ): void {
    // Enhanced safety checks to prevent hanging
    if (currentChain.length >= maxDepth || chains.length >= 50 || visited.has(nodeId)) {
      return;
    }

    // Use array push/pop instead of creating new arrays
    currentChain.push(nodeId);
    visited.add(nodeId);

    const outgoingEdges = edges.filter(e => e.callerId === nodeId).slice(0, 5); // Limit edges

    if (outgoingEdges.length === 0) {
      // End of chain - create CallChain object if chain is significant
      if (currentChain.length >= 2) {
        const chain: CallChain = {
          id: `chain_${chainId++}`,
          sequence: [...currentChain], // Copy only when storing final result
          depth: currentChain.length - 1,
          performance: this.calculateChainPerformance(currentChain, nodes, edges),
          crossFileCount: this.countCrossFileCallsInChain(currentChain, nodes, edges),
          hasAsyncCalls: this.hasAsyncCallsInChain(currentChain, edges),
          hasConditionalCalls: this.hasConditionalCallsInChain(currentChain, edges)
        };
        chains.push(chain);
      }
    } else {
      // Continue exploring each outgoing call
      for (const edge of outgoingEdges) {
        if (!currentChain.includes(edge.calleeId)) { // Avoid immediate cycles
          this.findCallChainsFromNode(
            edge.calleeId,
            nodes,
            edges,
            currentChain,
            visited,
            chains,
            chainId,
            maxDepth
          );
        }
      }
    }

    // Clean up for backtracking
    currentChain.pop();
    visited.delete(nodeId);
  }

  private calculateChainPerformance(
    chain: string[],
    nodes: Map<string, CallGraphNode>,
    edges: CallPattern[]
  ): CallChain['performance'] {
    let complexityScore = 0;
    let estimatedLatency = 0;

    // Calculate based on function complexities and call patterns
    for (let i = 0; i < chain.length; i++) {
      const node = nodes.get(chain[i]);
      if (node) {
        complexityScore += node.complexity;
        // Base latency estimate: 1ms per complexity point
        estimatedLatency += node.complexity * 1;
      }

      // Add latency for call overhead between functions
      if (i < chain.length - 1) {
        const edge = edges.find(e =>
          e.callerId === chain[i] && e.calleeId === chain[i + 1]
        );
        if (edge) {
          // Async calls add more latency
          if (edge.context.isAsyncContext) {
            estimatedLatency += 10; // 10ms for async overhead
          } else {
            estimatedLatency += 0.1; // 0.1ms for sync call overhead
          }

          // Conditional calls are less predictable
          if (edge.context.isConditional) {
            complexityScore += 2;
          }
        }
      }
    }

    // Determine risk level based on complexity and depth
    let riskLevel: 'low' | 'medium' | 'high';
    if (complexityScore > 20 || chain.length > 5) {
      riskLevel = 'high';
    } else if (complexityScore > 10 || chain.length > 3) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return {
      estimatedLatency: Math.round(estimatedLatency * 10) / 10,
      complexityScore,
      riskLevel
    };
  }

  private countCrossFileCallsInChain(
    chain: string[],
    nodes: Map<string, CallGraphNode>,
    edges: CallPattern[]
  ): number {
    let crossFileCount = 0;

    for (let i = 0; i < chain.length - 1; i++) {
      const callerNode = nodes.get(chain[i]);
      const calleeNode = nodes.get(chain[i + 1]);

      if (callerNode && calleeNode &&
          callerNode.filePath !== calleeNode.filePath) {
        crossFileCount++;
      }
    }

    return crossFileCount;
  }

  private hasAsyncCallsInChain(chain: string[], edges: CallPattern[]): boolean {
    for (let i = 0; i < chain.length - 1; i++) {
      const edge = edges.find(e =>
        e.callerId === chain[i] && e.calleeId === chain[i + 1]
      );
      if (edge && edge.context.isAsyncContext) {
        return true;
      }
    }
    return false;
  }

  private hasConditionalCallsInChain(chain: string[], edges: CallPattern[]): boolean {
    for (let i = 0; i < chain.length - 1; i++) {
      const edge = edges.find(e =>
        e.callerId === chain[i] && e.calleeId === chain[i + 1]
      );
      if (edge && edge.context.isConditional) {
        return true;
      }
    }
    return false;
  }

  private getCallChainsForFunction(functionId: string, callChains: CallChain[]): string[] {
    return callChains
      .filter(chain => chain.sequence.includes(functionId))
      .map(chain => chain.id);
  }

  private getMaxChainDepth(functionId: string, callChains: CallChain[]): number {
    const relevantChains = callChains.filter(chain => chain.sequence.includes(functionId));
    return relevantChains.reduce((max, chain) => Math.max(max, chain.depth), 0);
  }

  private getChainPerformanceRisk(functionId: string, callChains: CallChain[]): 'low' | 'medium' | 'high' {
    const relevantChains = callChains.filter(chain => chain.sequence.includes(functionId));

    if (relevantChains.length === 0) return 'low';

    const highRiskCount = relevantChains.filter(chain => chain.performance.riskLevel === 'high').length;
    const mediumRiskCount = relevantChains.filter(chain => chain.performance.riskLevel === 'medium').length;

    if (highRiskCount > 0) return 'high';
    if (mediumRiskCount > 0) return 'medium';
    return 'low';
  }

  // Variable Analysis Methods
  private analyzeVariables(
    sourceFile: ts.SourceFile,
    filePath: string,
    declarations: CallGraphNode[]
  ): VariableAnalysisResult {
    // Extract variable declarations
    const variableDeclarations = this.extractVariableDeclarations(sourceFile, filePath, declarations);

    // Extract variable usages
    const variableUsages = this.extractVariableUsages(sourceFile, filePath, variableDeclarations);

    // Build variable lifecycles
    const lifecycles = this.buildVariableLifecycles(variableDeclarations, variableUsages);

    // Detect cross-module dependencies
    const crossModuleDependencies = this.detectCrossModuleDependencies(variableDeclarations, variableUsages, filePath);

    // Identify unused variables
    const unusedVariables = variableDeclarations.filter(decl =>
      !variableUsages.some(usage => usage.variableId === decl.id)
    );

    // Identify global variables
    const globalVariables = variableDeclarations.filter(decl => decl.scope === 'global' || decl.scope === 'module');

    // Build import/export mapping
    const importExportMapping = this.buildImportExportMapping(variableDeclarations);

    return {
      declarations: variableDeclarations,
      usages: variableUsages,
      lifecycles,
      crossModuleDependencies,
      unusedVariables,
      globalVariables,
      importExportMapping
    };
  }

  private extractVariableDeclarations(
    sourceFile: ts.SourceFile,
    filePath: string,
    declarations: CallGraphNode[]
  ): VariableDeclaration[] {
    const variables: VariableDeclaration[] = [];
    let variableId = 0;
    const MAX_DEPTH = 25;
    const MAX_VARIABLES = 500; // Limit total variables to prevent memory issues

    // Create scope stack for tracking nested scopes
    const scopeStack: { id: string; type: string }[] = [{ id: `${filePath}:global`, type: 'global' }];

    const visit = (node: ts.Node, depth: number = 0, currentScope?: string): void => {
      if (depth > MAX_DEPTH) {
        console.warn(`Max recursion depth ${MAX_DEPTH} reached in variable analysis for ${filePath}`);
        return;
      }

      if (variables.length > MAX_VARIABLES) {
        console.warn(`Max variables ${MAX_VARIABLES} reached in variable analysis for ${filePath}`);
        return;
      }

      const scope = currentScope || scopeStack[scopeStack.length - 1]?.id || `${filePath}:global`;

      // Handle different types of variable declarations
      if (ts.isVariableDeclaration(node)) {
        const variable = this.processVariableDeclaration(node, filePath, scope, sourceFile, variableId++);
        if (variable) variables.push(variable);
      }

      // Handle function parameters
      if (ts.isParameter(node)) {
        const variable = this.processParameterDeclaration(node, filePath, scope, sourceFile, variableId++);
        if (variable) variables.push(variable);
      }

      // Handle import declarations
      if (ts.isImportDeclaration(node)) {
        const importVars = this.processImportDeclaration(node, filePath, scope, sourceFile, variableId);
        variables.push(...importVars);
        variableId += importVars.length;
      }

      // Handle export declarations
      if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
        const exportVars = this.processExportDeclaration(node, filePath, scope, sourceFile, variableId);
        variables.push(...exportVars);
        variableId += exportVars.length;
      }

      // Update scope for nested structures
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) {
        const functionName = this.getFunctionName(node as any) || 'anonymous';
        const functionScope = `${filePath}:${functionName}:${this.getLineNumber(node, sourceFile)}`;
        scopeStack.push({ id: functionScope, type: 'function' });
        this.scopeRegistry.set(functionScope, filePath);
      } else if (ts.isClassDeclaration(node)) {
        const className = node.name?.text || 'anonymous';
        const classScope = `${filePath}:${className}:${this.getLineNumber(node, sourceFile)}`;
        scopeStack.push({ id: classScope, type: 'class' });
        this.scopeRegistry.set(classScope, filePath);
      } else if (ts.isBlock(node)) {
        const blockScope = `${filePath}:block:${this.getLineNumber(node, sourceFile)}`;
        scopeStack.push({ id: blockScope, type: 'block' });
        this.scopeRegistry.set(blockScope, filePath);
      }

      ts.forEachChild(node, (child) => visit(child, depth + 1, scopeStack[scopeStack.length - 1]?.id));

      // Pop scope when exiting
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) ||
          ts.isArrowFunction(node) || ts.isClassDeclaration(node) || ts.isBlock(node)) {
        scopeStack.pop();
      }
    };

    visit(sourceFile, 0);
    return variables;
  }

  private processVariableDeclaration(
    node: ts.VariableDeclaration,
    filePath: string,
    scope: string,
    sourceFile: ts.SourceFile,
    id: number
  ): VariableDeclaration | null {
    if (!ts.isIdentifier(node.name)) {
      return null; // Skip destructuring for now
    }

    const name = node.name.text;
    const lineNumber = this.getLineNumber(node, sourceFile);

    // Determine variable type
    let variableType: VariableDeclaration['type'] = 'let';
    if (node.parent && ts.isVariableDeclarationList(node.parent)) {
      if (node.parent.flags & ts.NodeFlags.Const) {
        variableType = 'const';
      } else if (node.parent.flags & ts.NodeFlags.Let) {
        variableType = 'let';
      } else {
        variableType = 'var';
      }
    }

    // Determine scope type
    let scopeType: VariableDeclaration['scope'] = 'function';
    if (scope.includes(':global')) scopeType = 'global';
    else if (scope.includes(':block')) scopeType = 'block';
    else if (scope.includes(':class')) scopeType = 'class';
    else if (scope.includes(':') && !scope.includes(':function')) scopeType = 'module';

    // Get data type if available
    const dataType = node.type ? node.type.getText(sourceFile) : undefined;

    // Get initial value if it's a simple literal
    const initialValue = node.initializer ? this.getSimpleInitialValue(node.initializer) : undefined;

    // Check if exported (simplified check)
    const isExported = this.isNodeExported(node);

    return {
      id: `${filePath}:var:${name}:${id}`,
      name,
      type: variableType,
      dataType,
      filePath,
      lineNumber,
      scope: scopeType,
      scopeId: scope,
      isExported,
      isImported: false,
      initialValue,
      confidence: 0.9
    };
  }

  private processParameterDeclaration(
    node: ts.ParameterDeclaration,
    filePath: string,
    scope: string,
    sourceFile: ts.SourceFile,
    id: number
  ): VariableDeclaration | null {
    if (!ts.isIdentifier(node.name)) {
      return null; // Skip destructuring parameters
    }

    const name = node.name.text;
    const lineNumber = this.getLineNumber(node, sourceFile);
    const dataType = node.type ? node.type.getText(sourceFile) : undefined;
    const initialValue = node.initializer ? this.getSimpleInitialValue(node.initializer) : undefined;

    return {
      id: `${filePath}:param:${name}:${id}`,
      name,
      type: 'parameter',
      dataType,
      filePath,
      lineNumber,
      scope: 'function',
      scopeId: scope,
      isExported: false,
      isImported: false,
      initialValue,
      confidence: 0.95
    };
  }

  private processImportDeclaration(
    node: ts.ImportDeclaration,
    filePath: string,
    scope: string,
    sourceFile: ts.SourceFile,
    startId: number
  ): VariableDeclaration[] {
    const variables: VariableDeclaration[] = [];
    let id = startId;

    if (!node.importClause || !node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) {
      return variables;
    }

    const importSource = node.moduleSpecifier.text;
    const lineNumber = this.getLineNumber(node, sourceFile);

    // Handle named imports
    if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
      for (const element of node.importClause.namedBindings.elements) {
        variables.push({
          id: `${filePath}:import:${element.name.text}:${id++}`,
          name: element.name.text,
          type: 'import',
          filePath,
          lineNumber,
          scope: 'module',
          scopeId: scope,
          isExported: false,
          isImported: true,
          importSource,
          confidence: 0.95
        });
      }
    }

    // Handle default imports
    if (node.importClause.name) {
      variables.push({
        id: `${filePath}:import:${node.importClause.name.text}:${id++}`,
        name: node.importClause.name.text,
        type: 'import',
        filePath,
        lineNumber,
        scope: 'module',
        scopeId: scope,
        isExported: false,
        isImported: true,
        importSource,
        confidence: 0.95
      });
    }

    return variables;
  }

  private processExportDeclaration(
    node: ts.ExportDeclaration | ts.ExportAssignment,
    filePath: string,
    scope: string,
    sourceFile: ts.SourceFile,
    startId: number
  ): VariableDeclaration[] {
    const variables: VariableDeclaration[] = [];
    const lineNumber = this.getLineNumber(node, sourceFile);

    // Handle export declarations - simplified for now
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      let id = startId;
      for (const element of node.exportClause.elements) {
        variables.push({
          id: `${filePath}:export:${element.name.text}:${id++}`,
          name: element.name.text,
          type: 'var', // Could be let/const, but we'll use var for exports
          filePath,
          lineNumber,
          scope: 'module',
          scopeId: scope,
          isExported: true,
          isImported: false,
          confidence: 0.9
        });
      }
    }

    return variables;
  }

  private extractVariableUsages(
    sourceFile: ts.SourceFile,
    filePath: string,
    declarations: VariableDeclaration[]
  ): VariableUsage[] {
    const usages: VariableUsage[] = [];
    const declMap = new Map(declarations.map(d => [d.name, d]));
    let usageId = 0;
    const MAX_DEPTH = 25;
    const MAX_USAGES = 1000; // Limit total usages to prevent memory issues

    const visit = (node: ts.Node, depth: number = 0, currentFunction?: string): void => {
      if (depth > MAX_DEPTH) {
        console.warn(`Max recursion depth ${MAX_DEPTH} reached in variable usage analysis for ${filePath}`);
        return;
      }

      if (usages.length > MAX_USAGES) {
        console.warn(`Max usages ${MAX_USAGES} reached in variable usage analysis for ${filePath}`);
        return;
      }

      // Track current function context
      let functionContext = currentFunction;
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) {
        const funcName = this.getFunctionName(node as any) || 'anonymous';
        functionContext = `${filePath}:${funcName}:${this.getLineNumber(node, sourceFile)}`;
      }

      // Check for variable usages
      if (ts.isIdentifier(node)) {
        const variableName = node.text;
        const declaration = declMap.get(variableName);

        if (declaration) {
          const usage = this.createVariableUsage(
            node,
            declaration,
            filePath,
            sourceFile,
            functionContext,
            usageId++
          );
          if (usage) usages.push(usage);
        }
      }

      ts.forEachChild(node, (child) => visit(child, depth + 1, functionContext));
    };

    visit(sourceFile, 0);
    return usages;
  }

  private createVariableUsage(
    node: ts.Identifier,
    declaration: VariableDeclaration,
    filePath: string,
    sourceFile: ts.SourceFile,
    functionContext: string | undefined,
    id: number
  ): VariableUsage | null {
    const lineNumber = this.getLineNumber(node, sourceFile);
    const usageType = this.determineUsageType(node);
    const context = this.analyzeVariableUsageContext(node);

    return {
      id: `${filePath}:usage:${declaration.name}:${id}`,
      variableId: declaration.id,
      variableName: declaration.name,
      usageType,
      filePath,
      lineNumber,
      functionContext,
      confidence: 0.8,
      context
    };
  }

  private determineUsageType(node: ts.Identifier): VariableUsage['usageType'] {
    const parent = node.parent;

    if (!parent) return 'read';

    // Assignment expressions
    if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      if (parent.left === node) return 'assignment';
    }

    // Property access
    if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
      return 'property_access';
    }

    // Function calls
    if (ts.isCallExpression(parent) && parent.expression === node) {
      return 'call';
    }

    // Parameter passing
    if (ts.isCallExpression(parent) && parent.arguments.includes(node as any)) {
      return 'parameter_passing';
    }

    // Postfix/prefix operators
    if (ts.isPostfixUnaryExpression(parent) || ts.isPrefixUnaryExpression(parent)) {
      if (parent.operand === node) return 'write';
    }

    return 'read';
  }

  private analyzeVariableUsageContext(node: ts.Identifier): VariableUsage['context'] {
    let isConditional = false;
    let isLoop = false;
    let isAsyncContext = false;
    let isTryCatch = false;
    let accessPattern = '';

    let current: ts.Node | undefined = node.parent;
    while (current) {
      if (ts.isIfStatement(current) || ts.isConditionalExpression(current)) {
        isConditional = true;
      }
      if (ts.isWhileStatement(current) || ts.isForStatement(current) ||
          ts.isForInStatement(current) || ts.isForOfStatement(current)) {
        isLoop = true;
      }
      if (ts.isTryStatement(current)) {
        isTryCatch = true;
      }
      current = current.parent;
    }

    // Detect access patterns
    if (ts.isPropertyAccessExpression(node.parent)) {
      accessPattern = `${node.text}.${node.parent.name.text}`;
    } else if (ts.isElementAccessExpression(node.parent) && node.parent.expression === node) {
      accessPattern = `${node.text}[...]`;
    }

    isAsyncContext = this.isInAsyncContext(node);

    return {
      isConditional,
      isLoop,
      isAsyncContext,
      isTryCatch,
      accessPattern: accessPattern || undefined
    };
  }

  private buildVariableLifecycles(
    declarations: VariableDeclaration[],
    usages: VariableUsage[]
  ): VariableLifecycle[] {
    const lifecycles: VariableLifecycle[] = [];

    for (const declaration of declarations) {
      const variableUsages = usages.filter(u => u.variableId === declaration.id);

      const readUsages = variableUsages.filter(u => u.usageType === 'read' || u.usageType === 'property_access' || u.usageType === 'call');
      const writeUsages = variableUsages.filter(u => u.usageType === 'write' || u.usageType === 'assignment');
      const crossFileUsages = variableUsages.filter(u => u.filePath !== declaration.filePath);

      const firstUsage = variableUsages.length > 0 ?
        variableUsages.reduce((earliest, usage) =>
          usage.lineNumber < earliest.lineNumber ? usage : earliest
        ) : undefined;

      const lastUsage = variableUsages.length > 0 ?
        variableUsages.reduce((latest, usage) =>
          usage.lineNumber > latest.lineNumber ? usage : latest
        ) : undefined;

      lifecycles.push({
        variableId: declaration.id,
        variableName: declaration.name,
        declaration,
        usages: variableUsages,
        isUnused: variableUsages.length === 0,
        firstUsage,
        lastUsage,
        readCount: readUsages.length,
        writeCount: writeUsages.length,
        crossFileUsageCount: crossFileUsages.length,
        lifespan: {
          declarationLine: declaration.lineNumber,
          firstUsageLine: firstUsage?.lineNumber,
          lastUsageLine: lastUsage?.lineNumber,
          scopeEnd: undefined // Could be enhanced to detect scope end
        }
      });
    }

    return lifecycles;
  }

  private detectCrossModuleDependencies(
    declarations: VariableDeclaration[],
    usages: VariableUsage[],
    filePath: string
  ): CrossModuleVariableDependency[] {
    const dependencies: CrossModuleVariableDependency[] = [];
    let depId = 0;

    // Find imports that create dependencies
    const imports = declarations.filter(d => d.isImported);
    for (const importDecl of imports) {
      const importUsages = usages.filter(u => u.variableId === importDecl.id);

      if (importUsages.length > 0 && importDecl.importSource) {
        dependencies.push({
          id: `${filePath}:dep:${depId++}`,
          sourceVariable: importDecl,
          targetVariable: importDecl, // Self-reference for imports
          dependencyType: 'import',
          sourceFile: filePath,
          targetFile: importDecl.importSource,
          confidence: 0.9,
          usagePattern: importUsages.map(u => u.usageType).join(',')
        });
      }
    }

    return dependencies;
  }

  private buildImportExportMapping(declarations: VariableDeclaration[]): Map<string, string[]> {
    const mapping = new Map<string, string[]>();

    const imports = declarations.filter(d => d.isImported).map(d => d.name);
    const exports = declarations.filter(d => d.isExported).map(d => d.name);

    if (imports.length > 0) {
      mapping.set('imports', imports);
    }
    if (exports.length > 0) {
      mapping.set('exports', exports);
    }

    return mapping;
  }

  // Utility methods for variable analysis
  private getSimpleInitialValue(node: ts.Expression): string | undefined {
    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
      return node.text;
    }
    if (node.kind === ts.SyntaxKind.TrueKeyword) return 'true';
    if (node.kind === ts.SyntaxKind.FalseKeyword) return 'false';
    if (node.kind === ts.SyntaxKind.NullKeyword) return 'null';
    if (node.kind === ts.SyntaxKind.UndefinedKeyword) return 'undefined';
    return undefined;
  }

  private isNodeExported(node: ts.VariableDeclaration): boolean {
    let current: ts.Node | undefined = node.parent;
    while (current) {
      // Check if current node has modifiers and one is export
      if (ts.canHaveModifiers(current)) {
        const modifiers = ts.getModifiers(current);
        if (modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
          return true;
        }
      }
      if (ts.isExportDeclaration(current) || ts.isExportAssignment(current)) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  private createEmptyVariableAnalysis(): VariableAnalysisResult {
    return {
      declarations: [],
      usages: [],
      lifecycles: [],
      crossModuleDependencies: [],
      unusedVariables: [],
      globalVariables: [],
      importExportMapping: new Map()
    };
  }

  private createEmptyCallGraph(): FunctionCallGraph {
    return {
      nodes: new Map(),
      edges: [],
      entryPoints: [],
      cycles: [],
      depth: 0,
      callChains: []
    };
  }

  // Cross-file analysis methods
  async performCrossFileAnalysis(): Promise<{
    crossFileCallPatterns: CallPattern[];
    globalCallGraph: FunctionCallGraph;
  }> {
    const allPatterns: CallPattern[] = [];
    const allNodes = new Map<string, CallGraphNode>();

    // Combine all patterns from analyzed files
    for (const [filePath, patterns] of this.callPatterns) {
      allPatterns.push(...patterns);
    }

    for (const [nodeId, node] of this.functionRegistry) {
      allNodes.set(nodeId, node);
    }

    // Build global call graph
    const globalCallGraph = this.buildCallGraph(Array.from(allNodes.values()), allPatterns);

    // Find cross-file call patterns
    const crossFileCallPatterns = allPatterns.filter(pattern => {
      const callerFile = pattern.sourceFile;
      const calleeFile = pattern.targetFile;
      return calleeFile && callerFile !== calleeFile;
    });

    return { crossFileCallPatterns, globalCallGraph };
  }

  getCodeStyleStatistics(): {
    namingConventions: Record<string, number>;
    averageParameterCount: number;
    typeAnnotationUsage: number;
    defaultParameterUsage: number;
    arrowFunctionUsage: number;
    jsDocUsage: number;
    averageFunctionLength: number;
    indentationStyles: Record<string, number>;
    braceStyles: Record<string, number>;
  } {
    const allNodes = Array.from(this.functionRegistry.values());
    const nodesWithStyle = allNodes.filter(node => node.codeStyle);

    if (nodesWithStyle.length === 0) {
      return {
        namingConventions: {},
        averageParameterCount: 0,
        typeAnnotationUsage: 0,
        defaultParameterUsage: 0,
        arrowFunctionUsage: 0,
        jsDocUsage: 0,
        averageFunctionLength: 0,
        indentationStyles: {},
        braceStyles: {}
      };
    }

    const namingConventions: Record<string, number> = {};
    const indentationStyles: Record<string, number> = {};
    const braceStyles: Record<string, number> = {};

    let totalParams = 0;
    let withTypeAnnotations = 0;
    let withDefaultParams = 0;
    let arrowFunctions = 0;
    let withJSDoc = 0;
    let totalLength = 0;

    for (const node of nodesWithStyle) {
      const style = node.codeStyle!;

      // Count naming conventions
      namingConventions[style.namingConvention] = (namingConventions[style.namingConvention] || 0) + 1;

      // Count indentation styles
      indentationStyles[style.indentationStyle] = (indentationStyles[style.indentationStyle] || 0) + 1;

      // Count brace styles
      braceStyles[style.braceStyle] = (braceStyles[style.braceStyle] || 0) + 1;

      totalParams += style.parameterCount;
      if (style.hasTypeAnnotations) withTypeAnnotations++;
      if (style.hasDefaultParameters) withDefaultParams++;
      if (style.usesArrowFunction) arrowFunctions++;
      if (style.hasJSDoc) withJSDoc++;
      totalLength += style.functionLength;
    }

    return {
      namingConventions,
      averageParameterCount: totalParams / nodesWithStyle.length,
      typeAnnotationUsage: (withTypeAnnotations / nodesWithStyle.length) * 100,
      defaultParameterUsage: (withDefaultParams / nodesWithStyle.length) * 100,
      arrowFunctionUsage: (arrowFunctions / nodesWithStyle.length) * 100,
      jsDocUsage: (withJSDoc / nodesWithStyle.length) * 100,
      averageFunctionLength: totalLength / nodesWithStyle.length,
      indentationStyles,
      braceStyles
    };
  }

  getCallPatternStatistics(): {
    totalCallPatterns: number;
    directCalls: number;
    methodCalls: number;
    constructorCalls: number;
    asyncCalls: number;
    recursiveFunctions: number;
    averageComplexity: number;
    maxCallDepth: number;
  } {
    const allPatterns = Array.from(this.callPatterns.values()).flat();
    const allNodes = Array.from(this.functionRegistry.values());

    return {
      totalCallPatterns: allPatterns.length,
      directCalls: allPatterns.filter(p => p.callType === 'direct_call').length,
      methodCalls: allPatterns.filter(p => p.callType === 'method_call').length,
      constructorCalls: allPatterns.filter(p => p.callType === 'constructor_call').length,
      asyncCalls: allPatterns.filter(p => p.callType === 'async_call').length,
      recursiveFunctions: allNodes.filter(n => n.isRecursive).length,
      averageComplexity: allNodes.length > 0 ?
        allNodes.reduce((sum, n) => sum + n.complexity, 0) / allNodes.length : 0,
      maxCallDepth: Math.max(...Array.from(this.callPatterns.keys()).map(filePath => {
        const patterns = this.callPatterns.get(filePath) || [];
        const nodes = Array.from(this.functionRegistry.values()).filter(n => n.filePath === filePath);
        return this.buildCallGraph(nodes, patterns).depth;
      }), 0)
    };
  }

  getCallChainStatistics(): {
    totalChains: number;
    averageChainDepth: number;
    maxChainDepth: number;
    chainComplexityDistribution: Record<string, number>;
    crossFileChainPercentage: number;
    asyncChainPercentage: number;
    riskDistribution: Record<string, number>;
    topRiskyChains: { id: string; risk: string; complexity: number; depth: number }[];
  } {
    const allChains: CallChain[] = [];

    // Collect all call chains from analyzed files by rebuilding call graphs
    for (const [filePath, patterns] of this.callPatterns) {
      const nodes = Array.from(this.functionRegistry.values()).filter(n => n.filePath === filePath);
      const callGraph = this.buildCallGraph(nodes, patterns);
      allChains.push(...callGraph.callChains);
    }

    if (allChains.length === 0) {
      return {
        totalChains: 0,
        averageChainDepth: 0,
        maxChainDepth: 0,
        chainComplexityDistribution: { low: 0, medium: 0, high: 0 },
        crossFileChainPercentage: 0,
        asyncChainPercentage: 0,
        riskDistribution: { low: 0, medium: 0, high: 0 },
        topRiskyChains: []
      };
    }

    return {
      totalChains: allChains.length,
      averageChainDepth: allChains.reduce((sum, chain) => sum + chain.depth, 0) / allChains.length,
      maxChainDepth: allChains.reduce((max, chain) => Math.max(max, chain.depth), 0),
      chainComplexityDistribution: {
        low: allChains.filter(c => c.performance.complexityScore < 5).length,
        medium: allChains.filter(c => c.performance.complexityScore >= 5 && c.performance.complexityScore < 15).length,
        high: allChains.filter(c => c.performance.complexityScore >= 15).length
      },
      crossFileChainPercentage: (allChains.filter(c => c.crossFileCount > 0).length / allChains.length) * 100,
      asyncChainPercentage: (allChains.filter(c => c.hasAsyncCalls).length / allChains.length) * 100,
      riskDistribution: {
        low: allChains.filter(c => c.performance.riskLevel === 'low').length,
        medium: allChains.filter(c => c.performance.riskLevel === 'medium').length,
        high: allChains.filter(c => c.performance.riskLevel === 'high').length
      },
      topRiskyChains: allChains
        .filter(c => c.performance.riskLevel === 'high')
        .sort((a, b) => b.performance.complexityScore - a.performance.complexityScore)
        .slice(0, 5)
        .map(c => ({
          id: c.id,
          risk: c.performance.riskLevel,
          complexity: c.performance.complexityScore,
          depth: c.depth
        }))
    };
  }

  // Variable Analysis Methods

  async performCrossFileVariableAnalysis(): Promise<{
    globalVariableUsages: VariableUsage[];
    crossModuleDependencies: CrossModuleVariableDependency[];
    unusedVariablesAcrossFiles: VariableDeclaration[];
    globalVariableLifecycles: VariableLifecycle[];
  }> {
    const allDeclarations: VariableDeclaration[] = [];
    const allUsages: VariableUsage[] = [];
    const allLifecycles: VariableLifecycle[] = [];
    const allCrossModuleDeps: CrossModuleVariableDependency[] = [];

    // Combine all variable data from analyzed files
    for (const [filePath, declarations] of this.variableDeclarations) {
      allDeclarations.push(...declarations);
    }

    for (const [filePath, usages] of this.variableUsages) {
      allUsages.push(...usages);
    }

    for (const [filePath, lifecycles] of this.variableLifecycles) {
      allLifecycles.push(...lifecycles);
    }

    for (const [filePath, dependencies] of this.crossModuleDependencies) {
      allCrossModuleDeps.push(...dependencies);
    }

    // Find global variables used across multiple files
    const globalVariableUsages = allUsages.filter(usage => {
      const declaration = allDeclarations.find(d => d.id === usage.variableId);
      return declaration && (declaration.scope === 'global' || declaration.scope === 'module') &&
             usage.filePath !== declaration.filePath;
    });

    // Find truly unused variables (not used in any file)
    const unusedVariablesAcrossFiles = allDeclarations.filter(declaration => {
      return !allUsages.some(usage => usage.variableId === declaration.id);
    });

    // Get lifecycles for global variables
    const globalVariableLifecycles = allLifecycles.filter(lifecycle => {
      return lifecycle.declaration.scope === 'global' || lifecycle.declaration.scope === 'module';
    });

    return {
      globalVariableUsages,
      crossModuleDependencies: allCrossModuleDeps,
      unusedVariablesAcrossFiles,
      globalVariableLifecycles
    };
  }

  getVariableAnalysisStatistics(): {
    totalVariables: number;
    variablesByType: Record<string, number>;
    variablesByScope: Record<string, number>;
    unusedVariableCount: number;
    globalVariableCount: number;
    importedVariableCount: number;
    exportedVariableCount: number;
    averageUsageCount: number;
    crossFileVariableCount: number;
    variableLifespanDistribution: {
      short: number; // 1-5 lines
      medium: number; // 6-20 lines
      long: number; // 21+ lines
    };
    mostUsedVariables: { name: string; usageCount: number; filePath: string }[];
    unusedVariables: { name: string; type: string; filePath: string; lineNumber: number }[];
  } {
    const allDeclarations = Array.from(this.variableDeclarations.values()).flat();
    const allUsages = Array.from(this.variableUsages.values()).flat();
    const allLifecycles = Array.from(this.variableLifecycles.values()).flat();

    if (allDeclarations.length === 0) {
      return {
        totalVariables: 0,
        variablesByType: {},
        variablesByScope: {},
        unusedVariableCount: 0,
        globalVariableCount: 0,
        importedVariableCount: 0,
        exportedVariableCount: 0,
        averageUsageCount: 0,
        crossFileVariableCount: 0,
        variableLifespanDistribution: { short: 0, medium: 0, long: 0 },
        mostUsedVariables: [],
        unusedVariables: []
      };
    }

    // Count variables by type
    const variablesByType: Record<string, number> = {};
    const variablesByScope: Record<string, number> = {};

    for (const declaration of allDeclarations) {
      variablesByType[declaration.type] = (variablesByType[declaration.type] || 0) + 1;
      variablesByScope[declaration.scope] = (variablesByScope[declaration.scope] || 0) + 1;
    }

    // Calculate usage statistics
    const usageCounts = allDeclarations.map(decl => {
      const usageCount = allUsages.filter(usage => usage.variableId === decl.id).length;
      return { declaration: decl, usageCount };
    });

    const totalUsages = usageCounts.reduce((sum, item) => sum + item.usageCount, 0);
    const averageUsageCount = allDeclarations.length > 0 ? totalUsages / allDeclarations.length : 0;

    // Find most used variables
    const mostUsedVariables = usageCounts
      .filter(item => item.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(item => ({
        name: item.declaration.name,
        usageCount: item.usageCount,
        filePath: item.declaration.filePath
      }));

    // Find unused variables
    const unusedVariables = usageCounts
      .filter(item => item.usageCount === 0)
      .map(item => ({
        name: item.declaration.name,
        type: item.declaration.type,
        filePath: item.declaration.filePath,
        lineNumber: item.declaration.lineNumber
      }));

    // Calculate lifespan distribution
    const lifespanDistribution = { short: 0, medium: 0, long: 0 };
    for (const lifecycle of allLifecycles) {
      if (lifecycle.firstUsage && lifecycle.lastUsage) {
        const lifespan = lifecycle.lastUsage.lineNumber - lifecycle.declaration.lineNumber;
        if (lifespan <= 5) lifespanDistribution.short++;
        else if (lifespan <= 20) lifespanDistribution.medium++;
        else lifespanDistribution.long++;
      }
    }

    // Count cross-file variables
    const crossFileVariableCount = allLifecycles.filter(l => l.crossFileUsageCount > 0).length;

    return {
      totalVariables: allDeclarations.length,
      variablesByType,
      variablesByScope,
      unusedVariableCount: unusedVariables.length,
      globalVariableCount: allDeclarations.filter(d => d.scope === 'global' || d.scope === 'module').length,
      importedVariableCount: allDeclarations.filter(d => d.isImported).length,
      exportedVariableCount: allDeclarations.filter(d => d.isExported).length,
      averageUsageCount,
      crossFileVariableCount,
      variableLifespanDistribution: lifespanDistribution,
      mostUsedVariables,
      unusedVariables
    };
  }

  getVariableUsagePatterns(): {
    readWriteRatio: number;
    conditionalUsagePercentage: number;
    loopUsagePercentage: number;
    asyncUsagePercentage: number;
    propertyAccessPercentage: number;
    functionCallPercentage: number;
    commonAccessPatterns: { pattern: string; count: number }[];
    usageByScope: Record<string, number>;
  } {
    const allUsages = Array.from(this.variableUsages.values()).flat();

    if (allUsages.length === 0) {
      return {
        readWriteRatio: 0,
        conditionalUsagePercentage: 0,
        loopUsagePercentage: 0,
        asyncUsagePercentage: 0,
        propertyAccessPercentage: 0,
        functionCallPercentage: 0,
        commonAccessPatterns: [],
        usageByScope: {}
      };
    }

    const readUsages = allUsages.filter(u => u.usageType === 'read').length;
    const writeUsages = allUsages.filter(u => u.usageType === 'write' || u.usageType === 'assignment').length;
    const conditionalUsages = allUsages.filter(u => u.context.isConditional).length;
    const loopUsages = allUsages.filter(u => u.context.isLoop).length;
    const asyncUsages = allUsages.filter(u => u.context.isAsyncContext).length;
    const propertyAccessUsages = allUsages.filter(u => u.usageType === 'property_access').length;
    const functionCallUsages = allUsages.filter(u => u.usageType === 'call').length;

    // Count access patterns
    const accessPatternCounts = new Map<string, number>();
    for (const usage of allUsages) {
      if (usage.context.accessPattern) {
        const count = accessPatternCounts.get(usage.context.accessPattern) || 0;
        accessPatternCounts.set(usage.context.accessPattern, count + 1);
      }
    }

    const commonAccessPatterns = Array.from(accessPatternCounts.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Count usage by scope (get scope from variable declarations)
    const allDeclarations = Array.from(this.variableDeclarations.values()).flat();
    const usageByScope: Record<string, number> = {};
    for (const usage of allUsages) {
      const declaration = allDeclarations.find(d => d.id === usage.variableId);
      if (declaration) {
        usageByScope[declaration.scope] = (usageByScope[declaration.scope] || 0) + 1;
      }
    }

    return {
      readWriteRatio: writeUsages > 0 ? readUsages / writeUsages : readUsages,
      conditionalUsagePercentage: (conditionalUsages / allUsages.length) * 100,
      loopUsagePercentage: (loopUsages / allUsages.length) * 100,
      asyncUsagePercentage: (asyncUsages / allUsages.length) * 100,
      propertyAccessPercentage: (propertyAccessUsages / allUsages.length) * 100,
      functionCallPercentage: (functionCallUsages / allUsages.length) * 100,
      commonAccessPatterns,
      usageByScope
    };
  }
}