/**
 * Tests for Type Guard Utilities
 *
 * Demonstrates Vitest testing patterns for Mind Map MCP
 */

import { describe, it, expect } from 'vitest';
import {
  isNodeError,
  hasErrorCode,
  isValidNodeType,
  isValidAggregate,
  parseAggregate,
  isValidVisibility,
  parseVisibility,
  getNodeProperty,
  getNumericProperty,
  getStringProperty,
  hasMethod,
  hasProperty,
  isValidLanguage,
  isArrayOf,
  isStringArray,
  isNumberArray,
  isObject,
  hasKeys,
  typedKeys,
  typedEntries
} from '../../../src/utils/TypeGuards.js';
import { createMockNode } from '../../setup.js';

describe('TypeGuards', () => {
  describe('Node.js Error Guards', () => {
    it('should identify Node.js errors', () => {
      const error = new Error('Test error');
      (error as any).code = 'ENOENT';

      expect(isNodeError(error)).toBe(true);
      expect(isNodeError(new Error('Normal error'))).toBe(false);
      expect(isNodeError('not an error')).toBe(false);
    });

    it('should check specific error codes', () => {
      const error = new Error('Test error');
      (error as any).code = 'ENOENT';

      expect(hasErrorCode(error, 'ENOENT')).toBe(true);
      expect(hasErrorCode(error, 'EEXIST')).toBe(false);
      expect(hasErrorCode('not an error', 'ENOENT')).toBe(false);
    });
  });

  describe('Node Type Guards', () => {
    it('should validate node types', () => {
      expect(isValidNodeType('file')).toBe(true);
      expect(isValidNodeType('function')).toBe(true);
      expect(isValidNodeType('class')).toBe(true);
      expect(isValidNodeType('invalid')).toBe(false);
      expect(isValidNodeType(123)).toBe(false);
    });
  });

  describe('Aggregate Function Guards', () => {
    it('should validate aggregate functions', () => {
      expect(isValidAggregate('count')).toBe(true);
      expect(isValidAggregate('sum')).toBe(true);
      expect(isValidAggregate('avg')).toBe(true);
      expect(isValidAggregate('invalid')).toBe(false);
    });

    it('should parse aggregate functions with fallback', () => {
      expect(parseAggregate('COUNT')).toBe('count');
      expect(parseAggregate('Sum')).toBe('sum');
      expect(parseAggregate('invalid')).toBe('count');
    });
  });

  describe('Visibility Guards', () => {
    it('should validate visibility modifiers', () => {
      expect(isValidVisibility('public')).toBe(true);
      expect(isValidVisibility('private')).toBe(true);
      expect(isValidVisibility('protected')).toBe(true);
      expect(isValidVisibility('invalid')).toBe(false);
    });

    it('should parse visibility with default', () => {
      expect(parseVisibility('private')).toBe('private');
      expect(parseVisibility('protected')).toBe('protected');
      expect(parseVisibility('invalid')).toBe('public');
      expect(parseVisibility(undefined)).toBe('public');
    });
  });

  describe('Dynamic Property Access', () => {
    it('should safely get node properties', () => {
      const node = createMockNode({
        name: 'test-file.ts',
        confidence: 0.95,
        metadata: {
          language: 'typescript',
          lineCount: 100
        }
      });

      expect(getNodeProperty(node, 'name')).toBe('test-file.ts');
      expect(getNodeProperty(node, 'confidence')).toBe(0.95);
      expect(getNodeProperty(node, 'language')).toBe('typescript');
      expect(getNodeProperty(node, 'lineCount')).toBe(100);
      expect(getNodeProperty(node, 'nonexistent')).toBeUndefined();
    });

    it('should get numeric properties', () => {
      const node = createMockNode({
        confidence: 0.85,
        metadata: { lineCount: 200 }
      });

      expect(getNumericProperty(node, 'confidence')).toBe(0.85);
      expect(getNumericProperty(node, 'lineCount')).toBe(200);
      expect(getNumericProperty(node, 'name')).toBeUndefined();
    });

    it('should get string properties', () => {
      const node = createMockNode({
        name: 'test.ts',
        metadata: { language: 'typescript' }
      });

      expect(getStringProperty(node, 'name')).toBe('test.ts');
      expect(getStringProperty(node, 'language')).toBe('typescript');
      expect(getStringProperty(node, 'confidence')).toBeUndefined();
    });
  });

  describe('Method/Property Existence', () => {
    it('should check for methods', () => {
      const obj = {
        myMethod: () => 'result',
        myProp: 'value'
      };

      expect(hasMethod(obj, 'myMethod')).toBe(true);
      expect(hasMethod(obj, 'myProp')).toBe(false);
      expect(hasMethod(obj, 'nonexistent')).toBe(false);
    });

    it('should check for properties', () => {
      const obj = {
        prop1: 'value1',
        prop2: 42
      };

      expect(hasProperty(obj, 'prop1')).toBe(true);
      expect(hasProperty(obj, 'prop2')).toBe(true);
      expect(hasProperty(obj, 'prop3')).toBe(false);
    });
  });

  describe('Language Guards', () => {
    it('should validate programming languages', () => {
      expect(isValidLanguage('typescript')).toBe(true);
      expect(isValidLanguage('python')).toBe(true);
      expect(isValidLanguage('rust')).toBe(true);
      expect(isValidLanguage('invalid')).toBe(false);
    });
  });

  describe('Array Type Guards', () => {
    it('should validate string arrays', () => {
      expect(isStringArray(['a', 'b', 'c'])).toBe(true);
      expect(isStringArray([1, 2, 3])).toBe(false);
      expect(isStringArray(['a', 1, 'b'])).toBe(false);
      expect(isStringArray('not an array')).toBe(false);
    });

    it('should validate number arrays', () => {
      expect(isNumberArray([1, 2, 3])).toBe(true);
      expect(isNumberArray(['a', 'b'])).toBe(false);
      expect(isNumberArray([1, 'a', 2])).toBe(false);
    });

    it('should validate arrays with custom guard', () => {
      const isPositive = (n: unknown): n is number => typeof n === 'number' && n > 0;

      expect(isArrayOf([1, 2, 3], isPositive)).toBe(true);
      expect(isArrayOf([1, -1, 2], isPositive)).toBe(false);
      expect(isArrayOf('not array', isPositive)).toBe(false);
    });
  });

  describe('Object Type Guards', () => {
    it('should validate objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
      expect(isObject(null)).toBe(false);
      expect(isObject([])).toBe(false);
      expect(isObject('string')).toBe(false);
    });

    it('should check for required keys', () => {
      const obj = { name: 'test', age: 25, city: 'NYC' };

      expect(hasKeys(obj, 'name', 'age')).toBe(true);
      expect(hasKeys(obj, 'name', 'country')).toBe(false);
      expect(hasKeys('not object', 'key')).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('should get typed keys', () => {
      const obj = { a: 1, b: 'test', c: true };
      const keys = typedKeys(obj);

      expect(keys).toEqual(['a', 'b', 'c']);
      // TypeScript should infer the type as ('a' | 'b' | 'c')[]
    });

    it('should get typed entries', () => {
      const obj = { a: 1, b: 'test' };
      const entries = typedEntries(obj);

      expect(entries).toEqual([
        ['a', 1],
        ['b', 'test']
      ]);
      // TypeScript should infer proper tuple types
    });
  });
});
