import { MindMapNode, MindMapEdge } from '../types/index.js';
import { readFile } from 'fs/promises';

export interface RubyClassInfo {
  name: string;
  superclass?: string;
  modules: string[];
  methods: RubyMethodInfo[];
  attributes: RubyAttributeInfo[];
  constants: RubyConstantInfo[];
  isClass: boolean;
  isModule: boolean;
  lineNumber: number;
}

export interface RubyMethodInfo {
  name: string;
  visibility: 'public' | 'private' | 'protected';
  isClassMethod: boolean;
  parameters: RubyParameterInfo[];
  lineNumber: number;
}

export interface RubyParameterInfo {
  name: string;
  hasDefault: boolean;
  defaultValue?: string;
  isSplat: boolean;
  isKeyword: boolean;
  isBlock: boolean;
}

export interface RubyAttributeInfo {
  name: string;
  type: 'attr_reader' | 'attr_writer' | 'attr_accessor';
  lineNumber: number;
}

export interface RubyConstantInfo {
  name: string;
  value?: string;
  lineNumber: number;
}

export interface RubyGemInfo {
  name: string;
  version?: string;
  confidence: number;
}

export interface RubyFrameworkInfo {
  name: string;
  confidence: number;
  indicators: string[];
}

/**
 * Ruby Language Analyzer
 * Analyzes Ruby files for classes, modules, methods, and framework usage (Rails, Sinatra, etc.)
 */
export class RubyAnalyzer {
  private readonly RUBY_FRAMEWORKS = [
    {
      name: 'rails',
      indicators: [
        /require\s+['"]rails['"]/,
        /Rails\.application/,
        /ActionController::Base/,
        /ActiveRecord::Base/,
        /ApplicationController/,
        /ApplicationRecord/,
        /config\/application\.rb/,
        /app\/controllers/,
        /app\/models/,
        /app\/views/,
        /Gemfile/,
        /config\/routes\.rb/
      ]
    },
    {
      name: 'sinatra',
      indicators: [
        /require\s+['"]sinatra['"]/,
        /Sinatra::Base/,
        /get\s+['"]/,
        /post\s+['"]/,
        /put\s+['"]/,
        /delete\s+['"]/,
        /patch\s+['"]/,
        /set\s+:/,
        /helpers/
      ]
    },
    {
      name: 'hanami',
      indicators: [
        /require\s+['"]hanami['"]/,
        /Hanami::Action/,
        /Hanami::Entity/,
        /Hanami::Repository/,
        /Hanami::View/,
        /apps\/web/
      ]
    },
    {
      name: 'roda',
      indicators: [
        /require\s+['"]roda['"]/,
        /Roda/,
        /r\.get/,
        /r\.post/,
        /r\.route/,
        /plugin\s+:/
      ]
    },
    {
      name: 'grape',
      indicators: [
        /require\s+['"]grape['"]/,
        /Grape::API/,
        /resource\s+:/,
        /get\s+['"]/,
        /post\s+['"]/,
        /params\s+do/
      ]
    },
    {
      name: 'jekyll',
      indicators: [
        /require\s+['"]jekyll['"]/,
        /Jekyll::/,
        /_config\.yml/,
        /_posts\//,
        /_layouts\//,
        /_includes\//
      ]
    },
    {
      name: 'rspec',
      indicators: [
        /require\s+['"]rspec['"]/,
        /RSpec\./,
        /describe\s+/,
        /context\s+['"]/,
        /it\s+['"]/,
        /expect\(/,
        /spec\/spec_helper/
      ]
    },
    {
      name: 'minitest',
      indicators: [
        /require\s+['"]minitest['"]/,
        /Minitest::Test/,
        /test\/test_helper/,
        /def\s+test_/,
        /assert/,
        /refute/
      ]
    },
    {
      name: 'sidekiq',
      indicators: [
        /require\s+['"]sidekiq['"]/,
        /Sidekiq::Worker/,
        /include\s+Sidekiq::Worker/,
        /perform_async/,
        /perform_in/
      ]
    },
    {
      name: 'capistrano',
      indicators: [
        /require\s+['"]capistrano['"]/,
        /Capistrano::/,
        /config\/deploy/,
        /task\s+:/,
        /namespace\s+:/
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
        id: `ruby_file_${filePath.replace(/[^\w]/g, '_')}`,
        type: 'file',
        name: fileName,
        path: filePath,
        metadata: {
          language: 'ruby',
          extension: '.rb',
          size: fileContent.length,
          lines: fileContent.split('\n').length
        },
        confidence: 0.95,
        lastUpdated: new Date()
      };

      nodes.push(fileNode);

      // Extract classes and modules
      const classesAndModules = this.extractClassesAndModules(fileContent);
      for (const classInfo of classesAndModules) {
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

      // Extract standalone methods
      const standaloneMethods = this.extractStandaloneMethods(fileContent, classesAndModules);
      for (const method of standaloneMethods) {
        const methodNode = this.createStandaloneMethodNode(method, filePath);
        nodes.push(methodNode);

        edges.push({
          id: `contains_${fileNode.id}_${methodNode.id}`,
          source: fileNode.id,
          target: methodNode.id,
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
          id: `ruby_framework_${framework.name}_${filePath.replace(/[^\w]/g, '_')}`,
          type: 'pattern',
          name: `${framework.name} Framework`,
          metadata: {
            framework: framework.name,
            confidence: framework.confidence,
            indicators: framework.indicators,
            language: 'ruby'
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

      // Extract requires
      const requires = this.extractRequires(fileContent);
      for (const requirePath of requires) {
        const requireNode: MindMapNode = {
          id: `ruby_require_${requirePath.replace(/[^\w]/g, '_')}_${filePath.replace(/[^\w]/g, '_')}`,
          type: 'pattern',
          name: `Require: ${requirePath}`,
          metadata: {
            requirePath,
            language: 'ruby',
            type: 'require'
          },
          confidence: 0.8,
          lastUpdated: new Date()
        };

        nodes.push(requireNode);

        edges.push({
          id: `imports_${fileNode.id}_${requireNode.id}`,
          source: fileNode.id,
          target: requireNode.id,
          type: 'imports',
          confidence: 0.8
        });
      }

      // Extract gems from Gemfile
      if (fileName === 'Gemfile') {
        const gems = this.extractGems(fileContent);
        for (const gem of gems) {
          const gemNode: MindMapNode = {
            id: `ruby_gem_${gem.name}_${filePath.replace(/[^\w]/g, '_')}`,
            type: 'pattern',
            name: `Gem: ${gem.name}`,
            metadata: {
              gemName: gem.name,
              version: gem.version,
              confidence: gem.confidence,
              language: 'ruby',
              type: 'gem'
            },
            confidence: gem.confidence,
            lastUpdated: new Date()
          };

          nodes.push(gemNode);

          edges.push({
            id: `depends_${fileNode.id}_${gemNode.id}`,
            source: fileNode.id,
            target: gemNode.id,
            type: 'depends_on',
            confidence: gem.confidence
          });
        }
      }

    } catch (error) {
      console.error(`Error analyzing Ruby file ${filePath}:`, error);
    }

    return { nodes, edges };
  }

  private extractClassesAndModules(content: string): RubyClassInfo[] {
    const classesAndModules: RubyClassInfo[] = [];

    // Match class and module declarations
    const classRegex = /^[ \t]*(class|module)\s+([A-Z]\w*(?:::[A-Z]\w*)*)(?:\s*<\s*([A-Z]\w*(?:::[A-Z]\w*)*))?\s*$/gm;
    let match;

    while ((match = classRegex.exec(content)) !== null) {
      const type = match[1]; // 'class' or 'module'
      const name = match[2];
      const superclass = match[3];
      const lineNumber = content.substring(0, match.index).split('\n').length;

      // Extract the body of the class/module
      const bodyStart = match.index + match[0].length;
      const body = this.extractClassBody(content, bodyStart, name);

      const classInfo: RubyClassInfo = {
        name,
        superclass,
        modules: this.extractIncludedModules(body),
        methods: this.extractMethods(body),
        attributes: this.extractAttributes(body),
        constants: this.extractConstants(body),
        isClass: type === 'class',
        isModule: type === 'module',
        lineNumber
      };

      classesAndModules.push(classInfo);
    }

    return classesAndModules;
  }

  private extractClassBody(content: string, startIndex: number, className: string): string {
    const lines = content.split('\n');
    const startLine = content.substring(0, startIndex).split('\n').length - 1;

    let endLine = lines.length - 1;
    let indentLevel = -1;

    // Find the matching 'end'
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i].trim();

      if (indentLevel === -1 && line) {
        // Determine the base indentation level from the first non-empty line after class declaration
        const leadingWhitespace = lines[i].match(/^(\s*)/)?.[1] || '';
        indentLevel = leadingWhitespace.length;
      }

      // Look for 'end' at the same or less indentation level
      if (line === 'end') {
        const currentIndent = (lines[i].match(/^(\s*)/)?.[1] || '').length;
        if (currentIndent <= indentLevel) {
          endLine = i;
          break;
        }
      }
    }

    return lines.slice(startLine + 1, endLine).join('\n');
  }

  private extractIncludedModules(body: string): string[] {
    const modules: string[] = [];
    const includeRegex = /^\s*(include|prepend|extend)\s+([A-Z]\w*(?:::[A-Z]\w*)*)/gm;
    let match;

    while ((match = includeRegex.exec(body)) !== null) {
      modules.push(match[2]);
    }

    return modules;
  }

  private extractMethods(body: string): RubyMethodInfo[] {
    const methods: RubyMethodInfo[] = [];

    // Match method definitions
    const methodRegex = /^\s*(private|protected|public\s+)?(def\s+(self\.)?(\w+[?!]?)\s*(?:\(([^)]*)\))?)/gm;
    let match;

    while ((match = methodRegex.exec(body)) !== null) {
      const visibility = (match[1]?.trim() as any) || 'public';
      const isClassMethod = !!match[3];
      const methodName = match[4];
      const parametersStr = match[5] || '';

      const parameters = this.parseParameters(parametersStr);
      const lineNumber = body.substring(0, match.index).split('\n').length;

      methods.push({
        name: methodName,
        visibility: visibility === 'private' ? 'private' :
                   visibility === 'protected' ? 'protected' : 'public',
        isClassMethod,
        parameters,
        lineNumber
      });
    }

    return methods;
  }

  private extractAttributes(body: string): RubyAttributeInfo[] {
    const attributes: RubyAttributeInfo[] = [];

    const attrRegex = /^\s*(attr_reader|attr_writer|attr_accessor)\s+(.*)/gm;
    let match;

    while ((match = attrRegex.exec(body)) !== null) {
      const attrType = match[1] as 'attr_reader' | 'attr_writer' | 'attr_accessor';
      const attrNames = match[2];
      const lineNumber = body.substring(0, match.index).split('\n').length;

      // Parse attribute names (can be symbols or strings)
      const names = attrNames.split(',').map(name => {
        const trimmed = name.trim();
        return trimmed.replace(/^[:'""]|[:'""]$/g, '');
      });

      for (const name of names) {
        if (name) {
          attributes.push({
            name,
            type: attrType,
            lineNumber
          });
        }
      }
    }

    return attributes;
  }

  private extractConstants(body: string): RubyConstantInfo[] {
    const constants: RubyConstantInfo[] = [];

    const constantRegex = /^\s*([A-Z][A-Z_]*)\s*=\s*(.+)$/gm;
    let match;

    while ((match = constantRegex.exec(body)) !== null) {
      const constantName = match[1];
      const value = match[2].trim();
      const lineNumber = body.substring(0, match.index).split('\n').length;

      constants.push({
        name: constantName,
        value,
        lineNumber
      });
    }

    return constants;
  }

  private extractStandaloneMethods(content: string, classesAndModules: RubyClassInfo[]): RubyMethodInfo[] {
    const methods: RubyMethodInfo[] = [];

    // Find methods that are not inside any class or module
    const methodRegex = /^(def\s+(\w+[?!]?)\s*(?:\(([^)]*)\))?)/gm;
    let match;

    while ((match = methodRegex.exec(content)) !== null) {
      const methodName = match[2];
      const parametersStr = match[3] || '';
      const lineNumber = content.substring(0, match.index).split('\n').length;

      // Check if this method is inside a class or module
      let insideClassOrModule = false;
      for (const classInfo of classesAndModules) {
        if (lineNumber > classInfo.lineNumber) {
          // This is a rough heuristic - could be improved
          insideClassOrModule = true;
          break;
        }
      }

      if (!insideClassOrModule) {
        const parameters = this.parseParameters(parametersStr);

        methods.push({
          name: methodName,
          visibility: 'public',
          isClassMethod: false,
          parameters,
          lineNumber
        });
      }
    }

    return methods;
  }

  private parseParameters(parametersStr: string): RubyParameterInfo[] {
    if (!parametersStr.trim()) return [];

    const parameters: RubyParameterInfo[] = [];
    const paramParts = parametersStr.split(',');

    for (const part of paramParts) {
      const trimmed = part.trim();

      // Handle different parameter types
      let name = '';
      let hasDefault = false;
      let defaultValue: string | undefined;
      let isSplat = false;
      let isKeyword = false;
      let isBlock = false;

      if (trimmed.startsWith('&')) {
        // Block parameter
        isBlock = true;
        name = trimmed.substring(1);
      } else if (trimmed.startsWith('**')) {
        // Double splat (keyword arguments)
        isSplat = true;
        isKeyword = true;
        name = trimmed.substring(2);
      } else if (trimmed.startsWith('*')) {
        // Splat parameter
        isSplat = true;
        name = trimmed.substring(1);
      } else if (trimmed.includes(':')) {
        // Keyword parameter
        isKeyword = true;
        const keywordParts = trimmed.split(':');
        name = keywordParts[0].trim();
        if (keywordParts[1] && keywordParts[1].trim()) {
          hasDefault = true;
          defaultValue = keywordParts[1].trim();
        }
      } else if (trimmed.includes('=')) {
        // Parameter with default value
        const defaultParts = trimmed.split('=');
        name = defaultParts[0].trim();
        hasDefault = true;
        defaultValue = defaultParts[1].trim();
      } else {
        // Regular parameter
        name = trimmed;
      }

      if (name) {
        parameters.push({
          name,
          hasDefault,
          defaultValue,
          isSplat,
          isKeyword,
          isBlock
        });
      }
    }

    return parameters;
  }

  private detectFrameworks(content: string, filePath: string): RubyFrameworkInfo[] {
    const frameworks: RubyFrameworkInfo[] = [];

    for (const framework of this.RUBY_FRAMEWORKS) {
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

  private extractRequires(content: string): string[] {
    const requires: string[] = [];

    // Extract require statements
    const requireRegex = /require(?:_relative)?\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = requireRegex.exec(content)) !== null) {
      const requirePath = match[1];
      requires.push(requirePath);
    }

    return [...new Set(requires)]; // Remove duplicates
  }

  private extractGems(content: string): RubyGemInfo[] {
    const gems: RubyGemInfo[] = [];

    // Extract gem declarations from Gemfile
    const gemRegex = /gem\s+['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?/g;
    let match;

    while ((match = gemRegex.exec(content)) !== null) {
      const gemName = match[1];
      const version = match[2];

      gems.push({
        name: gemName,
        version,
        confidence: 0.95
      });
    }

    return gems;
  }

  private createClassNode(classInfo: RubyClassInfo, filePath: string): MindMapNode {
    return {
      id: `ruby_class_${classInfo.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'class',
      name: classInfo.name,
      path: filePath,
      metadata: {
        language: 'ruby',
        classType: classInfo.isClass ? 'class' : 'module',
        superclass: classInfo.superclass,
        modules: classInfo.modules,
        methodCount: classInfo.methods.length,
        attributeCount: classInfo.attributes.length,
        constantCount: classInfo.constants.length,
        lineNumber: classInfo.lineNumber
      },
      confidence: 0.9,
      lastUpdated: new Date()
    };
  }

  private createMethodNode(method: RubyMethodInfo, className: string, filePath: string): MindMapNode {
    const methodPrefix = method.isClassMethod ? `${className}.` : `${className}#`;

    return {
      id: `ruby_method_${className}_${method.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'function',
      name: `${methodPrefix}${method.name}`,
      path: filePath,
      metadata: {
        language: 'ruby',
        functionType: 'method',
        className,
        visibility: method.visibility,
        isClassMethod: method.isClassMethod,
        parameters: method.parameters.map(p => p.name),
        parameterCount: method.parameters.length,
        lineNumber: method.lineNumber
      },
      confidence: 0.85,
      lastUpdated: new Date()
    };
  }

  private createStandaloneMethodNode(method: RubyMethodInfo, filePath: string): MindMapNode {
    return {
      id: `ruby_function_${method.name}_${filePath.replace(/[^\w]/g, '_')}`,
      type: 'function',
      name: method.name,
      path: filePath,
      metadata: {
        language: 'ruby',
        functionType: 'function',
        visibility: method.visibility,
        parameters: method.parameters.map(p => p.name),
        parameterCount: method.parameters.length,
        lineNumber: method.lineNumber
      },
      confidence: 0.85,
      lastUpdated: new Date()
    };
  }
}