
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
