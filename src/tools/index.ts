import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const QUERY_MINDMAP_TOOL: Tool = {
  name: 'query_mindmap',
  description: 'Query the project mind map with enhanced semantic search, context-aware relevance scoring, and intelligent routing. Supports file path queries, function/class name searches, semantic concept matching, and multi-modal confidence fusion.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Enhanced search query supporting: 1) File path queries (e.g., "src/core/MindMapEngine.ts") return all functions/classes in files with high confidence, 2) Function/class name searches (e.g., "calculateRelevanceScore", "MindMapEngine") with semantic expansion, 3) Semantic concept searches (e.g., "auth" finds authentication-related code, "validation" finds checking functions), 4) Multi-word and camelCase matching with context-aware boosting, 5) Automatic query routing to specialized engines (temporal, aggregate, advanced) based on intent.'
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
  description: 'Perform a fresh scan of the project to update the mind map with current file structure. Supports multiple project contexts via project_root parameter or MCP_PROJECT_ROOT environment variable.',
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
      },
      project_root: {
        type: 'string',
        description: 'Project root directory to scan (optional - uses MCP_PROJECT_ROOT env var, then current working directory if not specified)'
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

export const DETECT_CROSS_LANGUAGE_DEPS_TOOL: Tool = {
  name: 'detect_cross_language_deps',
  description: 'Detect cross-language dependencies and communication patterns in polyglot projects',
  inputSchema: {
    type: 'object',
    properties: {
      include_confidence: {
        type: 'boolean',
        description: 'Include confidence scores in results (default: true)',
        default: true
      },
      dependency_types: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['api_call', 'ffi', 'microservice', 'shared_data', 'config', 'build_dependency']
        },
        description: 'Filter by specific dependency types (optional)'
      },
      min_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Minimum confidence threshold (default: 0.3)',
        default: 0.3
      }
    }
  }
};

export const ANALYZE_POLYGLOT_PROJECT_TOOL: Tool = {
  name: 'analyze_polyglot_project',
  description: 'Analyze project structure for multi-language patterns, architecture style, and language interoperability',
  inputSchema: {
    type: 'object',
    properties: {
      include_recommendations: {
        type: 'boolean',
        description: 'Include architectural recommendations (default: true)',
        default: true
      },
      detailed_frameworks: {
        type: 'boolean',
        description: 'Include detailed framework analysis (default: false)',
        default: false
      }
    }
  }
};

export const GENERATE_MULTI_LANGUAGE_REFACTORINGS_TOOL: Tool = {
  name: 'generate_multi_language_refactorings',
  description: 'Generate intelligent refactoring suggestions for multi-language codebases',
  inputSchema: {
    type: 'object',
    properties: {
      focus_area: {
        type: 'string',
        enum: ['architecture', 'dependencies', 'configuration', 'apis', 'all'],
        description: 'Focus area for refactoring suggestions (default: all)',
        default: 'all'
      },
      max_effort: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        description: 'Maximum effort level for suggestions (default: high)',
        default: 'high'
      },
      include_risks: {
        type: 'boolean',
        description: 'Include risk analysis for each suggestion (default: true)',
        default: true
      }
    }
  }
};

export const DETECT_PROJECT_TOOLING_TOOL: Tool = {
  name: 'detect_project_tooling',
  description: 'Detect available development tools across all languages in the project',
  inputSchema: {
    type: 'object',
    properties: {
      force_refresh: {
        type: 'boolean',
        description: 'Force a fresh scan instead of using cached results (default: false)',
        default: false
      },
      language_filter: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['python', 'java', 'go', 'rust', 'cpp', 'c', 'javascript', 'typescript']
        },
        description: 'Filter results by specific languages (optional)'
      }
    }
  }
};

export const RUN_LANGUAGE_TOOL_TOOL: Tool = {
  name: 'run_language_tool',
  description: 'Execute a specific development tool and return results with issue analysis',
  inputSchema: {
    type: 'object',
    properties: {
      tool_name: {
        type: 'string',
        description: 'Name of the tool to run (e.g., pytest, cargo-clippy, maven)'
      },
      language: {
        type: 'string',
        enum: ['python', 'java', 'go', 'rust', 'cpp', 'c'],
        description: 'Language context for the tool'
      },
      args: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional command-line arguments for the tool (optional)',
        default: []
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 120000)',
        default: 120000
      }
    },
    required: ['tool_name', 'language']
  }
};

export const GET_TOOLING_RECOMMENDATIONS_TOOL: Tool = {
  name: 'get_tooling_recommendations',
  description: 'Get intelligent recommendations for missing or beneficial development tools',
  inputSchema: {
    type: 'object',
    properties: {
      priority_filter: {
        type: 'string',
        enum: ['high', 'medium', 'low', 'all'],
        description: 'Filter recommendations by priority level (default: all)',
        default: 'all'
      },
      include_install_commands: {
        type: 'boolean',
        description: 'Include installation commands in recommendations (default: true)',
        default: true
      }
    }
  }
};

export const RUN_TOOL_SUITE_TOOL: Tool = {
  name: 'run_tool_suite',
  description: 'Run multiple development tools and aggregate results for comprehensive analysis',
  inputSchema: {
    type: 'object',
    properties: {
      tool_types: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['test', 'lint', 'format', 'build', 'security', 'coverage', 'type_check']
        },
        description: 'Types of tools to run (runs all available if not specified)'
      },
      languages: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['python', 'java', 'go', 'rust', 'cpp', 'c']
        },
        description: 'Languages to include (runs all detected if not specified)'
      },
      parallel: {
        type: 'boolean',
        description: 'Run tools in parallel for faster execution (default: true)',
        default: true
      },
      fail_fast: {
        type: 'boolean',
        description: 'Stop execution on first failure (default: false)',
        default: false
      }
    }
  }
};

export const DETECT_ENHANCED_FRAMEWORKS_TOOL: Tool = {
  name: 'detect_enhanced_frameworks',
  description: 'Comprehensive framework detection across web, mobile, desktop, game, ML/AI, and cloud categories',
  inputSchema: {
    type: 'object',
    properties: {
      force_refresh: {
        type: 'boolean',
        description: 'Force a fresh scan instead of using cached results (default: false)',
        default: false
      },
      categories: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['web', 'mobile', 'desktop', 'game', 'ml_ai', 'cloud']
        },
        description: 'Filter results by framework categories (optional - returns all if not specified)'
      },
      min_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Minimum confidence threshold for framework detection (default: 0.3)',
        default: 0.3
      }
    }
  }
};

export const GET_FRAMEWORK_RECOMMENDATIONS_TOOL: Tool = {
  name: 'get_framework_recommendations',
  description: 'Get intelligent recommendations based on detected frameworks and project patterns',
  inputSchema: {
    type: 'object',
    properties: {
      framework_names: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Specific framework names to get recommendations for (optional - uses all detected if not specified)'
      },
      recommendation_type: {
        type: 'string',
        enum: ['best_practices', 'tooling', 'architecture', 'all'],
        description: 'Type of recommendations to provide (default: all)',
        default: 'all'
      }
    }
  }
};

export const GET_CACHE_STATS_TOOL: Tool = {
  name: 'get_cache_stats',
  description: 'Get query cache statistics including hit rate, memory usage, and performance metrics',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export const CLEAR_CACHE_TOOL: Tool = {
  name: 'clear_cache',
  description: 'Clear the query cache to free memory and force fresh results',
  inputSchema: {
    type: 'object',
    properties: {
      affected_paths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional list of file paths that were modified - only cache entries related to these paths will be cleared (clears all if not provided)'
      }
    },
    additionalProperties: false
  }
};

export const GET_INHIBITORY_STATS_TOOL: Tool = {
  name: 'get_inhibitory_stats',
  description: 'Get brain-inspired inhibitory learning statistics including pattern counts, strength distribution, and learning effectiveness',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export const GET_HEBBIAN_STATS_TOOL: Tool = {
  name: 'get_hebbian_stats',
  description: 'Get Hebbian learning statistics showing associative connections, co-activation patterns, and neural-inspired relationship strengthening',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export const GET_MULTI_MODAL_FUSION_STATS_TOOL: Tool = {
  name: 'get_multi_modal_fusion_stats',
  description: 'Get multi-modal confidence fusion statistics showing evidence combination, modality reliability, and advanced confidence calibration',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export const GET_HIERARCHICAL_CONTEXT_STATS_TOOL: Tool = {
  name: 'get_hierarchical_context_stats',
  description: 'Get hierarchical context system statistics showing multi-level context awareness, context distribution, and brain-inspired context management',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export const GET_CONTEXT_SUMMARY_TOOL: Tool = {
  name: 'get_context_summary',
  description: 'Get current context summary across all hierarchical levels (immediate, session, project, domain) with most relevant context items',
  inputSchema: {
    type: 'object',
    properties: {
      level: {
        type: 'number',
        enum: [1, 2, 3, 4],
        description: 'Filter by specific context level: 1=immediate, 2=session, 3=project, 4=domain (optional - returns all levels if not specified)'
      }
    },
    additionalProperties: false
  }
};

export const GET_ATTENTION_STATS_TOOL: Tool = {
  name: 'get_attention_stats',
  description: 'Get brain-inspired attention system statistics showing attention allocation, modality distribution, focus efficiency, and cognitive load metrics',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export const ALLOCATE_ATTENTION_TOOL: Tool = {
  name: 'allocate_attention',
  description: 'Dynamically allocate attention to specific nodes based on context and cognitive load theory',
  inputSchema: {
    type: 'object',
    properties: {
      node_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Node IDs to allocate attention to'
      },
      attention_type: {
        type: 'string',
        enum: ['selective', 'divided', 'sustained', 'executive'],
        description: 'Type of attention to allocate',
        default: 'selective'
      },
      context: {
        type: 'object',
        properties: {
          current_task: {
            type: 'string',
            description: 'Current task or focus area'
          },
          active_files: {
            type: 'array',
            items: { type: 'string' },
            description: 'Currently active files'
          },
          user_goals: {
            type: 'array',
            items: { type: 'string' },
            description: 'Current user goals or objectives'
          }
        },
        description: 'Attention context for dynamic allocation'
      }
    },
    required: ['node_ids'],
    additionalProperties: false
  }
};

export const UPDATE_ATTENTION_TOOL: Tool = {
  name: 'update_attention',
  description: 'Update attention system from user activity (file access, edits, errors, successes) for dynamic attention learning',
  inputSchema: {
    type: 'object',
    properties: {
      node_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Node IDs involved in the activity'
      },
      action_type: {
        type: 'string',
        enum: ['query', 'file_access', 'edit', 'error', 'success'],
        description: 'Type of activity performed'
      },
      query_text: {
        type: 'string',
        description: 'Query text if action_type is query'
      }
    },
    required: ['action_type'],
    additionalProperties: false
  }
};

export const GET_BI_TEMPORAL_STATS_TOOL: Tool = {
  name: 'get_bi_temporal_stats',
  description: 'Get bi-temporal knowledge model statistics showing valid time vs transaction time tracking, context windows, and temporal relationship analysis',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export const CREATE_CONTEXT_WINDOW_TOOL: Tool = {
  name: 'create_context_window',
  description: 'Create a temporal context window for grouping related changes and relationships within a specific time period',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the context window (e.g., "React v16 Migration", "Python 3.8 Upgrade")'
      },
      valid_time_start: {
        type: 'string',
        format: 'date-time',
        description: 'When this context window started (ISO 8601 format)'
      },
      valid_time_end: {
        type: 'string',
        format: 'date-time',
        description: 'When this context window ended (optional, null for ongoing)'
      },
      description: {
        type: 'string',
        description: 'Description of what this context window represents'
      },
      framework_versions: {
        type: 'object',
        additionalProperties: { type: 'string' },
        description: 'Framework versions during this period (e.g., {"react": "16.8.0", "node": "14.0.0"})'
      }
    },
    required: ['name', 'valid_time_start'],
    additionalProperties: false
  }
};

export const QUERY_BI_TEMPORAL_TOOL: Tool = {
  name: 'query_bi_temporal',
  description: 'Query relationships with temporal constraints - valid time, transaction time, and context windows',
  inputSchema: {
    type: 'object',
    properties: {
      as_of: {
        type: 'string',
        format: 'date-time',
        description: 'Query state as of this transaction time'
      },
      valid_at: {
        type: 'string',
        format: 'date-time', 
        description: 'Query relationships valid at this point in time'
      },
      valid_during_start: {
        type: 'string',
        format: 'date-time',
        description: 'Start of validity interval'
      },
      valid_during_end: {
        type: 'string',
        format: 'date-time',
        description: 'End of validity interval'
      },
      context_window: {
        type: 'string',
        description: 'Query within specific context window ID'
      },
      include_history: {
        type: 'boolean',
        description: 'Include revision history in results',
        default: false
      }
    },
    additionalProperties: false
  }
};

export const TEMPORAL_SNAPSHOT_TOOL: Tool = {
  name: 'create_temporal_snapshot',
  description: 'Create a temporal snapshot of the current knowledge state for analysis and comparison',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Optional name for the snapshot'
      }
    },
    additionalProperties: false
  }
};

export const INVALIDATE_RELATIONSHIP_TOOL: Tool = {
  name: 'invalidate_relationship',
  description: 'Mark a relationship as no longer valid (set valid time end)',
  inputSchema: {
    type: 'object',
    properties: {
      edge_id: {
        type: 'string',
        description: 'ID of the edge/relationship to invalidate'
      },
      invalidation_date: {
        type: 'string',
        format: 'date-time',
        description: 'When the relationship became invalid (defaults to now)'
      },
      reason: {
        type: 'string',
        description: 'Reason for invalidation (e.g., "code_refactor", "dependency_removed")',
        default: 'manual'
      },
      evidence: {
        type: 'array',
        items: { type: 'string' },
        description: 'Evidence supporting this invalidation'
      }
    },
    required: ['edge_id'],
    additionalProperties: false
  }
};

export const GET_PREDICTION_ENGINE_STATS_TOOL: Tool = {
  name: 'get_prediction_engine_stats',
  description: 'Get pattern prediction engine statistics showing emerging patterns, predictions, and trend analysis',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export const GET_PATTERN_PREDICTIONS_TOOL: Tool = {
  name: 'get_pattern_predictions',
  description: 'Get specific pattern predictions with probability, timeframe, and confidence analysis',
  inputSchema: {
    type: 'object',
    properties: {
      pattern_type: {
        type: 'string',
        description: 'Filter predictions by pattern type (optional)'
      }
    },
    additionalProperties: false
  }
};

export const GET_EMERGING_PATTERNS_TOOL: Tool = {
  name: 'get_emerging_patterns',
  description: 'Get patterns that are emerging but not yet fully established, with emergence stage and confidence',
  inputSchema: {
    type: 'object',
    properties: {
      emergence_stage: {
        type: 'string',
        enum: ['nascent', 'developing', 'emerging', 'established'],
        description: 'Filter by emergence stage (optional)'
      }
    },
    additionalProperties: false
  }
};

export const PREDICT_PATTERN_EMERGENCE_TOOL: Tool = {
  name: 'predict_pattern_emergence',
  description: 'Predict when a specific pattern will emerge with detailed analysis and alternatives',
  inputSchema: {
    type: 'object',
    properties: {
      pattern_type: {
        type: 'string',
        description: 'Pattern type to predict (e.g., "framework_react", "architectural_complexity")'
      }
    },
    required: ['pattern_type'],
    additionalProperties: false
  }
};

export const ANALYZE_AND_PREDICT_TOOL: Tool = {
  name: 'analyze_and_predict',
  description: 'Trigger immediate pattern analysis and prediction generation based on current project state',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export const ANALYZE_CALL_PATTERNS_TOOL: Tool = {
  name: 'analyze_call_patterns',
  description: 'Analyze function call patterns, method invocations, and code relationships within TypeScript/JavaScript files. Creates a comprehensive call graph with complexity metrics, recursion detection, and cross-file relationship mapping.',
  inputSchema: {
    type: 'object',
    properties: {
      file_paths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional array of specific file paths to analyze. If not provided, analyzes all TypeScript/JavaScript files in the project.'
      },
      include_cross_file: {
        type: 'boolean',
        default: true,
        description: 'Whether to analyze cross-file call patterns and dependencies (default: true)'
      },
      min_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        default: 0.6,
        description: 'Minimum confidence threshold for call pattern detection (default: 0.6)'
      }
    },
    additionalProperties: false
  }
};

export const UPDATE_IGNORE_PATTERNS_TOOL: Tool = {
  name: 'update_ignore_patterns',
  description: 'Update ignore patterns for file scanning with support for .gitignore and .mindmapignore files',
  inputSchema: {
    type: 'object',
    properties: {
      patterns: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of ignore patterns using .gitignore syntax (e.g., ["node_modules/**", "*.log", "dist/"])'
      },
      create_mindmapignore: {
        type: 'boolean',
        description: 'Create .mindmapignore file with the patterns (default: false)',
        default: false
      }
    },
    required: ['patterns'],
    additionalProperties: false
  }
};

export const TEST_IGNORE_PATTERNS_TOOL: Tool = {
  name: 'test_ignore_patterns',
  description: 'Test ignore patterns against project files to see what would be ignored',
  inputSchema: {
    type: 'object',
    properties: {
      patterns: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of ignore patterns to test'
      },
      sample_paths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional array of specific file paths to test against (uses project files if not provided)'
      }
    },
    required: ['patterns'],
    additionalProperties: false
  }
};

export const GET_IGNORE_STATS_TOOL: Tool = {
  name: 'get_ignore_stats',
  description: 'Get statistics about currently active ignore patterns and their effectiveness',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export const INIT_CLAUDE_CODE_TOOL: Tool = {
  name: 'init_claude_code',
  description: 'Get comprehensive setup instructions and configuration guidance for integrating Mind Map MCP with Claude Code',
  inputSchema: {
    type: 'object',
    properties: {
      setup_type: {
        type: 'string',
        enum: ['desktop', 'cli', 'full_guide'],
        description: 'Type of setup instructions needed (default: full_guide)'
      },
      platform: {
        type: 'string',
        enum: ['windows', 'macos', 'linux'],
        description: 'Operating system platform (optional - provides platform-specific instructions)'
      }
    },
    additionalProperties: false
  }
};

// Document Intelligence Tools (Phase 7.5)
export const ANALYZE_PROJECT_DOCUMENTATION_TOOL: Tool = {
  name: 'analyze_project_documentation',
  description: 'Analyze all documentation files in the project including markdown, restructured text, and configuration files. Provides comprehensive documentation analysis with brain-inspired relationship learning.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export const ANALYZE_DOCUMENT_TOOL: Tool = {
  name: 'analyze_document',
  description: 'Analyze a specific document file for structure, links, code relationships, and documentation quality',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Path to the document file to analyze'
      }
    },
    required: ['file_path'],
    additionalProperties: false
  }
};

export const GET_DOCUMENTATION_STATISTICS_TOOL: Tool = {
  name: 'get_documentation_statistics',
  description: 'Get comprehensive statistics about project documentation including word counts, link analysis, and coverage metrics',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export const GET_DOCUMENTATION_INSIGHTS_TOOL: Tool = {
  name: 'get_documentation_insights',
  description: 'Get intelligent insights about documentation quality, coverage gaps, broken links, and improvement recommendations',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export const GET_DOCUMENT_RELATIONSHIPS_TOOL: Tool = {
  name: 'get_document_relationships',
  description: 'Get relationships between documentation and code files, including implementation mappings and cross-references',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export const DETECT_CROSS_LANGUAGE_APIS_TOOL: Tool = {
  name: 'detect_cross_language_apis',
  description: 'Detect API endpoints, services, and schemas across all supported languages. Identifies REST APIs, GraphQL schemas, gRPC services, WebSocket endpoints, and WebAssembly modules with framework-specific pattern recognition.',
  inputSchema: {
    type: 'object',
    properties: {
      api_types: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['REST', 'GraphQL', 'gRPC', 'WebSocket', 'WebAssembly']
        },
        description: 'Filter by specific API types (optional - detects all types if not specified)',
        default: ['REST', 'GraphQL', 'gRPC', 'WebSocket', 'WebAssembly']
      },
      min_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Minimum confidence threshold for API detection (default: 0.3)',
        default: 0.3
      },
      include_schemas: {
        type: 'boolean',
        description: 'Include schema files (OpenAPI, GraphQL, proto, WASM) in results (default: true)',
        default: true
      }
    },
    additionalProperties: false
  }
};

export const ANALYZE_TEST_COVERAGE_TOOL: Tool = {
  name: 'analyze_test_coverage',
  description: 'Analyze test coverage by mapping test files to their corresponding implementation files. Identifies test-to-code relationships through naming patterns, imports, and code references with 95% accuracy target.',
  inputSchema: {
    type: 'object',
    properties: {
      include_orphans: {
        type: 'boolean',
        description: 'Include implementation files without test coverage (default: true)',
        default: true
      },
      include_untested: {
        type: 'boolean',
        description: 'Include test files without clear implementation targets (default: false)',
        default: false
      },
      min_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Minimum confidence threshold for test-implementation mapping (default: 0.5)',
        default: 0.5
      },
      group_by: {
        type: 'string',
        enum: ['file', 'directory', 'module'],
        description: 'How to group the coverage results (default: file)',
        default: 'file'
      }
    },
    additionalProperties: false
  }
};

export const ANALYZE_CONFIGURATION_RELATIONSHIPS_TOOL: Tool = {
  name: 'analyze_configuration_relationships',
  description: 'Analyze configuration file relationships and dependencies across the project. Tracks package.json, tsconfig.json, .env files, and other configuration files to understand project setup and dependencies.',
  inputSchema: {
    type: 'object',
    properties: {
      include_recommendations: {
        type: 'boolean',
        description: 'Include configuration optimization recommendations (default: true)',
        default: true
      },
      min_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Minimum confidence threshold for configuration detection (default: 0.6)',
        default: 0.6
      },
      config_types: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['package', 'build', 'env', 'editor', 'lint', 'test', 'framework', 'deployment', 'other']
        },
        description: 'Filter by specific configuration types (optional - analyzes all types if not specified)'
      }
    },
    additionalProperties: false
  }
};

export const ANALYZE_ERROR_PROPAGATION_TOOL: Tool = {
  name: 'analyze_error_propagation',
  description: 'Analyze error handling patterns and exception propagation flows across the codebase. Identifies unhandled errors, error handling coverage, and vulnerable areas for improved error resilience.',
  inputSchema: {
    type: 'object',
    properties: {
      include_recommendations: {
        type: 'boolean',
        description: 'Include error handling optimization recommendations (default: true)',
        default: true
      },
      min_confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Minimum confidence threshold for error pattern detection (default: 0.6)',
        default: 0.6
      },
      error_types: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['try_catch', 'error_throw', 'error_handler', 'validation', 'logging', 'propagation']
        },
        description: 'Filter by specific error handling types (optional - analyzes all types if not specified)'
      },
      severity_filter: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
        description: 'Filter by minimum severity level for unhandled error paths (optional)'
      }
    },
    additionalProperties: false
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
  EXECUTE_SAVED_QUERY_TOOL,
  DETECT_CROSS_LANGUAGE_DEPS_TOOL,
  ANALYZE_POLYGLOT_PROJECT_TOOL,
  GENERATE_MULTI_LANGUAGE_REFACTORINGS_TOOL,
  DETECT_PROJECT_TOOLING_TOOL,
  RUN_LANGUAGE_TOOL_TOOL,
  GET_TOOLING_RECOMMENDATIONS_TOOL,
  RUN_TOOL_SUITE_TOOL,
  DETECT_ENHANCED_FRAMEWORKS_TOOL,
  GET_FRAMEWORK_RECOMMENDATIONS_TOOL,
  GET_CACHE_STATS_TOOL,
  CLEAR_CACHE_TOOL,
  GET_INHIBITORY_STATS_TOOL,
  GET_HEBBIAN_STATS_TOOL,
  GET_MULTI_MODAL_FUSION_STATS_TOOL,
  GET_HIERARCHICAL_CONTEXT_STATS_TOOL,
  GET_CONTEXT_SUMMARY_TOOL,
  GET_ATTENTION_STATS_TOOL,
  ALLOCATE_ATTENTION_TOOL,
  UPDATE_ATTENTION_TOOL,
  GET_BI_TEMPORAL_STATS_TOOL,
  CREATE_CONTEXT_WINDOW_TOOL,
  QUERY_BI_TEMPORAL_TOOL,
  TEMPORAL_SNAPSHOT_TOOL,
  INVALIDATE_RELATIONSHIP_TOOL,
  GET_PREDICTION_ENGINE_STATS_TOOL,
  GET_PATTERN_PREDICTIONS_TOOL,
  GET_EMERGING_PATTERNS_TOOL,
  PREDICT_PATTERN_EMERGENCE_TOOL,
  ANALYZE_AND_PREDICT_TOOL,
  ANALYZE_CALL_PATTERNS_TOOL,
  UPDATE_IGNORE_PATTERNS_TOOL,
  TEST_IGNORE_PATTERNS_TOOL,
  GET_IGNORE_STATS_TOOL,
  INIT_CLAUDE_CODE_TOOL,
  ANALYZE_PROJECT_DOCUMENTATION_TOOL,
  ANALYZE_DOCUMENT_TOOL,
  GET_DOCUMENTATION_STATISTICS_TOOL,
  GET_DOCUMENTATION_INSIGHTS_TOOL,
  GET_DOCUMENT_RELATIONSHIPS_TOOL,
  DETECT_CROSS_LANGUAGE_APIS_TOOL,
  ANALYZE_TEST_COVERAGE_TOOL,
  ANALYZE_CONFIGURATION_RELATIONSHIPS_TOOL,
  ANALYZE_ERROR_PROPAGATION_TOOL
];