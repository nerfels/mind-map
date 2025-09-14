import { MindMapNode, MindMapEdge } from '../types/index.js';
import { readFile } from 'fs/promises';

export interface CSharpClassInfo {
  name: string;
  namespace?: string;
  baseClass?: string;
  interfaces?: string[];
  modifiers: string[];
  methods: CSharpMethodInfo[];
  properties: CSharpPropertyInfo[];
  fields: CSharpFieldInfo[];
  isClass: boolean;
  isInterface: boolean;
  isEnum: boolean;
  isStruct: boolean;
  isRecord: boolean;
}

export interface CSharpMethodInfo {
  name: string;
  modifiers: string[];
  returnType?: string;
  parameters: CSharpParameterInfo[];
  isConstructor: boolean;
  isDestructor: boolean;
  lineNumber: number;
}

export interface CSharpParameterInfo {
  name: string;
  type?: string;
  hasDefault: boolean;
  defaultValue?: string;
  isParams: boolean;
  isRef: boolean;
  isOut: boolean;
}

export interface CSharpPropertyInfo {
  name: string;
  type?: string;
  modifiers: string[];
  hasGetter: boolean;
  hasSetter: boolean;
  lineNumber: number;
}

export interface CSharpFieldInfo {
  name: string;
  type?: string;
  modifiers: string[];
  hasInitializer: boolean;
  lineNumber: number;
}

export interface CSharpNamespaceInfo {
  name: string;
  classes: string[];
  interfaces: string[];
  enums: string[];
}

export interface CSharpFrameworkInfo {
  name: string;
  version?: string;
  confidence: number;
  indicators: string[];
}

/**
 * C# Language Analyzer
 * Analyzes C# files for classes, methods, properties, and .NET framework usage
 */
export class CSharpAnalyzer {
  private readonly CSHARP_FRAMEWORKS = [
    {
      name: 'aspnet_core',
      indicators: [
        /using\s+Microsoft\.AspNetCore/,
        /using\s+Microsoft\.Extensions/,
        /\[ApiController\]/,
        /\[Route\(/,
        /\[HttpGet\]/,
        /\[HttpPost\]/,
        /\[HttpPut\]/,
        /\[HttpDelete\]/,
        /WebApplicationBuilder/,
        /WebApplication/,
        /Startup\.cs/,
        /Program\.cs/
      ]
    },
    {
      name: 'aspnet_mvc',
      indicators: [
        /using\s+System\.Web\.Mvc/,
        /using\s+System\.Web/,
        /extends\s+Controller/,
        /ActionResult/,
        /ViewResult/,
        /JsonResult/,
        /RedirectResult/,
        /Global\.asax/
      ]
    },
    {
      name: 'wpf',
      indicators: [
        /using\s+System\.Windows/,
        /using\s+System\.Windows\.Controls/,
        /using\s+System\.Windows\.Data/,
        /Window\s+\w+\s*:/,
        /UserControl/,
        /DependencyProperty/,
        /\.xaml/,
        /App\.xaml/
      ]
    },
    {
      name: 'winforms',
      indicators: [
        /using\s+System\.Windows\.Forms/,
        /using\s+System\.Drawing/,
        /Form\s+\w+\s*:/,
        /extends\s+Form/,
        /Button/,
        /TextBox/,
        /Label/,
        /Application\.Run/
      ]
    },
    {
      name: 'blazor',
      indicators: [
        /using\s+Microsoft\.AspNetCore\.Blazor/,
        /using\s+Microsoft\.AspNetCore\.Components/,
        /@page\s+"/,
        /@inject/,
        /@code/,
        /ComponentBase/,
        /StateHasChanged/,
        /\.razor/
      ]
    },
    {
      name: 'xamarin',
      indicators: [
        /using\s+Xamarin\.Forms/,
        /using\s+Xamarin\.Essentials/,
        /ContentPage/,
        /Application\s+\w+\s*:/,
        /Device\.RuntimePlatform/,
        /MainActivity\.cs/,
        /AppDelegate\.cs/
      ]
    },
    {
      name: 'maui',
      indicators: [
        /using\s+Microsoft\.Maui/,
        /using\s+Microsoft\.Extensions\.Logging/,
        /MauiApp/,
        /CreateMauiApp/,
        /UseMauiApp/,
        /Platforms\//
      ]
    },
    {
      name: 'entityframework',
      indicators: [
        /using\s+Microsoft\.EntityFrameworkCore/,
        /using\s+System\.Data\.Entity/,
        /DbContext/,
        /DbSet/,
        /\[Table\(/,
        /\[Column\(/,
        /\[Key\]/,
        /modelBuilder/
      ]
    },
    {
      name: 'unity',
      indicators: [
        /using\s+UnityEngine/,
        /using\s+UnityEditor/,
        /MonoBehaviour/,
        /ScriptableObject/,
        /GameObject/,
        /Transform/,
        /Awake\(\)/,
        /Start\(\)/,
        /Update\(\)/
      ]
    },
    {
      name: 'nunit',
      indicators: [
        /using\s+NUnit\.Framework/,
        /\[Test\]/,
        /\[TestFixture\]/,
        /\[SetUp\]/,
        /\[TearDown\]/,
        /Assert\./
      ]
    },
    {
      name: 'xunit',
      indicators: [
        /using\s+Xunit/,
        /\[Fact\]/,
        /\[Theory\]/,
        /\[InlineData\(/,
        /Assert\./
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
        id: `csharp_file_${filePath.replace(/[^\w]/g, '_')}`,
        type: 'file',
        name: fileName,
        path: filePath,
        metadata: {
          language: 'csharp',
          extension: fileName.endsWith('.cs') ? '.cs' : fileName.endsWith('.csx') ? '.csx' : '.cs',
          size: fileContent.length,
          lines: fileContent.split('\n').length
        },
        confidence: 0.95,
        lastUpdated: new Date()
      };

      nodes.push(fileNode);

      // Extract namespaces
      const namespaces = this.extractNamespaces(fileContent);
      for (const namespaceInfo of namespaces) {
        const namespaceNode: MindMapNode = {
          id: `csharp_namespace_${namespaceInfo.name.replace(/[^\w]/g, '_')}_${filePath.replace(/[^\w]/g, '_')}`,
          type: 'pattern',
          name: `Namespace: ${namespaceInfo.name}`,
          metadata: {
            namespace: namespaceInfo.name,
            language: 'csharp',
            classCount: namespaceInfo.classes.length,
            interfaceCount: namespaceInfo.interfaces.length,
            enumCount: namespaceInfo.enums.length
          },
          confidence: 0.9,
          lastUpdated: new Date()
        };

        nodes.push(namespaceNode);

        edges.push({
          id: `contains_${fileNode.id}_${namespaceNode.id}`,
          source: fileNode.id,
          target: namespaceNode.id,
          type: 'contains',
          confidence: 0.9
        });
      }

      // Extract classes, interfaces, structs, enums, records
      const classes = this.extractClasses(fileContent);
      for (const classInfo of classes) {
        const classNode = this.createClassNode(classInfo, filePath);
        nodes.push(classNode);

        // Create containment edge
        edges.push({
          id: `contains_${fileNode.id}_${classNode.id}`,
          source: fileNode.id,
          target: classNode.id,
          type: 'contains',
          confidence: 0.9
        });

        // Add methods as function nodes
        for (const method of classInfo.methods) {
          const methodNode = this.createMethodNode(method, classInfo.name, filePath);
          nodes.push(methodNode);

          edges.push({
            id: `contains_${classNode.id}_${methodNode.id}`,
            source: classNode.id,
            target: methodNode.id,
            type: 'contains',
            confidence: 0.9
          });
        }

        // Add properties
        for (const property of classInfo.properties) {
          const propertyNode = this.createPropertyNode(property, classInfo.name, filePath);
          nodes.push(propertyNode);

          edges.push({
            id: `contains_${classNode.id}_${propertyNode.id}`,
            source: classNode.id,
            target: propertyNode.id,
            type: 'contains',
            confidence: 0.9
          });
        }
      }

      // Detect framework usage
      const frameworks = this.detectFrameworks(fileContent, filePath);
      for (const framework of frameworks) {
        fileNode.metadata.frameworks = fileNode.metadata.frameworks || [];
        if (!fileNode.metadata.frameworks.includes(framework.name)) {
          fileNode.metadata.frameworks.push(framework.name);
        }

        // Create framework pattern node
        const frameworkNode: MindMapNode = {
          id: `csharp_framework_${framework.name}_${filePath.replace(/[^\w]/g, '_')}`,
          type: 'pattern',
          name: `${framework.name} Framework`,
          metadata: {
            framework: framework.name,
            confidence: framework.confidence,
            indicators: framework.indicators,
            language: 'csharp'
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

      // Extract using statements
      const usings = this.extractUsings(fileContent);
      for (const usingPath of usings) {
        const usingNode: MindMapNode = {
          id: `csharp_using_${usingPath.replace(/[^\w]/g, '_')}_${filePath.replace(/[^\w]/g, '_')}`,
          type: 'pattern',
          name: `Using: ${usingPath}`,
          metadata: {
            usingPath,
            language: 'csharp',
            type: 'using'
          },
          confidence: 0.8,
          lastUpdated: new Date()
        };

        nodes.push(usingNode);

        edges.push({
          id: `imports_${fileNode.id}_${usingNode.id}`,
          source: fileNode.id,
          target: usingNode.id,
          type: 'imports',
          confidence: 0.8
        });
      }

    } catch (error) {
      console.error(`Error analyzing C# file ${filePath}:`, error);
    }

    return { nodes, edges };
  }

  private extractNamespaces(content: string): CSharpNamespaceInfo[] {
    const namespaces: CSharpNamespaceInfo[] = [];

    // Match namespace declarations
    const namespaceRegex = /namespace\s+([\w\.]+)\s*\{/g;
    let match;

    while ((match = namespaceRegex.exec(content)) !== null) {
      const namespaceName = match[1];

      // Extract namespace body
      const namespaceStart = match.index + match[0].length;
      const namespaceBody = this.extractNamespaceBody(content, namespaceStart);

      const namespaceInfo: CSharpNamespaceInfo = {
        name: namespaceName,
        classes: this.extractTypeNames(namespaceBody, 'class'),
        interfaces: this.extractTypeNames(namespaceBody, 'interface'),
        enums: this.extractTypeNames(namespaceBody, 'enum')
      };

      namespaces.push(namespaceInfo);
    }

    return namespaces;
  }

  private extractNamespaceBody(content: string, startIndex: number): string {
    let braceCount = 1;
    let index = startIndex;

    while (index < content.length && braceCount > 0) {
      if (content[index] === '{') braceCount++;
      else if (content[index] === '}') braceCount--;
      index++;
    }

    return content.substring(startIndex, index - 1);
  }

  private extractTypeNames(content: string, type: string): string[] {
    const names: string[] = [];
    const regex = new RegExp(`(?:public|private|protected|internal)?\\s*(?:static\\s+)?(?:partial\\s+)?${type}\\s+(\\w+)`, 'g');
    let match;

    while ((match = regex.exec(content)) !== null) {
      names.push(match[1]);
    }

    return names;
  }

  private extractClasses(content: string): CSharpClassInfo[] {
    const classes: CSharpClassInfo[] = [];

    // Match class, interface, struct, enum, record declarations
    const typeRegex = /((?:public|private|protected|internal)\s+)?((?:static|abstract|sealed|partial)\s+)?(class|interface|struct|enum|record)\s+(\w+)(?:\s*:\s*([^{]+))?\s*\{/g;
    let match;

    while ((match = typeRegex.exec(content)) !== null) {
      const accessibility = match[1]?.trim() || 'internal';
      const modifiersStr = match[2]?.trim() || '';
      const typeKind = match[3];
      const typeName = match[4];
      const inheritance = match[5]?.trim();

      const modifiers = [accessibility];
      if (modifiersStr) {
        modifiers.push(...modifiersStr.split(/\s+/));
      }

      // Parse inheritance
      let baseClass: string | undefined;
      let interfaces: string[] = [];

      if (inheritance) {
        const parts = inheritance.split(',').map(p => p.trim());
        if (typeKind === 'class') {
          // First item might be base class
          const firstPart = parts[0];
          if (firstPart && !firstPart.startsWith('I')) {
            baseClass = firstPart;
            interfaces = parts.slice(1);
          } else {
            interfaces = parts;
          }
        } else {
          interfaces = parts;
        }
      }

      // Find type body
      const typeStart = match.index + match[0].length;
      const typeBody = this.extractTypeBody(content, typeStart);

      const classInfo: CSharpClassInfo = {
        name: typeName,
        modifiers,
        baseClass,
        interfaces,
        methods: this.extractMethods(typeBody, typeName),
        properties: this.extractProperties(typeBody),
        fields: this.extractFields(typeBody),
        isClass: typeKind === 'class',
        isInterface: typeKind === 'interface',
        isEnum: typeKind === 'enum',
        isStruct: typeKind === 'struct',
        isRecord: typeKind === 'record'
      };

      classes.push(classInfo);
    }

    return classes;
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

  private extractMethods(typeBody: string, typeName: string): CSharpMethodInfo[] {
    const methods: CSharpMethodInfo[] = [];

    // Match method declarations
    const methodRegex = /((?:public|private|protected|internal)\s+)?((?:static|virtual|override|abstract|sealed|async|extern)\s+)*(?:(\w+(?:<[^>]+>)?)\s+)?(\w+)\s*\(([^)]*)\)\s*[{;]/g;
    let match;

    while ((match = methodRegex.exec(typeBody)) !== null) {
      const accessibility = match[1]?.trim();
      const modifiersStr = match[2]?.trim() || '';
      const returnType = match[3];
      const methodName = match[4];
      const parametersStr = match[5] || '';

      // Skip property accessors
      if (methodName === 'get' || methodName === 'set') {
        continue;
      }

      const modifiers: string[] = [];
      if (accessibility) modifiers.push(accessibility);
      if (modifiersStr) {
        modifiers.push(...modifiersStr.split(/\s+/).filter(m => m));
      }

      const parameters = this.parseParameters(parametersStr);
      const lineNumber = typeBody.substring(0, match.index).split('\n').length;

      const isConstructor = methodName === typeName;
      const isDestructor = methodName === `~${typeName}`;

      methods.push({
        name: methodName,
        modifiers,
        returnType: isConstructor || isDestructor ? undefined : returnType,
        parameters,
        isConstructor,
        isDestructor,
        lineNumber
      });
    }

    return methods;
  }

  private extractProperties(typeBody: string): CSharpPropertyInfo[] {
    const properties: CSharpPropertyInfo[] = [];

    // Match property declarations
    const propertyRegex = /((?:public|private|protected|internal)\s+)?((?:static|virtual|override|abstract)\s+)?(\w+(?:<[^>]+>)?)\s+(\w+)\s*\{([^}]*)\}/g;
    let match;

    while ((match = propertyRegex.exec(typeBody)) !== null) {
      const accessibility = match[1]?.trim() || 'private';
      const modifiersStr = match[2]?.trim() || '';
      const propertyType = match[3];
      const propertyName = match[4];
      const accessorBody = match[5];

      const modifiers = [accessibility];
      if (modifiersStr) {
        modifiers.push(...modifiersStr.split(/\s+/));
      }

      const hasGetter = /\bget\b/.test(accessorBody);
      const hasSetter = /\bset\b/.test(accessorBody);
      const lineNumber = typeBody.substring(0, match.index).split('\n').length;

      properties.push({
        name: propertyName,
        type: propertyType,
        modifiers,
        hasGetter,
        hasSetter,
        lineNumber
      });
    }

    return properties;
  }

  private extractFields(typeBody: string): CSharpFieldInfo[] {
    const fields: CSharpFieldInfo[] = [];

    // Match field declarations
    const fieldRegex = /((?:public|private|protected|internal)\s+)?((?:static|readonly|const)\s+)?(\w+(?:<[^>]+>)?)\s+(\w+)(\s*=\s*[^;]+)?;/g;
    let match;

    while ((match = fieldRegex.exec(typeBody)) !== null) {
      const accessibility = match[1]?.trim() || 'private';
      const modifiersStr = match[2]?.trim() || '';
      const fieldType = match[3];
      const fieldName = match[4];
      const hasInitializer = !!match[5];

      const modifiers = [accessibility];
      if (modifiersStr) {
        modifiers.push(...modifiersStr.split(/\s+/));
      }

      const lineNumber = typeBody.substring(0, match.index).split('\n').length;

      fields.push({
        name: fieldName,
        type: fieldType,
        modifiers,
        hasInitializer,
        lineNumber
      });
    }

    return fields;
  }

  private parseParameters(parametersStr: string): CSharpParameterInfo[] {
    if (!parametersStr.trim()) return [];

    const parameters: CSharpParameterInfo[] = [];
    const paramParts = parametersStr.split(',');

    for (const part of paramParts) {
      const paramMatch = part.trim().match(/((?:params|ref|out|in)\s+)?(?:(\w+(?:<[^>]+>)?)\s+)?(\w+)(?:\s*=\s*(.+))?/);

      if (paramMatch) {
        const modifierStr = paramMatch[1]?.trim();
        const paramType = paramMatch[2];
        const paramName = paramMatch[3];
        const hasDefault = !!paramMatch[4];
        const defaultValue = paramMatch[4]?.trim();

        const isParams = modifierStr === 'params';
        const isRef = modifierStr === 'ref';
        const isOut = modifierStr === 'out';

        parameters.push({
          name: paramName,
          type: paramType,
          hasDefault,
          defaultValue,
          isParams,
          isRef,
          isOut
        });
      }
    }

    return parameters;
  }

  private detectFrameworks(content: string, filePath: string): CSharpFrameworkInfo[] {
    const frameworks: CSharpFrameworkInfo[] = [];

    for (const framework of this.CSHARP_FRAMEWORKS) {
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

    // Sort by confidence
    return frameworks.sort((a, b) => b.confidence - a.confidence);
  }

  private extractUsings(content: string): string[] {
    const usings: string[] = [];

    // Extract using statements
    const usingRegex = /using\s+(?:static\s+)?([^;=]+)(?:\s*=\s*[^;]+)?;/g;
    let match;

    while ((match = usingRegex.exec(content)) !== null) {
      const usingPath = match[1].trim();

      // Skip using statements with aliases that have = sign
      if (!content.substring(match.index, match.index + match[0].length).includes('=') ||
          content.substring(match.index, match.index + match[0].length).indexOf('=') >
          content.substring(match.index, match.index + match[0].length).indexOf(';')) {
        usings.push(usingPath);
      }
    }

    return [...new Set(usings)]; // Remove duplicates
  }

  private createClassNode(classInfo: CSharpClassInfo, filePath: string): MindMapNode {
    return {
      id: `csharp_class_${classInfo.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'class',
      name: classInfo.name,
      path: filePath,
      metadata: {
        language: 'csharp',
        classType: classInfo.isClass ? 'class' :
                   classInfo.isInterface ? 'interface' :
                   classInfo.isStruct ? 'struct' :
                   classInfo.isEnum ? 'enum' :
                   classInfo.isRecord ? 'record' : 'class',
        modifiers: classInfo.modifiers,
        baseClass: classInfo.baseClass,
        interfaces: classInfo.interfaces,
        methodCount: classInfo.methods.length,
        propertyCount: classInfo.properties.length,
        fieldCount: classInfo.fields.length,
        namespace: classInfo.namespace
      },
      confidence: 0.9,
      lastUpdated: new Date()
    };
  }

  private createMethodNode(method: CSharpMethodInfo, className: string, filePath: string): MindMapNode {
    return {
      id: `csharp_method_${className}_${method.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'function',
      name: method.isConstructor ? `${className}()` : `${className}.${method.name}`,
      path: filePath,
      metadata: {
        language: 'csharp',
        functionType: method.isConstructor ? 'constructor' :
                     method.isDestructor ? 'destructor' : 'method',
        className,
        modifiers: method.modifiers,
        parameters: method.parameters.map(p => p.name),
        parameterCount: method.parameters.length,
        returnType: method.returnType,
        lineNumber: method.lineNumber
      },
      confidence: 0.85,
      lastUpdated: new Date()
    };
  }

  private createPropertyNode(property: CSharpPropertyInfo, className: string, filePath: string): MindMapNode {
    return {
      id: `csharp_property_${className}_${property.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'pattern',
      name: `${className}.${property.name}`,
      path: filePath,
      metadata: {
        language: 'csharp',
        patternType: 'property',
        className,
        propertyType: property.type,
        modifiers: property.modifiers,
        hasGetter: property.hasGetter,
        hasSetter: property.hasSetter,
        lineNumber: property.lineNumber
      },
      confidence: 0.8,
      lastUpdated: new Date()
    };
  }
}