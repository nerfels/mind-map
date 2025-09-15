import { readFile } from 'fs/promises';
import * as ts from 'typescript';
import { CodeStructure } from '../types/index.js';
import { PythonAnalyzer, PythonCodeStructure } from './PythonAnalyzer.js';
import { JavaAnalyzer, JavaCodeStructure } from './JavaAnalyzer.js';
import { GoAnalyzer, GoCodeStructure } from './GoAnalyzer.js';
import { RustAnalyzer, RustCodeStructure } from './RustAnalyzer.js';
import { CppAnalyzer, CppCodeStructure } from './CppAnalyzer.js';

export class CodeAnalyzer {
  private supportedExtensions: Set<string>;
  private pythonAnalyzer: PythonAnalyzer;
  private javaAnalyzer: JavaAnalyzer;
  private goAnalyzer: GoAnalyzer;
  private rustAnalyzer: RustAnalyzer;
  private cppAnalyzer: CppAnalyzer;

  constructor() {
    this.supportedExtensions = new Set(['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'cc', 'cxx', 'c++', 'h', 'hpp', 'hxx', 'h++']);
    this.pythonAnalyzer = new PythonAnalyzer();
    this.javaAnalyzer = new JavaAnalyzer();
    this.goAnalyzer = new GoAnalyzer();
    this.rustAnalyzer = new RustAnalyzer();
    this.cppAnalyzer = new CppAnalyzer();
  }

  canAnalyze(filePath: string): boolean {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return extension ? this.supportedExtensions.has(extension) : false;
  }

  async analyzeFile(filePath: string): Promise<CodeStructure | null> {
    if (!this.canAnalyze(filePath)) {
      return null;
    }

    const extension = filePath.split('.').pop()?.toLowerCase();
    
    try {
      // Route to appropriate analyzer based on file extension
      if (extension === 'py') {
        return await this.pythonAnalyzer.analyzeFile(filePath);
      } else if (extension === 'java') {
        return await this.javaAnalyzer.analyzeFile(filePath);
      } else if (extension === 'go') {
        return await this.goAnalyzer.analyzeFile(filePath);
      } else if (extension === 'rs') {
        return await this.rustAnalyzer.analyzeFile(filePath);
      } else if (extension && ['c', 'cpp', 'cc', 'cxx', 'c++', 'h', 'hpp', 'hxx', 'h++'].includes(extension)) {
        return await this.cppAnalyzer.analyzeFile(filePath);
      } else {
        // Handle TypeScript/JavaScript files
        const content = await readFile(filePath, 'utf-8');
        return this.parseCode(content, filePath);
      }
    } catch (error) {
      console.warn(`Failed to analyze ${filePath}:`, error);
      return null;
    }
  }

  private parseCode(content: string, filePath: string): CodeStructure {
    try {
      const scriptKind = filePath.endsWith('.tsx') || filePath.endsWith('.jsx') 
        ? ts.ScriptKind.TSX 
        : filePath.endsWith('.ts') 
        ? ts.ScriptKind.TS 
        : ts.ScriptKind.JS;

      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.ES2022,
        true,
        scriptKind
      );

      return this.extractStructure(sourceFile);
    } catch (error) {
      console.warn(`Failed to parse ${filePath}:`, error);
      return {
        functions: [],
        classes: [],
        imports: [],
        exports: []
      };
    }
  }

  private extractStructure(sourceFile: ts.SourceFile): CodeStructure {
    const structure: CodeStructure = {
      functions: [],
      classes: [],
      imports: [],
      exports: []
    };

    this.walkAST(sourceFile, structure);
    return structure;
  }

  private walkAST(node: ts.Node, structure: CodeStructure): void {
    if (ts.isFunctionDeclaration(node)) {
      this.processFunctionDeclaration(node, structure);
    } else if (ts.isClassDeclaration(node)) {
      this.processClassDeclaration(node, structure);
    } else if (ts.isImportDeclaration(node)) {
      this.processImportDeclaration(node, structure);
    } else if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
      this.processExportDeclaration(node, structure);
    } else if (ts.isVariableStatement(node)) {
      this.processVariableDeclaration(node, structure);
    } else if (ts.isCallExpression(node)) {
      // Check for dynamic imports and require calls
      this.processDynamicImport(node, structure);
    }

    // Recursively walk child nodes
    ts.forEachChild(node, (child) => {
      this.walkAST(child, structure);
    });
  }

  private processFunctionDeclaration(
    node: ts.FunctionDeclaration, 
    structure: CodeStructure
  ): void {
    if (node.name) {
      const parameters = node.parameters.map(param => {
        if (ts.isIdentifier(param.name)) {
          return param.name.text;
        }
        return 'param';
      });

      const startLine = this.getLineNumber(node);
      const endLine = startLine + 1; // Simplified - would need more complex logic for real end

      structure.functions.push({
        name: node.name.text,
        startLine,
        endLine,
        parameters,
        returnType: node.type ? this.getTypeText(node.type) : undefined
      });
    }
  }

  private processClassDeclaration(
    node: ts.ClassDeclaration, 
    structure: CodeStructure
  ): void {
    if (node.name) {
      const methods: string[] = [];
      const properties: string[] = [];

      node.members.forEach(member => {
        if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
          methods.push(member.name.text);
        } else if (ts.isPropertyDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
          properties.push(member.name.text);
        }
      });

      const startLine = this.getLineNumber(node);
      const endLine = startLine + 1;

      structure.classes.push({
        name: node.name.text,
        startLine,
        endLine,
        methods,
        properties
      });
    }
  }

  private processImportDeclaration(
    node: ts.ImportDeclaration, 
    structure: CodeStructure
  ): void {
    if (ts.isStringLiteral(node.moduleSpecifier)) {
      const moduleName = node.moduleSpecifier.text;
      
      if (node.importClause) {
        if (node.importClause.name) {
          // Default import
          structure.imports.push({
            module: moduleName,
            type: 'default'
          });
        }
        
        if (node.importClause.namedBindings) {
          if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            // import * as foo
            structure.imports.push({
              module: moduleName,
              type: 'namespace'
            });
          } else if (ts.isNamedImports(node.importClause.namedBindings)) {
            // import { a, b }
            structure.imports.push({
              module: moduleName,
              type: 'named'
            });
          }
        }
      } else {
        // import './style.css'
        structure.imports.push({
          module: moduleName,
          type: 'namespace'
        });
      }
    }
  }

  private processExportDeclaration(
    node: ts.ExportDeclaration | ts.ExportAssignment, 
    structure: CodeStructure
  ): void {
    if (ts.isExportAssignment(node)) {
      structure.exports.push({
        name: 'default',
        type: 'default'
      });
    } else if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach(element => {
          if (ts.isIdentifier(element.name)) {
            structure.exports.push({
              name: element.name.text,
              type: 'named'
            });
          }
        });
      }
    }
  }

  private processVariableDeclaration(
    node: ts.VariableStatement, 
    structure: CodeStructure
  ): void {
    // Look for function expressions assigned to variables
    node.declarationList.declarations.forEach(decl => {
      if (ts.isIdentifier(decl.name) && decl.initializer) {
        if (ts.isFunctionExpression(decl.initializer) || ts.isArrowFunction(decl.initializer)) {
          const parameters = decl.initializer.parameters.map(param => {
            if (ts.isIdentifier(param.name)) {
              return param.name.text;
            }
            return 'param';
          });

          const startLine = this.getLineNumber(decl);
          const endLine = startLine + 1;

          structure.functions.push({
            name: decl.name.text,
            startLine,
            endLine,
            parameters,
            returnType: decl.initializer.type ? this.getTypeText(decl.initializer.type) : undefined
          });
        }
      }
    });
  }

  private processDynamicImport(
    node: ts.CallExpression,
    structure: CodeStructure
  ): void {
    // Check for dynamic import() calls
    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg)) {
        structure.imports.push({
          module: arg.text,
          type: 'dynamic',
          line: this.getLineNumber(node)
        });
      } else if (arg && ts.isTemplateExpression(arg)) {
        // Template literal import like import(`./modules/${name}`)
        structure.imports.push({
          module: '<dynamic-template>',
          type: 'dynamic',
          line: this.getLineNumber(node)
        });
      } else {
        // Variable or computed import like import(moduleName)
        structure.imports.push({
          module: '<dynamic-variable>',
          type: 'dynamic',
          line: this.getLineNumber(node)
        });
      }
    }

    // Check for require() calls
    if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg)) {
        structure.imports.push({
          module: arg.text,
          type: 'require',
          line: this.getLineNumber(node)
        });
      } else if (arg && ts.isTemplateExpression(arg)) {
        // Template literal require like require(`./modules/${name}`)
        structure.imports.push({
          module: '<require-template>',
          type: 'require',
          line: this.getLineNumber(node)
        });
      } else {
        // Variable or computed require like require(moduleName)
        structure.imports.push({
          module: '<require-variable>',
          type: 'require',
          line: this.getLineNumber(node)
        });
      }
    }
  }

  private getLineNumber(node: ts.Node): number {
    const sourceFile = node.getSourceFile();
    if (sourceFile && node.pos !== undefined) {
      return sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    }
    return 1;
  }

  private getTypeText(typeNode: ts.TypeNode): string {
    switch (typeNode.kind) {
      case ts.SyntaxKind.StringKeyword: return 'string';
      case ts.SyntaxKind.NumberKeyword: return 'number';
      case ts.SyntaxKind.BooleanKeyword: return 'boolean';
      case ts.SyntaxKind.VoidKeyword: return 'void';
      case ts.SyntaxKind.AnyKeyword: return 'any';
      default: return 'unknown';
    }
  }

  /**
   * Detect frameworks for any supported file type
   */
  async detectFrameworks(filePath: string, structure: CodeStructure): Promise<string[]> {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    if (extension === 'py' && 'pythonImports' in structure) {
      return this.pythonAnalyzer.detectFrameworks(structure as any, filePath);
    } else if (extension === 'java' && 'javaImports' in structure) {
      return this.javaAnalyzer.detectFrameworks(structure as any, filePath);
    } else if (extension === 'go' && 'goImports' in structure) {
      return this.goAnalyzer.detectFrameworks(structure as any, filePath);
    } else {
      // TypeScript/JavaScript framework detection (existing logic)
      return this.detectTSJSFrameworks(filePath, structure);
    }
  }

  /**
   * Analyze patterns for any supported file type
   */
  async analyzePatterns(filePath: string, structure: CodeStructure): Promise<any[]> {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    if (extension === 'py' && 'pythonImports' in structure) {
      return this.pythonAnalyzer.analyzePatterns(structure as any);
    } else if (extension === 'java' && 'javaImports' in structure) {
      return this.javaAnalyzer.analyzePatterns(structure as any);
    } else if (extension === 'go' && 'goImports' in structure) {
      return this.goAnalyzer.analyzePatterns(structure as any);
    } else {
      // TypeScript/JavaScript pattern analysis (could be implemented)
      return this.analyzeTSJSPatterns(filePath, structure);
    }
  }

  private detectTSJSFrameworks(filePath: string, structure: CodeStructure): string[] {
    const frameworks: string[] = [];
    const imports = structure.imports.map(imp => imp.module.toLowerCase());
    
    // React
    if (imports.includes('react') || filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
      frameworks.push('React');
    }
    
    // Vue
    if (imports.includes('vue')) {
      frameworks.push('Vue');
    }
    
    // Angular
    if (imports.some(imp => imp.startsWith('@angular/'))) {
      frameworks.push('Angular');
    }
    
    // Express
    if (imports.includes('express')) {
      frameworks.push('Express');
    }
    
    // Next.js
    if (imports.includes('next') || imports.some(imp => imp.startsWith('next/'))) {
      frameworks.push('Next.js');
    }
    
    return frameworks;
  }

  private analyzeTSJSPatterns(filePath: string, structure: CodeStructure): any[] {
    const patterns: any[] = [];
    
    // Check for React patterns
    const reactImport = structure.imports.find(imp => imp.module === 'react');
    if (reactImport) {
      patterns.push({
        type: 'framework_pattern',
        description: 'React component pattern detected',
        severity: 'info'
      });
    }
    
    // Check for async patterns
    const asyncFunctions = structure.functions.filter(func => 
      func.name.includes('async') || func.returnType?.includes('Promise')
    );
    
    if (asyncFunctions.length > 0) {
      patterns.push({
        type: 'async_pattern',
        description: 'Async/Promise pattern usage detected',
        severity: 'info',
        count: asyncFunctions.length
      });
    }
    
    return patterns;
  }
}