/**
 * Type definitions for Profile page
 */

export interface SearchHistory {
  id: string;
  user_id: string;
  query: string;
  criteria?: any;
  results_count?: number;
  last_searched_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserPreferencesParsed {
  id: string;
  user_id: string;
  preferred_locations: Array<{ location: string; weight: number }>;
  price_range: { min?: number; max?: number; avg?: number };
  preferred_rooms: Array<{ rooms: number; weight: number }>;
  preferred_features: Array<{ feature: string; weight: number }>;
  interaction_count: number;
  last_updated: string;
}
