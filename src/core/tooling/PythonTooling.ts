import { readFile, access } from 'fs/promises';
import { execSync, exec } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import { LanguageTooling, ToolingInfo, ToolResult, ToolIssue, ToolingRecommendation } from '../LanguageToolingDetector.js';

const execAsync = promisify(exec);

export class PythonTooling implements LanguageTooling {
  language = 'python';

  async detectTools(projectRoot: string): Promise<ToolingInfo[]> {
    const tools: ToolingInfo[] = [];

    // pytest - Testing framework
    const pytestAvailable = await this.isToolAvailable('pytest');
    const pytestConfig = await this.findConfigFile(projectRoot, ['pytest.ini', 'pyproject.toml', 'tox.ini', 'setup.cfg']);
    tools.push({
      name: 'pytest',
      type: 'test',
      configFile: pytestConfig,
      command: 'pytest',
      available: pytestAvailable,
      description: 'Python testing framework',
      language: 'python',
      priority: 9
    });

    // pylint - Static analysis
    const pylintAvailable = await this.isToolAvailable('pylint');
    const pylintConfig = await this.findConfigFile(projectRoot, ['.pylintrc', 'pyproject.toml', 'setup.cfg']);
    tools.push({
      name: 'pylint',
      type: 'lint',
      configFile: pylintConfig,
      command: 'pylint',
      available: pylintAvailable,
      description: 'Python code analysis tool',
      language: 'python',
      priority: 8
    });

    // flake8 - Style checker
    const flake8Available = await this.isToolAvailable('flake8');
    const flake8Config = await this.findConfigFile(projectRoot, ['.flake8', 'setup.cfg', 'tox.ini']);
    tools.push({
      name: 'flake8',
      type: 'lint',
      configFile: flake8Config,
      command: 'flake8',
      available: flake8Available,
      description: 'Python style checker',
      language: 'python',
      priority: 7
    });

    // black - Code formatter
    const blackAvailable = await this.isToolAvailable('black');
    const blackConfig = await this.findConfigFile(projectRoot, ['pyproject.toml', 'setup.cfg']);
    tools.push({
      name: 'black',
      type: 'format',
      configFile: blackConfig,
      command: 'black',
      available: blackAvailable,
      description: 'Python code formatter',
      language: 'python',
      priority: 8
    });

    // mypy - Static type checker
    const mypyAvailable = await this.isToolAvailable('mypy');
    const mypyConfig = await this.findConfigFile(projectRoot, ['mypy.ini', 'setup.cfg', 'pyproject.toml']);
    tools.push({
      name: 'mypy',
      type: 'type_check',
      configFile: mypyConfig,
      command: 'mypy',
      available: mypyAvailable,
      description: 'Python static type checker',
      language: 'python',
      priority: 7
    });

    // bandit - Security linter
    const banditAvailable = await this.isToolAvailable('bandit');
    const banditConfig = await this.findConfigFile(projectRoot, ['.bandit', 'bandit.yaml', 'bandit.yml', 'pyproject.toml']);
    tools.push({
      name: 'bandit',
      type: 'security',
      configFile: banditConfig,
      command: 'bandit',
      available: banditAvailable,
      description: 'Python security linter',
      language: 'python',
      priority: 6
    });

    // coverage - Code coverage
    const coverageAvailable = await this.isToolAvailable('coverage');
    const coverageConfig = await this.findConfigFile(projectRoot, ['.coveragerc', 'setup.cfg', 'pyproject.toml']);
    tools.push({
      name: 'coverage',
      type: 'coverage',
      configFile: coverageConfig,
      command: 'coverage',
      available: coverageAvailable,
      description: 'Python code coverage tool',
      language: 'python',
      priority: 6
    });

    // isort - Import sorter
    const isortAvailable = await this.isToolAvailable('isort');
    const isortConfig = await this.findConfigFile(projectRoot, ['.isort.cfg', 'pyproject.toml', 'setup.cfg']);
    tools.push({
      name: 'isort',
      type: 'format',
      configFile: isortConfig,
      command: 'isort',
      available: isortAvailable,
      description: 'Python import sorter',
      language: 'python',
      priority: 5
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
      case 'pytest':
        if (args.length === 0) {
          fullArgs = ['--tb=short', '--no-header', '-v'];
        }
        break;
      
      case 'pylint':
        if (args.length === 0) {
          fullArgs = ['--output-format=json', '.'];
        }
        break;
      
      case 'flake8':
        if (args.length === 0) {
          fullArgs = ['--format=%(path)s:%(row)d:%(col)d: %(code)s %(text)s', '.'];
        }
        break;
      
      case 'black':
        if (args.length === 0) {
          fullArgs = ['--check', '--diff', '.'];
        }
        break;
      
      case 'mypy':
        if (args.length === 0) {
          fullArgs = ['.'];
        }
        break;
      
      case 'bandit':
        if (args.length === 0) {
          fullArgs = ['-f', 'json', '-r', '.'];
        }
        break;
      
      case 'coverage':
        if (args.length === 0) {
          fullArgs = ['run', '--source', '.', '-m', 'pytest'];
        }
        break;
      
      case 'isort':
        if (args.length === 0) {
          fullArgs = ['--check-only', '--diff', '.'];
        }
        break;
    }

    const fullCommand = `${command} ${fullArgs.join(' ')}`;

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        cwd: projectRoot,
        timeout: 30000 // 30 second timeout
      });

      const result: ToolResult = {
        tool: tool.name,
        success: true,
        exitCode: 0,
        stdout,
        stderr,
        duration: Date.now() - startTime,
        issues: this.parseToolOutput(tool.name, stdout, stderr)
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
        issues: this.parseToolOutput(tool.name, error.stdout || '', error.stderr || error.message || '')
      };

      return result;
    }
  }

  getRecommendations(availableTools: ToolingInfo[]): ToolingRecommendation[] {
    const recommendations: ToolingRecommendation[] = [];
    const availableNames = new Set(availableTools.filter(t => t.available).map(t => t.name));

    // Essential tools recommendations
    if (!availableNames.has('pytest')) {
      recommendations.push({
        tool: 'pytest',
        reason: 'Essential testing framework for Python projects',
        priority: 'high',
        installCommand: 'pip install pytest',
        configExample: `# pytest.ini
[tool:pytest]
testpaths = tests
python_files = test_*.py *_test.py
python_functions = test_*`
      });
    }

    if (!availableNames.has('black')) {
      recommendations.push({
        tool: 'black',
        reason: 'Automatic code formatting ensures consistent style',
        priority: 'high',
        installCommand: 'pip install black',
        configExample: `# pyproject.toml
[tool.black]
line-length = 88
target-version = ['py38']`
      });
    }

    if (!availableNames.has('pylint') && !availableNames.has('flake8')) {
      recommendations.push({
        tool: 'pylint',
        reason: 'Static analysis helps catch bugs and improve code quality',
        priority: 'medium',
        installCommand: 'pip install pylint',
        configExample: `# .pylintrc
[MASTER]
init-hook='import sys; sys.path.append("src")'`
      });
    }

    if (!availableNames.has('mypy')) {
      recommendations.push({
        tool: 'mypy',
        reason: 'Type checking improves code reliability',
        priority: 'medium',
        installCommand: 'pip install mypy',
        configExample: `# mypy.ini
[mypy]
python_version = 3.8
warn_return_any = True`
      });
    }

    if (!availableNames.has('bandit')) {
      recommendations.push({
        tool: 'bandit',
        reason: 'Security scanning helps identify vulnerabilities',
        priority: 'medium',
        installCommand: 'pip install bandit',
        configExample: `# bandit.yaml
exclude_dirs:
  - tests`
      });
    }

    return recommendations;
  }

  private async isToolAvailable(toolName: string): Promise<boolean> {
    try {
      execSync(`${toolName} --version`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private async getToolVersion(toolName: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`${toolName} --version`);
      const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/);
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

  private parseToolOutput(toolName: string, stdout: string, stderr: string): ToolIssue[] {
    const issues: ToolIssue[] = [];
    const output = stdout + '\n' + stderr;

    switch (toolName) {
      case 'pylint':
        try {
          const jsonOutput = JSON.parse(stdout);
          if (Array.isArray(jsonOutput)) {
            for (const issue of jsonOutput) {
              issues.push({
                file: issue.path,
                line: issue.line,
                column: issue.column,
                severity: this.mapPylintSeverity(issue.type),
                message: issue.message,
                rule: issue['message-id'],
                category: 'code_quality'
              });
            }
          }
        } catch {
          // Fallback to text parsing if JSON parsing fails
          const lines = output.split('\n');
          for (const line of lines) {
            const match = line.match(/(.+):(\d+):(\d+): ([CRWEF])\d+: (.+)/);
            if (match) {
              issues.push({
                file: match[1],
                line: parseInt(match[2]),
                column: parseInt(match[3]),
                severity: this.mapPylintSeverity(match[4]),
                message: match[5],
                category: 'code_quality'
              });
            }
          }
        }
        break;

      case 'flake8':
        const flake8Lines = output.split('\n');
        for (const line of flake8Lines) {
          const match = line.match(/(.+):(\d+):(\d+): ([EW]\d+) (.+)/);
          if (match) {
            issues.push({
              file: match[1],
              line: parseInt(match[2]),
              column: parseInt(match[3]),
              severity: match[4].startsWith('E') ? 'error' : 'warning',
              message: match[5],
              rule: match[4],
              category: 'style'
            });
          }
        }
        break;

      case 'mypy':
        const mypyLines = output.split('\n');
        for (const line of mypyLines) {
          const match = line.match(/(.+):(\d+): (error|warning|note): (.+)/);
          if (match) {
            issues.push({
              file: match[1],
              line: parseInt(match[2]),
              severity: match[3] === 'error' ? 'error' : match[3] === 'warning' ? 'warning' : 'info',
              message: match[4],
              category: 'type_check'
            });
          }
        }
        break;

      case 'bandit':
        try {
          const jsonOutput = JSON.parse(stdout);
          if (jsonOutput.results) {
            for (const issue of jsonOutput.results) {
              issues.push({
                file: issue.filename,
                line: issue.line_number,
                severity: this.mapBanditSeverity(issue.issue_severity),
                message: issue.issue_text,
                rule: issue.test_id,
                category: 'security'
              });
            }
          }
        } catch {
          // Bandit JSON parsing failed
        }
        break;

      case 'pytest':
        // Parse pytest output for failures
        if (output.includes('FAILED')) {
          const testLines = output.split('\n');
          for (const line of testLines) {
            if (line.includes('FAILED')) {
              const match = line.match(/(.+)::.+ - (.+)/);
              if (match) {
                issues.push({
                  file: match[1],
                  severity: 'error',
                  message: match[2] || 'Test failed',
                  category: 'test'
                });
              }
            }
          }
        }
        break;
    }

    return issues;
  }

  private mapPylintSeverity(pylintType: string): 'error' | 'warning' | 'info' {
    switch (pylintType) {
      case 'error':
      case 'E':
        return 'error';
      case 'warning':
      case 'W':
        return 'warning';
      case 'refactor':
      case 'R':
      case 'convention':
      case 'C':
      default:
        return 'info';
    }
  }

  private mapBanditSeverity(banditSeverity: string): 'error' | 'warning' | 'info' {
    switch (banditSeverity.toLowerCase()) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
      default:
        return 'info';
    }
  }
}