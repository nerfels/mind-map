import { readFile, access } from 'fs/promises';
import { execSync } from 'child_process';
import { join, dirname, basename } from 'path';
import { MindMapStorage } from './MindMapStorage.js';

export interface ToolingInfo {
  name: string;
  type: 'test' | 'lint' | 'format' | 'build' | 'type_check' | 'security' | 'coverage';
  version?: string;
  configFile?: string;
  command: string;
  available: boolean;
  description: string;
  language: string;
  priority: number; // Higher = more important
}

export interface LanguageTooling {
  language: string;
  detectTools(projectRoot: string): Promise<ToolingInfo[]>;
  runTool(tool: ToolingInfo, projectRoot: string, args?: string[]): Promise<ToolResult>;
  getRecommendations(availableTools: ToolingInfo[]): ToolingRecommendation[];
}

export interface ToolResult {
  tool: string;
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  issues?: ToolIssue[];
}

export interface ToolIssue {
  file: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  rule?: string;
  category: string;
}

export interface ToolingRecommendation {
  tool: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  installCommand?: string;
  configExample?: string;
}

export class LanguageToolingDetector {
  private storage: MindMapStorage;
  private toolingHandlers: Map<string, LanguageTooling> = new Map();
  private toolingCache: Map<string, ToolingInfo[]> = new Map();
  private resultCache: Map<string, ToolResult> = new Map();

  constructor(storage: MindMapStorage) {
    this.storage = storage;
    // Initialize handlers asynchronously
    this.initializeHandlers().catch(console.error);
  }

  private async initializeHandlers() {
    // Import and initialize language-specific handlers
    const { PythonTooling } = await import('./tooling/PythonTooling.js');
    const { JavaTooling } = await import('./tooling/JavaTooling.js');
    const { GoTooling } = await import('./tooling/GoTooling.js');
    const { RustTooling } = await import('./tooling/RustTooling.js');
    const { CppTooling } = await import('./tooling/CppTooling.js');
    
    this.toolingHandlers.set('python', new PythonTooling());
    this.toolingHandlers.set('java', new JavaTooling());
    this.toolingHandlers.set('go', new GoTooling());
    this.toolingHandlers.set('rust', new RustTooling());
    this.toolingHandlers.set('cpp', new CppTooling());
    this.toolingHandlers.set('c', new CppTooling()); // Use same handler for C
  }

  /**
   * Detect all available tooling across all languages in the project
   */
  async detectProjectTooling(projectRoot: string, forceRefresh = false): Promise<Map<string, ToolingInfo[]>> {
    const cacheKey = `tooling_${projectRoot}`;
    
    if (!forceRefresh && this.toolingCache.has(cacheKey)) {
      const cached = this.toolingCache.get(cacheKey)!;
      return this.groupToolsByLanguage(cached);
    }

    const allTools: ToolingInfo[] = [];
    
    // Detect tools for each supported language
    for (const [language, handler] of this.toolingHandlers) {
      try {
        const languageTools = await handler.detectTools(projectRoot);
        allTools.push(...languageTools);
      } catch (error) {
        console.error(`Error detecting ${language} tooling:`, error);
      }
    }

    // Generic tooling detection (package.json scripts, etc.)
    const genericTools = await this.detectGenericTooling(projectRoot);
    allTools.push(...genericTools);

    this.toolingCache.set(cacheKey, allTools);
    return this.groupToolsByLanguage(allTools);
  }

  /**
   * Run a specific tool and return results
   */
  async runTool(
    tool: ToolingInfo, 
    projectRoot: string, 
    args: string[] = [],
    cacheResults = true
  ): Promise<ToolResult> {
    const cacheKey = `result_${tool.language}_${tool.name}_${args.join('_')}`;
    
    if (cacheResults && this.resultCache.has(cacheKey)) {
      return this.resultCache.get(cacheKey)!;
    }

    const handler = this.toolingHandlers.get(tool.language);
    if (!handler) {
      throw new Error(`No handler available for language: ${tool.language}`);
    }

    const startTime = Date.now();
    
    try {
      const result = await handler.runTool(tool, projectRoot, args);
      result.duration = Date.now() - startTime;
      
      if (cacheResults) {
        this.resultCache.set(cacheKey, result);
      }

      // Update mind map with tooling results
      await this.updateMindMapWithResults(tool, result);

      return result;
    } catch (error) {
      const result: ToolResult = {
        tool: tool.name,
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };

      if (cacheResults) {
        this.resultCache.set(cacheKey, result);
      }

      return result;
    }
  }

  /**
   * Get tooling recommendations for the project
   */
  async getToolingRecommendations(projectRoot: string): Promise<Map<string, ToolingRecommendation[]>> {
    const toolingByLanguage = await this.detectProjectTooling(projectRoot);
    const recommendations = new Map<string, ToolingRecommendation[]>();

    for (const [language, tools] of toolingByLanguage) {
      const handler = this.toolingHandlers.get(language);
      if (handler) {
        const langRecommendations = handler.getRecommendations(tools);
        if (langRecommendations.length > 0) {
          recommendations.set(language, langRecommendations);
        }
      }
    }

    return recommendations;
  }

  /**
   * Run multiple tools and aggregate results
   */
  async runToolSuite(
    tools: ToolingInfo[], 
    projectRoot: string, 
    parallel = true
  ): Promise<Map<string, ToolResult>> {
    const results = new Map<string, ToolResult>();

    if (parallel) {
      const promises = tools.map(async (tool) => {
        const result = await this.runTool(tool, projectRoot);
        return [tool.name, result] as const;
      });

      const resolved = await Promise.allSettled(promises);
      
      for (const promise of resolved) {
        if (promise.status === 'fulfilled') {
          const [toolName, result] = promise.value;
          results.set(toolName, result);
        }
      }
    } else {
      for (const tool of tools) {
        try {
          const result = await this.runTool(tool, projectRoot);
          results.set(tool.name, result);
        } catch (error) {
          console.error(`Failed to run tool ${tool.name}:`, error);
        }
      }
    }

    return results;
  }

  /**
   * Detect generic tooling from package.json, Makefile, etc.
   */
  private async detectGenericTooling(projectRoot: string): Promise<ToolingInfo[]> {
    const tools: ToolingInfo[] = [];

    // Package.json scripts
    try {
      const packageJsonPath = join(projectRoot, 'package.json');
      await access(packageJsonPath);
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));
      
      if (packageJson.scripts) {
        for (const [scriptName, scriptCmd] of Object.entries(packageJson.scripts)) {
          const cmd = scriptCmd as string;
          
          let type: ToolingInfo['type'] = 'build';
          if (/test|spec/.test(scriptName)) type = 'test';
          else if (/lint|eslint/.test(scriptName)) type = 'lint';
          else if (/format|prettier/.test(scriptName)) type = 'format';
          else if (/type|tsc/.test(scriptName)) type = 'type_check';
          
          tools.push({
            name: `npm-${scriptName}`,
            type,
            command: `npm run ${scriptName}`,
            available: true,
            description: `npm script: ${cmd}`,
            language: 'javascript',
            priority: 6
          });
        }
      }
    } catch {
      // No package.json
    }

    // Makefile
    try {
      const makefilePath = join(projectRoot, 'Makefile');
      await access(makefilePath);
      
      tools.push({
        name: 'make',
        type: 'build',
        command: 'make',
        available: await this.isCommandAvailable('make'),
        description: 'GNU Make build system',
        language: 'generic',
        priority: 7
      });
    } catch {
      // No Makefile
    }

    // Docker
    try {
      const dockerfilePath = join(projectRoot, 'Dockerfile');
      await access(dockerfilePath);
      
      tools.push({
        name: 'docker',
        type: 'build',
        command: 'docker build .',
        available: await this.isCommandAvailable('docker'),
        description: 'Docker containerization',
        language: 'generic',
        priority: 8
      });
    } catch {
      // No Dockerfile
    }

    return tools;
  }

  private groupToolsByLanguage(tools: ToolingInfo[]): Map<string, ToolingInfo[]> {
    const grouped = new Map<string, ToolingInfo[]>();
    
    for (const tool of tools) {
      if (!grouped.has(tool.language)) {
        grouped.set(tool.language, []);
      }
      grouped.get(tool.language)!.push(tool);
    }

    // Sort tools by priority within each language
    for (const [, langTools] of grouped) {
      langTools.sort((a, b) => b.priority - a.priority);
    }

    return grouped;
  }

  private async updateMindMapWithResults(tool: ToolingInfo, result: ToolResult) {
    // Create tooling nodes in the mind map
    const toolingNodeId = `tooling_${tool.language}_${tool.name}`;
    
    const existingNode = this.storage.getNode(toolingNodeId);
    if (!existingNode) {
      this.storage.addNode({
        id: toolingNodeId,
        type: 'pattern',
        name: `${tool.name} (${tool.language})`,
        path: '',
        confidence: result.success ? 0.9 : 0.3,
        metadata: {
          toolType: tool.type,
          language: tool.language,
          command: tool.command,
          lastRun: new Date().toISOString(),
          lastResult: result.success ? 'success' : 'failure'
        },
        frameworks: [tool.name],
        createdAt: new Date(),
        lastUpdated: new Date(),
        properties: {}
      });
    } else {
      // Update existing node
      existingNode.confidence = result.success ? 0.9 : 0.3;
      existingNode.metadata = {
        ...existingNode.metadata,
        lastRun: new Date().toISOString(),
        lastResult: result.success ? 'success' : 'failure'
      };
      existingNode.lastUpdated = new Date();
    }

    // Process issues and create error nodes
    if (result.issues) {
      for (const issue of result.issues) {
        if (issue.severity === 'error') {
          const errorNodeId = `error_${tool.name}_${issue.file}_${issue.line || 0}`;
          
          this.storage.addNode({
            id: errorNodeId,
            type: 'error',
            name: `${tool.name}: ${issue.message}`,
            path: issue.file,
            confidence: 0.8,
            metadata: {
              errorType: issue.category,
              tool: tool.name,
              line: issue.line,
              column: issue.column,
              rule: issue.rule,
              severity: issue.severity
            },
            frameworks: [],
            createdAt: new Date(),
            lastUpdated: new Date(),
            properties: {}
          });

          // Link error to tooling
          this.storage.addEdge({
            id: `edge_${toolingNodeId}_${errorNodeId}`,
            source: toolingNodeId,
            target: errorNodeId,
            type: 'detects',
            confidence: 0.9,
            createdAt: new Date()
          });
        }
      }
    }
  }

  private async isCommandAvailable(command: string): Promise<boolean> {
    try {
      execSync(`which ${command}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    this.toolingCache.clear();
    this.resultCache.clear();
  }

  /**
   * Get cached tooling for a project
   */
  getCachedTooling(projectRoot: string): ToolingInfo[] | undefined {
    return this.toolingCache.get(`tooling_${projectRoot}`);
  }

  /**
   * Get tooling statistics
   */
  getToolingStats(): {
    cachedProjects: number;
    cachedResults: number;
    supportedLanguages: string[];
    totalTools: number;
  } {
    let totalTools = 0;
    for (const tools of this.toolingCache.values()) {
      totalTools += tools.length;
    }

    return {
      cachedProjects: this.toolingCache.size,
      cachedResults: this.resultCache.size,
      supportedLanguages: Array.from(this.toolingHandlers.keys()),
      totalTools
    };
  }
}