import { readdir, stat } from 'fs/promises';
import { join, extname, basename, relative } from 'path';
import fastGlob from 'fast-glob';
import { FileInfo } from '../types/index.js';

export class FileScanner {
  private projectRoot: string;
  private ignorePatterns: string[];
  private maxDepth: number;

  constructor(projectRoot: string, options?: {
    ignorePatterns?: string[];
    maxDepth?: number;
  }) {
    this.projectRoot = projectRoot;
    this.ignorePatterns = options?.ignorePatterns || [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      '*.log',
      '.env*',
      'coverage/**',
      '.nyc_output/**',
      '**/*.min.js',
      '**/*.map',
      '.DS_Store',
      'Thumbs.db'
    ];
    this.maxDepth = options?.maxDepth || 10;
  }

  async scanProject(): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    
    try {
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

    return files.sort((a, b) => a.path.localeCompare(b.path));
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