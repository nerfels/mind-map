import { readFile, access } from 'fs/promises';
import { execSync, exec } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import { LanguageTooling, ToolingInfo, ToolResult, ToolIssue, ToolingRecommendation } from '../LanguageToolingDetector.js';

const execAsync = promisify(exec);

export class CppTooling implements LanguageTooling {
  language = 'cpp';

  async detectTools(projectRoot: string): Promise<ToolingInfo[]> {
    const tools: ToolingInfo[] = [];

    // GCC/G++ - Compilers
    const gccAvailable = await this.isToolAvailable('gcc');
    const gppAvailable = await this.isToolAvailable('g++');
    
    if (gccAvailable) {
      tools.push({
        name: 'gcc',
        type: 'build',
        command: 'gcc',
        available: true,
        description: 'GNU C Compiler',
        language: 'cpp',
        priority: 9
      });
    }

    if (gppAvailable) {
      tools.push({
        name: 'g++',
        type: 'build',
        command: 'g++',
        available: true,
        description: 'GNU C++ Compiler',
        language: 'cpp',
        priority: 9
      });
    }

    // Clang/Clang++ - Alternative compilers
    const clangAvailable = await this.isToolAvailable('clang');
    const clangppAvailable = await this.isToolAvailable('clang++');
    
    if (clangAvailable) {
      tools.push({
        name: 'clang',
        type: 'build',
        command: 'clang',
        available: true,
        description: 'LLVM C Compiler',
        language: 'cpp',
        priority: 8
      });
    }

    if (clangppAvailable) {
      tools.push({
        name: 'clang++',
        type: 'build',
        command: 'clang++',
        available: true,
        description: 'LLVM C++ Compiler',
        language: 'cpp',
        priority: 8
      });
    }

    // Make - Build system
    const makeAvailable = await this.isToolAvailable('make');
    const makefileExists = await this.findConfigFile(projectRoot, ['Makefile', 'makefile', 'GNUmakefile']);
    tools.push({
      name: 'make',
      type: 'build',
      configFile: makefileExists,
      command: 'make',
      available: makeAvailable && !!makefileExists,
      description: 'GNU Make build system',
      language: 'cpp',
      priority: 10
    });

    // CMake - Modern build system
    const cmakeAvailable = await this.isToolAvailable('cmake');
    const cmakeConfig = await this.findConfigFile(projectRoot, ['CMakeLists.txt']);
    tools.push({
      name: 'cmake',
      type: 'build',
      configFile: cmakeConfig,
      command: 'cmake',
      available: cmakeAvailable && !!cmakeConfig,
      description: 'Cross-platform build system',
      language: 'cpp',
      priority: 10
    });

    // CppCheck - Static analysis
    const cppcheckAvailable = await this.isToolAvailable('cppcheck');
    tools.push({
      name: 'cppcheck',
      type: 'lint',
      command: 'cppcheck',
      available: cppcheckAvailable,
      description: 'C/C++ static analysis tool',
      language: 'cpp',
      priority: 8
    });

    // Clang-tidy - Linter and static analyzer
    const clangTidyAvailable = await this.isToolAvailable('clang-tidy');
    const clangTidyConfig = await this.findConfigFile(projectRoot, ['.clang-tidy']);
    tools.push({
      name: 'clang-tidy',
      type: 'lint',
      configFile: clangTidyConfig,
      command: 'clang-tidy',
      available: clangTidyAvailable,
      description: 'Clang-based C++ linter',
      language: 'cpp',
      priority: 8
    });

    // Clang-format - Code formatter
    const clangFormatAvailable = await this.isToolAvailable('clang-format');
    const clangFormatConfig = await this.findConfigFile(projectRoot, ['.clang-format']);
    tools.push({
      name: 'clang-format',
      type: 'format',
      configFile: clangFormatConfig,
      command: 'clang-format',
      available: clangFormatAvailable,
      description: 'C/C++ code formatter',
      language: 'cpp',
      priority: 7
    });

    // Valgrind - Memory error detector
    const valgrindAvailable = await this.isToolAvailable('valgrind');
    tools.push({
      name: 'valgrind',
      type: 'security',
      command: 'valgrind',
      available: valgrindAvailable,
      description: 'Memory error and leak detector',
      language: 'cpp',
      priority: 8
    });

    // AddressSanitizer (ASan) - Built into GCC/Clang
    tools.push({
      name: 'asan',
      type: 'security',
      command: 'g++ -fsanitize=address',
      available: gppAvailable || clangppAvailable,
      description: 'AddressSanitizer for memory error detection',
      language: 'cpp',
      priority: 7
    });

    // GTest - Testing framework detection
    const gtestAvailable = await this.hasGTestInProject(projectRoot);
    tools.push({
      name: 'gtest',
      type: 'test',
      command: 'make test',
      available: gtestAvailable,
      description: 'Google Test framework',
      language: 'cpp',
      priority: 8
    });

    // Catch2 - Testing framework detection
    const catch2Available = await this.hasCatch2InProject(projectRoot);
    tools.push({
      name: 'catch2',
      type: 'test',
      command: 'make test',
      available: catch2Available,
      description: 'Catch2 testing framework',
      language: 'cpp',
      priority: 7
    });

    // PC-lint/PC-lint Plus - Commercial static analyzer
    const pclintAvailable = await this.isToolAvailable('pclp64');
    tools.push({
      name: 'pc-lint',
      type: 'lint',
      command: 'pclp64',
      available: pclintAvailable,
      description: 'PC-lint Plus static analyzer',
      language: 'cpp',
      priority: 6
    });

    // Gcov - Coverage tool
    const gcovAvailable = await this.isToolAvailable('gcov');
    tools.push({
      name: 'gcov',
      type: 'coverage',
      command: 'gcov',
      available: gcovAvailable,
      description: 'GCC code coverage tool',
      language: 'cpp',
      priority: 6
    });

    // LCOV - Coverage reporting
    const lcovAvailable = await this.isToolAvailable('lcov');
    tools.push({
      name: 'lcov',
      type: 'coverage',
      command: 'lcov',
      available: lcovAvailable,
      description: 'LCOV code coverage reporting',
      language: 'cpp',
      priority: 6
    });

    // Doxygen - Documentation generator
    const doxygenAvailable = await this.isToolAvailable('doxygen');
    const doxygenConfig = await this.findConfigFile(projectRoot, ['Doxyfile', 'doxygen.conf']);
    tools.push({
      name: 'doxygen',
      type: 'build',
      configFile: doxygenConfig,
      command: 'doxygen',
      available: doxygenAvailable && !!doxygenConfig,
      description: 'C++ documentation generator',
      language: 'cpp',
      priority: 4
    });

    // Add version info for available tools
    for (const tool of tools) {
      if (tool.available) {
        try {
          tool.version = await this.getToolVersion(tool.name);
        } catch {
          // Version detection failed, continue
        }
      }
    }

    return tools;
  }

  async runTool(tool: ToolingInfo, projectRoot: string, args: string[] = []): Promise<ToolResult> {
    const startTime = Date.now();
    let command = tool.command;
    let fullArgs = args;

    // Tool-specific argument handling
    switch (tool.name) {
      case 'gcc':
      case 'g++':
        if (args.length === 0) {
          fullArgs = ['-Wall', '-Wextra', '-std=c++17', '-c', '*.cpp'];
        }
        command = `${tool.command} ${fullArgs.join(' ')}`;
        break;
      
      case 'clang':
      case 'clang++':
        if (args.length === 0) {
          fullArgs = ['-Wall', '-Wextra', '-std=c++17', '-c', '*.cpp'];
        }
        command = `${tool.command} ${fullArgs.join(' ')}`;
        break;
      
      case 'make':
        if (args.length === 0) {
          fullArgs = ['all'];
        }
        command = `make ${fullArgs.join(' ')}`;
        break;
      
      case 'cmake':
        if (args.length === 0) {
          fullArgs = ['--build', '.'];
        }
        command = `cmake ${fullArgs.join(' ')}`;
        break;
      
      case 'cppcheck':
        if (args.length === 0) {
          fullArgs = ['--enable=all', '--std=c++17', '--suppress=missingIncludeSystem', '.'];
        }
        command = `cppcheck ${fullArgs.join(' ')}`;
        break;
      
      case 'clang-tidy':
        if (args.length === 0) {
          fullArgs = ['*.cpp', '--', '-std=c++17'];
        }
        command = `clang-tidy ${fullArgs.join(' ')}`;
        break;
      
      case 'clang-format':
        if (args.length === 0) {
          fullArgs = ['-style=file', '--dry-run', '*.cpp', '*.h'];
        }
        command = `clang-format ${fullArgs.join(' ')}`;
        break;
      
      case 'valgrind':
        if (args.length === 0) {
          fullArgs = ['--tool=memcheck', '--leak-check=full', './a.out'];
        }
        command = `valgrind ${fullArgs.join(' ')}`;
        break;
      
      case 'asan':
        if (args.length === 0) {
          fullArgs = ['-fsanitize=address', '-g', '*.cpp', '-o', 'test_asan'];
        }
        const compiler = await this.isToolAvailable('clang++') ? 'clang++' : 'g++';
        command = `${compiler} ${fullArgs.join(' ')}`;
        break;
      
      case 'gtest':
      case 'catch2':
        if (args.length === 0) {
          fullArgs = ['test'];
        }
        command = `make ${fullArgs.join(' ')}`;
        break;
      
      case 'gcov':
        if (args.length === 0) {
          fullArgs = ['*.cpp'];
        }
        command = `gcov ${fullArgs.join(' ')}`;
        break;
      
      case 'lcov':
        if (args.length === 0) {
          fullArgs = ['--capture', '--directory', '.', '--output-file', 'coverage.info'];
        }
        command = `lcov ${fullArgs.join(' ')}`;
        break;
      
      case 'doxygen':
        if (args.length === 0 && tool.configFile) {
          fullArgs = [tool.configFile];
        }
        command = `doxygen ${fullArgs.join(' ')}`;
        break;
      
      default:
        command = `${tool.command} ${fullArgs.join(' ')}`;
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectRoot,
        timeout: 120000 // 2 minute timeout for C++ builds
      });

      const result: ToolResult = {
        tool: tool.name,
        success: true,
        exitCode: 0,
        stdout,
        stderr,
        duration: Date.now() - startTime,
        issues: this.parseToolOutput(tool.name, stdout, stderr, projectRoot)
      };

      return result;
    } catch (error: any) {
      const result: ToolResult = {
        tool: tool.name,
        success: false,
        exitCode: error.code || -1,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message || '',
        duration: Date.now() - startTime,
        issues: this.parseToolOutput(tool.name, error.stdout || '', error.stderr || error.message || '', projectRoot)
      };

      return result;
    }
  }

  getRecommendations(availableTools: ToolingInfo[]): ToolingRecommendation[] {
    const recommendations: ToolingRecommendation[] = [];
    const availableNames = new Set(availableTools.filter(t => t.available).map(t => t.name));

    // Build system recommendations
    if (!availableNames.has('make') && !availableNames.has('cmake')) {
      recommendations.push({
        tool: 'cmake',
        reason: 'Modern, cross-platform build system for C++ projects',
        priority: 'high',
        installCommand: 'apt-get install cmake  # or brew install cmake',
        configExample: `# CMakeLists.txt
cmake_minimum_required(VERSION 3.10)
project(MyProject)

set(CMAKE_CXX_STANDARD 17)
add_executable(myapp main.cpp)`
      });
    }

    // Static analysis
    if (!availableNames.has('cppcheck') && !availableNames.has('clang-tidy')) {
      recommendations.push({
        tool: 'cppcheck',
        reason: 'Essential static analysis tool for finding bugs and undefined behavior',
        priority: 'high',
        installCommand: 'apt-get install cppcheck  # or brew install cppcheck',
        configExample: '# Run: cppcheck --enable=all --std=c++17 src/'
      });
    }

    // Code formatting
    if (!availableNames.has('clang-format')) {
      recommendations.push({
        tool: 'clang-format',
        reason: 'Consistent code formatting for C++ projects',
        priority: 'high',
        installCommand: 'apt-get install clang-format  # or brew install clang-format',
        configExample: `# .clang-format
BasedOnStyle: Google
IndentWidth: 4
ColumnLimit: 100`
      });
    }

    // Memory debugging
    if (!availableNames.has('valgrind') && !availableNames.has('asan')) {
      recommendations.push({
        tool: 'valgrind',
        reason: 'Essential for detecting memory leaks and errors in C++ programs',
        priority: 'high',
        installCommand: 'apt-get install valgrind  # Linux only',
        configExample: '# Run: valgrind --tool=memcheck --leak-check=full ./myprogram'
      });
    }

    // Testing framework
    if (!availableNames.has('gtest') && !availableNames.has('catch2')) {
      recommendations.push({
        tool: 'gtest',
        reason: 'Popular unit testing framework for C++',
        priority: 'medium',
        installCommand: 'apt-get install libgtest-dev  # or brew install googletest',
        configExample: `// test.cpp
#include <gtest/gtest.h>
TEST(TestSuite, TestCase) {
  EXPECT_EQ(1, 1);
}`
      });
    }

    // Advanced linting
    if (availableNames.has('clang') && !availableNames.has('clang-tidy')) {
      recommendations.push({
        tool: 'clang-tidy',
        reason: 'Advanced linter with modernization and bug-finding capabilities',
        priority: 'medium',
        installCommand: 'apt-get install clang-tidy  # or brew install llvm',
        configExample: `# .clang-tidy
Checks: 'readability-*,modernize-*,performance-*'
HeaderFilterRegex: '.*'`
      });
    }

    // Code coverage
    if (!availableNames.has('gcov') && !availableNames.has('lcov')) {
      recommendations.push({
        tool: 'lcov',
        reason: 'Code coverage reporting for C++ projects',
        priority: 'low',
        installCommand: 'apt-get install lcov  # or brew install lcov',
        configExample: '# Compile with: g++ -fprofile-arcs -ftest-coverage'
      });
    }

    return recommendations;
  }

  private async isToolAvailable(toolName: string): Promise<boolean> {
    try {
      let checkCommand = `${toolName} --version`;
      if (toolName === 'make') checkCommand = 'make --version';
      
      execSync(checkCommand, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private async getToolVersion(toolName: string): Promise<string> {
    try {
      let versionCommand = `${toolName} --version`;
      
      const { stdout } = await execAsync(versionCommand);
      
      // Parse version from various C++ tool outputs
      const versionMatch = stdout.match(/(\d+\.\d+(?:\.\d+)?)/);
      return versionMatch ? versionMatch[1] : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private async findConfigFile(projectRoot: string, configFiles: string[]): Promise<string | undefined> {
    for (const configFile of configFiles) {
      try {
        const configPath = join(projectRoot, configFile);
        await access(configPath);
        return configPath;
      } catch {
        // Config file doesn't exist, try next
      }
    }
    return undefined;
  }

  private async hasGTestInProject(projectRoot: string): Promise<boolean> {
    try {
      // Check for GTest in CMakeLists.txt or source files
      const cmakePath = join(projectRoot, 'CMakeLists.txt');
      const cmakeContent = await readFile(cmakePath, 'utf-8');
      if (cmakeContent.includes('gtest') || cmakeContent.includes('GTest')) return true;
    } catch {}

    try {
      // Look for GTest includes in source files
      const files = await this.findCppFiles(projectRoot);
      for (const file of files) {
        const content = await readFile(file, 'utf-8');
        if (content.includes('#include <gtest/gtest.h>') || content.includes('#include "gtest/gtest.h"')) {
          return true;
        }
      }
    } catch {}

    return false;
  }

  private async hasCatch2InProject(projectRoot: string): Promise<boolean> {
    try {
      // Look for Catch2 includes in source files
      const files = await this.findCppFiles(projectRoot);
      for (const file of files) {
        const content = await readFile(file, 'utf-8');
        if (content.includes('#include <catch2/catch.hpp>') || 
            content.includes('#include "catch.hpp"') ||
            content.includes('#define CATCH_CONFIG_MAIN')) {
          return true;
        }
      }
    } catch {}

    return false;
  }

  private async findCppFiles(projectRoot: string): Promise<string[]> {
    // Simple implementation - would use glob in real implementation
    const files: string[] = [];
    try {
      const { stdout } = await execAsync(`find "${projectRoot}" -name "*.cpp" -o -name "*.hpp" -o -name "*.h" -o -name "*.cc" -o -name "*.cxx"`, {
        timeout: 5000
      });
      return stdout.trim().split('\n').filter(f => f.length > 0);
    } catch {
      return files;
    }
  }

  private parseToolOutput(toolName: string, stdout: string, stderr: string, projectRoot: string): ToolIssue[] {
    const issues: ToolIssue[] = [];
    const output = stdout + '\n' + stderr;

    switch (toolName) {
      case 'gcc':
      case 'g++':
      case 'clang':
      case 'clang++':
        // Parse compiler errors and warnings
        const compileLines = output.split('\n');
        for (const line of compileLines) {
          // GCC/Clang format: file.cpp:line:column: error/warning: message
          const match = line.match(/([^:]+):(\d+):(\d+):\s*(error|warning|note):\s*(.+)/);
          if (match) {
            issues.push({
              file: match[1].replace(projectRoot + '/', ''),
              line: parseInt(match[2]),
              column: parseInt(match[3]),
              severity: match[4] === 'error' ? 'error' : match[4] === 'warning' ? 'warning' : 'info',
              message: match[5],
              category: 'compilation'
            });
          }
        }
        break;

      case 'make':
      case 'cmake':
        // Parse build system errors
        const buildLines = output.split('\n');
        for (const line of buildLines) {
          if (line.includes('Error') || line.includes('error:')) {
            issues.push({
              file: 'build',
              severity: 'error',
              message: line.trim(),
              category: 'build'
            });
          }
        }
        break;

      case 'cppcheck':
        // Parse cppcheck output
        const cppcheckLines = output.split('\n');
        for (const line of cppcheckLines) {
          // cppcheck format: [file:line]: (error/warning/style) message
          const match = line.match(/\[([^:]+):(\d+)\]: \(([^)]+)\) (.+)/);
          if (match) {
            const severity = match[3] === 'error' ? 'error' : 
                           match[3] === 'warning' ? 'warning' : 'info';
            issues.push({
              file: match[1],
              line: parseInt(match[2]),
              severity,
              message: match[4],
              rule: match[3],
              category: 'static_analysis'
            });
          }
        }
        break;

      case 'clang-tidy':
        // Parse clang-tidy output
        const tidyLines = output.split('\n');
        for (const line of tidyLines) {
          // clang-tidy format: file:line:col: warning/error: message [check-name]
          const match = line.match(/([^:]+):(\d+):(\d+): (warning|error|note): (.+) \[([^\]]+)\]/);
          if (match) {
            issues.push({
              file: match[1].replace(projectRoot + '/', ''),
              line: parseInt(match[2]),
              column: parseInt(match[3]),
              severity: match[4] === 'error' ? 'error' : match[4] === 'warning' ? 'warning' : 'info',
              message: match[5],
              rule: match[6],
              category: 'lint'
            });
          }
        }
        break;

      case 'clang-format':
        // clang-format shows differences when --dry-run is used
        if (output.includes('warning: code should be clang-formatted')) {
          issues.push({
            file: 'source files',
            severity: 'info',
            message: 'Code formatting issues detected',
            category: 'format'
          });
        }
        break;

      case 'valgrind':
        // Parse valgrind memory errors
        const valgrindLines = output.split('\n');
        for (const line of valgrindLines) {
          if (line.includes('ERROR SUMMARY:')) {
            const errorMatch = line.match(/ERROR SUMMARY: (\d+) errors/);
            if (errorMatch && parseInt(errorMatch[1]) > 0) {
              issues.push({
                file: 'runtime',
                severity: 'error',
                message: `${errorMatch[1]} memory errors detected`,
                category: 'memory'
              });
            }
          }
          
          // Parse specific error locations
          const locationMatch = line.match(/==\d+==\s+at 0x[A-F0-9]+: (.+) \(([^:]+):(\d+)\)/);
          if (locationMatch) {
            issues.push({
              file: locationMatch[2],
              line: parseInt(locationMatch[3]),
              severity: 'warning',
              message: `Memory issue in ${locationMatch[1]}`,
              category: 'memory'
            });
          }
        }
        break;

      case 'gtest':
      case 'catch2':
        // Parse test failures
        const testLines = output.split('\n');
        for (const line of testLines) {
          if (line.includes('FAILED')) {
            issues.push({
              file: 'test',
              severity: 'error',
              message: line.trim(),
              category: 'test'
            });
          }
        }
        break;
    }

    return issues;
  }
}