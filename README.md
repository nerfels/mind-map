# Mind Map MCP Server

**Enterprise-Grade Intelligence Complete** - An advanced Model Context Protocol (MCP) server that creates and maintains a persistent knowledge graph of your codebase for Claude Code. Features comprehensive AST analysis, predictive error detection, and intelligent learning systems.

## 🚀 Current Status: Production Ready

**✅ Phases 1-4 Complete** | **✅ TypeScript/JavaScript + Python AST Support** | **✅ 16 Advanced MCP Tools**

## Features

### 🧠 Advanced Code Intelligence  
- **AST Code Analysis**: Full TypeScript/JavaScript/Python parsing with function/class extraction
- **Multi-Language Support**: TypeScript, JavaScript, Python with framework detection
- **Architectural Pattern Detection**: Identifies 7 pattern types (layered, MVC, microservices, repository, factory, observer, plugin)
- **Predictive Error Detection**: Risk analysis system with historical pattern matching
- **Intelligent Fix Suggestions**: Context-aware recommendations based on error patterns

### 📚 Advanced Learning System
- **Task Outcome Learning**: Tracks success/failure patterns with confidence scoring
- **Error Pattern Recognition**: Categorizes errors and maps to successful solutions  
- **Cross-Session Intelligence**: Maintains knowledge between Claude Code sessions
- **Performance Learning**: Adaptive optimization based on usage patterns
- **Solution Effectiveness Tracking**: Measures and improves recommendation quality

### 🔍 Enterprise Query System
- **Cypher-like Graph Queries**: Advanced querying with complex filtering and relationships
- **Temporal Analysis**: Code evolution tracking and change impact analysis
- **Aggregate Analytics**: Project insights, metrics, and trend analysis
- **Semantic Search**: Multi-factor relevance scoring with confidence weighting
- **Saved Queries**: Template system for common analysis patterns

### ⚡ Performance & Scalability
- **Multi-Index Storage**: Optimized indexing for type, path, name, confidence, framework, language
- **LRU Caching**: Memory optimization with intelligent cache management
- **Performance Monitoring**: Real-time operation timing and bottleneck detection
- **Query Optimization**: Execution planning and index hints for complex queries

## Installation

```bash
# Clone or create the project
npm install

# Build the server
npm run build

# Test the installation
npm start
```

## Usage with Claude Code

Add this server to your Claude Code MCP configuration:

### Claude Desktop Configuration

Edit your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mind-map-mcp": {
      "command": "node",
      "args": ["/path/to/mind-map-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

### CLI Usage

```bash
# Start the server directly (for testing)
npm start

# Or use the built binary
node dist/index.js
```

## Available MCP Tools (16 Total)

### Core Intelligence Tools
- **`scan_project`**: Initial project analysis with AST parsing and pattern detection
- **`query_mindmap`**: Semantic search with confidence scoring and relevance ranking  
- **`update_mindmap`**: Learning system for task outcomes and error patterns
- **`suggest_exploration`**: Intelligent file/function recommendations
- **`get_context`**: Project overview and contextual information
- **`get_stats`**: Comprehensive project statistics and metrics

### Advanced Analysis Tools  
- **`predict_errors`**: Risk analysis and error prediction based on patterns
- **`suggest_fixes`**: Context-aware fix recommendations for error patterns
- **`analyze_architecture`**: Detect architectural patterns and design insights
- **`advanced_query`**: Cypher-like graph queries with complex filtering
- **`temporal_query`**: Code evolution and change impact analysis
- **`aggregate_query`**: Project metrics, insights, and trend analysis

### Performance & Utility Tools
- **`get_performance`**: Real-time performance monitoring and bottleneck detection
- **`save_query`**: Save and manage reusable query templates
- **`execute_saved_query`**: Run saved queries with parameter substitution
- **`clear_cache`**: Cache management and cleanup utilities

### Example Usage

```json
{
  "name": "scan_project",
  "arguments": {
    "force_rescan": false,
    "include_analysis": true,
    "ast_analysis": true
  }
}
```

```json
{
  "name": "advanced_query", 
  "arguments": {
    "query": "MATCH (f:file)-[:contains]->(func:function) WHERE func.name CONTAINS 'auth' RETURN f.path, func.name",
    "limit": 10
  }
}
```

```json
{
  "name": "predict_errors",
  "arguments": {
    "file_path": "src/auth/login.ts",
    "context": "implementing OAuth integration"
  }
}
```

## How It Works

### 1. Advanced Project Analysis
The server performs comprehensive scanning and creates nodes for:
- **Files & Directories**: Complete project structure with metadata
- **AST Elements**: Functions, classes, interfaces, imports/exports with full signatures
- **Architectural Patterns**: 7 pattern types with confidence scoring
- **Framework Detection**: React, Vue, Express, Django, Flask, pandas, NumPy, etc.
- **Error Patterns**: Historical error categorization and solution mapping

### 2. Multi-Language AST Parsing
Currently supports:
- **TypeScript/JavaScript**: Full AST with function/class extraction via TypeScript compiler API
- **Python**: Complete AST parsing with subprocess execution for functions, classes, decorators
- **Coming Soon**: Java, Go, Rust, C/C++ support (Phase 5.2-5.5)

### 3. Intelligent Learning System
As you use Claude Code, the server:
- **Tracks Task Outcomes**: Success/failure patterns with confidence adjustment
- **Maps Error Solutions**: Categorizes errors and associates with successful fixes
- **Builds Pattern Recognition**: Framework usage, naming conventions, architectural insights
- **Optimizes Performance**: LRU caching and multi-index storage for faster queries

### 4. Enterprise Query Engine  
Advanced querying capabilities include:
- **Cypher-like Syntax**: Complex graph traversal with filtering and aggregation
- **Semantic Search**: Multi-factor relevance scoring (exact, path, confidence, recency)
- **Temporal Analysis**: Code evolution tracking and change impact assessment
- **Predictive Analytics**: Error risk assessment and fix suggestion engine

### 5. Cross-Session Intelligence
All learning persists locally with:
- **Graph Database**: Nodes, edges, and relationship storage in JSON format
- **Performance Monitoring**: Operation timing and bottleneck detection
- **Query Optimization**: Execution planning and index hints
- **Cache Management**: LRU eviction and intelligent memory optimization

## Data Storage

The mind map data is stored locally in your project directory:

```
your-project/
├── .mindmap-cache/
│   └── mindmap.json          # Serialized knowledge graph
└── ... (your project files)
```

## Privacy & Security

- **Local-Only**: All data stays on your machine
- **No Network**: No external API calls or data transmission
- **Configurable**: Choose what gets tracked
- **Transparent**: All data stored in readable JSON format

## Development

```bash
# Development with auto-rebuild
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm test
```

## Architecture

The server consists of several key components:

- **MindMapEngine**: Core intelligence and query processing
- **MindMapStorage**: Graph database operations and persistence
- **FileScanner**: Project analysis and file classification
- **MCP Server**: Protocol implementation and tool handling

## Roadmap

### ✅ Completed (Phases 1-4)
- **Core MCP Server**: 16 tools with stdio transport  
- **AST Analysis**: TypeScript/JavaScript + Python parsing
- **Advanced Intelligence**: Predictive errors, fix suggestions, architectural patterns
- **Enterprise Querying**: Cypher-like queries, temporal analysis, aggregates
- **Performance Systems**: Multi-index storage, LRU caching, monitoring

### 🚧 In Progress (Phase 5: Multi-Language)
- **Phase 5.1**: ✅ Python AST support completed
- **Phase 5.2**: Java AST support (JavaParser/Eclipse JDT)
- **Phase 5.3**: Go AST support (go/parser, go/ast)
- **Phase 5.4**: Rust AST support (syn crate integration)
- **Phase 5.5**: C/C++ AST support (libclang/tree-sitter)

### 🔮 Future (Phase 6+)
- **Visual Interface**: Mind map visualization and exploration
- **Team Sharing**: Collaborative knowledge base
- **IDE Integrations**: VS Code, IntelliJ, Vim plugins
- **Advanced ML**: Neural pattern recognition and recommendations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- Report issues on GitHub
- Check the troubleshooting guide in docs/
- Review the API documentation for integration details