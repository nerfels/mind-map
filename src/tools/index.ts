import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const QUERY_MINDMAP_TOOL: Tool = {
  name: 'query_mindmap',
  description: 'Query the project mind map for relevant files, functions, or patterns based on a task description',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural language description of what you\'re looking for (e.g., "authentication logic", "database models", "error handling")'
      },
      type: {
        type: 'string',
        enum: ['file', 'directory', 'function', 'class', 'error', 'pattern'],
        description: 'Filter results by node type'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10)',
        default: 10
      },
      include_metadata: {
        type: 'boolean',
        description: 'Include detailed metadata in results (default: false)',
        default: false
      }
    },
    required: ['query']
  }
};

export const UPDATE_MINDMAP_TOOL: Tool = {
  name: 'update_mindmap',
  description: 'Update the mind map with new knowledge from completed tasks, errors encountered, or solutions found',
  inputSchema: {
    type: 'object',
    properties: {
      task_description: {
        type: 'string',
        description: 'Description of the task that was performed'
      },
      files_involved: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of file paths that were involved in the task'
      },
      outcome: {
        type: 'string',
        enum: ['success', 'error', 'partial'],
        description: 'Whether the task was successful, failed, or partially completed'
      },
      error_details: {
        type: 'object',
        properties: {
          error_type: { type: 'string' },
          error_message: { type: 'string' },
          stack_trace: { type: 'string' },
          fix_applied: { type: 'string' }
        },
        description: 'Details about any errors encountered and how they were fixed'
      },
      solution_details: {
        type: 'object',
        properties: {
          approach: { type: 'string' },
          files_changed: { type: 'array', items: { type: 'string' } },
          key_changes: { type: 'string' },
          effectiveness: { type: 'number', minimum: 0, maximum: 1 }
        },
        description: 'Details about the solution approach and its effectiveness'
      },
      patterns_discovered: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            pattern_type: { type: 'string' },
            description: { type: 'string' },
            files: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number', minimum: 0, maximum: 1 }
          }
        },
        description: 'Any new patterns or conventions discovered during the task'
      }
    },
    required: ['task_description', 'outcome']
  }
};

export const GET_CONTEXT_TOOL: Tool = {
  name: 'get_context',
  description: 'Get contextual information about the current project state and previous interactions',
  inputSchema: {
    type: 'object',
    properties: {
      context_type: {
        type: 'string',
        enum: ['project_overview', 'recent_tasks', 'error_patterns', 'success_patterns'],
        description: 'Type of context to retrieve'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of context items to return (default: 5)',
        default: 5
      }
    },
    required: ['context_type']
  }
};

export const SUGGEST_EXPLORATION_TOOL: Tool = {
  name: 'suggest_exploration',
  description: 'Get intelligent suggestions for where to look or what to explore based on a task description',
  inputSchema: {
    type: 'object',
    properties: {
      task_description: {
        type: 'string',
        description: 'Description of the task you want to accomplish'
      },
      current_location: {
        type: 'string',
        description: 'Current file or directory you\'re working in (optional)'
      },
      exploration_type: {
        type: 'string',
        enum: ['files', 'functions', 'patterns', 'dependencies'],
        description: 'Type of exploration suggestions needed (default: files)',
        default: 'files'
      }
    },
    required: ['task_description']
  }
};

export const SCAN_PROJECT_TOOL: Tool = {
  name: 'scan_project',
  description: 'Perform a fresh scan of the project to update the mind map with current file structure',
  inputSchema: {
    type: 'object',
    properties: {
      force_rescan: {
        type: 'boolean',
        description: 'Force a complete rescan even if recent data exists (default: false)',
        default: false
      },
      include_analysis: {
        type: 'boolean',
        description: 'Include basic code analysis during scan (default: true)',
        default: true
      }
    }
  }
};

export const GET_STATS_TOOL: Tool = {
  name: 'get_stats',
  description: 'Get statistics about the current mind map and project analysis',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

export const PREDICT_ERRORS_TOOL: Tool = {
  name: 'predict_errors',
  description: 'Analyze code patterns and predict potential errors before they occur based on historical data and code analysis',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Specific file to analyze for potential errors (optional - if not provided, analyzes entire project)'
      },
      risk_threshold: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Minimum risk score to include in predictions (default: 0.2)',
        default: 0.2
      },
      limit: {
        type: 'number',
        description: 'Maximum number of predictions to return (default: 10)',
        default: 10
      }
    }
  }
};

export const SUGGEST_FIXES_TOOL: Tool = {
  name: 'suggest_fixes',
  description: 'Get intelligent fix suggestions for errors based on historical data, error patterns, and contextual analysis',
  inputSchema: {
    type: 'object',
    properties: {
      error_message: {
        type: 'string',
        description: 'The error message you encountered'
      },
      error_type: {
        type: 'string',
        enum: ['syntax', 'type', 'import', 'runtime', 'network', 'permission'],
        description: 'The type/category of error (optional - will be auto-detected if not provided)'
      },
      file_path: {
        type: 'string',
        description: 'Path to the file where the error occurred (optional)'
      },
      function_name: {
        type: 'string',
        description: 'Name of the function where error occurred (optional)'
      },
      line_number: {
        type: 'number',
        description: 'Line number where error occurred (optional)'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of fix suggestions to return (default: 5)',
        default: 5
      }
    },
    required: ['error_message']
  }
};

export const ANALYZE_ARCHITECTURE_TOOL: Tool = {
  name: 'analyze_architecture',
  description: 'Analyze the project architecture and detect design patterns, architectural styles, and structural insights',
  inputSchema: {
    type: 'object',
    properties: {
      pattern_type: {
        type: 'string',
        enum: ['architectural', 'design', 'structural'],
        description: 'Filter results by pattern type (optional - returns all types if not specified)'
      },
      min_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Minimum confidence threshold for patterns (default: 0.3)',
        default: 0.3
      },
      limit: {
        type: 'number',
        description: 'Maximum number of insights to return (default: 10)',
        default: 10
      }
    }
  }
};

export const GET_PERFORMANCE_TOOL: Tool = {
  name: 'get_performance',
  description: 'Get performance statistics and identify slow operations in the mind map system',
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: 'Get stats for a specific operation (optional - returns all operations if not specified)'
      },
      slow_threshold_ms: {
        type: 'number',
        description: 'Threshold in milliseconds to identify slow operations (default: 10ms)',
        default: 10
      },
      include_recent: {
        type: 'boolean',
        description: 'Include recent performance metrics (default: true)',
        default: true
      }
    }
  }
};

export const ADVANCED_QUERY_TOOL: Tool = {
  name: 'advanced_query',
  description: 'Execute advanced Cypher-like graph queries with complex filtering, aggregation, and pattern matching',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Cypher-like query (e.g., "MATCH (n:file)-[:CONTAINS]->(f:function) WHERE n.name CONTAINS \'test\' RETURN f.name, f.confidence")'
      },
      parameters: {
        type: 'object',
        description: 'Query parameters for parameterized queries (optional)',
        additionalProperties: true
      },
      explain: {
        type: 'boolean',
        description: 'Return query execution plan and optimization info (default: false)',
        default: false
      }
    },
    required: ['query']
  }
};

export const TEMPORAL_QUERY_TOOL: Tool = {
  name: 'temporal_query',
  description: 'Query code evolution over time, track changes, and analyze trends',
  inputSchema: {
    type: 'object',
    properties: {
      time_range: {
        type: 'object',
        properties: {
          start: { type: 'string', format: 'date-time', description: 'Start date (ISO format)' },
          end: { type: 'string', format: 'date-time', description: 'End date (ISO format)' },
          granularity: { 
            type: 'string', 
            enum: ['hour', 'day', 'week', 'month'],
            description: 'Time granularity for analysis (default: day)',
            default: 'day'
          }
        },
        required: ['start', 'end'],
        description: 'Time range for the temporal analysis'
      },
      entity: {
        type: 'string',
        description: 'Entity ID or pattern to track (use "*" for all entities)',
        default: '*'
      },
      analysis_type: {
        type: 'string',
        enum: ['evolution', 'trend', 'comparison'],
        description: 'Type of temporal analysis (default: evolution)',
        default: 'evolution'
      },
      metric: {
        type: 'string',
        enum: ['confidence', 'error_rate', 'node_count', 'complexity'],
        description: 'Metric to track over time (required for trend analysis)'
      }
    },
    required: ['time_range']
  }
};

export const AGGREGATE_QUERY_TOOL: Tool = {
  name: 'aggregate_query',
  description: 'Execute aggregate queries for project insights, statistics, and analytics',
  inputSchema: {
    type: 'object',
    properties: {
      aggregation: {
        type: 'object',
        properties: {
          function: {
            type: 'string',
            enum: ['count', 'sum', 'avg', 'min', 'max', 'median', 'stddev', 'percentile', 'distinct_count'],
            description: 'Aggregation function'
          },
          field: {
            type: 'string',
            description: 'Field to aggregate (e.g., "confidence", "metadata.lineCount")'
          },
          parameters: {
            type: 'object',
            description: 'Additional parameters (e.g., percentile value)'
          }
        },
        required: ['function', 'field'],
        description: 'Aggregation specification'
      },
      group_by: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string', description: 'Field to group by' },
            transform: { 
              type: 'string', 
              enum: ['date_trunc', 'substring', 'lower', 'upper', 'extract_path'],
              description: 'Optional transformation to apply'
            },
            parameters: {
              type: 'array',
              description: 'Parameters for the transformation'
            }
          },
          required: ['field']
        },
        description: 'Fields to group results by (optional)'
      },
      filter: {
        type: 'object',
        properties: {
          conditions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                operator: { 
                  type: 'string', 
                  enum: ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'not_in', 'contains', 'regex', 'exists'] 
                },
                value: { description: 'Value to compare against' }
              },
              required: ['field', 'operator', 'value']
            }
          },
          operator: { type: 'string', enum: ['AND', 'OR'], default: 'AND' }
        },
        description: 'Filter conditions (optional)'
      },
      order_by: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            direction: { type: 'string', enum: ['ASC', 'DESC'], default: 'DESC' }
          },
          required: ['field']
        },
        description: 'Sort order (optional)'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 50)',
        default: 50
      }
    },
    required: ['aggregation']
  }
};

export const GET_INSIGHTS_TOOL: Tool = {
  name: 'get_insights',
  description: 'Generate comprehensive project insights and analytics with actionable recommendations',
  inputSchema: {
    type: 'object',
    properties: {
      categories: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['code_quality', 'architecture', 'learning', 'performance', 'errors']
        },
        description: 'Insight categories to include (optional - returns all if not specified)'
      },
      min_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Minimum confidence threshold for insights (default: 0.5)',
        default: 0.5
      },
      actionable_only: {
        type: 'boolean',
        description: 'Return only actionable insights with recommendations (default: false)',
        default: false
      }
    }
  }
};

export const SAVE_QUERY_TOOL: Tool = {
  name: 'save_query',
  description: 'Save a query template for reuse with parameters',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Unique name for the saved query'
      },
      description: {
        type: 'string',
        description: 'Description of what the query does'
      },
      query: {
        type: 'string',
        description: 'The query string to save (can include parameter placeholders)'
      },
      parameters: {
        type: 'object',
        description: 'Default parameters for the query (optional)',
        additionalProperties: true
      },
      query_type: {
        type: 'string',
        enum: ['advanced', 'temporal', 'aggregate'],
        description: 'Type of query being saved',
        default: 'advanced'
      }
    },
    required: ['name', 'description', 'query']
  }
};

export const EXECUTE_SAVED_QUERY_TOOL: Tool = {
  name: 'execute_saved_query',
  description: 'Execute a previously saved query template with optional parameter overrides',
  inputSchema: {
    type: 'object',
    properties: {
      query_id: {
        type: 'string',
        description: 'ID of the saved query to execute (or query name if unique)'
      },
      parameters: {
        type: 'object',
        description: 'Parameter overrides for the saved query (optional)',
        additionalProperties: true
      }
    },
    required: ['query_id']
  }
};

export const ALL_TOOLS: Tool[] = [
  QUERY_MINDMAP_TOOL,
  UPDATE_MINDMAP_TOOL,
  GET_CONTEXT_TOOL,
  SUGGEST_EXPLORATION_TOOL,
  SCAN_PROJECT_TOOL,
  GET_STATS_TOOL,
  PREDICT_ERRORS_TOOL,
  SUGGEST_FIXES_TOOL,
  ANALYZE_ARCHITECTURE_TOOL,
  GET_PERFORMANCE_TOOL,
  ADVANCED_QUERY_TOOL,
  TEMPORAL_QUERY_TOOL,
  AGGREGATE_QUERY_TOOL,
  GET_INSIGHTS_TOOL,
  SAVE_QUERY_TOOL,
  EXECUTE_SAVED_QUERY_TOOL
];