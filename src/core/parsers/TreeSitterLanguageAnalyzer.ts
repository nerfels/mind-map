/**
 * TreeSitterLanguageAnalyzer - Universal Language Analyzer using Tree-sitter
 *
 * Replaces language-specific analyzers (RustAnalyzer, PythonAnalyzer, etc.)
 * with a single unified analyzer that leverages Tree-sitter for all supported languages.
 *
 * Eliminates ~3,000 lines of duplicate parsing code across 10+ language analyzers.
 */

import { BaseLanguageAnalyzer, CodeStructure } from '../base/BaseLanguageAnalyzer.js';
import {
  TreeSitterAdapter,
  getTreeSitterAdapter
} from './TreeSitterAdapter.js';
import {
  SupportedLanguage
} from './TreeSitterParser.js';
import {
  IncrementalParseManager,
  getIncrementalParseManager
} from './IncrementalParseManager.js';
import { ParseError } from '../../errors/MindMapErrors.js';

/**
 * Configuration options for TreeSitterLanguageAnalyzer
 */
export interface AnalyzerOptions {
  /** Enable incremental parsing for faster re-parsing (default: true) */
  enableIncrementalParsing?: boolean;
  /** Maximum number of parse trees to cache (default: 100) */
  maxCacheSize?: number;
}

/**
 * Universal language analyzer powered by Tree-sitter
 *
 * Supports: TypeScript, JavaScript, Python, Java, Go, Rust, C++, C#, PHP, Ruby
 *
 * Features:
 * - Incremental parsing for 10-100x faster re-parsing
 * - LRU cache for parse trees
 * - Robust error recovery
 */
export class TreeSitterLanguageAnalyzer extends BaseLanguageAnalyzer {
  private adapter: TreeSitterAdapter;
  private incrementalManager?: IncrementalParseManager;
  private language?: SupportedLanguage;
  private options: Required<AnalyzerOptions>;

  constructor(language?: SupportedLanguage, options: AnalyzerOptions = {}) {
    // Get all supported extensions from Tree-sitter
    const extensions = language
      ? TreeSitterLanguageAnalyzer.getExtensionsForLanguage(language)
      : TreeSitterLanguageAnalyzer.getAllSupportedExtensions();

    super(
      language || 'multi-language',
      extensions
    );

    this.language = language;
    this.adapter = getTreeSitterAdapter();

    // Set default options
    this.options = {
      enableIncrementalParsing: options.enableIncrementalParsing ?? true,
      maxCacheSize: options.maxCacheSize ?? 100
    };

    // Initialize incremental parsing if enabled
    if (this.options.enableIncrementalParsing) {
      this.incrementalManager = getIncrementalParseManager();
      this.incrementalManager.setMaxCacheSize(this.options.maxCacheSize);
    }
  }

  /**
   * Parse code using Tree-sitter with optional incremental parsing
   */
  protected async parseCode(content: string, filePath: string): Promise<CodeStructure> {
    try {
      let parseResult;

      // Use incremental parsing if enabled
      if (this.incrementalManager) {
        await this.incrementalManager.initialize();
        parseResult = await this.incrementalManager.parse(
          filePath,
          content,
          this.language
        );
      } else {
        // Fallback to regular parsing
        if (!this.adapter['parser'].isInitialized()) {
          await this.adapter.initialize();
        }
        parseResult = await this.adapter.parseFile(filePath, content);
      }

      // Check for syntax errors
      if (parseResult.hasErrors) {
        console.warn(
          `[TreeSitterAnalyzer] Syntax errors found in ${filePath}:`,
          parseResult.errorNodes.length,
          'error nodes'
        );
      }

      // Convert to CodeStructure
      return await this.adapter.toCodeStructure(parseResult, filePath);
    } catch (error) {
      if (error instanceof ParseError) {
        throw error;
      }
      throw new ParseError(
        'Failed to parse file with Tree-sitter',
        filePath,
        this.language,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get incremental parsing statistics (if enabled)
   */
  getIncrementalStats() {
    return this.incrementalManager?.getStats();
  }

  /**
   * Clear cache for a specific file (if incremental parsing is enabled)
   */
  clearCache(filePath: string): void {
    this.incrementalManager?.clearCache(filePath);
  }

  /**
   * Clear all cached parse trees (if incremental parsing is enabled)
   */
  clearAllCache(): void {
    this.incrementalManager?.clearAllCache();
  }

  /**
   * Get all supported file extensions across all languages
   */
  static getAllSupportedExtensions(): string[] {
    return [
      // TypeScript
      'ts',
      'tsx',
      // JavaScript
      'js',
      'jsx',
      'mjs',
      'cjs',
      // Python
      'py',
      'pyw',
      // Java
      'java',
      // Go
      'go',
      // Rust
      'rs',
      // C++
      'cpp',
      'cc',
      'cxx',
      'hpp',
      'h',
      'hxx',
      // C#
      'cs',
      // PHP
      'php',
      // Ruby
      'rb'
    ];
  }

  /**
   * Get file extensions for a specific language
   */
  static getExtensionsForLanguage(language: SupportedLanguage): string[] {
    const extensionMap: Record<SupportedLanguage, string[]> = {
      [SupportedLanguage.TYPESCRIPT]: ['ts', 'tsx'],
      [SupportedLanguage.JAVASCRIPT]: ['js', 'jsx', 'mjs', 'cjs'],
      [SupportedLanguage.PYTHON]: ['py', 'pyw'],
      [SupportedLanguage.JAVA]: ['java'],
      [SupportedLanguage.GO]: ['go'],
      [SupportedLanguage.RUST]: ['rs'],
      [SupportedLanguage.CPP]: ['cpp', 'cc', 'cxx', 'hpp', 'h', 'hxx'],
      [SupportedLanguage.CSHARP]: ['cs'],
      [SupportedLanguage.PHP]: ['php'],
      [SupportedLanguage.RUBY]: ['rb']
    };

    return extensionMap[language] || [];
  }

  /**
   * Create a language-specific analyzer
   */
  static forLanguage(language: SupportedLanguage): TreeSitterLanguageAnalyzer {
    return new TreeSitterLanguageAnalyzer(language);
  }

  /**
   * Create a TypeScript analyzer
   */
  static typescript(): TreeSitterLanguageAnalyzer {
    return TreeSitterLanguageAnalyzer.forLanguage(SupportedLanguage.TYPESCRIPT);
  }

  /**
   * Create a JavaScript analyzer
   */
  static javascript(): TreeSitterLanguageAnalyzer {
    return TreeSitterLanguageAnalyzer.forLanguage(SupportedLanguage.JAVASCRIPT);
  }

  /**
   * Create a Python analyzer
   */
  static python(): TreeSitterLanguageAnalyzer {
    return TreeSitterLanguageAnalyzer.forLanguage(SupportedLanguage.PYTHON);
  }

  /**
   * Create a Java analyzer
   */
  static java(): TreeSitterLanguageAnalyzer {
    return TreeSitterLanguageAnalyzer.forLanguage(SupportedLanguage.JAVA);
  }

  /**
   * Create a Go analyzer
   */
  static go(): TreeSitterLanguageAnalyzer {
    return TreeSitterLanguageAnalyzer.forLanguage(SupportedLanguage.GO);
  }

  /**
   * Create a Rust analyzer
   */
  static rust(): TreeSitterLanguageAnalyzer {
    return TreeSitterLanguageAnalyzer.forLanguage(SupportedLanguage.RUST);
  }

  /**
   * Create a C++ analyzer
   */
  static cpp(): TreeSitterLanguageAnalyzer {
    return TreeSitterLanguageAnalyzer.forLanguage(SupportedLanguage.CPP);
  }

  /**
   * Create a C# analyzer
   */
  static csharp(): TreeSitterLanguageAnalyzer {
    return TreeSitterLanguageAnalyzer.forLanguage(SupportedLanguage.CSHARP);
  }

  /**
   * Create a PHP analyzer
   */
  static php(): TreeSitterLanguageAnalyzer {
    return TreeSitterLanguageAnalyzer.forLanguage(SupportedLanguage.PHP);
  }

  /**
   * Create a Ruby analyzer
   */
  static ruby(): TreeSitterLanguageAnalyzer {
    return TreeSitterLanguageAnalyzer.forLanguage(SupportedLanguage.RUBY);
  }

  /**
   * Create a universal multi-language analyzer
   */
  static universal(): TreeSitterLanguageAnalyzer {
    return new TreeSitterLanguageAnalyzer();
  }
}
