import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load root .env
config({ path: resolve(__dirname, '../../.env') });

export default {
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'rendito',
    ssl: false, // Disable SSL for local development
  },
  verbose: true,
  strict: true,
} satisfies Config;
