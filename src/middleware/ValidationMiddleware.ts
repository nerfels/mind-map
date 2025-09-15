export class ValidationMiddleware {
  static validateQuery(query: string): void {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }
    if (query.length > 1000) {
      throw new Error('Query too long (max 1000 characters)');
    }
    // Sanitize against potential injection
    if (query.includes('<script>') || query.includes('javascript:')) {
      throw new Error('Invalid characters in query');
    }
  }

  static validateLimit(limit?: number): void {
    if (limit !== undefined) {
      if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
        throw new Error('Limit must be a number between 1 and 1000');
      }
    }
  }

  static validateType(type?: string): void {
    if (type !== undefined) {
      const validTypes = ['file', 'directory', 'function', 'class', 'error', 'pattern'];
      if (!validTypes.includes(type)) {
        throw new Error(`Type must be one of: ${validTypes.join(', ')}`);
      }
    }
  }

  static validateTaskDescription(description: string): void {
    if (!description || typeof description !== 'string') {
      throw new Error('Task description must be a non-empty string');
    }
    if (description.length > 500) {
      throw new Error('Task description too long (max 500 characters)');
    }
  }

  static validateFilesInvolved(files: string[]): void {
    if (!Array.isArray(files)) {
      throw new Error('Files involved must be an array');
    }
    if (files.length > 50) {
      throw new Error('Too many files involved (max 50)');
    }
    for (const file of files) {
      if (typeof file !== 'string' || file.length > 500) {
        throw new Error('Each file path must be a string under 500 characters');
      }
    }
  }

  static validateOutcome(outcome: string): void {
    const validOutcomes = ['success', 'error', 'partial'];
    if (!validOutcomes.includes(outcome)) {
      throw new Error(`Outcome must be one of: ${validOutcomes.join(', ')}`);
    }
  }

  static validateErrorMessage(errorMessage: string): void {
    if (!errorMessage || typeof errorMessage !== 'string') {
      throw new Error('error_message is required and must be a string');
    }
    if (errorMessage.length > 1000) {
      throw new Error('error_message too long (max 1000 characters)');
    }
  }

  static validateFilePath(filePath?: string): void {
    if (filePath && (typeof filePath !== 'string' || filePath.length > 500)) {
      throw new Error('file_path must be a string under 500 characters');
    }
  }

  static validateAdvancedQuery(query: string): void {
    if (!query || typeof query !== 'string') {
      throw new Error('Query is required and must be a string');
    }
    if (query.length > 2000) {
      throw new Error('Query too long (max 2000 characters)');
    }
  }

  static validateTimeRange(timeRange: any): void {
    if (!timeRange?.start || !timeRange?.end) {
      throw new Error('time_range with start and end dates is required');
    }
  }

  static validateAggregation(aggregation: any): void {
    if (!aggregation?.function || !aggregation?.field) {
      throw new Error('Aggregation function and field are required');
    }
  }

  static validateQueryId(queryId: string): void {
    if (!queryId || typeof queryId !== 'string') {
      throw new Error('query_id is required and must be a string');
    }
  }

  static validateSaveQuery(name: string, description: string, query: string): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Name is required and must be a string');
    }
    if (!description || typeof description !== 'string') {
      throw new Error('Description is required and must be a string');
    }
    if (!query || typeof query !== 'string') {
      throw new Error('Query is required and must be a string');
    }
  }

  static validateNumericRange(value: number, min: number, max: number, fieldName: string): void {
    if (value < min || value > max) {
      throw new Error(`${fieldName} must be between ${min} and ${max}`);
    }
  }

  static validateToolName(toolName: string): void {
    if (!toolName || typeof toolName !== 'string') {
      throw new Error('tool_name is required and must be a string');
    }
  }

  static validateLanguage(language: string): void {
    if (!language || typeof language !== 'string') {
      throw new Error('language is required and must be a string');
    }
  }
}