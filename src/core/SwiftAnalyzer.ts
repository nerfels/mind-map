import { MindMapNode, MindMapEdge } from '../types/index.js';
import { readFile } from 'fs/promises';

export interface SwiftTypeInfo {
  name: string;
  kind: 'class' | 'struct' | 'enum' | 'protocol' | 'actor';
  modifiers: string[];
  protocols: string[];
  superclass?: string;
  methods: SwiftMethodInfo[];
  properties: SwiftPropertyInfo[];
  initializers: SwiftInitializerInfo[];
  lineNumber: number;
}

export interface SwiftMethodInfo {
  name: string;
  modifiers: string[];
  parameters: SwiftParameterInfo[];
  returnType?: string;
  isMutating: boolean;
  isAsync: boolean;
  isThrows: boolean;
  lineNumber: number;
}

export interface SwiftParameterInfo {
  name: string;
  externalName?: string;
  type?: string;
  hasDefault: boolean;
  defaultValue?: string;
  isInout: boolean;
  isVariadic: boolean;
}

export interface SwiftPropertyInfo {
  name: string;
  type?: string;
  modifiers: string[];
  hasGetter: boolean;
  hasSetter: boolean;
  isComputed: boolean;
  lineNumber: number;
}

export interface SwiftInitializerInfo {
  parameters: SwiftParameterInfo[];
  isFailable: boolean;
  isRequired: boolean;
  isConvenience: boolean;
  lineNumber: number;
}

export interface SwiftFrameworkInfo {
  name: string;
  confidence: number;
  indicators: string[];
}

/**
 * Swift Language Analyzer
 * Analyzes Swift files for classes, structs, enums, protocols, and iOS/macOS framework usage
 */
export class SwiftAnalyzer {
  private readonly SWIFT_FRAMEWORKS = [
    {
      name: 'uikit',
      indicators: [
        /import\s+UIKit/,
        /UIViewController/,
        /UIView/,
        /UIButton/,
        /UILabel/,
        /UITableView/,
        /UINavigationController/,
        /viewDidLoad/,
        /viewWillAppear/
      ]
    },
    {
      name: 'swiftui',
      indicators: [
        /import\s+SwiftUI/,
        /View\s*\{/,
        /body:\s*some\s+View/,
        /@State/,
        /@Binding/,
        /@ObservedObject/,
        /@EnvironmentObject/,
        /NavigationView/,
        /VStack/,
        /HStack/
      ]
    },
    {
      name: 'foundation',
      indicators: [
        /import\s+Foundation/,
        /NSObject/,
        /String/,
        /Array/,
        /Dictionary/,
        /Date/,
        /URL/,
        /UserDefaults/,
        /NotificationCenter/
      ]
    },
    {
      name: 'core_data',
      indicators: [
        /import\s+CoreData/,
        /NSManagedObject/,
        /NSPersistentContainer/,
        /NSFetchRequest/,
        /NSManagedObjectContext/,
        /@NSManaged/
      ]
    },
    {
      name: 'combine',
      indicators: [
        /import\s+Combine/,
        /Publisher/,
        /Subscriber/,
        /@Published/,
        /AnyCancellable/,
        /\.sink/,
        /\.receive/
      ]
    },
    {
      name: 'network',
      indicators: [
        /import\s+Network/,
        /URLSession/,
        /URLRequest/,
        /dataTask/,
        /JSONDecoder/,
        /JSONEncoder/
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
        id: `swift_file_${filePath.replace(/[^\w]/g, '_')}`,
        type: 'file',
        name: fileName,
        path: filePath,
        metadata: {
          language: 'swift',
          extension: '.swift',
          size: fileContent.length,
          lines: fileContent.split('\n').length
        },
        confidence: 0.95,
        lastUpdated: new Date()
      };

      nodes.push(fileNode);

      // Extract types (classes, structs, enums, protocols, actors)
      const types = this.extractTypes(fileContent);
      for (const typeInfo of types) {
        const typeNode = this.createTypeNode(typeInfo, filePath);
        nodes.push(typeNode);

        // Create containment edge
        edges.push({
          id: `contains_${fileNode.id}_${typeNode.id}`,
          source: fileNode.id,
          target: typeNode.id,
          type: 'contains',
          confidence: 0.9
        });

        // Add methods
        for (const method of typeInfo.methods) {
          const methodNode = this.createMethodNode(method, typeInfo.name, filePath);
          nodes.push(methodNode);

          edges.push({
            id: `contains_${typeNode.id}_${methodNode.id}`,
            source: typeNode.id,
            target: methodNode.id,
            type: 'contains',
            confidence: 0.9
          });
        }

        // Add initializers
        for (const init of typeInfo.initializers) {
          const initNode = this.createInitializerNode(init, typeInfo.name, filePath);
          nodes.push(initNode);

          edges.push({
            id: `contains_${typeNode.id}_${initNode.id}`,
            source: typeNode.id,
            target: initNode.id,
            type: 'contains',
            confidence: 0.9
          });
        }
      }

      // Extract global functions
      const globalFunctions = this.extractGlobalFunctions(fileContent, types);
      for (const func of globalFunctions) {
        const funcNode = this.createGlobalFunctionNode(func, filePath);
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
          id: `swift_framework_${framework.name}_${filePath.replace(/[^\w]/g, '_')}`,
          type: 'pattern',
          name: `${framework.name} Framework`,
          metadata: {
            framework: framework.name,
            confidence: framework.confidence,
            indicators: framework.indicators,
            language: 'swift'
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
          id: `swift_import_${importPath.replace(/[^\w]/g, '_')}_${filePath.replace(/[^\w]/g, '_')}`,
          type: 'pattern',
          name: `Import: ${importPath}`,
          metadata: {
            importPath,
            language: 'swift',
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
      console.error(`Error analyzing Swift file ${filePath}:`, error);
    }

    return { nodes, edges };
  }

  private extractTypes(content: string): SwiftTypeInfo[] {
    const types: SwiftTypeInfo[] = [];

    // Match type declarations
    const typeRegex = /((?:public|private|internal|fileprivate|open)\s+)?((?:final|static|dynamic|lazy|weak|unowned)\s+)?(class|struct|enum|protocol|actor)\s+(\w+)(?:\s*:\s*([^{]+))?\s*\{/g;
    let match;

    while ((match = typeRegex.exec(content)) !== null) {
      const accessModifier = match[1]?.trim();
      const otherModifiers = match[2]?.trim();
      const kind = match[3] as 'class' | 'struct' | 'enum' | 'protocol' | 'actor';
      const typeName = match[4];
      const inheritance = match[5]?.trim();

      const modifiers: string[] = [];
      if (accessModifier) modifiers.push(accessModifier);
      if (otherModifiers) modifiers.push(...otherModifiers.split(/\s+/));

      // Parse inheritance (protocols and superclass)
      let superclass: string | undefined;
      let protocols: string[] = [];

      if (inheritance) {
        const parts = inheritance.split(',').map(p => p.trim());
        if (kind === 'class') {
          // First might be superclass, rest are protocols
          const firstPart = parts[0];
          if (firstPart && !firstPart.endsWith('Protocol') && !this.isKnownProtocol(firstPart)) {
            superclass = firstPart;
            protocols = parts.slice(1);
          } else {
            protocols = parts;
          }
        } else {
          protocols = parts;
        }
      }

      const lineNumber = content.substring(0, match.index).split('\n').length;

      // Extract type body
      const typeStart = match.index + match[0].length;
      const typeBody = this.extractTypeBody(content, typeStart);

      const typeInfo: SwiftTypeInfo = {
        name: typeName,
        kind,
        modifiers,
        protocols,
        superclass,
        methods: this.extractMethods(typeBody),
        properties: this.extractProperties(typeBody),
        initializers: this.extractInitializers(typeBody),
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

  private extractMethods(body: string): SwiftMethodInfo[] {
    const methods: SwiftMethodInfo[] = [];

    // Match function declarations
    const methodRegex = /((?:public|private|internal|fileprivate|open)\s+)?((?:static|class|final|override|mutating|async)\s+)*func\s+(\w+)\s*\(([^)]*)\)(?:\s*async)?(?:\s*throws)?(?:\s*->\s*([^{]+))?\s*\{/g;
    let match;

    while ((match = methodRegex.exec(body)) !== null) {
      const accessModifier = match[1]?.trim();
      const otherModifiers = match[2]?.trim();
      const methodName = match[3];
      const parametersStr = match[4] || '';
      const returnType = match[5]?.trim();

      const modifiers: string[] = [];
      if (accessModifier) modifiers.push(accessModifier);
      if (otherModifiers) modifiers.push(...otherModifiers.split(/\s+/).filter(m => m));

      const isMutating = modifiers.includes('mutating');
      const isAsync = match[0].includes('async');
      const isThrows = match[0].includes('throws');

      const parameters = this.parseParameters(parametersStr);
      const lineNumber = body.substring(0, match.index).split('\n').length;

      methods.push({
        name: methodName,
        modifiers,
        parameters,
        returnType,
        isMutating,
        isAsync,
        isThrows,
        lineNumber
      });
    }

    return methods;
  }

  private extractProperties(body: string): SwiftPropertyInfo[] {
    const properties: SwiftPropertyInfo[] = [];

    // Match property declarations
    const propertyRegex = /((?:public|private|internal|fileprivate|open)\s+)?((?:static|class|lazy|weak|unowned)\s+)?(var|let)\s+(\w+)\s*:\s*([^{=\n]+)(?:\s*\{([^}]*)\})?/g;
    let match;

    while ((match = propertyRegex.exec(body)) !== null) {
      const accessModifier = match[1]?.trim();
      const otherModifiers = match[2]?.trim();
      const variableType = match[3]; // 'var' or 'let'
      const propertyName = match[4];
      const propertyType = match[5]?.trim();
      const accessorBody = match[6];

      const modifiers: string[] = [];
      if (accessModifier) modifiers.push(accessModifier);
      if (otherModifiers) modifiers.push(...otherModifiers.split(/\s+/));
      modifiers.push(variableType);

      const hasGetter = !accessorBody || /\bget\b/.test(accessorBody);
      const hasSetter = variableType === 'var' && (!accessorBody || /\bset\b/.test(accessorBody));
      const isComputed = !!accessorBody;

      const lineNumber = body.substring(0, match.index).split('\n').length;

      properties.push({
        name: propertyName,
        type: propertyType,
        modifiers,
        hasGetter,
        hasSetter,
        isComputed,
        lineNumber
      });
    }

    return properties;
  }

  private extractInitializers(body: string): SwiftInitializerInfo[] {
    const initializers: SwiftInitializerInfo[] = [];

    // Match initializer declarations
    const initRegex = /((?:public|private|internal|fileprivate)\s+)?((?:required|convenience)\s+)?init(\?)?(\([^)]*\))?\s*\{/g;
    let match;

    while ((match = initRegex.exec(body)) !== null) {
      const accessModifier = match[1]?.trim();
      const initModifiers = match[2]?.trim();
      const isFailable = !!match[3];
      const parametersStr = match[4] ? match[4].slice(1, -1) : ''; // Remove parentheses

      const isRequired = initModifiers?.includes('required') || false;
      const isConvenience = initModifiers?.includes('convenience') || false;

      const parameters = this.parseParameters(parametersStr);
      const lineNumber = body.substring(0, match.index).split('\n').length;

      initializers.push({
        parameters,
        isFailable,
        isRequired,
        isConvenience,
        lineNumber
      });
    }

    return initializers;
  }

  private extractGlobalFunctions(content: string, types: SwiftTypeInfo[]): SwiftMethodInfo[] {
    const functions: SwiftMethodInfo[] = [];

    // Find functions outside of type declarations
    const functionRegex = /((?:public|private|internal|fileprivate)\s+)?((?:static|async)\s+)*func\s+(\w+)\s*\(([^)]*)\)(?:\s*async)?(?:\s*throws)?(?:\s*->\s*([^{]+))?\s*\{/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;

      // Check if this function is inside a type
      let insideType = false;
      for (const typeInfo of types) {
        if (lineNumber > typeInfo.lineNumber) {
          insideType = true;
          break;
        }
      }

      if (!insideType) {
        const accessModifier = match[1]?.trim();
        const otherModifiers = match[2]?.trim();
        const functionName = match[3];
        const parametersStr = match[4] || '';
        const returnType = match[5]?.trim();

        const modifiers: string[] = [];
        if (accessModifier) modifiers.push(accessModifier);
        if (otherModifiers) modifiers.push(...otherModifiers.split(/\s+/).filter(m => m));

        const isAsync = match[0].includes('async');
        const isThrows = match[0].includes('throws');

        const parameters = this.parseParameters(parametersStr);

        functions.push({
          name: functionName,
          modifiers,
          parameters,
          returnType,
          isMutating: false,
          isAsync,
          isThrows,
          lineNumber
        });
      }
    }

    return functions;
  }

  private parseParameters(parametersStr: string): SwiftParameterInfo[] {
    if (!parametersStr.trim()) return [];

    const parameters: SwiftParameterInfo[] = [];
    const paramParts = this.splitParameters(parametersStr);

    for (const part of paramParts) {
      const trimmed = part.trim();

      // Parse Swift parameter format: [external] internal: Type = default
      const paramMatch = trimmed.match(/(?:(\w+)\s+)?(\w+)\s*:\s*([^=]+)(?:\s*=\s*(.+))?/);

      if (paramMatch) {
        const externalName = paramMatch[1];
        const internalName = paramMatch[2];
        const paramType = paramMatch[3]?.trim();
        const defaultValue = paramMatch[4]?.trim();

        const hasDefault = !!defaultValue;
        const isInout = paramType?.startsWith('inout ') || false;
        const isVariadic = paramType?.endsWith('...') || false;

        parameters.push({
          name: internalName,
          externalName: externalName !== internalName ? externalName : undefined,
          type: paramType,
          hasDefault,
          defaultValue,
          isInout,
          isVariadic
        });
      }
    }

    return parameters;
  }

  private splitParameters(parametersStr: string): string[] {
    // Simple parameter splitting - could be improved to handle nested generics
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

  private detectFrameworks(content: string, filePath: string): SwiftFrameworkInfo[] {
    const frameworks: SwiftFrameworkInfo[] = [];

    for (const framework of this.SWIFT_FRAMEWORKS) {
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

    const importRegex = /import\s+(?:class|struct|enum|protocol|typealias|var|func)?\s*([^\n]+)/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1].trim();
      imports.push(importPath);
    }

    return [...new Set(imports)];
  }

  private isKnownProtocol(name: string): boolean {
    const knownProtocols = [
      'Codable', 'Hashable', 'Equatable', 'Comparable',
      'CustomStringConvertible', 'Error', 'CaseIterable',
      'ObservableObject', 'View', 'Publisher', 'Subscriber'
    ];
    return knownProtocols.includes(name) || name.endsWith('Protocol');
  }

  private createTypeNode(typeInfo: SwiftTypeInfo, filePath: string): MindMapNode {
    return {
      id: `swift_${typeInfo.kind}_${typeInfo.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'class',
      name: typeInfo.name,
      path: filePath,
      metadata: {
        language: 'swift',
        classType: typeInfo.kind,
        modifiers: typeInfo.modifiers,
        superclass: typeInfo.superclass,
        protocols: typeInfo.protocols,
        methodCount: typeInfo.methods.length,
        propertyCount: typeInfo.properties.length,
        initializerCount: typeInfo.initializers.length,
        lineNumber: typeInfo.lineNumber
      },
      confidence: 0.9,
      lastUpdated: new Date()
    };
  }

  private createMethodNode(method: SwiftMethodInfo, typeName: string, filePath: string): MindMapNode {
    return {
      id: `swift_method_${typeName}_${method.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'function',
      name: `${typeName}.${method.name}`,
      path: filePath,
      metadata: {
        language: 'swift',
        functionType: 'method',
        className: typeName,
        modifiers: method.modifiers,
        parameters: method.parameters.map(p => p.name),
        parameterCount: method.parameters.length,
        returnType: method.returnType,
        isMutating: method.isMutating,
        isAsync: method.isAsync,
        isThrows: method.isThrows,
        lineNumber: method.lineNumber
      },
      confidence: 0.85,
      lastUpdated: new Date()
    };
  }

  private createInitializerNode(init: SwiftInitializerInfo, typeName: string, filePath: string): MindMapNode {
    const initId = `init_${init.parameters.map(p => p.name).join('_')}_${init.lineNumber}`;

    return {
      id: `swift_init_${typeName}_${initId}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'function',
      name: `${typeName}.init`,
      path: filePath,
      metadata: {
        language: 'swift',
        functionType: 'initializer',
        className: typeName,
        parameters: init.parameters.map(p => p.name),
        parameterCount: init.parameters.length,
        isFailable: init.isFailable,
        isRequired: init.isRequired,
        isConvenience: init.isConvenience,
        lineNumber: init.lineNumber
      },
      confidence: 0.85,
      lastUpdated: new Date()
    };
  }

  private createGlobalFunctionNode(func: SwiftMethodInfo, filePath: string): MindMapNode {
    return {
      id: `swift_function_${func.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'function',
      name: func.name,
      path: filePath,
      metadata: {
        language: 'swift',
        functionType: 'function',
        modifiers: func.modifiers,
        parameters: func.parameters.map(p => p.name),
        parameterCount: func.parameters.length,
        returnType: func.returnType,
        isAsync: func.isAsync,
        isThrows: func.isThrows,
        lineNumber: func.lineNumber
      },
      confidence: 0.85,
      lastUpdated: new Date()
    };
  }
}