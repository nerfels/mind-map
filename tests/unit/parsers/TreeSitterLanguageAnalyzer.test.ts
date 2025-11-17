/**
 * Tests for TreeSitterLanguageAnalyzer
 *
 * Demonstrates universal language analysis replacing language-specific analyzers
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { TreeSitterLanguageAnalyzer } from '../../../src/core/parsers/TreeSitterLanguageAnalyzer.js';
import { SupportedLanguage } from '../../../src/core/parsers/TreeSitterParser.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('TreeSitterLanguageAnalyzer', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), 'tree-sitter-analyzer-test-' + Date.now());
    await mkdir(testDir, { recursive: true });
  });

  describe('Universal Analyzer', () => {
    it('should analyze TypeScript files', async () => {
      const analyzer = TreeSitterLanguageAnalyzer.universal();
      const filePath = join(testDir, 'test.ts');

      await writeFile(
        filePath,
        `
          function greet(name: string): string {
            return \`Hello, \${name}!\`;
          }

          class Person {
            constructor(public name: string) {}
          }
        `
      );

      const result = await analyzer.analyzeFile(filePath);

      expect(result).toBeDefined();
      expect(result?.functions.length).toBeGreaterThan(0);
      expect(result?.classes.length).toBeGreaterThan(0);
    });

    it('should analyze Python files', async () => {
      const analyzer = TreeSitterLanguageAnalyzer.universal();
      const filePath = join(testDir, 'test.py');

      await writeFile(
        filePath,
        `
def calculate_sum(numbers):
    total = 0
    for num in numbers:
        total += num
    return total

class Calculator:
    def add(self, a, b):
        return a + b
        `
      );

      const result = await analyzer.analyzeFile(filePath);

      expect(result).toBeDefined();
      expect(result?.functions.length).toBeGreaterThan(0);
      expect(result?.classes.length).toBeGreaterThan(0);
    });

    it('should analyze Go files', async () => {
      const analyzer = TreeSitterLanguageAnalyzer.universal();
      const filePath = join(testDir, 'test.go');

      await writeFile(
        filePath,
        `
package main

func add(a int, b int) int {
    return a + b
}

type Person struct {
    Name string
    Age  int
}
        `
      );

      const result = await analyzer.analyzeFile(filePath);

      expect(result).toBeDefined();
      expect(result?.functions.length).toBeGreaterThan(0);
    });

    it('should analyze Rust files', async () => {
      const analyzer = TreeSitterLanguageAnalyzer.universal();
      const filePath = join(testDir, 'test.rs');

      await writeFile(
        filePath,
        `
fn add(a: i32, b: i32) -> i32 {
    a + b
}

struct Person {
    name: String,
    age: u32,
}

impl Person {
    fn new(name: String, age: u32) -> Person {
        Person { name, age }
    }
}
        `
      );

      const result = await analyzer.analyzeFile(filePath);

      expect(result).toBeDefined();
      expect(result?.functions.length).toBeGreaterThan(0);
    });

    it('should analyze Java files', async () => {
      const analyzer = TreeSitterLanguageAnalyzer.universal();
      const filePath = join(testDir, 'Test.java');

      await writeFile(
        filePath,
        `
public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        Calculator calc = new Calculator();
        System.out.println(calc.add(5, 3));
    }
}
        `
      );

      const result = await analyzer.analyzeFile(filePath);

      expect(result).toBeDefined();
      expect(result?.classes.length).toBeGreaterThan(0);
    });
  });

  describe('Language-Specific Analyzers', () => {
    it('should create TypeScript analyzer', async () => {
      const analyzer = TreeSitterLanguageAnalyzer.typescript();
      const filePath = join(testDir, 'ts-specific.ts');

      await writeFile(
        filePath,
        `
          interface User {
            name: string;
            email: string;
          }

          function createUser(name: string, email: string): User {
            return { name, email };
          }
        `
      );

      const result = await analyzer.analyzeFile(filePath);

      expect(result).toBeDefined();
      expect(result?.functions.length).toBeGreaterThan(0);
    });

    it('should create Python analyzer', async () => {
      const analyzer = TreeSitterLanguageAnalyzer.python();

      expect(analyzer.canAnalyze('test.py')).toBe(true);
      expect(analyzer.canAnalyze('test.pyw')).toBe(true);
      expect(analyzer.canAnalyze('test.java')).toBe(false);
    });

    it('should create Go analyzer', async () => {
      const analyzer = TreeSitterLanguageAnalyzer.go();

      expect(analyzer.canAnalyze('main.go')).toBe(true);
      expect(analyzer.canAnalyze('test.py')).toBe(false);
    });

    it('should create Rust analyzer', async () => {
      const analyzer = TreeSitterLanguageAnalyzer.rust();

      expect(analyzer.canAnalyze('main.rs')).toBe(true);
      expect(analyzer.canAnalyze('lib.rs')).toBe(true);
      expect(analyzer.canAnalyze('test.py')).toBe(false);
    });

    it('should create Java analyzer', async () => {
      const analyzer = TreeSitterLanguageAnalyzer.java();

      expect(analyzer.canAnalyze('Main.java')).toBe(true);
      expect(analyzer.canAnalyze('test.py')).toBe(false);
    });

    it('should create PHP analyzer', async () => {
      const analyzer = TreeSitterLanguageAnalyzer.php();

      expect(analyzer.canAnalyze('index.php')).toBe(true);
      expect(analyzer.canAnalyze('test.py')).toBe(false);
    });

    it('should create Ruby analyzer', async () => {
      const analyzer = TreeSitterLanguageAnalyzer.ruby();

      expect(analyzer.canAnalyze('script.rb')).toBe(true);
      expect(analyzer.canAnalyze('test.py')).toBe(false);
    });
  });

  describe('File Extension Detection', () => {
    it('should detect all TypeScript extensions', () => {
      const analyzer = TreeSitterLanguageAnalyzer.typescript();

      expect(analyzer.canAnalyze('file.ts')).toBe(true);
      expect(analyzer.canAnalyze('Component.tsx')).toBe(true);
    });

    it('should detect all JavaScript extensions', () => {
      const analyzer = TreeSitterLanguageAnalyzer.javascript();

      expect(analyzer.canAnalyze('file.js')).toBe(true);
      expect(analyzer.canAnalyze('Component.jsx')).toBe(true);
      expect(analyzer.canAnalyze('module.mjs')).toBe(true);
      expect(analyzer.canAnalyze('config.cjs')).toBe(true);
    });

    it('should detect all C++ extensions', () => {
      const analyzer = TreeSitterLanguageAnalyzer.cpp();

      expect(analyzer.canAnalyze('main.cpp')).toBe(true);
      expect(analyzer.canAnalyze('file.cc')).toBe(true);
      expect(analyzer.canAnalyze('impl.cxx')).toBe(true);
      expect(analyzer.canAnalyze('header.hpp')).toBe(true);
      expect(analyzer.canAnalyze('header.h')).toBe(true);
    });
  });

  describe('Static Factory Methods', () => {
    it('should provide convenient factory methods', () => {
      expect(TreeSitterLanguageAnalyzer.typescript()).toBeInstanceOf(TreeSitterLanguageAnalyzer);
      expect(TreeSitterLanguageAnalyzer.javascript()).toBeInstanceOf(TreeSitterLanguageAnalyzer);
      expect(TreeSitterLanguageAnalyzer.python()).toBeInstanceOf(TreeSitterLanguageAnalyzer);
      expect(TreeSitterLanguageAnalyzer.java()).toBeInstanceOf(TreeSitterLanguageAnalyzer);
      expect(TreeSitterLanguageAnalyzer.go()).toBeInstanceOf(TreeSitterLanguageAnalyzer);
      expect(TreeSitterLanguageAnalyzer.rust()).toBeInstanceOf(TreeSitterLanguageAnalyzer);
      expect(TreeSitterLanguageAnalyzer.cpp()).toBeInstanceOf(TreeSitterLanguageAnalyzer);
      expect(TreeSitterLanguageAnalyzer.csharp()).toBeInstanceOf(TreeSitterLanguageAnalyzer);
      expect(TreeSitterLanguageAnalyzer.php()).toBeInstanceOf(TreeSitterLanguageAnalyzer);
      expect(TreeSitterLanguageAnalyzer.ruby()).toBeInstanceOf(TreeSitterLanguageAnalyzer);
      expect(TreeSitterLanguageAnalyzer.universal()).toBeInstanceOf(TreeSitterLanguageAnalyzer);
    });
  });

  describe('CodeStructure Output', () => {
    it('should provide comprehensive CodeStructure', async () => {
      const analyzer = TreeSitterLanguageAnalyzer.universal();
      const filePath = join(testDir, 'comprehensive.ts');

      await writeFile(
        filePath,
        `
          import { readFile } from 'fs';
          import path from 'path';

          export function processFile(fileName: string): Promise<string> {
            return readFile(fileName, 'utf-8');
          }

          export class FileProcessor {
            async process(file: string) {
              return await processFile(file);
            }
          }
        `
      );

      const result = await analyzer.analyzeFile(filePath);

      expect(result).toBeDefined();
      expect(result?.filePath).toBe(filePath);
      expect(result?.language).toBe('typescript');
      expect(result?.functions).toBeDefined();
      expect(result?.classes).toBeDefined();
      expect(result?.imports).toBeDefined();
      expect(result?.complexity).toBeGreaterThan(0);
      expect(result?.linesOfCode).toBeGreaterThan(0);
      expect(result?.parseTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle files with syntax errors gracefully', async () => {
      const analyzer = TreeSitterLanguageAnalyzer.universal();
      const filePath = join(testDir, 'broken.ts');

      await writeFile(
        filePath,
        `
          function broken( {
            return "oops"
          }
        `
      );

      const result = await analyzer.analyzeFile(filePath);

      // Should still return a result, even with errors
      expect(result).toBeDefined();
      // May or may not have functions depending on parse recovery
      expect(Array.isArray(result?.functions)).toBe(true);
    });

    it('should return null for unsupported file types', async () => {
      const analyzer = TreeSitterLanguageAnalyzer.typescript();
      const filePath = join(testDir, 'test.txt');

      await writeFile(filePath, 'This is just text');

      const result = await analyzer.analyzeFile(filePath);

      expect(result).toBeNull();
    });
  });

  describe('Performance Comparison', () => {
    it('should parse files quickly', async () => {
      const analyzer = TreeSitterLanguageAnalyzer.universal();
      const filePath = join(testDir, 'performance.ts');

      // Generate a moderately sized file
      const functions = Array.from({ length: 20 }, (_, i) => `
        export function func${i}(param: number): number {
          return param * ${i};
        }
      `).join('\n');

      await writeFile(filePath, functions);

      const startTime = Date.now();
      const result = await analyzer.analyzeFile(filePath);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(result?.functions.length).toBe(20);
      expect(endTime - startTime).toBeLessThan(1000); // < 1 second
    });
  });
});
