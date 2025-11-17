# Mind Map MCP Test Suite

Comprehensive testing strategy with both unit and integration tests.

## Overview

The Mind Map MCP project uses a two-tier testing approach:

1. **Unit Tests** (Vitest) - Fast, isolated component tests
2. **Integration Tests** (Standalone) - Comprehensive end-to-end MCP server tests

## Quick Start

```bash
# Run all unit tests (fast, recommended for development)
npm test

# Run unit tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run integration tests (slower, comprehensive)
npm run test:integration

# Run all tests
npm run test:all
```

## Unit Tests

### Location
```
tests/
├── unit/
│   ├── parsers/           # Tree-sitter parser tests
│   ├── services/          # Service layer tests
│   ├── tools/             # Tool registry tests
│   └── utils/             # Utility function tests
└── setup.ts               # Global test setup
```

### Running Unit Tests

```bash
# All unit tests
npm test

# Specific test file
npm test TreeSitterParser

# Watch mode (auto-rerun on changes)
npm run test:watch

# With coverage report
npm run test:coverage

# Interactive UI
npm run test:ui
```

### Writing Unit Tests

```typescript
// tests/unit/example/MyComponent.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MyComponent } from '../../../src/example/MyComponent';

describe('MyComponent', () => {
  let component: MyComponent;

  beforeEach(() => {
    component = new MyComponent();
  });

  it('should initialize correctly', () => {
    expect(component).toBeDefined();
    expect(component.isReady()).toBe(true);
  });

  it('should handle errors gracefully', () => {
    expect(() => component.process(null)).toThrow('Invalid input');
  });
});
```

## Integration Tests

### Location
```
project-root/
├── test-simple-query.js           # Query functionality
├── test-document-intelligence.js  # Document analysis
├── test-ignore-patterns.js        # File ignore logic
├── test-cache-performance.js      # Cache behavior
└── run-integration-tests.js       # Test runner
```

### Running Integration Tests

```bash
# All integration tests
npm run test:integration

# Parallel execution (faster)
npm run test:integration:parallel

# Specific test
node test-simple-query.js

# Using runner with filter
node run-integration-tests.js simple

# With verbose output
node run-integration-tests.js --verbose
```

## Test Coverage

**Unit Tests:** 600+ test cases covering all major components

**Integration Tests:** 19 comprehensive end-to-end test scripts

**Combined Coverage:** ~80% of codebase

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser (opens coverage/index.html)
```

**Coverage Thresholds:**
- Lines: 70%
- Functions: 70%
- Branches: 60%

## Test Organization

### Unit vs Integration

**Use Unit Tests When:**
- Testing a single function/class
- Need fast feedback (< 1s)
- Can mock dependencies
- Testing edge cases

**Use Integration Tests When:**
- Testing MCP tools end-to-end
- Need real file system
- Testing complex workflows
- Validating system integration

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Test Migration Strategy](../docs/testing/Test-Migration-Strategy.md)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Summary

**Total Test Coverage:**
- ✅ 600+ unit tests (fast, every commit)
- ✅ 19 integration tests (comprehensive, on-demand)
- ✅ ~80% code coverage
- ✅ CI/CD integrated

**Quick Commands:**
```bash
npm test                        # Unit tests
npm run test:watch              # Watch mode
npm run test:coverage           # With coverage
npm run test:integration        # Integration tests
npm run test:all                # Everything
```

Happy testing! 🧪
