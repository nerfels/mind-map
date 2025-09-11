import { readFile, access } from 'fs/promises';
import { execSync, exec } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import { LanguageTooling, ToolingInfo, ToolResult, ToolIssue, ToolingRecommendation } from '../LanguageToolingDetector.js';

const execAsync = promisify(exec);

export class RustTooling implements LanguageTooling {
  language = 'rust';

  async detectTools(projectRoot: string): Promise<ToolingInfo[]> {
    const tools: ToolingInfo[] = [];

    // Cargo - Build system and package manager
    const cargoAvailable = await this.isToolAvailable('cargo');
    const cargoTomlExists = await this.fileExists(projectRoot, 'Cargo.toml');
    
    // cargo build - Compiler
    tools.push({
      name: 'cargo-build',
      type: 'build',
      configFile: cargoTomlExists ? join(projectRoot, 'Cargo.toml') : undefined,
      command: 'cargo build',
      available: cargoAvailable && cargoTomlExists,
      description: 'Rust compiler and build system',
      language: 'rust',
      priority: 10
    });

    // cargo test - Testing framework
    tools.push({
      name: 'cargo-test',
      type: 'test',
      command: 'cargo test',
      available: cargoAvailable && cargoTomlExists,
      description: 'Rust testing framework',
      language: 'rust',
      priority: 9
    });

    // rustfmt - Code formatter
    const rustfmtAvailable = await this.isToolAvailable('rustfmt');
    const rustfmtConfig = await this.findConfigFile(projectRoot, ['rustfmt.toml', '.rustfmt.toml']);
    tools.push({
      name: 'rustfmt',
      type: 'format',
      configFile: rustfmtConfig,
      command: 'rustfmt',
      available: rustfmtAvailable,
      description: 'Rust code formatter',
      language: 'rust',
      priority: 8
    });

    // cargo fmt - Cargo wrapper for rustfmt
    tools.push({
      name: 'cargo-fmt',
      type: 'format',
      configFile: rustfmtConfig,
      command: 'cargo fmt',
      available: cargoAvailable && rustfmtAvailable,
      description: 'Cargo wrapper for rustfmt',
      language: 'rust',
      priority: 8
    });

    // clippy - Linter
    const clippyAvailable = await this.isToolAvailable('cargo-clippy');
    const clippyConfig = await this.findConfigFile(projectRoot, ['clippy.toml', '.clippy.toml']);
    tools.push({
      name: 'clippy',
      type: 'lint',
      configFile: clippyConfig,
      command: 'cargo clippy',
      available: clippyAvailable,
      description: 'Rust linter and code analysis tool',
      language: 'rust',
      priority: 9
    });

    // cargo check - Fast syntax check
    tools.push({
      name: 'cargo-check',
      type: 'lint',
      command: 'cargo check',
      available: cargoAvailable && cargoTomlExists,
      description: 'Fast Rust syntax and type checking',
      language: 'rust',
      priority: 7
    });

    // cargo audit - Security vulnerability scanner
    const auditAvailable = await this.isToolAvailable('cargo-audit');
    tools.push({
      name: 'cargo-audit',
      type: 'security',
      command: 'cargo audit',
      available: auditAvailable,
      description: 'Rust dependency vulnerability scanner',
      language: 'rust',
      priority: 6
    });

    // cargo outdated - Dependency update checker
    const outdatedAvailable = await this.isToolAvailable('cargo-outdated');
    tools.push({
      name: 'cargo-outdated',
      type: 'lint',
      command: 'cargo outdated',
      available: outdatedAvailable,
      description: 'Check for outdated Rust dependencies',
      language: 'rust',
      priority: 5
    });

    // cargo tarpaulin - Code coverage
    const tarpaulinAvailable = await this.isToolAvailable('cargo-tarpaulin');
    tools.push({
      name: 'cargo-tarpaulin',
      type: 'coverage',
      command: 'cargo tarpaulin',
      available: tarpaulinAvailable,
      description: 'Rust code coverage tool',
      language: 'rust',
      priority: 6
    });

    // cargo deny - Dependency licensing and security
    const denyAvailable = await this.isToolAvailable('cargo-deny');
    const denyConfig = await this.findConfigFile(projectRoot, ['deny.toml']);
    tools.push({
      name: 'cargo-deny',
      type: 'security',
      configFile: denyConfig,
      command: 'cargo deny',
      available: denyAvailable,
      description: 'Rust dependency license and security checker',
      language: 'rust',
      priority: 5
    });

    // cargo machete - Find unused dependencies
    const macheteAvailable = await this.isToolAvailable('cargo-machete');
    tools.push({
      name: 'cargo-machete',
      type: 'lint',
      command: 'cargo machete',
      available: macheteAvailable,
      description: 'Find unused Rust dependencies',
      language: 'rust',
      priority: 4
    });

    // cargo expand - Macro expansion debugging
    const expandAvailable = await this.isToolAvailable('cargo-expand');
    tools.push({
      name: 'cargo-expand',
      type: 'lint',
      command: 'cargo expand',
      available: expandAvailable,
      description: 'Expand Rust macros for debugging',
      language: 'rust',
      priority: 3
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
      case 'cargo-build':
        if (args.length === 0) {
          fullArgs = ['--all-targets'];
        }
        command = `cargo build ${fullArgs.join(' ')}`;
        break;
      
      case 'cargo-test':
        if (args.length === 0) {
          fullArgs = ['--all'];
        }
        command = `cargo test ${fullArgs.join(' ')}`;
        break;
      
      case 'rustfmt':
        if (args.length === 0) {
          fullArgs = ['--check', 'src/**/*.rs'];
        }
        command = `rustfmt ${fullArgs.join(' ')}`;
        break;
      
      case 'cargo-fmt':
        if (args.length === 0) {
          fullArgs = ['--', '--check'];
        }
        command = `cargo fmt ${fullArgs.join(' ')}`;
        break;
      
      case 'clippy':
        if (args.length === 0) {
          fullArgs = ['--all-targets', '--', '-D', 'warnings'];
        }
        command = `cargo clippy ${fullArgs.join(' ')}`;
        break;
      
      case 'cargo-check':
        if (args.length === 0) {
          fullArgs = ['--all-targets'];
        }
        command = `cargo check ${fullArgs.join(' ')}`;
        break;
      
      case 'cargo-audit':
        if (args.length === 0) {
          fullArgs = ['--format', 'json'];
        }
        command = `cargo audit ${fullArgs.join(' ')}`;
        break;
      
      case 'cargo-outdated':
        if (args.length === 0) {
          fullArgs = ['--format', 'json'];
        }
        command = `cargo outdated ${fullArgs.join(' ')}`;
        break;
      
      case 'cargo-tarpaulin':
        if (args.length === 0) {
          fullArgs = ['--out', 'xml', '--skip-clean'];
        }
        command = `cargo tarpaulin ${fullArgs.join(' ')}`;
        break;
      
      case 'cargo-deny':
        if (args.length === 0) {
          fullArgs = ['check'];
        }
        command = `cargo deny ${fullArgs.join(' ')}`;
        break;
      
      case 'cargo-machete':
        // No default args needed
        command = `cargo machete ${fullArgs.join(' ')}`;
        break;
      
      case 'cargo-expand':
        if (args.length === 0) {
          fullArgs = ['--lib'];
        }
        command = `cargo expand ${fullArgs.join(' ')}`;
        break;
      
      default:
        command = `${tool.command} ${fullArgs.join(' ')}`;
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectRoot,
        timeout: 120000 // 2 minute timeout for Rust builds
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

    // Essential Rust tools
    if (availableNames.has('cargo-build') && !availableNames.has('clippy')) {
      recommendations.push({
        tool: 'clippy',
        reason: 'Essential linter for catching common Rust mistakes and improving code quality',
        priority: 'high',
        installCommand: 'rustup component add clippy',
        configExample: `# clippy.toml
avoid-breaking-exported-api = false
disallowed-names = ["foo", "baz", "quux"]`
      });
    }

    if (availableNames.has('cargo-build') && !availableNames.has('rustfmt')) {
      recommendations.push({
        tool: 'rustfmt',
        reason: 'Code formatter ensures consistent Rust code style',
        priority: 'high',
        installCommand: 'rustup component add rustfmt',
        configExample: `# rustfmt.toml
max_width = 100
hard_tabs = false
tab_spaces = 4`
      });
    }

    // Security tools
    if (!availableNames.has('cargo-audit')) {
      recommendations.push({
        tool: 'cargo-audit',
        reason: 'Scans dependencies for known security vulnerabilities',
        priority: 'high',
        installCommand: 'cargo install cargo-audit',
        configExample: '# Run: cargo audit'
      });
    }

    // Code coverage
    if (!availableNames.has('cargo-tarpaulin')) {
      recommendations.push({
        tool: 'cargo-tarpaulin',
        reason: 'Measures code coverage for Rust projects',
        priority: 'medium',
        installCommand: 'cargo install cargo-tarpaulin',
        configExample: '# Run: cargo tarpaulin --out html'
      });
    }

    // Dependency management
    if (!availableNames.has('cargo-outdated')) {
      recommendations.push({
        tool: 'cargo-outdated',
        reason: 'Identifies outdated dependencies that can be updated',
        priority: 'medium',
        installCommand: 'cargo install cargo-outdated',
        configExample: '# Run: cargo outdated'
      });
    }

    if (!availableNames.has('cargo-deny')) {
      recommendations.push({
        tool: 'cargo-deny',
        reason: 'Comprehensive dependency licensing, security, and policy checking',
        priority: 'medium',
        installCommand: 'cargo install cargo-deny',
        configExample: `# deny.toml
[licenses]
unlicensed = "deny"
allow = ["MIT", "Apache-2.0"]`
      });
    }

    // Cleanup tools
    if (!availableNames.has('cargo-machete')) {
      recommendations.push({
        tool: 'cargo-machete',
        reason: 'Finds unused dependencies to keep Cargo.toml clean',
        priority: 'low',
        installCommand: 'cargo install cargo-machete',
        configExample: '# Run: cargo machete'
      });
    }

    return recommendations;
  }

  private async isToolAvailable(toolName: string): Promise<boolean> {
    try {
      let checkCommand = `${toolName} --version`;
      
      // Special cases for cargo subcommands
      if (toolName === 'cargo-clippy') checkCommand = 'cargo clippy --version';
      if (toolName === 'cargo-audit') checkCommand = 'cargo audit --version';
      if (toolName === 'cargo-outdated') checkCommand = 'cargo outdated --version';
      if (toolName === 'cargo-tarpaulin') checkCommand = 'cargo tarpaulin --version';
      if (toolName === 'cargo-deny') checkCommand = 'cargo deny --version';
      if (toolName === 'cargo-machete') checkCommand = 'cargo machete --version';
      if (toolName === 'cargo-expand') checkCommand = 'cargo expand --version';
      
      execSync(checkCommand, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private async getToolVersion(toolName: string): Promise<string> {
    try {
      let versionCommand = `${toolName} --version`;
      
      // Adjust for cargo subcommands
      if (toolName.startsWith('cargo-')) {
        const subcommand = toolName.replace('cargo-', '');
        if (subcommand === 'clippy') versionCommand = 'cargo clippy --version';
        else versionCommand = `cargo ${subcommand} --version`;
      }
      
      const { stdout } = await execAsync(versionCommand);
      
      // Parse version from various Rust tool outputs
      const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/);
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
      case 'cargo-build':
      case 'cargo-check':
        // Parse Rust compiler errors and warnings
        const compileLines = output.split('\n');
        for (const line of compileLines) {
          // Rust compiler format: error[E0308]: mismatched types --> src/main.rs:5:5
          const match = line.match(/(error|warning)\[([^\]]*)\]: (.+) --> ([^:]+):(\d+):(\d+)/);
          if (match) {
            issues.push({
              file: match[4].replace(projectRoot + '/', ''),
              line: parseInt(match[5]),
              column: parseInt(match[6]),
              severity: match[1] === 'error' ? 'error' : 'warning',
              message: match[3],
              rule: match[2],
              category: 'compilation'
            });
          }
        }
        break;

      case 'cargo-test':
        // Parse test failures
        const testLines = output.split('\n');
        for (const line of testLines) {
          if (line.includes('FAILED')) {
            const failMatch = line.match(/test (.+) \.\.\. FAILED/);
            if (failMatch) {
              issues.push({
                file: 'test',
                severity: 'error',
                message: `Test failed: ${failMatch[1]}`,
                category: 'test'
              });
            }
          }
          
          // Parse test locations
          const locationMatch = line.match(/thread '(.+)' panicked at '(.+)', ([^:]+):(\d+):(\d+)/);
          if (locationMatch) {
            issues.push({
              file: locationMatch[3],
              line: parseInt(locationMatch[4]),
              column: parseInt(locationMatch[5]),
              severity: 'error',
              message: locationMatch[2],
              category: 'test_panic'
            });
          }
        }
        break;

      case 'rustfmt':
      case 'cargo-fmt':
        // rustfmt shows files that differ from expected format
        if (output.includes('Diff in')) {
          const formatLines = output.split('\n');
          for (const line of formatLines) {
            const fileMatch = line.match(/Diff in (.+):/);
            if (fileMatch) {
              issues.push({
                file: fileMatch[1],
                severity: 'info',
                message: 'File needs formatting',
                category: 'format'
              });
            }
          }
        }
        break;

      case 'clippy':
        // Parse clippy warnings and errors
        const clippyLines = output.split('\n');
        for (const line of clippyLines) {
          const match = line.match(/(warning|error): (.+) --> ([^:]+):(\d+):(\d+)/);
          if (match) {
            issues.push({
              file: match[3].replace(projectRoot + '/', ''),
              line: parseInt(match[4]),
              column: parseInt(match[5]),
              severity: match[1] === 'error' ? 'error' : 'warning',
              message: match[2],
              category: 'lint'
            });
          }
          
          // Parse clippy lint names
          const lintMatch = line.match(/= help: for further information visit (.+)/);
          if (lintMatch && issues.length > 0) {
            const lastIssue = issues[issues.length - 1];
            lastIssue.rule = lintMatch[1].split('#').pop() || 'clippy';
          }
        }
        break;

      case 'cargo-audit':
        try {
          const jsonOutput = JSON.parse(stdout);
          if (jsonOutput.vulnerabilities && jsonOutput.vulnerabilities.advisory) {
            for (const vuln of jsonOutput.vulnerabilities.advisory) {
              issues.push({
                file: 'Cargo.toml',
                severity: 'error',
                message: `Security vulnerability in ${vuln.package}: ${vuln.title}`,
                rule: vuln.id,
                category: 'security'
              });
            }
          }
        } catch {
          // Fallback to text parsing
          if (output.includes('Vulnerable crates found!')) {
            issues.push({
              file: 'dependencies',
              severity: 'error',
              message: 'Security vulnerabilities found in dependencies',
              category: 'security'
            });
          }
        }
        break;

      case 'cargo-outdated':
        try {
          const jsonOutput = JSON.parse(stdout);
          if (jsonOutput.dependencies) {
            for (const dep of jsonOutput.dependencies) {
              if (dep.latest !== dep.project) {
                issues.push({
                  file: 'Cargo.toml',
                  severity: 'info',
                  message: `${dep.name} can be updated from ${dep.project} to ${dep.latest}`,
                  category: 'dependency'
                });
              }
            }
          }
        } catch {
          // JSON parsing failed, skip
        }
        break;

      case 'cargo-deny':
        const denyLines = output.split('\n');
        for (const line of denyLines) {
          if (line.includes('error:') || line.includes('warning:')) {
            const severity = line.includes('error:') ? 'error' : 'warning';
            const messageMatch = line.match(/(error|warning): (.+)/);
            if (messageMatch) {
              issues.push({
                file: 'dependencies',
                severity,
                message: messageMatch[2],
                category: 'policy'
              });
            }
          }
        }
        break;

      case 'cargo-machete':
        const macheteLines = output.split('\n');
        for (const line of macheteLines) {
          if (line.trim() && !line.startsWith('cargo-machete')) {
            issues.push({
              file: 'Cargo.toml',
              severity: 'info',
              message: `Unused dependency: ${line.trim()}`,
              category: 'unused_dependency'
            });
          }
        }
        break;
    }

    return issues;
  }
}