/**
 * TreeSitterAdapter - Bridge between Tree-sitter and BaseLanguageAnalyzer
 *
 * Provides integration between the universal Tree-sitter parser and our
 * existing BaseLanguageAnalyzer pattern. Enables gradual migration from
 * regex-based parsing to Tree-sitter AST analysis.
 */

import {
  TreeSitterParser,
  SupportedLanguage,
  ParseResult,
  TreeSitterNode,
  getTreeSitterParser
} from './TreeSitterParser.js';
import { TreeSitterQueries, QueryPattern } from './TreeSitterQueries.js';
import { ParseError } from '../../errors/MindMapErrors.js';
import { CodeStructure, FunctionInfo, ClassInfo } from '../base/BaseLanguageAnalyzer.js';

/**
 * Extracted code element
 */
export interface ExtractedElement {
  type: 'function' | 'class' | 'method' | 'interface' | 'struct' | 'trait' | 'namespace' | 'module';
  name: string;
  startLine: number;
  endLine: number;
  parameters?: string[];
  body?: string;
  modifiers?: string[];
  metadata?: Record<string, any>;
}

/**
 * Tree-sitter adapter for language analyzers
 */
export class TreeSitterAdapter {
  private parser: TreeSitterParser;

  constructor(parser?: TreeSitterParser) {
    this.parser = parser || getTreeSitterParser();
  }

  /**
   * Initialize the adapter
   */
  async initialize(): Promise<void> {
    await this.parser.initialize();
  }

  /**
   * Check if a file can be parsed with Tree-sitter
   */
  canParse(filePath: string): boolean {
    return this.parser.canParse(filePath);
  }

  /**
   * Parse a file and extract code structure
   */
  async parseFile(filePath: string, content: string): Promise<ParseResult> {
    if (!this.parser.isInitialized()) {
      await this.initialize();
    }

    return this.parser.parseFile(filePath, content);
  }

  /**
   * Extract functions from parsed code
   */
  async extractFunctions(
    parseResult: ParseResult,
    filePath: string
  ): Promise<FunctionInfo[]> {
    const query = TreeSitterQueries.getQuery(parseResult.language, 'FUNCTIONS');
    if (!query) {
      return [];
    }

    try {
      const matches = this.parser.query(parseResult, query.pattern);
      return matches.map(match => this.convertToFunctionInfo(match, filePath));
    } catch (error) {
      throw new ParseError(
        'Failed to extract functions',
        filePath,
        parseResult.language,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Extract classes from parsed code
   */
  async extractClasses(
    parseResult: ParseResult,
    filePath: string
  ): Promise<ClassInfo[]> {
    const query = TreeSitterQueries.getQuery(parseResult.language, 'CLASSES');
    if (!query) {
      return [];
    }

    try {
      const matches = this.parser.query(parseResult, query.pattern);
      return matches.map(match => this.convertToClassInfo(match, filePath));
    } catch (error) {
      throw new ParseError(
        'Failed to extract classes',
        filePath,
        parseResult.language,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Extract imports from parsed code
   */
  async extractImports(
    parseResult: ParseResult,
    filePath: string
  ): Promise<string[]> {
    const query = TreeSitterQueries.getQuery(parseResult.language, 'IMPORTS');
    if (!query) {
      return [];
    }

    try {
      const matches = this.parser.query(parseResult, query.pattern);
      return matches.map(match => {
        const sourceNode = match['source'] || match['module'];
        return sourceNode ? sourceNode.text.replace(/['"]/g, '') : '';
      }).filter(Boolean);
    } catch (error) {
      throw new ParseError(
        'Failed to extract imports',
        filePath,
        parseResult.language,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Extract all code elements from a file
   */
  async extractAllElements(
    parseResult: ParseResult,
    filePath: string
  ): Promise<ExtractedElement[]> {
    const elements: ExtractedElement[] = [];

    const availableQueries = TreeSitterQueries.getAvailableQueries(parseResult.language);

    for (const queryName of availableQueries) {
      const query = TreeSitterQueries.getQuery(parseResult.language, queryName);
      if (!query) continue;

      try {
        const matches = this.parser.query(parseResult, query.pattern);
        const extracted = matches.map(match =>
          this.convertToExtractedElement(match, queryName, filePath)
        );
        elements.push(...extracted);
      } catch (error) {
        // Continue with other queries if one fails
        console.warn(`Failed to execute query ${queryName}:`, error);
      }
    }

    return elements;
  }

  /**
   * Convert Tree-sitter match to FunctionInfo
   */
  private convertToFunctionInfo(match: any, filePath: string): FunctionInfo {
    const functionNode = match['function'];
    const nameNode = match['function-name'] || match['method-name'];
    const parametersNode = match['parameters'];

    const name = nameNode ? nameNode.text : 'anonymous';
    const parameters = parametersNode
      ? this.extractParameterNames(parametersNode.text)
      : [];

    return {
      name,
      startLine: functionNode.startPosition.row + 1,
      endLine: functionNode.endPosition.row + 1,
      parameters,
      filePath,
      async: false, // Can be enhanced with more specific queries
      generator: false
    };
  }

  /**
   * Convert Tree-sitter match to ClassInfo
   */
  private convertToClassInfo(match: any, filePath: string): ClassInfo {
    const classNode = match['class'] || match['struct'] || match['interface'];
    const nameNode = match['class-name'] || match['struct-name'] || match['interface-name'];

    const name = nameNode ? nameNode.text : 'anonymous';

    return {
      name,
      startLine: classNode.startPosition.row + 1,
      endLine: classNode.endPosition.row + 1,
      filePath,
      methods: [], // Methods can be extracted separately
      properties: [],
      superClass: undefined,
      implements: []
    };
  }

  /**
   * Convert Tree-sitter match to ExtractedElement
   */
  private convertToExtractedElement(
    match: any,
    queryType: string,
    filePath: string
  ): ExtractedElement {
    // Find the primary node (the one with @function, @class, etc.)
    const primaryNode = Object.values(match)[0] as any;
    const nameNode =
      match['function-name'] ||
      match['method-name'] ||
      match['class-name'] ||
      match['struct-name'] ||
      match['interface-name'] ||
      match['trait-name'] ||
      match['namespace-name'] ||
      match['module-name'];

    const name = nameNode ? nameNode.text : 'anonymous';
    const parametersNode = match['parameters'];
    const parameters = parametersNode
      ? this.extractParameterNames(parametersNode.text)
      : undefined;

    // Determine element type from query name
    let type: ExtractedElement['type'] = 'function';
    if (queryType.includes('class')) type = 'class';
    else if (queryType.includes('method')) type = 'method';
    else if (queryType.includes('interface')) type = 'interface';
    else if (queryType.includes('struct')) type = 'struct';
    else if (queryType.includes('trait')) type = 'trait';
    else if (queryType.includes('namespace')) type = 'namespace';
    else if (queryType.includes('module')) type = 'module';

    return {
      type,
      name,
      startLine: primaryNode.startPosition.row + 1,
      endLine: primaryNode.endPosition.row + 1,
      parameters,
      body: primaryNode.text,
      metadata: {
        queryType,
        filePath
      }
    };
  }

  /**
   * Extract parameter names from parameter list text
   */
  private extractParameterNames(parametersText: string): string[] {
    // Remove parentheses and split by comma
    const cleaned = parametersText.replace(/[()]/g, '').trim();
    if (!cleaned) return [];

    return cleaned
      .split(',')
      .map(param => {
        // Extract just the parameter name (handle typed parameters)
        // e.g., "name: string" -> "name", "int x" -> "x"
        const parts = param.trim().split(/[:\s]+/);
        return parts[0] || param.trim();
      })
      .filter(Boolean);
  }

  /**
   * Convert ParseResult to CodeStructure (for backward compatibility)
   */
  async toCodeStructure(
    parseResult: ParseResult,
    filePath: string
  ): Promise<CodeStructure> {
    const [functions, classes, importNames] = await Promise.all([
      this.extractFunctions(parseResult, filePath),
      this.extractClasses(parseResult, filePath),
      this.extractImports(parseResult, filePath)
    ]);

    // Convert string imports to ImportInfo
    const imports = importNames.map(module => ({
      module,
      type: 'named' as const
    }));

    return {
      filePath,
      language: parseResult.language,
      functions,
      classes,
      imports,
      exports: [], // Can be added with specific queries
      dependencies: importNames,
      complexity: this.calculateComplexity(parseResult),
      linesOfCode: this.countLinesOfCode(parseResult),
      parseTime: parseResult.parseTime
    };
  }

  /**
   * Calculate cyclomatic complexity from AST
   */
  private calculateComplexity(parseResult: ParseResult): number {
    // Simplified complexity calculation
    // Count decision points: if, while, for, case, catch, &&, ||, ?
    let complexity = 1; // Base complexity

    const countComplexity = (node: TreeSitterNode) => {
      const decisionPoints = [
        'if_statement',
        'while_statement',
        'for_statement',
        'switch_statement',
        'catch_clause',
        'conditional_expression',
        'binary_expression' // Can be refined to only count && and ||
      ];

      if (decisionPoints.includes(node.type)) {
        complexity++;
      }

      for (const child of node.children) {
        countComplexity(child);
      }
    };

    countComplexity(parseResult.rootNode);
    return complexity;
  }

  /**
   * Count lines of code (excluding comments and blank lines)
   */
  private countLinesOfCode(parseResult: ParseResult): number {
    const lines = parseResult.rootNode.text.split('\n');
    return lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
    }).length;
  }

  /**
   * Execute custom query
   */
  async executeQuery(
    parseResult: ParseResult,
    pattern: string
  ): Promise<Array<{ [key: string]: any }>> {
    return this.parser.query(parseResult, pattern);
  }

  /**
   * Get available queries for a file
   */
  getAvailableQueries(filePath: string): string[] {
    const language = this.parser.detectLanguage(filePath);
    if (!language) return [];
    return TreeSitterQueries.getAvailableQueries(language);
  }
}

/**
 * Global adapter instance
 */
let adapterInstance: TreeSitterAdapter | null = null;

/**
 * Get or create the global adapter instance
 */
export function getTreeSitterAdapter(): TreeSitterAdapter {
  if (!adapterInstance) {
    adapterInstance = new TreeSitterAdapter();
  }
  return adapterInstance;
}

/**
 * Reset the global adapter instance (for testing)
 */
export function resetTreeSitterAdapter(): void {
  adapterInstance = null;
}
