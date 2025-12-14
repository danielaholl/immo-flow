/**
 * Batch Jobs: Recommendation System
 * Pre-calculates recommendations, similarities, and trending scores
 */
import cron from 'node-cron';
import { query } from '../db.js';
import { invalidatePattern } from '../cache/redis.js';

// Track if jobs are running to prevent overlap
let isRunningPreferences = false;
let isRunningSimilarities = false;
let isRunningTrending = false;
let isRunningRecommendations = false;

/**
 * Job 1: Calculate User Preferences (Every 30 minutes)
 * Extracts preferences from interaction history
 */
cron.schedule('*/30 * * * *', async () => {
  if (isRunningPreferences) {
    console.log('[CRON] Skipping user preferences calculation - already running');
    return;
  }

  isRunningPreferences = true;

  try {
    console.log('[CRON] Calculating user preferences...');
    const startTime = Date.now();

    // Get all users with interactions OR recent searches
    const users = await query<{ id: string }>(
      `SELECT DISTINCT user_id as id FROM (
        SELECT user_id FROM property_interactions
        UNION
        SELECT user_id FROM search_history
        WHERE last_searched_at > NOW() - INTERVAL '7 days'
      ) combined_users`
    );

    let updated = 0;
    for (const user of users) {
      try {
        await query('SELECT calculate_user_preferences($1)', [user.id]);
        updated++;
      } catch (error) {
        console.error(`[CRON] Failed to calculate preferences for user ${user.id}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[CRON] ✅ Updated preferences for ${updated}/${users.length} users in ${duration}ms`);
  } catch (error) {
    console.error('[CRON] ❌ User preferences calculation failed:', error);
  } finally {
    isRunningPreferences = false;
  }
});

/**
 * Job 2: Calculate Property Similarities (Daily at 3 AM)
 * Computes item-item collaborative filtering scores
 */
cron.schedule('0 3 * * *', async () => {
  if (isRunningSimilarities) {
    console.log('[CRON] Skipping property similarities calculation - already running');
    return;
  }

  isRunningSimilarities = true;

  try {
    console.log('[CRON] Calculating property similarities...');
    const startTime = Date.now();

    // Clear old similarities
    await query('TRUNCATE property_similarities');

    // Calculate Jaccard similarity for property pairs with min 3 common users
    const result = await query<{ count: string }>(
      `INSERT INTO property_similarities (property_a_id, property_b_id, similarity_score, common_users)
       SELECT
         LEAST(a.property_id, b.property_id) as property_a_id,
         GREATEST(a.property_id, b.property_id) as property_b_id,
         COUNT(DISTINCT a.user_id)::FLOAT /
           (SELECT COUNT(DISTINCT user_id) FROM property_interactions
            WHERE property_id IN (a.property_id, b.property_id)) as similarity_score,
         COUNT(DISTINCT a.user_id) as common_users
       FROM property_interactions a
       JOIN property_interactions b ON a.user_id = b.user_id
       WHERE a.property_id < b.property_id
         AND a.interaction_type IN ('favorite', 'share')
         AND b.interaction_type IN ('favorite', 'share')
       GROUP BY a.property_id, b.property_id
       HAVING COUNT(DISTINCT a.user_id) >= 3
       RETURNING 1`
    );

    const duration = Date.now() - startTime;
    console.log(`[CRON] ✅ Property similarities calculated: ${result.length} pairs in ${duration}ms`);
  } catch (error) {
    console.error('[CRON] ❌ Property similarities calculation failed:', error);
  } finally {
    isRunningSimilarities = false;
  }
});

/**
 * Job 3: Calculate Trending Scores (Every hour)
 * Updates trending scores based on recent interactions
 */
cron.schedule('0 * * * *', async () => {
  if (isRunningTrending) {
    console.log('[CRON] Skipping trending scores calculation - already running');
    return;
  }

  isRunningTrending = true;

  try {
    console.log('[CRON] Calculating trending scores...');
    const startTime = Date.now();

    const result = await query<{ count: string }>(
      `INSERT INTO property_trending (property_id, views_last_7d, favorites_last_7d, contacts_last_7d, shares_last_7d, trending_score)
       SELECT
         p.id,
         COALESCE(SUM(CASE WHEN pi.interaction_type = 'view' AND pi.created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END), 0) as views_last_7d,
         COALESCE(SUM(CASE WHEN pi.interaction_type = 'favorite' AND pi.created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END), 0) as favorites_last_7d,
         COALESCE(SUM(CASE WHEN pi.interaction_type = 'search_click' AND pi.created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END), 0) as contacts_last_7d,
         COALESCE(SUM(CASE WHEN pi.interaction_type = 'share' AND pi.created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END), 0) as shares_last_7d,
         (
           COALESCE(SUM(CASE WHEN pi.interaction_type = 'view' AND pi.created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END), 0) * 1 +
           COALESCE(SUM(CASE WHEN pi.interaction_type = 'favorite' AND pi.created_at > NOW() - INTERVAL '7 days' THEN 5 ELSE 0 END), 0) +
           COALESCE(SUM(CASE WHEN pi.interaction_type = 'search_click' AND pi.created_at > NOW() - INTERVAL '7 days' THEN 10 ELSE 0 END), 0) +
           COALESCE(SUM(CASE WHEN pi.interaction_type = 'share' AND pi.created_at > NOW() - INTERVAL '7 days' THEN 3 ELSE 0 END), 0)
         ) / GREATEST(EXTRACT(DAY FROM NOW() - p.created_at), 1) as trending_score
       FROM properties p
       LEFT JOIN property_interactions pi ON p.id = pi.property_id
       WHERE p.status = 'active'
       GROUP BY p.id
       ON CONFLICT (property_id) DO UPDATE SET
         views_last_7d = EXCLUDED.views_last_7d,
         favorites_last_7d = EXCLUDED.favorites_last_7d,
         contacts_last_7d = EXCLUDED.contacts_last_7d,
         shares_last_7d = EXCLUDED.shares_last_7d,
         trending_score = EXCLUDED.trending_score,
         calculated_at = CURRENT_TIMESTAMP
       RETURNING 1`
    );

    const duration = Date.now() - startTime;
    console.log(`[CRON] ✅ Trending scores updated: ${result.length} properties in ${duration}ms`);

    // Invalidate trending cache
    await invalidatePattern('trending');
  } catch (error) {
    console.error('[CRON] ❌ Trending scores calculation failed:', error);
  } finally {
    isRunningTrending = false;
  }
});

/**
 * Job 4: Pre-calculate Recommendations for Active Users (Every 30 minutes)
 * Generates and caches recommendations for users who had recent activity
 */
cron.schedule('*/30 * * * *', async () => {
  if (isRunningRecommendations) {
    console.log('[CRON] Skipping recommendations pre-calculation - already running');
    return;
  }

  isRunningRecommendations = true;

  try {
    console.log('[CRON] Pre-calculating recommendations...');
    const startTime = Date.now();

    // Get active users (had interaction in last 30 days)
    const activeUsers = await query<{ user_id: string }>(
      `SELECT DISTINCT user_id
       FROM property_interactions
       WHERE created_at > NOW() - INTERVAL '30 days'
       LIMIT 1000`
    );

    let processed = 0;
    for (const { user_id } of activeUsers) {
      try {
        await calculateAndCacheRecommendations(user_id);
        processed++;
      } catch (error) {
        console.error(`[CRON] Failed to calculate recommendations for user ${user_id}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[CRON] ✅ Pre-calculated recommendations for ${processed}/${activeUsers.length} users in ${duration}ms`);
  } catch (error) {
    console.error('[CRON] ❌ Recommendations pre-calculation failed:', error);
  } finally {
    isRunningRecommendations = false;
  }
});

/**
 * Job 5: Cleanup Old Cache Entries (Daily at 4 AM)
 * Removes stale cached recommendations
 */
cron.schedule('0 4 * * *', async () => {
  try {
    console.log('[CRON] Cleaning up old cache entries...');
    const startTime = Date.now();

    const result = await query<{ count: string }>(
      `DELETE FROM recommendations_cache
       WHERE created_at < NOW() - INTERVAL '7 days'
       RETURNING 1`
    );

    const duration = Date.now() - startTime;
    console.log(`[CRON] ✅ Cache cleanup complete: removed ${result.length} entries in ${duration}ms`);
  } catch (error) {
    console.error('[CRON] ❌ Cache cleanup failed:', error);
  }
});

/**
 * Helper: Calculate and cache recommendations for a single user
 */
async function calculateAndCacheRecommendations(userId: string): Promise<void> {
  // Import recommendation engine functions
  const { getPersonalizedFeed } = await import('../services/recommendation-engine.js');

  try {
    // Calculate top 100 recommendations
    const recommendations = await getPersonalizedFeed(userId, 1, 100);

    // Clear old cached recommendations for this user
    await query('DELETE FROM recommendations_cache WHERE user_id = $1', [userId]);

    // Insert new recommendations with scores (simplified - using order as score)
    for (let i = 0; i < recommendations.length; i++) {
      const property = recommendations[i];
      const score = 100 - i; // Higher score for earlier recommendations

      await query(
        `INSERT INTO recommendations_cache (user_id, property_id, final_score, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, property_id) DO UPDATE SET
           final_score = EXCLUDED.final_score,
           created_at = NOW()`,
        [userId, property.id, score]
      );
    }
  } catch (error) {
    throw new Error(`Failed to cache recommendations for user ${userId}: ${error}`);
  }
}

/**
 * Export function to start all cron jobs
 */
export function startRecommendationJobs() {
  console.log('🕐 [CRON] Recommendation jobs started:');
  console.log('   - User Preferences: Every 30 minutes');
  console.log('   - Property Similarities: Daily at 3 AM');
  console.log('   - Trending Scores: Every hour');
  console.log('   - Pre-calculate Recommendations: Every 30 minutes');
  console.log('   - Cache Cleanup: Daily at 4 AM');

  // Run initial preference calculation on startup (after 1 minute)
  setTimeout(async () => {
    console.log('[CRON] Running initial preference calculation...');
    if (!isRunningPreferences) {
      isRunningPreferences = true;
      try {
        const users = await query<{ id: string }>(
          'SELECT DISTINCT user_id as id FROM property_interactions LIMIT 100'
        );
        for (const user of users) {
          await query('SELECT calculate_user_preferences($1)', [user.id]);
        }
        console.log(`[CRON] ✅ Initial preferences calculated for ${users.length} users`);
      } catch (error) {
        console.error('[CRON] Initial preferences calculation failed:', error);
      } finally {
        isRunningPreferences = false;
      }
    }
  }, 60000);
}
