/**
 * Properties Router
 * All property-related tRPC procedures
 */
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { query, queryOne } from '../db.js';
import { deleteCached, invalidatePattern } from '../cache/redis.js';
import { feedCache, trendingCache } from '../cache/memory.js';
import {
  buildPropertyQuery,
  PROPERTY_BASE_FIELDS,
  STATISTICS_EXTENDED,
  JOIN_STATISTICS,
} from '../lib/propertyQueryBuilder.js';
import {
  getMarketDataByPLZ,
  estimateMarketDataForPLZ,
  updateMarketDataInDB,
} from '../services/plz-market-estimator.js';

// AfA details by type
const AFA_DETAILS = {
  bestand: { rate: 0.02, buildingRatio: 0.80 },
  altbau: { rate: 0.025, buildingRatio: 0.80 },
  neubau: { rate: 0.05, buildingRatio: 0.85 },
  denkmal: { rate: 0.09, buildingRatio: 0.35 },
} as const;

// Helper to calculate afa_type based on year_built
function calculateAfaType(yearBuilt: number | null | undefined, explicitAfaType?: string | null): string {
  // Denkmal only if explicitly set (never override)
  if (explicitAfaType === 'denkmal') return 'denkmal';

  // Calculate from year_built
  if (!yearBuilt) return 'bestand';
  if (yearBuilt < 1925) return 'altbau';
  if (yearBuilt >= 2024) return 'neubau';
  return 'bestand';
}

// Helper to get full AfA details (type, rate, buildingRatio)
function getAfaDetails(yearBuilt: number | null | undefined, explicitAfaType?: string | null) {
  const afaType = calculateAfaType(yearBuilt, explicitAfaType) as keyof typeof AFA_DETAILS;
  return {
    afaType,
    afaRate: AFA_DETAILS[afaType].rate,
    buildingRatio: AFA_DETAILS[afaType].buildingRatio,
  };
}

// Helper to invalidate feed caches when properties change
async function invalidateFeedCaches(): Promise<void> {
  try {
    // Clear L1 (in-memory) caches
    feedCache.clear();
    trendingCache.clear();
    // Invalidate L2 (Redis) trending cache
    await deleteCached('trending');
    // Invalidate all personalized feed caches in Redis
    await invalidatePattern('feed:*');
    console.log('🗑️  Feed caches invalidated (L1 + L2)');
  } catch (error) {
    console.warn('Failed to invalidate feed caches:', error);
  }
}

export const propertiesRouter = router({
  // Get all properties with filters
  getAll: publicProcedure
    .input(
      z
        .object({
          location: z.string().trim().max(200).optional(),
          minPrice: z.number().nonnegative().max(1000000000).optional(),
          maxPrice: z.number().nonnegative().max(1000000000).optional(),
          minSqm: z.number().positive().max(100000).optional(),
          maxSqm: z.number().positive().max(100000).optional(),
          rooms: z.number().positive().int().max(50).optional(),
          status: z.enum(['active', 'pending', 'archived', 'sold', 'inactive']).optional(),
          limit: z.number().positive().int().max(100).default(20),
          offset: z.number().nonnegative().int().default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Build WHERE conditions
      conditions.push(`status = $${paramCount}`);
      values.push(input?.status || 'active');
      paramCount++;

      // Only show external properties if they are shared with community
      conditions.push(`(is_external = false OR is_external IS NULL OR is_community_shared = true)`);
      paramCount; // No param needed for this condition

      if (input?.location) {
        conditions.push(`location ILIKE $${paramCount}`);
        values.push(`%${input.location}%`);
        paramCount++;
      }

      if (input?.minPrice !== undefined) {
        conditions.push(`price >= $${paramCount}`);
        values.push(input.minPrice);
        paramCount++;
      }

      if (input?.maxPrice !== undefined) {
        conditions.push(`price <= $${paramCount}`);
        values.push(input.maxPrice);
        paramCount++;
      }

      if (input?.minSqm !== undefined) {
        conditions.push(`sqm >= $${paramCount}`);
        values.push(input.minSqm);
        paramCount++;
      }

      if (input?.maxSqm !== undefined) {
        conditions.push(`sqm <= $${paramCount}`);
        values.push(input.maxSqm);
        paramCount++;
      }

      if (input?.rooms !== undefined) {
        conditions.push(`rooms = $${paramCount}`);
        values.push(input.rooms);
        paramCount++;
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

      values.push(input?.limit ?? 20, input?.offset ?? 0);

      const properties = await query(sql, values);
      return properties;
    }),

  // Get documents for a property (lazy loaded)
  getDocuments: publicProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ input }) => {
      const result = await queryOne(
        `SELECT documents FROM properties WHERE id = $1`,
        [input.propertyId]
      );

      if (!result) {
        return [];
      }

      return result.documents || [];
    }),

  // Get property by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const property = await queryOne(
        `SELECT
          *,
          NULLIF(CONCAT_WS(', ', street_address, CONCAT_WS(' ', postal_code, location)), '') as full_address,
          EXTRACT(DAY FROM (CURRENT_TIMESTAMP - created_at))::integer as days_online
        FROM properties
        WHERE id = $1`,
        [input.id]
      );

      if (!property) {
        throw new Error('Property not found');
      }

      return property;
    }),

  // Get market comparison data for a property
  getMarketComparison: publicProcedure
    .input(z.object({
      propertyId: z.string().uuid().optional(),
      // For preview mode (before property is saved)
      price: z.number().positive().optional(),
      sqm: z.number().positive().optional(),
      location: z.string().optional(),
      propertyType: z.enum(['apartment', 'house', 'villa', 'commercial', 'land', 'office', 'retail', 'industrial', 'parking', 'multi_family']).optional(),
    }))
    .query(async ({ input }) => {
      let propertyPrice: number;
      let propertySqm: number;
      let propertyLocation: string;
      let propertyType: string | null = null;

      // Get property data either from ID or from direct input
      if (input.propertyId) {
        const property = await queryOne(
          'SELECT price, sqm, location, property_type FROM properties WHERE id = $1',
          [input.propertyId]
        );
        if (!property) {
          throw new Error('Immobilie nicht gefunden');
        }
        propertyPrice = property.price;
        propertySqm = property.sqm;
        propertyLocation = property.location;
        propertyType = property.property_type;
      } else if (input.price && input.sqm && input.location) {
        propertyPrice = input.price;
        propertySqm = input.sqm;
        propertyLocation = input.location;
        propertyType = input.propertyType || null;
      } else {
        throw new Error('Preis, Fläche und Standort sind erforderlich');
      }

      const pricePerSqm = Math.round(propertyPrice / propertySqm);

      // Extrahiere PLZ (5 Ziffern) oder Stadt aus Location
      const plzMatch = propertyLocation.match(/\b(\d{5})\b/);
      const extractedPLZ = plzMatch ? plzMatch[1] : null;
      const cityName = propertyLocation.split(',')[0].trim();

      // 0. PLZ-Marktdaten (PRIMÄRE QUELLE)
      let plzMarketData = null;
      if (extractedPLZ) {
        plzMarketData = await getMarketDataByPLZ(extractedPLZ);
      }
      // Fallback: Nach Stadt suchen wenn keine PLZ gefunden oder keine Daten
      if (!plzMarketData && cityName) {
        const cityResult = await queryOne(
          `SELECT plz, city, avg_purchase_price_sqm, purchase_price_min, purchase_price_max,
                  avg_rent_sqm, rent_min, rent_max, confidence_score, federal_state
           FROM plz_market_data
           WHERE city ILIKE $1
           ORDER BY confidence_score DESC NULLS LAST
           LIMIT 1`,
          [`%${cityName}%`]
        );
        plzMarketData = cityResult;
      }

      // 1. Get historical sold data from our platform (last 6 months)
      const historicalData = await query(
        `SELECT
          AVG(CASE
            WHEN sold_price IS NOT NULL THEN sold_price::decimal / sqm
            ELSE price::decimal / sqm
          END) as avg_price_per_sqm,
          COUNT(*) as sample_count,
          MIN(CASE
            WHEN sold_price IS NOT NULL THEN sold_price::decimal / sqm
            ELSE price::decimal / sqm
          END) as min_price_per_sqm,
          MAX(CASE
            WHEN sold_price IS NOT NULL THEN sold_price::decimal / sqm
            ELSE price::decimal / sqm
          END) as max_price_per_sqm
        FROM properties
        WHERE location ILIKE $1
          AND status = 'sold'
          AND deleted_at IS NULL
          AND sqm > 0
          AND (sold_at >= NOW() - INTERVAL '6 months' OR created_at >= NOW() - INTERVAL '6 months')
          ${propertyType ? 'AND property_type = $2' : ''}`,
        propertyType ? [`%${propertyLocation}%`, propertyType] : [`%${propertyLocation}%`]
      );

      // 2. Get AI evaluation data if available (for this property)
      let aiMarketData = null;
      let aiScore: number | null = null;
      if (input.propertyId) {
        // Get market average from AI evaluations
        aiMarketData = await queryOne(
          `SELECT market_average_price_per_sqm
           FROM property_ai_evaluations
           WHERE property_id = $1
           ORDER BY created_at DESC
           LIMIT 1`,
          [input.propertyId]
        );
        // Get AI score from the property itself
        const propertyScore = await queryOne(
          `SELECT ai_investment_score FROM properties WHERE id = $1`,
          [input.propertyId]
        );
        if (propertyScore?.ai_investment_score) {
          aiScore = Number(propertyScore.ai_investment_score);
        }
      }

      // 3. Get average rent per sqm for the location
      const rentData = await query(
        `SELECT
          AVG(monthly_rent::decimal / sqm) as avg_rent_per_sqm,
          COUNT(*) as rent_sample_count
        FROM properties
        WHERE location ILIKE $1
          AND monthly_rent IS NOT NULL
          AND monthly_rent > 0
          AND sqm > 0
          AND deleted_at IS NULL
          ${propertyType ? 'AND property_type = $2' : ''}`,
        propertyType ? [`%${propertyLocation}%`, propertyType] : [`%${propertyLocation}%`]
      );
      const avgRentPerSqm = rentData[0]?.avg_rent_per_sqm ? Math.round(Number(rentData[0].avg_rent_per_sqm) * 100) / 100 : null;
      const estimatedMonthlyRent = avgRentPerSqm ? Math.round(avgRentPerSqm * propertySqm) : null;

      // 4. Get marketing duration from sold properties
      // Calculate days_online as the difference between sold_at and created_at
      const marketingData = await query(
        `SELECT
          AVG(EXTRACT(DAY FROM (COALESCE(sold_at, NOW()) - created_at))::integer) as avg_days,
          MIN(EXTRACT(DAY FROM (COALESCE(sold_at, NOW()) - created_at))::integer) as min_days,
          MAX(EXTRACT(DAY FROM (COALESCE(sold_at, NOW()) - created_at))::integer) as max_days,
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (COALESCE(sold_at, NOW()) - created_at))::integer) as p25_days,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (COALESCE(sold_at, NOW()) - created_at))::integer) as p75_days,
          COUNT(*) as marketing_sample_count
        FROM properties
        WHERE location ILIKE $1
          AND status = 'sold'
          AND deleted_at IS NULL
          AND EXTRACT(DAY FROM (COALESCE(sold_at, NOW()) - created_at))::integer > 0
          AND (sold_at >= NOW() - INTERVAL '12 months' OR created_at >= NOW() - INTERVAL '12 months')
          ${propertyType ? 'AND property_type = $2' : ''}`,
        propertyType ? [`%${propertyLocation}%`, propertyType] : [`%${propertyLocation}%`]
      );

      // Calculate marketing duration in weeks (use p25-p75 for realistic range)
      let marketingDurationMin = 4;  // Default: 4 weeks
      let marketingDurationMax = 12; // Default: 12 weeks
      if (marketingData[0]?.p25_days && marketingData[0]?.p75_days) {
        marketingDurationMin = Math.max(1, Math.round(Number(marketingData[0].p25_days) / 7));
        marketingDurationMax = Math.max(marketingDurationMin + 1, Math.round(Number(marketingData[0].p75_days) / 7));
      }

      // 5. Combine data sources for price - NEUE PRIORITÄT: PLZ-Tabelle zuerst
      const platformAvg = historicalData[0]?.avg_price_per_sqm ? Number(historicalData[0].avg_price_per_sqm) : null;
      const aiAvg = aiMarketData?.market_average_price_per_sqm ? Number(aiMarketData.market_average_price_per_sqm) : null;
      const sampleCount = Number(historicalData[0]?.sample_count || 0);

      let marketAvgPricePerSqm: number;
      let dataSource: 'plz_data' | 'platform' | 'ai' | 'combined' | 'estimated';
      let minPriceFromSource: number | null = null;
      let maxPriceFromSource: number | null = null;

      // Priorität 1: PLZ-Tabelle (primäre Quelle)
      if (plzMarketData?.avg_purchase_price_sqm && Number(plzMarketData.confidence_score || 0) >= 0.5) {
        marketAvgPricePerSqm = Math.round(Number(plzMarketData.avg_purchase_price_sqm));
        minPriceFromSource = plzMarketData.purchase_price_min ? Number(plzMarketData.purchase_price_min) : null;
        maxPriceFromSource = plzMarketData.purchase_price_max ? Number(plzMarketData.purchase_price_max) : null;
        dataSource = 'plz_data';
      }
      // Priorität 2: Claude Haiku schätzen (falls PLZ bekannt aber keine/unzuverlässige Preise)
      else if (extractedPLZ || cityName) {
        try {
          const plzForEstimate = extractedPLZ || (plzMarketData?.plz as string);
          const federalState = (plzMarketData?.federal_state as string) || 'Deutschland';

          if (plzForEstimate) {
            const estimate = await estimateMarketDataForPLZ(
              plzForEstimate,
              cityName,
              federalState
            );
            // In DB speichern für nächste Anfragen
            await updateMarketDataInDB([estimate]);

            marketAvgPricePerSqm = Math.round(estimate.avg_purchase_price_sqm);
            minPriceFromSource = estimate.purchase_price_min;
            maxPriceFromSource = estimate.purchase_price_max;
            dataSource = 'ai';
          } else {
            // Kein PLZ verfügbar - Fallback
            marketAvgPricePerSqm = platformAvg || aiAvg || 3500;
            dataSource = platformAvg ? 'platform' : (aiAvg ? 'ai' : 'estimated');
          }
        } catch (error) {
          console.error('AI estimation failed:', error);
          // Fallback zu alter Logik
          marketAvgPricePerSqm = platformAvg || aiAvg || 3500;
          dataSource = platformAvg ? 'platform' : (aiAvg ? 'ai' : 'estimated');
        }
      }
      // Priorität 3: Fallback (alte Logik)
      else {
        if (platformAvg && sampleCount >= 3) {
          marketAvgPricePerSqm = Math.round(platformAvg);
          dataSource = 'platform';
        } else if (aiAvg) {
          marketAvgPricePerSqm = Math.round(aiAvg);
          dataSource = 'ai';
        } else {
          marketAvgPricePerSqm = 3500;
          dataSource = 'estimated';
        }
      }

      // Calculate deviation percentage
      const deviationPercent = Math.round(((pricePerSqm - marketAvgPricePerSqm) / marketAvgPricePerSqm) * 100);

      // Determine price position label
      let pricePosition: 'sehr_guenstig' | 'guenstig' | 'marktgerecht' | 'teuer' | 'sehr_teuer';
      if (deviationPercent <= -15) {
        pricePosition = 'sehr_guenstig';
      } else if (deviationPercent <= -5) {
        pricePosition = 'guenstig';
      } else if (deviationPercent <= 5) {
        pricePosition = 'marktgerecht';
      } else if (deviationPercent <= 15) {
        pricePosition = 'teuer';
      } else {
        pricePosition = 'sehr_teuer';
      }

      // Calculate suggested price range (±10% from market)
      const suggestedMinPrice = Math.round(marketAvgPricePerSqm * propertySqm * 0.9);
      const suggestedMaxPrice = Math.round(marketAvgPricePerSqm * propertySqm * 1.1);

      return {
        // Current property data
        currentPrice: propertyPrice,
        currentPricePerSqm: pricePerSqm,

        // Market data
        marketAvgPricePerSqm,
        marketAvgPrice: Math.round(marketAvgPricePerSqm * propertySqm),
        minPricePerSqm: minPriceFromSource ? Math.round(minPriceFromSource) : (historicalData[0]?.min_price_per_sqm ? Math.round(Number(historicalData[0].min_price_per_sqm)) : null),
        maxPricePerSqm: maxPriceFromSource ? Math.round(maxPriceFromSource) : (historicalData[0]?.max_price_per_sqm ? Math.round(Number(historicalData[0].max_price_per_sqm)) : null),

        // Comparison
        deviationPercent,
        pricePosition,

        // Suggestions
        suggestedMinPrice,
        suggestedMaxPrice,
        suggestedOptimalPrice: Math.round(marketAvgPricePerSqm * propertySqm),

        // Data quality
        dataSource,
        sampleCount,
        location: propertyLocation,

        // Rental data
        avgRentPerSqm,
        estimatedMonthlyRent,

        // Marketing duration (in weeks)
        marketingDurationMin,
        marketingDurationMax,

        // AI-Score (0-100)
        aiScore,
      };
    }),

  // Get property with owner
  getByIdWithOwner: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const property = await queryOne(
        buildPropertyQuery({
          includeOwner: true,
          includeStats: 'base',
          whereClause: 'p.id = $1',
        }),
        [input.id]
      );

      if (!property) {
        throw new Error('Property not found');
      }

      return property;
    }),

  // Get properties by user ID
  getByUserId: protectedProcedure
    .query(async ({ ctx }) => {
      // Get properties for the authenticated user with extended statistics
      const properties = await query(
        buildPropertyQuery({
          includeOwner: false,
          includeStats: 'extended',
          whereClause: 'p.user_id = $1',
          orderBy: 'p.created_at DESC',
        }),
        [ctx.user.id]
      );

      return properties;
    }),

  // Create property
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
        description: z.string().trim().max(5000).optional(),
        price: z.number().positive().max(1000000000, 'Price too high'),
        location: z.string().trim().min(2).max(200),
        sqm: z.number().positive().max(100000, 'Square meters value too high'),
        rooms: z.number().positive().int().max(50, 'Too many rooms'),
        images: z.array(z.string()).max(50).optional(),
        video_url: z.string().url().max(2000).optional().nullable(),
        documents: z.array(z.object({
          id: z.string().uuid(),
          url: z.string().url(),
          thumbnailUrl: z.string().url().nullable().optional(),
          filename: z.string().max(255),
          category: z.enum(['grundriss', 'energieausweis', 'expose', 'sonstiges', 'lageplan', 'mietvertrag', 'etw_protokoll', 'kaufvertrag', 'grundbuchauszug']),
          visibility: z.enum(['public', 'auto_approved', 'manual_approval']).default('public'),
          mimetype: z.string().max(100),
          size: z.number().nonnegative(),
          uploadedAt: z.string(),
        })).max(20).optional(),
        features: z.array(z.string().trim().max(100)).max(100).optional(),
        highlights: z.array(z.string().trim().max(100)).max(100).optional(),
        red_flags: z.array(z.string().trim().max(100)).max(100).optional(),
        status: z.enum(['active', 'pending', 'archived', 'sold', 'inactive']).default('inactive'),
        commission_rate: z.number().nonnegative().max(100).optional(),
        require_address_consent: z.boolean().optional(),
        // New fields added
        property_type: z.enum(['apartment', 'house', 'villa', 'commercial', 'land', 'office', 'retail', 'industrial', 'parking', 'multi_family']).optional(),
        postal_code: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : val).optional(),
        street_address: z.string().trim().max(500).optional(),
        year_built: z.number().int().min(1800).max(new Date().getFullYear() + 5).optional(),
        floor_level: z.string().trim().max(20).optional(),
        total_floors: z.number().int().positive().max(200).optional(),
        bathrooms: z.number().int().nonnegative().max(50).optional(),
        usable_area: z.number().int().nonnegative().max(100000).optional(),
        usable_area_ratio: z.string().trim().max(20).optional(),
        monthly_fee: z.number().int().nonnegative().max(100000).optional(),
        condition: z.enum(['new', 'first_occupancy', 'renovated', 'maintained', 'needs_renovation']).optional(),
        heating_type: z.enum(['central', 'floor', 'gas', 'oil', 'district', 'electric', 'solar', 'heat_pump', 'other']).optional(),
        energy_source: z.enum(['gas', 'oil', 'electricity', 'district_heating', 'solar', 'geothermal', 'biomass', 'other']).optional(),
        energy_certificate: z.enum(['demand', 'consumption', 'none']).optional(),
        energy_efficiency_class: z.enum(['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']).optional(),
        available_from: z.string().trim().max(50).optional(),
        important_notes: z.string().trim().max(2000).optional(),
        is_external: z.boolean().optional(),
        monthly_rent: z.number().int().nonnegative().max(1000000).optional(),
        afa_type: z.enum(['bestand', 'altbau', 'neubau', 'denkmal']).optional().default('bestand'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Calculate AfA details based on year_built and afa_type
      const afaDetails = getAfaDetails(input.year_built, input.afa_type);

      const property = await queryOne(
        `INSERT INTO properties (
          user_id, title, description, price, location,
          sqm, rooms, images, video_url, documents, features, highlights, red_flags, status, commission_rate,
          require_address_consent, property_type, postal_code, street_address,
          year_built, floor_level, total_floors, bathrooms, usable_area,
          usable_area_ratio, monthly_fee, condition, heating_type,
          energy_source, energy_certificate, energy_efficiency_class,
          available_from, important_notes, is_external, monthly_rent, afa_type, afa_rate, building_ratio
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38)
        RETURNING *`,
        [
          ctx.user.id,
          input.title,
          input.description,
          input.price,
          input.location,
          input.sqm,
          input.rooms,
          input.images || [],
          input.video_url || null,
          JSON.stringify(input.documents || []),
          input.features || [],
          input.highlights || [],
          input.red_flags || [],
          input.status,
          input.commission_rate,
          input.require_address_consent,
          input.property_type,
          input.postal_code,
          input.street_address,
          input.year_built,
          input.floor_level,
          input.total_floors,
          input.bathrooms,
          input.usable_area,
          input.usable_area_ratio,
          input.monthly_fee,
          input.condition,
          input.heating_type,
          input.energy_source,
          input.energy_certificate,
          input.energy_efficiency_class,
          input.available_from,
          input.important_notes,
          input.is_external || false,
          input.monthly_rent,
          afaDetails.afaType,
          afaDetails.afaRate,
          afaDetails.buildingRatio,
        ]
      );

      // Invalidate feed caches when a new active property is created
      if (input.status === 'active') {
        await invalidateFeedCaches();
      }

      return property;
    }),

  // Update property
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().trim().min(3).max(200).optional(),
        description: z.string().trim().max(5000).optional(),
        price: z.number().positive().max(1000000000).optional(),
        location: z.string().trim().min(2).max(200).optional(),
        sqm: z.number().positive().max(100000).optional(),
        rooms: z.number().positive().int().max(50).optional(),
        images: z.array(z.string()).max(50).optional(),
        video_url: z.string().url().max(1000).nullish(),
        documents: z.array(z.object({
          id: z.string().uuid(),
          url: z.string().url(),
          thumbnailUrl: z.string().url().nullable().optional(),
          filename: z.string().max(255),
          category: z.enum(['grundriss', 'energieausweis', 'expose', 'sonstiges', 'lageplan', 'mietvertrag', 'etw_protokoll', 'kaufvertrag', 'grundbuchauszug']),
          visibility: z.enum(['public', 'auto_approved', 'manual_approval']).default('public'),
          mimetype: z.string().max(100),
          size: z.number().nonnegative(),
          uploadedAt: z.string(),
        })).max(20).nullish(),
        features: z.array(z.string().trim().max(100)).max(100).optional(),
        highlights: z.array(z.string().trim().max(100)).max(100).optional(),
        red_flags: z.array(z.string().trim().max(100)).max(100).optional(),
        status: z.enum(['active', 'pending', 'archived', 'sold', 'inactive']).nullish(),
        commission_rate: z.number().nonnegative().max(100).nullish(),
        require_address_consent: z.boolean().nullish(),
        // New fields added - using nullish() to accept both null and undefined
        property_type: z.enum(['apartment', 'house', 'villa', 'commercial', 'land', 'office', 'retail', 'industrial', 'parking', 'multi_family']).nullish(),
        postal_code: z.union([z.string(), z.number()]).transform(val => val != null ? String(val) : val).nullish(),
        street_address: z.string().trim().max(500).nullish(),
        year_built: z.number().int().min(1800).max(new Date().getFullYear() + 5).nullish(),
        floor_level: z.string().trim().max(20).nullish(),
        total_floors: z.number().int().positive().max(200).nullish(),
        bathrooms: z.number().int().nonnegative().max(50).nullish(),
        usable_area: z.number().int().nonnegative().max(100000).nullish(),
        usable_area_ratio: z.string().trim().max(20).nullish(),
        monthly_fee: z.number().int().nonnegative().max(100000).nullish(),
        condition: z.enum(['new', 'first_occupancy', 'renovated', 'maintained', 'needs_renovation']).nullish(),
        heating_type: z.enum(['central', 'floor', 'gas', 'oil', 'district', 'electric', 'solar', 'heat_pump', 'other']).nullish(),
        energy_source: z.enum(['gas', 'oil', 'electricity', 'district_heating', 'solar', 'geothermal', 'biomass', 'other']).nullish(),
        energy_certificate: z.enum(['demand', 'consumption', 'none']).nullish(),
        energy_efficiency_class: z.enum(['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']).nullish(),
        available_from: z.string().trim().max(50).nullish(),
        important_notes: z.string().trim().max(2000).nullish(),
        afa_type: z.enum(['bestand', 'altbau', 'neubau', 'denkmal']).nullish(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check ownership and get current year_built for afa_type calculation
      const existing = await queryOne('SELECT user_id, year_built, afa_type FROM properties WHERE id = $1', [
        input.id,
      ]);

      if (!existing || existing.user_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      // Determine effective year_built (new value or existing)
      const effectiveYearBuilt = input.year_built !== undefined ? input.year_built : existing.year_built;

      // Auto-calculate AfA details if year_built is being updated OR if afa_type is explicitly set
      const shouldRecalculateAfa = input.year_built !== undefined || input.afa_type !== undefined;
      const afaDetails = shouldRecalculateAfa
        ? getAfaDetails(effectiveYearBuilt, input.afa_type)
        : null;

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(input).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          // Skip afa_type here, we'll add it separately with afa_rate and building_ratio
          if (key === 'afa_type') return;

          updates.push(`${key} = $${paramCount}`);
          // JSONB fields need to be stringified
          if (key === 'documents') {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
          paramCount++;
        }
      });

      // Add calculated AfA details if we need to update them
      if (afaDetails !== null) {
        updates.push(`afa_type = $${paramCount}`);
        values.push(afaDetails.afaType);
        paramCount++;

        updates.push(`afa_rate = $${paramCount}`);
        values.push(afaDetails.afaRate);
        paramCount++;

        updates.push(`building_ratio = $${paramCount}`);
        values.push(afaDetails.buildingRatio);
        paramCount++;
      }

      if (updates.length === 0) {
        return existing;
      }

      values.push(input.id);

      const property = await queryOne(
        `UPDATE properties SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      // Invalidate feed caches when status changes
      if (input.status !== undefined) {
        await invalidateFeedCaches();
      }

      return property;
    }),

  // Delete property
  delete: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      reason: z.enum(['sold', 'not_relevant', 'temporarily_offline']).optional(),
      soldPrice: z.number().positive().max(1000000000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check ownership
      const existing = await queryOne('SELECT user_id, price, location, sqm FROM properties WHERE id = $1', [
        input.id,
      ]);

      if (!existing || existing.user_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      // If property was sold and user provided sold price, save it anonymously for market data
      if (input.reason === 'sold' && input.soldPrice) {
        try {
          // Create market_data table if it doesn't exist
          await query(`
            CREATE TABLE IF NOT EXISTS market_data (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              location TEXT NOT NULL,
              listing_price INTEGER NOT NULL,
              sold_price INTEGER NOT NULL,
              sqm INTEGER NOT NULL,
              price_per_sqm_listed INTEGER NOT NULL,
              price_per_sqm_sold INTEGER NOT NULL,
              created_at TIMESTAMP DEFAULT NOW()
            )
          `);

          // Insert anonymous market data
          await query(
            `INSERT INTO market_data (location, listing_price, sold_price, sqm, price_per_sqm_listed, price_per_sqm_sold)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              existing.location,
              existing.price,
              input.soldPrice,
              existing.sqm,
              Math.round(existing.price / existing.sqm),
              Math.round(input.soldPrice / existing.sqm),
            ]
          );

          console.log(`📊 Market data saved: ${existing.location}, Listed: ${existing.price}€, Sold: ${input.soldPrice}€`);
        } catch (error) {
          console.error('Error saving market data:', error);
          // Don't fail deletion if market data save fails
        }
      }

      await query('DELETE FROM properties WHERE id = $1', [input.id]);

      // Invalidate feed caches when property is deleted
      await invalidateFeedCaches();

      return { success: true };
    }),

  // Activate property
  activate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await queryOne('SELECT user_id FROM properties WHERE id = $1', [
        input.id,
      ]);

      if (!existing || existing.user_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      const property = await queryOne(
        `UPDATE properties SET status = 'active' WHERE id = $1 RETURNING *`,
        [input.id]
      );

      // Invalidate feed caches when property is activated
      await invalidateFeedCaches();

      return property;
    }),

  // Deactivate property
  deactivate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await queryOne('SELECT user_id FROM properties WHERE id = $1', [
        input.id,
      ]);

      if (!existing || existing.user_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      const property = await queryOne(
        `UPDATE properties SET status = 'archived' WHERE id = $1 RETURNING *`,
        [input.id]
      );

      // Invalidate feed caches when property is deactivated
      await invalidateFeedCaches();

      return property;
    }),

  // Increment views
  incrementViews: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await query(
        `INSERT INTO property_interactions (property_id, user_id, interaction_type)
         VALUES ($1, $2, 'view')`,
        [input.id, ctx.user?.id || null]
      );

      return { success: true };
    }),

  // Analyze external URL
  analyzeExternalUrl: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input, ctx }) => {
      const { scrapePropertyUrl, detectSource } = await import('../services/property-scraper.js');
      const { analyzeProperty } = await import('../services/property-ai-analyzer.js');

      console.log(`📥 URL-Import requested by user: ${ctx.user.id}`);

      // Scrape property data from URL (with rate limiting)
      const scrapedData = await scrapePropertyUrl(input.url, ctx.user.id);

      // Analyze with AI
      const analysis = await analyzeProperty(scrapedData);

      return {
        propertyData: scrapedData,
        aiRating: analysis.aiRating,
        aiRatingExplanation: analysis.aiRatingExplanation,
        investmentScore: analysis.investmentScore,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        opportunities: analysis.opportunities,
        risks: analysis.risks,
        estimatedRent: analysis.estimatedRent,
        estimatedOperatingCosts: analysis.estimatedOperatingCosts,
        estimatedMaintenanceCosts: analysis.estimatedMaintenanceCosts,
      };
    }),

  // Analyze PDF exposé
  analyzePdfExpose: protectedProcedure
    .input(
      z.object({
        pdfBase64: z.string().min(100).max(50000000), // ~37MB limit after base64 encoding
        fileName: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { parsePDFExpose } = await import('../services/pdf-parser.js');
      const { analyzeProperty } = await import('../services/property-ai-analyzer.js');

      // Convert base64 to Buffer
      const pdfBuffer = Buffer.from(input.pdfBase64, 'base64');

      // Validate file size (max 25MB)
      if (pdfBuffer.length > 25 * 1024 * 1024) {
        throw new Error('PDF file is too large. Maximum size is 25MB.');
      }

      // Parse PDF to extract property data
      const propertyData = await parsePDFExpose(pdfBuffer);

      // Analyze with AI
      const analysis = await analyzeProperty(propertyData);

      return {
        propertyData,
        exposeText: propertyData.exposeText, // Return expose text for saving
        aiRating: analysis.aiRating,
        aiRatingExplanation: analysis.aiRatingExplanation,
        investmentScore: analysis.investmentScore,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        opportunities: analysis.opportunities,
        risks: analysis.risks,
        estimatedRent: analysis.estimatedRent,
        estimatedOperatingCosts: analysis.estimatedOperatingCosts,
        estimatedMaintenanceCosts: analysis.estimatedMaintenanceCosts,
      };
    }),

  // Create property from external source
  createFromExternal: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        title: z.string().trim().min(3).max(200),
        description: z.string().trim().max(5000).optional(),
        price: z.number().positive().max(1000000000),
        location: z.string().trim().min(2).max(200),
        sqm: z.number().positive().max(100000),
        rooms: z.number().positive().int().max(50),
        images: z.array(z.string()).max(50).optional(),
        features: z.array(z.string().trim().max(100)).max(100).optional(),
        externalSource: z.string().max(50),
        saveAsFavorite: z.boolean().default(false),
        shareWithCommunity: z.boolean().default(false),
        // AI Analysis data
        aiRating: z.enum(['top_deal', 'good', 'average', 'poor', 'avoid']).optional(),
        aiRatingExplanation: z.string().max(5000).optional(),
        investmentScore: z.number().min(0).max(100).optional(),
        strengths: z.array(z.string().max(500)).optional(),
        weaknesses: z.array(z.string().max(500)).optional(),
        opportunities: z.array(z.string().max(500)).optional(),
        risks: z.array(z.string().max(500)).optional(),
        estimatedRent: z.number().positive().optional(),
        estimatedOperatingCosts: z.number().nonnegative().optional(),
        estimatedMaintenanceCosts: z.number().nonnegative().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { detectSource } = await import('../services/property-scraper.js');
      const { analyzeProperty } = await import('../services/property-ai-analyzer.js');

      // Build AI analysis JSON object if data is provided
      const aiAnalysis = input.investmentScore !== undefined ? {
        investment_score: input.investmentScore,
        summary: input.aiRatingExplanation || '',
        rating: input.aiRating || 'average',
        strengths: input.strengths || [],
        weaknesses: input.weaknesses || [],
        opportunities: input.opportunities || [],
        risks: input.risks || [],
        estimated_rent: input.estimatedRent || null,
        estimated_operating_costs: input.estimatedOperatingCosts || null,
        estimated_maintenance_costs: input.estimatedMaintenanceCosts || null,
      } : null;

      // Create property in database
      // Note: External properties are always set to 'active' status
      // is_community_shared flag controls visibility to other users
      const property = await queryOne(
        `INSERT INTO properties (
          user_id, title, description, price, location,
          sqm, rooms, images, features, status,
          external_url, external_source, is_external, is_community_shared, ai_analysis
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          ctx.user.id,
          input.title,
          input.description || '',
          input.price,
          input.location,
          input.sqm,
          input.rooms,
          input.images || [],
          input.features || [],
          'active', // Always active so it shows in favorites
          input.url,
          detectSource(input.url),
          true,
          input.shareWithCommunity,
          aiAnalysis ? JSON.stringify(aiAnalysis) : null,
        ]
      );

      // If saveAsFavorite, add to favorites
      if (input.saveAsFavorite) {
        await query(
          `INSERT INTO favorites (user_id, property_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, property_id) DO NOTHING`,
          [ctx.user.id, property.id]
        );
      }

      return property;
    }),

  // Create property from PDF exposé
  createFromPdf: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(3).max(200),
        description: z.string().trim().max(5000).optional(),
        price: z.number().positive().max(1000000000),
        location: z.string().trim().min(2).max(200),
        sqm: z.number().positive().max(100000),
        rooms: z.number().positive().max(50),
        images: z.array(z.string().max(2000000)).max(10).optional(), // Allow base64 images (up to 2MB each)
        features: z.array(z.string().trim().max(100)).max(100).optional(),
        exposeText: z.string().max(50000).optional(), // PDF text for detailed evaluation
        saveAsFavorite: z.boolean().default(false),
        shareWithCommunity: z.boolean().default(false),
        // AI Analysis data
        aiRating: z.enum(['top_deal', 'good', 'average', 'poor', 'avoid']).optional(),
        aiRatingExplanation: z.string().max(5000).optional(),
        investmentScore: z.number().min(0).max(100).optional(),
        strengths: z.array(z.string().max(500)).optional(),
        weaknesses: z.array(z.string().max(500)).optional(),
        opportunities: z.array(z.string().max(500)).optional(),
        risks: z.array(z.string().max(500)).optional(),
        estimatedRent: z.number().positive().optional(),
        estimatedOperatingCosts: z.number().nonnegative().optional(),
        estimatedMaintenanceCosts: z.number().nonnegative().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Create property in database from PDF data
      // These are marked as external but without a URL

      // Build AI analysis JSON object if data is provided
      const aiAnalysis = input.investmentScore !== undefined ? {
        investment_score: input.investmentScore,
        summary: input.aiRatingExplanation || '',
        rating: input.aiRating || 'average',
        strengths: input.strengths || [],
        weaknesses: input.weaknesses || [],
        opportunities: input.opportunities || [],
        risks: input.risks || [],
        estimated_rent: input.estimatedRent || null,
        estimated_operating_costs: input.estimatedOperatingCosts || null,
        estimated_maintenance_costs: input.estimatedMaintenanceCosts || null,
      } : null;

      const property = await queryOne(
        `INSERT INTO properties (
          user_id, title, description, price, location,
          sqm, rooms, images, features, status,
          external_source, is_external, is_community_shared, ai_analysis, expose_text
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          ctx.user.id,
          input.title,
          input.description || '',
          input.price,
          input.location,
          input.sqm,
          input.rooms,
          input.images || [],
          input.features || [],
          'active', // Always active so it shows in favorites
          'other', // Use 'other' instead of 'pdf_upload' to satisfy DB constraint
          true,
          input.shareWithCommunity,
          aiAnalysis ? JSON.stringify(aiAnalysis) : null,
          input.exposeText || null,
        ]
      );

      // If saveAsFavorite, add to favorites
      if (input.saveAsFavorite) {
        await query(
          `INSERT INTO favorites (user_id, property_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, property_id) DO NOTHING`,
          [ctx.user.id, property.id]
        );
      }

      return property;
    }),

  // Create private property from calculator data and add to favorites
  createPrivateFavorite: protectedProcedure
    .input(
      z.object({
        // Calculator data
        price: z.number().positive().max(1000000000),
        sqm: z.number().positive().max(100000),
        location: z.string().trim().min(2).max(200),
        monthlyRent: z.number().nonnegative().optional(),
        yearBuilt: z.number().int().min(1800).max(new Date().getFullYear() + 5).optional(),
        monthlyFee: z.number().nonnegative().optional(),
        commissionRate: z.number().nonnegative().max(100).optional(),
        renovationCosts: z.number().nonnegative().optional(),
        equityPercentage: z.number().nonnegative().max(100).optional(),
        interestRate: z.number().nonnegative().max(100).optional(),
        amortizationRate: z.number().nonnegative().max(100).optional(),
        // User additions
        description: z.string().trim().max(5000).optional(),
        images: z.array(z.string()).max(50).optional(),
        documents: z.array(z.object({
          id: z.string().uuid(),
          url: z.string().url(),
          thumbnailUrl: z.string().url().nullable().optional(),
          filename: z.string().max(255),
          category: z.enum(['grundriss', 'energieausweis', 'expose', 'sonstiges', 'lageplan', 'mietvertrag', 'etw_protokoll', 'kaufvertrag', 'grundbuchauszug']),
          visibility: z.enum(['public', 'auto_approved', 'manual_approval']).default('public'),
          mimetype: z.string().max(100),
          size: z.number().nonnegative(),
          uploadedAt: z.string(),
        })).max(20).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Calculate AfA details based on year_built
      const afaDetails = getAfaDetails(input.yearBuilt, undefined);

      // Generate auto title from location and price
      const formattedPrice = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(input.price);
      const autoTitle = `${input.location} - ${formattedPrice}`;

      // Create property with is_external=true (private, only visible to owner)
      const property = await queryOne(
        `INSERT INTO properties (
          user_id, title, description, price, location,
          sqm, rooms, images, documents, status,
          is_external, is_community_shared, year_built, monthly_fee,
          commission_rate, monthly_rent, afa_type, afa_rate, building_ratio,
          property_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          ctx.user.id,
          autoTitle,
          input.description || '',
          input.price,
          input.location,
          input.sqm,
          0, // rooms - not required for calculator import
          input.images || [],
          JSON.stringify(input.documents || []),
          'active', // Always active so it shows in favorites
          true, // is_external - makes it private
          false, // is_community_shared - not shared with others
          input.yearBuilt || null,
          input.monthlyFee || null,
          input.commissionRate || null,
          input.monthlyRent || null,
          afaDetails.afaType,
          afaDetails.afaRate,
          afaDetails.buildingRatio,
          'apartment', // default property type
        ]
      );

      // Automatically add to favorites
      await query(
        `INSERT INTO favorites (user_id, property_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, property_id) DO NOTHING`,
        [ctx.user.id, property.id]
      );

      // Track interaction
      await query(
        `INSERT INTO property_interactions (user_id, property_id, interaction_type)
         SELECT $1, $2, 'favorite'
         WHERE NOT EXISTS (
           SELECT 1 FROM property_interactions
           WHERE user_id = $1 AND property_id = $2 AND interaction_type = 'favorite'
         )`,
        [ctx.user.id, property.id]
      );

      return property;
    }),

  // Generate detailed AI evaluation
  generateDetailedEvaluation: protectedProcedure
    .input(z.object({
      propertyId: z.string().uuid()
    }))
    .mutation(async ({ input, ctx }) => {
      // Get property
      const property = await queryOne(
        'SELECT * FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (!property) {
        throw new Error('Immobilie nicht gefunden');
      }

      // Check if user owns the property
      if (property.user_id !== ctx.user.id) {
        throw new Error('Keine Berechtigung');
      }

      // Check if we have expose text
      if (!property.expose_text || property.expose_text.trim().length < 100) {
        throw new Error('Kein Exposé-Text verfügbar. Bitte laden Sie das Exposé erneut hoch.');
      }

      // Generate detailed evaluation
      const { generateDetailedEvaluation } = await import('../services/property-detailed-evaluator.js');
      const evaluation = await generateDetailedEvaluation(property.expose_text, property.price);

      // Save evaluation to database
      await query(
        `UPDATE properties
         SET ai_detailed_evaluation = $1, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(evaluation), input.propertyId]
      );

      return evaluation;
    }),

  // Analyze Screenshots
  analyzeScreenshots: protectedProcedure
    .input(
      z.object({
        screenshots: z.array(z.string().min(100).max(20000000)).min(1).max(10), // Base64 images
      })
    )
    .mutation(async ({ input }) => {
      const { analyzeMultipleScreenshots, extractPropertyDataFromScreenshots } = await import('../services/screenshot-analyzer.js');
      const { analyzeProperty } = await import('../services/property-ai-analyzer.js');

      console.log(`📸 Analysiere ${input.screenshots.length} Screenshots...`);

      // Step 1: Extract text from all screenshots using OpenAI Vision
      const { combinedText } = await analyzeMultipleScreenshots(
        input.screenshots.map(img => {
          // Remove data URL prefix if present (data:image/jpeg;base64,)
          const base64 = img.includes(',') ? img.split(',')[1] : img;
          return base64;
        })
      );

      // Step 2: Extract structured property data from combined text
      const propertyData = await extractPropertyDataFromScreenshots(combinedText);

      // Step 3: Analyze property with AI (same as PDF)
      const analysis = await analyzeProperty(propertyData);

      console.log('✅ Screenshot-Analyse abgeschlossen');

      return {
        propertyData,
        exposeText: combinedText, // Save combined screenshot text
        aiRating: analysis.aiRating,
        aiRatingExplanation: analysis.aiRatingExplanation,
        investmentScore: analysis.investmentScore,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        opportunities: analysis.opportunities,
        risks: analysis.risks,
        estimatedRent: analysis.estimatedRent,
        estimatedOperatingCosts: analysis.estimatedOperatingCosts,
        estimatedMaintenanceCosts: analysis.estimatedMaintenanceCosts,
      };
    }),

  // Classify and Analyze Images (screenshots vs photos)
  classifyAndAnalyzeImages: protectedProcedure
    .input(
      z.object({
        images: z.array(z.string().min(100).max(20000000)).min(1).max(20), // Base64 images
      })
    )
    .mutation(async ({ input }) => {
      const { analyzeMultipleScreenshots, extractPropertyDataFromScreenshots } = await import('../services/screenshot-analyzer.js');
      const { analyzeProperty } = await import('../services/property-ai-analyzer.js');

      console.log(`🖼️  Klassifiziere und analysiere ${input.images.length} Bilder...`);

      // For now, treat all images as photos (skip classification)
      // In the future, we can add AI-based classification here
      const photoImages = input.images.map(img => {
        // Ensure proper data URL format
        if (!img.startsWith('data:')) {
          return `data:image/jpeg;base64,${img}`;
        }
        return img;
      });

      console.log(`✅ ${photoImages.length} Bilder als Fotos klassifiziert`);

      return {
        screenshotCount: 0,
        photoCount: photoImages.length,
        photoImages,
        extractedData: null,
        propertyData: null,
      };
    }),

  // Track property view
  trackView: publicProcedure
    .input(z.object({
      propertyId: z.string().uuid(),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id || null;
      const sessionId = input.sessionId || null;

      // Track view using database function
      await query(
        `SELECT track_property_view($1, $2, $3, NULL, NULL)`,
        [input.propertyId, userId, sessionId]
      );

      return { success: true };
    }),

  // Submit property feedback
  submitFeedback: publicProcedure
    .input(z.object({
      propertyId: z.string().uuid(),
      rating: z.number().int().min(1).max(5).optional(),
      feedbackType: z.enum(['positive', 'neutral', 'negative']).optional(),
      comment: z.string().max(1000).optional(),
      priceRating: z.number().int().min(1).max(5).optional(),
      locationRating: z.number().int().min(1).max(5).optional(),
      conditionRating: z.number().int().min(1).max(5).optional(),
      descriptionRating: z.number().int().min(1).max(5).optional(),
      tags: z.array(z.string()).optional(),
      suggestedPrice: z.number().positive().max(1000000000).optional(),
      noInterestReason: z.string().max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id || null;

      // Insert or update feedback
      const result = await query(
        `INSERT INTO property_feedback (
          property_id, user_id, rating, feedback_type, comment,
          price_rating, location_rating, condition_rating, description_rating, tags,
          suggested_price, no_interest_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (property_id, user_id) WHERE user_id IS NOT NULL
        DO UPDATE SET
          rating = COALESCE($3, property_feedback.rating),
          feedback_type = COALESCE($4, property_feedback.feedback_type),
          comment = COALESCE($5, property_feedback.comment),
          price_rating = COALESCE($6, property_feedback.price_rating),
          location_rating = COALESCE($7, property_feedback.location_rating),
          condition_rating = COALESCE($8, property_feedback.condition_rating),
          description_rating = COALESCE($9, property_feedback.description_rating),
          tags = COALESCE($10, property_feedback.tags),
          suggested_price = COALESCE($11, property_feedback.suggested_price),
          no_interest_reason = COALESCE($12, property_feedback.no_interest_reason),
          created_at = NOW()
        RETURNING id`,
        [
          input.propertyId,
          userId,
          input.rating || null,
          input.feedbackType || null,
          input.comment || null,
          input.priceRating || null,
          input.locationRating || null,
          input.conditionRating || null,
          input.descriptionRating || null,
          input.tags || null,
          input.suggestedPrice || null,
          input.noInterestReason || null,
        ]
      );

      return { success: true, feedbackId: result[0]?.id };
    }),

  // Get statistics for owner's property
  getStatistics: protectedProcedure
    .input(z.object({
      propertyId: z.string().uuid(),
    }))
    .query(async ({ input, ctx }) => {
      // Check ownership
      const property = await queryOne(
        'SELECT user_id FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (!property || property.user_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      // Get statistics
      const stats = await queryOne(
        'SELECT * FROM property_statistics WHERE property_id = $1',
        [input.propertyId]
      );

      return stats || {
        total_views: 0,
        unique_viewers: 0,
        favorites_count: 0,
        views_last_7_days: 0,
        views_last_30_days: 0,
        feedback_count: 0,
        avg_rating: null,
        avg_price_rating: null,
        avg_location_rating: null,
        avg_condition_rating: null,
        avg_description_rating: null,
        positive_feedback_count: 0,
        neutral_feedback_count: 0,
        negative_feedback_count: 0,
      };
    }),

  // Get anonymized feedback for owner's property
  getFeedback: protectedProcedure
    .input(z.object({
      propertyId: z.string().uuid(),
      limit: z.number().positive().int().max(100).default(20),
      offset: z.number().nonnegative().int().default(0),
    }))
    .query(async ({ input, ctx }) => {
      // Check ownership
      const property = await queryOne(
        'SELECT user_id FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (!property || property.user_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      // Get anonymized feedback (without user_id)
      const feedback = await query(
        `SELECT
          id,
          rating,
          feedback_type,
          comment,
          price_rating,
          location_rating,
          condition_rating,
          description_rating,
          tags,
          suggested_price,
          no_interest_reason,
          created_at
        FROM property_feedback
        WHERE property_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
        [input.propertyId, input.limit, input.offset]
      );

      return feedback;
    }),

  // Get statistics for all user's properties
  getAllStatistics: protectedProcedure
    .query(async ({ ctx }) => {
      const stats = await query(
        `SELECT
          ps.*,
          p.title,
          p.price,
          p.location,
          p.status
        FROM property_statistics ps
        JOIN properties p ON ps.property_id = p.id
        WHERE p.user_id = $1
        ORDER BY ps.total_views DESC`,
        [ctx.user.id]
      );

      return stats;
    }),

  // Generate KI Evaluation for a property
  generateKIEvaluation: publicProcedure
    .input(z.object({
      propertyId: z.string().uuid(),
      viewType: z.enum(['buyer_selfuse', 'buyer_investor', 'seller']).optional(),
    }))
    .mutation(async ({ input }) => {
      // Get property
      const property = await queryOne(
        'SELECT * FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (!property) {
        throw new Error('Immobilie nicht gefunden');
      }

      // Route to correct evaluator based on viewType
      if (input.viewType === 'seller') {
        // Seller evaluation
        const { evaluatePropertyForSeller } = await import('../services/property-seller-evaluator.js');
        const evaluation = await evaluatePropertyForSeller(input.propertyId);
        return {
          viewType: 'seller',
          ...evaluation,
        };
      } else {
        // Buyer evaluation (investor or selfuse)
        const { evaluatePropertyInvestment } = await import('../services/property-investment-evaluator.js');
        const evaluation = await evaluatePropertyInvestment(input.propertyId);
        return evaluation;
      }
    }),

  // Generate full access share token (owner only)
  generateFullAccessToken: protectedProcedure
    .input(z.object({
      propertyId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check ownership
      const property = await queryOne(
        'SELECT user_id, full_access_token FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (!property) {
        throw new Error('Immobilie nicht gefunden');
      }

      if (property.user_id !== ctx.user.id) {
        throw new Error('Keine Berechtigung');
      }

      // If token already exists, return it
      if (property.full_access_token) {
        return {
          token: property.full_access_token,
          isNew: false,
        };
      }

      // Generate new token (21 chars, URL-safe)
      const { randomBytes } = await import('crypto');
      const token = randomBytes(16).toString('base64url').slice(0, 21);

      // Save token to database
      await query(
        'UPDATE properties SET full_access_token = $1, updated_at = NOW() WHERE id = $2',
        [token, input.propertyId]
      );

      return {
        token,
        isNew: true,
      };
    }),

  // Get property by full access token (public - for share page)
  getByFullAccessToken: publicProcedure
    .input(z.object({
      token: z.string().min(10).max(32),
    }))
    .query(async ({ input }) => {
      const property = await queryOne(
        `SELECT
          p.*,
          NULLIF(CONCAT_WS(', ', p.street_address, CONCAT_WS(' ', p.postal_code, p.location)), '') as full_address,
          EXTRACT(DAY FROM (CURRENT_TIMESTAMP - p.created_at))::integer as days_online,
          COALESCE(ps.total_views, 0) as total_views,
          COALESCE(ps.favorites_count, 0) as favorites_count,
          COALESCE(ps.rating_count, 0) as rating_count,
          ps.avg_rating,
          ps.avg_suggested_price,
          json_build_object(
            'id', up.id,
            'user_id', up.user_id,
            'first_name', up.first_name,
            'last_name', up.last_name,
            'phone', up.phone,
            'company', up.company,
            'avatar_url', up.avatar_url,
            'bio', up.bio
          ) as owner
        FROM properties p
        LEFT JOIN user_profiles up ON p.user_id = up.user_id
        LEFT JOIN property_statistics ps ON p.id = ps.property_id
        WHERE p.full_access_token = $1`,
        [input.token]
      );

      if (!property) {
        throw new Error('Link ungültig oder abgelaufen');
      }

      // Return property with full access (address + documents visible)
      return {
        ...property,
        hasFullAccess: true,
      };
    }),

  // Get similar properties for calculator (with mode-specific sorting)
  getSimilarPropertiesForCalculator: publicProcedure
    .input(z.object({
      // Filter criteria
      sqm: z.number().positive().optional(),
      location: z.string().optional(),
      price: z.number().positive().optional(),

      // Mode for sorting
      mode: z.enum(['investor', 'eigennutzer']),

      // Calculator parameters for eigennutzer calculations
      equityPercentage: z.number().min(0).max(100).default(20),
      interestRate: z.number().min(0).max(15).default(4),

      // Exclude current property
      excludePropertyId: z.string().uuid().optional(),

      // Pagination
      limit: z.number().min(1).max(20).default(6),
    }))
    .query(async ({ input }) => {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Base conditions only - no strict filtering
      conditions.push(`status = 'active'`);
      conditions.push(`(is_external = false OR is_external IS NULL OR is_community_shared = true)`);
      conditions.push(`sqm > 0`);
      conditions.push(`price > 0`);

      // Exclude current property
      if (input.excludePropertyId) {
        conditions.push(`id != $${paramCount}`);
        values.push(input.excludePropertyId);
        paramCount++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get all active properties - we'll score and sort them in JS
      const sql = `
        SELECT
          id,
          title,
          price,
          location,
          sqm,
          rooms,
          images,
          ai_investment_score,
          monthly_rent,
          monthly_fee,
          year_built,
          afa_type,
          afa_rate,
          building_ratio
        FROM properties
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const properties = await query(sql, values);

      // Extract location part for comparison
      const inputLocationPart = input.location ? input.location.split(',')[0].trim().toLowerCase() : '';

      // Calculate metrics and similarity score for each property
      const propertiesWithMetrics = properties.map((property: any) => {
        // Estimate monthly rent if not available
        const estimatedRentPerSqm = 12; // €12/m² as fallback
        const monthlyRent = property.monthly_rent || (property.sqm * estimatedRentPerSqm);
        const annualRent = monthlyRent * 12;

        // Gross yield calculation
        const grossYield = (annualRent / property.price) * 100;

        // Break-even calculation for eigennutzer
        const ltvRatio = (100 - input.equityPercentage) / 100;
        const loanAmount = property.price * ltvRatio;
        const annualInterest = loanAmount * (input.interestRate / 100);
        const annualMaintenance = property.price * 0.01; // 1% maintenance
        const annualHausgeld = (property.monthly_fee || (property.sqm * 3.5)) * 12;
        const annualOwnerCosts = annualInterest + annualMaintenance + annualHausgeld;

        // Kaufnebenkosten ~10%
        const purchaseCosts = property.price * 0.10;
        const equity = property.price * (input.equityPercentage / 100) + purchaseCosts;

        // Annual savings = rent - owner costs
        const annualSavings = annualRent - annualOwnerCosts;

        // Break-even years = equity / annual savings
        const breakEvenYears = annualSavings > 0 ? equity / annualSavings : 99;

        // Monthly difference (rent vs. buy cost)
        const monthlyOwnerCost = annualOwnerCosts / 12;
        const monthlyDifference = monthlyRent - monthlyOwnerCost;

        // Calculate similarity score (higher = more similar)
        let similarityScore = 0;

        // Location match (most important - up to 50 points)
        const propertyLocation = (property.location || '').toLowerCase();
        if (inputLocationPart && propertyLocation.includes(inputLocationPart)) {
          similarityScore += 50;
        } else if (inputLocationPart) {
          // Partial match - check if any word matches
          const inputWords = inputLocationPart.split(/\s+/);
          const locationWords = propertyLocation.split(/\s+/);
          for (const word of inputWords) {
            if (word.length > 2 && locationWords.some((lw: string) => lw.includes(word))) {
              similarityScore += 20;
              break;
            }
          }
        }

        // Size similarity (up to 30 points)
        if (input.sqm && property.sqm) {
          const sqmDiff = Math.abs(property.sqm - input.sqm) / input.sqm;
          if (sqmDiff <= 0.1) similarityScore += 30; // Within 10%
          else if (sqmDiff <= 0.2) similarityScore += 25; // Within 20%
          else if (sqmDiff <= 0.3) similarityScore += 20; // Within 30%
          else if (sqmDiff <= 0.5) similarityScore += 10; // Within 50%
        }

        // Price similarity (up to 20 points)
        if (input.price && property.price) {
          const priceDiff = Math.abs(property.price - input.price) / input.price;
          if (priceDiff <= 0.1) similarityScore += 20; // Within 10%
          else if (priceDiff <= 0.2) similarityScore += 15; // Within 20%
          else if (priceDiff <= 0.3) similarityScore += 10; // Within 30%
          else if (priceDiff <= 0.5) similarityScore += 5; // Within 50%
        }

        return {
          id: property.id,
          title: property.title,
          price: property.price,
          location: property.location,
          sqm: property.sqm,
          rooms: property.rooms,
          images: property.images || [],
          ai_investment_score: property.ai_investment_score,
          // Calculated metrics
          grossYield: Math.round(grossYield * 10) / 10,
          breakEvenYears: Math.round(breakEvenYears * 10) / 10,
          monthlyDifference: Math.round(monthlyDifference),
          estimatedMonthlyRent: Math.round(monthlyRent),
          similarityScore,
        };
      });

      // First sort by similarity score to get most similar properties
      propertiesWithMetrics.sort((a: any, b: any) => b.similarityScore - a.similarityScore);

      // Take top candidates (more than limit to have room for mode-based sorting)
      const topCandidates = propertiesWithMetrics.slice(0, Math.max(input.limit * 2, 12));

      // Then sort by mode-specific metric
      let sorted;
      if (input.mode === 'investor') {
        // Sort by gross yield descending (higher is better)
        sorted = topCandidates.sort((a: any, b: any) => b.grossYield - a.grossYield);
      } else {
        // Eigennutzer: Sort by break-even years ascending (lower is better)
        sorted = topCandidates.sort((a: any, b: any) => a.breakEvenYears - b.breakEvenYears);
      }

      // Return only the requested limit
      return sorted.slice(0, input.limit);
    }),

  // Get similar properties for property detail page (sorted by similarity then AI score)
  getSimilarPropertiesForDetail: publicProcedure
    .input(z.object({
      propertyId: z.string().uuid(),
      // Current property data for comparison (coerce strings to numbers)
      sqm: z.coerce.number().positive().optional(),
      location: z.string().optional(),
      price: z.coerce.number().positive().optional(),
      limit: z.coerce.number().min(1).max(10).default(3),
    }))
    .query(async ({ input }) => {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Base conditions
      conditions.push(`status = 'active'`);
      conditions.push(`(is_external = false OR is_external IS NULL OR is_community_shared = true)`);
      conditions.push(`sqm > 0`);
      conditions.push(`price > 0`);

      // Exclude current property
      conditions.push(`id != $${paramCount}`);
      values.push(input.propertyId);
      paramCount++;

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get all active properties
      const sql = `
        SELECT
          id,
          title,
          price,
          location,
          sqm,
          rooms,
          images,
          ai_investment_score
        FROM properties
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT 100
      `;

      const properties = await query(sql, values);

      // Extract location part for comparison
      const inputLocationPart = input.location ? input.location.split(',')[0].trim().toLowerCase() : '';

      // Calculate similarity score for each property
      const propertiesWithScore = properties.map((property: any) => {
        let similarityScore = 0;

        // Location match (most important - up to 50 points)
        const propertyLocation = (property.location || '').toLowerCase();
        if (inputLocationPart && propertyLocation.includes(inputLocationPart)) {
          similarityScore += 50;
        } else if (inputLocationPart) {
          // Partial match - check if any word matches
          const inputWords = inputLocationPart.split(/\s+/);
          const locationWords = propertyLocation.split(/\s+/);
          for (const word of inputWords) {
            if (word.length > 2 && locationWords.some((lw: string) => lw.includes(word))) {
              similarityScore += 25;
              break;
            }
          }
        }

        // Size similarity (up to 30 points)
        if (input.sqm && property.sqm) {
          const sqmDiff = Math.abs(property.sqm - input.sqm) / input.sqm;
          if (sqmDiff <= 0.15) similarityScore += 30; // Within 15%
          else if (sqmDiff <= 0.25) similarityScore += 25; // Within 25%
          else if (sqmDiff <= 0.35) similarityScore += 20; // Within 35%
          else if (sqmDiff <= 0.5) similarityScore += 10; // Within 50%
        }

        // Price similarity (up to 20 points)
        if (input.price && property.price) {
          const priceDiff = Math.abs(property.price - input.price) / input.price;
          if (priceDiff <= 0.15) similarityScore += 20; // Within 15%
          else if (priceDiff <= 0.25) similarityScore += 15; // Within 25%
          else if (priceDiff <= 0.35) similarityScore += 10; // Within 35%
          else if (priceDiff <= 0.5) similarityScore += 5; // Within 50%
        }

        return {
          id: property.id,
          title: property.title,
          price: Number(property.price || 0),
          location: property.location || '',
          sqm: Number(property.sqm || 0),
          rooms: Number(property.rooms || 0),
          images: property.images || [],
          ai_investment_score: property.ai_investment_score ? Number(property.ai_investment_score) : undefined,
          similarityScore,
        };
      });

      // Sort by similarity first, then by AI score
      const sorted = propertiesWithScore.sort((a: any, b: any) => {
        // First priority: similarity score (higher is better)
        if (b.similarityScore !== a.similarityScore) {
          return b.similarityScore - a.similarityScore;
        }
        // Second priority: AI score (higher is better)
        const aScore = a.ai_investment_score || 0;
        const bScore = b.ai_investment_score || 0;
        return bScore - aScore;
      });

      // Return only the requested limit
      return sorted.slice(0, input.limit);
    }),

  // Revoke full access token (owner only)
  revokeFullAccessToken: protectedProcedure
    .input(z.object({
      propertyId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check ownership
      const property = await queryOne(
        'SELECT user_id FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (!property) {
        throw new Error('Immobilie nicht gefunden');
      }

      if (property.user_id !== ctx.user.id) {
        throw new Error('Keine Berechtigung');
      }

      // Remove token
      await query(
        'UPDATE properties SET full_access_token = NULL, updated_at = NOW() WHERE id = $1',
        [input.propertyId]
      );

      return { success: true };
    }),

  // Get top-rated properties by AI score (sorted by score, then by newest)
  getTopRatedByAIScore: publicProcedure
    .input(z.object({
      excludePropertyId: z.string().uuid().optional(),
      limit: z.number().min(1).max(20).default(6),
    }))
    .query(async ({ input }) => {
      const { excludePropertyId, limit } = input;

      const params: (string | number)[] = [limit];
      let paramIndex = 2;

      let whereClause = `
        WHERE p.ai_investment_score IS NOT NULL
        AND p.ai_investment_score > 0
      `;

      if (excludePropertyId) {
        whereClause += ` AND p.id != $${paramIndex}`;
        params.push(excludePropertyId);
        paramIndex++;
      }

      const properties = await query(`
        SELECT
          p.id,
          p.title,
          p.price,
          p.location,
          p.sqm,
          p.rooms,
          p.images,
          p.ai_investment_score
        FROM properties p
        ${whereClause}
        ORDER BY p.ai_investment_score DESC NULLS LAST, p.created_at DESC
        LIMIT $1
      `, params);

      if (!properties || !Array.isArray(properties)) {
        return [];
      }

      return properties.map((row: {
        id: string;
        title: string;
        price: number;
        location: string;
        sqm: number;
        rooms: number;
        images: string[];
        ai_investment_score: number;
      }) => ({
        id: row.id,
        title: row.title,
        price: Number(row.price || 0),
        location: row.location || '',
        sqm: Number(row.sqm || 0),
        rooms: Number(row.rooms || 0),
        images: row.images || [],
        ai_investment_score: Number(row.ai_investment_score || 0),
      }));
    }),
});
