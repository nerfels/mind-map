import { MindMapNode, MindMapEdge } from '../types/index.js';
import { readFile } from 'fs/promises';

export interface PhpClassInfo {
  name: string;
  extends?: string;
  implements?: string[];
  traits?: string[];
  methods: PhpMethodInfo[];
  properties: PhpPropertyInfo[];
  constants: PhpConstantInfo[];
  namespace?: string;
  isAbstract: boolean;
  isFinal: boolean;
}

export interface PhpMethodInfo {
  name: string;
  visibility: 'public' | 'protected' | 'private';
  isStatic: boolean;
  isAbstract: boolean;
  isFinal: boolean;
  parameters: PhpParameterInfo[];
  returnType?: string;
  lineNumber: number;
}

export interface PhpParameterInfo {
  name: string;
  type?: string;
  hasDefault: boolean;
  defaultValue?: string;
  isVariadic: boolean;
}

export interface PhpPropertyInfo {
  name: string;
  visibility: 'public' | 'protected' | 'private';
  isStatic: boolean;
  type?: string;
  hasDefault: boolean;
  defaultValue?: string;
  lineNumber: number;
}

export interface PhpConstantInfo {
  name: string;
  value: string;
  lineNumber: number;
}

export interface PhpFunctionInfo {
  name: string;
  parameters: PhpParameterInfo[];
  returnType?: string;
  lineNumber: number;
  namespace?: string;
}

export interface PhpFrameworkInfo {
  name: string;
  version?: string;
  confidence: number;
  indicators: string[];
}

/**
 * PHP Language Analyzer
 * Analyzes PHP files for classes, functions, methods, and framework usage
 */
export class PhpAnalyzer {
  private readonly PHP_FRAMEWORKS = [
    {
      name: 'laravel',
      indicators: [
        /use\s+Illuminate\\/,
        /extends\s+Controller/,
        /extends\s+Model/,
        /extends\s+Middleware/,
        /Route::/,
        /Artisan::/,
        /Schema::/,
        /DB::/,
        /Eloquent/,
        /app\.php/,
        /web\.php/,
        /api\.php/
      ]
    },
    {
      name: 'symfony',
      indicators: [
        /use\s+Symfony\\/,
        /extends\s+AbstractController/,
        /extends\s+Command/,
        /@Route/,
        /@Entity/,
        /@Service/,
        /services\.yaml/,
        /config\.yaml/,
        /framework\.yaml/
      ]
    },
    {
      name: 'codeigniter',
      indicators: [
        /extends\s+CI_Controller/,
        /extends\s+Controller/,
        /$this->load->model/,
        /$this->load->view/,
        /$this->load->library/,
        /$this->db->/,
        /application\/controllers/,
        /application\/models/,
        /system\/core/
      ]
    },
    {
      name: 'cakephp',
      indicators: [
        /use\s+Cake\\/,
        /extends\s+AppController/,
        /extends\s+Table/,
        /extends\s+Entity/,
        /$this->loadModel/,
        /$this->request->/,
        /$this->response->/,
        /config\/app\.php/
      ]
    },
    {
      name: 'zend',
      indicators: [
        /use\s+Zend\\/,
        /use\s+Laminas\\/,
        /extends\s+AbstractActionController/,
        /extends\s+AbstractRestfulController/,
        /module\.config\.php/,
        /application\.config\.php/
      ]
    },
    {
      name: 'yii',
      indicators: [
        /use\s+yii\\/,
        /extends\s+ActiveRecord/,
        /extends\s+Controller/,
        /extends\s+Widget/,
        /Yii::\$app->/,
        /protected\/config/,
        /protected\/controllers/
      ]
    },
    {
      name: 'phalcon',
      indicators: [
        /use\s+Phalcon\\/,
        /extends\s+\\\\Phalcon/,
        /$this->di->/,
        /$this->dispatcher->/,
        /Phalcon\\\\Mvc/
      ]
    },
    {
      name: 'drupal',
      indicators: [
        /use\s+Drupal\\/,
        /implements\s+.*ContainerInjectionInterface/,
        /extends\s+.*ControllerBase/,
        /drupal_get_/,
        /\\.module$/,
        /\\.install$/,
        /hook_/
      ]
    },
    {
      name: 'wordpress',
      indicators: [
        /wp_enqueue_/,
        /add_action/,
        /add_filter/,
        /get_option/,
        /wp_die/,
        /wp-config\.php/,
        /wp-content/,
        /wp-includes/,
        /functions\.php/
      ]
    },
    {
      name: 'magento',
      indicators: [
        /use\s+Magento\\/,
        /extends\s+.*AbstractBlock/,
        /extends\s+.*AbstractModel/,
        /$this->_objectManager/,
        /etc\/di\.xml/,
        /etc\/module\.xml/
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
        id: `php_file_${filePath.replace(/[^\w]/g, '_')}`,
        type: 'file',
        name: fileName,
        path: filePath,
        metadata: {
          language: 'php',
          extension: '.php',
          size: fileContent.length,
          lines: fileContent.split('\n').length
        },
        confidence: 0.95,
        lastUpdated: new Date()
      };

      nodes.push(fileNode);

      // Detect namespace
      const namespace = this.extractNamespace(fileContent);
      if (namespace) {
        fileNode.metadata.namespace = namespace;
      }

      // Extract classes
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
      }

      // Extract standalone functions
      const functions = this.extractFunctions(fileContent);
      for (const funcInfo of functions) {
        const functionNode = this.createFunctionNode(funcInfo, filePath);
        nodes.push(functionNode);

        edges.push({
          id: `contains_${fileNode.id}_${functionNode.id}`,
          source: fileNode.id,
          target: functionNode.id,
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

        // Create framework pattern node
        const frameworkNode: MindMapNode = {
          id: `php_framework_${framework.name}_${filePath.replace(/[^\w]/g, '_')}`,
          type: 'pattern',
          name: `${framework.name} Framework`,
          metadata: {
            framework: framework.name,
            confidence: framework.confidence,
            indicators: framework.indicators,
            language: 'php'
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

      // Extract imports/use statements
      const imports = this.extractImports(fileContent);
      for (const importPath of imports) {
        const importNode: MindMapNode = {
          id: `php_import_${importPath.replace(/[^\w]/g, '_')}_${filePath.replace(/[^\w]/g, '_')}`,
          type: 'pattern',
          name: `Import: ${importPath}`,
          metadata: {
            importPath,
            language: 'php',
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
      console.error(`Error analyzing PHP file ${filePath}:`, error);
    }

    return { nodes, edges };
  }

  private extractNamespace(content: string): string | null {
    const namespaceMatch = content.match(/namespace\s+([^;]+);/);
    return namespaceMatch ? namespaceMatch[1].trim() : null;
  }

  private extractClasses(content: string): PhpClassInfo[] {
    const classes: PhpClassInfo[] = [];

    // Match class declarations
    const classRegex = /(abstract\s+|final\s+)?class\s+(\w+)(\s+extends\s+(\w+))?(\s+implements\s+([^{]+))?\s*\{/g;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const isAbstract = !!match[1]?.includes('abstract');
      const isFinal = !!match[1]?.includes('final');
      const className = match[2];
      const extendsClass = match[4];
      const implementsInterfaces = match[6] ?
        match[6].split(',').map(i => i.trim()).filter(i => i) : [];

      // Find class body
      const classStart = match.index + match[0].length;
      const classBody = this.extractClassBody(content, classStart);

      const classInfo: PhpClassInfo = {
        name: className,
        extends: extendsClass,
        implements: implementsInterfaces,
        traits: this.extractTraits(classBody),
        methods: this.extractMethods(classBody),
        properties: this.extractProperties(classBody),
        constants: this.extractConstants(classBody),
        isAbstract,
        isFinal
      };

      classes.push(classInfo);
    }

    return classes;
  }

  private extractClassBody(content: string, startIndex: number): string {
    let braceCount = 1;
    let index = startIndex;

    while (index < content.length && braceCount > 0) {
      if (content[index] === '{') braceCount++;
      else if (content[index] === '}') braceCount--;
      index++;
    }

    return content.substring(startIndex, index - 1);
  }

  private extractMethods(classBody: string): PhpMethodInfo[] {
    const methods: PhpMethodInfo[] = [];

    const methodRegex = /(public|protected|private)?\s*(static\s+)?(abstract\s+|final\s+)?function\s+(\w+)\s*\(([^)]*)\)(\s*:\s*([^{;]+))?\s*[{;]/g;
    let match;

    while ((match = methodRegex.exec(classBody)) !== null) {
      const visibility = (match[1] as any) || 'public';
      const isStatic = !!match[2];
      const isAbstract = !!match[3]?.includes('abstract');
      const isFinal = !!match[3]?.includes('final');
      const methodName = match[4];
      const parametersStr = match[5] || '';
      const returnType = match[7]?.trim();

      const parameters = this.parseParameters(parametersStr);

      const lineNumber = classBody.substring(0, match.index).split('\n').length;

      methods.push({
        name: methodName,
        visibility,
        isStatic,
        isAbstract,
        isFinal,
        parameters,
        returnType,
        lineNumber
      });
    }

    return methods;
  }

  private extractProperties(classBody: string): PhpPropertyInfo[] {
    const properties: PhpPropertyInfo[] = [];

    const propertyRegex = /(public|protected|private)?\s*(static\s+)?(\w+\s+)?\$(\w+)(\s*=\s*([^;]+))?;/g;
    let match;

    while ((match = propertyRegex.exec(classBody)) !== null) {
      const visibility = (match[1] as any) || 'public';
      const isStatic = !!match[2];
      const type = match[3]?.trim();
      const propertyName = match[4];
      const hasDefault = !!match[5];
      const defaultValue = match[6]?.trim();

      const lineNumber = classBody.substring(0, match.index).split('\n').length;

      properties.push({
        name: propertyName,
        visibility,
        isStatic,
        type,
        hasDefault,
        defaultValue,
        lineNumber
      });
    }

    return properties;
  }

  private extractConstants(classBody: string): PhpConstantInfo[] {
    const constants: PhpConstantInfo[] = [];

    const constantRegex = /const\s+(\w+)\s*=\s*([^;]+);/g;
    let match;

    while ((match = constantRegex.exec(classBody)) !== null) {
      const constantName = match[1];
      const value = match[2].trim();
      const lineNumber = classBody.substring(0, match.index).split('\n').length;

      constants.push({
        name: constantName,
        value,
        lineNumber
      });
    }

    return constants;
  }

  private extractTraits(classBody: string): string[] {
    const traits: string[] = [];

    const traitRegex = /use\s+([^;]+);/g;
    let match;

    while ((match = traitRegex.exec(classBody)) !== null) {
      const traitList = match[1].split(',').map(t => t.trim());
      traits.push(...traitList);
    }

    return traits;
  }

  private extractFunctions(content: string): PhpFunctionInfo[] {
    const functions: PhpFunctionInfo[] = [];

    // Extract functions outside of classes
    const functionRegex = /(?<!class\s+\w+[^{]*)\bfunction\s+(\w+)\s*\(([^)]*)\)(\s*:\s*([^{;]+))?\s*\{/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1];
      const parametersStr = match[2] || '';
      const returnType = match[4]?.trim();

      // Skip if this is inside a class (rough heuristic)
      const beforeFunction = content.substring(0, match.index);
      const classKeywords = (beforeFunction.match(/\bclass\s+\w+/g) || []).length;
      const closingBraces = (beforeFunction.match(/}/g) || []).length;

      // If we're inside a class context, skip this function
      if (classKeywords > closingBraces) {
        continue;
      }

      const parameters = this.parseParameters(parametersStr);
      const lineNumber = content.substring(0, match.index).split('\n').length;

      functions.push({
        name: functionName,
        parameters,
        returnType,
        lineNumber
      });
    }

    return functions;
  }

  private parseParameters(parametersStr: string): PhpParameterInfo[] {
    if (!parametersStr.trim()) return [];

    const parameters: PhpParameterInfo[] = [];
    const paramParts = parametersStr.split(',');

    for (const part of paramParts) {
      const paramMatch = part.trim().match(/(?:(\w+)\s+)?(\.\.\.)?\$(\w+)(?:\s*=\s*(.+))?/);

      if (paramMatch) {
        const type = paramMatch[1];
        const isVariadic = !!paramMatch[2];
        const paramName = paramMatch[3];
        const hasDefault = !!paramMatch[4];
        const defaultValue = paramMatch[4]?.trim();

        parameters.push({
          name: paramName,
          type,
          hasDefault,
          defaultValue,
          isVariadic
        });
      }
    }

    return parameters;
  }

  private detectFrameworks(content: string, filePath: string): PhpFrameworkInfo[] {
    const frameworks: PhpFrameworkInfo[] = [];

    for (const framework of this.PHP_FRAMEWORKS) {
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

  private extractImports(content: string): string[] {
    const imports: string[] = [];

    // Extract use statements
    const useRegex = /use\s+([^;]+);/g;
    let match;

    while ((match = useRegex.exec(content)) !== null) {
      const importPath = match[1].trim();

      // Handle aliased imports
      const parts = importPath.split(' as ');
      const actualPath = parts[0].trim();

      imports.push(actualPath);
    }

    // Extract require/include statements
    const includeRegex = /(require|include)(?:_once)?\s*\(?['"]([^'"]+)['"]\)?;/g;

    while ((match = includeRegex.exec(content)) !== null) {
      const includePath = match[2];
      imports.push(includePath);
    }

    return [...new Set(imports)]; // Remove duplicates
  }

  private createClassNode(classInfo: PhpClassInfo, filePath: string): MindMapNode {
    return {
      id: `php_class_${classInfo.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'class',
      name: classInfo.name,
      path: filePath,
      metadata: {
        language: 'php',
        classType: 'class',
        extends: classInfo.extends,
        implements: classInfo.implements,
        traits: classInfo.traits,
        isAbstract: classInfo.isAbstract,
        isFinal: classInfo.isFinal,
        methodCount: classInfo.methods.length,
        propertyCount: classInfo.properties.length,
        constantCount: classInfo.constants.length,
        namespace: classInfo.namespace
      },
      confidence: 0.9,
      lastUpdated: new Date()
    };
  }

  private createMethodNode(method: PhpMethodInfo, className: string, filePath: string): MindMapNode {
    return {
      id: `php_method_${className}_${method.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'function',
      name: `${className}::${method.name}`,
      path: filePath,
      metadata: {
        language: 'php',
        functionType: 'method',
        className,
        visibility: method.visibility,
        isStatic: method.isStatic,
        isAbstract: method.isAbstract,
        isFinal: method.isFinal,
        parameters: method.parameters.map(p => p.name),
        parameterCount: method.parameters.length,
        returnType: method.returnType,
        lineNumber: method.lineNumber
      },
      confidence: 0.85,
      lastUpdated: new Date()
    };
  }

  private createFunctionNode(funcInfo: PhpFunctionInfo, filePath: string): MindMapNode {
    return {
      id: `php_function_${funcInfo.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'function',
      name: funcInfo.name,
      path: filePath,
      metadata: {
        language: 'php',
        functionType: 'function',
        parameters: funcInfo.parameters.map(p => p.name),
        parameterCount: funcInfo.parameters.length,
        returnType: funcInfo.returnType,
        lineNumber: funcInfo.lineNumber,
        namespace: funcInfo.namespace
      },
      confidence: 0.85,
      lastUpdated: new Date()
    };
  }
}