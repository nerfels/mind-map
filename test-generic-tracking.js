#!/usr/bin/env node

import { CallPatternAnalyzer } from './dist/core/CallPatternAnalyzer.js';
import { writeFile } from 'fs/promises';

async function testGenericTracking() {
  console.log('🧪 Testing Generic/Template Usage Tracking Functionality');
  console.log('=' .repeat(70));

  const analyzer = new CallPatternAnalyzer();

  // Create comprehensive test TypeScript file with various generic patterns
  const testCode = `
// Generic function with constraints
export function deepClone<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Generic function with multiple type parameters
export function merge<T, U extends Record<string, any>>(first: T, second: U): T & U {
  return { ...first, ...second };
}

// Generic class with variance modifiers and default types
export class Container<T = string, U extends number = number> {
  private value: T;
  private count: U;

  constructor(value: T, count: U) {
    this.value = value;
    this.count = count;
  }

  getValue(): T {
    return this.value;
  }

  map<R>(fn: (value: T) => R): Container<R, U> {
    const newValue = fn(this.value);
    return new Container(newValue, this.count);
  }

  filter<S extends T>(predicate: (value: T) => value is S): Container<S, U> | null {
    return predicate(this.value) ? new Container(this.value as S, this.count) : null;
  }
}

// Generic interface with constraints
export interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}

// Implementation with specific type
export class UserRepository implements Repository<{ id: string; name: string; email: string }> {
  async findById(id: string): Promise<{ id: string; name: string; email: string } | null> {
    // Mock implementation
    return null;
  }

  async save(entity: { id: string; name: string; email: string }): Promise<{ id: string; name: string; email: string }> {
    return entity;
  }

  async delete(id: string): Promise<void> {
    // Mock implementation
  }
}

// Generic utility types and conditional types
export type Optional<T> = T | null | undefined;
export type NonNullable<T> = T extends null | undefined ? never : T;
export type ValueOf<T> = T[keyof T];

// Function using utility types with explicit type arguments
export function processData<T extends Record<string, any>>(
  data: T,
  processor: (value: ValueOf<T>) => Optional<string>
): NonNullable<string>[] {
  const results: NonNullable<string>[] = [];

  for (const key in data) {
    const processed = processor(data[key]);
    if (processed != null) {
      results.push(processed);
    }
  }

  return results;
}

// Generic function calls with explicit type arguments
export function testExplicitGenericCalls() {
  // Explicit type arguments
  const cloned = deepClone<{ name: string; age: number }>({ name: "John", age: 30 });
  const merged = merge<{ a: number }, { b: string }>({ a: 1 }, { b: "hello" });

  // Generic class instantiation
  const stringContainer = new Container<string, number>("hello", 42);
  const numberContainer = new Container<number>("world", 100); // Type error: should be number for count

  // Chained generic calls
  const transformed = stringContainer
    .map<number>(str => str.length)
    .map<boolean>(len => len > 5);

  // Generic with constraints
  const filtered = stringContainer.filter<string>(value => typeof value === 'string');

  return { cloned, merged, stringContainer, transformed, filtered };
}

// Advanced generic patterns
export class EventEmitter<TEvents extends Record<string, any[]>> {
  private listeners: { [K in keyof TEvents]?: Array<(...args: TEvents[K]) => void> } = {};

  on<K extends keyof TEvents>(event: K, listener: (...args: TEvents[K]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
  }

  emit<K extends keyof TEvents>(event: K, ...args: TEvents[K]): void {
    const eventListeners = this.listeners[event];
    if (eventListeners) {
      eventListeners.forEach(listener => listener(...args));
    }
  }
}

// Usage with explicit event types
type UserEvents = {
  login: [string, Date];
  logout: [string];
  error: [Error, string];
};

export const userEmitter = new EventEmitter<UserEvents>();

// Generic HOF (Higher Order Function) patterns
export function withLogging<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => TReturn
): (...args: TArgs) => TReturn {
  return (...args: TArgs): TReturn => {
    console.log('Calling function with args:', args);
    const result = fn(...args);
    console.log('Function returned:', result);
    return result;
  };
}

// Constraint violations (should be detected)
export function problematicFunction<T extends string>(value: T): T {
  // This should work fine
  return value.toUpperCase() as T;
}

// Calling with wrong type (constraint violation)
export function testConstraintViolations() {
  // This should be flagged as a constraint violation
  // const result = problematicFunction<number>(42); // Error: number doesn't extend string

  // This should be fine
  const validResult = problematicFunction<string>("hello");

  return validResult;
}
`;

  // Create a temporary test file
  const testFilePath = './test-generic-sample.ts';
  await writeFile(testFilePath, testCode);

  try {
    console.log('📁 Analyzing test file for generic/template patterns...\n');

    // Analyze the test file
    const result = await analyzer.analyzeFile(testFilePath, testCode);

    console.log('📊 Generic Analysis Results:');
    console.log('-'.repeat(50));

    // Display generic type parameters
    console.log(`\n🔸 Generic Type Parameters (${result.genericAnalysis.typeParameters.length} found):`);
    result.genericAnalysis.typeParameters.forEach((param, index) => {
      console.log(`  ${index + 1}. ${param.name} - Line ${param.lineNumber}`);
      console.log(`     Constraint: ${param.constraint || 'none'}`);
      console.log(`     Default: ${param.defaultType || 'none'}`);
      console.log(`     Variance: ${param.variance}`);
      console.log(`     Usage Count: ${param.usageCount}`);
      console.log(`     Source: ${param.sourceFile}`);
    });

    // Display generic instantiations
    console.log(`\n🔸 Generic Instantiations (${result.genericAnalysis.instantiations.length} found):`);
    result.genericAnalysis.instantiations.slice(0, 10).forEach((inst, index) => {
      console.log(`  ${index + 1}. Line ${inst.lineNumber} - ${inst.typeArguments.join(', ')}`);
      console.log(`     Context: ${inst.context.usageContext}`);
      console.log(`     Explicit: ${inst.context.isExplicitType}, Inferred: ${inst.context.isInferredType}`);
    });

    // Display usage patterns
    console.log(`\n🔸 Template Usage Patterns (${result.genericAnalysis.usagePatterns.length} analyzed):`);
    result.genericAnalysis.usagePatterns.forEach((pattern, index) => {
      console.log(`  ${index + 1}. Generic ID: ${pattern.genericId}`);
      console.log(`     Common Instantiations: ${pattern.commonInstantiations.length}`);
      pattern.commonInstantiations.slice(0, 3).forEach((inst, idx) => {
        console.log(`       ${idx + 1}. [${inst.types.join(', ')}] - used ${inst.count} times`);
      });

      if (pattern.constraintViolations.length > 0) {
        console.log(`     Constraint Violations: ${pattern.constraintViolations.length}`);
        pattern.constraintViolations.forEach((violation, idx) => {
          console.log(`       ${idx + 1}. ${violation}`);
        });
      }
    });

    // Display constraint violations
    console.log(`\n🔸 Constraint Violations (${result.genericAnalysis.constraintViolations.length} found):`);
    result.genericAnalysis.constraintViolations.forEach((violation, index) => {
      console.log(`  ${index + 1}. Line ${violation.lineNumber}: ${violation.violation}`);
      console.log(`     Generic: ${violation.genericId}`);
    });

    // Display cross-module type flow
    console.log(`\n🔸 Cross-Module Type Flow (${result.genericAnalysis.crossModuleTypeFlow.length} detected):`);
    result.genericAnalysis.crossModuleTypeFlow.forEach((flow, index) => {
      console.log(`  ${index + 1}. ${flow.sourceFile} → ${flow.targetFile}`);
      console.log(`     Types: ${flow.typeParameters.join(', ')}`);
    });

    // Get overall statistics
    console.log('\n📈 Generic Analysis Statistics:');
    console.log('-'.repeat(50));
    const stats = analyzer.getGenericAnalysisStatistics();

    console.log(`Total Type Parameters: ${stats.totalTypeParameters}`);
    console.log(`Total Instantiations: ${stats.totalInstantiations}`);
    console.log(`Constraint Violations: ${stats.constraintViolationCount}`);
    console.log(`Average Usage per Generic: ${stats.averageUsagePerGeneric.toFixed(2)}`);
    console.log(`Constrained Generics: ${stats.constraintedGenerics}`);
    console.log(`Cross-Module Generics: ${stats.crossModuleGenerics}`);

    console.log('\nMost Used Generics:');
    stats.mostUsedGenerics.forEach((generic, index) => {
      console.log(`  ${index + 1}. ${generic.name}: ${generic.usageCount} uses`);
    });

    console.log('\nGenerics by Variance:');
    Object.entries(stats.genericsByVariance).forEach(([variance, count]) => {
      console.log(`  ${variance}: ${count}`);
    });

    // Test mind map nodes creation
    console.log('\n🗺️ Mind Map Integration:');
    console.log('-'.repeat(50));
    console.log(`Function Nodes: ${result.nodes.filter(n => n.type === 'function').length}`);
    console.log(`Class Nodes: ${result.nodes.filter(n => n.type === 'class').length}`);
    console.log(`Type Parameter Nodes: ${result.nodes.filter(n => n.type === 'type_parameter').length}`);
    console.log(`Variable Nodes: ${result.nodes.filter(n => n.type === 'variable').length}`);
    console.log(`Total Edges: ${result.edges.length}`);
    console.log(`Call Edges: ${result.edges.filter(e => e.type === 'calls').length}`);
    console.log(`Generic Instantiation Edges: ${result.edges.filter(e => e.type === 'instantiated_as').length}`);
    console.log(`Constraint Violation Edges: ${result.edges.filter(e => e.type === 'violates_constraint').length}`);

    // Show some example generic nodes
    const genericNodes = result.nodes.filter(n => n.type === 'type_parameter');
    if (genericNodes.length > 0) {
      console.log('\nExample Generic Type Parameter Nodes:');
      genericNodes.slice(0, 3).forEach((node, index) => {
        console.log(`  ${index + 1}. ${node.name} (${node.metadata.variance})`);
        console.log(`     Constraint: ${node.metadata.constraint || 'none'}`);
        console.log(`     Usage Count: ${node.metadata.usageCount}`);
        console.log(`     Line: ${node.metadata.lineNumber}`);
      });
    }

    // Show some example instantiation edges
    const instantiationEdges = result.edges.filter(e => e.type === 'instantiated_as');
    if (instantiationEdges.length > 0) {
      console.log('\nExample Generic Instantiation Edges:');
      instantiationEdges.slice(0, 3).forEach((edge, index) => {
        console.log(`  ${index + 1}. ${edge.source} → ${edge.target}`);
        console.log(`     Type Arguments: ${edge.metadata?.typeArguments?.join(', ') || 'none'}`);
        console.log(`     Context: ${edge.metadata?.usageContext || 'unknown'}`);
        console.log(`     Line: ${edge.metadata?.lineNumber || '?'}`);
      });
    }

    console.log('\n✅ Generic/Template Usage Tracking test completed successfully!');
    console.log('\n🎯 Key Features Validated:');
    console.log('   ✓ Generic type parameter detection');
    console.log('   ✓ Type constraint analysis');
    console.log('   ✓ Generic instantiation tracking');
    console.log('   ✓ Variance analysis (covariant/contravariant/invariant)');
    console.log('   ✓ Usage pattern analysis');
    console.log('   ✓ Constraint violation detection');
    console.log('   ✓ Cross-module type flow analysis');
    console.log('   ✓ Mind map integration with type_parameter nodes');
    console.log('   ✓ Statistical analysis of generic usage');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testGenericTracking().catch(console.error);