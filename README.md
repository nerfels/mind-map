# Mind Map MCP Server

An intelligent Model Context Protocol (MCP) server that creates and maintains a persistent knowledge graph of your codebase for Claude Code. It learns from your interactions and provides smarter file exploration and context-aware suggestions.

## Features

### 🧠 Intelligent Project Mapping
- **File Structure Analysis**: Automatically scans and maps your project's file hierarchy
- **Code Structure Recognition**: Extracts functions, classes, and dependencies
- **Framework Detection**: Identifies React, Vue, Express, Django, and more
- **Pattern Recognition**: Learns coding conventions and architectural patterns

### 📚 Learning System
- **Task Memory**: Remembers successful approaches for similar tasks
- **Error Tracking**: Maps error types to their successful solutions
- **Confidence Scoring**: Tracks which files/patterns work for different tasks
- **Cross-Session Persistence**: Maintains knowledge between Claude Code sessions

### 🔍 Smart Query System
- **Semantic Search**: Find files and functions using natural language
- **Context-Aware Suggestions**: Get relevant file recommendations based on task description
- **Intelligent Exploration**: Guided discovery for unfamiliar codebases
- **Success Pattern Matching**: Surface proven solutions for similar problems

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

## Available Tools

### `scan_project`
Perform initial project scan to build the mind map.

```json
{
  "name": "scan_project",
  "arguments": {
    "force_rescan": false,
    "include_analysis": true
  }
}
```

### `query_mindmap`
Search for relevant files, functions, or patterns.

```json
{
  "name": "query_mindmap",
  "arguments": {
    "query": "authentication logic",
    "type": "file",
    "limit": 10,
    "include_metadata": false
  }
}
```

### `update_mindmap`
Update the mind map with task results and learning.

```json
{
  "name": "update_mindmap",
  "arguments": {
    "task_description": "Fixed login bug",
    "files_involved": ["src/auth/login.ts"],
    "outcome": "success",
    "solution_details": {
      "approach": "Updated JWT validation",
      "effectiveness": 0.9
    }
  }
}
```

### `suggest_exploration`
Get intelligent suggestions for where to look.

```json
{
  "name": "suggest_exploration",
  "arguments": {
    "task_description": "need to add user registration",
    "exploration_type": "files"
  }
}
```

### `get_context`
Retrieve contextual information about the project.

```json
{
  "name": "get_context",
  "arguments": {
    "context_type": "project_overview",
    "limit": 5
  }
}
```

### `get_stats`
Get statistics about the mind map.

```json
{
  "name": "get_stats",
  "arguments": {}
}
```

## How It Works

### 1. Project Scanning
The server scans your project and creates nodes for:
- **Files & Directories**: Complete project structure
- **Code Elements**: Functions, classes, imports, exports  
- **Patterns**: Framework usage, naming conventions
- **Errors**: Historical error patterns and fixes

### 2. Learning from Interactions
As you use Claude Code, the server:
- Tracks which files were involved in successful tasks
- Records error patterns and their solutions
- Adjusts confidence scores based on outcomes
- Builds associations between tasks and code locations

### 3. Intelligent Querying
When you query for files or functions:
- Semantic matching finds relevant code using natural language
- Confidence scoring prioritizes proven solutions
- Recent activity boosts relevant files
- Pattern matching suggests similar solutions

### 4. Persistent Knowledge
All learning is persisted locally in `.mindmap-cache/` and includes:
- Project structure and metadata
- Task history and outcomes
- Error patterns and solutions
- Success patterns and confidence scores

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

### Phase 2 Features (Coming Soon)
- Advanced code analysis with AST parsing
- Cross-file dependency tracking
- Automated test suggestion
- Performance impact analysis

### Phase 3 Features (Future)
- Team knowledge sharing
- Visual mind map interface
- IDE integrations
- Advanced pattern learning

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