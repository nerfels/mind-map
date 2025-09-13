# Mind Map MCP - Test Suite

This directory contains all test files organized by functionality category.

## Test Organization

### 🧠 Brain-Inspired Tests (`brain-inspired/`)
Tests for neuromorphic computing features and brain-inspired intelligence:
- **Activation System**: `test-activation*.js` - Neural activation spreading
- **Hebbian Learning**: `test-hebbian*.js` - "Neurons that fire together, wire together"
- **Inhibitory Learning**: `test-inhibitory*.js` - Negative learning patterns
- **Attention System**: `test-attention*.js` - Dynamic attention allocation
- **Bi-Temporal Models**: `test-bi-temporal.js` - Temporal knowledge tracking
- **Hierarchical Context**: `test-hierarchical-context.js` - Multi-level context
- **Pattern Prediction**: `test-pattern-prediction.js` - Predictive pattern analysis

### 🔤 Language AST Tests (`language-ast/`)
Tests for multi-language Abstract Syntax Tree parsing:
- **TypeScript/JavaScript**: `test-ast-parsing.js`
- **Python**: `test-python-ast.js`
- **Java**: `test-java-ast.js`
- **Go**: `test-go-ast.js`
- **Rust**: `test-rust-ast.js`
- **C/C++**: `test-cpp-ast.js`

### ⚡ Performance Tests (`performance/`)
Tests for scalability, caching, and performance optimization:
- **Caching**: `test-cache*.js` - LRU cache and query caching
- **Parallel Processing**: `test-parallel.js` - Concurrent file processing
- **Performance Monitoring**: `test-performance.js` - Performance metrics
- **Scalability**: `test-scalability.js` - Large project handling

### 🎯 Core Features Tests (`core-features/`)
Tests for advanced query capabilities and intelligent features:
- **Advanced Queries**: `test-advanced-queries.js` - Cypher-like graph queries
- **Fix Suggestions**: `test-fix-suggestions.js` - Intelligent error fixing
- **Error Prediction**: `test-predict-errors.js` - Predictive error detection
- **Validation**: `test-validation.js` - Data validation and integrity

### 🔗 Integration Tests (`integration/`)
Tests for MCP server integration and end-to-end functionality:
- **MCP Server**: `test-server.js` - Core MCP protocol testing
- **Project Scanning**: `test-fresh-scan.js` - Full project analysis
- **Claude Code Init**: `test-init-claude-code.js` - Setup and configuration
- **Quick Tests**: `test-init-quick.js` - Rapid functionality validation

### 📄 Example Files (`example-files/`)
Sample source code files for testing language parsers:
- **Python**: `test-python-example.py` - Python code sample
- **Java**: `test-java-example.java` - Java code sample
- **Go**: `test-go-example.go` - Go code sample
- **Rust**: `test-rust-example.rs` - Rust code sample
- **C++**: `test-cpp-example.cpp` - C++ code sample

## Running Tests

### Individual Category Tests
```bash
# Run brain-inspired tests
node tests/brain-inspired/test-hebbian-learning.js

# Run language AST tests
node tests/language-ast/test-python-ast.js

# Run performance tests
node tests/performance/test-scalability.js

# Run core feature tests
node tests/core-features/test-advanced-queries.js

# Run integration tests
node tests/integration/test-server.js
```

### Build Before Testing
```bash
npm run build
```

## Test Categories Summary

| Category | Files | Focus Area |
|----------|-------|------------|
| 🧠 Brain-Inspired | 12 | Neuromorphic computing, learning systems |
| 🔤 Language AST | 6 | Multi-language code parsing |
| ⚡ Performance | 5 | Scalability and optimization |
| 🎯 Core Features | 4 | Advanced intelligence features |
| 🔗 Integration | 4 | End-to-end MCP functionality |
| 📄 Example Files | 5 | Sample source code for testing |
| **Total** | **36** | **Complete test coverage** |

## Test Philosophy

The test suite follows the project's architecture with tests organized by:
1. **Functionality** - Each test category matches a core system component
2. **Complexity** - From unit tests to integration tests
3. **Brain-Inspired Principles** - Emphasizing neuromorphic computing validation
4. **Enterprise Scale** - Testing scalability and performance at scale

This organization ensures comprehensive coverage while maintaining clear separation of concerns and easy navigation for developers.