import { readFile } from 'fs/promises';
import { CodeStructure } from '../../types/index.js';

/**
 * Abstract base class for language analyzers
 * Provides common functionality for file analysis including:
 * - File extension validation
 * - File reading
 * - Error handling patterns
 * - Common analysis workflow
 *
 * Implementations only need to:
 * 1. Set supportedExtensions in constructor
 * 2. Implement parseCode() method for language-specific parsing
 */
export abstract class BaseLanguageAnalyzer<T extends CodeStructure = CodeStructure> {
  protected supportedExtensions: Set<string>;
  protected languageName: string;

  constructor(languageName: string, supportedExtensions: string[]) {
    this.languageName = languageName;
    this.supportedExtensions = new Set(supportedExtensions);
  }

  /**
   * Check if this analyzer can handle the given file
   */
  canAnalyze(filePath: string): boolean {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return extension ? this.supportedExtensions.has(extension) : false;
  }

  /**
   * Analyze a file and return its code structure
   * Handles file reading and error handling, delegates parsing to parseCode()
   */
  async analyzeFile(filePath: string): Promise<T | null> {
    if (!this.canAnalyze(filePath)) {
      return null;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      return await this.parseCode(content, filePath);
    } catch (error) {
      this.logError(`Failed to analyze ${this.languageName} file ${filePath}`, error);
      return null;
    }
  }

  /**
   * Parse code content and extract structure
   * Must be implemented by each language-specific analyzer
   */
  protected abstract parseCode(content: string, filePath: string): Promise<T>;

  /**
   * Create an empty code structure for error cases
   * Can be overridden by subclasses to include language-specific properties
   */
  protected createEmptyStructure(): T {
    return {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
    } as T;
  }

  /**
   * Safely parse code with automatic fallback to empty structure
   */
  protected async safeParseCode(content: string, filePath: string): Promise<T> {
    try {
      return await this.parseCode(content, filePath);
    } catch (error) {
      this.logError(`Failed to parse ${this.languageName} code ${filePath}`, error);
      return this.createEmptyStructure();
    }
  }

  /**
   * Centralized error logging with consistent format
   */
  protected logError(message: string, error: any): void {
    console.warn(`[${this.languageName}Analyzer] ${message}:`, error);
  }

  /**
   * Helper to extract file extension
   */
  protected getFileExtension(filePath: string): string | undefined {
    return filePath.split('.').pop()?.toLowerCase();
  }

  /**
   * Helper to count lines in content
   */
  protected countLines(content: string): number {
    return content.split('\n').length;
  }

  /**
   * Helper to split content into lines
   */
  protected splitLines(content: string): string[] {
    return content.split('\n');
  }

  /**
   * Helper to extract content between line numbers
   */
  protected extractLines(content: string, startLine: number, endLine: number): string {
    const lines = this.splitLines(content);
    return lines.slice(startLine - 1, endLine).join('\n');
  }

  /**
   * Helper to detect framework based on content patterns
   */
  protected detectFramework(content: string, filePath: string, patterns: { name: string; indicators: RegExp[] }[]): string[] {
    const detected: string[] = [];

    for (const { name, indicators } of patterns) {
      const matchCount = indicators.filter(pattern => pattern.test(content)).length;
      if (matchCount > 0) {
        detected.push(name);
      }
    }

    return detected;
  }

  /**
   * Get language name for this analyzer
   */
  getLanguageName(): string {
    return this.languageName;
  }

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[] {
    return Array.from(this.supportedExtensions);
  }
}

/**
 * Base class specifically for regex-based analyzers
 * Provides additional utilities for pattern matching
 */
export abstract class RegexBasedAnalyzer<T extends CodeStructure = CodeStructure> extends BaseLanguageAnalyzer<T> {
  /**
   * Extract matches for a regex pattern with line numbers
   */
  protected extractMatchesWithLines(
    content: string,
    pattern: RegExp
  ): Array<{ match: RegExpMatchArray; lineNumber: number }> {
    const lines = this.splitLines(content);
    const matches: Array<{ match: RegExpMatchArray; lineNumber: number }> = [];

    lines.forEach((line, index) => {
      const match = line.match(pattern);
      if (match) {
        matches.push({ match, lineNumber: index + 1 });
      }
    });

    return matches;
  }

  /**
   * Extract all matches for a global regex pattern
   */
  protected extractAllMatches(content: string, pattern: RegExp): RegExpMatchArray[] {
    const matches: RegExpMatchArray[] = [];
    let match: RegExpMatchArray | null;

    // Ensure pattern is global
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');

    while ((match = globalPattern.exec(content)) !== null) {
      matches.push(match);
    }

    return matches;
  }

  /**
   * Find the line number for a string index in content
   */
  protected getLineNumberFromIndex(content: string, index: number): number {
    const upToIndex = content.substring(0, index);
    return upToIndex.split('\n').length;
  }

  /**
   * Extract block content between braces/brackets
   */
  protected extractBlockContent(content: string, startIndex: number): { content: string; endIndex: number } {
    let depth = 0;
    let inString = false;
    let stringChar = '';
    let escaped = false;

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if ((char === '"' || char === "'") && !inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar && inString) {
        inString = false;
      }

      if (!inString) {
        if (char === '{') depth++;
        if (char === '}') depth--;

        if (depth === 0) {
          return {
            content: content.substring(startIndex, i + 1),
            endIndex: i + 1
          };
        }
      }
    }

    return { content: content.substring(startIndex), endIndex: content.length };
  }

  /**
   * Common pattern: Extract function parameters from signature
   */
  protected extractParameters(signature: string): string[] {
    // Remove function name and find parameters in parentheses
    const paramMatch = signature.match(/\(([^)]*)\)/);
    if (!paramMatch || !paramMatch[1]) return [];

    return paramMatch[1]
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  /**
   * Common pattern: Check if a function/method is exported
   */
  protected isExported(line: string): boolean {
    return /^\s*(export|public|pub)\s+/.test(line);
  }

  /**
   * Common pattern: Extract visibility modifier
   */
  protected extractVisibility(line: string): 'public' | 'private' | 'protected' | undefined {
    if (/^\s*private\s+/.test(line)) return 'private';
    if (/^\s*protected\s+/.test(line)) return 'protected';
    if (/^\s*public\s+/.test(line) || /^\s*export\s+/.test(line) || /^\s*pub\s+/.test(line)) return 'public';
    return undefined;
  }
}
