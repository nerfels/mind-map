import { readdir, stat, readFile } from 'fs/promises';
import { join, extname, basename, relative, resolve } from 'path';
import fastGlob from 'fast-glob';
import { FileInfo } from '../types/index.js';

export interface FileScannerOptions {
  ignorePatterns?: string[];
  maxDepth?: number;
  useGitignore?: boolean;
  useMindMapIgnore?: boolean;
  customIgnoreFiles?: string[];
}

export interface IgnorePatternStats {
  totalPatterns: number;
  sourceBreakdown: {
    defaults: number;
    custom: number;
    gitignore: number;
    mindmapignore: number;
    customFiles: number;
  };
  filesIgnored: number;
  scanTimeReduction: number;
}

export class FileScanner {
  private projectRoot: string;
  private ignorePatterns: string[];
  private maxDepth: number;
  private options: FileScannerOptions;
  private patternStats: IgnorePatternStats;

  constructor(projectRoot: string, options?: FileScannerOptions) {
    this.projectRoot = projectRoot;
    this.options = {
      useGitignore: true,
      useMindMapIgnore: true,
      customIgnoreFiles: [],
      ...options
    };
    this.maxDepth = options?.maxDepth || 10;
    this.patternStats = this.initializeStats();

    // Initialize patterns - will be loaded async during scan
    this.ignorePatterns = [];
  }

  private initializeStats(): IgnorePatternStats {
    return {
      totalPatterns: 0,
      sourceBreakdown: {
        defaults: 0,
        custom: 0,
        gitignore: 0,
        mindmapignore: 0,
        customFiles: 0
      },
      filesIgnored: 0,
      scanTimeReduction: 0
    };
  }

  private getDefaultIgnorePatterns(): string[] {
    return [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      'target/**',
      'out/**',
      'bin/**',
      '*.log',
      '.env*',
      'coverage/**',
      '.nyc_output/**',
      '**/*.min.js',
      '**/*.map',
      '.DS_Store',
      'Thumbs.db',
      '**/.pytest_cache/**',
      '**/__pycache__/**',
      '**/*.pyc',
      '**/*.pyo',
      '**/*.class',
      '**/*.o',
      '**/*.obj',
      '**/*.exe',
      '**/*.dll',
      '**/*.so',
      '.vscode/**',
      '.idea/**',
      '*.swp',
      '*.swo',
      '*~'
    ];
  }

  private async loadIgnorePatterns(): Promise<string[]> {
    const startTime = Date.now();
    const patterns: string[] = [];
    this.patternStats = this.initializeStats();

    // 1. Load default patterns (lowest precedence)
    const defaultPatterns = this.getDefaultIgnorePatterns();
    patterns.push(...defaultPatterns);
    this.patternStats.sourceBreakdown.defaults = defaultPatterns.length;

    // 2. Load .gitignore patterns
    if (this.options.useGitignore) {
      const gitignorePatterns = await this.loadGitignorePatterns();
      patterns.push(...gitignorePatterns);
      this.patternStats.sourceBreakdown.gitignore = gitignorePatterns.length;
    }

    // 3. Load .mindmapignore patterns
    if (this.options.useMindMapIgnore) {
      const mindmapIgnorePatterns = await this.loadMindMapIgnorePatterns();
      patterns.push(...mindmapIgnorePatterns);
      this.patternStats.sourceBreakdown.mindmapignore = mindmapIgnorePatterns.length;
    }

    // 4. Load custom ignore files
    if (this.options.customIgnoreFiles?.length) {
      const customFilePatterns = await this.loadCustomIgnoreFiles();
      patterns.push(...customFilePatterns);
      this.patternStats.sourceBreakdown.customFiles = customFilePatterns.length;
    }

    // 5. Load user-provided patterns (highest precedence)
    if (this.options.ignorePatterns?.length) {
      patterns.push(...this.options.ignorePatterns);
      this.patternStats.sourceBreakdown.custom = this.options.ignorePatterns.length;
    }

    // Remove duplicates while preserving order (higher precedence patterns first)
    const uniquePatterns = [...new Set(patterns.reverse())].reverse();
    this.patternStats.totalPatterns = uniquePatterns.length;
    this.patternStats.scanTimeReduction = Date.now() - startTime;

    return uniquePatterns;
  }

  private async loadGitignorePatterns(): Promise<string[]> {
    try {
      const gitignorePath = join(this.projectRoot, '.gitignore');
      const content = await readFile(gitignorePath, 'utf-8');
      return this.parseIgnoreFileContent(content, '.gitignore');
    } catch (error) {
      // .gitignore file doesn't exist or can't be read
      return [];
    }
  }

  private async loadMindMapIgnorePatterns(): Promise<string[]> {
    try {
      const mindmapIgnorePath = join(this.projectRoot, '.mindmapignore');
      const content = await readFile(mindmapIgnorePath, 'utf-8');
      return this.parseIgnoreFileContent(content, '.mindmapignore');
    } catch (error) {
      // .mindmapignore file doesn't exist or can't be read
      return [];
    }
  }

  private async loadCustomIgnoreFiles(): Promise<string[]> {
    const patterns: string[] = [];

    for (const filePath of this.options.customIgnoreFiles || []) {
      try {
        const fullPath = resolve(this.projectRoot, filePath);
        const content = await readFile(fullPath, 'utf-8');
        const filePatterns = this.parseIgnoreFileContent(content, filePath);
        patterns.push(...filePatterns);
      } catch (error) {
        console.warn(`Failed to load custom ignore file ${filePath}:`, error);
      }
    }

    return patterns;
  }

  private parseIgnoreFileContent(content: string, sourceFile: string): string[] {
    const patterns: string[] = [];
    const lines = content.split('\n');

    for (let line of lines) {
      // Remove comments and trim whitespace
      line = line.split('#')[0].trim();

      // Skip empty lines
      if (!line) continue;

      // Handle negation patterns (lines starting with !)
      if (line.startsWith('!')) {
        // For now, we'll skip negation patterns as fastGlob has limited support
        // TODO: Implement negation pattern handling
        console.debug(`Skipping negation pattern in ${sourceFile}: ${line}`);
        continue;
      }

      // Convert gitignore patterns to fastGlob patterns
      let pattern = line;

      // Handle directory patterns (ending with /)
      if (pattern.endsWith('/')) {
        pattern = pattern.slice(0, -1) + '/**';
      }

      // Handle patterns without wildcards that should match directories
      if (!pattern.includes('*') && !pattern.includes('/')) {
        patterns.push(pattern); // Match files
        patterns.push(pattern + '/**'); // Match directories
      } else {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  async scanProject(): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    const scanStartTime = Date.now();

    try {
      // Load ignore patterns from all sources
      this.ignorePatterns = await this.loadIgnorePatterns();

      const allFiles = await fastGlob('**/*', {
        cwd: this.projectRoot,
        ignore: this.ignorePatterns,
        absolute: false,
        onlyFiles: false,
        markDirectories: true,
        dot: true
      });

      for (const filePath of allFiles) {
        const fullPath = join(this.projectRoot, filePath);
        const relativePath = relative(this.projectRoot, fullPath);
        
        try {
          const stats = await stat(fullPath);
          // More reliable directory detection
          const isDirectory = stats.isDirectory();
          
          const fileInfo: FileInfo = {
            path: relativePath,
            name: basename(filePath.replace(/\/$/, '')), // Remove trailing slash
            type: isDirectory ? 'directory' : 'file',
            size: isDirectory ? 0 : stats.size,
            extension: isDirectory ? undefined : extname(filePath).slice(1),
            lastModified: stats.mtime,
            isIgnored: false
          };

          if (!isDirectory && fileInfo.extension) {
            fileInfo.mimeType = this.getMimeType(fileInfo.extension);
          }

          files.push(fileInfo);
        } catch (error) {
          console.warn(`Failed to stat ${fullPath}:`, error);
          // Continue processing other files instead of failing completely
        }
      }
    } catch (error) {
      console.error('Failed to scan project:', error);
    }

    // Update statistics
    const totalScanTime = Date.now() - scanStartTime;
    this.patternStats.scanTimeReduction = totalScanTime;

    return files.sort((a, b) => a.path.localeCompare(b.path));
  }

  /**
   * Get file paths only (for parallel processing)
   */
  async getFilePaths(): Promise<string[]> {
    try {
      // Ensure patterns are loaded
      if (this.ignorePatterns.length === 0) {
        this.ignorePatterns = await this.loadIgnorePatterns();
      }

      return await fastGlob('**/*', {
        cwd: this.projectRoot,
        ignore: this.ignorePatterns,
        absolute: false,
        onlyFiles: true,  // Only files, not directories for processing
        dot: true
      });
    } catch (error) {
      console.error('Error getting file paths:', error);
      throw new Error(`Failed to get file paths: ${error}`);
    }
  }

  /**
   * Update ignore patterns and reload configuration
   */
  async updateIgnorePatterns(customPatterns?: string[]): Promise<void> {
    if (customPatterns) {
      this.options.ignorePatterns = customPatterns;
    }
    this.ignorePatterns = await this.loadIgnorePatterns();
  }

  /**
   * Test ignore patterns against sample files
   */
  async testIgnorePatterns(patterns: string[], samplePaths?: string[]): Promise<{
    matched: string[];
    ignored: string[];
    performance: number;
  }> {
    const startTime = Date.now();

    // Use provided sample paths or scan for real files
    let testPaths = samplePaths;
    if (!testPaths) {
      // Get a sample of files from the project (first 100)
      const allFiles = await fastGlob('**/*', {
        cwd: this.projectRoot,
        ignore: [], // Don't ignore anything for testing
        absolute: false,
        onlyFiles: true,
        dot: true
      });
      testPaths = allFiles.slice(0, 100);
    }

    const matched: string[] = [];
    const ignored: string[] = [];

    for (const path of testPaths) {
      const isIgnored = patterns.some(pattern => {
        // Simple glob pattern matching (could be enhanced)
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        return regex.test(path);
      });

      if (isIgnored) {
        ignored.push(path);
      } else {
        matched.push(path);
      }
    }

    const performance = Date.now() - startTime;

    return {
      matched,
      ignored,
      performance
    };
  }

  /**
   * Get ignore pattern statistics
   */
  getIgnorePatternStats(): IgnorePatternStats {
    return { ...this.patternStats };
  }

  /**
   * Get currently active ignore patterns
   */
  getActiveIgnorePatterns(): string[] {
    return [...this.ignorePatterns];
  }

  /**
   * Create a .mindmapignore file with specified patterns
   */
  async createMindMapIgnoreFile(patterns: string[]): Promise<void> {
    const mindmapIgnorePath = join(this.projectRoot, '.mindmapignore');
    const content = [
      '# Mind Map Ignore Patterns',
      '# This file specifies patterns for files and directories that should be ignored by the mind map scanner',
      '# Syntax follows .gitignore conventions',
      '',
      ...patterns.map(pattern => pattern.trim()).filter(Boolean)
    ].join('\n');

    try {
      await import('fs/promises').then(fs => fs.writeFile(mindmapIgnorePath, content, 'utf-8'));
      console.log(`Created .mindmapignore file with ${patterns.length} patterns`);
    } catch (error) {
      console.error('Failed to create .mindmapignore file:', error);
      throw new Error(`Failed to create .mindmapignore file: ${error}`);
    }
  }

  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'jsx': 'application/javascript',
      'tsx': 'application/typescript',
      'json': 'application/json',
      'md': 'text/markdown',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'py': 'text/x-python',
      'java': 'text/x-java',
      'go': 'text/x-go',
      'rs': 'text/x-rust',
      'cpp': 'text/x-c++',
      'c': 'text/x-c',
      'h': 'text/x-c',
      'hpp': 'text/x-c++',
      'php': 'text/x-php',
      'rb': 'text/x-ruby',
      'sh': 'application/x-sh',
      'yml': 'application/x-yaml',
      'yaml': 'application/x-yaml',
      'xml': 'application/xml',
      'svg': 'image/svg+xml'
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  isCodeFile(fileInfo: FileInfo): boolean {
    if (fileInfo.type === 'directory') return false;
    
    const codeExtensions = [
      'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'go', 'rs', 'cpp', 'c', 'h', 'hpp',
      'php', 'rb', 'sh', 'cs', 'swift', 'kt', 'scala', 'clj', 'hs', 'ml', 'fs',
      'vue', 'svelte', 'astro'
    ];
    
    return codeExtensions.includes(fileInfo.extension || '');
  }

  isConfigFile(fileInfo: FileInfo): boolean {
    if (fileInfo.type === 'directory') return false;
    
    const configExtensions = ['json', 'yml', 'yaml', 'toml', 'ini', 'conf'];
    const configNames = [
      'package.json', 'tsconfig.json', 'webpack.config.js', 'vite.config.js',
      'rollup.config.js', 'babel.config.js', '.eslintrc', 'prettier.config.js',
      'jest.config.js', 'vitest.config.js', 'tailwind.config.js', 'next.config.js',
      'nuxt.config.js', 'vue.config.js', 'angular.json', 'cargo.toml', 'go.mod',
      'requirements.txt', 'setup.py', 'pom.xml', 'build.gradle', 'Dockerfile',
      '.gitignore', '.dockerignore', 'readme.md', 'license'
    ];
    
    return configExtensions.includes(fileInfo.extension || '') ||
           configNames.some(name => fileInfo.name.toLowerCase().includes(name.toLowerCase()));
  }

  isTestFile(fileInfo: FileInfo): boolean {
    if (fileInfo.type === 'directory') return false;
    
    const testPatterns = [
      /\.test\./,
      /\.spec\./,
      /__tests__\//,
      /test\//,
      /tests\//,
      /spec\//
    ];
    
    return testPatterns.some(pattern => pattern.test(fileInfo.path));
  }

  async getFilesByPattern(pattern: string): Promise<FileInfo[]> {
    try {
      const files = await fastGlob(pattern, {
        cwd: this.projectRoot,
        ignore: this.ignorePatterns,
        absolute: false
      });

      const fileInfos: FileInfo[] = [];
      for (const filePath of files) {
        const fullPath = join(this.projectRoot, filePath);
        const stats = await stat(fullPath);
        
        fileInfos.push({
          path: relative(this.projectRoot, fullPath),
          name: basename(filePath),
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          extension: stats.isDirectory() ? undefined : extname(filePath).slice(1),
          lastModified: stats.mtime,
          isIgnored: false
        });
      }

      return fileInfos;
    } catch (error) {
      console.error('Failed to get files by pattern:', error);
      return [];
    }
  }
}