import { MindMapStorage } from './MindMapStorage.js';
import { MindMapNode, MindMapEdge } from '../types/index.js';

export interface CrossLanguageDependency {
  sourceFile: string;
  sourceLanguage: string;
  targetFile: string;
  targetLanguage: string;
  dependencyType: 'api_call' | 'ffi' | 'microservice' | 'shared_data' | 'config' | 'build_dependency';
  confidence: number;
  evidence: string[];
  bidirectional: boolean;
}

export interface PolyglotProject {
  languages: Map<string, {
    fileCount: number;
    primaryFrameworks: string[];
    entryPoints: string[];
    buildTools: string[];
  }>;
  crossLanguagePatterns: string[];
  architecturalStyle: 'monolithic' | 'microservices' | 'hybrid' | 'modular';
  primaryLanguage: string;
  secondaryLanguages: string[];
  interopPatterns: InteroperabilityPattern[];
}

export interface InteroperabilityPattern {
  type: string;
  languages: string[];
  files: string[];
  description: string;
  confidence: number;
  examples: string[];
}

export interface MultiLanguageRefactoring {
  type: 'extract_service' | 'merge_modules' | 'standardize_api' | 'consolidate_config' | 'update_dependencies';
  description: string;
  files: string[];
  languages: string[];
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  benefits: string[];
  risks: string[];
  steps: string[];
}

/**
 * Multi-Language Intelligence Engine
 * Provides cross-language analysis, dependency detection, and polyglot project insights
 */
export class MultiLanguageIntelligence {
  private storage: MindMapStorage;

  // Language interoperability patterns
  private readonly INTEROP_PATTERNS = [
    {
      type: 'rest_api',
      evidence: [/\/api\//, /endpoint/, /rest/, /http/i],
      languages: ['any'],
      description: 'REST API communication between services'
    },
    {
      type: 'graphql_api',
      evidence: [/graphql/i, /\.gql/, /query\s*\{/, /mutation\s*\{/],
      languages: ['any'],
      description: 'GraphQL API communication'
    },
    {
      type: 'ffi',
      evidence: [/extern\s+"C"/, /ctypes/, /ffi/, /dll/, /\.so/],
      languages: ['c', 'cpp', 'rust', 'python', 'go'],
      description: 'Foreign Function Interface calls'
    },
    {
      type: 'json_data',
      evidence: [/\.json/, /JSON\.parse/, /json\.loads/, /serde_json/, /encoding\/json/],
      languages: ['any'],
      description: 'JSON data exchange'
    },
    {
      type: 'protobuf',
      evidence: [/\.proto/, /protobuf/, /grpc/, /pb\.go/, /\_pb2\.py/],
      languages: ['go', 'python', 'java', 'cpp', 'rust'],
      description: 'Protocol Buffers serialization'
    },
    {
      type: 'database_shared',
      evidence: [/database/, /db\./, /sql/, /mongodb/, /redis/, /postgresql/],
      languages: ['any'],
      description: 'Shared database access'
    },
    {
      type: 'docker_containerization',
      evidence: [/Dockerfile/, /docker-compose/, /container/, /image:/],
      languages: ['any'],
      description: 'Docker containerization for polyglot services'
    },
    {
      type: 'message_queue',
      evidence: [/rabbitmq/, /kafka/, /redis/, /amqp/, /mqtt/, /queue/],
      languages: ['any'],
      description: 'Message queue communication'
    },
    {
      type: 'web_assembly',
      evidence: [/\.wasm/, /wasm/, /webassembly/i, /emscripten/],
      languages: ['rust', 'cpp', 'c', 'go'],
      description: 'WebAssembly interop'
    },
    {
      type: 'node_native',
      evidence: [/node-gyp/, /\.node/, /napi/, /addon/, /binding\.gyp/],
      languages: ['javascript', 'typescript', 'cpp', 'c'],
      description: 'Node.js native addon'
    }
  ];

  // Cross-platform framework patterns
  private readonly CROSS_PLATFORM_FRAMEWORKS = [
    {
      name: 'electron',
      evidence: [/electron/, /app\.whenReady/, /BrowserWindow/],
      languages: ['javascript', 'typescript'],
      type: 'desktop'
    },
    {
      name: 'react_native',
      evidence: [/react-native/, /AppRegistry/, /Platform\.OS/],
      languages: ['javascript', 'typescript'],
      type: 'mobile'
    },
    {
      name: 'flutter',
      evidence: [/flutter/, /pubspec\.yaml/, /main\.dart/],
      languages: ['dart'],
      type: 'mobile'
    },
    {
      name: 'xamarin',
      evidence: [/xamarin/i, /\.xaml/, /MonoTouch/, /MonoDroid/],
      languages: ['csharp'],
      type: 'mobile'
    },
    {
      name: 'tauri',
      evidence: [/tauri/, /tauri\.conf\.json/, /invoke\(/],
      languages: ['rust', 'javascript', 'typescript'],
      type: 'desktop'
    }
  ];

  constructor(storage: MindMapStorage) {
    this.storage = storage;
  }

  /**
   * Detect cross-language dependencies in the project
   */
  async detectCrossLanguageDependencies(): Promise<CrossLanguageDependency[]> {
    const dependencies: CrossLanguageDependency[] = [];
    const graph = this.storage.getGraph();

    // Get all file nodes grouped by language
    const filesByLanguage = new Map<string, MindMapNode[]>();
    
    for (const [_, node] of graph.nodes) {
      if (node.type === 'file' && node.metadata.language) {
        const language = node.metadata.language;
        if (!filesByLanguage.has(language)) {
          filesByLanguage.set(language, []);
        }
        filesByLanguage.get(language)!.push(node);
      }
    }

    // Analyze each file for cross-language patterns
    for (const [sourceLanguage, sourceFiles] of filesByLanguage) {
      for (const sourceFile of sourceFiles) {
        const fileDependencies = await this.analyzeFileForCrossLanguageDeps(
          sourceFile, 
          filesByLanguage, 
          sourceLanguage
        );
        dependencies.push(...fileDependencies);
      }
    }

    // Detect microservice communication patterns
    const microserviceDeps = await this.detectMicroserviceCommunication(filesByLanguage);
    dependencies.push(...microserviceDeps);

    // Detect shared configuration patterns
    const configDeps = await this.detectSharedConfiguration(filesByLanguage);
    dependencies.push(...configDeps);

    return dependencies;
  }

  /**
   * Analyze project structure for polyglot patterns
   */
  async analyzePolyglotProject(): Promise<PolyglotProject> {
    const graph = this.storage.getGraph();
    const languages = new Map<string, {
      fileCount: number;
      primaryFrameworks: string[];
      entryPoints: string[];
      buildTools: string[];
    }>();

    // Collect language statistics
    for (const [_, node] of graph.nodes) {
      if (node.type === 'file' && node.metadata.language) {
        const lang = node.metadata.language;
        
        if (!languages.has(lang)) {
          languages.set(lang, {
            fileCount: 0,
            primaryFrameworks: [],
            entryPoints: [],
            buildTools: []
          });
        }

        const langData = languages.get(lang)!;
        langData.fileCount++;

        // Detect frameworks
        if (node.metadata.framework) {
          if (!langData.primaryFrameworks.includes(node.metadata.framework)) {
            langData.primaryFrameworks.push(node.metadata.framework);
          }
        }

        // Detect entry points
        if (this.isEntryPoint(node)) {
          langData.entryPoints.push(node.path || node.name);
        }

        // Detect build tools
        const buildTool = this.detectBuildTool(node);
        if (buildTool && !langData.buildTools.includes(buildTool)) {
          langData.buildTools.push(buildTool);
        }
      }
    }

    // Determine primary and secondary languages
    const languagesByFileCount = Array.from(languages.entries())
      .sort(([, a], [, b]) => b.fileCount - a.fileCount);
    
    const primaryLanguage = languagesByFileCount[0]?.[0] || 'unknown';
    const secondaryLanguages = languagesByFileCount.slice(1, 4).map(([lang]) => lang);

    // Detect cross-language patterns
    const crossLanguagePatterns = await this.detectCrossLanguagePatterns();

    // Determine architectural style
    const architecturalStyle = this.determineArchitecturalStyle(languages, crossLanguagePatterns);

    // Detect interoperability patterns
    const interopPatterns = await this.detectInteroperabilityPatterns();

    return {
      languages,
      crossLanguagePatterns,
      architecturalStyle,
      primaryLanguage,
      secondaryLanguages,
      interopPatterns
    };
  }

  /**
   * Generate multi-language refactoring suggestions
   */
  async generateRefactoringSuggestions(): Promise<MultiLanguageRefactoring[]> {
    const suggestions: MultiLanguageRefactoring[] = [];
    const polyglotAnalysis = await this.analyzePolyglotProject();
    const dependencies = await this.detectCrossLanguageDependencies();

    // Suggest service extraction for tightly coupled cross-language code
    const serviceExtractions = this.suggestServiceExtractions(dependencies);
    suggestions.push(...serviceExtractions);

    // Suggest API standardization
    const apiStandardizations = this.suggestAPIStandardization(dependencies);
    suggestions.push(...apiStandardizations);

    // Suggest configuration consolidation
    const configConsolidations = this.suggestConfigurationConsolidation(polyglotAnalysis);
    suggestions.push(...configConsolidations);

    // Suggest dependency updates across languages
    const dependencyUpdates = this.suggestDependencyUpdates(polyglotAnalysis);
    suggestions.push(...dependencyUpdates);

    return suggestions;
  }

  private async analyzeFileForCrossLanguageDeps(
    sourceFile: MindMapNode,
    filesByLanguage: Map<string, MindMapNode[]>,
    sourceLanguage: string
  ): Promise<CrossLanguageDependency[]> {
    const dependencies: CrossLanguageDependency[] = [];
    
    // This would analyze file content for cross-language references
    // For now, we'll use metadata and naming patterns
    
    const fileName = sourceFile.name.toLowerCase();
    const filePath = sourceFile.path?.toLowerCase() || '';

    // Detect API-related files that might communicate across languages
    if (fileName.includes('api') || filePath.includes('/api/') || 
        fileName.includes('service') || fileName.includes('client')) {
      
      // Look for corresponding files in other languages
      for (const [targetLanguage, targetFiles] of filesByLanguage) {
        if (targetLanguage === sourceLanguage) continue;

        for (const targetFile of targetFiles) {
          const targetFileName = targetFile.name.toLowerCase();
          const targetFilePath = targetFile.path?.toLowerCase() || '';

          // Check for naming pattern matches
          if (this.hasMatchingPattern(fileName, targetFileName) ||
              this.hasMatchingPattern(filePath, targetFilePath)) {
            
            dependencies.push({
              sourceFile: sourceFile.path || sourceFile.name,
              sourceLanguage,
              targetFile: targetFile.path || targetFile.name,
              targetLanguage,
              dependencyType: 'api_call',
              confidence: 0.7,
              evidence: ['naming_pattern_match'],
              bidirectional: true
            });
          }
        }
      }
    }

    return dependencies;
  }

  private async detectMicroserviceCommunication(
    filesByLanguage: Map<string, MindMapNode[]>
  ): Promise<CrossLanguageDependency[]> {
    const dependencies: CrossLanguageDependency[] = [];

    // Look for microservice patterns across different languages
    for (const [lang1, files1] of filesByLanguage) {
      for (const [lang2, files2] of filesByLanguage) {
        if (lang1 === lang2) continue;

        const service1Files = files1.filter(f => this.isMicroserviceFile(f));
        const service2Files = files2.filter(f => this.isMicroserviceFile(f));

        for (const serviceFile1 of service1Files) {
          for (const serviceFile2 of service2Files) {
            if (this.mightCommunicate(serviceFile1, serviceFile2)) {
              dependencies.push({
                sourceFile: serviceFile1.path || serviceFile1.name,
                sourceLanguage: lang1,
                targetFile: serviceFile2.path || serviceFile2.name,
                targetLanguage: lang2,
                dependencyType: 'microservice',
                confidence: 0.6,
                evidence: ['microservice_pattern'],
                bidirectional: true
              });
            }
          }
        }
      }
    }

    return dependencies;
  }

  private async detectSharedConfiguration(
    filesByLanguage: Map<string, MindMapNode[]>
  ): Promise<CrossLanguageDependency[]> {
    const dependencies: CrossLanguageDependency[] = [];
    const configFiles: MindMapNode[] = [];

    // Collect configuration files
    for (const [_, files] of filesByLanguage) {
      for (const file of files) {
        if (this.isConfigurationFile(file)) {
          configFiles.push(file);
        }
      }
    }

    // Create dependencies from config files to code files
    for (const configFile of configFiles) {
      for (const [language, files] of filesByLanguage) {
        for (const codeFile of files) {
          if (this.usesConfiguration(codeFile, configFile)) {
            dependencies.push({
              sourceFile: codeFile.path || codeFile.name,
              sourceLanguage: language,
              targetFile: configFile.path || configFile.name,
              targetLanguage: 'config',
              dependencyType: 'config',
              confidence: 0.8,
              evidence: ['config_usage'],
              bidirectional: false
            });
          }
        }
      }
    }

    return dependencies;
  }

  private async detectCrossLanguagePatterns(): Promise<string[]> {
    const patterns: string[] = [];
    const graph = this.storage.getGraph();

    // Analyze all files for cross-language patterns
    for (const [_, node] of graph.nodes) {
      if (node.type === 'file') {
        for (const pattern of this.INTEROP_PATTERNS) {
          if (this.matchesPattern(node, pattern.evidence)) {
            if (!patterns.includes(pattern.type)) {
              patterns.push(pattern.type);
            }
          }
        }
      }
    }

    return patterns;
  }

  private determineArchitecturalStyle(
    languages: Map<string, any>,
    patterns: string[]
  ): 'monolithic' | 'microservices' | 'hybrid' | 'modular' {
    const languageCount = languages.size;
    const hasServicePatterns = patterns.some(p => 
      ['rest_api', 'microservice', 'message_queue'].includes(p)
    );
    const hasContainerization = patterns.includes('docker_containerization');

    if (languageCount === 1) {
      return 'monolithic';
    } else if (languageCount > 3 && hasServicePatterns && hasContainerization) {
      return 'microservices';
    } else if (languageCount > 1 && hasServicePatterns) {
      return 'hybrid';
    } else {
      return 'modular';
    }
  }

  private async detectInteroperabilityPatterns(): Promise<InteroperabilityPattern[]> {
    const patterns: InteroperabilityPattern[] = [];
    const graph = this.storage.getGraph();

    for (const interopPattern of this.INTEROP_PATTERNS) {
      const matchingFiles: string[] = [];
      const languages: string[] = [];

      for (const [_, node] of graph.nodes) {
        if (node.type === 'file' && this.matchesPattern(node, interopPattern.evidence)) {
          matchingFiles.push(node.path || node.name);
          if (node.metadata.language && !languages.includes(node.metadata.language)) {
            languages.push(node.metadata.language);
          }
        }
      }

      if (matchingFiles.length > 0 && languages.length > 1) {
        patterns.push({
          type: interopPattern.type,
          languages,
          files: matchingFiles,
          description: interopPattern.description,
          confidence: Math.min(0.9, matchingFiles.length * 0.2),
          examples: matchingFiles.slice(0, 3)
        });
      }
    }

    return patterns;
  }

  // Helper methods
  private isEntryPoint(node: MindMapNode): boolean {
    const name = node.name.toLowerCase();
    const path = node.path?.toLowerCase() || '';
    
    return name === 'main.ts' || name === 'main.js' || name === 'index.ts' || 
           name === 'index.js' || name === 'app.ts' || name === 'app.js' ||
           name === 'main.py' || name === '__main__.py' || name === 'app.py' ||
           name === 'main.java' || name === 'Application.java' ||
           name === 'main.go' || name === 'main.rs' || name === 'main.cpp' ||
           path.includes('/src/main/') || path.includes('/cmd/');
  }

  private detectBuildTool(node: MindMapNode): string | null {
    const name = node.name.toLowerCase();
    
    if (name === 'package.json') return 'npm';
    if (name === 'cargo.toml') return 'cargo';
    if (name === 'pom.xml') return 'maven';
    if (name === 'build.gradle') return 'gradle';
    if (name === 'go.mod') return 'go_modules';
    if (name === 'makefile' || name === 'cmakelists.txt') return 'make';
    if (name === 'requirements.txt' || name === 'pyproject.toml') return 'pip';
    
    return null;
  }

  private hasMatchingPattern(source: string, target: string): boolean {
    // Simple pattern matching - could be enhanced with more sophisticated algorithms
    const sourceWords = source.split(/[_\-\.\/]/).filter(w => w.length > 2);
    const targetWords = target.split(/[_\-\.\/]/).filter(w => w.length > 2);
    
    return sourceWords.some(sw => targetWords.some(tw => sw === tw));
  }

  private isMicroserviceFile(node: MindMapNode): boolean {
    const name = node.name.toLowerCase();
    const path = node.path?.toLowerCase() || '';
    
    return name.includes('service') || name.includes('api') || name.includes('server') ||
           path.includes('/services/') || path.includes('/api/') || 
           node.metadata.framework === 'microservice';
  }

  private mightCommunicate(file1: MindMapNode, file2: MindMapNode): boolean {
    // Simple heuristic - files with similar names or in related directories might communicate
    return this.hasMatchingPattern(file1.name, file2.name) ||
           this.hasMatchingPattern(file1.path || '', file2.path || '');
  }

  private isConfigurationFile(node: MindMapNode): boolean {
    const name = node.name.toLowerCase();
    
    return name.endsWith('.json') || name.endsWith('.yaml') || name.endsWith('.yml') ||
           name.endsWith('.toml') || name.endsWith('.ini') || name.endsWith('.env') ||
           name.includes('config') || name.includes('settings');
  }

  private usesConfiguration(codeFile: MindMapNode, configFile: MindMapNode): boolean {
    // Simple heuristic based on proximity and naming
    const codePath = codeFile.path || '';
    const configPath = configFile.path || '';
    
    // Same directory or parent/child relationship
    return codePath.startsWith(configPath.substring(0, configPath.lastIndexOf('/'))) ||
           configPath.startsWith(codePath.substring(0, codePath.lastIndexOf('/')));
  }

  private matchesPattern(node: MindMapNode, patterns: RegExp[]): boolean {
    const content = `${node.name} ${node.path || ''} ${JSON.stringify(node.metadata)}`;
    return patterns.some(pattern => pattern.test(content));
  }

  // Refactoring suggestion methods
  private suggestServiceExtractions(dependencies: CrossLanguageDependency[]): MultiLanguageRefactoring[] {
    const suggestions: MultiLanguageRefactoring[] = [];
    
    // Look for tightly coupled cross-language dependencies
    const tightlyCoupled = dependencies.filter(dep => 
      dep.confidence > 0.8 && dep.dependencyType === 'api_call'
    );

    if (tightlyCoupled.length > 2) {
      suggestions.push({
        type: 'extract_service',
        description: 'Extract tightly coupled cross-language functionality into a dedicated service',
        files: [...new Set(tightlyCoupled.flatMap(dep => [dep.sourceFile, dep.targetFile]))],
        languages: [...new Set(tightlyCoupled.flatMap(dep => [dep.sourceLanguage, dep.targetLanguage]))],
        impact: 'high',
        effort: 'high',
        benefits: [
          'Improved separation of concerns',
          'Better scalability',
          'Reduced coupling between languages'
        ],
        risks: [
          'Increased complexity',
          'Network latency',
          'Additional operational overhead'
        ],
        steps: [
          'Identify common functionality',
          'Design service API',
          'Implement service',
          'Update clients',
          'Deploy and test'
        ]
      });
    }

    return suggestions;
  }

  private suggestAPIStandardization(dependencies: CrossLanguageDependency[]): MultiLanguageRefactoring[] {
    const suggestions: MultiLanguageRefactoring[] = [];
    
    const apiDependencies = dependencies.filter(dep => dep.dependencyType === 'api_call');
    if (apiDependencies.length > 1) {
      suggestions.push({
        type: 'standardize_api',
        description: 'Standardize API interfaces across different languages',
        files: [...new Set(apiDependencies.flatMap(dep => [dep.sourceFile, dep.targetFile]))],
        languages: [...new Set(apiDependencies.flatMap(dep => [dep.sourceLanguage, dep.targetLanguage]))],
        impact: 'medium',
        effort: 'medium',
        benefits: [
          'Consistent API patterns',
          'Easier maintenance',
          'Improved developer experience'
        ],
        risks: [
          'Breaking changes',
          'Migration effort'
        ],
        steps: [
          'Audit existing APIs',
          'Define standard patterns',
          'Create migration plan',
          'Update implementations',
          'Update documentation'
        ]
      });
    }

    return suggestions;
  }

  private suggestConfigurationConsolidation(polyglot: PolyglotProject): MultiLanguageRefactoring[] {
    const suggestions: MultiLanguageRefactoring[] = [];
    
    if (polyglot.languages.size > 2) {
      suggestions.push({
        type: 'consolidate_config',
        description: 'Consolidate configuration management across languages',
        files: [],
        languages: Array.from(polyglot.languages.keys()),
        impact: 'medium',
        effort: 'low',
        benefits: [
          'Centralized configuration',
          'Reduced duplication',
          'Easier deployment'
        ],
        risks: [
          'Single point of failure',
          'Migration complexity'
        ],
        steps: [
          'Audit current configuration',
          'Choose configuration format',
          'Create central config service',
          'Update applications',
          'Test and deploy'
        ]
      });
    }

    return suggestions;
  }

  private suggestDependencyUpdates(polyglot: PolyglotProject): MultiLanguageRefactoring[] {
    const suggestions: MultiLanguageRefactoring[] = [];
    
    suggestions.push({
      type: 'update_dependencies',
      description: 'Update and standardize dependencies across languages',
      files: [],
      languages: Array.from(polyglot.languages.keys()),
      impact: 'low',
      effort: 'medium',
      benefits: [
        'Security updates',
        'Performance improvements',
        'Bug fixes'
      ],
      risks: [
        'Breaking changes',
        'Compatibility issues'
      ],
      steps: [
        'Audit current dependencies',
        'Check for updates',
        'Test compatibility',
        'Update gradually',
        'Monitor for issues'
      ]
    });

    return suggestions;
  }
}