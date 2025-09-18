import { MindMapEngine } from '../core/MindMapEngine.js';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware.js';
import { ResponseFormatter } from '../middleware/ResponseFormatter.js';

export class AnalysisHandlers {
  constructor(private mindMap: MindMapEngine) {}

  async handlePredictErrors(args: {
    file_path?: string;
    risk_threshold?: number;
    limit?: number;
  }) {
    const { file_path, risk_threshold = 0.2, limit = 10 } = args;

    // Validate inputs
    ValidationMiddleware.validateFilePath(file_path);
    ValidationMiddleware.validateNumericRange(risk_threshold, 0, 1, 'risk_threshold');
    ValidationMiddleware.validateNumericRange(limit, 1, 50, 'limit');

    const predictions = this.mindMap.predictPotentialErrors(file_path);
    const filteredPredictions = predictions
      .filter(p => p.riskScore >= risk_threshold)
      .slice(0, limit);

    if (filteredPredictions.length === 0) {
      const text = `No potential errors found above risk threshold ${risk_threshold}.\nThis suggests your code has good patterns and low error risk based on historical data.`;
      return ResponseFormatter.formatSuccessResponse(text);
    }

    let text = `🔍 Predictive Error Analysis Results:\n`;
    text += `Found ${filteredPredictions.length} potential issues (filtered by risk >= ${risk_threshold}):\n\n`;

    filteredPredictions.forEach((prediction, i) => {
      text += `${i + 1}. ${prediction.type.toUpperCase()} RISK (${(prediction.riskScore * 100).toFixed(1)}% likelihood)\n`;
      text += `   File: ${prediction.filePath}\n`;
      if (prediction.functionName) {
        text += `   Function: ${prediction.functionName}\n`;
      }
      text += `   Issue: ${prediction.message}\n`;
      text += `   Based on: ${prediction.basedOnPattern}\n`;

      if (prediction.suggestedActions.length > 0) {
        text += `   Suggestions:\n`;
        prediction.suggestedActions.forEach(action => {
          text += `   - ${action}\n`;
        });
      }
      text += '\n';
    });

    text += `💡 Analysis based on code patterns, historical errors, and structural complexity.\n`;
    text += `Higher risk scores indicate greater likelihood of encountering issues.`;

    return ResponseFormatter.formatSuccessResponse(text);
  }

  async handleSuggestFixes(args: {
    error_message: string;
    error_type?: string;
    file_path?: string;
    function_name?: string;
    line_number?: number;
    limit?: number;
  }) {
    const { error_message, error_type, file_path, function_name, line_number, limit = 5 } = args;

    // Validate inputs
    ValidationMiddleware.validateErrorMessage(error_message);
    ValidationMiddleware.validateFilePath(file_path);
    ValidationMiddleware.validateNumericRange(limit, 1, 20, 'limit');

    // Build context for the fix suggestions
    const context: any = {
      filePath: file_path,
      functionName: function_name,
      lineNumber: line_number
    };

    const suggestions = this.mindMap.suggestFixes(error_message, error_type, file_path, context);
    const limitedSuggestions = suggestions.slice(0, limit);

    if (limitedSuggestions.length === 0) {
      const text = `No specific fix suggestions found for this error type.\n\n` +
        `Error: "${error_message}"\n\n` +
        `This might be a novel error pattern. Consider:\n` +
        `- Checking the documentation for the relevant technology\n` +
        `- Searching for similar errors online\n` +
        `- Asking for help on developer forums\n\n` +
        `Once you fix this error, use update_mindmap to help the system learn for future cases.`;
      return ResponseFormatter.formatSuccessResponse(text);
    }

    let text = `🔧 Fix Suggestions for Error:\n`;
    text += `"${error_message}"\n\n`;

    if (file_path) {
      text += `📍 Location: ${file_path}`;
      if (function_name) text += ` → ${function_name}()`;
      if (line_number) text += ` (line ${line_number})`;
      text += '\n\n';
    }

    text += `Found ${limitedSuggestions.length} fix suggestion(s):\n\n`;

    limitedSuggestions.forEach((suggestion, i) => {
      text += `${i + 1}. ${suggestion.title} (${(suggestion.confidence * 100).toFixed(0)}% confidence)\n`;
      text += `   Description: ${suggestion.description}\n`;
      text += `   Category: ${suggestion.category.toUpperCase()}\n`;
      text += `   Effort: ${suggestion.estimatedEffort} | Risk: ${suggestion.riskLevel}\n`;

      if (suggestion.historicalSuccess) {
        text += `   📊 Success: This fix worked ${suggestion.historicalSuccess} time(s) before\n`;
      }

      if (suggestion.commands.length > 0) {
        text += `   💻 Commands to run:\n`;
        suggestion.commands.forEach(cmd => {
          text += `   $ ${cmd}\n`;
        });
      }

      if (suggestion.codeChanges.length > 0) {
        text += `   📝 Code changes:\n`;
        suggestion.codeChanges.forEach(change => {
          text += `   - ${change}\n`;
        });
      }
      text += '\n';
    });

    text += `💡 Suggestions are ranked by confidence and historical success.\n`;
    text += `After applying a fix, use update_mindmap to improve future suggestions.`;

    return ResponseFormatter.formatSuccessResponse(text);
  }

  async handleAnalyzeArchitecture(args: {
    pattern_type?: 'architectural' | 'design' | 'structural';
    min_confidence?: number;
    limit?: number;
  }) {
    const { pattern_type, min_confidence = 0.3, limit = 10 } = args;

    // Validate inputs
    ValidationMiddleware.validateNumericRange(min_confidence, 0, 1, 'min_confidence');
    ValidationMiddleware.validateNumericRange(limit, 1, 50, 'limit');

    let insights = await this.mindMap.getArchitecturalInsights();

    // Debug: Check what we actually got
    console.log('Architectural insights type:', typeof insights);
    console.log('Architectural insights:', insights);

    // Ensure insights is an array
    if (!Array.isArray(insights)) {
      console.warn('getArchitecturalInsights returned non-array:', insights);
      insights = [];
    }

    // Filter by pattern type if specified
    if (pattern_type) {
      insights = insights.filter(insight => insight.patternType === pattern_type);
    }

    // Filter by confidence threshold
    insights = insights.filter(insight => insight.confidence >= min_confidence);

    // Apply limit
    insights = insights.slice(0, limit);

    if (insights.length === 0) {
      let message = `No architectural patterns detected above ${(min_confidence * 100).toFixed(0)}% confidence threshold.`;
      if (pattern_type) {
        message = `No ${pattern_type} patterns detected above ${(min_confidence * 100).toFixed(0)}% confidence threshold.`;
      }
      message += '\n\nThis could mean:\n';
      message += '- The project has a simple or flat structure\n';
      message += '- Patterns are too subtle to detect automatically\n';
      message += '- Lower the confidence threshold to see more potential patterns';

      return ResponseFormatter.formatSuccessResponse(message);
    }

    let text = `🏗️ Architectural Analysis Results:\n`;
    text += `Found ${insights.length} pattern(s)`;
    if (pattern_type) {
      text += ` of type '${pattern_type}'`;
    }
    text += ` above ${(min_confidence * 100).toFixed(0)}% confidence:\n\n`;

    insights.forEach((insight, i) => {
      text += `${i + 1}. ${insight.name} (${(insight.confidence * 100).toFixed(0)}% confidence)\n`;
      text += `   Type: ${insight.patternType.toUpperCase()}\n`;
      text += `   Description: ${insight.description}\n`;

      if (insight.evidence.length > 0) {
        text += `   Evidence:\n`;
        insight.evidence.slice(0, 3).forEach(evidence => { // Show max 3 evidence items
          text += `   - ${evidence}\n`;
        });
        if (insight.evidence.length > 3) {
          text += `   - ... and ${insight.evidence.length - 3} more\n`;
        }
      }

      if (insight.affectedFiles.length > 0) {
        text += `   Key Files: ${insight.affectedFiles.slice(0, 3).join(', ')}`;
        if (insight.affectedFiles.length > 3) {
          text += ` (+ ${insight.affectedFiles.length - 3} more)`;
        }
        text += '\n';
      }

      if (insight.recommendations.length > 0) {
        text += `   💡 Recommendations:\n`;
        insight.recommendations.slice(0, 2).forEach(rec => { // Show max 2 recommendations
          text += `   - ${rec}\n`;
        });
      }
      text += '\n';
    });

    text += `📊 Analysis based on file structure, naming patterns, and code organization.\n`;
    text += `Higher confidence scores indicate stronger pattern evidence.`;

    return ResponseFormatter.formatSuccessResponse(text);
  }

  async handleGetInsights(args: {
    categories?: string[];
    min_confidence?: number;
    actionable_only?: boolean;
  }) {
    console.log('DEBUG: handleGetInsights called with args:', args);

    const {
      categories,
      min_confidence = 0.5,
      actionable_only = false
    } = args;

    console.log('DEBUG: Extracted parameters - min_confidence:', min_confidence, 'actionable_only:', actionable_only);

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Analysis timeout after 15 seconds')), 15000);
    });

    console.log('DEBUG: About to call generateInsights...');
    const analysisResult = await Promise.race([
      this.mindMap.generateInsights(),
      timeoutPromise
    ]).catch(err => {
      console.error('Analysis failed or timed out:', err);
      return null;
    });

    console.log('DEBUG: generateInsights completed or timed out');

    // Debug: Check what we actually got
    console.log('generateInsights result type:', typeof analysisResult);
    console.log('generateInsights result:', analysisResult);

    let text = `🧠 Project Insights:\n\n`;

    // Handle null/timeout case
    if (!analysisResult) {
      text += `❌ Analysis failed or timed out. This could be due to:\n`;
      text += `• Complex project structure requiring more processing time\n`;
      text += `• Incomplete project scan - try running scan_project first\n`;
      text += `• System resource constraints\n\n`;
      text += `💡 Try: scan_project with force_rescan=true, then retry\n`;
    }
    // generateInsights returns an AnalysisResult object, not an array
    else if (analysisResult && typeof analysisResult === 'object') {
      console.log('DEBUG: Processing analysis result with actionable_only:', actionable_only);

      // Filter results based on parameters
      let filteredResult = analysisResult;

      // Apply confidence filtering
      if (min_confidence > 0) {
        console.log('DEBUG: Applying confidence filter:', min_confidence);
        // Filter architectural insights by confidence
        if (Array.isArray(filteredResult.architectural)) {
          filteredResult.architectural = filteredResult.architectural.filter((item: any) =>
            !item.confidence || item.confidence >= min_confidence
          );
        }
      }

      // Apply actionable_only filtering
      if (actionable_only) {
        console.log('DEBUG: Applying actionable_only filter');
        text += `📊 Actionable Insights (Confidence ≥ ${min_confidence}):\n\n`;

        // Only show insights with specific recommendations
        if (Array.isArray(filteredResult.architectural)) {
          const actionableArchitectural = filteredResult.architectural.filter((item: any) =>
            item.recommendations && Array.isArray(item.recommendations) && item.recommendations.length > 0
          );
          if (actionableArchitectural.length > 0) {
            text += `**🏗️ Architecture Actions:** ${actionableArchitectural.length} items\n`;
          }
        }

        if (Array.isArray(filteredResult.errorPredictions) && filteredResult.errorPredictions.length > 0) {
          text += `**⚠️ Error Prevention:** ${filteredResult.errorPredictions.length} items\n`;
        }

        if (filteredResult.recommendations && Array.isArray(filteredResult.recommendations) && filteredResult.recommendations.length > 0) {
          text += `**💡 Recommendations:** ${filteredResult.recommendations.length} items\n`;
        }
      } else {
        text += `📊 Comprehensive Analysis Results:\n\n`;

        if (filteredResult.architectural) {
          text += `**🏗️ Architecture:** ${Array.isArray(filteredResult.architectural) ? filteredResult.architectural.length : 0} insights\n`;
        }
        if (filteredResult.frameworks) {
          text += `**🎯 Frameworks:** ${Array.isArray(filteredResult.frameworks) ? filteredResult.frameworks.length : 0} detected\n`;
        }
        if (filteredResult.tooling) {
          text += `**🔧 Tooling:** Analysis completed\n`;
        }
        if (filteredResult.errorPredictions) {
          text += `**⚠️ Error Predictions:** ${Array.isArray(filteredResult.errorPredictions) ? filteredResult.errorPredictions.length : 0} potential issues\n`;
        }
      }
      text += `\n`;
      console.log('DEBUG: Finished processing analysis result');
    }

    console.log('DEBUG: About to return result from handleGetInsights');
    return ResponseFormatter.formatSuccessResponse(text);
  }

  async handleDetectCrossLanguageAPIs(args: {
    api_types?: ('REST' | 'GraphQL' | 'gRPC' | 'WebSocket' | 'WebAssembly')[];
    min_confidence?: number;
    include_schemas?: boolean;
  }) {
    try {
      const { api_types, min_confidence = 0.3, include_schemas = true } = args;

      // Validate inputs
      ValidationMiddleware.validateNumericRange(min_confidence, 0, 1, 'min_confidence');

      await this.mindMap.initialize();

      // Use the MindMapEngine's analysis service to run API detection
      const result = await this.mindMap.detectCrossLanguageAPIs({
        apiTypes: api_types,
        minConfidence: min_confidence,
        includeSchemas: include_schemas
      });

      let text = '🌐 Cross-Language API Detection Results\n';
      text += '=' .repeat(50) + '\n\n';

      text += `📊 **Summary:**\n`;
      text += `• Total Endpoints: ${result.totalEndpoints}\n`;
      text += `• API Coverage: ${result.apiCoverage.toFixed(1)}% of files contain APIs\n\n`;

      if (result.endpointsByType.size > 0) {
        text += `🎯 **API Types Found:**\n`;
        for (const [type, count] of result.endpointsByType) {
          text += `• ${type}: ${count} endpoint${count !== 1 ? 's' : ''}\n`;
        }
        text += '\n';
      }

      if (result.endpointsByLanguage.size > 0) {
        text += `🗣️ **Languages with APIs:**\n`;
        for (const [language, count] of result.endpointsByLanguage) {
          text += `• ${language}: ${count} endpoint${count !== 1 ? 's' : ''}\n`;
        }
        text += '\n';
      }

      if (result.endpoints.length > 0) {
        text += `🔍 **Detected Endpoints:**\n`;
        result.endpoints.slice(0, 15).forEach((endpoint, i) => {
          text += `${i + 1}. **${endpoint.type}** ${endpoint.method ? `${endpoint.method} ` : ''}${endpoint.path}\n`;
          text += `   📁 File: ${endpoint.filePath.split('/').slice(-2).join('/')}\n`;
          text += `   🗣️ Language: ${endpoint.language}${endpoint.framework ? ` (${endpoint.framework})` : ''}\n`;
          text += `   🎯 Confidence: ${(endpoint.confidence * 100).toFixed(0)}%\n`;
          if (endpoint.requestFormat || endpoint.responseFormat) {
            text += `   📋 Format: ${endpoint.requestFormat || 'unknown'} → ${endpoint.responseFormat || 'unknown'}\n`;
          }
          text += '\n';
        });

        if (result.endpoints.length > 15) {
          text += `... and ${result.endpoints.length - 15} more endpoints\n\n`;
        }
      }

      if (include_schemas && result.schemas) {
        const { openapi = [], graphql = [], grpc = [], wasm = [] } = result.schemas;
        const totalSchemas = openapi.length + graphql.length + grpc.length + wasm.length;

        if (totalSchemas > 0) {
          text += `📄 **Schema Files Found:**\n`;
          if (openapi.length > 0) text += `• OpenAPI/Swagger: ${openapi.length} file${openapi.length !== 1 ? 's' : ''}\n`;
          if (graphql.length > 0) text += `• GraphQL: ${graphql.length} file${graphql.length !== 1 ? 's' : ''}\n`;
          if (grpc.length > 0) text += `• gRPC Protocol Buffers: ${grpc.length} file${grpc.length !== 1 ? 's' : ''}\n`;
          if (wasm.length > 0) text += `• WebAssembly: ${wasm.length} file${wasm.length !== 1 ? 's' : ''}\n`;
          text += '\n';
        }
      }

      if (result.totalEndpoints === 0) {
        text += `ℹ️ No API endpoints found with confidence >= ${(min_confidence * 100).toFixed(0)}%\n`;
        text += `Try lowering the min_confidence threshold or check if your project contains API code.\n\n`;
        text += `📚 **Supported Patterns:**\n`;
        text += `• **REST**: Flask (@app.route), Express (app.get/post), Spring Boot (@RequestMapping)\n`;
        text += `• **GraphQL**: Schema definitions, resolvers, typeDefs\n`;
        text += `• **gRPC**: Protocol buffer files (.proto), service definitions\n`;
        text += `• **WebSocket**: Socket.IO, native WebSocket implementations\n`;
        text += `• **WebAssembly**: .wasm/.wat files, FFI bindings\n`;
      } else {
        text += `✅ **API detection completed successfully!**\n`;
        text += `Found ${result.totalEndpoints} endpoints across ${result.endpointsByLanguage.size} language${result.endpointsByLanguage.size !== 1 ? 's' : ''}\n`;
      }

      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('detect_cross_language_apis', error);
    }
  }

  async handleAnalyzeTestCoverage(args: {
    include_orphans?: boolean;
    include_untested?: boolean;
    min_confidence?: number;
    group_by?: 'file' | 'directory' | 'module';
  }) {
    try {
      const {
        include_orphans = true,
        include_untested = false,
        min_confidence = 0.5,
        group_by = 'file'
      } = args;

      // Validate inputs
      ValidationMiddleware.validateNumericRange(min_confidence, 0, 1, 'min_confidence');

      await this.mindMap.initialize();

      // Use the MindMapEngine's analysis service to analyze test coverage
      const result = await this.mindMap.analyzeTestCoverage({
        includeOrphans: include_orphans,
        includeUntested: include_untested,
        minConfidence: min_confidence,
        groupBy: group_by
      });

      let text = '🧪 Test Coverage Mapping Analysis\n';
      text += '=' .repeat(50) + '\n\n';

      text += `📊 **Coverage Summary:**\n`;
      text += `• Total Implementation Files: ${result.totalImplementationFiles}\n`;
      text += `• Total Test Files: ${result.totalTestFiles}\n`;
      text += `• Files with Tests: ${result.filesWithTests} (${result.coveragePercentage.toFixed(1)}%)\n`;
      text += `• Files without Tests: ${result.filesWithoutTests}\n\n`;

      if (result.mappings.length > 0) {
        text += `🔗 **Test-to-Implementation Mappings:**\n\n`;

        if (group_by === 'directory') {
          // Group by directory
          const byDirectory = new Map<string, any[]>();
          result.mappings.forEach(mapping => {
            const dir = mapping.implementationFile.substring(0, mapping.implementationFile.lastIndexOf('/'));
            if (!byDirectory.has(dir)) {
              byDirectory.set(dir, []);
            }
            byDirectory.get(dir)?.push(mapping);
          });

          for (const [dir, mappings] of byDirectory) {
            text += `📁 **${dir.split('/').slice(-2).join('/')}**\n`;
            mappings.forEach((m, i) => {
              const implFile = m.implementationFile.split('/').pop();
              const testFile = m.testFile.split('/').pop();
              text += `  ${i + 1}. ${implFile} ← ${testFile} (${(m.confidence * 100).toFixed(0)}%)\n`;
            });
            text += '\n';
          }
        } else {
          // Default file-by-file view
          result.mappings.slice(0, 20).forEach((mapping, i) => {
            text += `${i + 1}. **${mapping.implementationFile.split('/').pop()}**\n`;
            text += `   ✅ Test: ${mapping.testFile.split('/').pop()}\n`;
            text += `   🎯 Confidence: ${(mapping.confidence * 100).toFixed(0)}%\n`;
            text += `   📊 Match Type: ${mapping.matchType}\n\n`;
          });
        }

        if (result.mappings.length > 20) {
          text += `... and ${result.mappings.length - 20} more mappings\n\n`;
        }
      }

      if (include_orphans && result.orphanImplementationFiles.length > 0) {
        text += `⚠️ **Implementation Files Without Tests:**\n`;
        result.orphanImplementationFiles.slice(0, 10).forEach((file, i) => {
          text += `${i + 1}. ${file.split('/').slice(-2).join('/')}\n`;
        });
        if (result.orphanImplementationFiles.length > 10) {
          text += `... and ${result.orphanImplementationFiles.length - 10} more files\n`;
        }
        text += '\n';
      }

      if (include_untested && result.untestedTestFiles.length > 0) {
        text += `❓ **Test Files Without Clear Targets:**\n`;
        result.untestedTestFiles.slice(0, 10).forEach((file, i) => {
          text += `${i + 1}. ${file.split('/').slice(-2).join('/')}\n`;
        });
        if (result.untestedTestFiles.length > 10) {
          text += `... and ${result.untestedTestFiles.length - 10} more files\n`;
        }
        text += '\n';
      }

      text += `✅ **Test coverage mapping completed successfully!**\n`;
      text += `Achieved ${result.mappingAccuracy.toFixed(1)}% mapping accuracy (target: 95%)\n`;

      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('analyze_test_coverage', error);
    }
  }
}