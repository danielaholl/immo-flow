/**
 * Zentrale SQL-Fragmente für Property-Queries
 *
 * Vermeidet Duplikation und garantiert Konsistenz über alle Router hinweg.
 */

// Basis-Felder die immer berechnet werden
export const PROPERTY_BASE_FIELDS = `
  p.*,
  NULLIF(CONCAT_WS(', ', p.street_address, CONCAT_WS(' ', p.postal_code, p.location)), '') as full_address,
  EXTRACT(DAY FROM (CURRENT_TIMESTAMP - p.created_at))::integer as days_online,
  COALESCE(jsonb_array_length(p.documents), 0) as documents_count
`;

// Owner-Objekt mit allen Feldern
export const OWNER_JSON = `
  json_build_object(
    'id', up.id,
    'user_id', up.user_id,
    'first_name', up.first_name,
    'last_name', up.last_name,
    'phone', up.phone,
    'company', up.company,
    'avatar_url', up.avatar_url,
    'bio', up.bio,
    'email', u.email
  ) as owner
`;

// Owner-Objekt als Subquery (für komplexere Queries)
export const OWNER_SUBQUERY = `
  (
    SELECT json_build_object(
      'id', up.id,
      'user_id', up.user_id,
      'first_name', up.first_name,
      'last_name', up.last_name,
      'phone', up.phone,
      'company', up.company,
      'avatar_url', up.avatar_url,
      'bio', up.bio,
      'email', u.email
    )
    FROM user_profiles up
    LEFT JOIN users u ON up.user_id = u.id
    WHERE up.user_id = p.user_id
  ) as owner
`;

// Basis-Statistiken (für Käufer-Ansicht)
export const STATISTICS_BASE = `
  COALESCE(ps.total_views, 0) as total_views,
  COALESCE(ps.favorites_count, 0) as favorites_count,
  COALESCE(ps.rating_count, 0) as rating_count,
  ps.avg_rating,
  ps.avg_suggested_price
`;

// Erweiterte Statistiken (für Verkäufer-Ansicht)
export const STATISTICS_EXTENDED = `
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
  ps.negative_feedback_count
`;

// Standard JOINs
export const JOIN_OWNER = `
  LEFT JOIN user_profiles up ON p.user_id = up.user_id
  LEFT JOIN users u ON p.user_id = u.id
`;

export const JOIN_STATISTICS = `
  LEFT JOIN property_statistics ps ON p.id = ps.property_id
`;

/**
 * Baut eine vollständige Property-Query zusammen
 */
export interface PropertyQueryOptions {
  includeOwner?: boolean;
  includeStats?: 'base' | 'extended';
  includeBaseFields?: boolean;
  whereClause: string;
  orderBy?: string;
}

export function buildPropertyQuery(options: PropertyQueryOptions): string {
  const {
    includeOwner = false,
    includeStats,
    includeBaseFields = true,
    whereClause,
    orderBy,
  } = options;

  const selectParts: string[] = [];
  const joinParts: string[] = [];

  // Basis-Felder
  if (includeBaseFields) {
    selectParts.push(PROPERTY_BASE_FIELDS);
  } else {
    selectParts.push('p.*');
  }

  // Statistiken
  if (includeStats === 'base') {
    selectParts.push(STATISTICS_BASE);
    joinParts.push(JOIN_STATISTICS);
  } else if (includeStats === 'extended') {
    selectParts.push(STATISTICS_EXTENDED);
    joinParts.push(JOIN_STATISTICS);
  }

  // Owner
  if (includeOwner) {
    selectParts.push(OWNER_JSON);
    joinParts.push(JOIN_OWNER);
  }

  const query = `
    SELECT
      ${selectParts.join(',\n      ')}
    FROM properties p
    ${joinParts.join('\n    ')}
    WHERE ${whereClause}
    ${orderBy ? `ORDER BY ${orderBy}` : ''}
  `.trim();

  return query;
}

/**
 * Owner-Felder als Subquery für json_build_object
 */
export const OWNER_JSON_SUBQUERY = `
  'owner', (
    SELECT json_build_object(
      'id', up.id,
      'user_id', up.user_id,
      'first_name', up.first_name,
      'last_name', up.last_name,
      'phone', up.phone,
      'company', up.company,
      'avatar_url', up.avatar_url,
      'bio', up.bio,
      'email', u.email
    )
    FROM user_profiles up
    LEFT JOIN users u ON up.user_id = u.id
    WHERE up.user_id = p.user_id
  )
`;

/**
 * Property-Felder für json_build_object in Subqueries (z.B. favorites)
 */
export const PROPERTY_JSON_FIELDS = `
  'id', p.id,
  'title', p.title,
  'description', p.description,
  'price', p.price,
  'location', p.location,
  'street_address', p.street_address,
  'postal_code', p.postal_code,
  'full_address', NULLIF(CONCAT_WS(', ', p.street_address, CONCAT_WS(' ', p.postal_code, p.location)), ''),
  'sqm', p.sqm,
  'rooms', p.rooms,
  'bathrooms', p.bathrooms,
  'images', p.images,
  'video_url', p.video_url,
  'documents', p.documents,
  'features', p.features,
  'highlights', p.highlights,
  'red_flags', p.red_flags,
  'property_type', p.property_type,
  'status', p.status,
  'commission_rate', p.commission_rate,
  'require_address_consent', p.require_address_consent,
  'yield', p.yield,
  'year_built', p.year_built,
  'floor_level', p.floor_level,
  'total_floors', p.total_floors,
  'heating_type', p.heating_type,
  'energy_source', p.energy_source,
  'energy_certificate', p.energy_certificate,
  'energy_efficiency_class', p.energy_efficiency_class,
  'monthly_fee', p.monthly_fee,
  'usable_area', p.usable_area,
  'usable_area_ratio', p.usable_area_ratio,
  'condition', p.condition,
  'available_from', p.available_from,
  'important_notes', p.important_notes,
  'actual_monthly_rent', p.actual_monthly_rent,
  'ai_score', COALESCE(p.ai_investment_score, p.ai_score),
  'ai_investment_score', p.ai_investment_score,
  'ai_detailed_evaluation', p.ai_detailed_evaluation,
  'buyer_evaluation', p.buyer_evaluation,
  'seller_evaluation', p.seller_evaluation,
  'is_external', p.is_external,
  'user_id', p.user_id,
  'created_at', p.created_at,
  'updated_at', p.updated_at,
  'days_online', EXTRACT(DAY FROM (CURRENT_TIMESTAMP - p.created_at))::integer,
  'documents_count', COALESCE(jsonb_array_length(p.documents), 0)
`;
