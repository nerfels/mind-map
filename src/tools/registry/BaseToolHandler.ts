import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolHandler } from './ToolRegistry.js';
import { ResponseFormatter } from '../../middleware/ResponseFormatter.js';

/**
 * Abstract base class for tool handlers
 * Provides common functionality like response formatting and error handling
 */
export abstract class BaseToolHandler implements ToolHandler {
  protected readonly name: string;
  protected readonly description: string;
  protected readonly inputSchema: any;

  constructor(name: string, description: string, inputSchema: any) {
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
  }

  /**
   * Execute the tool - must be implemented by subclasses
   */
  abstract execute(args: any): Promise<any>;

  /**
   * Get the tool definition for MCP
   */
  getDefinition(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema
    };
  }

  /**
   * Get the tool name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Format success response
   */
  protected formatSuccess(data: any): any {
    return ResponseFormatter.success(data);
  }

  /**
   * Format error response
   */
  protected formatError(message: string, details?: any): any {
    return ResponseFormatter.error(message, details);
  }

  /**
   * Validate required arguments
   */
  protected validateArgs(args: any, required: string[]): void {
    for (const field of required) {
      if (!(field in args)) {
        throw new Error(`Missing required argument: ${field}`);
      }
    }
  }

  /**
   * Safe execution with automatic error handling
   */
  protected async safeExecute<T>(fn: () => Promise<T>): Promise<any> {
    try {
      const result = await fn();
      return this.formatSuccess(result);
    } catch (error) {
      console.error(`Error in ${this.name}:`, error);
      return this.formatError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        error
      );
    }
  }
}
