import { readFile, access } from 'fs/promises';
import { execSync, exec } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import { LanguageTooling, ToolingInfo, ToolResult, ToolIssue, ToolingRecommendation } from '../LanguageToolingDetector.js';

const execAsync = promisify(exec);

export class JavaTooling implements LanguageTooling {
  language = 'java';

  async detectTools(projectRoot: string): Promise<ToolingInfo[]> {
    const tools: ToolingInfo[] = [];

    // Maven - Build tool
    const mavenAvailable = await this.isToolAvailable('mvn');
    const pomExists = await this.fileExists(projectRoot, 'pom.xml');
    tools.push({
      name: 'maven',
      type: 'build',
      configFile: pomExists ? join(projectRoot, 'pom.xml') : undefined,
      command: 'mvn',
      available: mavenAvailable && pomExists,
      description: 'Apache Maven build tool',
      language: 'java',
      priority: 9
    });

    // Gradle - Build tool
    const gradleAvailable = await this.isToolAvailable('gradle') || await this.fileExists(projectRoot, 'gradlew');
    const gradleConfig = await this.findConfigFile(projectRoot, ['build.gradle', 'build.gradle.kts', 'settings.gradle']);
    tools.push({
      name: 'gradle',
      type: 'build',
      configFile: gradleConfig,
      command: gradleConfig ? (await this.fileExists(projectRoot, 'gradlew') ? './gradlew' : 'gradle') : 'gradle',
      available: gradleAvailable && !!gradleConfig,
      description: 'Gradle build tool',
      language: 'java',
      priority: 9
    });

    // JUnit - Testing (via Maven/Gradle)
    const junitAvailable = pomExists || !!gradleConfig;
    tools.push({
      name: 'junit',
      type: 'test',
      command: pomExists ? 'mvn test' : './gradlew test',
      available: junitAvailable,
      description: 'JUnit testing framework',
      language: 'java',
      priority: 8
    });

    // SpotBugs - Static analysis
    const spotBugsConfig = await this.hasSpotBugsConfig(projectRoot);
    tools.push({
      name: 'spotbugs',
      type: 'lint',
      command: pomExists ? 'mvn spotbugs:check' : './gradlew spotbugsMain',
      available: spotBugsConfig,
      description: 'SpotBugs static analysis',
      language: 'java',
      priority: 7
    });

    // Checkstyle - Code style
    const checkstyleConfig = await this.hasCheckstyleConfig(projectRoot);
    tools.push({
      name: 'checkstyle',
      type: 'lint',
      configFile: await this.findConfigFile(projectRoot, ['checkstyle.xml', 'config/checkstyle/checkstyle.xml']),
      command: pomExists ? 'mvn checkstyle:check' : './gradlew checkstyleMain',
      available: checkstyleConfig,
      description: 'Checkstyle code style checker',
      language: 'java',
      priority: 6
    });

    // PMD - Source code analyzer
    const pmdConfig = await this.hasPmdConfig(projectRoot);
    tools.push({
      name: 'pmd',
      type: 'lint',
      command: pomExists ? 'mvn pmd:check' : './gradlew pmdMain',
      available: pmdConfig,
      description: 'PMD source code analyzer',
      language: 'java',
      priority: 6
    });

    // JaCoCo - Code coverage
    const jacocoConfig = await this.hasJacocoConfig(projectRoot);
    tools.push({
      name: 'jacoco',
      type: 'coverage',
      command: pomExists ? 'mvn jacoco:report' : './gradlew jacocoTestReport',
      available: jacocoConfig,
      description: 'JaCoCo code coverage',
      language: 'java',
      priority: 6
    });

    // SonarQube - Code quality platform
    const sonarConfig = await this.findConfigFile(projectRoot, ['sonar-project.properties']);
    const sonarAvailable = await this.isToolAvailable('sonar-scanner') || sonarConfig !== undefined;
    tools.push({
      name: 'sonarqube',
      type: 'lint',
      configFile: sonarConfig,
      command: 'sonar-scanner',
      available: sonarAvailable,
      description: 'SonarQube code quality analysis',
      language: 'java',
      priority: 5
    });

    // OWASP Dependency Check - Security
    const owaspConfig = await this.hasOwaspDependencyCheck(projectRoot);
    tools.push({
      name: 'dependency-check',
      type: 'security',
      command: pomExists ? 'mvn org.owasp:dependency-check-maven:check' : './gradlew dependencyCheckAnalyze',
      available: owaspConfig,
      description: 'OWASP Dependency Check for vulnerabilities',
      language: 'java',
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
      case 'maven':
        if (args.length === 0) {
          fullArgs = ['compile'];
        }
        command = `mvn ${fullArgs.join(' ')}`;
        break;
      
      case 'gradle':
        if (args.length === 0) {
          fullArgs = ['build'];
        }
        command = `${tool.command} ${fullArgs.join(' ')}`;
        break;
      
      case 'junit':
        // Test command already includes 'test'
        if (args.length > 0) {
          command = `${tool.command} ${args.join(' ')}`;
        }
        break;
      
      case 'spotbugs':
        if (args.length > 0) {
          command = `${tool.command} ${args.join(' ')}`;
        }
        break;
      
      case 'checkstyle':
        if (args.length > 0) {
          command = `${tool.command} ${args.join(' ')}`;
        }
        break;
      
      case 'pmd':
        if (args.length > 0) {
          command = `${tool.command} ${args.join(' ')}`;
        }
        break;
      
      case 'jacoco':
        if (args.length > 0) {
          command = `${tool.command} ${args.join(' ')}`;
        }
        break;
      
      case 'sonarqube':
        if (args.length === 0) {
          fullArgs = ['-Dsonar.projectBaseDir=' + projectRoot];
        }
        command = `sonar-scanner ${fullArgs.join(' ')}`;
        break;
      
      case 'dependency-check':
        if (args.length > 0) {
          command = `${tool.command} ${args.join(' ')}`;
        }
        break;
      
      default:
        command = `${tool.command} ${fullArgs.join(' ')}`;
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectRoot,
        timeout: 120000 // 2 minute timeout for Java builds
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

    // Build tool recommendation
    if (!availableNames.has('maven') && !availableNames.has('gradle')) {
      recommendations.push({
        tool: 'maven',
        reason: 'Essential build tool for Java projects',
        priority: 'high',
        installCommand: 'Download from https://maven.apache.org/',
        configExample: `<!-- pom.xml -->
<project>
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>my-app</artifactId>
  <version>1.0.0</version>
  <properties>
    <maven.compiler.source>11</maven.compiler.source>
    <maven.compiler.target>11</maven.compiler.target>
  </properties>
</project>`
      });
    }

    // Testing framework
    if (!availableNames.has('junit')) {
      recommendations.push({
        tool: 'junit',
        reason: 'Essential testing framework for Java',
        priority: 'high',
        installCommand: 'Add to pom.xml or build.gradle',
        configExample: `<!-- Maven pom.xml -->
<dependency>
  <groupId>junit</groupId>
  <artifactId>junit</artifactId>
  <version>4.13.2</version>
  <scope>test</scope>
</dependency>`
      });
    }

    // Static analysis
    if (!availableNames.has('spotbugs') && !availableNames.has('pmd')) {
      recommendations.push({
        tool: 'spotbugs',
        reason: 'Static analysis helps identify bugs and code quality issues',
        priority: 'medium',
        installCommand: 'Add SpotBugs plugin to build configuration',
        configExample: `<!-- Maven pom.xml -->
<plugin>
  <groupId>com.github.spotbugs</groupId>
  <artifactId>spotbugs-maven-plugin</artifactId>
  <version>4.7.2.1</version>
</plugin>`
      });
    }

    // Code style
    if (!availableNames.has('checkstyle')) {
      recommendations.push({
        tool: 'checkstyle',
        reason: 'Enforces coding standards and style consistency',
        priority: 'medium',
        installCommand: 'Add Checkstyle plugin to build configuration',
        configExample: `<!-- Maven pom.xml -->
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-checkstyle-plugin</artifactId>
  <version>3.2.0</version>
</plugin>`
      });
    }

    // Code coverage
    if (!availableNames.has('jacoco')) {
      recommendations.push({
        tool: 'jacoco',
        reason: 'Code coverage measurement helps identify untested code',
        priority: 'medium',
        installCommand: 'Add JaCoCo plugin to build configuration',
        configExample: `<!-- Maven pom.xml -->
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.8</version>
</plugin>`
      });
    }

    return recommendations;
  }

  private async isToolAvailable(toolName: string): Promise<boolean> {
    try {
      let checkCommand = `${toolName} --version`;
      if (toolName === 'mvn') checkCommand = 'mvn --version';
      if (toolName === 'gradle') checkCommand = 'gradle --version';
      
      execSync(checkCommand, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  private async getToolVersion(toolName: string): Promise<string> {
    try {
      let versionCommand = `${toolName} --version`;
      if (toolName === 'mvn') versionCommand = 'mvn --version';
      if (toolName === 'gradle') versionCommand = 'gradle --version';
      
      const { stdout } = await execAsync(versionCommand);
      
      switch (toolName) {
        case 'maven':
          const mavenMatch = stdout.match(/Apache Maven (\d+\.\d+\.\d+)/);
          return mavenMatch ? mavenMatch[1] : 'unknown';
        case 'gradle':
          const gradleMatch = stdout.match(/Gradle (\d+\.\d+)/);
          return gradleMatch ? gradleMatch[1] : 'unknown';
        default:
          const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/);
          return versionMatch ? versionMatch[1] : 'unknown';
      }
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

  private async hasSpotBugsConfig(projectRoot: string): Promise<boolean> {
    // Check for SpotBugs in pom.xml or build.gradle
    try {
      const pomPath = join(projectRoot, 'pom.xml');
      const pomContent = await readFile(pomPath, 'utf-8');
      if (pomContent.includes('spotbugs')) return true;
    } catch {}

    try {
      const gradlePath = join(projectRoot, 'build.gradle');
      const gradleContent = await readFile(gradlePath, 'utf-8');
      if (gradleContent.includes('spotbugs')) return true;
    } catch {}

    return false;
  }

  private async hasCheckstyleConfig(projectRoot: string): Promise<boolean> {
    // Check for dedicated config file or build config
    if (await this.findConfigFile(projectRoot, ['checkstyle.xml', 'config/checkstyle/checkstyle.xml'])) {
      return true;
    }

    try {
      const pomPath = join(projectRoot, 'pom.xml');
      const pomContent = await readFile(pomPath, 'utf-8');
      if (pomContent.includes('checkstyle')) return true;
    } catch {}

    try {
      const gradlePath = join(projectRoot, 'build.gradle');
      const gradleContent = await readFile(gradlePath, 'utf-8');
      if (gradleContent.includes('checkstyle')) return true;
    } catch {}

    return false;
  }

  private async hasPmdConfig(projectRoot: string): Promise<boolean> {
    try {
      const pomPath = join(projectRoot, 'pom.xml');
      const pomContent = await readFile(pomPath, 'utf-8');
      if (pomContent.includes('pmd')) return true;
    } catch {}

    try {
      const gradlePath = join(projectRoot, 'build.gradle');
      const gradleContent = await readFile(gradlePath, 'utf-8');
      if (gradleContent.includes('pmd')) return true;
    } catch {}

    return false;
  }

  private async hasJacocoConfig(projectRoot: string): Promise<boolean> {
    try {
      const pomPath = join(projectRoot, 'pom.xml');
      const pomContent = await readFile(pomPath, 'utf-8');
      if (pomContent.includes('jacoco')) return true;
    } catch {}

    try {
      const gradlePath = join(projectRoot, 'build.gradle');
      const gradleContent = await readFile(gradlePath, 'utf-8');
      if (gradleContent.includes('jacoco')) return true;
    } catch {}

    return false;
  }

  private async hasOwaspDependencyCheck(projectRoot: string): Promise<boolean> {
    try {
      const pomPath = join(projectRoot, 'pom.xml');
      const pomContent = await readFile(pomPath, 'utf-8');
      if (pomContent.includes('dependency-check')) return true;
    } catch {}

    try {
      const gradlePath = join(projectRoot, 'build.gradle');
      const gradleContent = await readFile(gradlePath, 'utf-8');
      if (gradleContent.includes('dependency-check')) return true;
    } catch {}

    return false;
  }

  private parseToolOutput(toolName: string, stdout: string, stderr: string, projectRoot: string): ToolIssue[] {
    const issues: ToolIssue[] = [];
    const output = stdout + '\n' + stderr;

    switch (toolName) {
      case 'maven':
      case 'gradle':
        // Parse compilation errors
        const compileLines = output.split('\n');
        for (const line of compileLines) {
          const match = line.match(/(.+\.java):\[(\d+),(\d+)\] (.+)/);
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

      case 'junit':
        // Parse test failures
        if (output.includes('FAILURE')) {
          const testLines = output.split('\n');
          let currentTest = '';
          for (const line of testLines) {
            if (line.includes('Test') && line.includes('.java')) {
              const testMatch = line.match(/(.+\.java)/);
              if (testMatch) currentTest = testMatch[1];
            }
            if (line.includes('FAILURE') && currentTest) {
              issues.push({
                file: currentTest,
                severity: 'error',
                message: 'Test failure',
                category: 'test'
              });
            }
          }
        }
        break;

      case 'spotbugs':
        // SpotBugs typically outputs XML, would need XML parsing for full support
        if (output.includes('Bug')) {
          const bugLines = output.split('\n');
          for (const line of bugLines) {
            if (line.includes('.java') && line.includes('Bug')) {
              const match = line.match(/(.+\.java):(\d+)/);
              if (match) {
                issues.push({
                  file: match[1],
                  line: parseInt(match[2]),
                  severity: 'warning',
                  message: 'SpotBugs issue detected',
                  category: 'bug_detection'
                });
              }
            }
          }
        }
        break;

      case 'checkstyle':
        const checkstyleLines = output.split('\n');
        for (const line of checkstyleLines) {
          const match = line.match(/\[(.+)\] (.+\.java):(\d+):(\d+): (.+) \[(.+)\]/);
          if (match) {
            issues.push({
              file: match[2],
              line: parseInt(match[3]),
              column: parseInt(match[4]),
              severity: match[1].toLowerCase() === 'error' ? 'error' : 'warning',
              message: match[5],
              rule: match[6],
              category: 'style'
            });
          }
        }
        break;

      case 'pmd':
        const pmdLines = output.split('\n');
        for (const line of pmdLines) {
          const match = line.match(/(.+\.java):(\d+):(\d+): (.+)/);
          if (match) {
            issues.push({
              file: match[1],
              line: parseInt(match[2]),
              column: parseInt(match[3]),
              severity: 'warning',
              message: match[4],
              category: 'code_quality'
            });
          }
        }
        break;
    }

    return issues;
  }
}