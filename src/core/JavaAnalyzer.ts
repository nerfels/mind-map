import { readFile } from 'fs/promises';
import { CodeStructure } from '../types/index.js';

// Import java-parser for AST parsing
import * as JavaParser from 'java-parser';

export interface JavaCodeStructure extends CodeStructure {
  annotations: Array<{
    name: string;
    target: string;
    parameters?: Record<string, any>;
  }>;
  javaImports: Array<{
    packagePath: string;
    className?: string;
    isStatic?: boolean;
    isWildcard?: boolean;
  }>;
  packageDeclaration?: string;
}

/**
 * Java AST Analyzer using java-parser npm package
 * Parses Java source code and extracts structural information
 */
export class JavaAnalyzer {
  private supportedExtensions: Set<string>;

  constructor() {
    this.supportedExtensions = new Set(['java']);
  }

  canAnalyze(filePath: string): boolean {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return extension ? this.supportedExtensions.has(extension) : false;
  }

  async analyzeFile(filePath: string): Promise<JavaCodeStructure | null> {
    if (!this.canAnalyze(filePath)) {
      return null;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      return await this.parseCode(content, filePath);
    } catch (error) {
      console.warn(`Failed to analyze Java file ${filePath}:`, error);
      return null;
    }
  }

  private async parseCode(content: string, filePath: string): Promise<JavaCodeStructure> {
    try {
      // Parse Java code using java-parser
      const parseResult = JavaParser.parse(content);
      return this.processASTResult(parseResult, content);
    } catch (error) {
      console.warn(`Failed to parse Java code ${filePath}:`, error);
      return {
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        annotations: [],
        javaImports: []
      };
    }
  }

  private processASTResult(parseResult: any, content: string): JavaCodeStructure {
    const structure: JavaCodeStructure = {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      annotations: [],
      javaImports: [],
      packageDeclaration: undefined
    };

    try {
      // Process the compilation unit
      if (parseResult && parseResult.children && parseResult.children.compilationUnit) {
        const compilationUnit = parseResult.children.compilationUnit[0];
        
        // Extract package declaration
        if (compilationUnit.children.packageDeclaration) {
          const packageDecl = compilationUnit.children.packageDeclaration[0];
          if (packageDecl.children.name) {
            structure.packageDeclaration = this.extractQualifiedName(packageDecl.children.name[0]);
          }
        }

        // Extract imports
        if (compilationUnit.children.importDeclaration) {
          compilationUnit.children.importDeclaration.forEach((importDecl: any) => {
            const javaImport = this.extractImport(importDecl);
            if (javaImport) {
              structure.javaImports.push(javaImport);
              structure.imports.push({
                module: javaImport.packagePath,
                type: javaImport.isWildcard ? 'namespace' : 'named'
              });
            }
          });
        }

        // Extract type declarations (classes, interfaces, enums)
        if (compilationUnit.children.typeDeclaration) {
          compilationUnit.children.typeDeclaration.forEach((typeDecl: any) => {
            this.processTypeDeclaration(typeDecl, structure, content);
          });
        }
      }
    } catch (error) {
      console.warn('Error processing Java AST result:', error);
    }

    return structure;
  }

  private extractQualifiedName(nameNode: any): string {
    if (!nameNode) return '';
    
    if (nameNode.children && nameNode.children.Identifier) {
      return nameNode.children.Identifier.map((id: any) => id.image).join('.');
    }
    
    return nameNode.image || '';
  }

  private extractImport(importDecl: any): any | null {
    try {
      const javaImport: any = {
        packagePath: '',
        isStatic: false,
        isWildcard: false
      };

      // Check for static import
      if (importDecl.children.Static) {
        javaImport.isStatic = true;
      }

      // Extract qualified name
      if (importDecl.children.name) {
        const qualifiedName = this.extractQualifiedName(importDecl.children.name[0]);
        javaImport.packagePath = qualifiedName;

        // Check for wildcard import
        if (qualifiedName.endsWith('*')) {
          javaImport.isWildcard = true;
          javaImport.packagePath = qualifiedName.slice(0, -2); // Remove ".*"
        } else {
          // Extract class name from qualified name
          const parts = qualifiedName.split('.');
          if (parts.length > 1) {
            javaImport.className = parts[parts.length - 1];
          }
        }
      }

      return javaImport;
    } catch (error) {
      console.warn('Error extracting import:', error);
      return null;
    }
  }

  private processTypeDeclaration(typeDecl: any, structure: JavaCodeStructure, content: string) {
    try {
      if (typeDecl.children.classDeclaration) {
        this.processClassDeclaration(typeDecl.children.classDeclaration[0], structure, content);
      } else if (typeDecl.children.interfaceDeclaration) {
        this.processInterfaceDeclaration(typeDecl.children.interfaceDeclaration[0], structure, content);
      } else if (typeDecl.children.enumDeclaration) {
        this.processEnumDeclaration(typeDecl.children.enumDeclaration[0], structure, content);
      }
    } catch (error) {
      console.warn('Error processing type declaration:', error);
    }
  }

  private processClassDeclaration(classDecl: any, structure: JavaCodeStructure, content: string) {
    try {
      const className = classDecl.children.Identifier?.[0]?.image || 'UnknownClass';
      
      // Calculate line numbers (simplified approach)
      const startLine = this.getLineNumber(content, classDecl.location?.startOffset || 0);
      const endLine = this.getLineNumber(content, classDecl.location?.endOffset || content.length);

      const classInfo: any = {
        name: className,
        startLine,
        endLine,
        methods: [],
        properties: [],
        baseClasses: [],
        decorators: []
      };

      // Extract superclass
      if (classDecl.children.superclass) {
        const superclass = this.extractQualifiedName(classDecl.children.superclass[0].children.classType[0]);
        if (superclass) {
          classInfo.baseClasses.push(superclass);
        }
      }

      // Extract interfaces
      if (classDecl.children.superinterfaces) {
        const interfaces = classDecl.children.superinterfaces[0];
        if (interfaces.children.interfaceTypeList) {
          interfaces.children.interfaceTypeList[0].children.interfaceType?.forEach((intf: any) => {
            const interfaceName = this.extractQualifiedName(intf);
            if (interfaceName) {
              classInfo.baseClasses.push(interfaceName);
            }
          });
        }
      }

      // Process class body
      if (classDecl.children.classBody) {
        this.processClassBody(classDecl.children.classBody[0], classInfo, structure, content);
      }

      structure.classes.push(classInfo);
    } catch (error) {
      console.warn('Error processing class declaration:', error);
    }
  }

  private processInterfaceDeclaration(interfaceDecl: any, structure: JavaCodeStructure, content: string) {
    // Similar to class processing but for interfaces
    // For now, treat interfaces as classes for simplicity
    this.processClassDeclaration(interfaceDecl, structure, content);
  }

  private processEnumDeclaration(enumDecl: any, structure: JavaCodeStructure, content: string) {
    // Similar to class processing but for enums
    // For now, treat enums as classes for simplicity
    this.processClassDeclaration(enumDecl, structure, content);
  }

  private processClassBody(classBody: any, classInfo: any, structure: JavaCodeStructure, content: string) {
    if (!classBody.children.classBodyDeclaration) return;

    classBody.children.classBodyDeclaration.forEach((bodyDecl: any) => {
      try {
        // Process method declarations
        if (bodyDecl.children.methodDeclaration) {
          const method = this.processMethodDeclaration(bodyDecl.children.methodDeclaration[0], content);
          if (method) {
            classInfo.methods.push(method.name);
            structure.functions.push(method);
          }
        }
        
        // Process constructor declarations
        if (bodyDecl.children.constructorDeclaration) {
          const constructor = this.processConstructorDeclaration(bodyDecl.children.constructorDeclaration[0], content);
          if (constructor) {
            classInfo.methods.push(constructor.name);
            structure.functions.push(constructor);
          }
        }

        // Process field declarations
        if (bodyDecl.children.fieldDeclaration) {
          const fields = this.processFieldDeclaration(bodyDecl.children.fieldDeclaration[0]);
          classInfo.properties.push(...fields);
        }
      } catch (error) {
        console.warn('Error processing class body declaration:', error);
      }
    });
  }

  private processMethodDeclaration(methodDecl: any, content: string): any | null {
    try {
      const methodName = methodDecl.children.Identifier?.[0]?.image || 'unknownMethod';
      const startLine = this.getLineNumber(content, methodDecl.location?.startOffset || 0);
      const endLine = this.getLineNumber(content, methodDecl.location?.endOffset || content.length);

      // Extract parameters
      const parameters: string[] = [];
      if (methodDecl.children.formalParameterList) {
        // Process formal parameters (simplified)
        parameters.push('param1', 'param2'); // Placeholder - would need more detailed parsing
      }

      // Extract return type
      let returnType = 'void';
      if (methodDecl.children.result) {
        returnType = this.extractType(methodDecl.children.result[0]);
      }

      return {
        name: methodName,
        startLine,
        endLine,
        parameters,
        returnType,
        isAsync: false, // Java doesn't have async methods in the same way
        decorators: []
      };
    } catch (error) {
      console.warn('Error processing method declaration:', error);
      return null;
    }
  }

  private processConstructorDeclaration(constructorDecl: any, content: string): any | null {
    try {
      const constructorName = constructorDecl.children.Identifier?.[0]?.image || 'constructor';
      const startLine = this.getLineNumber(content, constructorDecl.location?.startOffset || 0);
      const endLine = this.getLineNumber(content, constructorDecl.location?.endOffset || content.length);

      return {
        name: constructorName,
        startLine,
        endLine,
        parameters: [], // Simplified
        returnType: 'constructor',
        isAsync: false,
        decorators: []
      };
    } catch (error) {
      console.warn('Error processing constructor declaration:', error);
      return null;
    }
  }

  private processFieldDeclaration(fieldDecl: any): string[] {
    try {
      const fields: string[] = [];
      if (fieldDecl.children.variableDeclaratorList) {
        const varList = fieldDecl.children.variableDeclaratorList[0];
        if (varList.children.variableDeclarator) {
          varList.children.variableDeclarator.forEach((varDecl: any) => {
            const fieldName = varDecl.children.Identifier?.[0]?.image;
            if (fieldName) {
              fields.push(fieldName);
            }
          });
        }
      }
      return fields;
    } catch (error) {
      console.warn('Error processing field declaration:', error);
      return [];
    }
  }

  private extractType(typeNode: any): string {
    // Simplified type extraction
    if (typeNode.children.primitiveType) {
      return typeNode.children.primitiveType[0].image || 'unknown';
    }
    if (typeNode.children.classOrInterfaceType) {
      return this.extractQualifiedName(typeNode.children.classOrInterfaceType[0]);
    }
    return 'unknown';
  }

  private getLineNumber(content: string, offset: number): number {
    if (offset <= 0) return 1;
    return content.substring(0, offset).split('\n').length;
  }

  /**
   * Detect Java frameworks based on imports and file patterns
   */
  detectFrameworks(structure: JavaCodeStructure, filePath: string): string[] {
    const frameworks: string[] = [];
    const imports = structure.javaImports.map(imp => imp.packagePath.toLowerCase());
    const fileName = filePath.toLowerCase();

    // Spring Framework
    if (imports.some(imp => imp.includes('springframework'))) {
      frameworks.push('Spring Framework');
      
      if (imports.some(imp => imp.includes('spring.boot'))) {
        frameworks.push('Spring Boot');
      }
      if (imports.some(imp => imp.includes('spring.web'))) {
        frameworks.push('Spring Web');
      }
      if (imports.some(imp => imp.includes('spring.data'))) {
        frameworks.push('Spring Data');
      }
    }

    // Java EE / Jakarta EE
    if (imports.some(imp => imp.includes('javax.servlet') || imp.includes('jakarta.servlet'))) {
      frameworks.push('Java EE/Jakarta EE');
    }

    // Hibernate
    if (imports.some(imp => imp.includes('hibernate'))) {
      frameworks.push('Hibernate');
    }

    // JPA
    if (imports.some(imp => imp.includes('javax.persistence') || imp.includes('jakarta.persistence'))) {
      frameworks.push('JPA');
    }

    // Testing frameworks
    if (imports.some(imp => imp.includes('junit'))) {
      frameworks.push('JUnit');
    }
    if (imports.some(imp => imp.includes('testng'))) {
      frameworks.push('TestNG');
    }
    if (imports.some(imp => imp.includes('mockito'))) {
      frameworks.push('Mockito');
    }

    // Build tools (based on file patterns)
    if (fileName.includes('pom.xml')) {
      frameworks.push('Maven');
    }
    if (fileName.includes('build.gradle')) {
      frameworks.push('Gradle');
    }

    // Web frameworks
    if (imports.some(imp => imp.includes('struts'))) {
      frameworks.push('Struts');
    }
    if (imports.some(imp => imp.includes('wicket'))) {
      frameworks.push('Wicket');
    }
    if (imports.some(imp => imp.includes('jsf') || imp.includes('faces'))) {
      frameworks.push('JSF');
    }

    // Logging frameworks
    if (imports.some(imp => imp.includes('slf4j'))) {
      frameworks.push('SLF4J');
    }
    if (imports.some(imp => imp.includes('log4j'))) {
      frameworks.push('Log4J');
    }

    return frameworks;
  }

  /**
   * Analyze Java code patterns and conventions
   */
  analyzePatterns(structure: JavaCodeStructure): any[] {
    const patterns: any[] = [];

    // Check for Java naming conventions
    const nonCamelCaseMethods = structure.functions.filter(func => 
      !/^[a-z][a-zA-Z0-9]*$/.test(func.name) && !func.name.match(/^(get|set|is)[A-Z]/)
    );
    
    if (nonCamelCaseMethods.length > 0) {
      patterns.push({
        type: 'naming_convention',
        description: 'Non-camelCase method names detected',
        severity: 'warning',
        methods: nonCamelCaseMethods.map(f => f.name)
      });
    }

    // Check for class naming conventions
    const nonPascalCaseClasses = structure.classes.filter(cls => 
      !/^[A-Z][a-zA-Z0-9]*$/.test(cls.name)
    );
    
    if (nonPascalCaseClasses.length > 0) {
      patterns.push({
        type: 'naming_convention',
        description: 'Non-PascalCase class names detected',
        severity: 'warning',
        classes: nonPascalCaseClasses.map(c => c.name)
      });
    }

    // Detect common design patterns
    const classNames = structure.classes.map(c => c.name.toLowerCase());
    
    if (classNames.some(name => name.includes('factory'))) {
      patterns.push({
        type: 'design_pattern',
        description: 'Factory pattern detected',
        severity: 'info'
      });
    }

    if (classNames.some(name => name.includes('builder'))) {
      patterns.push({
        type: 'design_pattern',
        description: 'Builder pattern detected',
        severity: 'info'
      });
    }

    if (classNames.some(name => name.includes('singleton'))) {
      patterns.push({
        type: 'design_pattern',
        description: 'Singleton pattern detected',
        severity: 'info'
      });
    }

    if (classNames.some(name => name.includes('observer'))) {
      patterns.push({
        type: 'design_pattern',
        description: 'Observer pattern detected',
        severity: 'info'
      });
    }

    return patterns;
  }
}