import { MindMapEngine } from '../core/MindMapEngine.js';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware.js';
import { ResponseFormatter } from '../middleware/ResponseFormatter.js';

export class ToolingHandlers {
  constructor(private mindMap: MindMapEngine) {}

  async handleDetectProjectTooling(args: {
    force_refresh?: boolean;
    language_filter?: string[];
  }) {
    const { force_refresh = false, language_filter } = args;

    const toolingByLanguage = await this.mindMap.detectProjectTooling(language_filter, force_refresh);

    // Filter by languages if specified
    let filteredTooling = toolingByLanguage;
    if (language_filter && language_filter.length > 0) {
      filteredTooling = new Map();
      for (const lang of language_filter) {
        if (toolingByLanguage.has(lang)) {
          filteredTooling.set(lang, toolingByLanguage.get(lang)!);
        }
      }
    }

    let text = `🔧 Project Development Tools Detected:\n\n`;

    if (filteredTooling.size === 0) {
      text += 'No development tools detected for the specified languages.';
    } else {
      for (const [language, tools] of filteredTooling) {
        text += `**${language.toUpperCase()} (${tools.length} tools):**\n`;

        const availableTools = tools.filter(t => t.available);
        const unavailableTools = tools.filter(t => !t.available);

        if (availableTools.length > 0) {
          text += `  ✅ Available:\n`;
          for (const tool of availableTools) {
            const version = tool.version ? ` v${tool.version}` : '';
            text += `    • ${tool.name}${version} (${tool.type}) - ${tool.description}\n`;
          }
        }

        if (unavailableTools.length > 0) {
          text += `  ❌ Missing:\n`;
          for (const tool of unavailableTools) {
            text += `    • ${tool.name} (${tool.type}) - ${tool.description}\n`;
          }
        }
        text += '\n';
      }
    }

    return ResponseFormatter.formatSuccessResponse(text);
  }

  async handleRunLanguageTool(args: {
    tool_name: string;
    language: string;
    args?: string[];
    timeout?: number;
  }) {
    const { tool_name, language, args: toolArgs = [], timeout = 120000 } = args;

    ValidationMiddleware.validateToolName(tool_name);
    ValidationMiddleware.validateLanguage(language);

    try {
      const toolingByLanguage = await this.mindMap.detectProjectTooling();
      const languageTools = toolingByLanguage.get(language);

      if (!languageTools) {
        const text = `❌ No tools detected for language: ${language}`;
        return ResponseFormatter.formatSuccessResponse(text);
      }

      const tool = languageTools.find(t => t.name === tool_name);
      if (!tool) {
        const availableTools = languageTools.map(t => t.name).join(', ');
        const text = `❌ Tool '${tool_name}' not found for ${language}.\nAvailable tools: ${availableTools}`;
        return ResponseFormatter.formatSuccessResponse(text);
      }

      if (!tool.available) {
        const text = `❌ Tool '${tool_name}' is not available. Please install it first.`;
        return ResponseFormatter.formatSuccessResponse(text);
      }

      const result = await this.mindMap.runLanguageTool(tool.name, language, toolArgs);

      let text = `🔧 **${tool.name}** Results:\n\n`;
      text += `⏱️  Duration: ${result.duration}ms\n`;
      text += `📊 Status: ${result.success ? '✅ Success' : '❌ Failed'} (exit code: ${result.exitCode})\n\n`;

      if (result.issues && result.issues.length > 0) {
        text += `🚨 **Issues Found (${result.issues.length}):**\n`;
        for (const issue of result.issues.slice(0, 20)) { // Limit to first 20 issues
          const location = issue.line ? `${issue.file}:${issue.line}` : issue.file;
          const severity = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
          text += `${severity} ${location}: ${issue.message}`;
          if (issue.rule) text += ` [${issue.rule}]`;
          text += '\n';
        }

        if (result.issues.length > 20) {
          text += `\n... and ${result.issues.length - 20} more issues`;
        }
      } else {
        text += result.success ? '✅ No issues found!' : '❌ Tool execution failed';
      }

      if (result.stderr && result.stderr.trim()) {
        text += `\n\n**Error Output:**\n\`\`\`\n${result.stderr.slice(0, 500)}\n\`\`\``;
      }

      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('run_language_tool', error);
    }
  }

  async handleGetToolingRecommendations(args: {
    priority_filter?: string;
    include_install_commands?: boolean;
  }) {
    const { priority_filter = 'all', include_install_commands = true } = args;

    const recommendations = await this.mindMap.getToolingRecommendations();

    let text = `💡 Development Tool Recommendations:\n\n`;

    if (recommendations.length === 0) {
      text += 'No specific tool recommendations found. Your tooling setup looks good!';
    } else {
      const filteredRecs = priority_filter === 'all'
        ? recommendations
        : recommendations.filter((r: any) => r.priority === priority_filter);

      for (const rec of filteredRecs) {
        const priorityIcon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        text += `${priorityIcon} **${rec.tool}** (${rec.priority} priority)\n`;
        text += `   ${rec.reason}\n`;

        if (include_install_commands && rec.installCommand) {
          text += `   📥 Install: \`${rec.installCommand}\`\n`;
        }

        if (rec.configExample) {
          text += `   ⚙️ Config example:\n\`\`\`\n${rec.configExample.slice(0, 200)}\n\`\`\`\n`;
        }
        text += '\n';
      }
    }

    return ResponseFormatter.formatSuccessResponse(text);
  }

  async handleRunToolSuite(args: {
    tool_types?: string[];
    languages?: string[];
    parallel?: boolean;
    fail_fast?: boolean;
  }) {
    const { tool_types, languages, parallel = true, fail_fast = false } = args;

    try {
      const toolingByLanguage = await this.mindMap.detectProjectTooling();

      // Filter by languages if specified
      let targetLanguages = languages || Array.from(toolingByLanguage.keys());

      const toolsToRun: any[] = [];
      for (const lang of targetLanguages) {
        const langTools = toolingByLanguage.get(lang);
        if (!langTools) continue;

        const availableTools = langTools.filter(t =>
          t.available &&
          (!tool_types || tool_types.includes(t.type))
        );

        toolsToRun.push(...availableTools);
      }

      if (toolsToRun.length === 0) {
        const text = '❌ No matching tools found to run with the specified criteria.';
        return ResponseFormatter.formatSuccessResponse(text);
      }

      let text = `🔧 Running Tool Suite (${toolsToRun.length} tools)...\n\n`;

      const results = await this.mindMap.runToolSuite({
        tools: toolsToRun,
        parallel,
        fail_fast,
        languages,
        tool_types
      });

      let successCount = 0;
      let totalIssues = 0;

      for (const [toolName, result] of results) {
        const status = result.success ? '✅' : '❌';
        text += `${status} **${toolName}**: ${result.duration}ms`;

        if (result.issues) {
          const errorCount = result.issues.filter(i => i.severity === 'error').length;
          const warningCount = result.issues.filter(i => i.severity === 'warning').length;

          if (errorCount > 0) text += ` (${errorCount} errors`;
          if (warningCount > 0) text += `${errorCount > 0 ? ', ' : ' ('}${warningCount} warnings`;
          if (errorCount > 0 || warningCount > 0) text += ')';

          totalIssues += result.issues.length;
        }

        text += '\n';

        if (result.success) successCount++;

        if (!result.success && fail_fast) {
          text += '\n⚠️  Stopping execution due to failure (fail_fast enabled)';
          break;
        }
      }

      text += `\n📊 **Summary:** ${successCount}/${results.size} tools succeeded, ${totalIssues} total issues found`;

      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('run_tool_suite', error);
    }
  }

  async handleDetectCrossLanguageDeps(args: {
    include_confidence?: boolean;
    dependency_types?: string[];
    min_confidence?: number;
  }) {
    const { include_confidence = true, dependency_types, min_confidence = 0.3 } = args;

    const dependencies = await this.mindMap.detectCrossLanguageDependencies();

    // Filter by dependency types if specified
    let filteredDependencies = dependency_types
      ? dependencies.filter(dep => dependency_types.includes(dep.dependencyType))
      : dependencies;

    // Filter by minimum confidence
    filteredDependencies = filteredDependencies.filter(dep => dep.confidence >= min_confidence);

    const text = filteredDependencies.length > 0
      ? `🔗 Cross-Language Dependencies Found (${filteredDependencies.length}):\n\n` +
        filteredDependencies.map((dep, index) =>
          `${index + 1}. ${dep.sourceLanguage.toUpperCase()} → ${dep.targetLanguage.toUpperCase()}\n` +
          `   Type: ${dep.dependencyType}\n` +
          `   Source: ${dep.sourceFile}\n` +
          `   Target: ${dep.targetFile}\n` +
          (include_confidence ? `   Confidence: ${(dep.confidence * 100).toFixed(1)}%\n` : '') +
          `   Evidence: ${dep.evidence.join(', ')}\n` +
          `   Bidirectional: ${dep.bidirectional ? 'Yes' : 'No'}\n`
        ).join('\n')
      : '🔗 No cross-language dependencies detected above the confidence threshold.';

    return ResponseFormatter.formatSuccessResponse(text);
  }

  async handleAnalyzePolyglotProject(args: {
    include_recommendations?: boolean;
    detailed_frameworks?: boolean;
  }) {
    const { include_recommendations = true, detailed_frameworks = false } = args;

    const analysis = await this.mindMap.analyzePolyglotProject();

    let text = `🌐 Polyglot Project Analysis:\n\n`;

    // Language breakdown
    text += `📊 **Languages (${analysis.languages.size}):**\n`;
    const sortedLanguages = Array.from((analysis.languages as Map<string, any>).entries())
      .sort(([, a], [, b]) => (b as any).fileCount - (a as any).fileCount);

    for (const [lang, data] of sortedLanguages) {
      text += `• ${lang.toUpperCase()}: ${data.fileCount} files`;
      if (detailed_frameworks && data.primaryFrameworks.length > 0) {
        text += ` (${data.primaryFrameworks.join(', ')})`;
      }
      text += `\n`;
    }

    // Architecture style
    text += `\n🏗️ **Architecture Style:** ${analysis.architecturalStyle}\n`;

    // Primary vs secondary languages
    text += `\n🎯 **Primary Language:** ${analysis.primaryLanguage}\n`;
    if (analysis.secondaryLanguages.length > 0) {
      text += `📋 **Secondary Languages:** ${analysis.secondaryLanguages.join(', ')}\n`;
    }

    // Cross-language patterns
    if (analysis.crossLanguagePatterns.length > 0) {
      text += `\n🔄 **Cross-Language Patterns:**\n`;
      for (const pattern of analysis.crossLanguagePatterns) {
        text += `• ${pattern.replace('_', ' ')}\n`;
      }
    }

    // Interoperability patterns
    if (analysis.interopPatterns.length > 0) {
      text += `\n🤝 **Interoperability Patterns:**\n`;
      for (const pattern of analysis.interopPatterns) {
        text += `• **${pattern.type}**: ${pattern.description}\n`;
        text += `  Languages: ${pattern.languages.join(', ')}\n`;
        text += `  Files: ${pattern.files.length} files\n`;
        text += `  Confidence: ${(pattern.confidence * 100).toFixed(1)}%\n\n`;
      }
    }

    // Recommendations
    if (include_recommendations) {
      text += `\n💡 **Recommendations:**\n`;
      if (analysis.architecturalStyle === 'monolithic' && analysis.languages.size > 2) {
        text += `• Consider microservices architecture for better language separation\n`;
      }
      if (analysis.crossLanguagePatterns.includes('rest_api')) {
        text += `• Standardize API interfaces across services\n`;
      }
      if (analysis.crossLanguagePatterns.includes('json_data')) {
        text += `• Consider using schema validation for data exchange\n`;
      }
      if (analysis.languages.size > 3) {
        text += `• Implement centralized configuration management\n`;
        text += `• Consider containerization for deployment consistency\n`;
      }
    }

    return ResponseFormatter.formatSuccessResponse(text);
  }

  async handleGenerateMultiLanguageRefactorings(args: {
    focus_area?: string;
    max_effort?: string;
    include_risks?: boolean;
  }) {
    const { focus_area = 'all', max_effort = 'high', include_risks = true } = args;

    const refactorings = await this.mindMap.generateMultiLanguageRefactorings();

    // Filter by focus area
    let filteredRefactorings = focus_area === 'all'
      ? refactorings
      : refactorings.filter(r => {
          switch (focus_area) {
            case 'architecture': return ['extract_service', 'merge_modules'].includes(r.type);
            case 'dependencies': return ['update_dependencies'].includes(r.type);
            case 'configuration': return ['consolidate_config'].includes(r.type);
            case 'apis': return ['standardize_api'].includes(r.type);
            default: return true;
          }
        });

    // Filter by max effort
    const effortOrder = { 'low': 1, 'medium': 2, 'high': 3 };
    const maxEffortLevel = effortOrder[max_effort as keyof typeof effortOrder] || 3;
    filteredRefactorings = filteredRefactorings.filter(r =>
      effortOrder[r.effort as keyof typeof effortOrder] <= maxEffortLevel
    );

    const text = filteredRefactorings.length > 0
      ? `🔧 Multi-Language Refactoring Suggestions (${filteredRefactorings.length}):\n\n` +
        filteredRefactorings.map((refactoring, index) => {
          let suggestion = `${index + 1}. **${refactoring.description}**\n`;
          suggestion += `   Type: ${refactoring.type}\n`;
          suggestion += `   Languages: ${refactoring.languages.join(', ')}\n`;
          suggestion += `   Impact: ${refactoring.impact} | Effort: ${refactoring.effort}\n`;
          suggestion += `   Files: ${refactoring.files.length} files\n`;

          if (refactoring.benefits.length > 0) {
            suggestion += `   ✅ Benefits:\n`;
            for (const benefit of refactoring.benefits) {
              suggestion += `   • ${benefit}\n`;
            }
          }

          if (include_risks && refactoring.risks.length > 0) {
            suggestion += `   ⚠️ Risks:\n`;
            for (const risk of refactoring.risks) {
              suggestion += `   • ${risk}\n`;
            }
          }

          if (refactoring.steps.length > 0) {
            suggestion += `   📋 Steps:\n`;
            for (let i = 0; i < refactoring.steps.length; i++) {
              suggestion += `   ${i + 1}. ${refactoring.steps[i]}\n`;
            }
          }

          return suggestion;
        }).join('\n')
      : '🔧 No refactoring suggestions found for the specified criteria.';

    return ResponseFormatter.formatSuccessResponse(text);
  }
}