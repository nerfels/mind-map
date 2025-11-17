/**
 * Tests for Tree-sitter Adapter
 *
 * Demonstrates integration between Tree-sitter and BaseLanguageAnalyzer pattern
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  TreeSitterAdapter,
  getTreeSitterAdapter,
  resetTreeSitterAdapter
} from '../../../src/core/parsers/TreeSitterAdapter.js';
import { SupportedLanguage } from '../../../src/core/parsers/TreeSitterParser.js';

describe('TreeSitterAdapter', () => {
  let adapter: TreeSitterAdapter;

  beforeAll(async () => {
    resetTreeSitterAdapter();
    adapter = getTreeSitterAdapter();
    await adapter.initialize();
  });

  describe('Function Extraction', () => {
    it('should extract TypeScript functions', async () => {
      const code = `
        function greet(name: string): string {
          return \`Hello, \${name}!\`;
        }

        function add(a: number, b: number): number {
          return a + b;
        }
      `;

      const parseResult = await adapter.parseFile('test.ts', code);
      const functions = await adapter.extractFunctions(parseResult, 'test.ts');

      expect(functions.length).toBeGreaterThanOrEqual(2);

      const greetFunc = functions.find(f => f.name === 'greet');
      expect(greetFunc).toBeDefined();
      expect(greetFunc?.parameters).toEqual(['name']);
      expect(greetFunc?.startLine).toBeGreaterThan(0);
      expect(greetFunc?.endLine).toBeGreaterThan(greetFunc?.startLine!);
    });

    it('should extract Python functions', async () => {
      const code = `
def calculate_sum(numbers):
    total = 0
    for num in numbers:
        total += num
    return total

def multiply(a, b):
    return a * b
      `;

      const parseResult = await adapter.parseFile('test.py', code);
      const functions = await adapter.extractFunctions(parseResult, 'test.py');

      expect(functions.length).toBe(2);
      expect(functions[0].name).toBe('calculate_sum');
      expect(functions[0].parameters).toEqual(['numbers']);
      expect(functions[1].name).toBe('multiply');
      expect(functions[1].parameters).toEqual(['a', 'b']);
    });

    it('should extract Java methods', async () => {
      const code = `
public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }

    private int subtract(int x, int y) {
        return x - y;
    }
}
      `;

      const parseResult = await adapter.parseFile('Calculator.java', code);
      const functions = await adapter.extractFunctions(parseResult, 'Calculator.java');

      expect(functions.length).toBeGreaterThanOrEqual(2);

      const addMethod = functions.find(f => f.name === 'add');
      expect(addMethod).toBeDefined();
      expect(addMethod?.parameters).toEqual(['a', 'b']);
    });

    it('should extract Go functions', async () => {
      const code = `
package main

func add(a int, b int) int {
    return a + b
}

func greet(name string) string {
    return "Hello, " + name
}
      `;

      const parseResult = await adapter.parseFile('main.go', code);
      const functions = await adapter.extractFunctions(parseResult, 'main.go');

      expect(functions.length).toBe(2);
      expect(functions[0].name).toBe('add');
      expect(functions[1].name).toBe('greet');
    });
  });

  describe('Class Extraction', () => {
    it('should extract TypeScript classes', async () => {
      const code = `
        class Person {
          constructor(public name: string) {}

          greet(): string {
            return \`Hello, I'm \${this.name}\`;
          }
        }

        class Calculator {
          add(a: number, b: number): number {
            return a + b;
          }
        }
      `;

      const parseResult = await adapter.parseFile('test.ts', code);
      const classes = await adapter.extractClasses(parseResult, 'test.ts');

      expect(classes.length).toBe(2);
      expect(classes[0].name).toBe('Person');
      expect(classes[1].name).toBe('Calculator');
      expect(classes[0].startLine).toBeGreaterThan(0);
    });

    it('should extract Python classes', async () => {
      const code = `
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        pass

class Dog(Animal):
    def speak(self):
        return f"{self.name} says Woof!"
      `;

      const parseResult = await adapter.parseFile('test.py', code);
      const classes = await adapter.extractClasses(parseResult, 'test.py');

      expect(classes.length).toBe(2);
      expect(classes[0].name).toBe('Animal');
      expect(classes[1].name).toBe('Dog');
    });

    it('should extract Java classes', async () => {
      const code = `
public class Person {
    private String name;
    private int age;

    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
}

class Employee extends Person {
    private String employeeId;

    public Employee(String name, int age, String id) {
        super(name, age);
        this.employeeId = id;
    }
}
      `;

      const parseResult = await adapter.parseFile('Person.java', code);
      const classes = await adapter.extractClasses(parseResult, 'Person.java');

      expect(classes.length).toBe(2);
      expect(classes[0].name).toBe('Person');
      expect(classes[1].name).toBe('Employee');
    });
  });

  describe('Import Extraction', () => {
    it('should extract TypeScript imports', async () => {
      const code = `
        import { useState } from 'react';
        import express from 'express';
        import * as fs from 'fs';
      `;

      const parseResult = await adapter.parseFile('test.ts', code);
      const imports = await adapter.extractImports(parseResult, 'test.ts');

      expect(imports).toContain('react');
      expect(imports).toContain('express');
      expect(imports).toContain('fs');
    });

    it('should extract Python imports', async () => {
      const code = `
import os
import sys
from collections import defaultdict
from typing import List, Dict
      `;

      const parseResult = await adapter.parseFile('test.py', code);
      const imports = await adapter.extractImports(parseResult, 'test.py');

      expect(imports).toContain('os');
      expect(imports).toContain('sys');
      expect(imports).toContain('collections');
      expect(imports).toContain('typing');
    });

    it('should extract Java imports', async () => {
      const code = `
import java.util.List;
import java.util.ArrayList;
import java.io.File;
      `;

      const parseResult = await adapter.parseFile('Test.java', code);
      const imports = await adapter.extractImports(parseResult, 'Test.java');

      expect(imports.length).toBeGreaterThan(0);
    });
  });

  describe('All Elements Extraction', () => {
    it('should extract all elements from TypeScript file', async () => {
      const code = `
        interface User {
          name: string;
          age: number;
        }

        class UserService {
          getUser(id: string): User {
            return { name: "Test", age: 25 };
          }
        }

        function processUser(user: User) {
          console.log(user.name);
        }
      `;

      const parseResult = await adapter.parseFile('test.ts', code);
      const elements = await adapter.extractAllElements(parseResult, 'test.ts');

      expect(elements.length).toBeGreaterThan(0);

      const interfaces = elements.filter(e => e.type === 'interface');
      const classes = elements.filter(e => e.type === 'class');
      const functions = elements.filter(e => e.type === 'function');

      expect(interfaces.length).toBeGreaterThanOrEqual(1);
      expect(classes.length).toBeGreaterThanOrEqual(1);
      expect(functions.length).toBeGreaterThanOrEqual(1);
    });

    it('should provide detailed element metadata', async () => {
      const code = `
        function greet(name: string): string {
          return \`Hello, \${name}!\`;
        }
      `;

      const parseResult = await adapter.parseFile('test.ts', code);
      const elements = await adapter.extractAllElements(parseResult, 'test.ts');

      expect(elements.length).toBeGreaterThan(0);

      const func = elements[0];
      expect(func.name).toBe('greet');
      expect(func.type).toBe('function');
      expect(func.parameters).toEqual(['name']);
      expect(func.startLine).toBeGreaterThan(0);
      expect(func.endLine).toBeGreaterThan(func.startLine);
      expect(func.body).toBeDefined();
      expect(func.metadata).toBeDefined();
    });
  });

  describe('CodeStructure Conversion', () => {
    it('should convert to CodeStructure format', async () => {
      const code = `
        import { Component } from 'react';

        class MyComponent extends Component {
          render() {
            return <div>Hello</div>;
          }
        }

        function helper(value: string) {
          return value.toUpperCase();
        }
      `;

      const parseResult = await adapter.parseFile('MyComponent.tsx', code);
      const codeStructure = await adapter.toCodeStructure(parseResult, 'MyComponent.tsx');

      expect(codeStructure.filePath).toBe('MyComponent.tsx');
      expect(codeStructure.language).toBe(SupportedLanguage.TYPESCRIPT);
      expect(codeStructure.functions.length).toBeGreaterThan(0);
      expect(codeStructure.classes.length).toBeGreaterThan(0);
      expect(codeStructure.imports).toContain('react');
      expect(codeStructure.complexity).toBeGreaterThan(0);
      expect(codeStructure.linesOfCode).toBeGreaterThan(0);
      expect(codeStructure.parseTime).toBeGreaterThan(0);
    });
  });

  describe('Available Queries', () => {
    it('should list available queries for TypeScript', () => {
      const queries = adapter.getAvailableQueries('test.ts');

      expect(queries).toContain('functions');
      expect(queries).toContain('classes');
      expect(queries).toContain('imports');
      expect(queries).toContain('interfaces');
    });

    it('should list available queries for Python', () => {
      const queries = adapter.getAvailableQueries('test.py');

      expect(queries).toContain('functions');
      expect(queries).toContain('classes');
      expect(queries).toContain('imports');
      expect(queries).toContain('decorators');
    });

    it('should list available queries for Java', () => {
      const queries = adapter.getAvailableQueries('Test.java');

      expect(queries).toContain('classes');
      expect(queries).toContain('methods');
      expect(queries).toContain('interfaces');
      expect(queries).toContain('imports');
    });
  });

  describe('Error Handling', () => {
    it('should handle syntax errors gracefully', async () => {
      const code = `
        function broken( {
          return "oops"
        }
      `;

      const parseResult = await adapter.parseFile('broken.ts', code);

      expect(parseResult.hasErrors).toBe(true);

      // Should still attempt to extract what it can
      const functions = await adapter.extractFunctions(parseResult, 'broken.ts');
      // May or may not find functions depending on error location
      expect(Array.isArray(functions)).toBe(true);
    });

    it('should throw error for unsupported file type', async () => {
      const code = `some random text`;

      await expect(
        adapter.parseFile('test.unknown', code)
      ).rejects.toThrow('Cannot detect language');
    });
  });

  describe('Language Support', () => {
    it('should support TypeScript files', () => {
      expect(adapter.canParse('test.ts')).toBe(true);
      expect(adapter.canParse('test.tsx')).toBe(true);
    });

    it('should support JavaScript files', () => {
      expect(adapter.canParse('test.js')).toBe(true);
      expect(adapter.canParse('test.jsx')).toBe(true);
    });

    it('should support Python files', () => {
      expect(adapter.canParse('test.py')).toBe(true);
    });

    it('should support Java files', () => {
      expect(adapter.canParse('Test.java')).toBe(true);
    });

    it('should support Go files', () => {
      expect(adapter.canParse('main.go')).toBe(true);
    });

    it('should support Rust files', () => {
      expect(adapter.canParse('main.rs')).toBe(true);
    });

    it('should support C++ files', () => {
      expect(adapter.canParse('main.cpp')).toBe(true);
      expect(adapter.canParse('header.hpp')).toBe(true);
    });

    it('should support C# files', () => {
      expect(adapter.canParse('Program.cs')).toBe(true);
    });

    it('should support PHP files', () => {
      expect(adapter.canParse('index.php')).toBe(true);
    });

    it('should support Ruby files', () => {
      expect(adapter.canParse('script.rb')).toBe(true);
    });
  });
});
