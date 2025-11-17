/**
 * Base error class for all Mind Map MCP errors
 * Provides consistent error structure and serialization
 */
export abstract class MindMapError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    this.context = context;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error to JSON for logging and API responses
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack
    };
  }

  /**
   * Get user-friendly error message (without stack trace)
   */
  getUserMessage(): string {
    return `[${this.code}] ${this.message}`;
  }
}

/**
 * Parsing errors (AST, code analysis failures)
 */
export class ParseError extends MindMapError {
  constructor(
    message: string,
    public readonly filePath?: string,
    public readonly language?: string,
    public readonly cause?: Error
  ) {
    super(
      message,
      'PARSE_ERROR',
      { filePath, language, cause: cause?.message }
    );
  }
}

/**
 * Query execution errors
 */
export class QueryError extends MindMapError {
  constructor(
    message: string,
    public readonly query: string,
    public readonly queryType?: string,
    public readonly cause?: Error
  ) {
    super(
      message,
      'QUERY_ERROR',
      { query, queryType, cause: cause?.message }
    );
  }
}

/**
 * Storage and persistence errors
 */
export class StorageError extends MindMapError {
  constructor(
    message: string,
    public readonly operation: 'read' | 'write' | 'delete' | 'init',
    public readonly filePath?: string,
    public readonly cause?: Error
  ) {
    super(
      message,
      'STORAGE_ERROR',
      { operation, filePath, cause: cause?.message }
    );
  }
}

/**
 * Learning system errors (Hebbian, Attention, etc.)
 */
export class LearningError extends MindMapError {
  constructor(
    message: string,
    public readonly system: 'hebbian' | 'attention' | 'inhibitory' | 'episodic' | 'pattern_prediction',
    public readonly operation?: string,
    public readonly cause?: Error
  ) {
    super(
      message,
      'LEARNING_ERROR',
      { system, operation, cause: cause?.message }
    );
  }
}

/**
 * Configuration errors (user config, scalability settings, etc.)
 */
export class ConfigurationError extends MindMapError {
  constructor(
    message: string,
    public readonly configKey?: string,
    public readonly invalidValue?: any,
    public readonly cause?: Error
  ) {
    super(
      message,
      'CONFIG_ERROR',
      { configKey, invalidValue, cause: cause?.message }
    );
  }
}

/**
 * Validation errors (invalid input, missing required fields, etc.)
 */
export class ValidationError extends MindMapError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly expectedType?: string,
    public readonly receivedValue?: any
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      { field, expectedType, receivedValue }
    );
  }
}

/**
 * Tool execution errors (MCP tool failures)
 */
export class ToolExecutionError extends MindMapError {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly arguments?: Record<string, any>,
    public readonly cause?: Error
  ) {
    super(
      message,
      'TOOL_ERROR',
      { toolName, arguments, cause: cause?.message }
    );
  }
}

/**
 * Analysis errors (architectural analysis, error prediction, etc.)
 */
export class AnalysisError extends MindMapError {
  constructor(
    message: string,
    public readonly analysisType: string,
    public readonly target?: string,
    public readonly cause?: Error
  ) {
    super(
      message,
      'ANALYSIS_ERROR',
      { analysisType, target, cause: cause?.message }
    );
  }
}

/**
 * Network/External errors (API calls, external parsers, etc.)
 */
export class ExternalError extends MindMapError {
  constructor(
    message: string,
    public readonly externalSystem: string,
    public readonly operation?: string,
    public readonly cause?: Error
  ) {
    super(
      message,
      'EXTERNAL_ERROR',
      { externalSystem, operation, cause: cause?.message }
    );
  }
}

/**
 * Timeout errors (long-running operations)
 */
export class TimeoutError extends MindMapError {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly timeoutMs: number
  ) {
    super(
      message,
      'TIMEOUT_ERROR',
      { operation, timeoutMs }
    );
  }
}

/**
 * Resource errors (memory, file handles, etc.)
 */
export class ResourceError extends MindMapError {
  constructor(
    message: string,
    public readonly resource: 'memory' | 'file_handles' | 'cpu' | 'disk',
    public readonly limit?: number,
    public readonly current?: number
  ) {
    super(
      message,
      'RESOURCE_ERROR',
      { resource, limit, current }
    );
  }
}

/**
 * Utility function to check if an error is a Mind Map error
 */
export function isMindMapError(error: any): error is MindMapError {
  return error instanceof MindMapError;
}

/**
 * Utility function to wrap unknown errors in MindMapError
 */
export function wrapError(error: unknown, defaultMessage: string = 'An unexpected error occurred'): MindMapError {
  if (isMindMapError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new MindMapError(
      error.message || defaultMessage,
      'UNKNOWN_ERROR',
      { originalError: error.name, stack: error.stack }
    );
  }

  return new MindMapError(
    defaultMessage,
    'UNKNOWN_ERROR',
    { error: String(error) }
  );
}

/**
 * Error handler middleware for consistent error logging and formatting
 */
export class ErrorHandler {
  /**
   * Log error with appropriate level
   */
  static log(error: MindMapError): void {
    const errorJson = error.toJSON();

    if (error instanceof ResourceError || error instanceof TimeoutError) {
      console.warn('⚠️  Mind Map Warning:', errorJson);
    } else {
      console.error('❌ Mind Map Error:', errorJson);
    }
  }

  /**
   * Format error for API response
   */
  static formatForResponse(error: MindMapError): {
    success: false;
    error: {
      code: string;
      message: string;
      timestamp: string;
      context?: Record<string, any>;
    };
  } {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        timestamp: error.timestamp.toISOString(),
        context: error.context
      }
    };
  }

  /**
   * Handle error with logging and formatting
   */
  static handle(error: unknown): {
    success: false;
    error: {
      code: string;
      message: string;
      timestamp: string;
      context?: Record<string, any>;
    };
  } {
    const mindMapError = wrapError(error);
    this.log(mindMapError);
    return this.formatForResponse(mindMapError);
  }
}
