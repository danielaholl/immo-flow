/**
 * Properties Router
 * All property-related tRPC procedures
 */
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { query, queryOne } from '../db.js';

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
          status: z.enum(['active', 'pending', 'archived', 'sold']).optional(),
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

  // Get property by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const property = await queryOne(
        `SELECT
          *,
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

  // Get property with owner
  getByIdWithOwner: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const property = await queryOne(
        `SELECT
          p.*,
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
        WHERE p.id = $1`,
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
      // Get properties for the authenticated user with statistics
      const properties = await query(
        `SELECT
          p.*,
          COALESCE(ps.total_views, 0) as total_views,
          COALESCE(ps.unique_viewers, 0) as unique_viewers,
          COALESCE(ps.favorites_count, 0) as favorites_count,
          COALESCE(ps.rating_count, 0) as rating_count,
          COALESCE(ps.views_last_7_days, 0) as views_last_7_days,
          COALESCE(ps.views_last_30_days, 0) as views_last_30_days,
          COALESCE(ps.feedback_count, 0) as feedback_count,
          ps.avg_rating,
          ps.avg_suggested_price,
          ps.positive_feedback_count,
          ps.neutral_feedback_count,
          ps.negative_feedback_count,
          EXTRACT(DAY FROM (CURRENT_TIMESTAMP - p.created_at))::integer as days_online
        FROM properties p
        LEFT JOIN property_statistics ps ON p.id = ps.property_id
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC`,
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
        features: z.array(z.string().trim().max(100)).max(100).optional(),
        highlights: z.array(z.string().trim().max(100)).max(100).optional(),
        red_flags: z.array(z.string().trim().max(100)).max(100).optional(),
        status: z.enum(['active', 'pending', 'archived', 'sold']).default('active'),
        commission_rate: z.number().nonnegative().max(100).optional(),
        require_address_consent: z.boolean().optional(),
        // New fields added
        property_type: z.enum(['apartment', 'house', 'villa', 'commercial', 'land', 'office', 'retail', 'industrial', 'parking', 'multi_family']).optional(),
        postal_code: z.string().trim().max(10).optional(),
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      const property = await queryOne(
        `INSERT INTO properties (
          user_id, title, description, price, location,
          sqm, rooms, images, video_url, features, highlights, red_flags, status, commission_rate,
          require_address_consent, property_type, postal_code, street_address,
          year_built, floor_level, total_floors, bathrooms, usable_area,
          usable_area_ratio, monthly_fee, condition, heating_type,
          energy_source, energy_certificate, energy_efficiency_class,
          available_from, important_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
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
        ]
      );

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
        features: z.array(z.string().trim().max(100)).max(100).optional(),
        highlights: z.array(z.string().trim().max(100)).max(100).optional(),
        red_flags: z.array(z.string().trim().max(100)).max(100).optional(),
        status: z.enum(['active', 'pending', 'archived', 'sold']).nullish(),
        commission_rate: z.number().nonnegative().max(100).nullish(),
        require_address_consent: z.boolean().nullish(),
        // New fields added - using nullish() to accept both null and undefined
        property_type: z.enum(['apartment', 'house', 'villa', 'commercial', 'land', 'office', 'retail', 'industrial', 'parking', 'multi_family']).nullish(),
        postal_code: z.string().trim().max(10).nullish(),
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check ownership
      const existing = await queryOne('SELECT user_id FROM properties WHERE id = $1', [
        input.id,
      ]);

      if (!existing || existing.user_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(input).forEach(([key, value]) => {
        if (key !== 'id' && value !== undefined) {
          updates.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (updates.length === 0) {
        return existing;
      }

      values.push(input.id);

      const property = await queryOne(
        `UPDATE properties SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

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
});
