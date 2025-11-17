# Mind Map MCP Test Suite

Comprehensive test suite using Vitest for the Mind Map Model Context Protocol server.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode  
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test TypeGuards.test.ts
```

## Structure

```
tests/
├── setup.ts                 # Global test setup and utilities
├── unit/                    # Unit tests
│   ├── utils/              # Utility tests
│   ├── tools/              # Tool registry tests
│   └── core/               # Core component tests
└── integration/            # Integration tests
```

## Writing Tests

See existing tests in `tests/unit/` for examples using Vitest patterns.
