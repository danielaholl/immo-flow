/**
 * AI Rate Limiting Middleware for tRPC
 * Protects expensive AI operations from abuse and cost explosion
 */
import { TRPCError } from '@trpc/server';
import { query } from '../db.js';

// Rate limit configuration
const AI_RATE_LIMITS = {
  perHour: 10, // Max 10 AI requests per hour
  perDay: 50, // Max 50 AI requests per day
};

/**
 * Check if user has exceeded AI rate limits
 * Creates ai_request_logs table if it doesn't exist
 */
export async function checkAIRateLimit(userId: string, operation: string): Promise<void> {
  try {
    // Create tracking table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS ai_request_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        operation TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ip_address TEXT,
        user_agent TEXT
      )
    `);

    // Create index for faster lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_ai_requests_user_time
      ON ai_request_logs(user_id, created_at DESC)
    `);

    // Check hourly limit
    const hourlyCount = await query(
      `SELECT COUNT(*) as count
       FROM ai_request_logs
       WHERE user_id = $1
         AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId]
    );

    if (parseInt(hourlyCount[0].count) >= AI_RATE_LIMITS.perHour) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Zu viele KI-Anfragen. Limit: ${AI_RATE_LIMITS.perHour} pro Stunde. Bitte warte eine Weile und versuche es erneut.`,
      });
    }

    // Check daily limit
    const dailyCount = await query(
      `SELECT COUNT(*) as count
       FROM ai_request_logs
       WHERE user_id = $1
         AND created_at > NOW() - INTERVAL '24 hours'`,
      [userId]
    );

    if (parseInt(dailyCount[0].count) >= AI_RATE_LIMITS.perDay) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Tägliches KI-Limit erreicht. Limit: ${AI_RATE_LIMITS.perDay} pro Tag. Bitte versuche es morgen erneut.`,
      });
    }

    // Log the request
    await query(
      `INSERT INTO ai_request_logs (user_id, operation)
       VALUES ($1, $2)`,
      [userId, operation]
    );

    console.log(`[AI Rate Limit] User ${userId} - ${operation} - Hourly: ${hourlyCount[0].count}/${AI_RATE_LIMITS.perHour}, Daily: ${dailyCount[0].count}/${AI_RATE_LIMITS.perDay}`);
  } catch (error) {
    // If it's already a TRPCError (rate limit exceeded), re-throw it
    if (error instanceof TRPCError) {
      throw error;
    }

    // For other errors, log and allow the request (fail open)
    console.error('[AI Rate Limit] Error checking rate limit:', error);
    // Don't block the request on rate limit check failures
  }
}

/**
 * Cleanup old AI request logs (run as cron job)
 * Keeps last 30 days of logs
 */
export async function cleanupOldAILogs(): Promise<void> {
  try {
    const result = await query(
      `DELETE FROM ai_request_logs
       WHERE created_at < NOW() - INTERVAL '30 days'
       RETURNING id`
    );

    console.log(`[AI Rate Limit Cleanup] Deleted ${result.length} old AI request logs`);
  } catch (error) {
    console.error('[AI Rate Limit Cleanup] Error:', error);
  }
}
