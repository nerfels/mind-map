import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Tool handler interface
 * All MCP tool handlers must implement this interface
 */
export interface ToolHandler {
  /**
   * Execute the tool with the given arguments
   * @param args The arguments passed to the tool
   * @returns The tool execution result
   */
  execute(args: any): Promise<any>;

  /**
   * Get the tool definition for MCP registration
   * @returns The tool definition
   */
  getDefinition(): Tool;

  /**
   * Get the tool name
   * @returns The tool name
   */
  getName(): string;
}

/**
 * Tool category for organizing tools
 */
export enum ToolCategory {
  QUERY = 'query',
  ANALYSIS = 'analysis',
  SYSTEM = 'system',
  TOOLING = 'tooling',
  FRAMEWORK = 'framework',
  DOCUMENT = 'document',
  LEARNING = 'learning'
}

/**
 * Tool metadata for registration
 */
export interface ToolMetadata {
  name: string;
  category: ToolCategory;
  description: string;
  handler: ToolHandler;
}

/**
 * Central registry for all MCP tools
 * Provides:
 * - Dynamic tool registration
 * - Automatic handler routing
 * - Tool discovery by category
 * - Centralized tool management
 *
 * Benefits over switch statement:
 * - Open/Closed Principle - easy to add new tools
 * - Single Responsibility - each tool is independent
 * - Better testability - test tools in isolation
 * - No massive switch statement
 */
export class ToolRegistry {
  private tools: Map<string, ToolHandler> = new Map();
  private categories: Map<ToolCategory, Set<string>> = new Map();

  constructor() {
    // Initialize category sets
    for (const category of Object.values(ToolCategory)) {
      this.categories.set(category as ToolCategory, new Set());
    }
  }

  /**
   * Register a new tool
   */
  register(handler: ToolHandler, category: ToolCategory): void {
    const name = handler.getName();

    if (this.tools.has(name)) {
      throw new Error(`Tool '${name}' is already registered`);
    }

    this.tools.set(name, handler);
    this.categories.get(category)?.add(name);

    console.log(`✅ Registered tool: ${name} (${category})`);
  }

  /**
   * Register multiple tools at once
   */
  registerMany(handlers: Array<{ handler: ToolHandler; category: ToolCategory }>): void {
    for (const { handler, category } of handlers) {
      this.register(handler, category);
    }
  }

  /**
   * Get a tool handler by name
   */
  get(name: string): ToolHandler | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Execute a tool by name
   */
  async execute(name: string, args: any): Promise<any> {
    const handler = this.tools.get(name);

    if (!handler) {
      throw new Error(`Unknown tool: ${name}. Available tools: ${Array.from(this.tools.keys()).join(', ')}`);
    }

    try {
      return await handler.execute(args);
    } catch (error) {
      console.error(`Error executing tool '${name}':`, error);
      throw error;
    }
  }

  /**
   * Get all registered tool definitions for MCP
   */
  getAllDefinitions(): Tool[] {
    return Array.from(this.tools.values()).map(handler => handler.getDefinition());
  }

  /**
   * Get all tool names
   */
  getAllNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tools by category
   */
  getByCategory(category: ToolCategory): ToolHandler[] {
    const names = this.categories.get(category);
    if (!names) return [];

    return Array.from(names)
      .map(name => this.tools.get(name))
      .filter((handler): handler is ToolHandler => handler !== undefined);
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Get tools grouped by category
   */
  getToolsByCategory(): Map<ToolCategory, string[]> {
    const result = new Map<ToolCategory, string[]>();

    for (const [category, names] of this.categories.entries()) {
      result.set(category, Array.from(names));
    }

    return result;
  }

  /**
   * Clear all registered tools (useful for testing)
   */
  clear(): void {
    this.tools.clear();
    for (const category of this.categories.values()) {
      category.clear();
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalTools: number;
    byCategory: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};

    for (const [category, names] of this.categories.entries()) {
      byCategory[category] = names.size;
    }

    return {
      totalTools: this.tools.size,
      byCategory
    };
  }
}

/**
 * Global singleton instance
 */
export const toolRegistry = new ToolRegistry();
