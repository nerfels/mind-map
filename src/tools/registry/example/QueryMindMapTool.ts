import { BaseToolHandler } from '../BaseToolHandler.js';
import { MindMapEngine } from '../../../core/MindMapEngine.js';

/**
 * Example tool handler implementation for 'query_mindmap'
 *
 * This demonstrates how to migrate from the switch statement pattern
 * to the registry pattern.
 *
 * OLD PATTERN (index.ts):
 * ```
 * case 'query_mindmap':
 *   return await this.queryHandlers.handleQueryMindMap(args);
 * ```
 *
 * NEW PATTERN:
 * ```
 * toolRegistry.register(new QueryMindMapTool(mindMap), ToolCategory.QUERY);
 * ```
 */
export class QueryMindMapTool extends BaseToolHandler {
  private mindMap: MindMapEngine;

  constructor(mindMap: MindMapEngine) {
    super(
      'query_mindmap',
      'Query the mind map knowledge graph with advanced neural activation spreading',
      {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language query to search the project knowledge graph'
          },
          threshold: {
            type: 'number',
            description: 'Minimum confidence threshold (0-1) for results. Default: 0.3',
            default: 0.3
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return. Default: 10',
            default: 10
          },
          includeSimilar: {
            type: 'boolean',
            description: 'Include semantically similar results using neural activation. Default: true',
            default: true
          }
        },
        required: ['query']
      }
    );

    this.mindMap = mindMap;
  }

  /**
   * Execute the query tool
   */
  async execute(args: {
    query: string;
    threshold?: number;
    limit?: number;
    includeSimilar?: boolean;
  }): Promise<any> {
    return this.safeExecute(async () => {
      // Validate required arguments
      this.validateArgs(args, ['query']);

      // Set defaults
      const threshold = args.threshold ?? 0.3;
      const limit = args.limit ?? 10;
      const includeSimilar = args.includeSimilar ?? true;

      // Execute query
      const results = await this.mindMap.query(args.query, {
        threshold,
        limit,
        includeSimilar
      });

      return {
        query: args.query,
        results,
        metadata: {
          totalResults: results.length,
          threshold,
          limit,
          activationSpread: includeSimilar
        }
      };
    });
  }
}

/**
 * Example factory function for easy registration
 */
export function createQueryTools(mindMap: MindMapEngine): BaseToolHandler[] {
  return [
    new QueryMindMapTool(mindMap)
    // Add more query-related tools here:
    // new AdvancedQueryTool(mindMap),
    // new TemporalQueryTool(mindMap),
    // etc.
  ];
}
