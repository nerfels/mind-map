import { MindMapEngine } from '../core/MindMapEngine.js';
import { ValidationMiddleware } from '../middleware/ValidationMiddleware.js';
import { ResponseFormatter } from '../middleware/ResponseFormatter.js';

export class QueryHandlers {
  constructor(private mindMap: MindMapEngine) {}

  async handleQueryMindMap(args: {
    query: string;
    type?: string;
    limit?: number;
    include_metadata?: boolean;
  }) {
    const { query, type, limit, include_metadata } = args;

    // Always log MCP queries to track what's happening
    console.log(`[MCP] Query received: "${query}"`);

    // Debug for problematic queries
    const isTestQuery = query.toLowerCase().includes('mindmap') ||
                       query.toLowerCase().includes('querymindmap') ||
                       query === 'MindMapEngine' ||
                       query === 'queryMindMap';
    if (isTestQuery) {
      console.log(`[MCP DEBUG] Processing test query: "${query}"`);
    }

    // Debug logging
    if (query.toLowerCase().includes('mindmap')) {
      console.log(`[MCP DEBUG] Handling MindMap query: "${query}"`);
    }

    // Input validation
    ValidationMiddleware.validateQuery(query);
    ValidationMiddleware.validateLimit(limit);
    ValidationMiddleware.validateType(type);

    const result = await this.mindMap.query(query, {
      type: type as any,
      limit,
      includeMetadata: include_metadata,
      useActivation: false,  // Use simple linear query for stability
      bypassInhibition: true,  // Skip inhibitory learning for basic queries
      bypassHebbianLearning: true,  // Skip Hebbian learning for basic queries
      bypassAttention: true,  // Skip attention system for basic queries
      bypassBiTemporal: true,  // Skip bi-temporal processing for basic queries
      includeParentContext: false,  // Skip hierarchical context
      includeChildContext: false,   // Skip hierarchical context
      bypassCache: false,  // Enable caching for better performance
      bypassMultiModalFusion: true,  // Skip multi-modal fusion to avoid filtering
      confidence: 0.0  // Accept all confidence levels
    });

    // Debug the result
    if (isTestQuery) {
      console.log(`[MCP DEBUG] Result: nodes=${result.nodes.length}, total=${result.totalMatches}`);
      if (result.totalMatches > 0 && result.nodes.length === 0) {
        console.log('[MCP DEBUG] Found matches but filtered out during processing!');
      }
      if (result.nodes.length > 0) {
        console.log(`[MCP DEBUG] First node: ${result.nodes[0].name}, confidence=${result.nodes[0].confidence}`);
      }
    }

    const responseText = ResponseFormatter.formatQueryResults(result, include_metadata);

    return ResponseFormatter.formatSuccessResponse(responseText);
  }

  async handleUpdateMindMap(args: {
    task_description: string;
    files_involved?: string[];
    outcome: 'success' | 'error' | 'partial';
    error_details?: any;
    solution_details?: any;
    patterns_discovered?: any[];
  }) {
    const {
      task_description,
      files_involved = [],
      outcome,
      error_details,
      solution_details,
      patterns_discovered
    } = args;

    // Input validation
    ValidationMiddleware.validateTaskDescription(task_description);
    ValidationMiddleware.validateFilesInvolved(files_involved);
    ValidationMiddleware.validateOutcome(outcome);

    this.mindMap.updateFromTask({
      task: task_description,
      files: files_involved,
      outcome,
      errorDetails: error_details,
      solutionDetails: solution_details,
      patternsDiscovered: patterns_discovered
    });

    await this.mindMap.save();

    const text = `Mind map updated with task: "${task_description}" (outcome: ${outcome})\nFiles involved: ${files_involved.length > 0 ? files_involved.join(', ') : 'none'}`;
    return ResponseFormatter.formatSuccessResponse(text);
  }

  async handleAdvancedQuery(args: {
    query: string;
    parameters?: Record<string, any>;
    explain?: boolean;
  }) {
    const { query, parameters = {}, explain = false } = args;

    // Validate inputs
    ValidationMiddleware.validateAdvancedQuery(query);

    const result = await this.mindMap.executeAdvancedQuery(query, parameters, explain);

    const text = ResponseFormatter.formatAdvancedQueryResults(result, query, parameters, explain);
    return ResponseFormatter.formatSuccessResponse(text);
  }

  async handleTemporalQuery(args: {
    time_range: {
      start: string;
      end: string;
      granularity?: 'hour' | 'day' | 'week' | 'month';
    };
    entity?: string;
    analysis_type?: 'evolution' | 'trend' | 'comparison';
    metric?: 'confidence' | 'error_rate' | 'node_count' | 'complexity';
  }) {
    const {
      time_range,
      entity = '*',
      analysis_type = 'evolution',
      metric
    } = args;

    // Validate inputs
    ValidationMiddleware.validateTimeRange(time_range);

    const timeRange = {
      start: new Date(time_range.start),
      end: new Date(time_range.end),
      granularity: time_range.granularity || 'day' as const
    };

    const result = await this.mindMap.executeTemporalQuery({
      timeRange,
      entity,
      analysis_type,
      metric
    });

    const text = ResponseFormatter.formatTemporalQueryResults(result, timeRange, entity, analysis_type, metric);
    return ResponseFormatter.formatSuccessResponse(text);
  }

  async handleAggregateQuery(args: {
    aggregation: {
      function: string;
      field: string;
      parameters?: Record<string, any>;
    };
    group_by?: Array<{
      field: string;
      transform?: string;
      parameters?: any[];
    }>;
    filter?: {
      conditions: Array<{
        field: string;
        operator: string;
        value: any;
      }>;
      operator?: 'AND' | 'OR';
    };
    order_by?: Array<{
      field: string;
      direction?: 'ASC' | 'DESC';
    }>;
    limit?: number;
  }) {
    const { aggregation, group_by, filter, order_by, limit } = args;

    // Validate inputs
    ValidationMiddleware.validateAggregation(aggregation);

    const result = await this.mindMap.executeAggregateQuery({
      aggregation,
      group_by: group_by?.map(g => ({
        ...g,
        transform: g.transform as any
      })),
      filter: filter ? {
        ...filter,
        operator: filter.operator || 'AND' as const
      } : undefined,
      order_by: order_by?.map(o => ({
        ...o,
        direction: o.direction || 'DESC' as const
      })),
      limit
    });

    const text = ResponseFormatter.formatAggregateQueryResults(result, aggregation, group_by);
    return ResponseFormatter.formatSuccessResponse(text);
  }

  async handleSaveQuery(args: {
    name: string;
    description: string;
    query: string;
    parameters?: Record<string, any>;
    query_type?: 'advanced' | 'temporal' | 'aggregate';
  }) {
    const {
      name,
      description,
      query,
      parameters,
      query_type = 'advanced'
    } = args;

    // Validate inputs
    ValidationMiddleware.validateSaveQuery(name, description, query);

    const queryId = await this.mindMap.saveQuery(
      name,
      description,
      query,
      query_type || 'advanced',
      parameters
    );

    const text = `💾 Query Saved Successfully!\n\n` +
      `ID: ${queryId}\n` +
      `Name: ${name}\n` +
      `Type: ${query_type}\n` +
      `Description: ${description}\n\n` +
      `Use execute_saved_query tool with ID "${queryId}" to run this query later.`;

    return ResponseFormatter.formatSuccessResponse(text);
  }

  async handleExecuteSavedQuery(args: {
    query_id: string;
    parameters?: Record<string, any>;
  }) {
    const { query_id, parameters } = args;

    // Validate inputs
    ValidationMiddleware.validateQueryId(query_id);

    const result = await this.mindMap.executeSavedQuery(query_id, parameters);

    let text = `🏃 Executed Saved Query: ${query_id}\n\n`;

    if (parameters && Object.keys(parameters).length > 0) {
      text += `Parameters: ${JSON.stringify(parameters, null, 2)}\n\n`;
    }

    // Format results similar to advanced query
    text += `Found ${result.nodes?.length || 0} matches in ${result.queryTime}ms\n`;

    if (result.nodes && result.nodes.length > 0) {
      text += `\n📄 Results:\n`;
      result.nodes.slice(0, 10).forEach((node: any, i: number) => {
        text += `${i + 1}. ${node.name} (${node.type}) - Confidence: ${node.confidence.toFixed(2)}\n`;
        if (node.path) text += `   ${node.path}\n`;
      });

      if (result.nodes.length > 10) {
        text += `   ... and ${result.nodes.length - 10} more results\n`;
      }
    }

    return ResponseFormatter.formatSuccessResponse(text);
  }
}