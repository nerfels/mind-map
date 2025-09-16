# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server called "Mind Map MCP" - a brain-inspired code intelligence platform that implements neuroscience-based intelligence for software development. It provides 33+ advanced MCP tools for project analysis, multi-language AST parsing, pattern prediction, and intelligent code understanding.

## Essential Commands

### Build and Development
```bash
# Build the project (required before testing/running)
npm run build

# Development with auto-rebuild
npm run dev

# Type checking only
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Testing
npm test
npm run test:coverage

# Start the MCP server
npm start
# or
node dist/index.js
```

### Testing Commands
```bash
# Run the comprehensive test suite
npm test

# Individual test scripts (run from project root)
node test-simple-query.js
node test-document-intelligence.js
node test-ignore-patterns.js
```

## Architecture Overview

### Core Components

1. **MindMapEngine** (`src/core/MindMapEngine.ts`) - Central orchestrator that coordinates all subsystems
   - Implements 33+ MCP tools through service delegation pattern
   - Manages brain-inspired intelligence systems (Hebbian learning, attention, memory)
   - Coordinates multi-language analysis and pattern prediction

2. **Service Layer** (`src/core/services/`)
   - **QueryService** - Handles semantic search, advanced queries, temporal analysis
   - **AnalysisService** - Manages AST parsing, architectural analysis, framework detection
   - **ScanningService** - Project scanning with parallel processing and scalability management
   - **LearningService** - Brain-inspired learning systems (Hebbian, episodic memory, attention)
   - **ConfigurationService** - User preferences, custom patterns, scalability config
   - **DocumentIntelligenceService** - Document analysis and relationship extraction

3. **Handler Pattern** (`src/handlers/`)
   - **QueryHandlers** - MCP tool handlers for query operations
   - **AnalysisHandlers** - MCP tool handlers for code analysis
   - **SystemHandlers** - MCP tool handlers for system operations
   - **ToolingHandlers** - MCP tool handlers for development tooling
   - **FrameworkHandlers** - MCP tool handlers for framework detection
   - **DocumentHandlers** - MCP tool handlers for document intelligence

4. **Brain-Inspired Intelligence Systems**
   - **HebbianLearningSystem** - "Neurons that fire together, wire together" - co-activation learning
   - **InhibitoryLearningSystem** - Failure pattern avoidance and negative learning
   - **AttentionSystem** - Dynamic focus allocation and cognitive load management
   - **EpisodicMemory** - Programming experience storage and retrieval
   - **BiTemporalKnowledgeModel** - Valid vs transaction time tracking
   - **PatternPredictionEngine** - Anticipatory intelligence for emerging patterns

### Data Flow

1. **MCP Server** (`src/index.ts`) receives tool calls from Claude
2. **Handler Classes** validate and delegate to appropriate services
3. **Service Classes** coordinate core components and intelligence systems
4. **Core Components** perform analysis using brain-inspired algorithms
5. **Storage Layer** (`MindMapStorage`) persists graph data and learning state

### Multi-Language Support

The system supports comprehensive AST analysis for 12 programming languages:
- **TypeScript/JavaScript** - Complete AST via TypeScript compiler API
- **Python** - Full AST with framework detection (Django, Flask)
- **Java** - AST parsing with Spring Boot detection
- **Go, Rust, C++** - Struct/interface/function extraction
- **PHP, C#, Ruby, Swift, Kotlin, Scala** - Full AST with framework detection

## Key Patterns

### Service Delegation Pattern
The MindMapEngine delegates complex operations to specialized services rather than implementing everything directly. This keeps the main engine focused on coordination.

### Brain-Inspired Intelligence
All learning and analysis systems are based on neuroscience principles:
- **Associative Memory** - Neural activation spreading for relevance
- **Synaptic Strengthening** - Co-activation patterns get reinforced
- **Attention Mechanisms** - Dynamic focus on important code elements
- **Memory Consolidation** - Experience-based learning from success/failure

### Parallel Processing Architecture
Uses worker pools and chunked processing for large projects:
- **ParallelFileProcessor** - Concurrent file analysis
- **ActivationNetwork** - Neuromorphic query processing
- **ScalabilityManager** - Resource usage optimization

## Important Implementation Notes

### File Ignore Patterns
The system has sophisticated ignore pattern support:
- Loads from `.gitignore`, `.mindmapignore`, and custom patterns
- Smart defaults for common build artifacts
- Real-time pattern testing and analytics

### Error Handling
- All MCP tool handlers use `ResponseFormatter` for consistent error responses
- Brain-inspired systems learn from failures through `InhibitoryLearningSystem`
- Comprehensive logging to `.mindmap-cache/mcp.log`

### Performance Considerations
- LRU caching with 100MB memory management
- Multi-index storage for fast graph queries
- Query optimization with execution planning
- Context-aware cache invalidation

## Development Guidelines

### Adding New MCP Tools
1. Define tool schema in `src/tools/index.ts`
2. Add handler method in appropriate handler class
3. Register in the switch statement in `src/index.ts`
4. Implement core logic in relevant service class

### Testing
- Use existing test scripts as templates
- Test both successful and failure scenarios for learning systems
- Verify brain-inspired features (Hebbian learning, attention allocation)
- Test multi-language AST parsing with representative code samples

### Brain-Inspired Features
When modifying learning systems, remember:
- Hebbian learning tracks co-activation patterns
- Inhibitory learning prevents repeated failures
- Attention systems manage cognitive load (Miller's 7±2 rule)
- All learning should be persistent across sessions

## How to Use Mind Map MCP for Development Tasks

**IMPORTANT**: Always use Mind Map MCP tools instead of traditional search/grep commands. This project provides 33+ intelligent MCP tools that offer superior code understanding and project intelligence.

### Essential Workflow - Start Every Session

**1. Initialize Project Knowledge**
```
Please scan the project and get initial statistics.
```
This builds the project knowledge graph and enables all brain-inspired features.

**2. Get Project Context**
```
Please get project context and suggest exploration areas for [your current task].
```
Gets intelligent recommendations on where to start.

### Instead of grep/search commands, use:

#### Finding Code Elements
```
# Instead of: grep -r "function_name" .
Please query the mindmap for functions containing "function_name"

# Instead of: find . -name "*.ts" | grep Component
Please query the mindmap for TypeScript files containing "Component"

# Instead of: grep -r "import.*React" .
Please query the mindmap for files that import React
```

#### Understanding Project Structure
```
# Instead of: find . -type f -name "*.ts" | head -20
Please analyze the project architecture and show me the main TypeScript components

# Instead of: ls -la src/
Please query the mindmap for all files in the src directory with their relationships
```

#### Finding Related Code
```
# Instead of: grep -r "auth" . --include="*.ts"
Please query the mindmap for authentication-related code across all languages

# Instead of: find . -name "*test*"
Please query the mindmap for test files and their corresponding source files
```

### Task-Specific Mind Map Usage

#### 🔍 **Code Exploration & Understanding**
```
# Get comprehensive project overview
Please analyze the project architecture and detect design patterns

# Understand dependencies between components
Please detect cross-language dependencies in this project

# Find framework usage patterns
Please detect enhanced frameworks and get framework recommendations
```

#### 🐛 **Bug Investigation & Fixing**
```
# Before starting bug investigation
Please predict potential errors in [filename] and suggest areas to focus on

# When you encounter an error
Please suggest fixes for error: "[error message]" in file [filepath]

# Learn from solutions
Please update the mindmap with successful completion of: "Fixed [bug description]"
```

#### ✨ **Feature Development**
```
# Before implementing new features
Please analyze call patterns in [relevant files] to understand the current architecture

# Find similar implementations
Please query the mindmap for functions similar to [feature description]

# Get architectural guidance
Please generate multi-language refactoring suggestions focused on [feature area]
```

#### 🧪 **Testing & Quality**
```
# Detect available testing tools
Please detect project tooling and get tooling recommendations

# Run comprehensive analysis
Please run the tool suite and provide aggregated results

# Predict issues before they happen
Please predict errors and get emerging patterns in the codebase
```

#### 📚 **Documentation & Knowledge**
```
# Analyze project documentation
Please analyze project documentation and get documentation insights

# Understand document relationships
Please get document relationships and documentation statistics

# Find knowledge gaps
Please analyze and predict what documentation patterns are emerging
```

### Brain-Inspired Intelligence Features

#### 🧠 **Learning from Experience**
```
# Check what the system has learned
Please show me Hebbian learning statistics and top co-activation patterns

# Track attention patterns
Please show attention system statistics and current focus areas

# Review prediction capabilities
Please get pattern predictions and emerging patterns analysis
```

#### 📈 **Performance & Optimization**
```
# Monitor system performance
Please get performance statistics and cache stats

# Optimize ignore patterns for faster scanning
Please test ignore patterns and get ignore statistics

# Review resource usage
Please get mind map statistics and hierarchical context stats
```

### Advanced Workflows

#### 🔄 **Temporal Analysis**
```
# Track code evolution over time
Please create temporal snapshot and query bi-temporal data

# Understand change patterns
Please get bi-temporal statistics and create context window for this session
```

#### 🎯 **Attention Management**
```
# Focus on specific areas
Please allocate attention to [important files/functions] with selective attention

# Update focus based on activity
Please update attention from current query activity and file access patterns
```

#### 💾 **Knowledge Consolidation**
```
# Consolidate learning
Please consolidate episodic memories and get episodic statistics

# Save important insights
Please save advanced query: "Find authentication patterns" for future use
```

### Best Practices

1. **Always start with project scanning** - This enables all intelligence features
2. **Use Mind Map queries instead of grep/find** - Much more intelligent and context-aware
3. **Update the mind map with task outcomes** - Helps improve future suggestions
4. **Leverage brain-inspired features** - Attention, memory, and pattern prediction
5. **Predict errors before implementing** - Use error prediction for proactive development
6. **Learn from the system's intelligence** - Review Hebbian patterns and attention stats

### Example Complete Development Session

```
# 1. Initialize
Please scan the project and get initial statistics

# 2. Understand current state
Please analyze the project architecture and get insights

# 3. Find relevant code for your task
Please query the mindmap for [your specific need]

# 4. Predict potential issues
Please predict potential errors in [target files]

# 5. Implement changes (using traditional tools)

# 6. Learn from the experience
Please update the mindmap with successful completion of: "[your task description]"

# 7. Consolidate knowledge
Please get pattern predictions and emerging patterns to see what you learned
```

This approach leverages the full power of the brain-inspired intelligence system instead of basic file system operations.

## Mind Map as Development Assistant

### Using Mind Map for Development Tasks

**ALWAYS use Mind Map MCP tools as your primary development assistant instead of traditional grep/find commands.**

#### 🔍 **Code Discovery & Navigation**
```
# Instead of: grep -r "function_name" .
Please query the mindmap for "function_name implementation"

# Instead of: find . -name "*.ts" | grep Component
Please query the mindmap for "TypeScript Component files"

# Instead of: grep -r "cache" src/
Please query the mindmap for "cache implementation in src directory"
```

#### 🧠 **Understanding System Architecture**
```
# Before starting any task
Please scan the project and get initial statistics

# Understand code relationships
Please query the mindmap for "[relevant code area]" to understand current implementation

# Get system insights
Please analyze the project architecture and get insights
```

#### ⚡ **Performance & Validation**
```
# Test changes immediately
Please get cache stats / performance statistics / attention stats

# Validate improvements
Please query the mindmap for similar patterns to verify consistency

# Monitor system health
Please get mind map statistics and cache performance
```

#### 🎯 **Task-Specific Mind Map Usage**

**Code Analysis Tasks:**
- Query mindmap for existing implementations before writing new code
- Use architectural analysis to understand patterns and conventions
- Get error predictions to anticipate issues

**Bug Investigation:**
- Query mindmap for error patterns and fix suggestions
- Use pattern prediction to understand potential root causes
- Leverage brain-inspired learning from previous similar issues

**Feature Development:**
- Query mindmap for similar features and implementation patterns
- Use cross-language dependency analysis for integration points
- Get framework recommendations for new components

### Learning Documentation Process

**REQUIRED: After completing any development task, document your learnings**

#### 📚 **Learning Directory Structure**
```
learning/
├── 001-mindmap-as-development-helper.md
├── 002-[next-task-insights].md
├── 003-[another-task-insights].md
└── ...
```

#### 📝 **Learning Documentation Template**
Create a new file: `learning/XXX-[short-task-description].md`

**Required Content:**
```markdown
# XXX - [Task Title]

## 🔍 How Mind Map MCP Helped with [Task Name]

### Code Discovery & Navigation
- Specific mind map queries used
- How it was faster/better than traditional tools

### Understanding Current Implementation
- What the mind map revealed about existing code
- Relationships and connections discovered

### Performance Testing & Validation
- Real-time feedback and metrics observed
- How mind map provided immediate validation

### Pattern Analysis & Design Insights
- Patterns discovered through mind map analysis
- How it informed design decisions

## 💡 Key Insight
**One-line summary of the main learning**
```

#### 🎯 **When to Create Learning Files**

**Always create a learning file when:**
- Completing any task from TASKS.md
- Implementing new features or optimizations
- Debugging complex issues using mind map assistance
- Discovering new patterns or architectural insights
- Using mind map in novel ways for development

**File Naming Convention:**
- `001-mindmap-as-development-helper.md` (general mind map usage)
- `002-cache-optimization-insights.md` (specific task learnings)
- `003-storage-compression-discoveries.md` (next task)
- etc.

### Best Practices for Mind Map-Assisted Development

1. **Start Every Task with Mind Map Scanning** - `scan_project` and `get_stats`
2. **Query Before Coding** - Understand existing patterns first
3. **Test with Mind Map** - Use mind map queries to validate changes
4. **Document Mind Map Usage** - Record how it helped in learning files
5. **Leverage Brain-Inspired Features** - Use attention, memory, pattern prediction
6. **Update Mind Map with Outcomes** - Feed learnings back into the system

## Storage and Persistence

Data is stored in `.mindmap-cache/` directory:
- `mindmap.json` - Graph database with nodes, edges, and learning state
- `user-config.json` - User preferences and configuration
- `mcp.log` - MCP server operation logs

Learning documentation is stored in `learning/` directory:
- `XXX-[task-name].md` - Sequential learning files documenting mind map usage insights

The system maintains complete audit trails for temporal queries and supports bi-temporal knowledge modeling.