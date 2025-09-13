# CLAUDE.md - Mind Map MCP v1.0.0

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Current Status**: Production Ready v1.0.0 - Complete enterprise-grade brain-inspired intelligence system with organized test suite.

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

## Mind Map MCP Integration Strategy

### When Working on This Project, ALWAYS:

1. **Start Every Session**:
   ```bash
   # Build and scan the project first
   npm run build
   ./test-server.js  # Verify MCP functionality
   ```

2. **Use Strategic MCP Workflow**:
   - `scan_project` → Get fresh project analysis
   - `get_stats` → Understand current state
   - `analyze_and_predict` → Trigger pattern analysis
   - `get_pattern_predictions` → See upcoming trends
   - `predict_errors` → Before making changes
   - `suggest_fixes` → When errors occur
   - `update_mindmap` → After completing tasks

3. **Leverage Advanced Capabilities**:
   - Use `advanced_query` for complex code analysis
   - Use `analyze_architecture` to understand patterns
   - Use `get_insights` for actionable recommendations
   - Use `temporal_query` to track code evolution
   - Use `get_emerging_patterns` for trend detection
   - Use `predict_pattern_emergence` for specific forecasts

### Strategic Usage Patterns:

**For New Features**:
```typescript
1. scan_project({ force_rescan: false, include_analysis: true })
2. analyze_and_predict()
3. get_pattern_predictions({ min_confidence: 0.6 })
4. suggest_exploration({ task_description: "implementing new feature X" })
5. predict_errors({ file_path: "target_file.ts" })
6. [implement feature]
7. update_mindmap({ task_description: "added feature X", outcome: "success" })
```

**For Debugging**:
```typescript
1. get_emerging_patterns({ min_strength: 0.3 }) // Check for emerging issue patterns
2. suggest_fixes({ error_message: "actual error", file_path: "error_location" })
3. query_mindmap({ query: "similar error patterns", type: "error" })
4. predict_pattern_emergence({ pattern_type: "error_patterns" })
5. [apply fix]
6. update_mindmap({ task_description: "fixed bug", outcome: "success", solution_details: {...} })
```

**For Refactoring**:
```typescript
1. analyze_architecture()
2. get_prediction_engine_stats() // Check prediction health
3. get_pattern_predictions({ pattern_type: "architectural_patterns", min_confidence: 0.7 })
4. advanced_query("MATCH (f:file)-[:contains]->(func:function) WHERE func.confidence < 0.5 RETURN f.path, func.name")
5. get_insights({ categories: ["code_quality"], actionable_only: true })
6. [refactor code]
7. update_mindmap({ task_description: "refactored module X", outcome: "success" })
```

### Configuration Reference:
- **MCP Config**: `~/.claude/mcp_config.json` (already configured)
- **Strategy Guide**: `~/.claude/MIND_MAP_STRATEGY.md` (comprehensive usage patterns)
- **33 Available Tools**: Core intelligence, advanced analysis, pattern prediction, temporal intelligence, setup automation

### Performance Targets:
- Query response time: < 10ms
- Error prediction accuracy: > 80%
- Solution effectiveness: Track via confidence scores
- Learning velocity: Measure improvement over sessions
- add to memmory, use the mind map mcp for store new thing you learn, and to get ideas and structures you can use
- Add to memorize, before each task read relevants from the mind map, and after each task update with new relevents. the idea that the explain of the project will be there, each problem we found and we dont want to repeat need to be there.