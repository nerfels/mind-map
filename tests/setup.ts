/**
 * Vitest Global Setup
 *
 * This file runs before all tests to configure the test environment
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Test data directory
const TEST_DATA_DIR = path.join(process.cwd(), '.test-cache');

/**
 * Global setup - runs once before all test suites
 */
beforeAll(() => {
  console.log('🧪 Setting up test environment...');

  // Create test cache directory
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.MINDMAP_TEST_MODE = 'true';
});

/**
 * Global teardown - runs once after all test suites
 */
afterAll(() => {
  console.log('🧹 Cleaning up test environment...');

  // Clean up test cache directory
  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
});

/**
 * Before each test - runs before every test
 */
beforeEach(() => {
  // Reset any global state
  // This ensures tests are isolated
});

/**
 * After each test - runs after every test
 */
afterEach(() => {
  // Clean up any test-specific resources
});

/**
 * Helper: Create temporary test directory
 */
export function createTestDir(name: string): string {
  const testDir = path.join(TEST_DATA_DIR, name);
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  return testDir;
}

/**
 * Helper: Clean test directory
 */
export function cleanTestDir(name: string): void {
  const testDir = path.join(TEST_DATA_DIR, name);
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

/**
 * Helper: Create test file with content
 */
export function createTestFile(dir: string, filename: string, content: string): string {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Helper: Wait for async operation
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper: Create mock MindMapNode
 */
export function createMockNode(overrides: any = {}) {
  return {
    id: 'test-node-id',
    type: 'file',
    name: 'test-file.ts',
    path: '/test/path/test-file.ts',
    confidence: 1.0,
    metadata: {},
    ...overrides
  };
}

/**
 * Helper: Create mock MindMapEdge
 */
export function createMockEdge(overrides: any = {}) {
  return {
    id: 'test-edge-id',
    source: 'source-id',
    target: 'target-id',
    type: 'imports',
    confidence: 1.0,
    metadata: {},
    ...overrides
  };
}

// Export test data directory for use in tests
export { TEST_DATA_DIR };
