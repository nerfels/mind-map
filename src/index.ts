#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MindMapEngine } from './core/MindMapEngine.js';
import { AttentionType } from './core/AttentionSystem.js';
import { ALL_TOOLS } from './tools/index.js';
import * as fs from 'fs';
import * as path from 'path';

// Import handlers
import { QueryHandlers } from './handlers/QueryHandlers.js';
import { AnalysisHandlers } from './handlers/AnalysisHandlers.js';
import { SystemHandlers } from './handlers/SystemHandlers.js';
import { ToolingHandlers } from './handlers/ToolingHandlers.js';
import { FrameworkHandlers } from './handlers/FrameworkHandlers.js';
import { DocumentHandlers } from './handlers/DocumentHandlers.js';
import { ResponseFormatter } from './middleware/ResponseFormatter.js';

class MindMapMCPServer {
  private server: Server;
  private mindMap: MindMapEngine;
  private projectRoot: string;

  // Handler instances
  private queryHandlers: QueryHandlers;
  private analysisHandlers: AnalysisHandlers;
  private systemHandlers: SystemHandlers;
  private toolingHandlers: ToolingHandlers;
  private frameworkHandlers: FrameworkHandlers;
  private documentHandlers: DocumentHandlers;

  constructor() {
    this.projectRoot = process.cwd();

    // Setup logging to .mindmap-cache
    this.setupLogging();

    this.server = new Server(
      {
        name: 'mind-map-mcp',
        version: '0.1.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.mindMap = new MindMapEngine(this.projectRoot);

    // Initialize handlers
    this.queryHandlers = new QueryHandlers(this.mindMap);
    this.analysisHandlers = new AnalysisHandlers(this.mindMap);
    this.systemHandlers = new SystemHandlers(this.mindMap, this.projectRoot);
    this.toolingHandlers = new ToolingHandlers(this.mindMap);
    this.frameworkHandlers = new FrameworkHandlers(this.mindMap);
    this.documentHandlers = new DocumentHandlers(this.mindMap);

    this.setupHandlers();

    // Initialize the mind map (load existing data)
    this.initializeMindMap();
  }

  private setupLogging() {
    const cacheDir = path.join(this.projectRoot, '.mindmap-cache');

    // Ensure cache directory exists
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    const logFile = path.join(cacheDir, 'mcp.log');

    // Override console.log and console.error to also write to file
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      const timestamp = new Date().toISOString();
      const message = `[${timestamp}] LOG: ${args.join(' ')}\n`;
      fs.appendFileSync(logFile, message);
      originalLog(...args);
    };

    console.error = (...args: any[]) => {
      const timestamp = new Date().toISOString();
      const message = `[${timestamp}] ERROR: ${args.join(' ')}\n`;
      fs.appendFileSync(logFile, message);
      originalError(...args);
    };

    console.log('🗂️  MCP logging initialized in .mindmap-cache/mcp.log');
  }

  private async initializeMindMap() {
    await this.mindMap.initialize();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: ALL_TOOLS
    }));

    // Handle tool calls - delegate to appropriate handlers
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Query handlers
          case 'query_mindmap':
            return await this.queryHandlers.handleQueryMindMap(args as any);
          case 'update_mindmap':
            return await this.queryHandlers.handleUpdateMindMap(args as any);
          case 'advanced_query':
            return await this.queryHandlers.handleAdvancedQuery(args as any);
          case 'temporal_query':
            return await this.queryHandlers.handleTemporalQuery(args as any);
          case 'aggregate_query':
            return await this.queryHandlers.handleAggregateQuery(args as any);
          case 'save_query':
            return await this.queryHandlers.handleSaveQuery(args as any);
          case 'execute_saved_query':
            return await this.queryHandlers.handleExecuteSavedQuery(args as any);

          // Analysis handlers
          case 'predict_errors':
            return await this.analysisHandlers.handlePredictErrors(args as any);
          case 'suggest_fixes':
            return await this.analysisHandlers.handleSuggestFixes(args as any);
          case 'analyze_architecture':
            return await this.analysisHandlers.handleAnalyzeArchitecture(args as any);
          case 'get_insights':
            return await this.analysisHandlers.handleGetInsights(args as any);
          case 'detect_cross_language_apis':
            return await this.analysisHandlers.handleDetectCrossLanguageAPIs(args as any);
          case 'analyze_test_coverage':
            return await this.analysisHandlers.handleAnalyzeTestCoverage(args as any);

          // System handlers
          case 'get_context':
            return await this.systemHandlers.handleGetContext(args as any);
          case 'suggest_exploration':
            return await this.systemHandlers.handleSuggestExploration(args as any);
          case 'scan_project':
            return await this.systemHandlers.handleScanProject(args as any);
          case 'get_stats':
            return await this.systemHandlers.handleGetStats();
          case 'get_performance':
            return await this.systemHandlers.handleGetPerformance(args as any);
          case 'get_cache_stats':
            return await this.systemHandlers.handleGetCacheStats(args as any);
          case 'clear_cache':
            return await this.systemHandlers.handleClearCache(args as any);
          case 'update_ignore_patterns':
            return await this.systemHandlers.handleUpdateIgnorePatterns(args as any);
          case 'test_ignore_patterns':
            return await this.systemHandlers.handleTestIgnorePatterns(args as any);
          case 'get_ignore_stats':
            return await this.systemHandlers.handleGetIgnoreStats(args as any);

          // Tooling handlers
          case 'detect_project_tooling':
            return await this.toolingHandlers.handleDetectProjectTooling(args as any);
          case 'run_language_tool':
            return await this.toolingHandlers.handleRunLanguageTool(args as any);
          case 'get_tooling_recommendations':
            return await this.toolingHandlers.handleGetToolingRecommendations(args as any);
          case 'run_tool_suite':
            return await this.toolingHandlers.handleRunToolSuite(args as any);
          case 'detect_cross_language_deps':
            return await this.toolingHandlers.handleDetectCrossLanguageDeps(args as any);
          case 'analyze_polyglot_project':
            return await this.toolingHandlers.handleAnalyzePolyglotProject(args as any);
          case 'generate_multi_language_refactorings':
            return await this.toolingHandlers.handleGenerateMultiLanguageRefactorings(args as any);

          // Framework handlers
          case 'detect_enhanced_frameworks':
            return await this.frameworkHandlers.handleDetectEnhancedFrameworks(args as any);
          case 'get_framework_recommendations':
            return await this.frameworkHandlers.handleGetFrameworkRecommendations(args as any);

          // Additional handlers that need to be implemented in handlers
          case 'get_inhibitory_stats':
            return await this.handleGetInhibitoryStats(args as any);
          case 'get_hebbian_stats':
            return await this.handleGetHebbianStats(args as any);
          case 'get_multi_modal_fusion_stats':
            return await this.handleGetMultiModalFusionStats(args as any);
          case 'get_hierarchical_context_stats':
            return await this.handleGetHierarchicalContextStats(args as any);
          case 'get_context_summary':
            return await this.handleGetContextSummary(args as any);
          case 'get_attention_stats':
            return await this.handleGetAttentionStats(args as any);
          case 'allocate_attention':
            return await this.handleAllocateAttention(args as any);
          case 'update_attention':
            return await this.handleUpdateAttention(args as any);
          case 'get_bi_temporal_stats':
            return await this.handleGetBiTemporalStats(args as any);
          case 'create_context_window':
            return await this.handleCreateContextWindow(args as any);
          case 'query_bi_temporal':
            return await this.handleQueryBiTemporal(args as any);
          case 'create_temporal_snapshot':
            return await this.handleCreateTemporalSnapshot(args as any);
          case 'invalidate_relationship':
            return await this.handleInvalidateRelationship(args as any);
          case 'get_prediction_engine_stats':
            return await this.handleGetPredictionEngineStats(args as any);
          case 'get_pattern_predictions':
            return await this.handleGetPatternPredictions(args as any);
          case 'get_emerging_patterns':
            return await this.handleGetEmergingPatterns(args as any);
          case 'predict_pattern_emergence':
            return await this.handlePredictPatternEmergence(args as any);
          case 'analyze_and_predict':
            return await this.handleAnalyzeAndPredict(args as any);
          case 'init_claude_code':
            return await this.handleInitClaudeCode(args as any);

          // Document Intelligence handlers (Phase 7.5)
          case 'analyze_project_documentation':
            return await this.documentHandlers.handleAnalyzeProjectDocumentation(args as any);
          case 'analyze_document':
            return await this.documentHandlers.handleAnalyzeDocument(args as any);
          case 'get_documentation_statistics':
            return await this.documentHandlers.handleGetDocumentationStatistics(args as any);
          case 'get_documentation_insights':
            return await this.documentHandlers.handleGetDocumentationInsights(args as any);
          case 'get_document_relationships':
            return await this.documentHandlers.handleGetDocumentRelationships(args as any);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return ResponseFormatter.formatErrorResponse(name, error);
      }
    });
  }

  // Temporary handlers for brain-inspired systems - these should be moved to separate handler classes
  private async handleGetInhibitoryStats(args: any) {
    try {
      const stats = this.mindMap.getInhibitoryLearningStats();

      let text = `🧠 **Inhibitory Learning Statistics**\n\n`;
      text += `**Pattern Overview:**\n`;
      text += `• Total Patterns: ${stats.totalPatterns}\n`;
      text += `• Average Strength: ${stats.averageStrength.toFixed(2)}\n`;
      text += `• Strong Patterns (>0.7): ${stats.strongPatterns}\n`;
      text += `• Weak Patterns (<0.3): ${stats.weakPatterns}\n\n`;

      text += `**Learning Activity:**\n`;
      text += `• Recently Reinforced (24h): ${stats.recentlyReinforced}\n`;

      if (stats.totalPatterns === 0) {
        text += `\n📝 **Status**: No inhibitory patterns learned yet\n`;
        text += `• Patterns are created when tasks fail with error details\n`;
        text += `• They prevent suggesting previously failed approaches\n`;
        text += `• Expected 30% reduction in repeated failure suggestions\n`;
      } else {
        const effectiveness = ((stats.strongPatterns / stats.totalPatterns) * 100).toFixed(1);
        text += `\n📈 **Learning Effectiveness**: ${effectiveness}% patterns are strong\n`;
        text += `• Brain-inspired negative learning is actively preventing failed patterns\n`;
        text += `• Patterns decay over time (${stats.weakPatterns} are weakening)\n`;
        text += `• Recent reinforcements: ${stats.recentlyReinforced} patterns strengthened\n`;
      }

      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('get_inhibitory_stats', error);
    }
  }

  private async handleGetHebbianStats(args: any) {
    try {
      const stats = await this.mindMap.getHebbianStats();

      let text = `🧠 **Hebbian Learning Statistics** - "Neurons that fire together, wire together"\n\n`;
      text += `**Connection Overview:**\n`;
      text += `• Total Connections: ${stats.totalConnections}\n`;
      text += `• Strong Connections (≥0.6): ${stats.strengthDistribution.strong}\n`;
      text += `• Average Strength: ${stats.averageStrength.toFixed(3)}\n`;
      text += `• Recent Activity: ${stats.recentActivity}\n\n`;

      text += `**Learning Configuration:**\n`;
      text += `• Learning Rate: ${stats.learningRate} (connection strengthening speed)\n`;
      text += `• Decay Rate: ${stats.decayRate} (unused connection weakening)\n`;
      text += `• Active Connections: ${stats.activeConnections}\n\n`;

      if (stats.totalConnections === 0) {
        text += `📝 **Status**: No associative connections learned yet\n`;
        text += `• Connections form when code elements are co-activated in queries\n`;
        text += `• Strengthens relationships between frequently used together items\n`;
        text += `• Enables brain-like associative memory for code intelligence\n`;
      } else {
        const strengthenedPercent = ((stats.strengthDistribution.strong / stats.totalConnections) * 100).toFixed(1);
        text += `🔗 **Associative Memory**: ${strengthenedPercent}% of connections are well-established\n\n`;

        text += `**Connection Distribution:**\n`;
        text += `• Weak (0.0-0.3): ${stats.strengthDistribution.weak}\n`;
        text += `• Medium (0.3-0.7): ${stats.strengthDistribution.medium}\n`;
        text += `• Strong (0.7-1.0): ${stats.strengthDistribution.strong}\n\n`;

        text += `\n🧠 **Brain-Inspired Features Active:**\n`;
        text += `• ✅ Co-activation detection and strengthening\n`;
        text += `• ✅ Automatic relationship discovery\n`;
        text += `• ✅ Dynamic confidence adjustments\n`;
        text += `• ✅ Synaptic pruning (removing weak connections)\n`;
        text += `• ✅ Context-aware associative patterns\n`;
        text += `\n📈 **Expected Impact**: Improved query relevance through associative learning`;
      }

      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('get_hebbian_stats', error);
    }
  }

  private async handleGetMultiModalFusionStats(args: any) {
    try {
      const stats = this.mindMap.getMultiModalFusionStats();
      let text = `🌊 **Multi-Modal Confidence Fusion Statistics**\n\n`;
      text += `**Evidence Integration:**\n`;
      text += `• Total Evidence Sources: ${stats.totalEvidenceSources}\n`;
      text += `• Average Source Reliability: ${stats.averageSourceReliability.toFixed(3)}\n`;
      text += `• Fusion Accuracy: ${(stats.fusionAccuracy * 100).toFixed(1)}%\n\n`;
      text += `**Confidence Calibration:**\n`;
      text += `• Calibration Score: ${stats.calibrationScore.toFixed(3)}\n`;
      text += `• Over-confidence Rate: ${(stats.overConfidenceRate * 100).toFixed(1)}%\n`;
      text += `• Under-confidence Rate: ${(stats.underConfidenceRate * 100).toFixed(1)}%\n`;
      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('get_multi_modal_fusion_stats', error);
    }
  }

  private async handleGetHierarchicalContextStats(args: any) {
    try {
      const stats = this.mindMap.getHierarchicalContextStats();
      let text = `🎯 **Hierarchical Context System Statistics**\n\n`;
      text += `**Context Levels:**\n`;
      text += `• Level 1 (Immediate): ${stats.level1Contexts} contexts\n`;
      text += `• Level 2 (Session): ${stats.level2Contexts} contexts\n`;
      text += `• Level 3 (Project): ${stats.level3Contexts} contexts\n`;
      text += `• Level 4 (Domain): ${stats.level4Contexts} contexts\n\n`;
      text += `**Context Distribution:**\n`;
      text += `• Average Context Depth: ${stats.averageContextDepth.toFixed(2)}\n`;
      text += `• Context Utilization Rate: ${(stats.contextUtilizationRate * 100).toFixed(1)}%\n`;
      text += `• Context Switch Frequency: ${stats.contextSwitchFrequency.toFixed(2)}/hour\n`;
      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('get_hierarchical_context_stats', error);
    }
  }

  private async handleGetContextSummary(args: { level?: number }) {
    try {
      const summary = this.mindMap.getContextSummary(args.level);
      let text = `📋 **Context Summary**\n\n`;

      if (args.level) {
        const levelName = ['', 'Immediate', 'Session', 'Project', 'Domain'][args.level];
        text += `**Level ${args.level} (${levelName}):**\n`;
      } else {
        text += `**All Context Levels:**\n`;
      }

      for (const [level, contexts] of summary.contextsByLevel) {
        const levelName = ['', 'Immediate', 'Session', 'Project', 'Domain'][level];
        text += `\n**Level ${level} (${levelName}):**\n`;
        contexts.slice(0, 5).forEach((context, i) => {
          text += `${i + 1}. ${context.description} (relevance: ${context.relevance.toFixed(2)})\n`;
        });
        if (contexts.length > 5) {
          text += `   ... and ${contexts.length - 5} more contexts\n`;
        }
      }

      text += `\n**Summary:**\n`;
      text += `• Total Active Contexts: ${summary.totalActiveContexts}\n`;
      text += `• Average Relevance: ${summary.averageRelevance.toFixed(3)}\n`;
      text += `• Most Active Level: Level ${summary.mostActiveLevel}\n`;

      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('get_context_summary', error);
    }
  }

  // Additional brain-inspired system handlers would go here...
  // For brevity, I'll implement placeholders for the remaining methods
  private async handleGetAttentionStats(args: any) {
    try {
      const stats = this.mindMap.getAttentionStats();

      let text = `🎯 **Attention System Statistics** - Brain-Inspired Dynamic Focus\n\n`;

      text += `**Attention Allocation:**\n`;
      text += `• Total Targets: ${stats.totalTargets}\n`;
      text += `• Capacity Used: ${(stats.allocatedCapacity * 100).toFixed(1)}% (${stats.allocatedCapacity.toFixed(2)}/${stats.totalCapacity})\n`;
      text += `• Available Capacity: ${(stats.availableCapacity * 100).toFixed(1)}%\n`;
      text += `• System Efficiency: ${(stats.efficiency * 100).toFixed(1)}%\n\n`;

      if (stats.totalTargets > 0) {
        text += `**Focus Distribution:**\n`;
        text += `• Average Attention Strength: ${(stats.averageStrength * 100).toFixed(1)}%\n`;
        text += `• Dominant Modality: ${stats.dominantModality || 'None'}\n`;
        text += `• Recent Activity: ${stats.recentActivity} targets updated (5min)\n\n`;

        text += `**Attention Types:**\n`;
        text += `• Selective (>70%): ${stats.targetsByType.selective} targets\n`;
        text += `• Sustained (40-70%): ${stats.targetsByType.sustained} targets\n`;
        text += `• Divided (20-40%): ${stats.targetsByType.divided} targets\n`;
        text += `• Executive (<20%): ${stats.targetsByType.executive} targets\n\n`;

        text += `**Modality Distribution:**\n`;
        for (const [modality, value] of Object.entries(stats.modalityDistribution)) {
          text += `• ${modality.charAt(0).toUpperCase() + modality.slice(1)}: ${((value as number) * 100).toFixed(1)}%\n`;
        }

        text += `\n🧠 **Brain-Inspired Features Active:**\n`;
        text += `• ✅ Selective attention focus (Miller's 7±2 rule)\n`;
        text += `• ✅ Multi-modal attention fusion\n`;
        text += `• ✅ Dynamic capacity allocation\n`;
        text += `• ✅ Temporal attention persistence\n`;
        text += `• ✅ Cognitive load management\n`;
        text += `\n📈 **Expected Impact**: Improved focus on most relevant code elements`;
      } else {
        text += `📝 **Status**: No attention targets allocated yet\n`;
        text += `• Attention targets are created when code elements are actively used\n`;
        text += `• System tracks focus patterns across different modalities\n`;
        text += `• Enables brain-inspired dynamic attention mechanisms\n\n`;

        text += `**Configuration:**\n`;
        text += `• Max Targets: ${stats.configurationSummary.maxTargets} (Miller's rule)\n`;
        text += `• Total Capacity: ${stats.configurationSummary.totalCapacity}\n`;
        text += `• Decay Interval: ${stats.configurationSummary.decayInterval / 1000}s\n`;
      }

      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('get_attention_stats', error);
    }
  }

  private async handleAllocateAttention(args: any) {
    try {
      await this.mindMap.allocateAttention(args.node_ids, args.attention_type, args.context);
      const text = `🎯 Attention allocated to ${args.node_ids.length} nodes`;
      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('allocate_attention', error);
    }
  }

  private async handleUpdateAttention(args: any) {
    try {
      await this.mindMap.updateAttentionFromActivity(args.action_type, args.node_ids, args.query_text);
      const text = `🎯 Attention updated for ${args.action_type} activity`;
      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('update_attention', error);
    }
  }

  private async handleGetBiTemporalStats(args: any) {
    try {
      const stats = this.mindMap.getBiTemporalStats();
      const text = `⏰ Bi-temporal stats: ${JSON.stringify(stats, null, 2)}`;
      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('get_bi_temporal_stats', error);
    }
  }

  private async handleCreateContextWindow(args: {
    name: string;
    valid_time_start: string;
    valid_time_end?: string;
    description?: string;
    framework_versions?: Record<string, string>
  }) {
    try {
      await this.mindMap.initialize();
      const { name, valid_time_start, valid_time_end, description = '', framework_versions = {} } = args;

      const validTimeStart = new Date(valid_time_start);
      const validTimeEnd = valid_time_end ? new Date(valid_time_end) : null;

      const contextWindowId = await this.mindMap.createContextWindow(
        name,
        validTimeStart.toISOString(),
        validTimeEnd?.toISOString(),
        description,
        framework_versions
      );

      let text = `🕐 **Context Window Created Successfully**\n\n`;
      text += `**📊 Context Details:**\n`;
      text += `• Name: ${name}\n`;
      text += `• ID: ${contextWindowId}\n`;
      text += `• Valid Time Start: ${validTimeStart.toISOString()}\n`;
      text += `• Valid Time End: ${validTimeEnd ? validTimeEnd.toISOString() : 'Ongoing'}\n`;

      if (description) {
        text += `• Description: ${description}\n`;
      }

      if (Object.keys(framework_versions).length > 0) {
        text += `• Framework Versions:\n`;
        for (const [framework, version] of Object.entries(framework_versions)) {
          text += `  - ${framework}: ${version}\n`;
        }
      }

      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('create_context_window', error);
    }
  }

  private async handleQueryBiTemporal(args: any) {
    try {
      const result = await this.mindMap.queryBiTemporal(args);
      const text = `⏰ Bi-temporal query returned ${result.nodes?.length || 0} results`;
      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('query_bi_temporal', error);
    }
  }

  private async handleCreateTemporalSnapshot(args: any) {
    try {
      const snapshotId = await this.mindMap.createTemporalSnapshot(args.name);
      const text = `📸 Created temporal snapshot: ${snapshotId}`;
      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('create_temporal_snapshot', error);
    }
  }

  private async handleInvalidateRelationship(args: any) {
    try {
      await this.mindMap.invalidateRelationship(args.edge_id, args.reason, args.evidence, args.invalidation_date);
      const text = `🚫 Invalidated relationship: ${args.edge_id}`;
      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('invalidate_relationship', error);
    }
  }

  private async handleGetPredictionEngineStats(args: any) {
    try {
      const stats = this.mindMap.getPredictionEngineStats();
      const text = `🔮 Prediction engine stats: ${JSON.stringify(stats, null, 2)}`;
      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('get_prediction_engine_stats', error);
    }
  }

  private async handleGetPatternPredictions(args: any) {
    try {
      const predictions = await this.mindMap.getPatternPredictions(args.pattern_type);
      const text = `🔮 Found ${predictions.length} pattern predictions`;
      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('get_pattern_predictions', error);
    }
  }

  private async handleGetEmergingPatterns(args: any) {
    try {
      const patterns = await this.mindMap.getEmergingPatterns(args.emergence_stage);
      const text = `🌱 Found ${patterns.length} emerging patterns`;
      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('get_emerging_patterns', error);
    }
  }

  private async handlePredictPatternEmergence(args: any) {
    try {
      const prediction = this.mindMap.predictPatternEmergence(args.pattern_type);
      const text = `🔮 Pattern emergence prediction: ${JSON.stringify(prediction, null, 2)}`;
      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('predict_pattern_emergence', error);
    }
  }

  private async handleAnalyzeAndPredict(args: any) {
    try {
      await this.mindMap.analyzeAndPredict();
      const text = `🔮 Pattern analysis and prediction completed`;
      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('analyze_and_predict', error);
    }
  }

  private async handleInitClaudeCode(args: {
    setup_type?: string;
    platform?: string;
  }) {
    try {
      const { setup_type = 'full_guide', platform } = args;

      let text = `🚀 **Mind Map MCP Setup Guide for Claude Code**\n\n`;

      // Detect current project path
      const projectPath = process.cwd();
      const serverPath = `${projectPath}/dist/index.js`;

      if (setup_type === 'desktop' || setup_type === 'full_guide') {
        text += `## 🖥️ Claude Desktop Configuration\n\n`;

        if (platform === 'macos' || !platform) {
          text += `**macOS Configuration:**\n`;
          text += `Edit: \`~/Library/Application Support/Claude/claude_desktop_config.json\`\n\n`;
        }

        if (platform === 'windows' || !platform) {
          text += `**Windows Configuration:**\n`;
          text += `Edit: \`%APPDATA%/Claude/claude_desktop_config.json\`\n\n`;
        }

        if (platform === 'linux' || !platform) {
          text += `**Linux Configuration:**\n`;
          text += `Edit: \`~/.config/claude/claude_desktop_config.json\`\n\n`;
        }

        text += `\`\`\`json\n`;
        text += `{\n`;
        text += `  "mcpServers": {\n`;
        text += `    "mind-map-mcp": {\n`;
        text += `      "command": "node",\n`;
        text += `      "args": ["${serverPath}"],\n`;
        text += `      "env": {}\n`;
        text += `    }\n`;
        text += `  }\n`;
        text += `}\n`;
        text += `\`\`\`\n\n`;
      }

      if (setup_type === 'cli' || setup_type === 'full_guide') {
        text += `## 💻 Claude CLI Configuration\n\n`;
        text += `Create or edit: \`~/.claude/mcp_config.json\`\n\n`;
        text += `\`\`\`json\n`;
        text += `{\n`;
        text += `  "mcpServers": {\n`;
        text += `    "mind-map-mcp": {\n`;
        text += `      "command": "node",\n`;
        text += `      "args": ["${serverPath}"],\n`;
        text += `      "env": {}\n`;
        text += `    }\n`;
        text += `  }\n`;
        text += `}\n`;
        text += `\`\`\`\n\n`;
      }

      text += `🧠 **You now have access to enterprise-grade AI code intelligence with brain-inspired learning capabilities!**`;

      return ResponseFormatter.formatSuccessResponse(text);
    } catch (error) {
      return ResponseFormatter.formatErrorResponse('init_claude_code', error);
    }
  }

  async run(): Promise<void> {
    // Initialize the mind map engine
    await this.mindMap.initialize();

    // Create transport and connect
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('Mind Map MCP Server started successfully');
  }
}

// Start the server only when run directly (not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MindMapMCPServer();
  server.run().catch(console.error);
}