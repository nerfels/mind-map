import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Global test setup
    globals: true,

    // Test file patterns
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**'
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/index.ts', // MCP server entry point
        'src/tools/index.ts', // Tool definitions only
        'src/types/index.ts' // Type definitions only
      ],
      // Coverage thresholds
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      },
      all: true,
      clean: true
    },

    // Timeouts for async tests
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 10000, // 10 seconds for setup/teardown

    // Reporters
    reporters: ['verbose'],

    // Parallel execution
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },

    // Setup files
    setupFiles: ['./tests/setup.ts'],

    // Mock configuration
    mockReset: true,
    restoreMocks: true,
    clearMocks: true
  },

  // Resolve configuration for imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@handlers': path.resolve(__dirname, './src/handlers'),
      '@tools': path.resolve(__dirname, './src/tools'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@errors': path.resolve(__dirname, './src/errors')
    }
  }
});
