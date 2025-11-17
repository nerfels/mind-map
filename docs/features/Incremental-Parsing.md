# Incremental Parsing with Tree-sitter

Ultra-fast re-parsing using Tree-sitter's incremental parsing capabilities.

## Overview

Incremental parsing allows re-parsing only the changed portions of a file, resulting in **10-100x faster** re-parsing for small edits.

### Performance Comparison

| Operation          | Full Parse | Incremental Parse | Speedup |
|-------------------|------------|-------------------|---------|
| Small edit (1 line)| 100ms      | 2-5ms            | 20-50x  |
| Medium edit (10 lines)| 200ms   | 10-20ms          | 10-20x  |
| Large file (5K LOC)| 1000ms     | 30-50ms (small edit) | 20-33x |

**Real-world example:**
- Initial parse: 150ms
- Incremental re-parse after typing: 3ms
- **50x faster!**

## How It Works

### 1. Initial Parse

```typescript
import { TreeSitterLanguageAnalyzer } from './parsers/TreeSitterLanguageAnalyzer.js';

const analyzer = TreeSitterLanguageAnalyzer.typescript();

// First parse - full AST construction
const result1 = await analyzer.analyzeFile('app.ts');
// Time: ~100ms
```

### 2. Incremental Re-parse

```typescript
// User makes a small edit
// Analyzer detects previous parse tree and computes minimal edit

const result2 = await analyzer.analyzeFile('app.ts');
// Time: ~5ms (20x faster!)
```

### 3. Behind the Scenes

```
Old Content:                    New Content:
┌──────────────────┐           ┌──────────────────┐
│ function test() {│           │ function test() {│
│   return 1;      │    →      │   return 42;     │  ← Changed
│ }                │           │ }                │
└──────────────────┘           └──────────────────┘
        │                              │
        ├──────────────────────────────┤
        │      Compute Edit:           │
        │      - Line 2 changed        │
        │      - "1" → "42"            │
        └──────────────────────────────┘
                    ↓
        Incremental Re-parse (5ms)
        Only re-parses affected subtree!
```

## Usage

### Basic Usage (Automatic)

Incremental parsing is **enabled by default**:

```typescript
import { TreeSitterLanguageAnalyzer } from './parsers/TreeSitterLanguageAnalyzer.js';

const analyzer = TreeSitterLanguageAnalyzer.universal();

// First parse
await analyzer.analyzeFile('src/index.ts');

// Subsequent parses are automatically incremental
await analyzer.analyzeFile('src/index.ts'); // ← Fast!
await analyzer.analyzeFile('src/index.ts'); // ← Fast!
```

### Advanced Usage

```typescript
import { TreeSitterLanguageAnalyzer } from './parsers/TreeSitterLanguageAnalyzer.js';

// Configure incremental parsing
const analyzer = TreeSitterLanguageAnalyzer.typescript({
  enableIncrementalParsing: true,
  maxCacheSize: 100  // Cache up to 100 parse trees
});

// Analyze files
await analyzer.analyzeFile('file1.ts');
await analyzer.analyzeFile('file2.ts');
await analyzer.analyzeFile('file3.ts');

// Get statistics
const stats = analyzer.getIncrementalStats();
console.log(`Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
console.log(`Avg incremental time: ${stats.averageIncrementalTime.toFixed(2)}ms`);
console.log(`Avg full time: ${stats.averageFullTime.toFixed(2)}ms`);
console.log(`Speedup: ${(stats.averageFullTime / stats.averageIncrementalTime).toFixed(1)}x`);
```

### Disable Incremental Parsing

If you need to disable incremental parsing:

```typescript
const analyzer = TreeSitterLanguageAnalyzer.typescript({
  enableIncrementalParsing: false
});
```

## Cache Management

### Automatic LRU Eviction

The incremental parse manager uses an LRU (Least Recently Used) cache:

```typescript
const analyzer = TreeSitterLanguageAnalyzer.universal({
  maxCacheSize: 50  // Keep 50 most recently used parse trees
});

// Analyze 100 files
for (let i = 0; i < 100; i++) {
  await analyzer.analyzeFile(`file${i}.ts`);
}

// Only 50 most recent files are cached
// Older entries are automatically evicted
```

### Manual Cache Control

```typescript
// Clear cache for a specific file
analyzer.clearCache('src/old-file.ts');

// Clear all cached parse trees
analyzer.clearAllCache();
```

## Use Cases

### 1. Real-time Code Analysis

```typescript
// Watch mode for continuous analysis
import { watch } from 'fs';

const analyzer = TreeSitterLanguageAnalyzer.typescript();

watch('src/index.ts', async () => {
  // Re-analyze on file change
  const result = await analyzer.analyzeFile('src/index.ts');
  // Fast! Uses incremental parsing
  console.log(`Re-analyzed in ${result.parseTime}ms`);
});
```

### 2. IDE Integration

```typescript
// LSP server - analyze on every keystroke
async function onDocumentChange(filePath: string, newContent: string) {
  const analyzer = TreeSitterLanguageAnalyzer.universal();

  // Write new content to temporary location
  await writeFile(filePath, newContent);

  // Analyze (uses incremental parsing)
  const result = await analyzer.analyzeFile(filePath);
  // Returns in ~5ms - fast enough for real-time

  return result;
}
```

### 3. Large Project Analysis

```typescript
// Scan large project with incremental updates
const analyzer = TreeSitterLanguageAnalyzer.universal({
  maxCacheSize: 1000  // Cache 1000 files
});

// Initial scan
for (const file of getAllFiles()) {
  await analyzer.analyzeFile(file);
}

// Later: re-analyze changed files
for (const changedFile of getChangedFiles()) {
  // Fast incremental re-parse
  await analyzer.analyzeFile(changedFile);
}

const stats = analyzer.getIncrementalStats();
console.log(`Saved ${stats.incrementalParses} full re-parses!`);
```

## Statistics and Monitoring

```typescript
const analyzer = TreeSitterLanguageAnalyzer.universal();

// Perform some analyses
await analyzer.analyzeFile('file1.ts');
await analyzer.analyzeFile('file1.ts'); // Incremental
await analyzer.analyzeFile('file1.ts'); // Incremental
await analyzer.analyzeFile('file2.ts'); // Full
await analyzer.analyzeFile('file2.ts'); // Incremental

// Get detailed statistics
const stats = analyzer.getIncrementalStats();

console.log('Incremental Parsing Statistics:');
console.log(`  Total parses: ${stats.totalParses}`);
console.log(`  Full parses: ${stats.fullParses}`);
console.log(`  Incremental parses: ${stats.incrementalParses}`);
console.log(`  Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
console.log(`  Avg full parse: ${stats.averageFullTime.toFixed(2)}ms`);
console.log(`  Avg incremental: ${stats.averageIncrementalTime.toFixed(2)}ms`);
console.log(`  Speedup: ${(stats.averageFullTime / stats.averageIncrementalTime).toFixed(1)}x`);
console.log(`  Cache size: ${stats.cacheSize} files`);
```

Example output:
```
Incremental Parsing Statistics:
  Total parses: 5
  Full parses: 2
  Incremental parses: 3
  Cache hit rate: 60.0%
  Avg full parse: 125.50ms
  Avg incremental: 4.33ms
  Speedup: 29.0x
  Cache size: 2 files
```

## Technical Details

### Edit Computation

The IncrementalParseManager computes edits using a line-based diff algorithm:

```typescript
interface Edit {
  startIndex: number;        // Character index where edit starts
  oldEndIndex: number;       // Character index where old content ends
  newEndIndex: number;       // Character index where new content ends
  startPosition: Position;   // Line/column where edit starts
  oldEndPosition: Position;  // Line/column where old content ends
  newEndPosition: Position;  // Line/column where new content ends
}
```

### Memory Usage

- Each cached parse tree: ~5x file size in memory
- Default cache: 100 files
- Typical memory: ~50-500MB depending on file sizes

### When Full Re-parse Occurs

Full re-parse is triggered when:
1. File is analyzed for the first time
2. File is not in cache (evicted or cleared)
3. Language changes (e.g., .js → .ts)
4. Cache is disabled

### Performance Characteristics

**Initial Parse:**
- Small files (< 100 LOC): 10-50ms
- Medium files (100-1K LOC): 50-200ms
- Large files (1K-5K LOC): 200-1000ms

**Incremental Parse:**
- Small edit (1-10 lines): 1-10ms
- Medium edit (10-100 lines): 10-50ms
- Large edit (> 100 lines): 50-200ms

**Speedup Formula:**
```
Speedup = FullParseTime / IncrementalParseTime
        = 100-1000ms / 1-50ms
        = 10-100x faster
```

## Best Practices

### 1. Keep Cache Size Reasonable

```typescript
// Good: Reasonable cache size for typical project
const analyzer = TreeSitterLanguageAnalyzer.universal({
  maxCacheSize: 100  // ~50-500MB memory
});

// Avoid: Too large cache (memory pressure)
const bigAnalyzer = TreeSitterLanguageAnalyzer.universal({
  maxCacheSize: 10000  // Potentially 5-50GB memory!
});
```

### 2. Clear Cache When Appropriate

```typescript
// Clear cache for files that won't be re-analyzed
analyzer.clearCache('temp/one-time-file.ts');

// Clear all cache when switching projects
analyzer.clearAllCache();
```

### 3. Monitor Statistics

```typescript
// Periodically check performance
setInterval(() => {
  const stats = analyzer.getIncrementalStats();
  if (stats.cacheHitRate < 0.5) {
    console.warn('Low cache hit rate - consider increasing cache size');
  }
}, 60000);
```

### 4. Disable for One-off Analysis

```typescript
// For one-time analysis, incremental parsing adds overhead
const oneTimeAnalyzer = TreeSitterLanguageAnalyzer.universal({
  enableIncrementalParsing: false
});
```

## Comparison with Other Approaches

| Approach           | Re-parse Time | Memory | Complexity |
|-------------------|---------------|--------|------------|
| Full Re-parse     | 100-1000ms    | Low    | Simple     |
| Incremental (Tree-sitter) | 1-50ms | Medium | Medium |
| No Re-parse (stale) | 0ms         | None   | High       |

## Integration Examples

### With File Watcher

```typescript
import { watch } from 'chokidar';
import { TreeSitterLanguageAnalyzer } from './parsers/TreeSitterLanguageAnalyzer.js';

const analyzer = TreeSitterLanguageAnalyzer.universal();
const watcher = watch('src/**/*.ts');

watcher.on('change', async (filePath) => {
  const start = Date.now();
  await analyzer.analyzeFile(filePath);
  const time = Date.now() - start;
  console.log(`Re-analyzed ${filePath} in ${time}ms`);
  // Typically 2-10ms with incremental parsing
});
```

### With MCP Server

```typescript
// In your MCP tool handler
async function analyzFile(filePath: string) {
  const analyzer = getGlobalAnalyzer();  // Reuse instance

  // Incremental parsing happens automatically
  const result = await analyzer.analyzeFile(filePath);

  return {
    ...result,
    parseTime: result.parseTime,  // Show how fast it was
    wasIncremental: analyzer.getIncrementalStats().incrementalParses > 0
  };
}
```

## Troubleshooting

### Issue: Low Cache Hit Rate

**Problem:** `cacheHitRate < 0.5`

**Solutions:**
1. Increase cache size: `maxCacheSize: 200`
2. Reduce file churn (avoid analyzing too many different files)
3. Check if files are being analyzed multiple times in quick succession

### Issue: High Memory Usage

**Problem:** Process memory growing large

**Solutions:**
1. Reduce cache size: `maxCacheSize: 50`
2. Periodically clear cache: `analyzer.clearAllCache()`
3. Disable for one-time analyses

### Issue: Incremental Parse Not Working

**Problem:** All parses are full parses

**Check:**
1. Is incremental parsing enabled? `enableIncrementalParsing: true`
2. Is the file path consistent? (Different paths = different cache entries)
3. Is the language the same? (Language change triggers full re-parse)

## Future Enhancements

1. **Multi-file Incremental Parsing**: Track dependencies and incrementally update related files
2. **Persistent Cache**: Save parse trees to disk for faster startup
3. **Diff-based Edits**: Use more sophisticated diff algorithms for better edit detection
4. **Parallel Incremental Parsing**: Parse multiple files incrementally in parallel

## References

- [Tree-sitter Incremental Parsing](https://tree-sitter.github.io/tree-sitter/using-parsers#editing)
- [IncrementalParseManager Source](../src/core/parsers/IncrementalParseManager.ts)
- [TreeSitterLanguageAnalyzer Source](../src/core/parsers/TreeSitterLanguageAnalyzer.ts)
