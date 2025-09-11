# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development Commands
```bash
# Build the TypeScript project
npm run build

# Development with auto-rebuild
npm run dev

# Type checking without compilation
npm run type-check

# Lint TypeScript files
npm run lint
npm run lint:fix

# Run tests
npm test
npm run test:coverage
```

### Testing the MCP Server
```bash
# Test the server functionality
node test-server.js

# Start the server directly
npm start
# or
node dist/index.js
```

### Build Requirements
- Node.js >= 18.0.0
- Must run `npm run build` before testing or deploying
- Built files are output to `dist/` directory
- The main entry point is `dist/index.js`

## Architecture Overview

This is a **Model Context Protocol (MCP) server** that provides intelligent project analysis and learning capabilities for Claude Code. The architecture follows a layered approach:

### Core Architecture Components

**MindMapMCPServer** (`src/index.ts`)
- Main MCP server class implementing the MCP protocol
- Handles stdio transport communication with Claude Code
- Routes tool calls to appropriate handlers
- Manages 6 MCP tools: `scan_project`, `query_mindmap`, `update_mindmap`, `get_context`, `suggest_exploration`, `get_stats`

**MindMapEngine** (`src/core/MindMapEngine.ts`)
- Core intelligence layer that orchestrates all operations
- Manages project scanning, querying, and learning
- Implements semantic search with confidence scoring
- Handles task outcome learning and pattern recognition

**MindMapStorage** (`src/core/MindMapStorage.ts`)
- Graph database abstraction layer
- Manages nodes (files, directories, functions, classes, errors, patterns) and edges (relationships)
- Handles serialization/persistence to `.mindmap-cache/mindmap.json`
- Provides graph traversal and CRUD operations

**FileScanner** (`src/core/FileScanner.ts`)
- File system analysis component
- Uses fast-glob for efficient file scanning with ignore patterns
- Classifies files (code, config, test) and detects languages/frameworks
- Handles MIME type detection and file metadata extraction

### Data Flow Architecture

1. **Project Analysis**: FileScanner → MindMapEngine → MindMapStorage (nodes/edges creation)
2. **Query Processing**: Natural language query → MindMapEngine semantic matching → scored results
3. **Learning Cycle**: Task outcomes → MindMapEngine confidence updates → MindMapStorage persistence
4. **Cross-Session Persistence**: Local JSON storage in `.mindmap-cache/` maintains knowledge between sessions

### Key Design Patterns

**Graph-Based Knowledge Representation**
- Nodes represent entities (files, functions, patterns, errors)
- Edges represent relationships (contains, imports, fixes, relates_to)
- Confidence scoring on nodes tracks success/failure patterns
- Time-based relevance boosts recent activity

**Learning System Architecture**
- Task outcome tracking with confidence score adjustments
- Error pattern mapping to solution locations
- Success pattern reinforcement through repeated positive outcomes
- Framework and pattern detection for contextual suggestions

**MCP Protocol Integration**
- Implements standard MCP server with stdio transport
- Tool schemas defined in `src/tools/index.ts`
- JSON-RPC 2.0 request/response handling
- Error handling with user-friendly messages

## Important Implementation Notes

### TypeScript Configuration
- Uses ES modules (`"type": "module"` in package.json)
- Target ES2022 with ESNext modules
- Import paths must include `.js` extension for compiled output
- CommonJS imports (like fast-glob) require default import syntax

### Data Persistence Strategy
- Mind map data stored as serialized JSON in `.mindmap-cache/mindmap.json`
- Maps are converted to arrays for JSON serialization
- Automatic cache invalidation after 24 hours
- Incremental updates rather than full rescans when possible

### Semantic Search Implementation
- Multi-factor relevance scoring: exact matches, path matches, confidence, recency
- Framework detection using regex patterns against file paths/names
- Language detection from file extensions with comprehensive mapping
- Query expansion through metadata and property matching

### Error Handling Patterns
- MCP tool calls wrapped in try-catch with user-friendly error messages
- File system operations handle permissions and missing files gracefully
- Graph operations validate node/edge existence before mutations
- TypeScript strict mode with comprehensive type checking

## File Structure Context

```
src/
├── index.ts              # MCP server entry point and tool routing
├── types/index.ts        # TypeScript interfaces for all data structures
├── tools/index.ts        # MCP tool schemas and definitions
└── core/
    ├── MindMapEngine.ts  # Main intelligence and coordination layer
    ├── MindMapStorage.ts # Graph storage and persistence layer
    └── FileScanner.ts    # File system analysis and classification
```

The `test-server.js` is a standalone testing script that validates MCP protocol communication and tool functionality.

## Development Notes

### Testing Strategy
- The test script validates all 6 MCP tools through JSON-RPC communication
- Tests project scanning, statistics, and basic querying functionality
- Server logs to stderr while MCP responses go to stdout

### Fixed Issues (Latest Version)
- ✅ **Date handling bug fixed**: Proper serialization/deserialization with validation
- ✅ **Path traversal vulnerability fixed**: Input sanitization and path validation added
- ✅ **Cross-platform file paths**: Windows compatibility for path separators
- ✅ **Memory leak prevention**: Task metadata limited to last 10 entries
- ✅ **Input validation**: Comprehensive validation for all MCP tool arguments
- ✅ **Error recovery**: Graceful handling of corrupted data and missing files

### Remaining Considerations  
- Fast-glob import requires default import syntax due to CommonJS/ESM interop
- Performance optimizations not yet implemented for large codebases (10k+ files)

### Extension Points
- Additional node types can be added to the graph (functions, classes, dependencies)
- New relationship types for more sophisticated code analysis
- AST parsing integration for deeper code understanding
- Pattern recognition can be enhanced with machine learning approaches
- USE the mind map mcp