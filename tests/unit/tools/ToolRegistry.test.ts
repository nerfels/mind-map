/**
 * Tests for Tool Registry System
 *
 * Demonstrates testing patterns for the tool registry infrastructure
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry, ToolCategory, ToolHandler } from '../../../src/tools/registry/ToolRegistry.js';
import { BaseToolHandler } from '../../../src/tools/registry/BaseToolHandler.js';

// Mock tool handler for testing
class MockQueryTool extends BaseToolHandler {
  constructor() {
    super(
      'mock_query',
      'Mock query tool for testing',
      {
        type: 'object',
        properties: {
          query: { type: 'string' }
        },
        required: ['query']
      }
    );
  }

  async execute(args: { query: string }): Promise<any> {
    return this.safeExecute(async () => {
      return {
        query: args.query,
        results: [`Result for: ${args.query}`]
      };
    });
  }
}

class MockAnalysisTool extends BaseToolHandler {
  constructor() {
    super(
      'mock_analysis',
      'Mock analysis tool for testing',
      {
        type: 'object',
        properties: {
          filePath: { type: 'string' }
        },
        required: ['filePath']
      }
    );
  }

  async execute(args: { filePath: string }): Promise<any> {
    return this.safeExecute(async () => {
      return {
        filePath: args.filePath,
        analysis: { complexity: 5 }
      };
    });
  }
}

class ErrorTool extends BaseToolHandler {
  constructor() {
    super('error_tool', 'Tool that throws errors', {
      type: 'object',
      properties: {}
    });
  }

  async execute(args: any): Promise<any> {
    throw new Error('Test error from tool');
  }
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('Registration', () => {
    it('should register a single tool', () => {
      const tool = new MockQueryTool();
      registry.register(tool, ToolCategory.QUERY);

      expect(registry.has('mock_query')).toBe(true);
      expect(registry.getToolCount()).toBe(1);
    });

    it('should register multiple tools', () => {
      const queryTool = new MockQueryTool();
      const analysisTool = new MockAnalysisTool();

      registry.registerMany([
        { handler: queryTool, category: ToolCategory.QUERY },
        { handler: analysisTool, category: ToolCategory.ANALYSIS }
      ]);

      expect(registry.getToolCount()).toBe(2);
      expect(registry.has('mock_query')).toBe(true);
      expect(registry.has('mock_analysis')).toBe(true);
    });

    it('should throw error when registering duplicate tool', () => {
      const tool1 = new MockQueryTool();
      const tool2 = new MockQueryTool();

      registry.register(tool1, ToolCategory.QUERY);

      expect(() => {
        registry.register(tool2, ToolCategory.QUERY);
      }).toThrow("Tool 'mock_query' is already registered");
    });
  });

  describe('Retrieval', () => {
    beforeEach(() => {
      registry.register(new MockQueryTool(), ToolCategory.QUERY);
      registry.register(new MockAnalysisTool(), ToolCategory.ANALYSIS);
    });

    it('should get tool by name', () => {
      const tool = registry.get('mock_query');

      expect(tool).toBeDefined();
      expect(tool?.getName()).toBe('mock_query');
    });

    it('should return undefined for unknown tool', () => {
      const tool = registry.get('nonexistent');

      expect(tool).toBeUndefined();
    });

    it('should get all tool names', () => {
      const names = registry.getAllNames();

      expect(names).toContain('mock_query');
      expect(names).toContain('mock_analysis');
      expect(names).toHaveLength(2);
    });

    it('should get all tool definitions', () => {
      const definitions = registry.getAllDefinitions();

      expect(definitions).toHaveLength(2);
      expect(definitions[0]).toHaveProperty('name');
      expect(definitions[0]).toHaveProperty('description');
      expect(definitions[0]).toHaveProperty('inputSchema');
    });
  });

  describe('Category-based Access', () => {
    beforeEach(() => {
      registry.register(new MockQueryTool(), ToolCategory.QUERY);
      registry.register(new MockAnalysisTool(), ToolCategory.ANALYSIS);
    });

    it('should get tools by category', () => {
      const queryTools = registry.getByCategory(ToolCategory.QUERY);
      const analysisTools = registry.getByCategory(ToolCategory.ANALYSIS);

      expect(queryTools).toHaveLength(1);
      expect(analysisTools).toHaveLength(1);
      expect(queryTools[0].getName()).toBe('mock_query');
      expect(analysisTools[0].getName()).toBe('mock_analysis');
    });

    it('should return empty array for category with no tools', () => {
      const systemTools = registry.getByCategory(ToolCategory.SYSTEM);

      expect(systemTools).toEqual([]);
    });

    it('should get tools grouped by category', () => {
      const grouped = registry.getToolsByCategory();

      expect(grouped.get(ToolCategory.QUERY)).toContain('mock_query');
      expect(grouped.get(ToolCategory.ANALYSIS)).toContain('mock_analysis');
    });
  });

  describe('Execution', () => {
    beforeEach(() => {
      registry.register(new MockQueryTool(), ToolCategory.QUERY);
      registry.register(new MockAnalysisTool(), ToolCategory.ANALYSIS);
    });

    it('should execute a tool successfully', async () => {
      const result = await registry.execute('mock_query', { query: 'test' });

      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('test');
    });

    it('should throw error for unknown tool', async () => {
      await expect(
        registry.execute('nonexistent', {})
      ).rejects.toThrow('Unknown tool: nonexistent');
    });

    it('should handle tool execution errors', async () => {
      registry.register(new ErrorTool(), ToolCategory.SYSTEM);

      const result = await registry.execute('error_tool', {});

      // Tool should return error response, not throw
      expect(result).toHaveProperty('content');
      expect(result.isError).toBe(true);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      registry.register(new MockQueryTool(), ToolCategory.QUERY);
      registry.register(new MockAnalysisTool(), ToolCategory.ANALYSIS);
    });

    it('should get registry statistics', () => {
      const stats = registry.getStats();

      expect(stats.totalTools).toBe(2);
      expect(stats.byCategory).toHaveProperty('query', 1);
      expect(stats.byCategory).toHaveProperty('analysis', 1);
    });
  });

  describe('Clear', () => {
    it('should clear all registered tools', () => {
      registry.register(new MockQueryTool(), ToolCategory.QUERY);
      registry.register(new MockAnalysisTool(), ToolCategory.ANALYSIS);

      expect(registry.getToolCount()).toBe(2);

      registry.clear();

      expect(registry.getToolCount()).toBe(0);
      expect(registry.has('mock_query')).toBe(false);
      expect(registry.has('mock_analysis')).toBe(false);
    });
  });
});
