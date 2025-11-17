/**
 * Type Guard Utilities
 *
 * Replaces unsafe 'as any' assertions with proper type narrowing
 * Provides compile-time type safety and runtime validation
 */

import { MindMapNode, MindMapEdge } from '../types/index.js';

// ============================================================================
// Node.js Error Types
// ============================================================================

/**
 * Type guard for Node.js system errors with error codes
 */
export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

/**
 * Type guard for errors with specific codes
 */
export function hasErrorCode(error: unknown, code: string): error is NodeJS.ErrnoException {
  return isNodeError(error) && error.code === code;
}

// ============================================================================
// Mind Map Node Types
// ============================================================================

export type NodeType =
  | 'file'
  | 'directory'
  | 'function'
  | 'class'
  | 'method'
  | 'variable'
  | 'import'
  | 'export'
  | 'constant'
  | 'interface'
  | 'type'
  | 'module'
  | 'namespace';

/**
 * Type guard for valid node types
 */
export function isValidNodeType(value: unknown): value is NodeType {
  const validTypes: NodeType[] = [
    'file', 'directory', 'function', 'class', 'method', 'variable',
    'import', 'export', 'constant', 'interface', 'type', 'module', 'namespace'
  ];
  return typeof value === 'string' && validTypes.includes(value as NodeType);
}

// ============================================================================
// Aggregate Functions
// ============================================================================

export type AggregateFunction = 'count' | 'sum' | 'avg' | 'min' | 'max';

/**
 * Type guard for valid aggregate functions
 */
export function isValidAggregate(value: unknown): value is AggregateFunction {
  return typeof value === 'string' &&
    ['count', 'sum', 'avg', 'min', 'max'].includes(value);
}

/**
 * Parse string to aggregate function with safe default
 */
export function parseAggregate(value: string): AggregateFunction {
  const lowercase = value.toLowerCase();
  return isValidAggregate(lowercase) ? lowercase : 'count';
}

// ============================================================================
// Visibility Modifiers
// ============================================================================

export type Visibility = 'public' | 'private' | 'protected';

/**
 * Type guard for visibility modifiers
 */
export function isValidVisibility(value: unknown): value is Visibility {
  return typeof value === 'string' &&
    ['public', 'private', 'protected'].includes(value);
}

/**
 * Parse string to visibility with safe default
 */
export function parseVisibility(value: string | undefined): Visibility {
  if (value === 'private' || value === 'protected') return value;
  return 'public';
}

// ============================================================================
// Dynamic Property Access
// ============================================================================

/**
 * Safely get property from node with type narrowing
 */
export function getNodeProperty(
  node: MindMapNode,
  key: string
): string | number | boolean | undefined {
  // Check if property exists on node directly
  if (key in node) {
    const value = node[key as keyof MindMapNode];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
  }

  // Check metadata
  if (node.metadata && key in node.metadata) {
    const metadataValue = node.metadata[key];
    if (typeof metadataValue === 'string' || typeof metadataValue === 'number' || typeof metadataValue === 'boolean') {
      return metadataValue;
    }
  }

  return undefined;
}

/**
 * Safely get numeric property from node
 */
export function getNumericProperty(node: MindMapNode, key: string): number | undefined {
  const value = getNodeProperty(node, key);
  return typeof value === 'number' ? value : undefined;
}

/**
 * Safely get string property from node
 */
export function getStringProperty(node: MindMapNode, key: string): string | undefined {
  const value = getNodeProperty(node, key);
  return typeof value === 'string' ? value : undefined;
}

// ============================================================================
// Method Existence Checks
// ============================================================================

/**
 * Type guard to check if object has a specific method
 */
export function hasMethod<T extends object, K extends string>(
  obj: T,
  methodName: K
): obj is T & Record<K, Function> {
  return methodName in obj && typeof (obj as any)[methodName] === 'function';
}

/**
 * Type guard to check if object has a specific property
 */
export function hasProperty<T extends object, K extends string>(
  obj: T,
  propertyName: K
): obj is T & Record<K, unknown> {
  return propertyName in obj;
}

// ============================================================================
// Language/Framework Types
// ============================================================================

export type ProgrammingLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'go'
  | 'rust'
  | 'cpp'
  | 'csharp'
  | 'php'
  | 'ruby'
  | 'swift'
  | 'kotlin'
  | 'scala';

/**
 * Type guard for valid programming languages
 */
export function isValidLanguage(value: unknown): value is ProgrammingLanguage {
  const validLanguages: ProgrammingLanguage[] = [
    'typescript', 'javascript', 'python', 'java', 'go', 'rust',
    'cpp', 'csharp', 'php', 'ruby', 'swift', 'kotlin', 'scala'
  ];
  return typeof value === 'string' && validLanguages.includes(value as ProgrammingLanguage);
}

// ============================================================================
// Array Type Guards
// ============================================================================

/**
 * Type guard for array of specific type
 */
export function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T
): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

/**
 * Type guard for array of strings
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

/**
 * Type guard for array of numbers
 */
export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(item => typeof item === 'number');
}

// ============================================================================
// Object Type Guards
// ============================================================================

/**
 * Type guard for non-null objects
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for objects with specific keys
 */
export function hasKeys<K extends string>(
  obj: unknown,
  ...keys: K[]
): obj is Record<K, unknown> {
  if (!isObject(obj)) return false;
  return keys.every(key => key in obj);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Assert that a value is never reached (exhaustiveness checking)
 */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

/**
 * Safe JSON parse with type guard
 */
export function safeJSONParse<T>(
  json: string,
  guard: (value: unknown) => value is T
): T | null {
  try {
    const parsed = JSON.parse(json);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Type-safe Object.keys that preserves key types
 */
export function typedKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Type-safe Object.entries that preserves types
 */
export function typedEntries<T extends object>(
  obj: T
): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}
