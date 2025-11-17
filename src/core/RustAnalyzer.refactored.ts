import { RegexBasedAnalyzer } from './base/BaseLanguageAnalyzer.js';
import { CodeStructure } from '../types/index.js';

export interface RustCodeStructure extends CodeStructure {
  rustImports: Array<{
    path: string;
    alias?: string;
    isExternal?: boolean;
    isGlob?: boolean;
  }>;
  structs: Array<{
    name: string;
    startLine: number;
    endLine: number;
    fields: string[];
    traits: string[];
    derives: string[];
  }>;
  traits: Array<{
    name: string;
    startLine: number;
    endLine: number;
    methods: string[];
    associatedTypes: string[];
  }>;
  impls: Array<{
    target: string;
    trait?: string;
    startLine: number;
    endLine: number;
    methods: string[];
  }>;
  macros: Array<{
    name: string;
    startLine: number;
    endLine: number;
    type: 'declarative' | 'procedural';
  }>;
  modules: Array<{
    name: string;
    startLine: number;
    endLine: number;
    isPublic: boolean;
  }>;
  crateName?: string;
}

/**
 * Rust AST Analyzer using regex-based parsing approach
 * Extracts Rust code structure including functions, structs, traits, impls, and modules
 *
 * REFACTORED: Now extends RegexBasedAnalyzer for common functionality
 * - Eliminates 50+ lines of boilerplate code
 * - Uses base class utilities for pattern matching and line extraction
 * - Maintains all existing functionality while reducing duplication
 */
export class RustAnalyzer extends RegexBasedAnalyzer<RustCodeStructure> {
  private readonly RUST_FRAMEWORKS = [
    {
      name: 'actix-web',
      indicators: [
        /use\s+actix_web::/,
        /actix_web::/,
        /#\[actix_web::/
      ]
    },
    {
      name: 'tokio',
      indicators: [
        /use\s+tokio::/,
        /#\[tokio::/,
        /tokio::/
      ]
    },
    {
      name: 'serde',
      indicators: [
        /use\s+serde::/,
        /#\[derive\([^)]*Serialize/,
        /#\[derive\([^)]*Deserialize/,
        /#\[serde/
      ]
    },
    {
      name: 'diesel',
      indicators: [
        /use\s+diesel::/,
        /#\[derive\([^)]*Queryable/,
        /#\[diesel/
      ]
    },
    {
      name: 'warp',
      indicators: [/use\s+warp::/, /warp::/]
    },
    {
      name: 'axum',
      indicators: [/use\s+axum::/, /axum::/]
    },
    {
      name: 'clap',
      indicators: [
        /use\s+clap::/,
        /#\[derive\([^)]*Parser/,
        /#\[clap/
      ]
    },
    {
      name: 'rocket',
      indicators: [
        /use\s+rocket::/,
        /#\[rocket::/,
        /rocket::/
      ]
    }
  ];

  constructor() {
    super('Rust', ['rs']);
  }

  /**
   * Create empty Rust code structure for error cases
   */
  protected createEmptyStructure(): RustCodeStructure {
    return {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      rustImports: [],
      structs: [],
      traits: [],
      impls: [],
      macros: [],
      modules: [],
    };
  }

  /**
   * Parse Rust code and extract structure
   * Delegates to specialized parsing methods for each language construct
   */
  protected async parseCode(content: string, filePath: string): Promise<RustCodeStructure> {
    const lines = this.splitLines(content);

    const result = this.createEmptyStructure();

    // Add metadata
    (result as any).language = 'rust';
    (result as any).framework = this.detectFramework(content, filePath, this.RUST_FRAMEWORKS);

    // Parse crate name
    result.crateName = this.extractCrateName(filePath);

    // Parse all Rust constructs
    result.rustImports = this.parseImports(content, lines);
    result.imports = result.rustImports.map(imp => ({
      module: imp.path,
      path: imp.alias,
      type: imp.isGlob ? 'namespace' as const : (imp.alias ? 'named' as const : 'default' as const)
    }));

    result.functions = this.parseFunctions(content, lines);
    result.structs = this.parseStructs(content, lines);
    result.traits = this.parseTraits(content, lines);
    result.impls = this.parseImpls(content, lines);
    result.macros = this.parseMacros(content, lines);
    result.modules = this.parseModules(content, lines);

    // Add pattern analysis
    (result as any).patterns = this.analyzePatterns(content, result);

    return result;
  }

  private parseImports(content: string, lines: string[]): RustCodeStructure['rustImports'] {
    const imports: RustCodeStructure['rustImports'] = [];

    // Match use statements
    const useRegex = /^\s*(?:pub\s+)?use\s+([^;]+);/gm;
    const matches = this.extractAllMatches(content, useRegex);

    for (const match of matches) {
      const importStr = match[1].trim();

      if (importStr.includes('*')) {
        imports.push({
          path: importStr.replace(/\s*\*$/, ''),
          isGlob: true,
          isExternal: !importStr.startsWith('crate::') && !importStr.startsWith('super::') && !importStr.startsWith('self::')
        });
      } else if (importStr.includes(' as ')) {
        const [path, alias] = importStr.split(' as ').map(s => s.trim());
        imports.push({
          path,
          alias,
          isExternal: !path.startsWith('crate::') && !path.startsWith('super::') && !path.startsWith('self::')
        });
      } else {
        imports.push({
          path: importStr,
          isExternal: !importStr.startsWith('crate::') && !importStr.startsWith('super::') && !importStr.startsWith('self::')
        });
      }
    }

    return imports;
  }

  private parseFunctions(content: string, lines: string[]): Array<{
    name: string;
    startLine: number;
    endLine: number;
    parameters: string[];
    returnType?: string;
    isAsync?: boolean;
    isPublic?: boolean;
    isUnsafe?: boolean;
  }> {
    const functions: ReturnType<RustAnalyzer['parseFunctions']> = [];

    // Match function definitions using base class utility
    const fnRegex = /^(\s*)(?:(pub(?:\([^)]*\))?)\s+)?(?:(async)\s+)?(?:(unsafe)\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)(?:\s*->\s*([^{]+))?/;
    const matches = this.extractMatchesWithLines(content, fnRegex);

    for (const { match, lineNumber } of matches) {
      const isPublic = match[2] !== undefined;
      const isAsync = match[3] !== undefined;
      const isUnsafe = match[4] !== undefined;
      const functionName = match[5];
      const params = match[6];
      const returnType = match[7]?.trim();

      const endLine = this.findBlockEndLineAt(content, match.index!, lineNumber);

      // Parse parameters using base class utility
      const parameters = params
        .split(',')
        .map(p => p.trim())
        .filter(p => p && !p.startsWith('//'))
        .map(p => {
          if (p === 'self' || p === '&self' || p === '&mut self') return p;
          const colonIndex = p.indexOf(':');
          return colonIndex > 0 ? p.substring(0, colonIndex).trim() : p;
        });

      functions.push({
        name: functionName,
        startLine: lineNumber,
        endLine,
        parameters,
        returnType,
        isAsync,
        isPublic,
        isUnsafe
      });
    }

    return functions;
  }

  private parseStructs(content: string, lines: string[]): RustCodeStructure['structs'] {
    const structs: RustCodeStructure['structs'] = [];

    const structRegex = /^(\s*)(?:#\[derive\([^)]+\)\]\s*)?(?:(pub(?:\([^)]*\))?)\s+)?struct\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
    const matches = this.extractMatchesWithLines(content, structRegex);

    for (const { match, lineNumber } of matches) {
      const structName = match[3];
      const derives = this.extractDerives(content, match.index!);
      const structBody = this.extractStructBody(content, match.index!);
      const fields = this.parseStructFields(structBody);
      const endLine = this.findBlockEndLineAt(content, match.index!, lineNumber);

      structs.push({
        name: structName,
        startLine: lineNumber,
        endLine,
        fields,
        traits: [],
        derives
      });
    }

    return structs;
  }

  private parseTraits(content: string, lines: string[]): RustCodeStructure['traits'] {
    const traits: RustCodeStructure['traits'] = [];

    const traitRegex = /^(\s*)(?:(pub(?:\([^)]*\))?)\s+)?trait\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
    const matches = this.extractMatchesWithLines(content, traitRegex);

    for (const { match, lineNumber } of matches) {
      const traitName = match[3];
      const endLine = this.findBlockEndLineAt(content, match.index!, lineNumber);
      const traitBody = this.extractLines(content, lineNumber, endLine);
      const methods = this.extractMethodNames(traitBody);
      const associatedTypes = this.extractTypeNames(traitBody);

      traits.push({
        name: traitName,
        startLine: lineNumber,
        endLine,
        methods,
        associatedTypes
      });
    }

    return traits;
  }

  private parseImpls(content: string, lines: string[]): RustCodeStructure['impls'] {
    const impls: RustCodeStructure['impls'] = [];

    const implRegex = /^(\s*)impl(?:\s*<[^>]*>)?\s+(?:([a-zA-Z_][a-zA-Z0-9_:<>]*)\s+for\s+)?([a-zA-Z_][a-zA-Z0-9_:<>]*)/;
    const matches = this.extractMatchesWithLines(content, implRegex);

    for (const { match, lineNumber } of matches) {
      const trait = match[2];
      const target = match[3];
      const endLine = this.findBlockEndLineAt(content, match.index!, lineNumber);
      const implBody = this.extractLines(content, lineNumber, endLine);
      const methods = this.extractMethodNames(implBody);

      impls.push({
        target,
        trait,
        startLine: lineNumber,
        endLine,
        methods
      });
    }

    return impls;
  }

  private parseMacros(content: string, lines: string[]): RustCodeStructure['macros'] {
    const macros: RustCodeStructure['macros'] = [];

    const macroRegex = /^(\s*)(?:(pub(?:\([^)]*\))?)\s+)?macro_rules!\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
    const matches = this.extractMatchesWithLines(content, macroRegex);

    for (const { match, lineNumber } of matches) {
      const macroName = match[3];
      const endLine = this.findBlockEndLineAt(content, match.index!, lineNumber);

      macros.push({
        name: macroName,
        startLine: lineNumber,
        endLine,
        type: 'declarative'
      });
    }

    return macros;
  }

  private parseModules(content: string, lines: string[]): RustCodeStructure['modules'] {
    const modules: RustCodeStructure['modules'] = [];

    const modRegex = /^(\s*)(?:(pub(?:\([^)]*\))?)\s+)?mod\s+([a-zA-Z_][a-zA-Z0-9_]*)/;
    const matches = this.extractMatchesWithLines(content, modRegex);

    for (const { match, lineNumber } of matches) {
      const isPublic = match[2] !== undefined;
      const moduleName = match[3];
      const endLine = this.findBlockEndLineAt(content, match.index!, lineNumber);

      modules.push({
        name: moduleName,
        startLine: lineNumber,
        endLine,
        isPublic
      });
    }

    return modules;
  }

  private analyzePatterns(content: string, structure: RustCodeStructure): string[] {
    const patterns: string[] = [];

    if (structure.functions.some((f: any) => f.isAsync) || /await/.test(content)) {
      patterns.push('async-await');
    }
    if (/Result</.test(content) || /\?/.test(content)) {
      patterns.push('error-handling');
    }
    if (/Option</.test(content)) {
      patterns.push('option-pattern');
    }
    if (/&mut\s/.test(content)) {
      patterns.push('mutable-reference');
    }
    if (/&\w+/.test(content)) {
      patterns.push('immutable-reference');
    }
    if (/dyn\s+/.test(content)) {
      patterns.push('trait-objects');
    }
    if (/<[A-Z]/.test(content)) {
      patterns.push('generics');
    }
    if (/\w+!/.test(content)) {
      patterns.push('macros');
    }

    return patterns;
  }

  // Rust-specific helper methods
  private extractCrateName(filePath: string): string | undefined {
    const parts = filePath.split('/');
    const projectIndex = parts.findIndex(part => part === 'src');
    return projectIndex > 0 ? parts[projectIndex - 1] : undefined;
  }

  private extractDerives(content: string, startIndex: number): string[] {
    const beforeStruct = content.substring(Math.max(0, startIndex - 200), startIndex);
    const deriveMatch = beforeStruct.match(/#\[derive\(([^)]+)\)\]/);
    return deriveMatch ? deriveMatch[1].split(',').map(d => d.trim()) : [];
  }

  private extractStructBody(content: string, startIndex: number): string {
    const { content: blockContent } = this.extractBlockContent(content, startIndex);
    return blockContent;
  }

  private parseStructFields(structBody: string): string[] {
    const fields: string[] = [];
    const lines = this.splitLines(structBody);

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('#')) {
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > 0) {
          const fieldName = trimmed.substring(0, colonIndex).trim();
          if (fieldName) fields.push(fieldName);
        }
      }
    }

    return fields;
  }

  private extractMethodNames(body: string): string[] {
    const methods: string[] = [];
    const fnRegex = /fn\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;

    while ((match = fnRegex.exec(body)) !== null) {
      methods.push(match[1]);
    }

    return methods;
  }

  private extractTypeNames(body: string): string[] {
    const types: string[] = [];
    const typeRegex = /type\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;

    while ((match = typeRegex.exec(body)) !== null) {
      types.push(match[1]);
    }

    return types;
  }

  private findBlockEndLineAt(content: string, startIndex: number, startLine: number): number {
    const afterStart = content.substring(startIndex);
    const braceIndex = afterStart.indexOf('{');

    if (braceIndex === -1) return startLine;

    const { endIndex } = this.extractBlockContent(content, startIndex + braceIndex);
    return this.getLineNumberFromIndex(content, endIndex);
  }
}
