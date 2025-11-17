# Tool Registry Pattern

## Overview

The Tool Registry pattern replaces the massive 58-case switch statement in `src/index.ts` with a clean, extensible registry system.

## Benefits

✅ **Open/Closed Principle** - Add new tools without modifying index.ts
✅ **Single Responsibility** - Each tool is independent and self-contained
✅ **Better Testability** - Test tools in isolation
✅ **Type Safety** - Compile-time checks for tool definitions
✅ **Discoverability** - Tools organized by category
✅ **No More 699-Line Switch Statement!**

## Architecture

```
src/tools/registry/
├── ToolRegistry.ts          # Central registry
├── BaseToolHandler.ts       # Abstract base class for all tools
├── example/
│   └── QueryMindMapTool.ts  # Example implementation
└── README.md                # This file
```

## Usage

### 1. Create a Tool Handler

```typescript
import { BaseToolHandler } from './BaseToolHandler.js';
import { MindMapEngine } from '../../core/MindMapEngine.js';

export class QueryMindMapTool extends BaseToolHandler {
  private mindMap: MindMapEngine;

  constructor(mindMap: MindMapEngine) {
    super(
      'query_mindmap',              // Tool name
      'Query the mind map...',       // Description
      {                              // Input schema
        type: 'object',
        properties: { /* ... */ },
        required: ['query']
      }
    );
    this.mindMap = mindMap;
  }

  async execute(args: any): Promise<any> {
    return this.safeExecute(async () => {
      this.validateArgs(args, ['query']);
      const results = await this.mindMap.query(args.query);
      return { results };
    });
  }
}
```

### 2. Register Tools

```typescript
import { toolRegistry, ToolCategory } from './registry/ToolRegistry.js';
import { QueryMindMapTool } from './registry/tools/QueryMindMapTool.js';

// Register individual tool
toolRegistry.register(
  new QueryMindMapTool(mindMap),
  ToolCategory.QUERY
);

// Or register many at once
toolRegistry.registerMany([
  { handler: new QueryMindMapTool(mindMap), category: ToolCategory.QUERY },
  { handler: new AnalyzeCodeTool(mindMap), category: ToolCategory.ANALYSIS },
  // ... all 58 tools
]);
```

### 3. Use in MCP Server

```typescript
// OLD: 58-case switch statement
switch (name) {
  case 'query_mindmap':
    return await this.queryHandlers.handleQueryMindMap(args);
  case 'analyze_code':
    return await this.analysisHandlers.handleAnalyzeCode(args);
  // ... 56 more cases
}

// NEW: Single registry call
return await toolRegistry.execute(request.params.name, request.params.arguments);
```

## Migration Guide

### Step 1: Identify Tool Categories

Tools are organized into 7 categories:
- **QUERY** - Search and query operations
- **ANALYSIS** - Code analysis and insights
- **SYSTEM** - System operations (scan, stats, cache)
- **TOOLING** - Development tooling detection
- **FRAMEWORK** - Framework detection and recommendations
- **DOCUMENT** - Documentation intelligence
- **LEARNING** - Brain-inspired learning systems

### Step 2: Create Tool Handlers

For each tool in the switch statement:

1. Create a new file in `src/tools/registry/tools/`
2. Extend `BaseToolHandler`
3. Implement the `execute()` method
4. Move logic from the existing handler

### Step 3: Register All Tools

Create a central registration file:

```typescript
// src/tools/registry/registerAllTools.ts
export function registerAllTools(
  mindMap: MindMapEngine,
  projectRoot: string
): void {
  // Query tools
  toolRegistry.registerMany([
    { handler: new QueryMindMapTool(mindMap), category: ToolCategory.QUERY },
    { handler: new UpdateMindMapTool(mindMap), category: ToolCategory.QUERY },
    { handler: new AdvancedQueryTool(mindMap), category: ToolCategory.QUERY },
    // ... all query tools
  ]);

  // Analysis tools
  toolRegistry.registerMany([
    { handler: new PredictErrorsTool(mindMap), category: ToolCategory.ANALYSIS },
    { handler: new SuggestFixesTool(mindMap), category: ToolCategory.ANALYSIS },
    // ... all analysis tools
  ]);

  // ... repeat for all categories
}
```

### Step 4: Update index.ts

```typescript
import { toolRegistry } from './tools/registry/ToolRegistry.js';
import { registerAllTools } from './tools/registry/registerAllTools.js';

class MindMapMCPServer {
  constructor() {
    // ... existing setup

    // Register all tools
    registerAllTools(this.mindMap, this.projectRoot);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools - now from registry
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: toolRegistry.getAllDefinitions()
    }));

    // Handle tool calls - single registry call replaces 58 cases!
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return await toolRegistry.execute(name, args);
    });
  }
}
```

## Advanced Features

### Tool Discovery by Category

```typescript
// Get all query tools
const queryTools = toolRegistry.getByCategory(ToolCategory.QUERY);

// Get registry statistics
const stats = toolRegistry.getStats();
console.log(`Total tools: ${stats.totalTools}`);
console.log(`By category:`, stats.byCategory);
```

### Custom Error Handling

```typescript
export class CustomTool extends BaseToolHandler {
  async execute(args: any): Promise<any> {
    try {
      // Custom logic
      return this.formatSuccess(result);
    } catch (error) {
      // Custom error handling
      return this.formatError('Custom error message', error);
    }
  }
}
```

### Validation

```typescript
async execute(args: any): Promise<any> {
  // Automatic validation
  this.validateArgs(args, ['query', 'threshold']);

  // Custom validation
  if (args.threshold < 0 || args.threshold > 1) {
    throw new Error('Threshold must be between 0 and 1');
  }

  // Safe execution with automatic error handling
  return this.safeExecute(async () => {
    return await this.mindMap.query(args.query);
  });
}
```

## Testing

```typescript
import { toolRegistry, ToolCategory } from '../ToolRegistry.js';
import { QueryMindMapTool } from '../tools/QueryMindMapTool.js';

describe('ToolRegistry', () => {
  beforeEach(() => {
    toolRegistry.clear();
  });

  it('should register and execute tools', async () => {
    const tool = new QueryMindMapTool(mockMindMap);
    toolRegistry.register(tool, ToolCategory.QUERY);

    const result = await toolRegistry.execute('query_mindmap', {
      query: 'test'
    });

    expect(result).toBeDefined();
  });

  it('should throw on unknown tool', async () => {
    await expect(
      toolRegistry.execute('unknown_tool', {})
    ).rejects.toThrow('Unknown tool');
  });
});
```

## Backward Compatibility

During migration, you can support both patterns:

```typescript
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Try registry first
  if (toolRegistry.has(name)) {
    return await toolRegistry.execute(name, args);
  }

  // Fall back to switch statement for un-migrated tools
  switch (name) {
    case 'legacy_tool':
      return await this.legacyHandler(args);
    // ... other legacy tools
  }
});
```

## Performance

The registry pattern has negligible performance overhead:
- Map lookup: O(1)
- No reflection or dynamic imports
- Same execution path as switch statement
- Additional benefits: better type checking and error handling

## Next Steps

1. ✅ Create ToolRegistry infrastructure
2. ⏳ Migrate query tools (7 tools)
3. ⏳ Migrate analysis tools (8 tools)
4. ⏳ Migrate system tools (6 tools)
5. ⏳ Migrate tooling tools (4 tools)
6. ⏳ Migrate framework tools (5 tools)
7. ⏳ Migrate document tools (6 tools)
8. ⏳ Migrate learning tools (22 tools)
9. ⏳ Remove switch statement from index.ts
10. ⏳ Update tests

**Total Progress: 0/58 tools migrated (0%)**
