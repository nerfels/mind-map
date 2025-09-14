import { MindMapNode, MindMapEdge } from '../types/index.js';
import { readFile } from 'fs/promises';

export interface KotlinTypeInfo {
  name: string;
  kind: 'class' | 'interface' | 'object' | 'enum' | 'data class' | 'sealed class' | 'annotation';
  modifiers: string[];
  superTypes: string[];
  functions: KotlinFunctionInfo[];
  properties: KotlinPropertyInfo[];
  constructors: KotlinConstructorInfo[];
  lineNumber: number;
}

export interface KotlinFunctionInfo {
  name: string;
  modifiers: string[];
  parameters: KotlinParameterInfo[];
  returnType?: string;
  isExtension: boolean;
  isSuspend: boolean;
  isInline: boolean;
  isOperator: boolean;
  lineNumber: number;
}

export interface KotlinParameterInfo {
  name: string;
  type?: string;
  hasDefault: boolean;
  defaultValue?: string;
  isVararg: boolean;
  modifier?: 'val' | 'var';
}

export interface KotlinPropertyInfo {
  name: string;
  type?: string;
  modifiers: string[];
  isVar: boolean;
  hasCustomGetter: boolean;
  hasCustomSetter: boolean;
  isLateInit: boolean;
  isLazy: boolean;
  lineNumber: number;
}

export interface KotlinConstructorInfo {
  parameters: KotlinParameterInfo[];
  isPrimary: boolean;
  isSecondary: boolean;
  modifiers: string[];
  lineNumber: number;
}

export interface KotlinFrameworkInfo {
  name: string;
  confidence: number;
  indicators: string[];
}

/**
 * Kotlin Language Analyzer
 * Analyzes Kotlin files for classes, objects, functions, and Android/JVM framework usage
 */
export class KotlinAnalyzer {
  private readonly KOTLIN_FRAMEWORKS = [
    {
      name: 'android',
      indicators: [
        /import\s+android\./,
        /import\s+androidx\./,
        /Activity/,
        /Fragment/,
        /View/,
        /Context/,
        /Bundle/,
        /Intent/,
        /onCreate/,
        /onResume/,
        /AndroidManifest\.xml/
      ]
    },
    {
      name: 'compose',
      indicators: [
        /import\s+androidx\.compose/,
        /@Composable/,
        /Column/,
        /Row/,
        /Text/,
        /Button/,
        /LazyColumn/,
        /remember/,
        /mutableStateOf/
      ]
    },
    {
      name: 'coroutines',
      indicators: [
        /import\s+kotlinx\.coroutines/,
        /suspend\s+fun/,
        /launch/,
        /async/,
        /withContext/,
        /runBlocking/,
        /Dispatchers\./,
        /Flow/
      ]
    },
    {
      name: 'spring_boot',
      indicators: [
        /import\s+org\.springframework/,
        /@RestController/,
        /@Service/,
        /@Component/,
        /@Autowired/,
        /@GetMapping/,
        /@PostMapping/,
        /@RequestMapping/
      ]
    },
    {
      name: 'ktor',
      indicators: [
        /import\s+io\.ktor/,
        /routing/,
        /get\s*\{/,
        /post\s*\{/,
        /ApplicationCall/,
        /routing\s*\{/
      ]
    },
    {
      name: 'serialization',
      indicators: [
        /import\s+kotlinx\.serialization/,
        /@Serializable/,
        /Json\./,
        /encodeToString/,
        /decodeFromString/
      ]
    }
  ];

  async analyzeFile(filePath: string, content?: string): Promise<{
    nodes: MindMapNode[];
    edges: MindMapEdge[];
  }> {
    const nodes: MindMapNode[] = [];
    const edges: MindMapEdge[] = [];

    try {
      const fileContent = content || await readFile(filePath, 'utf-8');
      const fileName = filePath.split('/').pop() || filePath;

      // Create file node
      const fileNode: MindMapNode = {
        id: `kotlin_file_${filePath.replace(/[^\w]/g, '_')}`,
        type: 'file',
        name: fileName,
        path: filePath,
        metadata: {
          language: 'kotlin',
          extension: fileName.endsWith('.kt') ? '.kt' : '.kts',
          size: fileContent.length,
          lines: fileContent.split('\n').length
        },
        confidence: 0.95,
        lastUpdated: new Date()
      };

      nodes.push(fileNode);

      // Extract package
      const packageName = this.extractPackage(fileContent);
      if (packageName) {
        fileNode.metadata.package = packageName;
      }

      // Extract types
      const types = this.extractTypes(fileContent);
      for (const typeInfo of types) {
        const typeNode = this.createTypeNode(typeInfo, filePath);
        nodes.push(typeNode);

        edges.push({
          id: `contains_${fileNode.id}_${typeNode.id}`,
          source: fileNode.id,
          target: typeNode.id,
          type: 'contains',
          confidence: 0.9
        });

        // Add functions
        for (const func of typeInfo.functions) {
          const funcNode = this.createFunctionNode(func, typeInfo.name, filePath);
          nodes.push(funcNode);

          edges.push({
            id: `contains_${typeNode.id}_${funcNode.id}`,
            source: typeNode.id,
            target: funcNode.id,
            type: 'contains',
            confidence: 0.9
          });
        }
      }

      // Extract top-level functions
      const topLevelFunctions = this.extractTopLevelFunctions(fileContent, types);
      for (const func of topLevelFunctions) {
        const funcNode = this.createTopLevelFunctionNode(func, filePath);
        nodes.push(funcNode);

        edges.push({
          id: `contains_${fileNode.id}_${funcNode.id}`,
          source: fileNode.id,
          target: funcNode.id,
          type: 'contains',
          confidence: 0.9
        });
      }

      // Detect framework usage
      const frameworks = this.detectFrameworks(fileContent, filePath);
      for (const framework of frameworks) {
        fileNode.metadata.frameworks = fileNode.metadata.frameworks || [];
        if (!fileNode.metadata.frameworks.includes(framework.name)) {
          fileNode.metadata.frameworks.push(framework.name);
        }

        const frameworkNode: MindMapNode = {
          id: `kotlin_framework_${framework.name}_${filePath.replace(/[^\w]/g, '_')}`,
          type: 'pattern',
          name: `${framework.name} Framework`,
          metadata: {
            framework: framework.name,
            confidence: framework.confidence,
            indicators: framework.indicators,
            language: 'kotlin'
          },
          confidence: framework.confidence,
          lastUpdated: new Date()
        };

        nodes.push(frameworkNode);

        edges.push({
          id: `uses_${fileNode.id}_${frameworkNode.id}`,
          source: fileNode.id,
          target: frameworkNode.id,
          type: 'detects',
          confidence: framework.confidence
        });
      }

      // Extract imports
      const imports = this.extractImports(fileContent);
      for (const importPath of imports) {
        const importNode: MindMapNode = {
          id: `kotlin_import_${importPath.replace(/[^\w]/g, '_')}_${filePath.replace(/[^\w]/g, '_')}`,
          type: 'pattern',
          name: `Import: ${importPath}`,
          metadata: {
            importPath,
            language: 'kotlin',
            type: 'import'
          },
          confidence: 0.8,
          lastUpdated: new Date()
        };

        nodes.push(importNode);

        edges.push({
          id: `imports_${fileNode.id}_${importNode.id}`,
          source: fileNode.id,
          target: importNode.id,
          type: 'imports',
          confidence: 0.8
        });
      }

    } catch (error) {
      console.error(`Error analyzing Kotlin file ${filePath}:`, error);
    }

    return { nodes, edges };
  }

  private extractPackage(content: string): string | null {
    const packageMatch = content.match(/package\s+([\w.]+)/);
    return packageMatch ? packageMatch[1] : null;
  }

  private extractTypes(content: string): KotlinTypeInfo[] {
    const types: KotlinTypeInfo[] = [];

    // Match type declarations (with or without body)
    const typeRegex = /((?:public|private|internal|protected)\s+)?((?:open|final|abstract|sealed|inline|data|annotation)\s+)*(data\s+class|sealed\s+class|class|interface|object|enum)\s+(\w+)(?:\s*\(([^)]*)\))?(?:\s*:\s*([^{]+?))?(?:\s*\{|\s*$|\s*(?=\n))/gm;
    let match;

    while ((match = typeRegex.exec(content)) !== null) {
      const visibility = match[1]?.trim();
      const modifiersStr = match[2]?.trim();
      const baseKind = match[3];
      const typeName = match[4];
      const primaryConstructor = match[5];
      const superTypes = match[6];

      const modifiers: string[] = [];
      if (visibility) modifiers.push(visibility);
      if (modifiersStr) {
        modifiers.push(...modifiersStr.split(/\s+/).filter(m => m));
      }

      // Determine specific kind
      let kind: KotlinTypeInfo['kind'] = baseKind as any;
      if (modifiersStr) {
        if (modifiersStr.includes('data')) kind = 'data class';
        else if (modifiersStr.includes('sealed')) kind = 'sealed class';
        else if (modifiersStr.includes('annotation')) kind = 'annotation';
      }

      const superTypeList = superTypes ?
        superTypes.split(',').map(s => s.trim()).filter(s => s) : [];

      const lineNumber = content.substring(0, match.index).split('\n').length;

      // Extract type body
      const typeStart = match.index + match[0].length;
      const typeBody = this.extractTypeBody(content, typeStart);

      const typeInfo: KotlinTypeInfo = {
        name: typeName,
        kind,
        modifiers,
        superTypes: superTypeList,
        functions: this.extractFunctions(typeBody),
        properties: this.extractProperties(typeBody),
        constructors: this.extractConstructors(typeBody, primaryConstructor),
        lineNumber
      };

      types.push(typeInfo);
    }

    return types;
  }

  private extractTypeBody(content: string, startIndex: number): string {
    let braceCount = 1;
    let index = startIndex;

    while (index < content.length && braceCount > 0) {
      if (content[index] === '{') braceCount++;
      else if (content[index] === '}') braceCount--;
      index++;
    }

    return content.substring(startIndex, index - 1);
  }

  private extractFunctions(body: string): KotlinFunctionInfo[] {
    const functions: KotlinFunctionInfo[] = [];

    // Match function declarations
    const functionRegex = /((?:public|private|internal|protected)\s+)?((?:open|final|abstract|override|inline|suspend|operator|infix)\s+)*fun\s+(?:(<[^>]+>)\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{=]+))?\s*[{=]/g;
    let match;

    while ((match = functionRegex.exec(body)) !== null) {
      const visibility = match[1]?.trim();
      const modifiersStr = match[2]?.trim();
      const generics = match[3];
      const functionName = match[4];
      const parametersStr = match[5] || '';
      const returnType = match[6]?.trim();

      const modifiers: string[] = [];
      if (visibility) modifiers.push(visibility);
      if (modifiersStr) {
        modifiers.push(...modifiersStr.split(/\s+/).filter(m => m));
      }

      const isSuspend = modifiers.includes('suspend');
      const isInline = modifiers.includes('inline');
      const isOperator = modifiers.includes('operator');
      const isExtension = this.isExtensionFunction(match[0]);

      const parameters = this.parseParameters(parametersStr);
      const lineNumber = body.substring(0, match.index).split('\n').length;

      functions.push({
        name: functionName,
        modifiers,
        parameters,
        returnType,
        isExtension,
        isSuspend,
        isInline,
        isOperator,
        lineNumber
      });
    }

    return functions;
  }

  private extractProperties(body: string): KotlinPropertyInfo[] {
    const properties: String[] = [];

    // Match property declarations
    const propertyRegex = /((?:public|private|internal|protected)\s+)?((?:open|final|abstract|override|const|lateinit|lazy)\s+)*(val|var)\s+(\w+)\s*:\s*([^={]+)(?:\s*[=\{])?/g;
    let match;

    while ((match = propertyRegex.exec(body)) !== null) {
      const visibility = match[1]?.trim();
      const modifiersStr = match[2]?.trim();
      const declaration = match[3]; // 'val' or 'var'
      const propertyName = match[4];
      const propertyType = match[5]?.trim();

      const modifiers: string[] = [];
      if (visibility) modifiers.push(visibility);
      if (modifiersStr) {
        modifiers.push(...modifiersStr.split(/\s+/).filter(m => m));
      }
      modifiers.push(declaration);

      const isVar = declaration === 'var';
      const isLateInit = modifiers.includes('lateinit');
      const isLazy = modifiers.includes('lazy');

      // Simple heuristic for custom accessors (could be improved)
      const restOfDeclaration = body.substring(match.index + match[0].length);
      const hasCustomGetter = /^\s*\{\s*get\s*\(/.test(restOfDeclaration);
      const hasCustomSetter = /set\s*\(/.test(restOfDeclaration);

      const lineNumber = body.substring(0, match.index).split('\n').length;

      properties.push({
        name: propertyName,
        type: propertyType,
        modifiers,
        isVar,
        hasCustomGetter,
        hasCustomSetter,
        isLateInit,
        isLazy,
        lineNumber
      } as any);
    }

    return properties as any;
  }

  private extractConstructors(body: string, primaryConstructor?: string): KotlinConstructorInfo[] {
    const constructors: KotlinConstructorInfo[] = [];

    // Add primary constructor if present
    if (primaryConstructor) {
      const parameters = this.parseParameters(primaryConstructor);
      constructors.push({
        parameters,
        isPrimary: true,
        isSecondary: false,
        modifiers: [],
        lineNumber: 1
      });
    }

    // Extract secondary constructors
    const constructorRegex = /((?:public|private|internal|protected)\s+)?constructor\s*\(([^)]*)\)/g;
    let match;

    while ((match = constructorRegex.exec(body)) !== null) {
      const visibility = match[1]?.trim();
      const parametersStr = match[2] || '';

      const modifiers: string[] = [];
      if (visibility) modifiers.push(visibility);

      const parameters = this.parseParameters(parametersStr);
      const lineNumber = body.substring(0, match.index).split('\n').length;

      constructors.push({
        parameters,
        isPrimary: false,
        isSecondary: true,
        modifiers,
        lineNumber
      });
    }

    return constructors;
  }

  private extractTopLevelFunctions(content: string, types: KotlinTypeInfo[]): KotlinFunctionInfo[] {
    const functions: KotlinFunctionInfo[] = [];

    // Find functions outside of type declarations (including @Composable functions)
    const functionRegex = /(?:@\w+\s+)*((?:public|private|internal)\s+)?((?:inline|suspend|operator)\s+)*fun\s+(?:(<[^>]+>)\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{=]+))?\s*[{=]/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;

      // Check if this function is inside a type
      let insideType = false;
      for (const typeInfo of types) {
        // Check if function is within the type's body by analyzing braces
        const typeStartIndex = content.indexOf(`${typeInfo.kind} ${typeInfo.name}`);
        if (typeStartIndex !== -1) {
          const afterTypeDecl = content.substring(typeStartIndex);
          const openBraceIndex = afterTypeDecl.indexOf('{');
          if (openBraceIndex !== -1) {
            const absoluteOpenBrace = typeStartIndex + openBraceIndex;
            let braceCount = 1;
            let closeBraceIndex = absoluteOpenBrace + 1;

            // Find matching closing brace
            while (closeBraceIndex < content.length && braceCount > 0) {
              if (content[closeBraceIndex] === '{') braceCount++;
              else if (content[closeBraceIndex] === '}') braceCount--;
              closeBraceIndex++;
            }

            // Check if function is within the type's braces
            if (match.index > absoluteOpenBrace && match.index < closeBraceIndex) {
              insideType = true;
              break;
            }
          }
        }
      }

      if (!insideType) {
        const visibility = match[1]?.trim();
        const modifiersStr = match[2]?.trim();
        const generics = match[3];
        const functionName = match[4];
        const parametersStr = match[5] || '';
        const returnType = match[6]?.trim();

        const modifiers: string[] = [];
        if (visibility) modifiers.push(visibility);
        if (modifiersStr) {
          modifiers.push(...modifiersStr.split(/\s+/).filter(m => m));
        }

        const isSuspend = modifiers.includes('suspend');
        const isInline = modifiers.includes('inline');
        const isOperator = modifiers.includes('operator');
        const isExtension = this.isExtensionFunction(match[0]);

        const parameters = this.parseParameters(parametersStr);

        functions.push({
          name: functionName,
          modifiers,
          parameters,
          returnType,
          isExtension,
          isSuspend,
          isInline,
          isOperator,
          lineNumber
        });
      }
    }

    return functions;
  }

  private parseParameters(parametersStr: string): KotlinParameterInfo[] {
    if (!parametersStr.trim()) return [];

    const parameters: KotlinParameterInfo[] = [];
    const paramParts = this.splitParameters(parametersStr);

    for (const part of paramParts) {
      const trimmed = part.trim();

      // Parse Kotlin parameter format: [modifier] name: Type = default
      const paramMatch = trimmed.match(/(vararg\s+)?(val|var\s+)?(\w+)\s*:\s*([^=]+)(?:\s*=\s*(.+))?/);

      if (paramMatch) {
        const isVararg = !!paramMatch[1];
        const modifier = paramMatch[2]?.trim() as 'val' | 'var' | undefined;
        const paramName = paramMatch[3];
        const paramType = paramMatch[4]?.trim();
        const defaultValue = paramMatch[5]?.trim();

        const hasDefault = !!defaultValue;

        parameters.push({
          name: paramName,
          type: paramType,
          hasDefault,
          defaultValue,
          isVararg,
          modifier
        });
      }
    }

    return parameters;
  }

  private splitParameters(parametersStr: string): string[] {
    // Simple parameter splitting - could be improved for nested generics
    const parts: string[] = [];
    let current = '';
    let parenLevel = 0;
    let angleLevel = 0;

    for (const char of parametersStr) {
      if (char === '(') parenLevel++;
      else if (char === ')') parenLevel--;
      else if (char === '<') angleLevel++;
      else if (char === '>') angleLevel--;
      else if (char === ',' && parenLevel === 0 && angleLevel === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  }

  private isExtensionFunction(declaration: string): boolean {
    // Simple heuristic: check if there's a receiver type before the function name
    return /fun\s+\w+\.\w+\s*\(/.test(declaration);
  }

  private detectFrameworks(content: string, filePath: string): KotlinFrameworkInfo[] {
    const frameworks: KotlinFrameworkInfo[] = [];

    for (const framework of this.KOTLIN_FRAMEWORKS) {
      let matches = 0;
      const foundIndicators: string[] = [];

      for (const indicator of framework.indicators) {
        if (indicator.test(content) || indicator.test(filePath)) {
          matches++;
          foundIndicators.push(indicator.source);
        }
      }

      if (matches > 0) {
        const confidence = Math.min(0.95, matches / framework.indicators.length);

        frameworks.push({
          name: framework.name,
          confidence,
          indicators: foundIndicators
        });
      }
    }

    return frameworks.sort((a, b) => b.confidence - a.confidence);
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];

    const importRegex = /import\s+([^\n]+)/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1].trim();

      // Skip import aliases for now
      if (!importPath.includes(' as ')) {
        imports.push(importPath);
      }
    }

    return [...new Set(imports)];
  }

  private createTypeNode(typeInfo: KotlinTypeInfo, filePath: string): MindMapNode {
    return {
      id: `kotlin_${typeInfo.kind.replace(' ', '_')}_${typeInfo.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'class',
      name: typeInfo.name,
      path: filePath,
      metadata: {
        language: 'kotlin',
        classType: typeInfo.kind,
        modifiers: typeInfo.modifiers,
        superTypes: typeInfo.superTypes,
        functionCount: typeInfo.functions.length,
        propertyCount: typeInfo.properties.length,
        constructorCount: typeInfo.constructors.length,
        lineNumber: typeInfo.lineNumber
      },
      confidence: 0.9,
      lastUpdated: new Date()
    };
  }

  private createFunctionNode(func: KotlinFunctionInfo, typeName: string, filePath: string): MindMapNode {
    return {
      id: `kotlin_method_${typeName}_${func.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'function',
      name: `${typeName}.${func.name}`,
      path: filePath,
      metadata: {
        language: 'kotlin',
        functionType: 'method',
        className: typeName,
        modifiers: func.modifiers,
        parameters: func.parameters.map(p => p.name),
        parameterCount: func.parameters.length,
        returnType: func.returnType,
        isExtension: func.isExtension,
        isSuspend: func.isSuspend,
        isInline: func.isInline,
        isOperator: func.isOperator,
        lineNumber: func.lineNumber
      },
      confidence: 0.85,
      lastUpdated: new Date()
    };
  }

  private createTopLevelFunctionNode(func: KotlinFunctionInfo, filePath: string): MindMapNode {
    return {
      id: `kotlin_function_${func.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'function',
      name: func.name,
      path: filePath,
      metadata: {
        language: 'kotlin',
        functionType: 'function',
        modifiers: func.modifiers,
        parameters: func.parameters.map(p => p.name),
        parameterCount: func.parameters.length,
        returnType: func.returnType,
        isExtension: func.isExtension,
        isSuspend: func.isSuspend,
        isInline: func.isInline,
        isOperator: func.isOperator,
        lineNumber: func.lineNumber
      },
      confidence: 0.85,
      lastUpdated: new Date()
    };
  }
}