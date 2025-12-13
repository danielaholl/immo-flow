import { z } from 'zod';

const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default('4000'),

  // Database
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_PORT: z.string().transform(Number).pipe(z.number().positive()).default('5432'),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),

  // Security - NO FALLBACKS!
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),

  // APIs
  OPENAI_API_KEY: z.string().startsWith('sk-', 'Invalid OpenAI API key format'),

  // URLs
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  PUBLIC_URL: z.string().url().optional(),

  // Optional configurations
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ENABLE_QUERY_LOGGING: z.string().transform(v => v === 'true').default('false'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function validateEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  console.log('🔍 Validating environment variables...');

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:\n');
    const formatted = result.error.format();

    // Pretty print errors
    Object.entries(formatted).forEach(([key, value]) => {
      if (key !== '_errors' && value && typeof value === 'object') {
        const errors = (value as any)._errors;
        if (errors && errors.length > 0) {
          console.error(`  ${key}: ${errors.join(', ')}`);
        }
      }
    });

    console.error('\n💡 Please check your .env file and ensure all required variables are set.');
    console.error('   See .env.example for reference.\n');

    process.exit(1);
  }

  cachedEnv = result.data;

  console.log('✅ Environment variables validated successfully');
  console.log(`   - Environment: ${cachedEnv.NODE_ENV}`);
  console.log(`   - Database: ${cachedEnv.DB_NAME}@${cachedEnv.DB_HOST}`);
  console.log(`   - JWT Secret: ${'*'.repeat(20)} (${cachedEnv.JWT_SECRET.length} chars)`);
  console.log(`   - OpenAI: ${cachedEnv.OPENAI_API_KEY.substring(0, 10)}...`);

  return cachedEnv;
}

export function getEnv(): Env {
  if (!cachedEnv) {
    throw new Error('Environment not validated. Call validateEnv() first during startup.');
  }
  return cachedEnv;
}
