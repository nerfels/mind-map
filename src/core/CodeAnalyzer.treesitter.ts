/**
 * CodeAnalyzer - Refactored with Tree-sitter
 *
 * BEFORE: 444 lines with 5 language-specific analyzers + TypeScript compiler
 * AFTER: ~50 lines with universal Tree-sitter analyzer
 *
 * Benefits:
 * - 90% code reduction
 * - No external language dependencies
 * - Unified parsing logic
 * - Better error recovery
 * - Incremental parsing support
 */

import { CodeStructure } from '../types/index.js';
import { TreeSitterLanguageAnalyzer } from './parsers/TreeSitterLanguageAnalyzer.js';

/**
 * Universal code analyzer using Tree-sitter
 *
 * Replaces multiple language-specific analyzers with a single unified implementation.
 */
export class CodeAnalyzer {
  private analyzer: TreeSitterLanguageAnalyzer;

  constructor() {
    // Single universal analyzer handles all supported languages
    this.analyzer = TreeSitterLanguageAnalyzer.universal();
  }

  /**
   * Check if a file can be analyzed
   */
  canAnalyze(filePath: string): boolean {
    return this.analyzer.canAnalyze(filePath);
  }

  /**
   * Analyze a file and extract its code structure
   */
  async analyzeFile(filePath: string): Promise<CodeStructure | null> {
    return await this.analyzer.analyzeFile(filePath);
  }

  /**
   * Get list of supported file extensions
   */
  getSupportedExtensions(): string[] {
    return TreeSitterLanguageAnalyzer.getAllSupportedExtensions();
  }
}

/**
 * Legacy compatibility exports
 * These can be removed once all callers are updated
 */

// Re-export the Tree-sitter analyzer with legacy names for backward compatibility
export const PythonAnalyzer = TreeSitterLanguageAnalyzer.python;
export const JavaAnalyzer = TreeSitterLanguageAnalyzer.java;
export const GoAnalyzer = TreeSitterLanguageAnalyzer.go;
export const RustAnalyzer = TreeSitterLanguageAnalyzer.rust;
export const CppAnalyzer = TreeSitterLanguageAnalyzer.cpp;
export const CSharpAnalyzer = TreeSitterLanguageAnalyzer.csharp;
export const PhpAnalyzer = TreeSitterLanguageAnalyzer.php;
export const RubyAnalyzer = TreeSitterLanguageAnalyzer.ruby;
