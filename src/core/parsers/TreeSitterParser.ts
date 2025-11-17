/**
 * TreeSitterParser - Universal Tree-sitter Parser Wrapper
 *
 * Provides a unified interface for parsing multiple programming languages
 * using Tree-sitter. Supports incremental parsing for real-time updates.
 *
 * Replaces regex-based parsing with robust AST analysis for 10+ languages.
 */

import * as Parser from 'tree-sitter';
import { ParseError } from '../../errors/MindMapErrors.js';

/**
 * Supported programming languages
 */
export enum SupportedLanguage {
  TYPESCRIPT = 'typescript',
  JAVASCRIPT = 'javascript',
  PYTHON = 'python',
  JAVA = 'java',
  GO = 'go',
  RUST = 'rust',
  CPP = 'cpp',
  CSHARP = 'csharp',
  PHP = 'php',
  RUBY = 'ruby'
}

/**
 * Normalized AST node structure
 */
export interface TreeSitterNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  startIndex: number;
  endIndex: number;
  children: TreeSitterNode[];
  isNamed: boolean;
  fieldName?: string;
}

/**
 * Parse result with metadata
 */
export interface ParseResult {
  tree: Parser.Tree;
  rootNode: TreeSitterNode;
  language: SupportedLanguage;
  parseTime: number;
  hasErrors: boolean;
  errorNodes: TreeSitterNode[];
}

/**
 * Language configuration
 */
interface LanguageConfig {
  language: SupportedLanguage;
  extensions: string[];
  parser: Parser.Language;
}

/**
 * Universal Tree-sitter parser wrapper
 */
export class TreeSitterParser {
  private parsers: Map<SupportedLanguage, Parser> = new Map();
  private languageConfigs: Map<SupportedLanguage, LanguageConfig> = new Map();
  private extensionMap: Map<string, SupportedLanguage> = new Map();
  private initialized = false;

  /**
   * Initialize the parser with language configurations
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Load language grammars dynamically
      const languages = await this.loadLanguageGrammars();

      // Configure each language
      for (const [lang, grammar] of languages.entries()) {
        const config = this.createLanguageConfig(lang, grammar);
        this.languageConfigs.set(lang, config);

        // Map file extensions to languages
        for (const ext of config.extensions) {
          this.extensionMap.set(ext, lang);
        }

        // Create parser instance
        const parser = new Parser();
        parser.setLanguage(grammar);
        this.parsers.set(lang, parser);
      }

      this.initialized = true;
    } catch (error) {
      throw new ParseError(
        'Failed to initialize Tree-sitter parser',
        undefined,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Load language grammars dynamically
   */
  private async loadLanguageGrammars(): Promise<Map<SupportedLanguage, Parser.Language>> {
    const languages = new Map<SupportedLanguage, Parser.Language>();

    try {
      // TypeScript
      const TypeScript = await import('tree-sitter-typescript');
      languages.set(SupportedLanguage.TYPESCRIPT, TypeScript.typescript);

      // JavaScript
      const JavaScript = await import('tree-sitter-javascript');
      languages.set(SupportedLanguage.JAVASCRIPT, JavaScript);

      // Python
      const Python = await import('tree-sitter-python');
      languages.set(SupportedLanguage.PYTHON, Python);

      // Java
      const Java = await import('tree-sitter-java');
      languages.set(SupportedLanguage.JAVA, Java);

      // Go
      const Go = await import('tree-sitter-go');
      languages.set(SupportedLanguage.GO, Go);

      // Rust
      const Rust = await import('tree-sitter-rust');
      languages.set(SupportedLanguage.RUST, Rust);

      // C++
      const Cpp = await import('tree-sitter-cpp');
      languages.set(SupportedLanguage.CPP, Cpp);

      // C#
      const CSharp = await import('tree-sitter-c-sharp');
      languages.set(SupportedLanguage.CSHARP, CSharp);

      // PHP
      const Php = await import('tree-sitter-php');
      languages.set(SupportedLanguage.PHP, Php);

      // Ruby
      const Ruby = await import('tree-sitter-ruby');
      languages.set(SupportedLanguage.RUBY, Ruby);

      return languages;
    } catch (error) {
      throw new ParseError(
        'Failed to load Tree-sitter language grammars',
        undefined,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create language configuration
   */
  private createLanguageConfig(
    language: SupportedLanguage,
    grammar: Parser.Language
  ): LanguageConfig {
    const extensionMap: Record<SupportedLanguage, string[]> = {
      [SupportedLanguage.TYPESCRIPT]: ['.ts', '.tsx'],
      [SupportedLanguage.JAVASCRIPT]: ['.js', '.jsx', '.mjs', '.cjs'],
      [SupportedLanguage.PYTHON]: ['.py', '.pyw'],
      [SupportedLanguage.JAVA]: ['.java'],
      [SupportedLanguage.GO]: ['.go'],
      [SupportedLanguage.RUST]: ['.rs'],
      [SupportedLanguage.CPP]: ['.cpp', '.cc', '.cxx', '.hpp', '.h', '.hxx'],
      [SupportedLanguage.CSHARP]: ['.cs'],
      [SupportedLanguage.PHP]: ['.php'],
      [SupportedLanguage.RUBY]: ['.rb']
    };

    return {
      language,
      extensions: extensionMap[language],
      parser: grammar
    };
  }

  /**
   * Detect language from file path
   */
  detectLanguage(filePath: string): SupportedLanguage | null {
    const ext = this.getFileExtension(filePath);
    return this.extensionMap.get(ext) || null;
  }

  /**
   * Check if a file can be parsed
   */
  canParse(filePath: string): boolean {
    return this.detectLanguage(filePath) !== null;
  }

  /**
   * Parse source code
   */
  async parse(
    source: string,
    language: SupportedLanguage,
    filePath?: string
  ): Promise<ParseResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const parser = this.parsers.get(language);
    if (!parser) {
      throw new ParseError(
        `No parser available for language: ${language}`,
        filePath,
        language
      );
    }

    const startTime = Date.now();

    try {
      const tree = parser.parse(source);
      const rootNode = this.normalizeNode(tree.rootNode);
      const errorNodes = this.findErrorNodes(rootNode);

      return {
        tree,
        rootNode,
        language,
        parseTime: Date.now() - startTime,
        hasErrors: errorNodes.length > 0,
        errorNodes
      };
    } catch (error) {
      throw new ParseError(
        'Failed to parse source code',
        filePath,
        language,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Parse a file by detecting its language
   */
  async parseFile(filePath: string, source: string): Promise<ParseResult> {
    const language = this.detectLanguage(filePath);
    if (!language) {
      throw new ParseError(
        `Cannot detect language for file: ${filePath}`,
        filePath
      );
    }

    return this.parse(source, language, filePath);
  }

  /**
   * Incremental parse - reparse only changed portions
   */
  async incrementalParse(
    source: string,
    language: SupportedLanguage,
    oldTree: Parser.Tree,
    edits: Array<{
      startIndex: number;
      oldEndIndex: number;
      newEndIndex: number;
      startPosition: { row: number; column: number };
      oldEndPosition: { row: number; column: number };
      newEndPosition: { row: number; column: number };
    }>,
    filePath?: string
  ): Promise<ParseResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const parser = this.parsers.get(language);
    if (!parser) {
      throw new ParseError(
        `No parser available for language: ${language}`,
        filePath,
        language
      );
    }

    const startTime = Date.now();

    try {
      // Apply edits to old tree
      for (const edit of edits) {
        oldTree.edit(edit);
      }

      // Reparse with old tree as reference
      const tree = parser.parse(source, oldTree);
      const rootNode = this.normalizeNode(tree.rootNode);
      const errorNodes = this.findErrorNodes(rootNode);

      return {
        tree,
        rootNode,
        language,
        parseTime: Date.now() - startTime,
        hasErrors: errorNodes.length > 0,
        errorNodes
      };
    } catch (error) {
      throw new ParseError(
        'Failed to perform incremental parse',
        filePath,
        language,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Normalize Tree-sitter node to our format
   */
  private normalizeNode(node: any): TreeSitterNode {
    return {
      type: node.type,
      text: node.text,
      startPosition: {
        row: node.startPosition.row,
        column: node.startPosition.column
      },
      endPosition: {
        row: node.endPosition.row,
        column: node.endPosition.column
      },
      startIndex: node.startIndex,
      endIndex: node.endIndex,
      children: node.children.map(child => this.normalizeNode(child)),
      isNamed: node.isNamed,
      fieldName: node.parent ? undefined : undefined // Will be set during traversal
    };
  }

  /**
   * Find all error nodes in the tree
   */
  private findErrorNodes(node: TreeSitterNode): TreeSitterNode[] {
    const errors: TreeSitterNode[] = [];

    if (node.type === 'ERROR' || node.type === 'MISSING') {
      errors.push(node);
    }

    for (const child of node.children) {
      errors.push(...this.findErrorNodes(child));
    }

    return errors;
  }

  /**
   * Query the AST using S-expression patterns
   *
   * Example: (function_declaration name: (identifier) @function-name)
   */
  query(
    parseResult: ParseResult,
    pattern: string
  ): Array<{ [key: string]: any }> {
    const language = this.languageConfigs.get(parseResult.language);
    if (!language) {
      throw new ParseError(
        `No language config for: ${parseResult.language}`,
        undefined,
        parseResult.language
      );
    }

    try {
      const query = language.parser.query(pattern);
      const matches = query.matches(parseResult.tree.rootNode);

      return matches.map(match => {
        const result: { [key: string]: any } = {};
        for (const capture of match.captures) {
          result[capture.name] = capture.node;
        }
        return result;
      });
    } catch (error) {
      throw new ParseError(
        'Failed to execute query',
        undefined,
        parseResult.language,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get file extension from path
   */
  private getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.');
    return lastDot === -1 ? '' : filePath.substring(lastDot);
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return Array.from(this.languageConfigs.keys());
  }

  /**
   * Get extensions for a language
   */
  getExtensions(language: SupportedLanguage): string[] {
    const config = this.languageConfigs.get(language);
    return config ? config.extensions : [];
  }

  /**
   * Check if parser is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Singleton instance
 */
let parserInstance: TreeSitterParser | null = null;

/**
 * Get or create the global parser instance
 */
export function getTreeSitterParser(): TreeSitterParser {
  if (!parserInstance) {
    parserInstance = new TreeSitterParser();
  }
  return parserInstance;
}

/**
 * Reset the global parser instance (for testing)
 */
export function resetTreeSitterParser(): void {
  parserInstance = null;
}
