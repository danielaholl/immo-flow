/**
 * Property Field Filter Utility
 * Filtert Property-Felder basierend auf Auth-Status für Progressive Disclosure
 */

export interface PropertyTeaserFields {
  id: string;
  title: string;
  price: number;
  location: string;
  sqm: number;
  rooms: number;
  property_type: string;
  images: string[]; // Limited to first 3
  features: string[]; // Basic features only
  status: string;
  ai_score: number | null;
  ai_investment_score: number | null; // For badge display (visible to all)
  score_color: string | null; // For badge color (visible to all)
  created_at: string;
  available_from: string | null;
  description: string; // Truncated to 150 chars
}

export interface PropertyFullFields extends PropertyTeaserFields {
  // All fields from teaser, plus:
  address: string | null;
  allImages: string[];
  allFeatures: string[];
  highlights: string[];
  red_flags: string[];
  ai_detailed_evaluation: any;
  buyer_evaluation: any; // Only for authenticated users
  monthly_fee: number | null;
  usable_area: number | null;
  usable_area_ratio: number | null;
  bathrooms: number | null;
  total_floors: number | null;
  floor_level: number | null;
  year_built: number | null;
  heating_type: string | null;
  energy_source: string | null;
  energy_certificate: string | null;
  energy_efficiency_class: string | null;
  condition: string | null;
  important_notes: string | null;
  actual_monthly_rent: number | null;
  commission_rate: number | null;
  require_address_consent: boolean;
  user_id: string;
  owner: {
    first_name: string;
    last_name: string;
    company: string | null;
    avatar_url: string | null;
  } | null;
}

/**
 * Filter property to teaser fields only
 * Removes sensitive data and limits content for non-authenticated users
 */
export function filterToTeaser(property: any): PropertyTeaserFields {
  return {
    id: property.id,
    title: property.title,
    price: property.price,
    location: property.location,
    sqm: property.sqm,
    rooms: property.rooms,
    property_type: property.property_type,
    // Limit images to first 3
    images: property.images?.slice(0, 3) || [],
    // Basic features only (first 5)
    features: property.features?.slice(0, 5) || [],
    status: property.status,
    ai_score: property.ai_score,
    ai_investment_score: property.ai_investment_score,
    score_color: property.score_color,
    created_at: property.created_at,
    available_from: property.available_from,
    // Truncate description to 150 chars
    description: property.description
      ? property.description.substring(0, 150) + (property.description.length > 150 ? '...' : '')
      : '',
  };
}

/**
 * Determine if user can see full property details
 * Property owners always have full access
 * Otherwise, authentication required
 */
export function canAccessFullDetails(
  isAuthenticated: boolean,
  property: any,
  userId?: string
): boolean {
  // Property owner always has full access
  if (userId && property.user_id === userId) {
    return true;
  }

  // Otherwise, auth required for full details
  return isAuthenticated;
}

/**
 * SQL fragment for conditional property field selection
 * Returns different field lists based on authentication status
 */
export function getPropertyFieldsSQL(isAuthenticated: boolean): string {
  const baseFields = `
    p.id,
    p.title,
    p.price,
    p.location,
    p.sqm,
    p.rooms,
    p.property_type,
    p.status,
    p.ai_score,
    p.ai_investment_score,
    p.score_color,
    p.created_at,
    p.available_from,
    p.description,
    p.images,
    p.features
  `;

  const fullFields = `
    ${baseFields},
    p.address,
    p.highlights,
    p.red_flags,
    p.buyer_evaluation,
    p.monthly_fee,
    p.usable_area,
    p.usable_area_ratio,
    p.bathrooms,
    p.total_floors,
    p.floor_level,
    p.year_built,
    p.heating_type,
    p.energy_source,
    p.energy_certificate,
    p.energy_efficiency_class,
    p.condition,
    p.important_notes,
    p.actual_monthly_rent,
    p.commission_rate,
    p.require_address_consent,
    p.user_id,
    p.yield
  `;

  return isAuthenticated ? fullFields : baseFields;
}

/**
 * Add owner information to property query (only for authenticated users)
 */
export function getOwnerSQL(): string {
  return `
    (
      SELECT json_build_object(
        'first_name', up.first_name,
        'last_name', up.last_name,
        'company', up.company,
        'avatar_url', up.avatar_url
      )
      FROM user_profiles up
      WHERE up.user_id = p.user_id
    ) as owner
  `;
}
