import { readFile, access } from 'fs/promises';
import { execSync, exec } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import { LanguageTooling, ToolingInfo, ToolResult, ToolIssue, ToolingRecommendation } from '../LanguageToolingDetector.js';

const execAsync = promisify(exec);

export class GoTooling implements LanguageTooling {
  language = 'go';

  async detectTools(projectRoot: string): Promise<ToolingInfo[]> {
    const tools: ToolingInfo[] = [];

    // Go compiler and basic tools
    const goAvailable = await this.isToolAvailable('go');
    const goModExists = await this.fileExists(projectRoot, 'go.mod');
    
    // go build - Compiler
    tools.push({
      name: 'go-build',
      type: 'build',
      command: 'go build',
      available: goAvailable,
      description: 'Go compiler and build tool',
      language: 'go',
      priority: 10
    });

    // go test - Testing framework
    tools.push({
      name: 'go-test',
      type: 'test',
      command: 'go test',
      available: goAvailable,
      description: 'Go testing framework',
      language: 'go',
      priority: 9
    });

    // go fmt - Code formatter
    tools.push({
      name: 'gofmt',
      type: 'format',
      command: 'gofmt',
      available: goAvailable,
      description: 'Go code formatter',
      language: 'go',
      priority: 8
    });

    // goimports - Import formatter
    const goimportsAvailable = await this.isToolAvailable('goimports');
    tools.push({
      name: 'goimports',
      type: 'format',
      command: 'goimports',
      available: goimportsAvailable,
      description: 'Go import formatter and organizer',
      language: 'go',
      priority: 8
    });

    // go vet - Static analysis
    tools.push({
      name: 'go-vet',
      type: 'lint',
      command: 'go vet',
      available: goAvailable,
      description: 'Go static analysis tool',
      language: 'go',
      priority: 8
    });

    // golint - Style linter (deprecated but still used)
    const golintAvailable = await this.isToolAvailable('golint');
    tools.push({
      name: 'golint',
      type: 'lint',
      command: 'golint',
      available: golintAvailable,
      description: 'Go style linter (deprecated, use staticcheck)',
      language: 'go',
      priority: 5
    });

    // staticcheck - Advanced static analysis
    const staticcheckAvailable = await this.isToolAvailable('staticcheck');
    tools.push({
      name: 'staticcheck',
      type: 'lint',
      command: 'staticcheck',
      available: staticcheckAvailable,
      description: 'Advanced Go static analysis tool',
      language: 'go',
      priority: 8
    });

    // golangci-lint - Meta-linter
    const golangciAvailable = await this.isToolAvailable('golangci-lint');
    const golangciConfig = await this.findConfigFile(projectRoot, ['.golangci.yml', '.golangci.yaml']);
    tools.push({
      name: 'golangci-lint',
      type: 'lint',
      configFile: golangciConfig,
      command: 'golangci-lint',
      available: golangciAvailable,
      description: 'Fast Go linters runner',
      language: 'go',
      priority: 9
    });

    // go mod - Module management
    tools.push({
      name: 'go-mod',
      type: 'build',
      command: 'go mod',
      available: goAvailable && goModExists,
      description: 'Go module management',
      language: 'go',
      priority: 7
    });

    // govulncheck - Security vulnerability scanner
    const govulncheckAvailable = await this.isToolAvailable('govulncheck');
    tools.push({
      name: 'govulncheck',
      type: 'security',
      command: 'govulncheck',
      available: govulncheckAvailable,
      description: 'Go vulnerability scanner',
      language: 'go',
      priority: 6
    });

    // gosec - Security analyzer
    const gosecAvailable = await this.isToolAvailable('gosec');
    tools.push({
      name: 'gosec',
      type: 'security',
      command: 'gosec',
      available: gosecAvailable,
      description: 'Go security analyzer',
      language: 'go',
      priority: 6
    });

    // ineffassign - Detect ineffectual assignments
    const ineffassignAvailable = await this.isToolAvailable('ineffassign');
    tools.push({
      name: 'ineffassign',
      type: 'lint',
      command: 'ineffassign',
      available: ineffassignAvailable,
      description: 'Detect ineffectual assignments in Go',
      language: 'go',
      priority: 5
    });

    // gocyclo - Cyclomatic complexity
    const gocycloAvailable = await this.isToolAvailable('gocyclo');
    tools.push({
      name: 'gocyclo',
      type: 'lint',
      command: 'gocyclo',
      available: gocycloAvailable,
      description: 'Cyclomatic complexity analyzer',
      language: 'go',
      priority: 4
    });

    // go cover - Code coverage
    tools.push({
      name: 'go-cover',
      type: 'coverage',
      command: 'go test -cover',
      available: goAvailable,
      description: 'Go code coverage tool',
      language: 'go',
      priority: 6
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
      case 'go-build':
        if (args.length === 0) {
          fullArgs = ['./...'];
        }
        command = `go build ${fullArgs.join(' ')}`;
        break;
      
      case 'go-test':
        if (args.length === 0) {
          fullArgs = ['-v', './...'];
        }
        command = `go test ${fullArgs.join(' ')}`;
        break;
      
      case 'gofmt':
        if (args.length === 0) {
          fullArgs = ['-d', '.'];
        }
        command = `gofmt ${fullArgs.join(' ')}`;
        break;
      
      case 'goimports':
        if (args.length === 0) {
          fullArgs = ['-d', '.'];
        }
        command = `goimports ${fullArgs.join(' ')}`;
        break;
      
      case 'go-vet':
        if (args.length === 0) {
          fullArgs = ['./...'];
        }
        command = `go vet ${fullArgs.join(' ')}`;
        break;
      
      case 'golint':
        if (args.length === 0) {
          fullArgs = ['./...'];
        }
        command = `golint ${fullArgs.join(' ')}`;
        break;
      
      case 'staticcheck':
        if (args.length === 0) {
          fullArgs = ['./...'];
        }
        command = `staticcheck ${fullArgs.join(' ')}`;
        break;
      
      case 'golangci-lint':
        if (args.length === 0) {
          fullArgs = ['run'];
        }
        command = `golangci-lint ${fullArgs.join(' ')}`;
        break;
      
      case 'go-mod':
        if (args.length === 0) {
          fullArgs = ['tidy'];
        }
        command = `go mod ${fullArgs.join(' ')}`;
        break;
      
      case 'govulncheck':
        if (args.length === 0) {
          fullArgs = ['./...'];
        }
        command = `govulncheck ${fullArgs.join(' ')}`;
        break;
      
      case 'gosec':
        if (args.length === 0) {
          fullArgs = ['./...'];
        }
        command = `gosec ${fullArgs.join(' ')}`;
        break;
      
      case 'ineffassign':
        if (args.length === 0) {
          fullArgs = ['.'];
        }
        command = `ineffassign ${fullArgs.join(' ')}`;
        break;
      
      case 'gocyclo':
        if (args.length === 0) {
          fullArgs = ['-over', '10', '.'];
        }
        command = `gocyclo ${fullArgs.join(' ')}`;
        break;
      
      case 'go-cover':
        if (args.length === 0) {
          fullArgs = ['-coverprofile=coverage.out', './...'];
        }
        command = `go test -cover ${fullArgs.join(' ')}`;
        break;
      
      default:
        command = `${tool.command} ${fullArgs.join(' ')}`;
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectRoot,
        timeout: 60000 // 1 minute timeout
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

    // Essential Go tools should always be available if Go is installed
    if (availableNames.has('go-build') && !availableNames.has('goimports')) {
      recommendations.push({
        tool: 'goimports',
        reason: 'Automatically manages Go imports and formatting',
        priority: 'high',
        installCommand: 'go install golang.org/x/tools/cmd/goimports@latest',
        configExample: '# No config needed, run: goimports -w .'
      });
    }

    // Modern linting
    if (!availableNames.has('golangci-lint') && !availableNames.has('staticcheck')) {
      recommendations.push({
        tool: 'golangci-lint',
        reason: 'Comprehensive and fast Go linter with multiple analyzers',
        priority: 'high',
        installCommand: 'curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin',
        configExample: `# .golangci.yml
linters-settings:
  govet:
    check-shadowing: true
  golint:
    min-confidence: 0
  gocyclo:
    min-complexity: 15`
      });
    }

    // Security scanning
    if (!availableNames.has('govulncheck') && !availableNames.has('gosec')) {
      recommendations.push({
        tool: 'govulncheck',
        reason: 'Official Go vulnerability scanner',
        priority: 'medium',
        installCommand: 'go install golang.org/x/vuln/cmd/govulncheck@latest',
        configExample: '# Run: govulncheck ./...'
      });
    }

    // Alternative security tool
    if (!availableNames.has('gosec')) {
      recommendations.push({
        tool: 'gosec',
        reason: 'Security-focused static analyzer for Go',
        priority: 'medium',
        installCommand: 'go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest',
        configExample: '# Run: gosec ./...'
      });
    }

    // Code quality tools
    if (!availableNames.has('ineffassign')) {
      recommendations.push({
        tool: 'ineffassign',
        reason: 'Detects ineffectual assignments in Go code',
        priority: 'low',
        installCommand: 'go install github.com/gordonklaus/ineffassign@latest'
      });
    }

    return recommendations;
  }

  private async isToolAvailable(toolName: string): Promise<boolean> {
    try {
      let checkCommand = `${toolName} version`;
      
      // Special cases for Go tools
      if (toolName === 'gofmt') checkCommand = 'gofmt -h';
      if (toolName === 'golint') checkCommand = 'golint -help';
      if (toolName === 'staticcheck') checkCommand = 'staticcheck -version';
      if (toolName === 'golangci-lint') checkCommand = 'golangci-lint version';
      if (toolName === 'ineffassign') checkCommand = 'ineffassign -h';
      if (toolName === 'gocyclo') checkCommand = 'gocyclo -h';
      
      execSync(checkCommand, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private async getToolVersion(toolName: string): Promise<string> {
    try {
      let versionCommand = `${toolName} version`;
      
      if (toolName.startsWith('go-')) {
        versionCommand = 'go version';
      } else if (toolName === 'golangci-lint') {
        versionCommand = 'golangci-lint version';
      } else if (toolName === 'staticcheck') {
        versionCommand = 'staticcheck -version';
      }
      
      const { stdout } = await execAsync(versionCommand);
      
      // Parse version from various Go tool outputs
      const versionMatch = stdout.match(/version (\d+\.\d+(?:\.\d+)?)/i) || 
                          stdout.match(/go(\d+\.\d+(?:\.\d+)?)/i) ||
                          stdout.match(/(\d+\.\d+(?:\.\d+)?)/);
      return versionMatch ? versionMatch[1] : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private async fileExists(projectRoot: string, fileName: string): Promise<boolean> {
    try {
      await access(join(projectRoot, fileName));
      return true;
    } catch {
      return false;
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

  private parseToolOutput(toolName: string, stdout: string, stderr: string, projectRoot: string): ToolIssue[] {
    const issues: ToolIssue[] = [];
    const output = stdout + '\n' + stderr;

    switch (toolName) {
      case 'go-build':
        // Parse Go build errors
        const buildLines = output.split('\n');
        for (const line of buildLines) {
          const match = line.match(/(.+\.go):(\d+):(\d+): (.+)/);
          if (match) {
            issues.push({
              file: match[1].replace(projectRoot + '/', ''),
              line: parseInt(match[2]),
              column: parseInt(match[3]),
              severity: 'error',
              message: match[4],
              category: 'compilation'
            });
          }
        }
        break;

      case 'go-test':
        // Parse test failures
        const testLines = output.split('\n');
        for (const line of testLines) {
          if (line.includes('FAIL:') || line.includes('--- FAIL:')) {
            const failMatch = line.match(/--- FAIL: (.+) \((.+)\)/);
            if (failMatch) {
              issues.push({
                file: 'test',
                severity: 'error',
                message: `Test failed: ${failMatch[1]}`,
                category: 'test'
              });
            }
          }
          
          // Parse panic/error locations
          const errorMatch = line.match(/(.+\.go):(\d+): (.+)/);
          if (errorMatch) {
            issues.push({
              file: errorMatch[1],
              line: parseInt(errorMatch[2]),
              severity: 'error',
              message: errorMatch[3],
              category: 'test_error'
            });
          }
        }
        break;

      case 'gofmt':
      case 'goimports':
        // Format tools show diffs for files that need formatting
        if (output.trim().length > 0) {
          const formatLines = output.split('\n');
          let currentFile = '';
          for (const line of formatLines) {
            const fileMatch = line.match(/^diff -u (.+\.go)/);
            if (fileMatch) {
              currentFile = fileMatch[1];
            } else if (line.startsWith('@@') && currentFile) {
              issues.push({
                file: currentFile,
                severity: 'info',
                message: 'File needs formatting',
                category: 'format'
              });
            }
          }
        }
        break;

      case 'go-vet':
        const vetLines = output.split('\n');
        for (const line of vetLines) {
          const match = line.match(/(.+\.go):(\d+):(\d+): (.+)/);
          if (match) {
            issues.push({
              file: match[1].replace(projectRoot + '/', ''),
              line: parseInt(match[2]),
              column: parseInt(match[3]),
              severity: 'warning',
              message: match[4],
              category: 'static_analysis'
            });
          }
        }
        break;

      case 'golint':
        const lintLines = output.split('\n');
        for (const line of lintLines) {
          const match = line.match(/(.+\.go):(\d+):(\d+): (.+)/);
          if (match) {
            issues.push({
              file: match[1],
              line: parseInt(match[2]),
              column: parseInt(match[3]),
              severity: 'info',
              message: match[4],
              category: 'style'
            });
          }
        }
        break;

      case 'staticcheck':
        const staticLines = output.split('\n');
        for (const line of staticLines) {
          const match = line.match(/(.+\.go):(\d+):(\d+): (.+) \((.+)\)/);
          if (match) {
            issues.push({
              file: match[1],
              line: parseInt(match[2]),
              column: parseInt(match[3]),
              severity: 'warning',
              message: match[4],
              rule: match[5],
              category: 'static_analysis'
            });
          }
        }
        break;

      case 'golangci-lint':
        const golangciLines = output.split('\n');
        for (const line of golangciLines) {
          const match = line.match(/(.+\.go):(\d+):(\d+): (.+) \((.+)\)/);
          if (match) {
            const severity = line.includes('Error') ? 'error' : 'warning';
            issues.push({
              file: match[1],
              line: parseInt(match[2]),
              column: parseInt(match[3]),
              severity,
              message: match[4],
              rule: match[5],
              category: 'lint'
            });
          }
        }
        break;

      case 'gosec':
        // gosec outputs in specific format
        const gosecLines = output.split('\n');
        for (const line of gosecLines) {
          const match = line.match(/(.+\.go):(\d+) \[(.+)\] (.+)/);
          if (match) {
            issues.push({
              file: match[1],
              line: parseInt(match[2]),
              severity: 'warning',
              message: match[4],
              rule: match[3],
              category: 'security'
            });
          }
        }
        break;

      case 'govulncheck':
        if (output.includes('Vulnerability')) {
          // Parse vulnerability reports
          const vulnLines = output.split('\n');
          for (const line of vulnLines) {
            if (line.includes('found in')) {
              issues.push({
                file: 'dependencies',
                severity: 'error',
                message: line.trim(),
                category: 'vulnerability'
              });
            }
          }
        }
        break;
    }

    return issues;
  }
}