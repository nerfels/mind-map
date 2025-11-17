/**
 * Tests for Tree-sitter Parser
 *
 * Demonstrates Tree-sitter parsing capabilities across multiple languages
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  TreeSitterParser,
  SupportedLanguage,
  getTreeSitterParser,
  resetTreeSitterParser
} from '../../../src/core/parsers/TreeSitterParser.js';

describe('TreeSitterParser', () => {
  let parser: TreeSitterParser;

  beforeAll(async () => {
    resetTreeSitterParser();
    parser = getTreeSitterParser();
    await parser.initialize();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(parser.isInitialized()).toBe(true);
    });

    it('should support 10 languages', () => {
      const languages = parser.getSupportedLanguages();
      expect(languages).toHaveLength(10);
      expect(languages).toContain(SupportedLanguage.TYPESCRIPT);
      expect(languages).toContain(SupportedLanguage.JAVASCRIPT);
      expect(languages).toContain(SupportedLanguage.PYTHON);
      expect(languages).toContain(SupportedLanguage.JAVA);
      expect(languages).toContain(SupportedLanguage.GO);
      expect(languages).toContain(SupportedLanguage.RUST);
      expect(languages).toContain(SupportedLanguage.CPP);
      expect(languages).toContain(SupportedLanguage.CSHARP);
      expect(languages).toContain(SupportedLanguage.PHP);
      expect(languages).toContain(SupportedLanguage.RUBY);
    });

    it('should map file extensions correctly', () => {
      expect(parser.detectLanguage('test.ts')).toBe(SupportedLanguage.TYPESCRIPT);
      expect(parser.detectLanguage('test.js')).toBe(SupportedLanguage.JAVASCRIPT);
      expect(parser.detectLanguage('test.py')).toBe(SupportedLanguage.PYTHON);
      expect(parser.detectLanguage('test.java')).toBe(SupportedLanguage.JAVA);
      expect(parser.detectLanguage('test.go')).toBe(SupportedLanguage.GO);
      expect(parser.detectLanguage('test.rs')).toBe(SupportedLanguage.RUST);
      expect(parser.detectLanguage('test.cpp')).toBe(SupportedLanguage.CPP);
      expect(parser.detectLanguage('test.cs')).toBe(SupportedLanguage.CSHARP);
      expect(parser.detectLanguage('test.php')).toBe(SupportedLanguage.PHP);
      expect(parser.detectLanguage('test.rb')).toBe(SupportedLanguage.RUBY);
    });
  });

  describe('TypeScript Parsing', () => {
    it('should parse simple TypeScript function', async () => {
      const code = `
        function greet(name: string): string {
          return \`Hello, \${name}!\`;
        }
      `;

      const result = await parser.parse(code, SupportedLanguage.TYPESCRIPT);

      expect(result.hasErrors).toBe(false);
      expect(result.language).toBe(SupportedLanguage.TYPESCRIPT);
      expect(result.parseTime).toBeGreaterThan(0);
      expect(result.rootNode.type).toBe('program');
    });

    it('should parse TypeScript class', async () => {
      const code = `
        class Calculator {
          add(a: number, b: number): number {
            return a + b;
          }
        }
      `;

      const result = await parser.parse(code, SupportedLanguage.TYPESCRIPT);

      expect(result.hasErrors).toBe(false);
      expect(result.rootNode.children.length).toBeGreaterThan(0);
    });

    it('should handle syntax errors gracefully', async () => {
      const code = `
        function broken( {
          return "oops"
        }
      `;

      const result = await parser.parse(code, SupportedLanguage.TYPESCRIPT);

      expect(result.hasErrors).toBe(true);
      expect(result.errorNodes.length).toBeGreaterThan(0);
    });
  });

  describe('JavaScript Parsing', () => {
    it('should parse arrow functions', async () => {
      const code = `
        const add = (a, b) => a + b;
        const multiply = (x, y) => {
          return x * y;
        };
      `;

      const result = await parser.parse(code, SupportedLanguage.JAVASCRIPT);

      expect(result.hasErrors).toBe(false);
      expect(result.language).toBe(SupportedLanguage.JAVASCRIPT);
    });
  });

  describe('Python Parsing', () => {
    it('should parse Python function', async () => {
      const code = `
def calculate_sum(numbers):
    total = 0
    for num in numbers:
        total += num
    return total
      `;

      const result = await parser.parse(code, SupportedLanguage.PYTHON);

      expect(result.hasErrors).toBe(false);
      expect(result.language).toBe(SupportedLanguage.PYTHON);
    });

    it('should parse Python class', async () => {
      const code = `
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def greet(self):
        return f"Hello, I'm {self.name}"
      `;

      const result = await parser.parse(code, SupportedLanguage.PYTHON);

      expect(result.hasErrors).toBe(false);
    });
  });

  describe('Java Parsing', () => {
    it('should parse Java class', async () => {
      const code = `
public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        Calculator calc = new Calculator();
        System.out.println(calc.add(5, 3));
    }
}
      `;

      const result = await parser.parse(code, SupportedLanguage.JAVA);

      expect(result.hasErrors).toBe(false);
      expect(result.language).toBe(SupportedLanguage.JAVA);
    });
  });

  describe('Go Parsing', () => {
    it('should parse Go function', async () => {
      const code = `
package main

func add(a int, b int) int {
    return a + b
}

func main() {
    result := add(5, 3)
    println(result)
}
      `;

      const result = await parser.parse(code, SupportedLanguage.GO);

      expect(result.hasErrors).toBe(false);
      expect(result.language).toBe(SupportedLanguage.GO);
    });
  });

  describe('Rust Parsing', () => {
    it('should parse Rust function', async () => {
      const code = `
fn add(a: i32, b: i32) -> i32 {
    a + b
}

fn main() {
    let result = add(5, 3);
    println!("{}", result);
}
      `;

      const result = await parser.parse(code, SupportedLanguage.RUST);

      expect(result.hasErrors).toBe(false);
      expect(result.language).toBe(SupportedLanguage.RUST);
    });
  });

  describe('File Parsing', () => {
    it('should auto-detect language from file path', async () => {
      const code = `function test() { return 42; }`;
      const result = await parser.parseFile('example.ts', code);

      expect(result.language).toBe(SupportedLanguage.TYPESCRIPT);
      expect(result.hasErrors).toBe(false);
    });

    it('should throw error for unsupported file type', async () => {
      const code = `some code`;

      await expect(
        parser.parseFile('example.unknown', code)
      ).rejects.toThrow('Cannot detect language');
    });
  });

  describe('Language Detection', () => {
    it('should detect TypeScript files', () => {
      expect(parser.canParse('test.ts')).toBe(true);
      expect(parser.canParse('test.tsx')).toBe(true);
    });

    it('should detect JavaScript files', () => {
      expect(parser.canParse('test.js')).toBe(true);
      expect(parser.canParse('test.jsx')).toBe(true);
      expect(parser.canParse('test.mjs')).toBe(true);
      expect(parser.canParse('test.cjs')).toBe(true);
    });

    it('should reject unsupported file types', () => {
      expect(parser.canParse('test.txt')).toBe(false);
      expect(parser.canParse('test.md')).toBe(false);
      expect(parser.canParse('test.json')).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should parse small files quickly', async () => {
      const code = `
        function quick() {
          return "fast";
        }
      `;

      const result = await parser.parse(code, SupportedLanguage.TYPESCRIPT);

      expect(result.parseTime).toBeLessThan(100); // < 100ms
    });

    it('should handle larger files efficiently', async () => {
      // Generate a larger code sample
      const functions = Array.from({ length: 50 }, (_, i) => `
        function func${i}(param: number): number {
          return param * ${i};
        }
      `).join('\n');

      const result = await parser.parse(functions, SupportedLanguage.TYPESCRIPT);

      expect(result.hasErrors).toBe(false);
      expect(result.parseTime).toBeLessThan(500); // < 500ms for 50 functions
    });
  });

  describe('Node Structure', () => {
    it('should provide detailed node information', async () => {
      const code = `function test() { return 42; }`;
      const result = await parser.parse(code, SupportedLanguage.TYPESCRIPT);

      const rootNode = result.rootNode;
      expect(rootNode.type).toBe('program');
      expect(rootNode.children.length).toBeGreaterThan(0);
      expect(rootNode.startPosition).toBeDefined();
      expect(rootNode.endPosition).toBeDefined();
      expect(rootNode.isNamed).toBe(true);
    });

    it('should provide accurate position information', async () => {
      const code = `function test() {\n  return 42;\n}`;
      const result = await parser.parse(code, SupportedLanguage.TYPESCRIPT);

      expect(result.rootNode.startPosition.row).toBe(0);
      expect(result.rootNode.startPosition.column).toBe(0);
    });
  });
});
