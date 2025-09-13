/**
 * Custom Pattern Engine - Phase 4.4 User Customization
 *
 * Features:
 * - User-defined pattern recognition rules
 * - Category-based pattern organization
 * - Language and framework specific patterns
 * - Severity-based pattern filtering
 * - Real-time pattern matching and validation
 */

import { MindMapStorage } from './MindMapStorage.js';
import { UserConfigurationManager } from './UserConfigurationManager.js';
import { CustomPatternRule, MindMapNode, FileInfo } from '../types/index.js';

export interface PatternMatch {
  ruleId: string;
  ruleName: string;
  category: string;
  severity: 'info' | 'warning' | 'error';
  confidence: number;
  file: string;
  line?: number;
  column?: number;
  matchedText: string;
  description: string;
  suggestion?: string;
  metadata: Record<string, any>;
}

export interface PatternAnalysisResult {
  matches: PatternMatch[];
  rulesCovered: string[];
  filesAnalyzed: number;
  totalMatches: number;
  categoryCounts: Record<string, number>;
  severityCounts: Record<string, number>;
}

export class CustomPatternEngine {
  private storage: MindMapStorage;
  private configManager: UserConfigurationManager;
  private builtInPatterns: CustomPatternRule[] = [];

  constructor(storage: MindMapStorage, configManager: UserConfigurationManager) {
    this.storage = storage;
    this.configManager = configManager;
    this.initializeBuiltInPatterns();
  }

  /**
   * Initialize built-in pattern rules
   */
  private initializeBuiltInPatterns(): void {
    const now = new Date();

    this.builtInPatterns = [
      {
        id: 'builtin_console_log',
        name: 'Console Debugging Statements',
        description: 'Detects console.log statements that should be removed in production',
        pattern: /console\.(log|debug|info|warn|error)\s*\(/g,
        category: 'code_quality',
        severity: 'warning',
        confidence: 0.9,
        enabled: true,
        fileTypes: ['.js', '.ts', '.jsx', '.tsx'],
        languages: ['javascript', 'typescript'],
        frameworks: [],
        metadata: {
          suggestion: 'Remove console statements or use proper logging framework',
          autoFixable: true
        },
        created: now,
        lastModified: now
      },
      {
        id: 'builtin_todo_comments',
        name: 'TODO Comments',
        description: 'Finds TODO, FIXME, HACK comments in code',
        pattern: /\/\/\s*(TODO|FIXME|HACK|BUG)\s*:?\s*(.+)/gi,
        category: 'code_quality',
        severity: 'info',
        confidence: 0.8,
        enabled: true,
        fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c'],
        languages: ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'cpp', 'c'],
        frameworks: [],
        metadata: {
          suggestion: 'Create proper issue tracking for important TODOs',
          trackable: true
        },
        created: now,
        lastModified: now
      },
      {
        id: 'builtin_hardcoded_credentials',
        name: 'Hardcoded Credentials',
        description: 'Detects potential hardcoded passwords, keys, and tokens',
        pattern: /(password|pwd|pass|secret|key|token|api[_-]?key)\s*[=:]\s*[\'"]([^\'\"]{8,})[\'\"]/gi,
        category: 'security',
        severity: 'error',
        confidence: 0.7,
        enabled: true,
        fileTypes: ['.js', '.ts', '.py', '.java', '.go', '.rs', '.cpp', '.yaml', '.json'],
        languages: ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'cpp'],
        frameworks: [],
        metadata: {
          suggestion: 'Use environment variables or secure credential management',
          critical: true
        },
        created: now,
        lastModified: now
      },
      {
        id: 'builtin_magic_numbers',
        name: 'Magic Numbers',
        description: 'Finds hardcoded numeric values that should be constants',
        pattern: /(?<![a-zA-Z_])\b(\d{3,})\b(?![a-zA-Z_])/g,
        category: 'code_quality',
        severity: 'info',
        confidence: 0.6,
        enabled: true,
        fileTypes: ['.js', '.ts', '.py', '.java', '.go', '.rs', '.cpp'],
        languages: ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'cpp'],
        frameworks: [],
        metadata: {
          suggestion: 'Consider extracting to named constants',
          threshold: 100 // Numbers above 100
        },
        created: now,
        lastModified: now
      },
      {
        id: 'builtin_long_functions',
        name: 'Long Functions',
        description: 'Detects functions that may be too long and complex',
        pattern: '',
        category: 'design',
        severity: 'warning',
        confidence: 0.8,
        enabled: true,
        fileTypes: ['.js', '.ts', '.py', '.java', '.go', '.rs', '.cpp'],
        languages: ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'cpp'],
        frameworks: [],
        metadata: {
          suggestion: 'Consider breaking down into smaller functions',
          lineThreshold: 50,
          complexityCheck: true
        },
        created: now,
        lastModified: now
      },
      {
        id: 'builtin_deprecated_apis',
        name: 'Deprecated APIs',
        description: 'Finds usage of deprecated APIs and functions',
        pattern: /\.(getElementById|innerText|attachEvent|createContextualFragment)\s*\(/gi,
        category: 'code_quality',
        severity: 'warning',
        confidence: 0.9,
        enabled: true,
        fileTypes: ['.js', '.ts', '.jsx', '.tsx'],
        languages: ['javascript', 'typescript'],
        frameworks: [],
        metadata: {
          suggestion: 'Use modern alternatives (querySelector, textContent, addEventListener)',
          modernAlternatives: true
        },
        created: now,
        lastModified: now
      }
    ];
  }

  /**
   * Get all available patterns (built-in + custom)
   */
  getAllPatterns(enabledOnly: boolean = false): CustomPatternRule[] {
    const customPatterns = this.configManager.getCustomPatterns(enabledOnly);
    let allPatterns = [...this.builtInPatterns, ...customPatterns];

    if (enabledOnly) {
      allPatterns = allPatterns.filter(p => p.enabled);
    }

    return allPatterns;
  }

  /**
   * Analyze files against all enabled patterns
   */
  async analyzeFiles(files: FileInfo[], languages?: string[], frameworks?: string[]): Promise<PatternAnalysisResult> {
    const enabledPatterns = this.getAllPatterns(true);
    const matches: PatternMatch[] = [];
    const rulesCovered = new Set<string>();
    const categoryCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};

    console.log(`🔍 Analyzing ${files.length} files with ${enabledPatterns.length} patterns...`);

    for (const file of files) {
      if (!this.shouldAnalyzeFile(file, enabledPatterns)) {
        continue;
      }

      const fileMatches = await this.analyzeFile(file, enabledPatterns, languages, frameworks);
      matches.push(...fileMatches);

      // Track statistics
      fileMatches.forEach(match => {
        rulesCovered.add(match.ruleId);
        categoryCounts[match.category] = (categoryCounts[match.category] || 0) + 1;
        severityCounts[match.severity] = (severityCounts[match.severity] || 0) + 1;
      });
    }

    return {
      matches,
      rulesCovered: Array.from(rulesCovered),
      filesAnalyzed: files.length,
      totalMatches: matches.length,
      categoryCounts,
      severityCounts
    };
  }

  /**
   * Analyze a single file against patterns
   */
  private async analyzeFile(
    file: FileInfo,
    patterns: CustomPatternRule[],
    languages?: string[],
    frameworks?: string[]
  ): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];

    try {
      const content = await this.readFileContent(file.path);
      if (!content) return matches;

      const applicablePatterns = this.getApplicablePatterns(file, patterns, languages, frameworks);

      for (const pattern of applicablePatterns) {
        const patternMatches = this.matchPattern(pattern, file, content);
        matches.push(...patternMatches);
      }
    } catch (error) {
      console.warn(`Failed to analyze file ${file.path}:`, error);
    }

    return matches;
  }

  /**
   * Check if file should be analyzed
   */
  private shouldAnalyzeFile(file: FileInfo, patterns: CustomPatternRule[]): boolean {
    if (file.type !== 'file') return false;
    if (!file.extension) return false;

    // Check if any pattern applies to this file type
    return patterns.some(pattern =>
      pattern.fileTypes.length === 0 ||
      pattern.fileTypes.some(ext => file.extension?.endsWith(ext.replace('.', '')))
    );
  }

  /**
   * Get patterns applicable to a file
   */
  private getApplicablePatterns(
    file: FileInfo,
    patterns: CustomPatternRule[],
    languages?: string[],
    frameworks?: string[]
  ): CustomPatternRule[] {
    return patterns.filter(pattern => {
      // File type check
      if (pattern.fileTypes.length > 0) {
        const hasMatchingExtension = pattern.fileTypes.some(ext =>
          file.extension?.endsWith(ext.replace('.', ''))
        );
        if (!hasMatchingExtension) return false;
      }

      // Language check
      if (pattern.languages.length > 0 && languages) {
        const hasMatchingLanguage = pattern.languages.some(lang =>
          languages.includes(lang)
        );
        if (!hasMatchingLanguage) return false;
      }

      // Framework check
      if (pattern.frameworks.length > 0 && frameworks) {
        const hasMatchingFramework = pattern.frameworks.some(fw =>
          frameworks.includes(fw)
        );
        if (!hasMatchingFramework) return false;
      }

      return true;
    });
  }

  /**
   * Match pattern against file content
   */
  private matchPattern(pattern: CustomPatternRule, file: FileInfo, content: string): PatternMatch[] {
    const matches: PatternMatch[] = [];

    try {
      // Handle special pattern types
      if (pattern.id === 'builtin_long_functions') {
        return this.checkLongFunctions(pattern, file, content);
      }

      // Regular expression matching
      if (typeof pattern.pattern === 'string' && pattern.pattern) {
        const regex = new RegExp(pattern.pattern, 'gi');
        const regexMatches = content.matchAll(regex);

        for (const match of regexMatches) {
          const lineInfo = this.getLineInfo(content, match.index || 0);

          matches.push({
            ruleId: pattern.id,
            ruleName: pattern.name,
            category: pattern.category,
            severity: pattern.severity,
            confidence: pattern.confidence,
            file: file.path,
            line: lineInfo.line,
            column: lineInfo.column,
            matchedText: match[0],
            description: pattern.description,
            suggestion: pattern.metadata.suggestion,
            metadata: {
              ...pattern.metadata,
              fullMatch: match[0],
              groups: match.slice(1)
            }
          });
        }
      } else if (pattern.pattern instanceof RegExp) {
        const regex = new RegExp(pattern.pattern.source, 'gi');
        const regexMatches = content.matchAll(regex);

        for (const match of regexMatches) {
          const lineInfo = this.getLineInfo(content, match.index || 0);

          matches.push({
            ruleId: pattern.id,
            ruleName: pattern.name,
            category: pattern.category,
            severity: pattern.severity,
            confidence: pattern.confidence,
            file: file.path,
            line: lineInfo.line,
            column: lineInfo.column,
            matchedText: match[0],
            description: pattern.description,
            suggestion: pattern.metadata.suggestion,
            metadata: {
              ...pattern.metadata,
              fullMatch: match[0],
              groups: match.slice(1)
            }
          });
        }
      }
    } catch (error) {
      console.warn(`Pattern matching failed for ${pattern.id}:`, error);
    }

    return matches;
  }

  /**
   * Check for long functions (special case)
   */
  private checkLongFunctions(pattern: CustomPatternRule, file: FileInfo, content: string): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const lineThreshold = pattern.metadata.lineThreshold || 50;

    // Simple function detection patterns for different languages
    const functionPatterns: Record<string, RegExp> = {
      javascript: /(?:function\s+(\w+)|(\w+)\s*:\s*function|\bfunction\*\s+(\w+)|(?:async\s+)?(\w+)\s*\()/g,
      typescript: /(?:function\s+(\w+)|(\w+)\s*:\s*function|\bfunction\*\s+(\w+)|(?:async\s+)?(\w+)\s*\()/g,
      python: /^def\s+(\w+)\s*\(/gm,
      java: /(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)*(\w+)\s*\([^)]*\)\s*\{/g,
      go: /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/g,
      rust: /fn\s+(\w+)\s*\(/g,
      cpp: /(?:\w+\s+)*(\w+)\s*\([^)]*\)\s*\{/g
    };

    const language = this.detectLanguageFromExtension(file.extension);
    const functionPattern = functionPatterns[language];

    if (!functionPattern) return matches;

    const lines = content.split('\n');
    const functionMatches = content.matchAll(functionPattern);

    for (const match of functionMatches) {
      const startLine = this.getLineInfo(content, match.index || 0).line;
      const functionLines = this.countFunctionLines(lines, startLine - 1, language);

      if (functionLines > lineThreshold) {
        matches.push({
          ruleId: pattern.id,
          ruleName: pattern.name,
          category: pattern.category,
          severity: pattern.severity,
          confidence: pattern.confidence,
          file: file.path,
          line: startLine,
          column: 1,
          matchedText: match[0],
          description: `Function '${match[1] || 'anonymous'}' has ${functionLines} lines (threshold: ${lineThreshold})`,
          suggestion: pattern.metadata.suggestion,
          metadata: {
            ...pattern.metadata,
            functionName: match[1] || 'anonymous',
            actualLines: functionLines,
            threshold: lineThreshold
          }
        });
      }
    }

    return matches;
  }

  /**
   * Count lines in a function
   */
  private countFunctionLines(lines: string[], startLine: number, language: string): number {
    let braceCount = 0;
    let lineCount = 0;
    let inFunction = false;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!inFunction && line.includes('{')) {
        inFunction = true;
        braceCount = 1;
        lineCount = 1;
        continue;
      }

      if (inFunction) {
        lineCount++;

        // Count braces to find function end
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;
        braceCount += openBraces - closeBraces;

        if (braceCount <= 0) {
          break;
        }
      }
    }

    return lineCount;
  }

  /**
   * Detect language from file extension
   */
  private detectLanguageFromExtension(extension?: string): string {
    if (!extension) return 'unknown';

    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'cpp'
    };

    const ext = extension.replace('.', '').toLowerCase();
    return languageMap[ext] || 'unknown';
  }

  /**
   * Get line and column information from content index
   */
  private getLineInfo(content: string, index: number): { line: number; column: number } {
    const beforeMatch = content.substring(0, index);
    const line = (beforeMatch.match(/\n/g) || []).length + 1;
    const lastNewline = beforeMatch.lastIndexOf('\n');
    const column = index - lastNewline;

    return { line, column };
  }

  /**
   * Read file content
   */
  private async readFileContent(filePath: string): Promise<string | null> {
    try {
      const fs = await import('fs/promises');
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Validate custom pattern rule
   */
  validatePattern(pattern: Omit<CustomPatternRule, 'id' | 'created' | 'lastModified'>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!pattern.name?.trim()) {
      errors.push('Pattern name is required');
    }

    if (!pattern.description?.trim()) {
      errors.push('Pattern description is required');
    }

    if (!pattern.pattern) {
      errors.push('Pattern rule is required');
    }

    // Validate regex pattern
    if (pattern.pattern) {
      try {
        if (typeof pattern.pattern === 'string') {
          new RegExp(pattern.pattern);
        }
      } catch (error) {
        errors.push(`Invalid regular expression: ${(error as Error).message}`);
      }
    }

    // Validate confidence
    if (pattern.confidence < 0 || pattern.confidence > 1) {
      errors.push('Confidence must be between 0 and 1');
    }

    // Validate file types format
    if (pattern.fileTypes.some(ft => !ft.startsWith('.'))) {
      warnings.push('File types should start with dot (e.g., .js, .py)');
    }

    // Check for overly broad patterns
    if (typeof pattern.pattern === 'string' && pattern.pattern.length < 3) {
      warnings.push('Very short patterns may produce many false positives');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Test pattern against sample text
   */
  testPattern(pattern: CustomPatternRule, sampleText: string): PatternMatch[] {
    const mockFile: FileInfo = {
      path: 'test.js',
      name: 'test.js',
      type: 'file',
      size: sampleText.length,
      extension: '.js',
      lastModified: new Date(),
      isIgnored: false
    };

    return this.matchPattern(pattern, mockFile, sampleText);
  }

  /**
   * Get pattern statistics
   */
  getPatternStatistics(): {
    totalPatterns: number;
    enabledPatterns: number;
    customPatterns: number;
    builtInPatterns: number;
    categoryCounts: Record<string, number>;
    severityCounts: Record<string, number>;
    languageCounts: Record<string, number>;
  } {
    const allPatterns = this.getAllPatterns();
    const enabledPatterns = allPatterns.filter(p => p.enabled);
    const customPatterns = this.configManager.getCustomPatterns();

    const categoryCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    const languageCounts: Record<string, number> = {};

    allPatterns.forEach(pattern => {
      categoryCounts[pattern.category] = (categoryCounts[pattern.category] || 0) + 1;
      severityCounts[pattern.severity] = (severityCounts[pattern.severity] || 0) + 1;
      pattern.languages.forEach(lang => {
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
      });
    });

    return {
      totalPatterns: allPatterns.length,
      enabledPatterns: enabledPatterns.length,
      customPatterns: customPatterns.length,
      builtInPatterns: this.builtInPatterns.length,
      categoryCounts,
      severityCounts,
      languageCounts
    };
  }
}