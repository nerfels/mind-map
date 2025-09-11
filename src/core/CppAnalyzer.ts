import { readFile } from 'fs/promises';
import { CodeStructure } from '../types/index.js';

export interface CppCodeStructure extends CodeStructure {
  cppIncludes: Array<{
    path: string;
    isSystem?: boolean;
    isLocal?: boolean;
    isQuoted?: boolean;
  }>;
  namespaces: Array<{
    name: string;
    startLine: number;
    endLine: number;
    isAnonymous?: boolean;
  }>;
  structs: Array<{
    name: string;
    startLine: number;
    endLine: number;
    fields: string[];
    methods: string[];
    inheritance: string[];
    accessLevel: 'public' | 'private' | 'protected';
  }>;
  enums: Array<{
    name: string;
    startLine: number;
    endLine: number;
    values: string[];
    isClass?: boolean;
  }>;
  typedefs: Array<{
    name: string;
    type: string;
    startLine: number;
  }>;
  macros: Array<{
    name: string;
    startLine: number;
    parameters?: string[];
    isFunction?: boolean;
  }>;
  templates: Array<{
    name: string;
    startLine: number;
    endLine: number;
    parameters: string[];
    type: 'class' | 'function';
  }>;
  buildSystem?: string;
}

/**
 * C/C++ AST Analyzer using regex-based parsing approach with Tree-sitter concepts
 * Extracts C/C++ code structure including functions, classes, structs, templates, and namespaces
 */
export class CppAnalyzer {
  private supportedExtensions: Set<string>;

  constructor() {
    this.supportedExtensions = new Set(['c', 'cpp', 'cc', 'cxx', 'c++', 'h', 'hpp', 'hxx', 'h++']);
  }

  canAnalyze(filePath: string): boolean {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return extension ? this.supportedExtensions.has(extension) : false;
  }

  async analyzeFile(filePath: string): Promise<CppCodeStructure | null> {
    if (!this.canAnalyze(filePath)) {
      return null;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      return await this.parseCode(content, filePath);
    } catch (error) {
      console.warn(`Failed to analyze C/C++ file ${filePath}:`, error);
      return null;
    }
  }

  private async parseCode(content: string, filePath: string): Promise<CppCodeStructure> {
    const lines = content.split('\n');
    
    const result: CppCodeStructure = {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      cppIncludes: [],
      namespaces: [],
      structs: [],
      enums: [],
      typedefs: [],
      macros: [],
      templates: [],
    };

    // Add metadata for language and framework detection
    (result as any).language = this.detectLanguage(filePath);
    (result as any).framework = this.detectFramework(content, filePath);
    result.buildSystem = this.detectBuildSystem(filePath);

    // Parse includes (#include statements)
    result.cppIncludes = this.parseIncludes(content, lines);
    result.imports = result.cppIncludes.map(inc => ({
      module: inc.path,
      path: inc.path,
      type: inc.isSystem ? 'namespace' as const : 'named' as const
    }));

    // Parse functions
    result.functions = this.parseFunctions(content, lines);

    // Parse classes
    result.classes = this.parseClasses(content, lines);

    // Parse structs
    result.structs = this.parseStructs(content, lines);

    // Parse namespaces
    result.namespaces = this.parseNamespaces(content, lines);

    // Parse enums
    result.enums = this.parseEnums(content, lines);

    // Parse typedefs
    result.typedefs = this.parseTypedefs(content, lines);

    // Parse macros
    result.macros = this.parseMacros(content, lines);

    // Parse templates
    result.templates = this.parseTemplates(content, lines);

    // Add pattern analysis
    (result as any).patterns = this.analyzePatterns(content, result);

    return result;
  }

  private parseIncludes(content: string, lines: string[]): Array<{
    path: string;
    isSystem?: boolean;
    isLocal?: boolean;
    isQuoted?: boolean;
  }> {
    const includes: Array<{
      path: string;
      isSystem?: boolean;
      isLocal?: boolean;
      isQuoted?: boolean;
    }> = [];

    // Match #include statements
    const includeRegex = /^\s*#include\s*([<"])([^">]+)[">]/gm;
    let match;

    while ((match = includeRegex.exec(content)) !== null) {
      const bracket = match[1];
      const path = match[2];

      includes.push({
        path,
        isSystem: bracket === '<',
        isLocal: bracket === '"',
        isQuoted: bracket === '"'
      });
    }

    return includes;
  }

  private parseFunctions(content: string, lines: string[]): Array<{
    name: string;
    startLine: number;
    endLine: number;
    parameters: string[];
    returnType?: string;
    isInline?: boolean;
    isStatic?: boolean;
    isVirtual?: boolean;
    isConst?: boolean;
    isTemplate?: boolean;
  }> {
    const functions: Array<{
      name: string;
      startLine: number;
      endLine: number;
      parameters: string[];
      returnType?: string;
      isInline?: boolean;
      isStatic?: boolean;
      isVirtual?: boolean;
      isConst?: boolean;
      isTemplate?: boolean;
    }> = [];

    // Match function definitions (C and C++)
    const funcRegex = /^(\s*)(?:(template\s*<[^>]*>\s*))?((?:inline\s+)?(?:static\s+)?(?:virtual\s+)?(?:explicit\s+)?)([a-zA-Z_][a-zA-Z0-9_]*(?:\s*::\s*[a-zA-Z_][a-zA-Z0-9_]*)*(?:\s*<[^>]*>)?)?\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*(const)?\s*(?:override)?\s*(?:final)?\s*(?:->\s*[^{;]+)?\s*[{;]/gm;
    let match;

    while ((match = funcRegex.exec(content)) !== null) {
      const indent = match[1];
      const templateDecl = match[2];
      const modifiers = match[3] || '';
      const returnType = match[4];
      const functionName = match[5];
      const params = match[6];
      const isConst = match[7] !== undefined;

      // Skip constructors and destructors in class context
      if (!returnType && (functionName.includes('::') || functionName.startsWith('~'))) {
        continue;
      }

      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = this.findFunctionEndLine(content, match.index!, lines, startLine);

      // Parse parameters
      const parameters = params
        .split(',')
        .map(param => param.trim())
        .filter(param => param && !param.startsWith('//'))
        .map(param => {
          // Extract parameter name from type declaration
          const parts = param.trim().split(/\s+/);
          return parts[parts.length - 1].replace(/[*&\[\]]/g, '');
        })
        .filter(param => param);

      functions.push({
        name: functionName,
        startLine,
        endLine,
        parameters,
        returnType: returnType?.trim(),
        isInline: modifiers.includes('inline'),
        isStatic: modifiers.includes('static'),
        isVirtual: modifiers.includes('virtual'),
        isConst,
        isTemplate: templateDecl !== undefined
      } as any);
    }

    return functions;
  }

  private parseClasses(content: string, lines: string[]): Array<{
    name: string;
    startLine: number;
    endLine: number;
    methods: string[];
    properties: string[];
    inheritance: string[];
    accessLevel: 'public' | 'private' | 'protected';
    isTemplate?: boolean;
  }> {
    const classes: Array<{
      name: string;
      startLine: number;
      endLine: number;
      methods: string[];
      properties: string[];
      inheritance: string[];
      accessLevel: 'public' | 'private' | 'protected';
      isTemplate?: boolean;
    }> = [];

    // Match class definitions
    const classRegex = /^(\s*)(?:(template\s*<[^>]*>\s*))?class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::\s*([^{]+))?\s*\{/gm;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const templateDecl = match[2];
      const className = match[3];
      const inheritance = match[4]?.trim() || '';

      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = this.findClassEndLine(content, match.index!, lines, startLine);

      // Extract class body for methods and properties analysis
      const classBody = this.extractClassBody(content, match.index!, endLine);
      const methods = this.parseClassMethods(classBody);
      const properties = this.parseClassProperties(classBody);

      // Parse inheritance
      const inheritanceList = inheritance
        ? inheritance.split(',').map(base => base.trim().replace(/^(public|private|protected)\s+/, ''))
        : [];

      classes.push({
        name: className,
        startLine,
        endLine,
        methods,
        properties,
        inheritance: inheritanceList,
        accessLevel: 'private' as const, // C++ classes default to private
        isTemplate: templateDecl !== undefined
      });
    }

    return classes;
  }

  private parseStructs(content: string, lines: string[]): Array<{
    name: string;
    startLine: number;
    endLine: number;
    fields: string[];
    methods: string[];
    inheritance: string[];
    accessLevel: 'public' | 'private' | 'protected';
  }> {
    const structs: Array<{
      name: string;
      startLine: number;
      endLine: number;
      fields: string[];
      methods: string[];
      inheritance: string[];
      accessLevel: 'public' | 'private' | 'protected';
    }> = [];

    // Match struct definitions
    const structRegex = /^(\s*)(?:(template\s*<[^>]*>\s*))?struct\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::\s*([^{]+))?\s*\{/gm;
    let match;

    while ((match = structRegex.exec(content)) !== null) {
      const structName = match[3];
      const inheritance = match[4]?.trim() || '';

      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = this.findStructEndLine(content, match.index!, lines, startLine);

      // Extract struct body
      const structBody = this.extractStructBody(content, match.index!, endLine);
      const fields = this.parseStructFields(structBody);
      const methods = this.parseClassMethods(structBody); // Structs can have methods in C++

      // Parse inheritance
      const inheritanceList = inheritance
        ? inheritance.split(',').map(base => base.trim().replace(/^(public|private|protected)\s+/, ''))
        : [];

      structs.push({
        name: structName,
        startLine,
        endLine,
        fields,
        methods,
        inheritance: inheritanceList,
        accessLevel: 'public' as const // C++ structs default to public
      });
    }

    return structs;
  }

  private parseNamespaces(content: string, lines: string[]): Array<{
    name: string;
    startLine: number;
    endLine: number;
    isAnonymous?: boolean;
  }> {
    const namespaces: Array<{
      name: string;
      startLine: number;
      endLine: number;
      isAnonymous?: boolean;
    }> = [];

    // Match namespace definitions
    const nsRegex = /^(\s*)namespace\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/gm;
    let match;

    while ((match = nsRegex.exec(content)) !== null) {
      const namespaceName = match[2];
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = this.findNamespaceEndLine(content, match.index!, lines, startLine);

      namespaces.push({
        name: namespaceName,
        startLine,
        endLine,
        isAnonymous: false
      });
    }

    // Match anonymous namespaces
    const anonNsRegex = /^(\s*)namespace\s*\{/gm;
    while ((match = anonNsRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = this.findNamespaceEndLine(content, match.index!, lines, startLine);

      namespaces.push({
        name: 'anonymous',
        startLine,
        endLine,
        isAnonymous: true
      });
    }

    return namespaces;
  }

  private parseEnums(content: string, lines: string[]): Array<{
    name: string;
    startLine: number;
    endLine: number;
    values: string[];
    isClass?: boolean;
  }> {
    const enums: Array<{
      name: string;
      startLine: number;
      endLine: number;
      values: string[];
      isClass?: boolean;
    }> = [];

    // Match enum definitions (both enum and enum class)
    const enumRegex = /^(\s*)enum\s+(class\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::\s*[^{]+)?\s*\{([^}]+)\}/gm;
    let match;

    while ((match = enumRegex.exec(content)) !== null) {
      const isClass = match[2] !== undefined;
      const enumName = match[3];
      const enumBody = match[4];
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = startLine + enumBody.split('\n').length - 1;

      // Parse enum values
      const values = enumBody
        .split(',')
        .map(value => value.trim().split(/\s*=\s*/)[0].trim())
        .filter(value => value && !value.startsWith('//'));

      enums.push({
        name: enumName,
        startLine,
        endLine,
        values,
        isClass
      });
    }

    return enums;
  }

  private parseTypedefs(content: string, lines: string[]): Array<{
    name: string;
    type: string;
    startLine: number;
  }> {
    const typedefs: Array<{
      name: string;
      type: string;
      startLine: number;
    }> = [];

    // Match typedef statements
    const typedefRegex = /^(\s*)typedef\s+(.+?)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/gm;
    let match;

    while ((match = typedefRegex.exec(content)) !== null) {
      const type = match[2].trim();
      const name = match[3];
      const startLine = content.substring(0, match.index).split('\n').length;

      typedefs.push({
        name,
        type,
        startLine
      });
    }

    // Match using aliases (C++11+)
    const usingRegex = /^(\s*)using\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+?);/gm;
    while ((match = usingRegex.exec(content)) !== null) {
      const name = match[2];
      const type = match[3].trim();
      const startLine = content.substring(0, match.index).split('\n').length;

      typedefs.push({
        name,
        type,
        startLine
      });
    }

    return typedefs;
  }

  private parseMacros(content: string, lines: string[]): Array<{
    name: string;
    startLine: number;
    parameters?: string[];
    isFunction?: boolean;
  }> {
    const macros: Array<{
      name: string;
      startLine: number;
      parameters?: string[];
      isFunction?: boolean;
    }> = [];

    // Match #define macros
    const macroRegex = /^(\s*)#define\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\(([^)]*)\))?\s*(.*)?$/gm;
    let match;

    while ((match = macroRegex.exec(content)) !== null) {
      const macroName = match[2];
      const params = match[3];
      const startLine = content.substring(0, match.index).split('\n').length;

      const parameters = params
        ? params.split(',').map(p => p.trim()).filter(p => p)
        : undefined;

      macros.push({
        name: macroName,
        startLine,
        parameters,
        isFunction: params !== undefined
      });
    }

    return macros;
  }

  private parseTemplates(content: string, lines: string[]): Array<{
    name: string;
    startLine: number;
    endLine: number;
    parameters: string[];
    type: 'class' | 'function';
  }> {
    const templates: Array<{
      name: string;
      startLine: number;
      endLine: number;
      parameters: string[];
      type: 'class' | 'function';
    }> = [];

    // Match template declarations
    const templateRegex = /^(\s*)template\s*<([^>]+)>\s*(?:(class|struct)\s+([a-zA-Z_][a-zA-Z0-9_]*)|([a-zA-Z_][a-zA-Z0-9_]*(?:\s*::\s*[a-zA-Z_][a-zA-Z0-9_]*)*(?:\s*<[^>]*>)?)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\()/gm;
    let match;

    while ((match = templateRegex.exec(content)) !== null) {
      const templateParams = match[2];
      const classKeyword = match[3];
      const className = match[4];
      const functionName = match[6];

      const name = className || functionName;
      const type = classKeyword ? 'class' as const : 'function' as const;

      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = this.findTemplateEndLine(content, match.index!, lines, startLine);

      // Parse template parameters
      const parameters = templateParams
        .split(',')
        .map(param => param.trim().replace(/^(class|typename)\s+/, ''))
        .filter(param => param);

      templates.push({
        name,
        startLine,
        endLine,
        parameters,
        type
      });
    }

    return templates;
  }

  private detectLanguage(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    if (['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hxx', 'h++'].includes(extension || '')) {
      return 'cpp';
    }
    return 'c';
  }

  private detectFramework(content: string, filePath: string): string | undefined {
    const frameworks: Array<{ name: string; patterns: RegExp[] }> = [
      {
        name: 'qt',
        patterns: [
          /#include\s*<Q[A-Z]/,
          /#include\s*["']Q[A-Z]/,
          /Q_OBJECT/,
          /QApplication/,
          /QWidget/
        ]
      },
      {
        name: 'boost',
        patterns: [
          /#include\s*<boost\//,
          /boost::/,
          /BOOST_/
        ]
      },
      {
        name: 'opencv',
        patterns: [
          /#include\s*<opencv2?\/[opencv]/,
          /cv::/,
          /CV_/
        ]
      },
      {
        name: 'eigen',
        patterns: [
          /#include\s*<Eigen\//,
          /Eigen::/
        ]
      },
      {
        name: 'poco',
        patterns: [
          /#include\s*["']Poco\//,
          /Poco::/
        ]
      },
      {
        name: 'catch2',
        patterns: [
          /#include\s*<catch2\/catch/,
          /TEST_CASE/,
          /REQUIRE\(/
        ]
      },
      {
        name: 'gtest',
        patterns: [
          /#include\s*<gtest\/gtest/,
          /TEST\(/,
          /EXPECT_/,
          /ASSERT_/
        ]
      },
      {
        name: 'mfc',
        patterns: [
          /#include\s*<afx/,
          /CWinApp/,
          /CDialog/
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

  private detectBuildSystem(filePath: string): string | undefined {
    // This would need to check parent directories for build files
    const fileName = filePath.split('/').pop()?.toLowerCase() || '';
    
    if (fileName === 'cmakeLists.txt' || fileName === 'makefile' || fileName.endsWith('.cmake')) {
      return 'cmake';
    }
    
    // Could be extended to check for other build systems
    return undefined;
  }

  private analyzePatterns(content: string, structure: CppCodeStructure): string[] {
    const patterns: string[] = [];

    // Template patterns
    if (structure.templates.length > 0 || /<[A-Z]/.test(content)) {
      patterns.push('templates');
    }

    // STL usage patterns
    if (/std::/.test(content)) {
      patterns.push('stl-usage');
    }

    // Smart pointers
    if (/std::(unique_ptr|shared_ptr|weak_ptr)/.test(content)) {
      patterns.push('smart-pointers');
    }

    // RAII patterns
    if (/~[A-Z][a-zA-Z0-9_]*\s*\(/.test(content)) {
      patterns.push('raii');
    }

    // Exception handling
    if (/try\s*\{|catch\s*\(/.test(content)) {
      patterns.push('exception-handling');
    }

    // Lambda expressions (C++11+)
    if (/\[[^\]]*\]\s*\([^)]*\)\s*(?:->\s*[^{]+)?\s*\{/.test(content)) {
      patterns.push('lambdas');
    }

    // Move semantics (C++11+)
    if (/std::move|&&/.test(content)) {
      patterns.push('move-semantics');
    }

    // Operator overloading
    if (/operator\s*[+\-*\/=<>!%&|\^~\[\]()]/.test(content)) {
      patterns.push('operator-overloading');
    }

    return patterns;
  }

  // Helper methods for extracting bodies and finding end lines
  private extractClassBody(content: string, startIndex: number, endLine: number): string {
    const lines = content.split('\n');
    const startLineIndex = content.substring(0, startIndex).split('\n').length - 1;
    return lines.slice(startLineIndex, endLine).join('\n');
  }

  private parseClassMethods(classBody: string): string[] {
    const methods: string[] = [];
    const methodRegex = /(?:^\s*(?:public|private|protected):\s*$)?\s*(?:virtual\s+)?(?:static\s+)?(?:inline\s+)?[a-zA-Z_][a-zA-Z0-9_:<>,\s*&]*\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)/gm;
    let match;

    while ((match = methodRegex.exec(classBody)) !== null) {
      const methodName = match[1];
      if (methodName && !['if', 'while', 'for', 'switch', 'return'].includes(methodName)) {
        methods.push(methodName);
      }
    }

    return methods;
  }

  private parseClassProperties(classBody: string): string[] {
    const properties: string[] = [];
    const propRegex = /^\s*(?:public|private|protected):\s*$|^\s*(?:static\s+)?(?:const\s+)?[a-zA-Z_][a-zA-Z0-9_:<>,\s*&]*\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[;=]/gm;
    let match;

    while ((match = propRegex.exec(classBody)) !== null) {
      const propName = match[1];
      if (propName && !propName.includes('(')) {
        properties.push(propName);
      }
    }

    return properties;
  }

  private extractStructBody(content: string, startIndex: number, endLine: number): string {
    return this.extractClassBody(content, startIndex, endLine);
  }

  private parseStructFields(structBody: string): string[] {
    const fields: string[] = [];
    const lines = structBody.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && 
          !trimmed.startsWith('//') && 
          !trimmed.startsWith('/*') &&
          !trimmed.includes('(') &&
          !trimmed.startsWith('public:') &&
          !trimmed.startsWith('private:') &&
          !trimmed.startsWith('protected:')) {
        
        const fieldMatch = trimmed.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*[;=]/);
        if (fieldMatch) {
          fields.push(fieldMatch[1]);
        }
      }
    }
    
    return fields;
  }

  private findFunctionEndLine(content: string, startIndex: number, lines: string[], startLine: number): number {
    return this.findBlockEndLine(content, startIndex, lines, startLine);
  }

  private findClassEndLine(content: string, startIndex: number, lines: string[], startLine: number): number {
    return this.findBlockEndLine(content, startIndex, lines, startLine);
  }

  private findStructEndLine(content: string, startIndex: number, lines: string[], startLine: number): number {
    return this.findBlockEndLine(content, startIndex, lines, startLine);
  }

  private findNamespaceEndLine(content: string, startIndex: number, lines: string[], startLine: number): number {
    return this.findBlockEndLine(content, startIndex, lines, startLine);
  }

  private findTemplateEndLine(content: string, startIndex: number, lines: string[], startLine: number): number {
    return this.findBlockEndLine(content, startIndex, lines, startLine);
  }

  private findBlockEndLine(content: string, startIndex: number, lines: string[], startLine: number): number {
    const afterStart = content.substring(startIndex);
    const braceIndex = afterStart.indexOf('{');
    
    if (braceIndex === -1) {
      // No brace found, might be a declaration
      return startLine;
    }
    
    let braceCount = 0;
    let currentIndex = startIndex + braceIndex;
    let inString = false;
    let inComment = false;
    
    for (let i = braceIndex; i < afterStart.length; i++) {
      const char = afterStart[i];
      const nextChar = afterStart[i + 1];
      
      // Handle string literals
      if (char === '"' && !inComment) {
        inString = !inString;
        continue;
      }
      
      // Handle comments
      if (char === '/' && nextChar === '/' && !inString) {
        inComment = true;
        continue;
      }
      if (char === '\n' && inComment) {
        inComment = false;
        continue;
      }
      
      if (!inString && !inComment) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            currentIndex = startIndex + i;
            break;
          }
        }
      }
    }
    
    return content.substring(0, currentIndex).split('\n').length;
  }
}