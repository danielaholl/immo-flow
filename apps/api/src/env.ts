/**
 * Environment Configuration
 * MUST be imported first in index.ts to ensure env vars are loaded before other modules
 */
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
config({ path: join(__dirname, '../../../.env') });

// Debug: Log loaded env vars
console.log('🔧 Environment loaded:');
console.log('  DB_HOST:', process.env.DB_HOST);
console.log('  DB_USER:', process.env.DB_USER);
console.log('  DB_NAME:', process.env.DB_NAME);
console.log('  REDIS_HOST:', process.env.REDIS_HOST);

// =====================================================
// CRITICAL SECURITY CHECK: JWT_SECRET VALIDATION
// =====================================================
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('\n❌ FATAL ERROR: JWT_SECRET is not set!');
  console.error('   Set JWT_SECRET environment variable before starting the server.');
  console.error('   Example: JWT_SECRET=your-random-secret-min-32-characters\n');
  process.exit(1);
}

if (JWT_SECRET.length < 32) {
  console.error('\n❌ FATAL ERROR: JWT_SECRET is too short!');
  console.error(`   Current length: ${JWT_SECRET.length} characters`);
  console.error('   Minimum required: 32 characters');
  console.error('   Use a strong, random secret of at least 32 characters.\n');
  process.exit(1);
}

// Warning for default/weak secrets
const WEAK_SECRETS = [
  'your-secret-key',
  'change-in-production',
  'secret',
  'password',
  'dev-secret',
  '12345',
];

if (WEAK_SECRETS.some(weak => JWT_SECRET.toLowerCase().includes(weak))) {
  console.warn('\n⚠️  WARNING: JWT_SECRET appears to contain a weak/default value!');
  console.warn('   Consider using a cryptographically secure random string.');
  console.warn('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n');

  // In production, fail hard on weak secrets
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: Weak JWT_SECRET not allowed in production!\n');
    process.exit(1);
  }
}

console.log('✅ JWT_SECRET validation passed\n');
