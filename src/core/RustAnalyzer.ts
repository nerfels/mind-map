import { readFile } from 'fs/promises';
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
 */
export class RustAnalyzer {
  private supportedExtensions: Set<string>;

  constructor() {
    this.supportedExtensions = new Set(['rs']);
  }

  canAnalyze(filePath: string): boolean {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return extension ? this.supportedExtensions.has(extension) : false;
  }

  async analyzeFile(filePath: string): Promise<RustCodeStructure | null> {
    if (!this.canAnalyze(filePath)) {
      return null;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      return await this.parseCode(content, filePath);
    } catch (error) {
      console.warn(`Failed to analyze Rust file ${filePath}:`, error);
      return null;
    }
  }

  private async parseCode(content: string, filePath: string): Promise<RustCodeStructure> {
    const lines = content.split('\n');
    
    const result: RustCodeStructure = {
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

    // Add metadata for language and framework detection
    (result as any).language = 'rust';
    (result as any).framework = this.detectFramework(content, filePath);

    // Parse crate name from Cargo.toml in parent directories
    result.crateName = this.extractCrateName(filePath);

    // Parse imports (use statements)
    result.rustImports = this.parseImports(content, lines);
    result.imports = result.rustImports.map(imp => ({
      module: imp.path,
      path: imp.alias,
      type: imp.isGlob ? 'namespace' as const : (imp.alias ? 'named' as const : 'default' as const)
    }));

    // Parse functions
    result.functions = this.parseFunctions(content, lines);

    // Parse structs
    result.structs = this.parseStructs(content, lines);

    // Parse traits
    result.traits = this.parseTraits(content, lines);

    // Parse implementations
    result.impls = this.parseImpls(content, lines);

    // Parse macros
    result.macros = this.parseMacros(content, lines);

    // Parse modules
    result.modules = this.parseModules(content, lines);

    // Add pattern analysis
    (result as any).patterns = this.analyzePatterns(content, result);

    return result;
  }

  private parseImports(content: string, lines: string[]): Array<{
    path: string;
    alias?: string;
    isExternal?: boolean;
    isGlob?: boolean;
  }> {
    const imports: Array<{
      path: string;
      alias?: string;
      isExternal?: boolean;
      isGlob?: boolean;
    }> = [];

    // Match use statements
    const useRegex = /^\s*(?:pub\s+)?use\s+([^;]+);/gm;
    let match;

    while ((match = useRegex.exec(content)) !== null) {
      const importStr = match[1].trim();
      
      // Handle glob imports
      if (importStr.includes('*')) {
        imports.push({
          path: importStr.replace(/\s*\*$/, ''),
          isGlob: true,
          isExternal: !importStr.startsWith('crate::') && !importStr.startsWith('super::') && !importStr.startsWith('self::')
        });
      }
      // Handle aliased imports
      else if (importStr.includes(' as ')) {
        const [path, alias] = importStr.split(' as ').map(s => s.trim());
        imports.push({
          path,
          alias,
          isExternal: !path.startsWith('crate::') && !path.startsWith('super::') && !path.startsWith('self::')
        });
      }
      // Handle regular imports
      else {
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
    const functions: Array<{
      name: string;
      startLine: number;
      endLine: number;
      parameters: string[];
      returnType?: string;
      isAsync?: boolean;
      isPublic?: boolean;
      isUnsafe?: boolean;
    }> = [];

    // Match function definitions
    const fnRegex = /^(\s*)(?:(pub(?:\([^)]*\))?)\s+)?(?:(async)\s+)?(?:(unsafe)\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)(?:\s*->\s*([^{]+))?/gm;
    let match;

    while ((match = fnRegex.exec(content)) !== null) {
      const indent = match[1];
      const isPublic = match[2] !== undefined;
      const isAsync = match[3] !== undefined;
      const isUnsafe = match[4] !== undefined;
      const functionName = match[5];
      const params = match[6];
      const returnType = match[7]?.trim();

      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = this.findFunctionEndLine(content, match.index, lines, startLine);

      // Parse parameters
      const parameters = params
        .split(',')
        .map(param => param.trim())
        .filter(param => param && !param.startsWith('//'))
        .map(param => {
          // Handle self parameters
          if (param === 'self' || param === '&self' || param === '&mut self') {
            return param;
          }
          // Handle typed parameters
          const colonIndex = param.indexOf(':');
          if (colonIndex > 0) {
            return param.substring(0, colonIndex).trim();
          }
          return param;
        });

      functions.push({
        name: functionName,
        startLine,
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

  private parseStructs(content: string, lines: string[]): Array<{
    name: string;
    startLine: number;
    endLine: number;
    fields: string[];
    traits: string[];
    derives: string[];
  }> {
    const structs: Array<{
      name: string;
      startLine: number;
      endLine: number;
      fields: string[];
      traits: string[];
      derives: string[];
    }> = [];

    // Match struct definitions
    const structRegex = /^(\s*)(?:#\[derive\([^)]+\)\]\s*)?(?:(pub(?:\([^)]*\))?)\s+)?struct\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm;
    let match;

    while ((match = structRegex.exec(content)) !== null) {
      const structName = match[3];
      const startLine = content.substring(0, match.index).split('\n').length;
      
      // Find derive attributes
      const derives = this.extractDerives(content, match.index);
      
      // Find struct body and fields
      const structBody = this.extractStructBody(content, match.index);
      const fields = this.parseStructFields(structBody);
      
      const endLine = this.findStructEndLine(content, match.index, lines, startLine);

      structs.push({
        name: structName,
        startLine,
        endLine,
        fields,
        traits: [], // Will be populated by impl analysis
        derives
      });
    }

    return structs;
  }

  private parseTraits(content: string, lines: string[]): Array<{
    name: string;
    startLine: number;
    endLine: number;
    methods: string[];
    associatedTypes: string[];
  }> {
    const traits: Array<{
      name: string;
      startLine: number;
      endLine: number;
      methods: string[];
      associatedTypes: string[];
    }> = [];

    // Match trait definitions
    const traitRegex = /^(\s*)(?:(pub(?:\([^)]*\))?)\s+)?trait\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm;
    let match;

    while ((match = traitRegex.exec(content)) !== null) {
      const traitName = match[3];
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = this.findTraitEndLine(content, match.index, lines, startLine);
      
      // Extract trait methods and associated types
      const traitBody = this.extractTraitBody(content, match.index, endLine);
      const methods = this.parseTraitMethods(traitBody);
      const associatedTypes = this.parseAssociatedTypes(traitBody);

      traits.push({
        name: traitName,
        startLine,
        endLine,
        methods,
        associatedTypes
      });
    }

    return traits;
  }

  private parseImpls(content: string, lines: string[]): Array<{
    target: string;
    trait?: string;
    startLine: number;
    endLine: number;
    methods: string[];
  }> {
    const impls: Array<{
      target: string;
      trait?: string;
      startLine: number;
      endLine: number;
      methods: string[];
    }> = [];

    // Match impl blocks
    const implRegex = /^(\s*)impl(?:\s*<[^>]*>)?\s+(?:([a-zA-Z_][a-zA-Z0-9_:<>]*)\s+for\s+)?([a-zA-Z_][a-zA-Z0-9_:<>]*)/gm;
    let match;

    while ((match = implRegex.exec(content)) !== null) {
      const trait = match[2];
      const target = match[3];
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = this.findImplEndLine(content, match.index, lines, startLine);
      
      // Extract impl methods
      const implBody = this.extractImplBody(content, match.index, endLine);
      const methods = this.parseImplMethods(implBody);

      impls.push({
        target,
        trait,
        startLine,
        endLine,
        methods
      });
    }

    return impls;
  }

  private parseMacros(content: string, lines: string[]): Array<{
    name: string;
    startLine: number;
    endLine: number;
    type: 'declarative' | 'procedural';
  }> {
    const macros: Array<{
      name: string;
      startLine: number;
      endLine: number;
      type: 'declarative' | 'procedural';
    }> = [];

    // Match macro definitions
    const macroRegex = /^(\s*)(?:(pub(?:\([^)]*\))?)\s+)?macro_rules!\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm;
    let match;

    while ((match = macroRegex.exec(content)) !== null) {
      const macroName = match[3];
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = this.findMacroEndLine(content, match.index, lines, startLine);

      macros.push({
        name: macroName,
        startLine,
        endLine,
        type: 'declarative'
      });
    }

    return macros;
  }

  private parseModules(content: string, lines: string[]): Array<{
    name: string;
    startLine: number;
    endLine: number;
    isPublic: boolean;
  }> {
    const modules: Array<{
      name: string;
      startLine: number;
      endLine: number;
      isPublic: boolean;
    }> = [];

    // Match module definitions
    const modRegex = /^(\s*)(?:(pub(?:\([^)]*\))?)\s+)?mod\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm;
    let match;

    while ((match = modRegex.exec(content)) !== null) {
      const isPublic = match[2] !== undefined;
      const moduleName = match[3];
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = this.findModuleEndLine(content, match.index, lines, startLine);

      modules.push({
        name: moduleName,
        startLine,
        endLine,
        isPublic
      });
    }

    return modules;
  }

  private detectFramework(content: string, filePath: string): string | undefined {
    const frameworks: Array<{ name: string; patterns: RegExp[] }> = [
      {
        name: 'actix-web',
        patterns: [
          /use\s+actix_web::/,
          /actix_web::/,
          /#\[actix_web::/
        ]
      },
      {
        name: 'tokio',
        patterns: [
          /use\s+tokio::/,
          /#\[tokio::/,
          /tokio::/
        ]
      },
      {
        name: 'serde',
        patterns: [
          /use\s+serde::/,
          /#\[derive\([^)]*Serialize/,
          /#\[derive\([^)]*Deserialize/,
          /#\[serde/
        ]
      },
      {
        name: 'diesel',
        patterns: [
          /use\s+diesel::/,
          /#\[derive\([^)]*Queryable/,
          /#\[diesel/
        ]
      },
      {
        name: 'warp',
        patterns: [
          /use\s+warp::/,
          /warp::/
        ]
      },
      {
        name: 'axum',
        patterns: [
          /use\s+axum::/,
          /axum::/
        ]
      },
      {
        name: 'clap',
        patterns: [
          /use\s+clap::/,
          /#\[derive\([^)]*Parser/,
          /#\[clap/
        ]
      },
      {
        name: 'rocket',
        patterns: [
          /use\s+rocket::/,
          /#\[rocket::/,
          /rocket::/
        ]
      }
    ];

    for (const framework of frameworks) {
      if (framework.patterns.some(pattern => pattern.test(content))) {
        return framework.name;
      }
    }

    return undefined;
  }

  private analyzePatterns(content: string, structure: RustCodeStructure): string[] {
    const patterns: string[] = [];

    // Async patterns
    if (structure.functions.some((f: any) => f.isAsync) || /await/.test(content)) {
      patterns.push('async-await');
    }

    // Error handling patterns
    if (/Result</.test(content) || /\?/.test(content)) {
      patterns.push('error-handling');
    }

    // Option patterns
    if (/Option</.test(content)) {
      patterns.push('option-pattern');
    }

    // Ownership patterns
    if (/&mut\s/.test(content)) {
      patterns.push('mutable-reference');
    }
    if (/&\w+/.test(content)) {
      patterns.push('immutable-reference');
    }

    // Trait object patterns
    if (/dyn\s+/.test(content)) {
      patterns.push('trait-objects');
    }

    // Generic patterns
    if (/<[A-Z]/.test(content)) {
      patterns.push('generics');
    }

    // Macro usage patterns
    if (/\w+!/.test(content)) {
      patterns.push('macros');
    }

    return patterns;
  }

  // Helper methods for parsing body content and finding end lines
  private extractCrateName(filePath: string): string | undefined {
    // Simple extraction - would need to read Cargo.toml in real implementation
    const parts = filePath.split('/');
    const projectIndex = parts.findIndex(part => part === 'src');
    if (projectIndex > 0) {
      return parts[projectIndex - 1];
    }
    return undefined;
  }

  private extractDerives(content: string, startIndex: number): string[] {
    const beforeStruct = content.substring(Math.max(0, startIndex - 200), startIndex);
    const deriveMatch = beforeStruct.match(/#\[derive\(([^)]+)\)\]/);
    if (deriveMatch) {
      return deriveMatch[1].split(',').map(d => d.trim());
    }
    return [];
  }

  private extractStructBody(content: string, startIndex: number): string {
    const afterStruct = content.substring(startIndex);
    const braceIndex = afterStruct.indexOf('{');
    if (braceIndex === -1) return '';
    
    let braceCount = 0;
    let endIndex = braceIndex;
    
    for (let i = braceIndex; i < afterStruct.length; i++) {
      if (afterStruct[i] === '{') braceCount++;
      else if (afterStruct[i] === '}') braceCount--;
      
      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }
    
    return afterStruct.substring(braceIndex + 1, endIndex);
  }

  private parseStructFields(structBody: string): string[] {
    const fields: string[] = [];
    const lines = structBody.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('#')) {
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > 0) {
          const fieldName = trimmed.substring(0, colonIndex).trim();
          if (fieldName) {
            fields.push(fieldName);
          }
        }
      }
    }
    
    return fields;
  }

  private extractTraitBody(content: string, startIndex: number, endLine: number): string {
    const lines = content.split('\n');
    const startLineIndex = content.substring(0, startIndex).split('\n').length - 1;
    return lines.slice(startLineIndex, endLine).join('\n');
  }

  private parseTraitMethods(traitBody: string): string[] {
    const methods: string[] = [];
    const fnRegex = /fn\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    
    while ((match = fnRegex.exec(traitBody)) !== null) {
      methods.push(match[1]);
    }
    
    return methods;
  }

  private parseAssociatedTypes(traitBody: string): string[] {
    const types: string[] = [];
    const typeRegex = /type\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    
    while ((match = typeRegex.exec(traitBody)) !== null) {
      types.push(match[1]);
    }
    
    return types;
  }

  private extractImplBody(content: string, startIndex: number, endLine: number): string {
    const lines = content.split('\n');
    const startLineIndex = content.substring(0, startIndex).split('\n').length - 1;
    return lines.slice(startLineIndex, endLine).join('\n');
  }

  private parseImplMethods(implBody: string): string[] {
    const methods: string[] = [];
    const fnRegex = /fn\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    
    while ((match = fnRegex.exec(implBody)) !== null) {
      methods.push(match[1]);
    }
    
    return methods;
  }

  private findFunctionEndLine(content: string, startIndex: number, lines: string[], startLine: number): number {
    return this.findBlockEndLine(content, startIndex, lines, startLine);
  }

  private findStructEndLine(content: string, startIndex: number, lines: string[], startLine: number): number {
    return this.findBlockEndLine(content, startIndex, lines, startLine);
  }

  private findTraitEndLine(content: string, startIndex: number, lines: string[], startLine: number): number {
    return this.findBlockEndLine(content, startIndex, lines, startLine);
  }

  private findImplEndLine(content: string, startIndex: number, lines: string[], startLine: number): number {
    return this.findBlockEndLine(content, startIndex, lines, startLine);
  }

  private findMacroEndLine(content: string, startIndex: number, lines: string[], startLine: number): number {
    return this.findBlockEndLine(content, startIndex, lines, startLine);
  }

  private findModuleEndLine(content: string, startIndex: number, lines: string[], startLine: number): number {
    return this.findBlockEndLine(content, startIndex, lines, startLine);
  }

  private findBlockEndLine(content: string, startIndex: number, lines: string[], startLine: number): number {
    const afterStart = content.substring(startIndex);
    const braceIndex = afterStart.indexOf('{');
    
    if (braceIndex === -1) {
      // No brace found, might be a single-line item
      return startLine;
    }
    
    let braceCount = 0;
    let currentIndex = startIndex + braceIndex;
    
    for (let i = braceIndex; i < afterStart.length; i++) {
      if (afterStart[i] === '{') {
        braceCount++;
      } else if (afterStart[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          currentIndex = startIndex + i;
          break;
        }
      }
    }
    
    return content.substring(0, currentIndex).split('\n').length;
  }
}