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

/**
 * Advanced Call Pattern Analyzer for tracking function calls, method invocations,
 * and code relationships within and across files
 */
export class CallPatternAnalyzer {
  private callPatterns: Map<string, CallPattern[]> = new Map();
  private functionRegistry: Map<string, CallGraphNode> = new Map();
  private crossFileReferences: Map<string, string[]> = new Map();

  constructor() {}

  async analyzeFile(filePath: string, content?: string): Promise<{
    nodes: MindMapNode[];
    edges: MindMapEdge[];
    callPatterns: CallPattern[];
    callGraph: FunctionCallGraph;
  }> {
    try {
      const fileContent = content || await readFile(filePath, 'utf-8');
      const fileName = filePath.split('/').pop() || filePath;

      // Create TypeScript AST
      const sourceFile = ts.createSourceFile(
        filePath,
        fileContent,
        ts.ScriptTarget.ES2022,
        true,
        this.getScriptKind(fileName)
      );

      // Extract function/method declarations first
      const declarations = this.extractDeclarations(sourceFile, filePath);

      // Extract call patterns
      const callPatterns = this.extractCallPatterns(sourceFile, filePath, declarations);

      // Build call graph
      const callGraph = this.buildCallGraph(declarations, callPatterns);

      // Create mind map nodes and edges
      const { nodes, edges } = this.createMindMapElements(filePath, declarations, callPatterns, callGraph);

      // Store patterns for cross-file analysis
      this.callPatterns.set(filePath, callPatterns);
      declarations.forEach(decl => this.functionRegistry.set(decl.id, decl));

      return { nodes, edges, callPatterns, callGraph };

    } catch (error) {
      console.warn(`Failed to analyze call patterns in ${filePath}:`, error);
      return { nodes: [], edges: [], callPatterns: [], callGraph: this.createEmptyCallGraph() };
    }
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
    callGraph: FunctionCallGraph
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
    // Simplified cycle detection using DFS
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart));
        }
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      // Find outgoing edges
      const outgoingEdges = edges.filter(e => e.callerId === nodeId);
      for (const edge of outgoingEdges) {
        dfs(edge.calleeId, [...path]);
      }

      recursionStack.delete(nodeId);
    };

    for (const nodeId of nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    return cycles;
  }

  private calculateCallDepth(nodes: Map<string, CallGraphNode>, edges: CallPattern[]): number {
    const depths = new Map<string, number>();

    // Initialize entry points with depth 0
    for (const node of nodes.values()) {
      if (node.incomingCalls === 0) {
        depths.set(node.id, 0);
      }
    }

    // BFS to calculate depths
    const queue = Array.from(depths.keys());
    let maxDepth = 0;

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const currentDepth = depths.get(nodeId) || 0;

      const outgoingEdges = edges.filter(e => e.callerId === nodeId);
      for (const edge of outgoingEdges) {
        const targetDepth = currentDepth + 1;
        const existingDepth = depths.get(edge.calleeId);

        if (!existingDepth || targetDepth > existingDepth) {
          depths.set(edge.calleeId, targetDepth);
          queue.push(edge.calleeId);
          maxDepth = Math.max(maxDepth, targetDepth);
        }
      }
    }

    return maxDepth;
  }

  private analyzeCallChains(
    nodes: Map<string, CallGraphNode>,
    edges: CallPattern[],
    entryPoints: string[]
  ): CallChain[] {
    const chains: CallChain[] = [];
    const visited = new Set<string>();
    let chainId = 0;

    // Analyze chains starting from each entry point
    for (const entryPoint of entryPoints) {
      this.findCallChainsFromNode(
        entryPoint,
        nodes,
        edges,
        [],
        visited,
        chains,
        chainId
      );
    }

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
    maxDepth: number = 10
  ): void {
    if (currentChain.length >= maxDepth) {
      return; // Prevent infinite recursion in cycles
    }

    const newChain = [...currentChain, nodeId];
    const outgoingEdges = edges.filter(e => e.callerId === nodeId);

    if (outgoingEdges.length === 0) {
      // End of chain - create CallChain object if chain is significant
      if (newChain.length >= 2) {
        const chain: CallChain = {
          id: `chain_${chainId++}`,
          sequence: newChain,
          depth: newChain.length - 1,
          performance: this.calculateChainPerformance(newChain, nodes, edges),
          crossFileCount: this.countCrossFileCallsInChain(newChain, nodes, edges),
          hasAsyncCalls: this.hasAsyncCallsInChain(newChain, edges),
          hasConditionalCalls: this.hasConditionalCallsInChain(newChain, edges)
        };
        chains.push(chain);
      }
      return;
    }

    // Continue exploring each outgoing call
    for (const edge of outgoingEdges) {
      if (!newChain.includes(edge.calleeId)) { // Avoid immediate cycles
        this.findCallChainsFromNode(
          edge.calleeId,
          nodes,
          edges,
          newChain,
          visited,
          chains,
          chainId,
          maxDepth
        );
      }
    }
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
}