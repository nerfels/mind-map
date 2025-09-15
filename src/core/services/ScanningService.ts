import { MindMapStorage } from '../MindMapStorage.js';
import { FileScanner } from '../FileScanner.js';
import { CodeAnalyzer } from '../CodeAnalyzer.js';
import { CallPatternAnalyzer } from '../CallPatternAnalyzer.js';
import { ParallelFileProcessor } from '../ParallelFileProcessor.js';
import { ScalabilityManager } from '../ScalabilityManager.js';
import { ProjectScale, ProcessingProgress } from '../../types/index.js';

export interface ScanResult {
  summary: string;
  scannedFiles: number;
  totalFiles: number;
  partitions: number;
  scanTime: number;
  projectScale: ProjectScale;
}

export class ScanningService {
  constructor(
    private storage: MindMapStorage,
    private scanner: FileScanner,
    private codeAnalyzer: CodeAnalyzer,
    private callPatternAnalyzer: CallPatternAnalyzer,
    private parallelProcessor: ParallelFileProcessor,
    private scalabilityManager: ScalabilityManager,
    private projectRoot: string
  ) {}

  async scanProject(forceRescan = false, useParallelProcessing = true): Promise<ScanResult> {
    console.log('🔍 Starting scalable project scan...');

    // First, analyze project scale for adaptive configuration
    const projectScale = await this.scalabilityManager.analyzeProjectScale();
    console.log(`📏 Project scale: ${projectScale.scale} (${projectScale.fileCount} files)`);

    // Apply recommended configuration based on project scale
    this.scalabilityManager.applyConfiguration(projectScale.recommendedConfig);

    const graph = this.storage.getGraph();
    const shouldScan = forceRescan ||
      graph.nodes.size === 0 ||
      (Date.now() - graph.lastScan.getTime()) > 24 * 60 * 60 * 1000; // 24 hours

    if (!shouldScan && !forceRescan) {
      console.log('✅ Using cached project scan (use forceRescan=true to override)');
      return {
        summary: 'Used cached scan',
        scannedFiles: graph.nodes.size,
        totalFiles: graph.nodes.size,
        partitions: 0,
        scanTime: 0,
        projectScale
      };
    }

    const startTime = Date.now();

    if (useParallelProcessing && projectScale.fileCount > 50) {
      return await this.scanWithParallelProcessing(projectScale, startTime);
    } else {
      return await this.scanLegacy(forceRescan, useParallelProcessing, projectScale, startTime);
    }
  }

  private async scanWithParallelProcessing(projectScale: ProjectScale, startTime: number): Promise<ScanResult> {
    try {
      console.log('🚀 Using parallel processing for enhanced performance');

      // Get file list and process files
      const files = await this.scanner.scanProject();
      const result = await this.parallelProcessor.processFiles(files.map(f => f.path));

      const scanTime = Date.now() - startTime;
      const totalFiles = files.length;
      const scannedFiles = result.length;

      console.log(`✅ Parallel scan completed in ${scanTime}ms`);
      console.log(`📊 Processed ${scannedFiles} files out of ${totalFiles} total files`);

      // Process the results and add to storage
      for (const fileInfo of result) {
        try {
          // Determine if we should use enhanced analysis for TypeScript/JavaScript files
          const isJsTsFile = fileInfo.path.match(/\.(ts|tsx|js|jsx)$/i);

          let analysis: any = null;
          let callPatternResult: any = null;

          if (isJsTsFile) {
            // Use CallPatternAnalyzer for enhanced variable and call analysis
            try {
              console.log(`🔍 Running CallPatternAnalyzer on ${fileInfo.path}...`);
              const startTime = Date.now();

              callPatternResult = await this.callPatternAnalyzer.analyzeFile(fileInfo.path);

              const duration = Date.now() - startTime;
              console.log(`✅ CallPatternAnalyzer completed for ${fileInfo.path} in ${duration}ms`);
              console.log(`   Variables: ${callPatternResult.variableAnalysis?.declarations.length || 0}`);
              console.log(`   Nodes: ${callPatternResult.nodes.length}, Edges: ${callPatternResult.edges.length}`);

              analysis = this.extractBasicStructureFromCallPattern(callPatternResult);
            } catch (error) {
              console.warn(`❌ Failed CallPatternAnalyzer for ${fileInfo.path}, falling back to CodeAnalyzer:`, error);
              analysis = await this.codeAnalyzer.analyzeFile(fileInfo.path);
            }
          } else {
            // Use CodeAnalyzer for other file types
            analysis = await this.codeAnalyzer.analyzeFile(fileInfo.path);
          }

          // Add the file node
          const fileNode = {
            id: fileInfo.path,
            name: fileInfo.name,
            type: (fileInfo.type === 'directory' ? 'directory' : 'file') as 'directory' | 'file',
            path: fileInfo.path,
            metadata: analysis || {},
            confidence: 0.8,
            lastUpdated: new Date()
          };
          this.storage.addNode(fileNode);

          // If we have code analysis, add separate nodes for classes and functions
          if (analysis && fileInfo.type === 'file') {
            // Add class nodes
            if (analysis.classes) {
              for (const cls of analysis.classes) {
                const classId = `${fileInfo.path}#class:${cls.name}`;
                this.storage.addNode({
                  id: classId,
                  name: cls.name,
                  type: 'class',
                  path: fileInfo.path,
                  metadata: {
                    startLine: cls.startLine,
                    endLine: cls.endLine,
                    methods: cls.methods || [],
                    properties: cls.properties || []
                  },
                  confidence: 0.9,
                  lastUpdated: new Date()
                });

                // Add relationship: file contains class
                this.storage.addEdge({
                  id: `${fileInfo.path}->contains->${classId}`,
                  source: fileInfo.path,
                  target: classId,
                  type: 'contains',
                  confidence: 0.9,
                  lastUpdated: new Date()
                });
              }
            }

            // Add function nodes
            if (analysis.functions) {
              for (const func of analysis.functions) {
                const functionId = `${fileInfo.path}#function:${func.name}`;
                this.storage.addNode({
                  id: functionId,
                  name: func.name,
                  type: 'function',
                  path: fileInfo.path,
                  metadata: {
                    startLine: func.startLine,
                    endLine: func.endLine,
                    parameters: func.parameters || [],
                    returnType: func.returnType
                  },
                  confidence: 0.9,
                  lastUpdated: new Date()
                });

                // Add relationship: file contains function
                this.storage.addEdge({
                  id: `${fileInfo.path}->contains->${functionId}`,
                  source: fileInfo.path,
                  target: functionId,
                  type: 'contains',
                  confidence: 0.9,
                  lastUpdated: new Date()
                });
              }
            }
          }

          // If we used CallPatternAnalyzer, add the enhanced nodes and edges
          if (callPatternResult) {
            this.addCallPatternNodesToStorage(callPatternResult, fileInfo.path);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to analyze ${fileInfo.path}:`, error);
        }
      }

      await this.storage.save();

      return {
        summary: `Parallel scan: ${scannedFiles} files processed out of ${totalFiles} total`,
        scannedFiles,
        totalFiles,
        partitions: 0,
        scanTime,
        projectScale
      };

    } catch (error) {
      console.warn('⚠️ Parallel processing failed, falling back to legacy scan:', error);
      return await this.scanLegacy(true, false, projectScale, startTime);
    }
  }

  private async scanLegacy(forceRescan: boolean, useParallelProcessing: boolean, projectScale: ProjectScale, startTime: number): Promise<ScanResult> {
    if (forceRescan) {
      this.storage.clear();
    }

    const files = await this.scanner.scanProject();
    console.log(`📁 Found ${files.length} files to analyze`);

    let processedFiles = 0;
    const totalFiles = files.length;

    for (const file of files) {
      try {
        // Determine if we should use enhanced analysis for TypeScript/JavaScript files
        const isJsTsFile = file.path.match(/\.(ts|tsx|js|jsx)$/i);

        let analysis: any = null;
        let callPatternResult: any = null;

        if (isJsTsFile) {
          // Use CallPatternAnalyzer for enhanced variable and call analysis
          try {
            console.log(`🔍 [Legacy] Running CallPatternAnalyzer on ${file.path}...`);
            const startTime = Date.now();

            callPatternResult = await this.callPatternAnalyzer.analyzeFile(file.path);

            const duration = Date.now() - startTime;
            console.log(`✅ [Legacy] CallPatternAnalyzer completed for ${file.path} in ${duration}ms`);
            console.log(`   Variables: ${callPatternResult.variableAnalysis?.declarations.length || 0}`);
            console.log(`   Nodes: ${callPatternResult.nodes.length}, Edges: ${callPatternResult.edges.length}`);

            analysis = this.extractBasicStructureFromCallPattern(callPatternResult);
          } catch (error) {
            console.warn(`❌ [Legacy] Failed CallPatternAnalyzer for ${file.path}, falling back to CodeAnalyzer:`, error);
            analysis = await this.codeAnalyzer.analyzeFile(file.path);
          }
        } else {
          // Use CodeAnalyzer for other file types
          analysis = await this.codeAnalyzer.analyzeFile(file.path);
        }

        // Add the file node
        this.storage.addNode({
          id: file.path,
          name: file.name,
          type: (file.type === 'directory' ? 'directory' : 'file') as 'directory' | 'file',
          path: file.path,
          metadata: analysis || {},
          confidence: 0.8,
          lastUpdated: new Date()
        });

        // If we have code analysis, add separate nodes for classes and functions
        if (analysis && file.type === 'file') {
          // Add class nodes
          if (analysis.classes) {
            for (const cls of analysis.classes) {
              const classId = `${file.path}#class:${cls.name}`;
              this.storage.addNode({
                id: classId,
                name: cls.name,
                type: 'class',
                path: file.path,
                metadata: {
                  startLine: cls.startLine,
                  endLine: cls.endLine,
                  methods: cls.methods || [],
                  properties: cls.properties || []
                },
                confidence: 0.9,
                lastUpdated: new Date()
              });

              // Add relationship: file contains class
              this.storage.addEdge({
                id: `${file.path}->contains->${classId}`,
                source: file.path,
                target: classId,
                type: 'contains',
                confidence: 0.9,
                lastUpdated: new Date()
              });
            }
          }

          // Add function nodes
          if (analysis.functions) {
            for (const func of analysis.functions) {
              const functionId = `${file.path}#function:${func.name}`;
              this.storage.addNode({
                id: functionId,
                name: func.name,
                type: 'function',
                path: file.path,
                metadata: {
                  startLine: func.startLine,
                  endLine: func.endLine,
                  parameters: func.parameters || [],
                  returnType: func.returnType
                },
                confidence: 0.9,
                lastUpdated: new Date()
              });

              // Add relationship: file contains function
              this.storage.addEdge({
                id: `${file.path}->contains->${functionId}`,
                source: file.path,
                target: functionId,
                type: 'contains',
                confidence: 0.9,
                lastUpdated: new Date()
              });
            }
          }
        }

        // If we used CallPatternAnalyzer, add the enhanced nodes and edges
        if (callPatternResult) {
          this.addCallPatternNodesToStorage(callPatternResult, file.path);
        }

        processedFiles++;

        if (processedFiles % 100 === 0) {
          console.log(`📊 Processed ${processedFiles}/${totalFiles} files`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to analyze ${file.path}:`, error);
      }
    }

    const graph = this.storage.getGraph();
    graph.lastScan = new Date();
    await this.storage.save();

    const scanTime = Date.now() - startTime;
    console.log(`✅ Legacy scan completed in ${scanTime}ms`);
    console.log(`📊 Successfully processed ${processedFiles}/${totalFiles} files`);
    console.log(`🔗 Graph contains ${graph.nodes.size} nodes and ${graph.edges.size} edges`);

    return {
      summary: `Legacy scan: ${processedFiles} files processed`,
      scannedFiles: processedFiles,
      totalFiles,
      partitions: 0,
      scanTime,
      projectScale
    };
  }

  async scanProjectLegacy(forceRescan = false, useParallelProcessing = true): Promise<void> {
    const graph = this.storage.getGraph();
    const shouldScan = forceRescan ||
      graph.nodes.size === 0 ||
      (Date.now() - graph.lastScan.getTime()) > 24 * 60 * 60 * 1000; // 24 hours

    if (!shouldScan) {
      console.log('Using cached project scan');
      return;
    }

    console.log('Scanning project files...');

    let files: any[];
    if (useParallelProcessing) {
      // Get file paths first (lightweight operation)
      const filePaths = await this.getFilePaths();
      console.log(`🚀 Starting parallel processing of ${filePaths.length} files...`);

      // Process files in parallel
      files = await this.parallelProcessor.processFiles(filePaths);
      console.log(`✅ Parallel processing completed: ${files.length} files processed`);
    } else {
      // Fallback to sequential processing
      files = await this.scanner.scanProject();
    }

    // Clear existing file and directory nodes
    const existingNodes = this.storage.findNodes(node =>
      node.type === 'file' || node.type === 'directory'
    );
    existingNodes.forEach(node => this.storage.removeNode(node.id));

    // Add file and directory nodes
    const directoryNodes = new Set<string>();

    for (const file of files) {
      // Create directory nodes for parent directories
      const pathParts = file.path.split('/');
      for (let i = 0; i < pathParts.length - 1; i++) {
        const dirPath = pathParts.slice(0, i + 1).join('/');
        const dirId = `dir:${dirPath}`;

        if (!directoryNodes.has(dirId)) {
          const dirNode: any = {
            id: dirId,
            type: 'directory',
            name: pathParts[i],
            path: dirPath,
            metadata: {
              depth: i + 1
            },
            confidence: 1.0,
            lastUpdated: new Date(),
            properties: {}
          };
          this.storage.addNode(dirNode);
          directoryNodes.add(dirId);

          // Add contains relationship to parent directory
          if (i > 0) {
            const parentDirPath = pathParts.slice(0, i).join('/');
            const parentDirId = `dir:${parentDirPath}`;
            this.addContainsEdge(parentDirId, dirId);
          }
        }
      }

      // Create file node
      const fileNode: any = {
        id: `file:${file.path}`,
        type: 'file',
        name: file.name,
        path: file.path,
        metadata: {
          size: file.size,
          extension: file.extension,
          mimeType: file.mimeType,
          lastModified: file.lastModified,
          isCode: this.scanner.isCodeFile(file),
          isConfig: this.scanner.isConfigFile(file),
          isTest: this.scanner.isTestFile(file)
        },
        confidence: 1.0,
        lastUpdated: new Date(),
        properties: {
          language: this.detectLanguage(file),
          framework: this.detectFramework(file)
        }
      };

      this.storage.addNode(fileNode);

      // Add contains relationship to parent directory (cross-platform)
      const pathSeparator = file.path.includes('/') ? '/' : '\\';
      if (file.path.includes(pathSeparator)) {
        const parentDirPath = file.path.substring(0, file.path.lastIndexOf(pathSeparator));
        const parentDirId = `dir:${parentDirPath}`;
        this.addContainsEdge(parentDirId, fileNode.id);
      }

      // Analyze code structure for supported file types
      if (this.scanner.isCodeFile(file) && this.codeAnalyzer.canAnalyze(file.path)) {
        try {
          const filePath = require('path').join(this.projectRoot, file.path);
          const codeStructure = await this.codeAnalyzer.analyzeFile(filePath);

          if (codeStructure) {
            // Add function nodes
            for (const func of codeStructure.functions) {
              const funcNode: any = {
                id: `function:${file.path}:${func.name}`,
                type: 'function',
                name: func.name,
                path: file.path,
                metadata: {
                  startLine: func.startLine,
                  endLine: func.endLine,
                  parameters: func.parameters,
                  returnType: func.returnType,
                  parentFile: file.path
                },
                confidence: 0.8,
                lastUpdated: new Date(),
                properties: {
                  language: this.detectLanguage(file),
                  parameterCount: func.parameters.length
                }
              };

              this.storage.addNode(funcNode);
              this.addContainsEdge(fileNode.id, funcNode.id);
            }

            // Add class nodes
            for (const cls of codeStructure.classes) {
              const classNode: any = {
                id: `class:${file.path}:${cls.name}`,
                type: 'class',
                name: cls.name,
                path: file.path,
                metadata: {
                  startLine: cls.startLine,
                  endLine: cls.endLine,
                  methods: cls.methods,
                  properties: cls.properties,
                  parentFile: file.path
                },
                confidence: 0.8,
                lastUpdated: new Date(),
                properties: {
                  language: this.detectLanguage(file),
                  methodCount: cls.methods.length,
                  propertyCount: cls.properties.length
                }
              };

              this.storage.addNode(classNode);
              this.addContainsEdge(fileNode.id, classNode.id);
            }

            // Detect frameworks and patterns
            const frameworks = await this.codeAnalyzer.detectFrameworks(filePath, codeStructure);
            const patterns = await this.codeAnalyzer.analyzePatterns(filePath, codeStructure);

            // Update file metadata with code structure info
            fileNode.metadata.codeStructure = {
              functionCount: codeStructure.functions.length,
              classCount: codeStructure.classes.length,
              importCount: codeStructure.imports.length,
              exportCount: codeStructure.exports.length,
              frameworks,
              patterns: patterns.length
            };

            // Update properties with detected frameworks
            if (frameworks.length > 0) {
              if (fileNode.properties) {
                fileNode.properties.framework = frameworks.join(', ');
              }
            }

            // Create pattern nodes for significant patterns
            for (const pattern of patterns) {
              if (pattern.severity === 'warning' || pattern.type === 'design_pattern') {
                const patternNode: any = {
                  id: `pattern:${file.path}:${pattern.type}:${Date.now()}`,
                  type: 'pattern',
                  name: pattern.description,
                  path: file.path,
                  metadata: {
                    patternType: pattern.type,
                    severity: pattern.severity,
                    details: pattern,
                    parentFile: file.path
                  },
                  confidence: pattern.severity === 'warning' ? 0.7 : 0.6,
                  lastUpdated: new Date(),
                  properties: {
                    language: this.detectLanguage(file),
                    category: pattern.type
                  }
                };

                this.storage.addNode(patternNode);
                this.addRelatesEdge(fileNode.id, patternNode.id, pattern.type);
              }
            }

            // Add import relationships
            for (const imp of codeStructure.imports) {
              // Create dependency edges for relative imports
              if (imp.module.startsWith('./') || imp.module.startsWith('../')) {
                const resolvedModule = this.resolveImportPath(file.path, imp.module);
                if (resolvedModule) {
                  const targetFileId = `file:${resolvedModule}`;
                  this.addDependsOnEdge(fileNode.id, targetFileId, imp.type);
                }
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to analyze code structure for ${file.path}:`, error);
        }
      }
    }

    graph.lastScan = new Date();
    await this.storage.save();

    console.log(`Scanned ${files.length} files and created ${directoryNodes.size} directories`);
  }

  // Helper methods copied from MindMapEngine
  private async getFilePaths(): Promise<string[]> {
    return await this.scanner.getFilePaths();
  }

  private addContainsEdge(parentId: string, childId: string): void {
    const edge = {
      id: `edge:contains:${parentId}:${childId}`,
      source: parentId,
      target: childId,
      type: 'contains' as const,
      properties: { relationship: 'contains' },
      metadata: { createdAt: new Date() },
      weight: 1.0,
      confidence: 0.9
    };
    this.storage.addEdge(edge);
  }

  private detectLanguage(file: any): string | undefined {
    const extension = file.extension?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'cc': 'cpp',
      'c': 'c',
      'h': 'c',
      'hpp': 'cpp',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'rb': 'ruby',
      'php': 'php',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala'
    };

    return extension ? languageMap[extension] : undefined;
  }

  private detectFramework(file: any): string | undefined {
    const filename = file.name.toLowerCase();
    const path = file.path.toLowerCase();

    if (filename.includes('react') || path.includes('react')) return 'React';
    if (filename.includes('vue') || path.includes('vue')) return 'Vue.js';
    if (filename.includes('angular') || path.includes('angular')) return 'Angular';
    if (filename.includes('express') || path.includes('express')) return 'Express.js';
    if (filename.includes('django') || path.includes('django')) return 'Django';
    if (filename.includes('flask') || path.includes('flask')) return 'Flask';
    if (filename.includes('spring') || path.includes('spring')) return 'Spring';

    return undefined;
  }

  private addDependsOnEdge(sourceId: string, targetId: string, importType: string): void {
    const edge = {
      id: `edge:depends_on:${sourceId}:${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'depends_on' as const,
      properties: {
        relationship: 'depends_on',
        importType: importType
      },
      metadata: { createdAt: new Date() },
      weight: 0.8,
      confidence: 0.8
    };
    this.storage.addEdge(edge);
  }

  private addRelatesEdge(sourceId: string, targetId: string, relationshipType: string): void {
    const edge = {
      id: `edge:relates:${sourceId}:${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'relates_to' as const,
      properties: {
        relationship: 'relates_to',
        relationshipType: relationshipType
      },
      metadata: { createdAt: new Date() },
      weight: 0.6,
      confidence: 0.7
    };
    this.storage.addEdge(edge);
  }

  private resolveImportPath(currentFile: string, importPath: string): string | null {
    // Simple resolution logic - could be enhanced
    if (importPath.startsWith('./')) {
      const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'));
      return `${currentDir}/${importPath.substring(2)}`;
    } else if (importPath.startsWith('../')) {
      const pathParts = currentFile.split('/');
      let upLevels = 0;
      let remainingPath = importPath;

      while (remainingPath.startsWith('../')) {
        upLevels++;
        remainingPath = remainingPath.substring(3);
      }

      if (upLevels < pathParts.length - 1) {
        const basePath = pathParts.slice(0, pathParts.length - 1 - upLevels).join('/');
        return `${basePath}/${remainingPath}`;
      }
    }

    return null;
  }

  private onProgressUpdate(progress: ProcessingProgress): void {
    const percentage = progress.totalFiles > 0 ? (progress.filesProcessed / progress.totalFiles * 100) : 0;

    if (progress.currentChunk) {
      console.log(`📊 Processing: ${progress.filesProcessed}/${progress.totalFiles} files (${percentage.toFixed(1)}%)`);
    } else {
      console.log(`🔍 Progress: ${progress.completedChunks}/${progress.totalChunks} chunks, ${progress.filesProcessed}/${progress.totalFiles} files (${percentage.toFixed(1)}%)`);
    }
  }

  // Helper method to extract basic structure from CallPatternAnalyzer results
  private extractBasicStructureFromCallPattern(callPatternResult: any): any {
    const functions = Array.from(callPatternResult.callGraph.nodes.values()).map((node: any) => ({
      name: node.name,
      startLine: node.lineNumber,
      endLine: node.lineNumber + 10, // Approximation
      parameters: [],
      returnType: undefined
    }));

    return {
      functions,
      classes: [], // CallPatternAnalyzer doesn't return classes in the same format
      imports: [],
      exports: []
    };
  }

  // Helper method to add CallPatternAnalyzer nodes and edges to storage
  private addCallPatternNodesToStorage(callPatternResult: any, filePath: string): void {
    try {
      let variableNodeCount = 0;
      let functionNodeCount = 0;
      let usageEdgeCount = 0;
      let callEdgeCount = 0;

      // Add all nodes from CallPatternAnalyzer (includes variables, functions, etc.)
      for (const node of callPatternResult.nodes) {
        this.storage.addNode({
          ...node,
          lastUpdated: new Date()
        });

        // Count node types
        if (node.type === 'variable') variableNodeCount++;
        if (node.type === 'function') functionNodeCount++;
      }

      // Add all edges from CallPatternAnalyzer (includes variable usage, calls, etc.)
      for (const edge of callPatternResult.edges) {
        this.storage.addEdge({
          ...edge,
          lastUpdated: new Date()
        });

        // Count edge types
        if (edge.type === 'used_by') usageEdgeCount++;
        if (edge.type === 'calls') callEdgeCount++;
      }

      console.log(`✅ Added enhanced nodes for ${filePath}:`);
      console.log(`   📊 Variables: ${variableNodeCount}, Functions: ${functionNodeCount}`);
      console.log(`   🔗 Usage edges: ${usageEdgeCount}, Call edges: ${callEdgeCount}`);
    } catch (error) {
      console.warn(`⚠️ Failed to add CallPatternAnalyzer results for ${filePath}:`, error);
    }
  }
}