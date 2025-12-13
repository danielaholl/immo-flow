/**
 * AI Search Router
 * Handles natural language property search with AI-powered criteria extraction
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { query, queryOne } from '../db.js';
import OpenAI from 'openai';
import { getCached, setCached } from '../cache/redis.js';
import { feedCache } from '../cache/memory.js';

// Lazy OpenAI client initialization
let openai: OpenAI | null = null;
function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

// Schema for extracted search criteria
const SearchCriteriaSchema = z.object({
  location: z.string().nullish(),
  district: z.string().nullish(),
  minPrice: z.number().nullish(),
  maxPrice: z.number().nullish(),
  minSqm: z.number().nullish(),
  maxSqm: z.number().nullish(),
  rooms: z.number().nullish(),
  minRooms: z.number().nullish(),
  maxRooms: z.number().nullish(),
  propertyType: z.enum(['apartment', 'house', 'villa', 'commercial', 'land', 'office', 'retail', 'industrial', 'parking', 'multi_family']).nullish(),
  features: z.array(z.string()).nullish(),
  condition: z.enum(['new', 'first_occupancy', 'renovated', 'maintained', 'needs_renovation']).nullish(),
  confidence: z.number().min(0).max(1).default(0),
});

export type SearchCriteria = z.infer<typeof SearchCriteriaSchema>;

// System prompt for AI criteria extraction
const SEARCH_EXTRACTION_PROMPT = `Du bist ein spezialisierter Assistent für Immobiliensuchen in Deutschland.

Deine Aufgabe: Extrahiere strukturierte Suchkriterien aus der natürlichsprachigen Suchanfrage des Benutzers.

WICHTIGE REGELN:
1. EXTRAHIERE NUR EXPLIZIT GENANNTE KRITERIEN - erfinde KEINE Werte! Wenn etwas nicht genannt wird, setze es auf null.
2. Preise: Interpretiere "T" oder "Tausend" als 1000, z.B. "400T" = 400000, "1,5 Mio" = 1500000
3. Zimmer: "3 Zi" oder "3 Zimmer" = rooms: 3. WICHTIG: Nur wenn explizit genannt!
4. Wohnungstyp: "Wohnung" = apartment, "Haus" = house, "Villa" = villa, "Gewerbe" = commercial
5. Features: Erkenne typische Merkmale wie "Balkon", "Garage", "Garten", "Terrasse", "Aufzug", "Keller", "Einbauküche"
6. Zustand: "Neubau" = new, "Erstbezug" = first_occupancy, "renoviert" = renovated, "gepflegt" = maintained, "renovierungsbedürftig" = needs_renovation
7. Fläche: "80qm" oder "80m²" = sqm: 80
8. Preisspanne: "max 400T" = maxPrice, "ab 200T" oder "mind. 200T" = minPrice, "200-400T" = minPrice + maxPrice
9. Zimmerspanne: "2-3 Zimmer" = minRooms: 2, maxRooms: 3

AUSGABE: Gib NUR valide JSON zurück:
{
  "location": "Stadt oder null",
  "district": "Stadtteil oder null",
  "minPrice": number oder null,
  "maxPrice": number oder null,
  "minSqm": number oder null,
  "maxSqm": number oder null,
  "rooms": number oder null (exakte Zimmeranzahl),
  "minRooms": number oder null,
  "maxRooms": number oder null,
  "propertyType": "apartment|house|villa|commercial" oder null,
  "features": ["Feature1", "Feature2"] oder [],
  "condition": "new|first_occupancy|renovated|maintained|needs_renovation" oder null,
  "confidence": 0.0-1.0 (wie sicher du bei der Extraktion bist)
}

Beispiele:
- "3 Zi Wohnung München max 400T" → {"rooms": 3, "propertyType": "apartment", "location": "München", "maxPrice": 400000, "confidence": 0.95}
- "Haus mit Garten in Berlin 500-800T Euro" → {"propertyType": "house", "features": ["Garten"], "location": "Berlin", "minPrice": 500000, "maxPrice": 800000, "confidence": 0.92}
- "günstige Wohnung" → {"propertyType": "apartment", "confidence": 0.4}
- "suche wohnung bis 300000 euro" → {"propertyType": "apartment", "maxPrice": 300000, "confidence": 0.9} (KEINE rooms, da nicht genannt!)`;

/**
 * Extract search criteria from natural language using AI
 */
async function extractSearchCriteria(searchQuery: string): Promise<SearchCriteria> {
  const startTime = Date.now();

  try {
    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: SEARCH_EXTRACTION_PROMPT },
        { role: 'user', content: searchQuery },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Low temperature for consistent extraction
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from AI');
    }

    const parsed = JSON.parse(responseText);
    console.log(`[AI Search] Extracted criteria in ${Date.now() - startTime}ms:`, parsed);

    return SearchCriteriaSchema.parse(parsed);
  } catch (error) {
    console.error('[AI Search] AI extraction failed, using fallback:', error);
    // Fallback: simple text search on location
    return {
      location: searchQuery.trim(),
      confidence: 0.3,
      features: [],
    };
  }
}

/**
 * Build SQL query from search criteria
 */
function buildSearchQuery(criteria: SearchCriteria, limit: number, offset: number): { sql: string; values: any[] } {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  // Base conditions - only show active properties
  conditions.push(`status = 'active'`);

  // Location search (case-insensitive)
  if (criteria.location) {
    conditions.push(`(location ILIKE $${paramCount} OR address ILIKE $${paramCount})`);
    values.push(`%${criteria.location}%`);
    paramCount++;
  }

  // District search
  if (criteria.district) {
    conditions.push(`(location ILIKE $${paramCount} OR address ILIKE $${paramCount})`);
    values.push(`%${criteria.district}%`);
    paramCount++;
  }

  // Property type
  if (criteria.propertyType) {
    conditions.push(`property_type = $${paramCount}`);
    values.push(criteria.propertyType);
    paramCount++;
  }

  // Price range
  if (criteria.minPrice) {
    conditions.push(`price >= $${paramCount}`);
    values.push(criteria.minPrice);
    paramCount++;
  }
  if (criteria.maxPrice) {
    conditions.push(`price <= $${paramCount}`);
    values.push(criteria.maxPrice);
    paramCount++;
  }

  // Square meters range
  if (criteria.minSqm) {
    conditions.push(`sqm >= $${paramCount}`);
    values.push(criteria.minSqm);
    paramCount++;
  }
  if (criteria.maxSqm) {
    conditions.push(`sqm <= $${paramCount}`);
    values.push(criteria.maxSqm);
    paramCount++;
  }

  // Rooms (exact or range)
  if (criteria.rooms) {
    conditions.push(`rooms = $${paramCount}`);
    values.push(criteria.rooms);
    paramCount++;
  } else {
    if (criteria.minRooms) {
      conditions.push(`rooms >= $${paramCount}`);
      values.push(criteria.minRooms);
      paramCount++;
    }
    if (criteria.maxRooms) {
      conditions.push(`rooms <= $${paramCount}`);
      values.push(criteria.maxRooms);
      paramCount++;
    }
  }

  // Condition
  if (criteria.condition) {
    conditions.push(`condition = $${paramCount}`);
    values.push(criteria.condition);
    paramCount++;
  }

  // Features (check if any feature matches)
  if (criteria.features && criteria.features.length > 0) {
    // Use array overlap for features stored as JSONB array
    const featureConditions = criteria.features.map((feature) => {
      const param = `$${paramCount}`;
      values.push(`%${feature}%`);
      paramCount++;
      return `features::text ILIKE ${param}`;
    });
    conditions.push(`(${featureConditions.join(' OR ')})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      *,
      EXTRACT(DAY FROM (CURRENT_TIMESTAMP - created_at))::integer as days_online
    FROM properties
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramCount} OFFSET $${paramCount + 1}
  `;

  values.push(limit, offset);

  return { sql, values };
}

/**
 * Count total results for pagination
 */
function buildCountQuery(criteria: SearchCriteria): { sql: string; values: any[] } {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  conditions.push(`status = 'active'`);

  if (criteria.location) {
    conditions.push(`(location ILIKE $${paramCount} OR address ILIKE $${paramCount})`);
    values.push(`%${criteria.location}%`);
    paramCount++;
  }

  if (criteria.district) {
    conditions.push(`(location ILIKE $${paramCount} OR address ILIKE $${paramCount})`);
    values.push(`%${criteria.district}%`);
    paramCount++;
  }

  if (criteria.propertyType) {
    conditions.push(`property_type = $${paramCount}`);
    values.push(criteria.propertyType);
    paramCount++;
  }

  if (criteria.minPrice) {
    conditions.push(`price >= $${paramCount}`);
    values.push(criteria.minPrice);
    paramCount++;
  }
  if (criteria.maxPrice) {
    conditions.push(`price <= $${paramCount}`);
    values.push(criteria.maxPrice);
    paramCount++;
  }

  if (criteria.minSqm) {
    conditions.push(`sqm >= $${paramCount}`);
    values.push(criteria.minSqm);
    paramCount++;
  }
  if (criteria.maxSqm) {
    conditions.push(`sqm <= $${paramCount}`);
    values.push(criteria.maxSqm);
    paramCount++;
  }

  if (criteria.rooms) {
    conditions.push(`rooms = $${paramCount}`);
    values.push(criteria.rooms);
    paramCount++;
  } else {
    if (criteria.minRooms) {
      conditions.push(`rooms >= $${paramCount}`);
      values.push(criteria.minRooms);
      paramCount++;
    }
    if (criteria.maxRooms) {
      conditions.push(`rooms <= $${paramCount}`);
      values.push(criteria.maxRooms);
      paramCount++;
    }
  }

  if (criteria.condition) {
    conditions.push(`condition = $${paramCount}`);
    values.push(criteria.condition);
    paramCount++;
  }

  if (criteria.features && criteria.features.length > 0) {
    const featureConditions = criteria.features.map((feature) => {
      const param = `$${paramCount}`;
      values.push(`%${feature}%`);
      paramCount++;
      return `features::text ILIKE ${param}`;
    });
    conditions.push(`(${featureConditions.join(' OR ')})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return {
    sql: `SELECT COUNT(*) as total FROM properties ${whereClause}`,
    values,
  };
}

/**
 * Update user preferences based on search criteria
 */
async function updateUserPreferencesFromSearch(userId: string, criteria: SearchCriteria): Promise<void> {
  try {
    // Get current preferences
    const existing = await queryOne(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );

    if (existing) {
      // Parse existing data
      const preferredLocations = typeof existing.preferred_locations === 'string'
        ? JSON.parse(existing.preferred_locations)
        : existing.preferred_locations || [];
      const priceRange = typeof existing.price_range === 'string'
        ? JSON.parse(existing.price_range)
        : existing.price_range || {};
      const preferredRooms = typeof existing.preferred_rooms === 'string'
        ? JSON.parse(existing.preferred_rooms)
        : existing.preferred_rooms || [];
      const preferredFeatures = typeof existing.preferred_features === 'string'
        ? JSON.parse(existing.preferred_features)
        : existing.preferred_features || [];

      // Add new location if not already present
      if (criteria.location && !preferredLocations.includes(criteria.location)) {
        preferredLocations.push(criteria.location);
        // Keep only last 10 locations
        if (preferredLocations.length > 10) preferredLocations.shift();
      }

      // Update price range
      if (criteria.minPrice || criteria.maxPrice) {
        priceRange.min = criteria.minPrice || priceRange.min;
        priceRange.max = criteria.maxPrice || priceRange.max;
      }

      // Add rooms preference
      if (criteria.rooms && !preferredRooms.includes(criteria.rooms)) {
        preferredRooms.push(criteria.rooms);
        if (preferredRooms.length > 5) preferredRooms.shift();
      }

      // Add features
      if (criteria.features) {
        for (const feature of criteria.features) {
          if (!preferredFeatures.includes(feature)) {
            preferredFeatures.push(feature);
            if (preferredFeatures.length > 20) preferredFeatures.shift();
          }
        }
      }

      // Update preferences
      await query(
        `UPDATE user_preferences
         SET preferred_locations = $1,
             price_range = $2,
             preferred_rooms = $3,
             preferred_features = $4,
             interaction_count = interaction_count + 1,
             last_updated = NOW()
         WHERE user_id = $5`,
        [
          JSON.stringify(preferredLocations),
          JSON.stringify(priceRange),
          JSON.stringify(preferredRooms),
          JSON.stringify(preferredFeatures),
          userId,
        ]
      );
    } else {
      // Create new preferences
      await query(
        `INSERT INTO user_preferences (user_id, preferred_locations, price_range, preferred_rooms, preferred_features, interaction_count)
         VALUES ($1, $2, $3, $4, $5, 1)`,
        [
          userId,
          JSON.stringify(criteria.location ? [criteria.location] : []),
          JSON.stringify({ min: criteria.minPrice, max: criteria.maxPrice }),
          JSON.stringify(criteria.rooms ? [criteria.rooms] : []),
          JSON.stringify(criteria.features || []),
        ]
      );
    }

    console.log(`[AI Search] Updated preferences for user ${userId}`);
  } catch (error) {
    // Don't throw - preference update is not critical
    console.error('[AI Search] Failed to update user preferences:', error);
  }
}

/**
 * Save search to history
 */
async function saveSearchHistory(
  userId: string,
  searchQuery: string,
  criteria: SearchCriteria,
  resultsCount: number
): Promise<void> {
  try {
    // Check if this exact query already exists
    const existing = await queryOne(
      'SELECT * FROM search_history WHERE user_id = $1 AND query = $2',
      [userId, searchQuery]
    );

    if (existing) {
      await query(
        `UPDATE search_history
         SET last_searched_at = NOW(),
             results_count = $1,
             criteria = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [resultsCount, JSON.stringify(criteria), existing.id]
      );
    } else {
      await query(
        `INSERT INTO search_history (user_id, query, criteria, results_count, last_searched_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, searchQuery, JSON.stringify(criteria), resultsCount]
      );
    }

    console.log(`[AI Search] Saved search history for user ${userId}`);
  } catch (error) {
    console.error('[AI Search] Failed to save search history:', error);
  }
}

// Cache key generator
function getCacheKey(searchQuery: string): string {
  return `search:${searchQuery.toLowerCase().trim().replace(/\s+/g, '_')}`;
}

export const aiSearchRouter = router({
  /**
   * Main search endpoint with AI-powered criteria extraction
   */
  search: publicProcedure
    .input(
      z.object({
        query: z.string().trim().min(1).max(500),
        limit: z.number().positive().int().max(100).default(20),
        offset: z.number().nonnegative().int().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();
      const { query: searchQuery, limit, offset } = input;
      const cacheKey = getCacheKey(searchQuery);

      // Check L1 cache (memory)
      let criteria: SearchCriteria | null = feedCache.get<SearchCriteria>(cacheKey);

      if (!criteria) {
        // Check L2 cache (Redis)
        const cachedCriteria = await getCached<SearchCriteria>(cacheKey);
        if (cachedCriteria) {
          criteria = cachedCriteria;
          // Warm L1 cache
          feedCache.set(cacheKey, criteria, 120000); // 2 min L1 TTL (ms)
        }
      }

      let aiUsed = false;
      if (!criteria) {
        // Extract criteria using AI
        criteria = await extractSearchCriteria(searchQuery);
        aiUsed = true;

        // Cache the criteria
        feedCache.set(cacheKey, criteria, 120000); // 2 min (ms)
        await setCached(cacheKey, criteria, 300); // 5 min (seconds)
      }

      // Debug: Log extracted criteria
      console.log('[AI Search] Query:', searchQuery);
      console.log('[AI Search] Extracted criteria:', JSON.stringify(criteria, null, 2));

      // Build and execute search query
      const { sql, values } = buildSearchQuery(criteria, limit, offset);
      console.log('[AI Search] SQL:', sql);
      console.log('[AI Search] Values:', values);

      const properties = await query(sql, values);
      console.log('[AI Search] Found properties:', properties.length);

      // Get total count
      const { sql: countSql, values: countValues } = buildCountQuery(criteria);
      const countResult = await queryOne(countSql, countValues);
      const total = parseInt(countResult?.total || '0', 10);
      console.log('[AI Search] Total count:', total);

      // If user is authenticated, save history and update preferences
      if (ctx.user) {
        // Run in background (don't await)
        Promise.all([
          saveSearchHistory(ctx.user.id, searchQuery, criteria, total),
          updateUserPreferencesFromSearch(ctx.user.id, criteria),
        ]).catch(err => console.error('[AI Search] Background tasks failed:', err));
      }

      const processingTime = Date.now() - startTime;
      console.log(`[AI Search] Query "${searchQuery}" returned ${total} results in ${processingTime}ms (AI: ${aiUsed})`);

      return {
        query: searchQuery,
        criteria,
        properties,
        total,
        limit,
        offset,
        aiUsed,
        processingTime,
      };
    }),

  /**
   * Search with pre-defined criteria (for repeat searches)
   */
  searchByCriteria: publicProcedure
    .input(
      z.object({
        criteria: SearchCriteriaSchema,
        limit: z.number().positive().int().max(100).default(20),
        offset: z.number().nonnegative().int().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const { criteria, limit, offset } = input;
      const startTime = Date.now();

      // Build and execute search query
      const { sql, values } = buildSearchQuery(criteria, limit, offset);
      const properties = await query(sql, values);

      // Get total count
      const { sql: countSql, values: countValues } = buildCountQuery(criteria);
      const countResult = await queryOne(countSql, countValues);
      const total = parseInt(countResult?.total || '0', 10);

      const processingTime = Date.now() - startTime;

      return {
        criteria,
        properties,
        total,
        limit,
        offset,
        processingTime,
      };
    }),

  /**
   * Get search suggestions based on partial input
   */
  getSuggestions: publicProcedure
    .input(z.object({ partialQuery: z.string().trim().min(2).max(100) }))
    .query(async ({ input }) => {
      const { partialQuery } = input;

      // Get locations that match the partial query
      const locations = await query(
        `SELECT DISTINCT location
         FROM properties
         WHERE status = 'active' AND location ILIKE $1
         LIMIT 5`,
        [`%${partialQuery}%`]
      );

      // Get recent popular searches (anonymized)
      const popularSearches = await query(
        `SELECT query, COUNT(*) as count
         FROM search_history
         WHERE query ILIKE $1
         GROUP BY query
         ORDER BY count DESC
         LIMIT 5`,
        [`%${partialQuery}%`]
      );

      return {
        locations: locations.map((l: any) => l.location),
        popularSearches: popularSearches.map((s: any) => s.query),
      };
    }),
});
