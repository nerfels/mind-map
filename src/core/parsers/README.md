# Tree-sitter Parser Integration

Universal AST parsing for 10+ programming languages using Tree-sitter.

## Architecture

```
parsers/
├── TreeSitterParser.ts     # Universal parser wrapper (core)
├── TreeSitterQueries.ts    # Predefined S-expression query patterns
├── TreeSitterAdapter.ts    # Bridge to BaseLanguageAnalyzer
└── README.md               # This file
```

## Key Features

- **Universal Parsing**: Single parser for 10 languages (TypeScript, JavaScript, Python, Java, Go, Rust, C++, C#, PHP, Ruby)
- **Incremental Parsing**: Millisecond-level updates for real-time analysis
- **Robust AST**: Tree-sitter provides error-resilient parsing
- **Query System**: S-expression patterns for extracting code structures
- **Backward Compatible**: Integrates with existing BaseLanguageAnalyzer pattern

## Supported Languages

| Language   | Extensions                      | Features                                |
|------------|--------------------------------|-----------------------------------------|
| TypeScript | `.ts`, `.tsx`                  | Functions, classes, interfaces, types   |
| JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs`  | Functions, classes, arrow functions     |
| Python     | `.py`, `.pyw`                  | Functions, classes, decorators          |
| Java       | `.java`                        | Classes, methods, interfaces            |
| Go         | `.go`                          | Functions, methods, structs, interfaces |
| Rust       | `.rs`                          | Functions, structs, traits, impls       |
| C++        | `.cpp`, `.cc`, `.hpp`, `.h`    | Functions, classes, namespaces          |
| C#         | `.cs`                          | Classes, methods, interfaces            |
| PHP        | `.php`                         | Functions, classes, methods, traits     |
| Ruby       | `.rb`                          | Methods, classes, modules               |

## Usage

### Basic Parsing

```typescript
import { getTreeSitterParser } from './TreeSitterParser';

const parser = getTreeSitterParser();
await parser.initialize();

// Parse a file
const result = await parser.parseFile('example.ts', sourceCode);

console.log(`Parsed in ${result.parseTime}ms`);
console.log(`Has errors: ${result.hasErrors}`);
console.log(`Root node type: ${result.rootNode.type}`);
```

### Extracting Code Elements

```typescript
import { getTreeSitterAdapter } from './TreeSitterAdapter';

const adapter = getTreeSitterAdapter();
await adapter.initialize();

// Parse file
const result = await adapter.parseFile('example.ts', sourceCode);

// Extract functions
const functions = await adapter.extractFunctions(result, 'example.ts');
console.log(`Found ${functions.length} functions`);

// Extract classes
const classes = await adapter.extractClasses(result, 'example.ts');
console.log(`Found ${classes.length} classes`);

// Extract all elements
const elements = await adapter.extractAllElements(result, 'example.ts');
```

### Using Query Patterns

```typescript
import { TreeSitterQueries } from './TreeSitterQueries';

// Get available queries for a language
const queries = TreeSitterQueries.getAvailableQueries(SupportedLanguage.TYPESCRIPT);
// ['functions', 'classes', 'imports', 'exports', 'interfaces', 'type-aliases']

// Get specific query
const query = TreeSitterQueries.getQuery(SupportedLanguage.TYPESCRIPT, 'FUNCTIONS');

// Execute query
const matches = parser.query(parseResult, query.pattern);
```

### Incremental Parsing

```typescript
// Initial parse
const initialTree = (await parser.parse(sourceCode, SupportedLanguage.TYPESCRIPT)).tree;

// User makes an edit
const edit = {
  startIndex: 100,
  oldEndIndex: 110,
  newEndIndex: 115,
  startPosition: { row: 5, column: 10 },
  oldEndPosition: { row: 5, column: 20 },
  newEndPosition: { row: 5, column: 25 }
};

// Incremental reparse (fast!)
const result = await parser.incrementalParse(
  newSourceCode,
  SupportedLanguage.TYPESCRIPT,
  initialTree,
  [edit]
);

console.log(`Incremental parse took ${result.parseTime}ms`); // Often < 10ms
```

### Converting to CodeStructure

```typescript
// For backward compatibility with BaseLanguageAnalyzer
const codeStructure = await adapter.toCodeStructure(parseResult, 'example.ts');

// Now compatible with existing analyzers
console.log(`Functions: ${codeStructure.functions.length}`);
console.log(`Classes: ${codeStructure.classes.length}`);
console.log(`Imports: ${codeStructure.imports.length}`);
console.log(`Complexity: ${codeStructure.complexity}`);
console.log(`Lines of code: ${codeStructure.linesOfCode}`);
```

## Migration Guide

### Migrating Regex-Based Analyzers

**Before (Regex-based):**
```typescript
class PythonAnalyzer extends RegexBasedAnalyzer<PythonStructure> {
  protected async parseCode(content: string, filePath: string): Promise<PythonStructure> {
    const functionMatches = this.extractMatchesWithLines(
      content,
      /def\s+(\w+)\s*\((.*?)\):/g
    );
    // ... more regex patterns
  }
}
```

**After (Tree-sitter):**
```typescript
class PythonAnalyzer extends BaseLanguageAnalyzer<PythonStructure> {
  private adapter: TreeSitterAdapter;

  constructor() {
    super(['.py', '.pyw']);
    this.adapter = getTreeSitterAdapter();
  }

  protected async parseCode(content: string, filePath: string): Promise<PythonStructure> {
    const parseResult = await this.adapter.parseFile(filePath, content);
    const functions = await this.adapter.extractFunctions(parseResult, filePath);
    const classes = await this.adapter.extractClasses(parseResult, filePath);
    // ... use extracted data
  }
}
```

### Benefits of Migration

1. **Accuracy**: Tree-sitter provides proper AST parsing, not regex heuristics
2. **Error Resilience**: Handles syntax errors gracefully
3. **Performance**: Incremental parsing for real-time updates (10-100x faster)
4. **Completeness**: Captures all language constructs, not just common patterns
5. **Maintainability**: No complex regex patterns to maintain

## Query Pattern Examples

### TypeScript Function Detection

```typescript
// S-expression query
const query = `
  (function_declaration
    name: (identifier) @function-name
    parameters: (formal_parameters) @parameters
    body: (statement_block) @body) @function
`;

// Matches:
// function myFunc(a, b) { ... }
```

### Python Class Detection

```typescript
const query = `
  (class_definition
    name: (identifier) @class-name
    body: (block) @body) @class
`;

// Matches:
// class MyClass:
//     ...
```

### Custom Queries

You can write custom S-expression queries for specific patterns:

```typescript
// Find all async functions in TypeScript
const asyncFunctionQuery = `
  (function_declaration
    (async) @async-keyword
    name: (identifier) @function-name) @function
`;

// Find all TODO comments
const todoQuery = `
  (comment) @comment
  (#match? @comment "TODO")
`;
```

## Performance Characteristics

### Initial Parse

- **Small files (< 1000 lines)**: 10-50ms
- **Medium files (1000-5000 lines)**: 50-200ms
- **Large files (> 5000 lines)**: 200-1000ms

### Incremental Parse

- **Small edits**: 1-10ms (100x faster than full reparse)
- **Large edits**: 10-50ms (10x faster than full reparse)

### Memory Usage

- **Parser overhead**: ~10MB per language
- **Parse tree**: ~5x source file size in memory
- **Total for 10 languages**: ~100MB + parse trees

## Error Handling

Tree-sitter is error-resilient and will produce a best-effort parse tree even with syntax errors:

```typescript
const result = await parser.parseFile('invalid.ts', invalidCode);

if (result.hasErrors) {
  console.log(`Found ${result.errorNodes.length} syntax errors:`);
  for (const error of result.errorNodes) {
    console.log(`  Line ${error.startPosition.row + 1}: ${error.text}`);
  }
}

// But you can still analyze the valid portions!
const functions = await adapter.extractFunctions(result, 'invalid.ts');
```

## Testing

Tree-sitter parsers should be tested with:

1. **Valid code samples**: Ensure correct parsing
2. **Invalid code samples**: Verify error resilience
3. **Edge cases**: Empty files, comments, complex nesting
4. **Incremental updates**: Verify incremental parsing correctness
5. **Performance**: Benchmark parse times for various file sizes

Example test:

```typescript
describe('TreeSitterParser', () => {
  it('should parse TypeScript functions', async () => {
    const parser = getTreeSitterParser();
    await parser.initialize();

    const code = `
      function hello(name: string) {
        console.log(\`Hello, \${name}\`);
      }
    `;

    const result = await parser.parse(code, SupportedLanguage.TYPESCRIPT);
    expect(result.hasErrors).toBe(false);
    expect(result.parseTime).toBeLessThan(100);
  });
});
```

## Future Enhancements

1. **Language-specific analyzers**: Custom extraction logic per language
2. **Caching layer**: Cache parse trees for unchanged files
3. **Streaming parsing**: Parse large files incrementally
4. **Symbol resolution**: Cross-file symbol lookup
5. **Refactoring support**: Code transformation using AST mutations
6. **More languages**: Add Kotlin, Scala, Swift, etc.

## References

- [Tree-sitter Documentation](https://tree-sitter.github.io/tree-sitter/)
- [Tree-sitter Query Syntax](https://tree-sitter.github.io/tree-sitter/using-parsers#pattern-matching-with-queries)
- [Available Language Parsers](https://tree-sitter.github.io/tree-sitter/#available-parsers)
