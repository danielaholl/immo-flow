/**
 * Test Setup File
 * Runs before all tests
 */
import { config } from './logger.js'dotenv';
import { join, dirname } from './logger.js'path';
import { fileURLToPath } from './logger.js'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment variables
config({ path: join(__dirname, '../../../.env.test') });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  // Keep error for debugging
  error: console.error,
};
