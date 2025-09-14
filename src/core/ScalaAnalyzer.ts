import { MindMapNode, MindMapEdge } from '../types/index.js';
import { readFile } from 'fs/promises';

export interface ScalaTypeInfo {
  name: string;
  kind: 'class' | 'object' | 'trait' | 'case class' | 'abstract class' | 'sealed trait' | 'sealed class';
  modifiers: string[];
  typeParameters: string[];
  mixins: string[];
  superClass?: string;
  methods: ScalaMethodInfo[];
  fields: ScalaFieldInfo[];
  companionObject?: string;
  lineNumber: number;
}

export interface ScalaMethodInfo {
  name: string;
  modifiers: string[];
  typeParameters: string[];
  parameters: ScalaParameterInfo[][];
  returnType?: string;
  isAbstract: boolean;
  isOverride: boolean;
  isImplicit: boolean;
  lineNumber: number;
}

export interface ScalaParameterInfo {
  name: string;
  type?: string;
  hasDefault: boolean;
  defaultValue?: string;
  isImplicit: boolean;
  isByName: boolean;
  isVarargs: boolean;
}

export interface ScalaFieldInfo {
  name: string;
  type?: string;
  modifiers: string[];
  isVal: boolean;
  isVar: boolean;
  isLazy: boolean;
  lineNumber: number;
}

export interface ScalaFrameworkInfo {
  name: string;
  confidence: number;
  indicators: string[];
}

/**
 * Scala Language Analyzer
 * Analyzes Scala files for classes, objects, traits, and functional programming patterns
 */
export class ScalaAnalyzer {
  private readonly SCALA_FRAMEWORKS = [
    {
      name: 'akka',
      indicators: [
        /import\s+akka\./,
        /ActorSystem/,
        /ActorRef/,
        /Actor/,
        /Props/,
        /receive/,
        /sender/,
        /context\./
      ]
    },
    {
      name: 'play',
      indicators: [
        /import\s+play\./,
        /Controller/,
        /Action/,
        /Result/,
        /Ok\(/,
        /BadRequest\(/,
        /routes\./,
        /conf\/routes/
      ]
    },
    {
      name: 'spark',
      indicators: [
        /import\s+org\.apache\.spark/,
        /SparkContext/,
        /SparkSession/,
        /RDD/,
        /DataFrame/,
        /Dataset/,
        /\.spark/,
        /sqlContext/
      ]
    },
    {
      name: 'cats',
      indicators: [
        /import\s+cats\./,
        /Functor/,
        /Monad/,
        /Applicative/,
        /cats\.implicits\._/,
        /cats\.syntax\./,
        /IO\[/,
        /Either\[/
      ]
    },
    {
      name: 'scalaz',
      indicators: [
        /import\s+scalaz\./,
        /scalaz\._/,
        /\/\//,
        /\\\\/,
        /State\[/,
        /Reader\[/,
        /Writer\[/
      ]
    },
    {
      name: 'slick',
      indicators: [
        /import\s+slick\./,
        /TableQuery/,
        /Database/,
        /DBIO/,
        /Rep\[/,
        /\.filter/,
        /\.map/
      ]
    },
    {
      name: 'scalatest',
      indicators: [
        /import\s+org\.scalatest\./,
        /FlatSpec/,
        /WordSpec/,
        /should/,
        /must/,
        /describe/,
        /it\(/,
        /test\(/
      ]
    },
    {
      name: 'circe',
      indicators: [
        /import\s+io\.circe/,
        /Json/,
        /Encoder/,
        /Decoder/,
        /parser\./,
        /\.asJson/,
        /\.decode/
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
        id: `scala_file_${filePath.replace(/[^\w]/g, '_')}`,
        type: 'file',
        name: fileName,
        path: filePath,
        metadata: {
          language: 'scala',
          extension: '.scala',
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
          id: `scala_framework_${framework.name}_${filePath.replace(/[^\w]/g, '_')}`,
          type: 'pattern',
          name: `${framework.name} Framework`,
          metadata: {
            framework: framework.name,
            confidence: framework.confidence,
            indicators: framework.indicators,
            language: 'scala'
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
          id: `scala_import_${importPath.replace(/[^\w]/g, '_')}_${filePath.replace(/[^\w]/g, '_')}`,
          type: 'pattern',
          name: `Import: ${importPath}`,
          metadata: {
            importPath,
            language: 'scala',
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
      console.error(`Error analyzing Scala file ${filePath}:`, error);
    }

    return { nodes, edges };
  }

  private extractPackage(content: string): string | null {
    const packageMatch = content.match(/package\s+([\w.]+)/);
    return packageMatch ? packageMatch[1] : null;
  }

  private extractTypes(content: string): ScalaTypeInfo[] {
    const types: ScalaTypeInfo[] = [];

    // Match type declarations (with or without body)
    const typeRegex = /((?:private|protected|public)\s+)?((?:abstract|sealed|final|implicit|lazy)\s+)?(case\s+class|case\s+object|sealed\s+class|sealed\s+trait|abstract\s+class|class|object|trait)\s+(\w+)(?:\[([^\]]+)\])?(?:\s*\(([^)]*)\))?(?:\s+extends\s+([^{]+?))?(?:\s*\{|\s*$|\s*(?=\n))/gm;
    let match;

    while ((match = typeRegex.exec(content)) !== null) {
      const visibility = match[1]?.trim();
      const modifiersStr = match[2]?.trim();
      const baseKind = match[3];
      const typeName = match[4];
      const typeParams = match[5];
      const primaryConstructor = match[6];
      const inheritance = match[7];

      const modifiers: string[] = [];
      if (visibility) modifiers.push(visibility);
      if (modifiersStr) {
        modifiers.push(...modifiersStr.split(/\s+/).filter(m => m));
      }

      // Determine specific kind
      let kind: ScalaTypeInfo['kind'] = baseKind as any;
      if (baseKind === 'case class') kind = 'case class';
      else if (modifiersStr) {
        if (modifiersStr.includes('abstract')) kind = 'abstract class';
        else if (modifiersStr.includes('sealed') && baseKind === 'trait') kind = 'sealed trait';
        else if (modifiersStr.includes('sealed') && baseKind === 'class') kind = 'sealed class';
      }

      // Parse inheritance
      let superClass: string | undefined;
      let mixins: string[] = [];

      if (inheritance) {
        const parts = inheritance.split(/\s+with\s+/).map(s => s.trim());
        superClass = parts[0];
        mixins = parts.slice(1);
      }

      const typeParameters = typeParams ?
        typeParams.split(',').map(t => t.trim()) : [];

      const lineNumber = content.substring(0, match.index).split('\n').length;

      // Extract type body
      const typeStart = match.index + match[0].length;
      const typeBody = this.extractTypeBody(content, typeStart);

      const typeInfo: ScalaTypeInfo = {
        name: typeName,
        kind,
        modifiers,
        typeParameters,
        mixins,
        superClass,
        methods: this.extractMethods(typeBody),
        fields: this.extractFields(typeBody),
        companionObject: this.findCompanionObject(content, typeName),
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

  private extractMethods(body: string): ScalaMethodInfo[] {
    const methods: ScalaMethodInfo[] = [];

    // Match method declarations (def)
    const methodRegex = /((?:private|protected|public)\s+)?((?:override|abstract|final|implicit)\s+)*def\s+(\w+)(?:\[([^\]]+)\])?(?:\s*\(([^)]*)\))*(?:\s*:\s*([^={]+))?\s*[={]/g;
    let match;

    while ((match = methodRegex.exec(body)) !== null) {
      const visibility = match[1]?.trim();
      const modifiersStr = match[2]?.trim();
      const methodName = match[3];
      const typeParams = match[4];
      const parametersStr = match[5] || '';
      const returnType = match[6]?.trim();

      const modifiers: string[] = [];
      if (visibility) modifiers.push(visibility);
      if (modifiersStr) {
        modifiers.push(...modifiersStr.split(/\s+/).filter(m => m));
      }

      const isAbstract = modifiers.includes('abstract');
      const isOverride = modifiers.includes('override');
      const isImplicit = modifiers.includes('implicit');

      const typeParameters = typeParams ?
        typeParams.split(',').map(t => t.trim()) : [];

      // Scala can have multiple parameter lists
      const parameters = [this.parseParameters(parametersStr)];

      const lineNumber = body.substring(0, match.index).split('\n').length;

      methods.push({
        name: methodName,
        modifiers,
        typeParameters,
        parameters,
        returnType,
        isAbstract,
        isOverride,
        isImplicit,
        lineNumber
      });
    }

    return methods;
  }

  private extractFields(body: string): ScalaFieldInfo[] {
    const fields: ScalaFieldInfo[] = [];

    // Match field declarations (val, var, lazy val)
    const fieldRegex = /((?:private|protected|public)\s+)?((?:override|implicit|lazy)\s+)*(val|var)\s+(\w+)\s*:\s*([^=\n]+)(?:\s*=\s*[^=\n]+)?/g;
    let match;

    while ((match = fieldRegex.exec(body)) !== null) {
      const visibility = match[1]?.trim();
      const modifiersStr = match[2]?.trim();
      const declaration = match[3]; // 'val' or 'var'
      const fieldName = match[4];
      const fieldType = match[5]?.trim();

      const modifiers: string[] = [];
      if (visibility) modifiers.push(visibility);
      if (modifiersStr) {
        modifiers.push(...modifiersStr.split(/\s+/).filter(m => m));
      }
      modifiers.push(declaration);

      const isVal = declaration === 'val';
      const isVar = declaration === 'var';
      const isLazy = modifiers.includes('lazy');

      const lineNumber = body.substring(0, match.index).split('\n').length;

      fields.push({
        name: fieldName,
        type: fieldType,
        modifiers,
        isVal,
        isVar,
        isLazy,
        lineNumber
      });
    }

    return fields;
  }

  private extractTopLevelFunctions(content: string, types: ScalaTypeInfo[]): ScalaMethodInfo[] {
    const functions: ScalaMethodInfo[] = [];

    // Find functions outside of type declarations
    const functionRegex = /((?:private|protected|public)\s+)?((?:implicit)\s+)*def\s+(\w+)(?:\[([^\]]+)\])?(?:\s*\(([^)]*)\))*(?:\s*:\s*([^={]+))?\s*[={]/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;

      // Check if this function is inside a type
      let insideType = false;
      for (const typeInfo of types) {
        // Simple heuristic
        if (lineNumber > typeInfo.lineNumber) {
          insideType = true;
          break;
        }
      }

      if (!insideType) {
        const visibility = match[1]?.trim();
        const modifiersStr = match[2]?.trim();
        const functionName = match[3];
        const typeParams = match[4];
        const parametersStr = match[5] || '';
        const returnType = match[6]?.trim();

        const modifiers: string[] = [];
        if (visibility) modifiers.push(visibility);
        if (modifiersStr) {
          modifiers.push(...modifiersStr.split(/\s+/).filter(m => m));
        }

        const isImplicit = modifiers.includes('implicit');
        const typeParameters = typeParams ?
          typeParams.split(',').map(t => t.trim()) : [];

        const parameters = [this.parseParameters(parametersStr)];

        functions.push({
          name: functionName,
          modifiers,
          typeParameters,
          parameters,
          returnType,
          isAbstract: false,
          isOverride: false,
          isImplicit,
          lineNumber
        });
      }
    }

    return functions;
  }

  private parseParameters(parametersStr: string): ScalaParameterInfo[] {
    if (!parametersStr.trim()) return [];

    const parameters: ScalaParameterInfo[] = [];
    const paramParts = this.splitParameters(parametersStr);

    for (const part of paramParts) {
      const trimmed = part.trim();

      // Parse Scala parameter format: [implicit] name: Type = default
      const paramMatch = trimmed.match(/(implicit\s+)?(\w+)\s*:\s*([^=]+)(?:\s*=\s*(.+))?/);

      if (paramMatch) {
        const isImplicit = !!paramMatch[1];
        const paramName = paramMatch[2];
        const paramType = paramMatch[3]?.trim();
        const defaultValue = paramMatch[4]?.trim();

        const hasDefault = !!defaultValue;
        const isByName = paramType?.startsWith('=>') || false;
        const isVarargs = paramType?.endsWith('*') || false;

        parameters.push({
          name: paramName,
          type: paramType,
          hasDefault,
          defaultValue,
          isImplicit,
          isByName,
          isVarargs
        });
      }
    }

    return parameters;
  }

  private splitParameters(parametersStr: string): string[] {
    const parts: string[] = [];
    let current = '';
    let parenLevel = 0;
    let bracketLevel = 0;

    for (const char of parametersStr) {
      if (char === '(') parenLevel++;
      else if (char === ')') parenLevel--;
      else if (char === '[') bracketLevel++;
      else if (char === ']') bracketLevel--;
      else if (char === ',' && parenLevel === 0 && bracketLevel === 0) {
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

  private findCompanionObject(content: string, className: string): string | undefined {
    const companionRegex = new RegExp(`object\\s+${className}\\s*\\{`, 'g');
    return companionRegex.test(content) ? className : undefined;
  }

  private detectFrameworks(content: string, filePath: string): ScalaFrameworkInfo[] {
    const frameworks: ScalaFrameworkInfo[] = [];

    for (const framework of this.SCALA_FRAMEWORKS) {
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

      // Handle wildcard imports and selectors
      if (importPath.includes('{') && importPath.includes('}')) {
        // Selective import: extract the base path
        const basePath = importPath.split('{')[0].trim();
        imports.push(basePath);
      } else {
        imports.push(importPath);
      }
    }

    return [...new Set(imports)];
  }

  private createTypeNode(typeInfo: ScalaTypeInfo, filePath: string): MindMapNode {
    return {
      id: `scala_${typeInfo.kind.replace(/\s/g, '_')}_${typeInfo.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'class',
      name: typeInfo.name,
      path: filePath,
      metadata: {
        language: 'scala',
        classType: typeInfo.kind,
        modifiers: typeInfo.modifiers,
        typeParameters: typeInfo.typeParameters,
        superClass: typeInfo.superClass,
        mixins: typeInfo.mixins,
        methodCount: typeInfo.methods.length,
        fieldCount: typeInfo.fields.length,
        companionObject: typeInfo.companionObject,
        lineNumber: typeInfo.lineNumber
      },
      confidence: 0.9,
      lastUpdated: new Date()
    };
  }

  private createMethodNode(method: ScalaMethodInfo, typeName: string, filePath: string): MindMapNode {
    return {
      id: `scala_method_${typeName}_${method.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'function',
      name: `${typeName}.${method.name}`,
      path: filePath,
      metadata: {
        language: 'scala',
        functionType: 'method',
        className: typeName,
        modifiers: method.modifiers,
        typeParameters: method.typeParameters,
        parameters: method.parameters.flat().map(p => p.name),
        parameterCount: method.parameters.flat().length,
        returnType: method.returnType,
        isAbstract: method.isAbstract,
        isOverride: method.isOverride,
        isImplicit: method.isImplicit,
        lineNumber: method.lineNumber
      },
      confidence: 0.85,
      lastUpdated: new Date()
    };
  }

  private createTopLevelFunctionNode(func: ScalaMethodInfo, filePath: string): MindMapNode {
    return {
      id: `scala_function_${func.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'function',
      name: func.name,
      path: filePath,
      metadata: {
        language: 'scala',
        functionType: 'function',
        modifiers: func.modifiers,
        typeParameters: func.typeParameters,
        parameters: func.parameters.flat().map(p => p.name),
        parameterCount: func.parameters.flat().length,
        returnType: func.returnType,
        isImplicit: func.isImplicit,
        lineNumber: func.lineNumber
      },
      confidence: 0.85,
      lastUpdated: new Date()
    };
  }
}