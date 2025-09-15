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
      if (parseResult && parseResult.children && parseResult.children.ordinaryCompilationUnit) {
        const compilationUnit = parseResult.children.ordinaryCompilationUnit[0];
        
        // Extract package declaration
        if (compilationUnit.children.packageDeclaration) {
          const packageDecl = compilationUnit.children.packageDeclaration[0];
          if (packageDecl.children.Identifier) {
            // Direct identifier handling for package names like "com.example.demo"
            structure.packageDeclaration = packageDecl.children.Identifier.map((id: any) => id.image).join('.');
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

    // Handle direct identifier nodes
    if (nameNode.image) {
      return nameNode.image;
    }

    // Handle complex qualified names with multiple identifiers
    if (nameNode.children && nameNode.children.Identifier) {
      return nameNode.children.Identifier.map((id: any) => id.image).join('.');
    }

    // Handle dot-separated qualified names
    if (nameNode.children) {
      const parts: string[] = [];

      // Look for Identifier tokens
      if (nameNode.children.Identifier) {
        nameNode.children.Identifier.forEach((id: any) => {
          if (id.image) parts.push(id.image);
        });
      }

      // Handle nested qualified name structures
      if (nameNode.children.qualifiedName) {
        const nested = this.extractQualifiedName(nameNode.children.qualifiedName[0]);
        if (nested) parts.push(nested);
      }

      // Handle individual components
      Object.keys(nameNode.children).forEach(key => {
        if (key === 'Identifier' || key === 'qualifiedName') return;

        const nodes = nameNode.children[key];
        if (Array.isArray(nodes)) {
          nodes.forEach((node: any) => {
            if (node.image && node.image !== '.') {
              parts.push(node.image);
            }
          });
        }
      });

      return parts.join('.');
    }

    return '';
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

      // Extract qualified name from packageOrTypeName
      if (importDecl.children.packageOrTypeName) {
        const packageNode = importDecl.children.packageOrTypeName[0];
        const qualifiedName = this.extractQualifiedName(packageNode);

        // Check for wildcard import (indicated by Star token)
        if (importDecl.children.Star) {
          javaImport.isWildcard = true;
          javaImport.packagePath = qualifiedName;
        } else {
          javaImport.packagePath = qualifiedName;
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
      // Extract annotations from type declaration
      const annotations = this.extractAnnotations(typeDecl);

      if (typeDecl.children.classDeclaration) {
        this.processClassDeclaration(typeDecl.children.classDeclaration[0], structure, content, annotations);
      } else if (typeDecl.children.interfaceDeclaration) {
        this.processInterfaceDeclaration(typeDecl.children.interfaceDeclaration[0], structure, content, annotations);
      } else if (typeDecl.children.enumDeclaration) {
        this.processEnumDeclaration(typeDecl.children.enumDeclaration[0], structure, content, annotations);
      }
    } catch (error) {
      console.warn('Error processing type declaration:', error);
    }
  }

  private processClassDeclaration(classDecl: any, structure: JavaCodeStructure, content: string, annotations: any[] = []) {
    try {
      // Handle normalClassDeclaration structure
      const normalClassDecl = classDecl.children.normalClassDeclaration?.[0];
      if (!normalClassDecl) {
        console.warn('No normalClassDeclaration found');
        return;
      }

      const className = normalClassDecl.children.typeIdentifier?.[0]?.children?.Identifier?.[0]?.image || 'UnknownClass';
      
      // Calculate line numbers (simplified approach)
      const startLine = this.getLineNumber(content, normalClassDecl.location?.startOffset || 0);
      const endLine = this.getLineNumber(content, normalClassDecl.location?.endOffset || content.length);

      const classInfo: any = {
        name: className,
        startLine,
        endLine,
        methods: [],
        properties: [],
        baseClasses: [],
        decorators: annotations
      };

      // Extract superclass (if present in normalClassDeclaration)
      if (normalClassDecl.children.superclass) {
        const superclass = this.extractQualifiedName(normalClassDecl.children.superclass[0].children.classType[0]);
        if (superclass) {
          classInfo.baseClasses.push(superclass);
        }
      }

      // Extract interfaces (if present in normalClassDeclaration)
      if (normalClassDecl.children.superinterfaces) {
        const interfaces = normalClassDecl.children.superinterfaces[0];
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
      if (normalClassDecl.children.classBody) {
        this.processClassBody(normalClassDecl.children.classBody[0], classInfo, structure, content);
      }

      structure.classes.push(classInfo);
    } catch (error) {
      console.warn('Error processing class declaration:', error);
    }
  }

  private processInterfaceDeclaration(interfaceDecl: any, structure: JavaCodeStructure, content: string, annotations: any[] = []) {
    // Similar to class processing but for interfaces
    // For now, treat interfaces as classes for simplicity
    this.processClassDeclaration(interfaceDecl, structure, content, annotations);
  }

  private processEnumDeclaration(enumDecl: any, structure: JavaCodeStructure, content: string, annotations: any[] = []) {
    // Similar to class processing but for enums
    // For now, treat enums as classes for simplicity
    this.processClassDeclaration(enumDecl, structure, content, annotations);
  }

  private processClassBody(classBody: any, classInfo: any, structure: JavaCodeStructure, content: string) {
    if (!classBody.children.classBodyDeclaration) return;

    classBody.children.classBodyDeclaration.forEach((bodyDecl: any) => {
      try {
        // Process constructor declarations directly
        if (bodyDecl.children.constructorDeclaration) {
          const constructor = this.processConstructorDeclaration(bodyDecl.children.constructorDeclaration[0], content);
          if (constructor) {
            classInfo.methods.push(constructor.name);
            structure.functions.push(constructor);
          }
        }

        // Process class member declarations (methods and fields)
        if (bodyDecl.children.classMemberDeclaration) {
          const memberDecl = bodyDecl.children.classMemberDeclaration[0];

          // Check for method declaration within classMemberDeclaration
          if (memberDecl.children.methodDeclaration) {
            const method = this.processMethodDeclaration(memberDecl.children.methodDeclaration[0], content);
            if (method) {
              classInfo.methods.push(method.name);
              structure.functions.push(method);
            }
          }

          // Check for field declaration within classMemberDeclaration
          if (memberDecl.children.fieldDeclaration) {
            const fields = this.processFieldDeclaration(memberDecl.children.fieldDeclaration[0]);
            classInfo.properties.push(...fields);
          }
        }
      } catch (error) {
        console.warn('Error processing class body declaration:', error);
      }
    });
  }

  private processMethodDeclaration(methodDecl: any, content: string): any | null {
    try {
      // Navigate through methodHeader -> methodDeclarator -> Identifier
      const methodHeader = methodDecl.children.methodHeader?.[0];
      if (!methodHeader) return null;

      const methodDeclarator = methodHeader.children.methodDeclarator?.[0];
      if (!methodDeclarator) return null;

      const methodName = methodDeclarator.children.Identifier?.[0]?.image || 'unknownMethod';
      const startLine = this.getLineNumber(content, methodDecl.location?.startOffset || 0);
      const endLine = this.getLineNumber(content, methodDecl.location?.endOffset || content.length);

      // Extract parameters from methodDeclarator
      const parameters: string[] = [];
      if (methodDeclarator.children.formalParameterList) {
        const paramList = methodDeclarator.children.formalParameterList[0];
        if (paramList.children.formalParameter) {
          paramList.children.formalParameter.forEach((param: any) => {
            const paramType = this.extractParameterType(param);
            const paramName = this.extractParameterName(param);
            if (paramName) {
              parameters.push(paramType ? `${paramType} ${paramName}` : paramName);
            }
          });
        }
      }

      // Extract return type from methodHeader
      let returnType = 'void';
      if (methodHeader.children.result) {
        returnType = this.extractType(methodHeader.children.result[0]);
      } else if (methodHeader.children.unannType) {
        returnType = this.extractType(methodHeader.children.unannType[0]);
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
      // Navigate through constructorDeclarator -> Identifier
      const constructorDeclarator = constructorDecl.children.constructorDeclarator?.[0];
      if (!constructorDeclarator) return null;

      const constructorName = constructorDeclarator.children.Identifier?.[0]?.image || 'constructor';
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

  private processFieldDeclaration(fieldDecl: any): any[] {
    try {
      const fields: any[] = [];

      // Extract field type
      let fieldType = 'Object';
      if (fieldDecl.children.unannType) {
        fieldType = this.extractType(fieldDecl.children.unannType[0]);
      }

      // Extract field modifiers
      const modifiers: string[] = [];
      if (fieldDecl.children.fieldModifier) {
        fieldDecl.children.fieldModifier.forEach((modifier: any) => {
          Object.keys(modifier.children || {}).forEach(key => {
            if (key === 'Public' || key === 'Private' || key === 'Protected' ||
                key === 'Static' || key === 'Final' || key === 'Volatile' || key === 'Transient') {
              modifiers.push(key.toLowerCase());
            }
          });
        });
      }

      // Extract field names
      if (fieldDecl.children.variableDeclaratorList) {
        const varList = fieldDecl.children.variableDeclaratorList[0];
        if (varList.children.variableDeclarator) {
          varList.children.variableDeclarator.forEach((varDecl: any) => {
            let fieldName = '';

            // Try different ways to extract field name
            if (varDecl.children.variableDeclaratorId) {
              const varId = varDecl.children.variableDeclaratorId[0];
              if (varId.children.Identifier) {
                fieldName = varId.children.Identifier[0].image;
              }
            } else if (varDecl.children.Identifier) {
              fieldName = varDecl.children.Identifier[0].image;
            }

            if (fieldName) {
              fields.push({
                name: fieldName,
                type: fieldType,
                modifiers: modifiers
              });
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

  private extractAnnotations(node: any): any[] {
    const annotations: any[] = [];

    try {
      // Look for annotation nodes in various locations
      if (node.children?.annotation) {
        node.children.annotation.forEach((annotationNode: any) => {
          const annotation = this.extractSingleAnnotation(annotationNode);
          if (annotation) {
            annotations.push(annotation);
          }
        });
      }

      // Look for class modifiers that might contain annotations
      if (node.children?.classModifier) {
        node.children.classModifier.forEach((modifier: any) => {
          if (modifier.children?.annotation) {
            modifier.children.annotation.forEach((annotationNode: any) => {
              const annotation = this.extractSingleAnnotation(annotationNode);
              if (annotation) {
                annotations.push(annotation);
              }
            });
          }
        });
      }

      // Look for method modifiers that might contain annotations
      if (node.children?.methodModifier) {
        node.children.methodModifier.forEach((modifier: any) => {
          if (modifier.children?.annotation) {
            modifier.children.annotation.forEach((annotationNode: any) => {
              const annotation = this.extractSingleAnnotation(annotationNode);
              if (annotation) {
                annotations.push(annotation);
              }
            });
          }
        });
      }
    } catch (error) {
      console.warn('Error extracting annotations:', error);
    }

    return annotations;
  }

  private extractSingleAnnotation(annotationNode: any): any | null {
    try {
      if (!annotationNode.children) return null;

      let annotationName = '';
      const parameters: Record<string, any> = {};

      // Extract annotation name
      if (annotationNode.children.normalAnnotation) {
        const normalAnnotation = annotationNode.children.normalAnnotation[0];
        if (normalAnnotation.children.typeName) {
          annotationName = this.extractQualifiedName(normalAnnotation.children.typeName[0]);
        }

        // Extract annotation parameters
        if (normalAnnotation.children.elementValuePairList) {
          const pairList = normalAnnotation.children.elementValuePairList[0];
          if (pairList.children.elementValuePair) {
            pairList.children.elementValuePair.forEach((pair: any) => {
              const key = pair.children.Identifier?.[0]?.image;
              // Simplified value extraction - could be improved
              const value = 'annotationValue';
              if (key) {
                parameters[key] = value;
              }
            });
          }
        }
      } else if (annotationNode.children.markerAnnotation) {
        const markerAnnotation = annotationNode.children.markerAnnotation[0];
        if (markerAnnotation.children.typeName) {
          annotationName = this.extractQualifiedName(markerAnnotation.children.typeName[0]);
        }
      } else if (annotationNode.children.singleElementAnnotation) {
        const singleAnnotation = annotationNode.children.singleElementAnnotation[0];
        if (singleAnnotation.children.typeName) {
          annotationName = this.extractQualifiedName(singleAnnotation.children.typeName[0]);
        }
        // Could extract the single element value here
      }

      if (annotationName) {
        return {
          name: annotationName,
          target: 'class', // or method, field, etc.
          parameters: Object.keys(parameters).length > 0 ? parameters : undefined
        };
      }
    } catch (error) {
      console.warn('Error extracting single annotation:', error);
    }

    return null;
  }

  private extractParameterType(param: any): string {
    try {
      if (param.children.unannType) {
        return this.extractType(param.children.unannType[0]);
      }
      return 'Object';
    } catch (error) {
      return 'Object';
    }
  }

  private extractParameterName(param: any): string {
    try {
      if (param.children.variableDeclaratorId) {
        const varId = param.children.variableDeclaratorId[0];
        if (varId.children.Identifier) {
          return varId.children.Identifier[0].image;
        }
      }
      return '';
    } catch (error) {
      return '';
    }
  }

  private extractType(typeNode: any): string {
    if (!typeNode) return 'unknown';

    // Handle primitive types
    if (typeNode.children?.primitiveType) {
      const primitiveType = typeNode.children.primitiveType[0];
      if (primitiveType.children) {
        // Find the specific primitive type
        const typeKeys = ['Int', 'Double', 'Boolean', 'Char', 'Byte', 'Short', 'Long', 'Float'];
        for (const key of typeKeys) {
          if (primitiveType.children[key]) {
            return key.toLowerCase();
          }
        }
      }
      return primitiveType.image || 'unknown';
    }

    // Handle class or interface types
    if (typeNode.children?.classOrInterfaceType) {
      return this.extractQualifiedName(typeNode.children.classOrInterfaceType[0]);
    }

    // Handle array types
    if (typeNode.children?.dims) {
      const baseType = this.extractType({
        children: {
          primitiveType: typeNode.children.primitiveType,
          classOrInterfaceType: typeNode.children.classOrInterfaceType
        }
      });
      return baseType + '[]';
    }

    // Handle void return type
    if (typeNode.children?.Void) {
      return 'void';
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